import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apirespose.js";

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
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    user.accountInfo.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
  }
};

const registerUser = asyncHandler (async (req, res) => {
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
      { 'personalInfo.professionalEmail': userData.personal.professionalEmail }
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
      professionalEmail: userData.personal.professionalEmail,
      phone: userData.personal.phone,
      dateOfBirth: new Date(userData.personal.dateOfBirth),
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
        country: userData.address.country || 'US',
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
  // FIX 1: Handle both direct fields and nested structure
  const { professionalEmail, password } = req.body;
  
  // Log the incoming request for debugging
  console.log('Login attempt:', { professionalEmail, hasPassword: !!password });
  
  if (!professionalEmail?.trim()) {
    throw new ApiError(400, "Professional email is required");
  }

  if (!password?.trim()) {
    throw new ApiError(400, "Password is required");
  }

  // FIX 2: Add debugging to see what we're searching for
  console.log('Searching for user with email:', professionalEmail);

  const user = await User.findOne({
    'personalInfo.professionalEmail': professionalEmail.toLowerCase().trim()
  }).select('+accountInfo.password');

  // FIX 3: Add debugging to see if user was found
  console.log('User found:', !!user);
  
  if (!user) {
    // FIX 4: Add more debugging info
    const userCount = await User.countDocuments();
    console.log('Total users in database:', userCount);
    
    // Check if user exists with different email format
    const emailVariations = await User.find({
      'personalInfo.professionalEmail': { $regex: professionalEmail.split('@')[0], $options: 'i' }
    }, { 'personalInfo.professionalEmail': 1 });
    
    console.log('Similar emails found:', emailVariations);
    
    throw new ApiError(404, "User not found. Please check your email address.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-accountInfo.password -accountInfo.refreshToken");

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' // Only secure in production
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

const logoutUser = asyncHandler(async(req, res) => {
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
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

// FIX 5: Add a helper function to check database connection and users
const debugDatabase = asyncHandler(async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const sampleUsers = await User.find({}, { 'personalInfo.professionalEmail': 1 }).limit(5);
    
    return res.status(200).json(
      new ApiResponse(200, {
        totalUsers: userCount,
        sampleEmails: sampleUsers.map(u => u.personalInfo.professionalEmail)
      }, "Database debug info")
    );
  } catch (error) {
    throw new ApiError(500, "Database connection error");
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  debugDatabase
};