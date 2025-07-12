// src/middlewares/errorHandler.middleware.js
import { ApiError } from "../utils/apierror.js";
import { auditLogger, logSecurityEvent } from "./audit.middleware.js";
import crypto from 'crypto';

const errorHandler = (err, req, res, next) => {
  // Generate request ID if not exists
  if (!req.requestId) {
    req.requestId = crypto.randomUUID();
  }
  let error = err;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors);
    let message = '';
    
    if (errors.length === 1) {
      // Single validation error - provide specific guidance
      const validationError = errors[0];
      const field = validationError.path;
      
      switch (field) {
        case 'personalInfo.professionalEmail':
          message = 'Please provide a valid professional email address.';
          break;
        case 'personalInfo.firstName':
          message = 'First name is required and must be at least 2 characters long.';
          break;
        case 'personalInfo.lastName':
          message = 'Last name is required and must be at least 2 characters long.';
          break;
        case 'personalInfo.phone':
          message = 'Please provide a valid phone number.';
          break;
        case 'transcription':
          message = 'Transcription text is required and must be at least 10 characters long.';
          break;
        case 'websiteTitle':
          message = 'Website title is required and must be between 3 and 100 characters.';
          break;
        default:
          message = validationError.message || `${field} is required or invalid.`;
      }
    } else {
      // Multiple validation errors - list them clearly
      message = 'Please fix the following errors:\n' + errors.map(error => {
        const field = error.path;
        switch (field) {
          case 'personalInfo.professionalEmail':
            return '• Professional email is required and must be valid';
          case 'personalInfo.firstName':
            return '• First name is required';
          case 'personalInfo.lastName':
            return '• Last name is required';
          case 'personalInfo.phone':
            return '• Phone number is required';
          case 'transcription':
            return '• Transcription text is required';
          case 'websiteTitle':
            return '• Website title is required';
          default:
            return `• ${field}: ${error.message}`;
        }
      }).join('\n');
    }
    
    error = new ApiError(400, message);
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Provide more specific duplicate key error messages
    if (err.keyPattern) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue ? err.keyValue[field] : 'this value';
      
      switch (field) {
        case 'personalInfo.professionalEmail':
          message = 'An account with this email address already exists. Please use a different email or try logging in.';
          break;
        case 'personalInfo.phone':
          message = 'An account with this phone number already exists. Please use a different phone number.';
          break;
        case 'websiteTitle':
          message = 'A website with this title already exists. Please choose a different title.';
          break;
        case 'name':
          message = 'A resource with this name already exists. Please choose a different name.';
          break;
        default:
          message = `A resource with ${field} '${value}' already exists. Please choose a different value.`;
      }
    }
    
    error = new ApiError(400, message);
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    let message = 'Resource not found';
    let statusCode = 404;
    
    // Provide more specific error messages based on the cast error
    if (err.path === '_id' || err.path === 'websiteId') {
      if (err.kind === 'ObjectId') {
        message = 'The website ID you provided is not valid. Please check the ID and try again. Website IDs should be 24 characters long and contain only letters and numbers.';
        statusCode = 400; // Bad request for invalid format
      } else {
        message = 'The website identifier format is incorrect. Please provide a valid website ID.';
        statusCode = 400;
      }
    } else if (err.path === 'userId') {
      message = 'The user ID format is invalid. Please check your authentication or contact support.';
      statusCode = 400;
    } else if (err.path === 'transcriptionId') {
      message = 'The transcription ID is not valid. Please check the ID or try generating a new transcription.';
      statusCode = 400;
    } else if (err.path === 'jobId') {
      message = 'The job ID format is invalid. Please check the transcription job ID and try again.';
      statusCode = 400;
    } else {
      // Generic cast error with helpful guidance
      const fieldName = err.path.charAt(0).toUpperCase() + err.path.slice(1);
      message = `The ${fieldName} value you provided is not in the correct format. Please check the value and try again.`;
      statusCode = 400;
    }
    
    error = new ApiError(statusCode, message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ApiError(401, message);
  }

  // Handle JWT expired errors
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ApiError(401, message);
  }

  // Handle AWS/Bedrock specific errors
  if (err.name === 'ProvisionedThroughputExceededException') {
    const message = 'AI service is currently busy. Please try again in a moment.';
    error = new ApiError(429, message);
  }

  if (err.name === 'ModelNotReadyException') {
    const message = 'AI model is currently unavailable. Please try again later.';
    error = new ApiError(503, message);
  }

  if (err.name === 'AccessDeniedException') {
    const message = 'AI service access denied. Please contact support.';
    error = new ApiError(403, message);
  }

  // Handle rate limiting errors
  if (err.name === 'ThrottleException') {
    const message = 'Too many requests. Please try again later.';
    error = new ApiError(429, message);
  }
  
  // Handle security-related errors
  if (err.name === 'ForbiddenError' || err.message.includes('forbidden')) {
    const message = 'Access denied';
    error = new ApiError(403, message);
  }
  
  // Handle CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    const message = 'Invalid CSRF token';
    error = new ApiError(403, message);
  }
  
  // Handle malware detection errors
  if (err.name === 'MalwareDetectedError') {
    const message = 'File contains malicious content';
    error = new ApiError(400, message);
  }
  
  // Handle encryption/decryption errors
  if (err.message.includes('decrypt') || err.message.includes('encrypt')) {
    const message = 'Data processing failed';
    error = new ApiError(500, message);
  }
  
  // Handle MFA errors
  if (err.message.includes('MFA') || err.message.includes('two-factor')) {
    const message = 'Multi-factor authentication required';
    error = new ApiError(401, message);
  }

  // Handle MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerError') {
    const message = 'Database connection issue. Please try again in a moment.';
    error = new ApiError(503, message);
  }

  // Handle MongoDB timeout errors
  if (err.name === 'MongoTimeoutError') {
    const message = 'Request timed out. Please try again.';
    error = new ApiError(504, message);
  }

  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size exceeds the maximum allowed limit. Please upload a smaller file.';
    error = new ApiError(400, message);
  }

  // Handle file upload format errors
  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files uploaded. Please upload one file at a time.';
    error = new ApiError(400, message);
  }

  // Handle multer errors
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field. Please check the file upload requirements.';
    error = new ApiError(400, message);
  }

  // Handle missing required files
  if (err.message && err.message.includes('audio file is required')) {
    const message = 'Audio file is required for transcription. Please upload a valid audio file.';
    error = new ApiError(400, message);
  }

  // Handle empty transcription data
  if (err.message && err.message.includes('transcription') && err.message.includes('required')) {
    const message = 'Transcription data is required to generate website content. Please provide transcription text or upload an audio file.';
    error = new ApiError(400, message);
  }

  // Handle resource not found errors with more context
  if (err.name === 'DocumentNotFoundError' || (err.message && err.message.includes('not found'))) {
    let message = 'The requested resource could not be found.';
    
    if (err.message.includes('website') || err.message.includes('Website')) {
      message = 'The website you are looking for does not exist or has been deleted. Please check the website ID or create a new website.';
    } else if (err.message.includes('user') || err.message.includes('User')) {
      message = 'User account not found. Please check your login credentials or contact support.';
    } else if (err.message.includes('transcription') || err.message.includes('Transcription')) {
      message = 'The transcription job could not be found. It may have expired or been deleted. Please start a new transcription.';
    }
    
    error = new ApiError(404, message);
  }

  // Enhanced error logging with security considerations
  const errorId = crypto.randomUUID();
  const sanitizedError = {
    errorId: errorId,
    message: error.message,
    statusCode: error.statusCode,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?._id || 'anonymous'
  };
  
  // Log security-related errors
  if (error.statusCode >= 400 && error.statusCode < 500) {
    const severity = error.statusCode === 401 || error.statusCode === 403 ? 'high' : 'medium';
    logSecurityEvent(req, 'CLIENT_ERROR', severity, {
      errorCode: error.statusCode,
      errorMessage: error.message,
      errorId: errorId
    });
  }
  
  // Log server errors
  if (error.statusCode >= 500) {
    auditLogger.error('Server Error', sanitizedError);
    logSecurityEvent(req, 'SERVER_ERROR', 'high', {
      errorCode: error.statusCode,
      errorMessage: error.message,
      errorId: errorId
    });
  } else {
    auditLogger.warn('Client Error', sanitizedError);
  }
  
  console.error('Error Handler:', sanitizedError);

  // Sanitize error response for production
  const response = {
    success: false,
    statusCode: error.statusCode || 500,
    data: null,
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    errorId: errorId
  };
  
  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }
  
  // Remove sensitive information from error messages in production
  if (process.env.NODE_ENV === 'production') {
    // Generic error messages for certain types
    if (error.statusCode >= 500) {
      response.message = 'Internal Server Error';
    }
    
    // Remove database-specific error details
    if (error.message.includes('mongodb://') || error.message.includes('mongoose')) {
      response.message = 'Database operation failed';
    }
    
    // Remove file path information
    if (error.message.includes('/') || error.message.includes('\\')) {
      response.message = 'File operation failed';
    }
  }
  
  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  
  res.status(error.statusCode || 500).json(response);
};

export { errorHandler };