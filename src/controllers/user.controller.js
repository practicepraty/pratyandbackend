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
  console.log('Request Content-Type:', req.headers['content-type']);
  console.log('Request method:', req.method);
  console.log('Files received:', req.files ? Object.keys(req.files) : 'None');
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('Body size:', JSON.stringify(req.body || {}).length);
  console.log('Is multipart/form-data:', req.headers['content-type']?.includes('multipart/form-data'));
  console.log('Is application/json:', req.headers['content-type']?.includes('application/json'));
  
  // Detailed field analysis
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      const value = req.body[key];
      const type = typeof value;
      const isArray = Array.isArray(value);
      const isEmpty = !value || (typeof value === 'string' && !value.trim());
      console.log(`Field [${key}]: type=${type}, array=${isArray}, empty=${isEmpty}, value=${
        type === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value
      }`);
    });
  }
  console.log('=== REGISTRATION DEBUG END ===');

  // Robust field extraction function that handles multiple formats
  const extractField = (fieldName, alternatives = []) => {
    // Try direct field name first
    if (req.body[fieldName] !== undefined && req.body[fieldName] !== null && req.body[fieldName] !== '') {
      return req.body[fieldName];
    }
    
    // Try alternative field names
    for (const alt of alternatives) {
      if (req.body[alt] !== undefined && req.body[alt] !== null && req.body[alt] !== '') {
        return req.body[alt];
      }
    }
    
    // Try nested access (in case of nested objects)
    const nestedPatterns = [
      `personalInfo.${fieldName}`,
      `personalInfo[${fieldName}]`,
      `professionalInfo.${fieldName}`,
      `professionalInfo[${fieldName}]`,
      `practiceInfo.${fieldName}`,
      `practiceInfo[${fieldName}]`,
      `accountInfo.${fieldName}`,
      `accountInfo[${fieldName}]`
    ];
    
    for (const pattern of nestedPatterns) {
      const value = getNestedValue(req.body, pattern);
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    
    return undefined;
  };

  // Helper function to get nested values
  const getNestedValue = (obj, path) => {
    try {
      return path.split('.').reduce((current, key) => {
        if (current && typeof current === 'object') {
          // Handle array notation like [fieldName]
          const cleanKey = key.replace(/[\[\]]/g, '');
          return current[cleanKey];
        }
        return undefined;
      }, obj);
    } catch {
      return undefined;
    }
  };

  // Extract all fields using robust extraction
  const extractedFields = {
    // Personal info
    title: extractField('title', ['personalInfo.title']),
    firstName: extractField('firstName', ['first_name', 'firstname', 'personalInfo.firstName']),
    lastName: extractField('lastName', ['last_name', 'lastname', 'personalInfo.lastName']),
    professionalEmail: extractField('professionalEmail', ['email', 'professional_email', 'personalInfo.professionalEmail']),
    phone: extractField('phone', ['phoneNumber', 'phone_number', 'personalInfo.phone']),
    dateOfBirth: extractField('dateOfBirth', ['date_of_birth', 'dob', 'personalInfo.dateOfBirth']),
    gender: extractField('gender', ['personalInfo.gender']),
    
    // Professional info
    specialty: extractField('specialty', ['medical_specialty', 'professionalInfo.specialty']),
    subSpecialty: extractField('subSpecialty', ['sub_specialty', 'professionalInfo.subSpecialty']),
    licenseNumber: extractField('licenseNumber', ['license_number', 'professionalInfo.licenseNumber']),
    licenseState: extractField('licenseState', ['license_state', 'professionalInfo.licenseState']),
    licenseExpiryDate: extractField('licenseExpiryDate', ['license_expiry_date', 'professionalInfo.licenseExpiryDate']),
    yearsOfExperience: extractField('yearsOfExperience', ['years_of_experience', 'experience', 'professionalInfo.yearsOfExperience']),
    medicalSchool: extractField('medicalSchool', ['medical_school', 'professionalInfo.medicalSchool']),
    graduationYear: extractField('graduationYear', ['graduation_year', 'professionalInfo.graduationYear']),
    
    // Residency info
    residencyProgram: extractField('residencyProgram', ['residency_program', 'professionalInfo.residency.program']),
    residencyInstitution: extractField('residencyInstitution', ['residency_institution', 'professionalInfo.residency.institution']),
    residencyCompletionYear: extractField('residencyCompletionYear', ['residency_completion_year', 'professionalInfo.residency.completionYear']),
    
    // Fellowship info
    fellowshipProgram: extractField('fellowshipProgram', ['fellowship_program', 'professionalInfo.fellowship.program']),
    fellowshipInstitution: extractField('fellowshipInstitution', ['fellowship_institution', 'professionalInfo.fellowship.institution']),
    fellowshipCompletionYear: extractField('fellowshipCompletionYear', ['fellowship_completion_year', 'professionalInfo.fellowship.completionYear']),
    
    // Certifications
    boardCertifications: extractField('boardCertifications', ['board_certifications', 'certifications', 'professionalInfo.boardCertifications']),
    
    // Practice info
    practiceType: extractField('practiceType', ['practice_type', 'practiceInfo.practiceType']),
    institutionName: extractField('institutionName', ['institution_name', 'institution', 'practiceInfo.institutionName']),
    
    // Address info
    street: extractField('street', ['streetAddress', 'street_address', 'address.street', 'practiceInfo.address.street']),
    city: extractField('city', ['address.city', 'practiceInfo.address.city']),
    state: extractField('state', ['address.state', 'practiceInfo.address.state']),
    zipCode: extractField('zipCode', ['zip_code', 'postal_code', 'zip', 'address.zipCode', 'practiceInfo.address.zipCode']),
    country: extractField('country', ['address.country', 'practiceInfo.address.country']),
    latitude: extractField('latitude', ['lat', 'address.latitude', 'practiceInfo.address.coordinates.latitude']),
    longitude: extractField('longitude', ['lng', 'lon', 'address.longitude', 'practiceInfo.address.coordinates.longitude']),
    
    // Schedule info
    officeHours: extractField('officeHours', ['office_hours', 'schedule', 'practiceInfo.officeHours']),
    languages: extractField('languages', ['practiceInfo.languages']),
    insuranceAccepted: extractField('insuranceAccepted', ['insurance_accepted', 'insurance', 'practiceInfo.insuranceAccepted']),
    
    // Account info
    password: extractField('password', ['accountInfo.password'])
  };

  // Enhanced logging of extracted fields
  console.log('=== EXTRACTED FIELDS DEBUG ===');
  Object.entries(extractedFields).forEach(([key, value]) => {
    const status = value !== undefined ? '✓' : '✗';
    const type = typeof value;
    const preview = type === 'string' && value && value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`${status} ${key}: ${type} = ${preview}`);
  });
  console.log('=== EXTRACTED FIELDS DEBUG END ===');

  // Use extracted fields for validation
  const {
    title, firstName, lastName, professionalEmail, phone, dateOfBirth, gender,
    specialty, subSpecialty, licenseNumber, licenseState, licenseExpiryDate,
    yearsOfExperience, medicalSchool, graduationYear,
    residencyProgram, residencyInstitution, residencyCompletionYear,
    fellowshipProgram, fellowshipInstitution, fellowshipCompletionYear,
    boardCertifications, practiceType, institutionName,
    street, city, state, zipCode, country, latitude, longitude,
    officeHours, languages, insuranceAccepted, password
  } = extractedFields;

  // Enhanced validation with detailed error reporting
  console.log('=== VALIDATION START ===');
  
  // Add format validation functions
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const isValidPhone = (phone) => {
    return /^\+?[\d\s\-\(\)]{10,}$/.test(phone);
  };
  
  const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString.length >= 8;
  };
  
  const isValidPassword = (password) => {
    return password && password.length >= 8 && /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password);
  };
  
  const requiredFields = [
    // Personal Info with format validation
    { field: 'firstName', value: firstName, message: 'First name is required', 
      validator: (v) => v && v.trim().length >= 2, formatMessage: 'First name must be at least 2 characters' },
    { field: 'lastName', value: lastName, message: 'Last name is required',
      validator: (v) => v && v.trim().length >= 2, formatMessage: 'Last name must be at least 2 characters' },
    { field: 'professionalEmail', value: professionalEmail, message: 'Professional email is required',
      validator: isValidEmail, formatMessage: 'Please provide a valid email address' },
    { field: 'phone', value: phone, message: 'Phone number is required',
      validator: isValidPhone, formatMessage: 'Please provide a valid phone number' },
    { field: 'dateOfBirth', value: dateOfBirth, message: 'Date of birth is required',
      validator: isValidDate, formatMessage: 'Please provide a valid date of birth (YYYY-MM-DD)' },
    { field: 'gender', value: gender, message: 'Gender is required',
      validator: (v) => ['male', 'female', 'other', 'prefer-not-to-say'].includes(v), 
      formatMessage: 'Gender must be one of: male, female, other, prefer-not-to-say' },
    
    // Professional Info
    { field: 'specialty', value: specialty, message: 'Medical specialty is required',
      validator: (v) => [
        'general-practice', 'internal-medicine', 'cardiology', 'dermatology',
        'neurology', 'orthopedics', 'pediatrics', 'psychiatry', 'surgery',
        'oncology', 'radiology', 'emergency-medicine', 'anesthesiology',
        'pathology', 'ophthalmology', 'otolaryngology', 'urology',
        'obstetrics-gynecology', 'family-medicine', 'infectious-disease',
        'pulmonology', 'nephrology', 'endocrinology', 'gastroenterology',
        'rheumatology', 'hematology', 'plastic-surgery', 'other'
      ].includes(v),
      formatMessage: 'Please select a valid medical specialty' },
    { field: 'licenseNumber', value: licenseNumber, message: 'License number is required' },
    { field: 'licenseState', value: licenseState, message: 'License state is required' },
    { field: 'yearsOfExperience', value: yearsOfExperience, message: 'Years of experience is required',
      validator: (v) => ['0-2', '3-5', '6-10', '11-15', '16-20', '20+'].includes(v),
      formatMessage: 'Years of experience must be one of: 0-2, 3-5, 6-10, 11-15, 16-20, 20+' },
    { field: 'medicalSchool', value: medicalSchool, message: 'Medical school is required' },
    
    // Practice Info
    { field: 'practiceType', value: practiceType, message: 'Practice type is required',
      validator: (v) => [
        'private-practice', 'hospital', 'clinic', 'academic-medical-center',
        'group-practice', 'telemedicine', 'government-hospital',
        'community-health-center', 'urgent-care', 'other'
      ].includes(v),
      formatMessage: 'Please select a valid practice type' },
    { field: 'institutionName', value: institutionName, message: 'Institution name is required' },
    
    // Address Info
    { field: 'street', value: street, message: 'Street address is required' },
    { field: 'city', value: city, message: 'City is required' },
    { field: 'state', value: state, message: 'State is required' },
    { field: 'zipCode', value: zipCode, message: 'ZIP code is required' },
    
    // Account Info
    { field: 'password', value: password, message: 'Password is required',
      validator: isValidPassword, formatMessage: 'Password must be at least 8 characters with at least one letter and one number' }
  ];

  const validationErrors = [];
  const validFields = [];

  // Validate each required field
  requiredFields.forEach(({ field, value, message, validator, formatMessage }) => {
    // Check if field exists and is not empty
    const hasValue = value !== undefined && value !== null && 
                    (typeof value === 'string' ? value.trim() !== '' : true);
    
    if (!hasValue) {
      validationErrors.push({ field, message });
      console.log(`✗ ${field}: MISSING (value: ${value})`);
      return;
    }
    
    // Check format if validator is provided
    if (validator && !validator(value)) {
      validationErrors.push({ field, message: formatMessage || message });
      console.log(`✗ ${field}: INVALID FORMAT (value: ${value})`);
      return;
    }
    
    validFields.push(field);
    console.log(`✓ ${field}: Valid`);
  });

  // If there are validation errors, provide detailed feedback
  if (validationErrors.length > 0) {
    console.log('=== VALIDATION FAILED ===');
    console.log(`Valid fields (${validFields.length}):`, validFields);
    console.log(`Missing fields (${validationErrors.length}):`, validationErrors.map(e => e.field));
    
    // Return the first validation error with suggestions
    const firstError = validationErrors[0];
    const suggestions = [];
    
    // Add suggestions for common field name variations
    switch (firstError.field) {
      case 'firstName':
        suggestions.push('Try field names: firstName, first_name, firstname, personalInfo.firstName');
        break;
      case 'lastName':
        suggestions.push('Try field names: lastName, last_name, lastname, personalInfo.lastName');
        break;
      case 'professionalEmail':
        suggestions.push('Try field names: professionalEmail, email, professional_email, personalInfo.professionalEmail');
        break;
      default:
        suggestions.push(`Ensure the field '${firstError.field}' is included in the request`);
    }
    
    const errorMessage = `${firstError.message}. ${suggestions.join('. ')}`;
    throw new ApiError(400, errorMessage);
  }

  console.log(`✓ All ${validFields.length} required fields validated successfully`);
  console.log('=== VALIDATION END ===');
  
  // Check if user already exists with detailed feedback
  console.log('=== DUPLICATE CHECK START ===');
  const existedUser = await User.findOne({
    $or: [
      { 'personalInfo.phone': phone },
      { 'personalInfo.professionalEmail': professionalEmail.toLowerCase().trim() }
    ]
  });

  if (existedUser) {
    console.log('Duplicate user found:', {
      existingEmail: existedUser.personalInfo.professionalEmail,
      existingPhone: existedUser.personalInfo.phone,
      requestEmail: professionalEmail.toLowerCase().trim(),
      requestPhone: phone
    });
    
    const duplicateFields = [];
    if (existedUser.personalInfo.professionalEmail === professionalEmail.toLowerCase().trim()) {
      duplicateFields.push('email');
    }
    if (existedUser.personalInfo.phone === phone) {
      duplicateFields.push('phone number');
    }
    
    throw new ApiError(409, `User with this ${duplicateFields.join(' and ')} already exists. Please use different credentials or try logging in.`);
  }
  console.log('✓ No duplicate users found');
  console.log('=== DUPLICATE CHECK END ===');

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

  // Create user with proper schema structure and enhanced error handling
  console.log('=== USER CREATION START ===');
  
  const userDataStructure = {
    personalInfo: {
      title: title || undefined,
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
        country: country || 'US',
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
  };

  // Log the user data structure before creation
  console.log('User data structure prepared:', {
    personalInfo: {
      hasFirstName: !!userDataStructure.personalInfo.firstName,
      hasLastName: !!userDataStructure.personalInfo.lastName,
      hasEmail: !!userDataStructure.personalInfo.professionalEmail,
      hasPhone: !!userDataStructure.personalInfo.phone
    },
    professionalInfo: {
      hasSpecialty: !!userDataStructure.professionalInfo.specialty,
      hasLicense: !!userDataStructure.professionalInfo.licenseNumber,
      hasSchool: !!userDataStructure.professionalInfo.medicalSchool
    },
    practiceInfo: {
      hasPracticeType: !!userDataStructure.practiceInfo.practiceType,
      hasInstitution: !!userDataStructure.practiceInfo.institutionName,
      hasAddress: !!(userDataStructure.practiceInfo.address.street && 
                     userDataStructure.practiceInfo.address.city)
    },
    accountInfo: {
      hasPassword: !!userDataStructure.accountInfo.password
    }
  });

  let user;
  try {
    console.log('Creating user in database...');
    user = await User.create(userDataStructure);
    console.log('✓ User created successfully with ID:', user._id);
  } catch (createError) {
    console.error('=== USER CREATION FAILED ===');
    console.error('Error name:', createError.name);
    console.error('Error message:', createError.message);
    
    if (createError.name === 'ValidationError') {
      console.error('Validation errors:', createError.errors);
      const validationMessages = Object.values(createError.errors).map(err => err.message);
      throw new ApiError(400, `Validation failed: ${validationMessages.join(', ')}`);
    } else if (createError.code === 11000) {
      console.error('Duplicate key error:', createError.keyPattern);
      throw new ApiError(409, 'User with this email or license number already exists');
    } else {
      console.error('Unexpected error during user creation:', createError);
      throw new ApiError(500, 'Failed to create user account. Please try again.');
    }
  }
  
  console.log('=== USER CREATION END ===');

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