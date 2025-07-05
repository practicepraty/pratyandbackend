import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apirespose.js";
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from "../utils/email.js";
import crypto from "crypto";
import jwt from "jsonwebtoken"; // Added missing import

// Helper function to extract fields from request body
const extractFields = (body, expectedFields) => {
  const result = {};
  
  for (const [category, fields] of Object.entries(expectedFields)) {
    result[category] = {};
    for (const field of fields) {
      if (body[field] !== undefined) {
        result[category][field] = body[field];
      }
    }
  }
  
  return result;
};

// Helper function to generate tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    user.accountInfo.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Token generation error:', error);
    throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const expectedFields = {
    personal: ['title', 'firstName', 'lastName', 'professionalEmail', 'phone', 'dateOfBirth', 'gender'],
    professional: ['specialty', 'subSpecialty', 'licenseNumber', 'licenseState', 'licenseExpiryDate', 'yearsOfExperience', 'medicalSchool', 'graduationYear'],
    residency: ['residencyProgram', 'residencyInstitution', 'residencyCompletionYear'],
    fellowship: ['fellowshipProgram', 'fellowshipInstitution', 'fellowshipCompletionYear'],
    certifications: ['boardCertifications'],
    practice: ['practiceType', 'institutionName'],
    address: ['street', 'city', 'state', 'zipCode', 'country'],
    schedule: ['officeHours', 'languages', 'insuranceAccepted'],
    account: ['password']
  };

  const userData = extractFields(req.body, expectedFields);

  // Validation for required fields
  if (!userData.personal.firstName?.trim()) throw new ApiError(400, "First name is required");
  if (!userData.personal.lastName?.trim()) throw new ApiError(400, "Last name is required");
  if (!userData.personal.professionalEmail?.trim()) throw new ApiError(400, "Email is required");
  if (!userData.personal.phone?.trim()) throw new ApiError(400, "Phone is required");
  if (!userData.personal.dateOfBirth) throw new ApiError(400, "Date of birth is required");
  if (!userData.personal.gender?.trim()) throw new ApiError(400, "Gender is required");

  if (!userData.professional.specialty?.trim()) throw new ApiError(400, "Specialty is required");
  if (!userData.professional.licenseNumber?.trim()) throw new ApiError(400, "License number is required");
  if (!userData.professional.licenseState?.trim()) throw new ApiError(400, "License state is required");
  if (!userData.professional.yearsOfExperience?.trim()) throw new ApiError(400, "Years of experience is required");
  if (!userData.professional.medicalSchool?.trim()) throw new ApiError(400, "Medical school is required");

  if (!userData.practice.practiceType?.trim()) throw new ApiError(400, "Practice type is required");
  if (!userData.practice.institutionName?.trim()) throw new ApiError(400, "Institution name is required");

  if (!userData.address.street?.trim()) throw new ApiError(400, "Street is required");
  if (!userData.address.city?.trim()) throw new ApiError(400, "City is required");
  if (!userData.address.state?.trim()) throw new ApiError(400, "State is required");
  if (!userData.address.zipCode?.trim()) throw new ApiError(400, "ZIP code is required");

  if (!userData.account.password?.trim()) throw new ApiError(400, "Password is required");
  
  // Check if user already exists
  const existedUser = await User.findOne({
    $or: [
      { 'personalInfo.phone': userData.personal.phone },
      { 'personalInfo.professionalEmail': userData.personal.professionalEmail.toLowerCase().trim() }
    ]
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or phone already exists");
  }

  // Handle file uploads
  const profilePhotoLocalPath = req.files?.profilePhoto?.[0]?.path;
  const cvLocalPath = req.files?.cv?.[0]?.path;

  let profilePhoto = null;
  let cv = null;

  if (profilePhotoLocalPath) {
    profilePhoto = await uploadOnCloudinary(profilePhotoLocalPath);
  }

  if (cvLocalPath) {
    cv = await uploadOnCloudinary(cvLocalPath);
  }

  // Parse arrays and objects from request body
  const parseArrayField = (field) => {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return field.split(',').map(item => item.trim());
      }
    }
    return Array.isArray(field) ? field : [];
  };

  const parseObjectField = (field) => {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return {};
      }
    }
    return typeof field === 'object' ? field : {};
  };

  // Create user with proper schema structure
  const user = await User.create({
    personalInfo: {
      title: userData.personal.title,
      firstName: userData.personal.firstName,
      lastName: userData.personal.lastName,
      fullName: `${userData.personal.firstName} ${userData.personal.lastName}`,
      professionalEmail: userData.personal.professionalEmail.toLowerCase().trim(),
      phone: userData.personal.phone,
      dateOfBirth: userData.personal.dateOfBirth,
      gender: userData.personal.gender,
      profilePhoto: profilePhoto?.url || ""
    },
    professionalInfo: {
      specialty: userData.professional.specialty,
      subSpecialty: userData.professional.subSpecialty,
      licenseNumber: userData.professional.licenseNumber,
      licenseState: userData.professional.licenseState,
      licenseExpiryDate: userData.professional.licenseExpiryDate ? new Date(userData.professional.licenseExpiryDate) : undefined,
      yearsOfExperience: userData.professional.yearsOfExperience,
      medicalSchool: userData.professional.medicalSchool,
      graduationYear: userData.professional.graduationYear ? parseInt(userData.professional.graduationYear) : undefined,
      residency: {
        program: userData.residency.residencyProgram,
        institution: userData.residency.residencyInstitution,
        completionYear: userData.residency.residencyCompletionYear ? parseInt(userData.residency.residencyCompletionYear) : undefined
      },
      fellowship: {
        program: userData.fellowship.fellowshipProgram,
        institution: userData.fellowship.fellowshipInstitution,
        completionYear: userData.fellowship.fellowshipCompletionYear ? parseInt(userData.fellowship.fellowshipCompletionYear) : undefined
      },
      boardCertifications: parseArrayField(userData.certifications.boardCertifications),
      cv: cv?.url || ""
    },
    practiceInfo: {
      practiceType: userData.practice.practiceType,
      institutionName: userData.practice.institutionName,
      address: {
        street: userData.address.street,
        city: userData.address.city,
        state: userData.address.state,
        zipCode: userData.address.zipCode,
        country: userData.address.country || 'IN',
        coordinates: {
          latitude: userData.address.latitude ? parseFloat(userData.address.latitude) : undefined,
          longitude: userData.address.longitude ? parseFloat(userData.address.longitude) : undefined
        }
      },
      officeHours: parseObjectField(userData.schedule.officeHours),
      languages: parseArrayField(userData.schedule.languages),
      insuranceAccepted: parseArrayField(userData.schedule.insuranceAccepted)
    },
    accountInfo: {
      password: userData.account.password
    }
  });

  const createdUser = await User.findById(user._id).select("-accountInfo.password -accountInfo.refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { professionalEmail, password } = req.body;
  
  // Enhanced logging for debugging
  console.log('Login attempt:', { 
    professionalEmail, 
    hasPassword: !!password,
    bodyKeys: Object.keys(req.body)
  });
  
  if (!professionalEmail?.trim()) {
    throw new ApiError(400, "Professional email is required");
  }

  if (!password?.trim()) {
    throw new ApiError(400, "Password is required");
  }

  const email = professionalEmail.toLowerCase().trim();
  console.log('Searching for user with email:', email);

  const user = await User.findOne({
    'personalInfo.professionalEmail': email
  }).select('+accountInfo.password');

  console.log('User found:', !!user);
  
  if (!user) {
    // Enhanced debugging
    const userCount = await User.countDocuments();
    console.log('Total users in database:', userCount);
    
    // Check if user exists with similar email
    const emailVariations = await User.find({
      'personalInfo.professionalEmail': { $regex: email.split('@')[0], $options: 'i' }
    }, { 'personalInfo.professionalEmail': 1 });
    
    console.log('Similar emails found:', emailVariations.map(u => u.personalInfo.professionalEmail));
    
    throw new ApiError(404, "User not found. Please check your email address.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  console.log('Password valid:', isPasswordValid);
  
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-accountInfo.password -accountInfo.refreshToken");

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken
      }, "User logged in successfully")
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        "accountInfo.refreshToken": 1
      }
    },
    {
      new: true
    }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.accountInfo?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Enhanced database debugging function
const debugDatabase = asyncHandler(async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const sampleUsers = await User.find({}, { 
      'personalInfo.professionalEmail': 1,
      'personalInfo.firstName': 1,
      'personalInfo.lastName': 1,
      'createdAt': 1
    }).limit(5);
    
    // Check for duplicate emails
    const duplicateEmails = await User.aggregate([
      {
        $group: {
          _id: '$personalInfo.professionalEmail',
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    return res.status(200).json(
      new ApiResponse(200, {
        totalUsers: userCount,
        sampleUsers: sampleUsers.map(u => ({
          email: u.personalInfo.professionalEmail,
          name: `${u.personalInfo.firstName} ${u.personalInfo.lastName}`,
          createdAt: u.createdAt
        })),
        duplicateEmails: duplicateEmails
      }, "Database debug info")
    );
  } catch (error) {
    console.error('Database debug error:', error);
    throw new ApiError(500, "Database connection error");
  }
});

// Fixed password reset functions with better error handling
const forgotPassword = asyncHandler(async (req, res) => {
  const { professionalEmail } = req.body;

  if (!professionalEmail?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const email = professionalEmail.toLowerCase().trim();
  console.log('Password reset requested for:', email);

  // Check if user exists
  const user = await User.findOne({
    'personalInfo.professionalEmail': email
  });

  if (!user) {
    console.log('User not found for password reset:', email);
    // Security: Don't reveal if user exists or not
    return res.status(200).json(
      new ApiResponse(200, {}, "If an account with this email exists, a password reset link has been sent.")
    );
  }

  try {
    // Generate reset token using the user method
    const resetToken = user.generatePasswordResetToken();
    console.log('Reset token generated for user:', user.personalInfo.professionalEmail);
    
    // Save user with reset token
    await user.save({ validateBeforeSave: false });
    console.log('User saved with reset token');

    // Send email with reset token - Add more specific error handling
    try {
      await sendPasswordResetEmail(
        user.personalInfo.professionalEmail,
        resetToken,
        user.personalInfo.firstName
      );
      console.log('Password reset email sent successfully');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // Clear reset token if email fails
      user.accountInfo.passwordResetToken = undefined;
      user.accountInfo.passwordResetExpires = undefined;
      user.accountInfo.passwordResetUsed = false;
      await user.save({ validateBeforeSave: false });

      // Provide more specific error message based on email error
      let errorMessage = "Failed to send password reset email. Please try again later.";
      
      if (emailError.message.includes('Invalid login')) {
        errorMessage = "Email service configuration error. Please contact support.";
      } else if (emailError.message.includes('Network')) {
        errorMessage = "Network error while sending email. Please check your internet connection.";
      }

      throw new ApiError(500, errorMessage);
    }
    
    res.status(200).json(
      new ApiResponse(200, {}, "Password reset link sent to your email")
    );
  } catch (error) {
    console.error('Password reset error:', error);
    
    // If it's already an ApiError, throw it as is
    if (error instanceof ApiError) {
      throw error;
    }
    
    // For other errors, clear reset token and throw generic error
    try {
      user.accountInfo.passwordResetToken = undefined;
      user.accountInfo.passwordResetExpires = undefined;
      user.accountInfo.passwordResetUsed = false;
      await user.save({ validateBeforeSave: false });
    } catch (saveError) {
      console.error('Error clearing reset token:', saveError);
    }

    throw new ApiError(500, "Failed to process password reset request. Please try again later.");
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  // Validate inputs
  if (!token?.trim()) {
    throw new ApiError(400, "Reset token is required");
  }

  if (!newPassword?.trim()) {
    throw new ApiError(400, "New password is required");
  }

  if (!confirmPassword?.trim()) {
    throw new ApiError(400, "Password confirmation is required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  // Hash the received token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token.trim())
    .digest('hex');

  console.log('Looking for user with reset token...');

  // Find user by reset token
  const user = await User.findOne({
    'accountInfo.passwordResetToken': hashedToken,
    'accountInfo.passwordResetExpires': { $gt: Date.now() },
    'accountInfo.passwordResetUsed': false
  }).select('+accountInfo.passwordResetToken +accountInfo.passwordResetExpires +accountInfo.passwordResetUsed');

  if (!user) {
    console.log('Invalid or expired reset token');
    throw new ApiError(400, "Invalid or expired reset token");
  }

  console.log('Valid reset token found, updating password...');

  // Update password
  user.accountInfo.password = newPassword;
  user.accountInfo.passwordResetToken = undefined;
  user.accountInfo.passwordResetExpires = undefined;
  user.accountInfo.passwordResetUsed = true;
  user.accountInfo.refreshToken = undefined; // Invalidate all sessions

  await user.save();

  console.log('Password updated successfully');

  // Send confirmation email (don't fail if this fails)
  try {
    await sendPasswordResetConfirmationEmail(
      user.personalInfo.professionalEmail,
      user.personalInfo.firstName
    );
    console.log('Password reset confirmation email sent');
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    // Don't throw error - password reset was successful
  }

  res.status(200).json(
    new ApiResponse(200, {}, "Password reset successful. Please login with your new password.")
  );
});

const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token?.trim()) {
    throw new ApiError(400, "Reset token is required");
  }

  // Hash the received token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token.trim())
    .digest('hex');

  console.log('Verifying reset token...');

  // Find user by reset token
  const user = await User.findOne({
    'accountInfo.passwordResetToken': hashedToken,
    'accountInfo.passwordResetExpires': { $gt: Date.now() },
    'accountInfo.passwordResetUsed': false
  });

  if (!user) {
    console.log('Invalid or expired reset token during verification');
    throw new ApiError(400, "Invalid or expired reset token");
  }

  res.status(200).json(
    new ApiResponse(200, { 
      valid: true,
      email: user.personalInfo.professionalEmail,
      userName: user.personalInfo.firstName
    }, "Token is valid")
  );
});

// Change password (for authenticated users)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword?.trim()) {
    throw new ApiError(400, "Current password is required");
  }

  if (!newPassword?.trim()) {
    throw new ApiError(400, "New password is required");
  }

  if (!confirmPassword?.trim()) {
    throw new ApiError(400, "Password confirmation is required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New passwords do not match");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, "New password must be different from current password");
  }

  const user = await User.findById(req.user._id).select('+accountInfo.password');

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.accountInfo.password = newPassword;
  user.accountInfo.refreshToken = undefined; // Invalidate all sessions
  await user.save();

  res.status(200).json(
    new ApiResponse(200, {}, "Password changed successfully. Please login again.")
  );
});

// Get current user profile
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-accountInfo.password -accountInfo.refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(
    new ApiResponse(200, user, "User profile fetched successfully")
  );
});

// Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updateData = req.body;

  // Remove sensitive fields that shouldn't be updated via this endpoint
  delete updateData.accountInfo;
  delete updateData.password;
  delete updateData._id;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-accountInfo.password -accountInfo.refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json(
    new ApiResponse(200, user, "User profile updated successfully")
  );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  debugDatabase,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword,
  getCurrentUser,
  updateUserProfile
};