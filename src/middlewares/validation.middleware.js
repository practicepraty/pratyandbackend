import joi from 'joi';
import { ApiError } from '../utils/apierror.js';

// Enhanced validation schemas for security
const passwordSchema = joi.string()
  .min(12)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/)
  .required()
  .messages({
    'string.min': 'Password must be at least 12 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  });

const emailSchema = joi.string()
  .email({ tlds: { allow: false } })
  .required()
  .messages({
    'string.email': 'Please provide a valid email address'
  });

const phoneSchema = joi.string()
  .pattern(/^\+?[\d\s\-\(\)]{10,}$/)
  .required()
  .messages({
    'string.pattern.base': 'Please provide a valid phone number'
  });

const licenseNumberSchema = joi.string()
  .alphanum()
  .min(5)
  .max(20)
  .required()
  .messages({
    'string.alphanum': 'License number must contain only letters and numbers',
    'string.min': 'License number must be at least 5 characters',
    'string.max': 'License number cannot exceed 20 characters'
  });

// User registration validation
export const validateUserRegistration = (req, res, next) => {
  const schema = joi.object({
    personalInfo: joi.object({
      title: joi.string().valid('Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.').required(),
      firstName: joi.string().trim().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
      lastName: joi.string().trim().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
      professionalEmail: emailSchema,
      phone: phoneSchema,
      dateOfBirth: joi.string().isoDate().required(),
      gender: joi.string().valid('male', 'female', 'other', 'prefer-not-to-say').required()
    }).required(),
    
    professionalInfo: joi.object({
      specialty: joi.string().valid(
        'general-practice', 'internal-medicine', 'cardiology', 'dermatology',
        'neurology', 'orthopedics', 'pediatrics', 'psychiatry', 'surgery',
        'oncology', 'radiology', 'emergency-medicine', 'anesthesiology',
        'pathology', 'ophthalmology', 'otolaryngology', 'urology',
        'obstetrics-gynecology', 'family-medicine', 'infectious-disease',
        'pulmonology', 'nephrology', 'endocrinology', 'gastroenterology',
        'rheumatology', 'hematology', 'plastic-surgery', 'other'
      ).required(),
      licenseNumber: licenseNumberSchema,
      licenseState: joi.string().trim().min(2).max(50).required(),
      licenseExpiryDate: joi.date().greater('now').required(),
      yearsOfExperience: joi.string().valid('0-2', '3-5', '6-10', '11-15', '16-20', '20+').required(),
      medicalSchool: joi.string().trim().min(2).max(200).required(),
      graduationYear: joi.number().integer().min(1950).max(new Date().getFullYear()).required()
    }).required(),
    
    practiceInfo: joi.object({
      practiceType: joi.string().valid(
        'private-practice', 'hospital', 'clinic', 'academic-medical-center',
        'group-practice', 'telemedicine', 'government-hospital',
        'community-health-center', 'urgent-care', 'other'
      ).required(),
      institutionName: joi.string().trim().min(2).max(200).required(),
      address: joi.object({
        street: joi.string().trim().min(5).max(200).required(),
        city: joi.string().trim().min(2).max(100).required(),
        state: joi.string().trim().min(2).max(50).required(),
        zipCode: joi.string().trim().min(5).max(10).required(),
        country: joi.string().trim().min(2).max(50).default('IN')
      }).required(),
      languages: joi.array().items(joi.string().trim().min(2).max(50)).min(1).required()
    }).required(),
    
    accountInfo: joi.object({
      password: passwordSchema,
      consentGiven: joi.boolean().valid(true).required(),
      privacyPolicyAccepted: joi.boolean().valid(true).required()
    }).required()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      error: 'Validation failed',
      messages: errorMessages
    });
  }
  
  next();
};

// User login validation
export const validateUserLogin = (req, res, next) => {
  const schema = joi.object({
    professionalEmail: emailSchema,
    password: joi.string().required(),
    mfaToken: joi.string().length(6).pattern(/^\d{6}$/).optional(),
    rememberMe: joi.boolean().optional()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.details[0].message
    });
  }
  
  next();
};

// Password change validation
export const validatePasswordChange = (req, res, next) => {
  const schema = joi.object({
    currentPassword: joi.string().required(),
    newPassword: passwordSchema,
    confirmPassword: joi.string().valid(joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match'
    }),
    mfaToken: joi.string().length(6).pattern(/^\d{6}$/).optional()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.details[0].message
    });
  }
  
  next();
};

// Password reset validation
export const validatePasswordReset = (req, res, next) => {
  const schema = joi.object({
    email: emailSchema
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.details[0].message
    });
  }
  
  next();
};

// Password reset confirm validation
export const validatePasswordResetConfirm = (req, res, next) => {
  const schema = joi.object({
    token: joi.string().required(),
    newPassword: passwordSchema,
    confirmPassword: joi.string().valid(joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match'
    })
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.details[0].message
    });
  }
  
  next();
};

// MFA setup validation
export const validateMFASetup = (req, res, next) => {
  const schema = joi.object({
    mfaToken: joi.string().length(6).pattern(/^\d{6}$/).required().messages({
      'string.length': 'MFA token must be exactly 6 digits',
      'string.pattern.base': 'MFA token must contain only numbers'
    })
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.details[0].message
    });
  }
  
  next();
};

// File upload validation
export const validateFileUpload = (req, res, next) => {
  const allowedMimeTypes = process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/flac',
    'audio/ogg',
    'audio/webm',
    'application/pdf'
  ];

  const maxFileSize = parseInt(process.env.UPLOAD_MAX_FILE_SIZE) || 10485760; // 10MB

  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded'
    });
  }

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type',
      allowedTypes: allowedMimeTypes
    });
  }

  if (req.file.size > maxFileSize) {
    return res.status(400).json({
      error: 'File size exceeds limit',
      maxSize: maxFileSize
    });
  }

  next();
};

// Sanitize input data
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim()
        .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+=/gi, ''); // Remove event handlers
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = sanitize(obj[key]);
        }
      }
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Validate ObjectId format
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid ID format'
      });
    }
    
    next();
  };
};

// API key validation
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required'
    });
  }
  
  // Validate API key format (customize based on your API key structure)
  if (!/^[a-zA-Z0-9]{32,}$/.test(apiKey)) {
    return res.status(401).json({
      error: 'Invalid API key format'
    });
  }
  
  next();
};

// Content-Type validation
export const validateContentType = (allowedTypes) => {
  return (req, res, next) => {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !allowedTypes.includes(contentType.split(';')[0])) {
      return res.status(415).json({
        error: 'Unsupported content type',
        allowedTypes: allowedTypes
      });
    }
    
    next();
  };
};

// Request size validation
export const validateRequestSize = (maxSize) => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: maxSize
      });
    }
    
    next();
  };
};

// Custom validation middleware creator
export const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        error: 'Validation failed',
        messages: errorMessages
      });
    }
    
    next();
  };
};