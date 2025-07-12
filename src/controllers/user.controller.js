import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apirespose.js";
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from "../utils/email.js";
import crypto from "crypto";
import jwt from "jsonwebtoken"; // Added missing import


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
  // Enhanced debug logging to understand incoming data structure
  console.log('=== REGISTRATION DEBUG START ===');
  console.log('Full req.body:', JSON.stringify(req.body, null, 2));
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Request body type:', typeof req.body);
  console.log('Request body length:', JSON.stringify(req.body).length);
  
  // Check for nested structures
  Object.keys(req.body).forEach(key => {
    const value = req.body[key];
    console.log(`${key}:`, typeof value, Array.isArray(value) ? '[Array]' : '', value);
  });
  
  console.log('Sample field values:', {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    professionalEmail: req.body.professionalEmail,
    phone: req.body.phone,
    street: req.body.street,
    city: req.body.city,
    state: req.body.state,
    specialty: req.body.specialty,
    password: req.body.password ? '[PRESENT]' : '[MISSING]'
  });
  console.log('=== REGISTRATION DEBUG END ===');

  // Extract fields directly from req.body (expecting flat structure)
  const {
    // Personal info
    title,
    firstName,
    lastName,
    professionalEmail,
    phone,
    dateOfBirth,
    gender,
    
    // Professional info
    specialty,
    subSpecialty,
    licenseNumber,
    licenseState,
    licenseExpiryDate,
    yearsOfExperience,
    medicalSchool,
    graduationYear,
    
    // Residency info
    residencyProgram,
    residencyInstitution,
    residencyCompletionYear,
    
    // Fellowship info
    fellowshipProgram,
    fellowshipInstitution,
    fellowshipCompletionYear,
    
    // Certifications
    boardCertifications,
    
    // Practice info
    practiceType,
    institutionName,
    
    // Address info
    street,
    city,
    state,
    zipCode,
    country,
    latitude,
    longitude,
    
    // Schedule info
    officeHours,
    languages,
    insuranceAccepted,
    
    // Account info
    password
  } = req.body;

  // Enhanced validation for required fields with better error messages
  console.log('Validating required fields...');
  
  // Personal Info validation
  if (!firstName?.trim()) throw new ApiError(400, "First name is required");
  if (!lastName?.trim()) throw new ApiError(400, "Last name is required");
  if (!professionalEmail?.trim()) throw new ApiError(400, "Professional email is required");
  if (!phone?.trim()) throw new ApiError(400, "Phone number is required");
  if (!dateOfBirth?.trim()) throw new ApiError(400, "Date of birth is required");
  if (!gender?.trim()) throw new ApiError(400, "Gender is required");

  // Professional Info validation
  if (!specialty?.trim()) throw new ApiError(400, "Medical specialty is required");
  if (!licenseNumber?.trim()) throw new ApiError(400, "License number is required");
  if (!licenseState?.trim()) throw new ApiError(400, "License state is required");
  if (!yearsOfExperience?.trim()) throw new ApiError(400, "Years of experience is required");
  if (!medicalSchool?.trim()) throw new ApiError(400, "Medical school is required");

  // Practice Info validation
  if (!practiceType?.trim()) throw new ApiError(400, "Practice type is required");
  if (!institutionName?.trim()) throw new ApiError(400, "Institution name is required");

  // Address validation
  if (!street?.trim()) throw new ApiError(400, "Street address is required");
  if (!city?.trim()) throw new ApiError(400, "City is required");
  if (!state?.trim()) throw new ApiError(400, "State is required");
  if (!zipCode?.trim()) throw new ApiError(400, "ZIP code is required");

  // Account validation
  if (!password?.trim()) throw new ApiError(400, "Password is required");
  
  console.log('All required fields validated successfully');
  
  // Check if user already exists
  const existedUser = await User.findOne({
    $or: [
      { 'personalInfo.phone': phone },
      { 'personalInfo.professionalEmail': professionalEmail.toLowerCase().trim() }
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

  try {
    if (profilePhotoLocalPath) {
      profilePhoto = await uploadOnCloudinary(profilePhotoLocalPath);
      if (!profilePhoto) {
        throw new ApiError(400, "Failed to upload profile photo. Please try again with a different image.");
      }
    }

    if (cvLocalPath) {
      cv = await uploadOnCloudinary(cvLocalPath);
      if (!cv) {
        throw new ApiError(400, "Failed to upload CV. Please try again with a different file.");
      }
    }
  } catch (error) {
    // Clean up any uploaded files on error
    if (profilePhotoLocalPath) {
      try {
        const fs = await import('fs');
        fs.unlinkSync(profilePhotoLocalPath);
      } catch (cleanupError) {
        console.error('Error cleaning up profile photo:', cleanupError);
      }
    }
    if (cvLocalPath) {
      try {
        const fs = await import('fs');
        fs.unlinkSync(cvLocalPath);
      } catch (cleanupError) {
        console.error('Error cleaning up CV:', cleanupError);
      }
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(400, "File upload failed. Please try again.");
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

  // Create user with proper schema structure (using flat field names)
  const user = await User.create({
    personalInfo: {
      title: title,
      firstName: firstName,
      lastName: lastName,
      fullName: `${firstName} ${lastName}`,
      professionalEmail: professionalEmail.toLowerCase().trim(),
      phone: phone,
      dateOfBirth: dateOfBirth,
      gender: gender,
      profilePhoto: profilePhoto?.url || ""
    },
    professionalInfo: {
      specialty: specialty,
      subSpecialty: subSpecialty,
      licenseNumber: licenseNumber,
      licenseState: licenseState,
      licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : undefined,
      yearsOfExperience: yearsOfExperience,
      medicalSchool: medicalSchool,
      graduationYear: graduationYear ? parseInt(graduationYear) : undefined,
      residency: {
        program: residencyProgram,
        institution: residencyInstitution,
        completionYear: residencyCompletionYear ? parseInt(residencyCompletionYear) : undefined
      },
      fellowship: {
        program: fellowshipProgram,
        institution: fellowshipInstitution,
        completionYear: fellowshipCompletionYear ? parseInt(fellowshipCompletionYear) : undefined
      },
      boardCertifications: parseArrayField(boardCertifications),
      cv: cv?.url || ""
    },
    practiceInfo: {
      practiceType: practiceType,
      institutionName: institutionName,
      address: {
        street: street,
        city: city,
        state: state,
        zipCode: zipCode,
        country: country || 'IN',
        coordinates: {
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined
        }
      },
      officeHours: parseObjectField(officeHours),
      languages: parseArrayField(languages),
      insuranceAccepted: parseArrayField(insuranceAccepted)
    },
    accountInfo: {
      password: password
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
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
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
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
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

  // Check if this is a new user and add helpful guidance
  const isNewUser = new Date() - user.createdAt < 24 * 60 * 60 * 1000; // Less than 24 hours
  const hasWebsites = user.websiteCount > 0; // Assuming this field exists or will be added

  const responseData = {
    user: user,
    user_guidance: {
      is_new_user: isNewUser,
      has_websites: hasWebsites,
      next_steps: isNewUser ? [
        "Complete your profile to get personalized website suggestions",
        "Upload an audio recording describing your practice",
        "Generate your first professional medical website",
        "Explore customization options for your website"
      ] : [],
      tips: [
        "Use specific medical terminology in your descriptions for better AI generation",
        "Include your specialties, services, and unique qualifications",
        "Consider adding patient testimonials or success stories"
      ]
    }
  };

  res.status(200).json(
    new ApiResponse(200, responseData, isNewUser ? "Welcome! Here are some next steps to get started." : "User profile fetched successfully")
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