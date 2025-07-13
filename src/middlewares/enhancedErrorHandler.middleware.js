// src/middlewares/enhancedErrorHandler.middleware.js
import { ApiError } from '../utils/apierror.js';
import { logAuditEvent, HIPAA_EVENTS } from './hipaaAudit.middleware.js';
import winston from 'winston';

// Create error logger
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: './logs/error.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Error categories and their standard responses
const ERROR_CATEGORIES = {
  VALIDATION_ERROR: {
    statusCode: 400,
    category: 'client_error',
    retryable: false
  },
  AUTHENTICATION_ERROR: {
    statusCode: 401,
    category: 'auth_error',
    retryable: false
  },
  AUTHORIZATION_ERROR: {
    statusCode: 403,
    category: 'auth_error',
    retryable: false
  },
  NOT_FOUND_ERROR: {
    statusCode: 404,
    category: 'client_error',
    retryable: false
  },
  RATE_LIMIT_ERROR: {
    statusCode: 429,
    category: 'rate_limit',
    retryable: true
  },
  FILE_ERROR: {
    statusCode: 400,
    category: 'file_error',
    retryable: false
  },
  TRANSCRIPTION_ERROR: {
    statusCode: 500,
    category: 'external_service',
    retryable: true
  },
  AI_SERVICE_ERROR: {
    statusCode: 500,
    category: 'external_service',
    retryable: true
  },
  DATABASE_ERROR: {
    statusCode: 500,
    category: 'database',
    retryable: true
  },
  CACHE_ERROR: {
    statusCode: 500,
    category: 'cache',
    retryable: false
  },
  WEBSOCKET_ERROR: {
    statusCode: 500,
    category: 'websocket',
    retryable: false
  },
  INTERNAL_ERROR: {
    statusCode: 500,
    category: 'server_error',
    retryable: false
  }
};

// Determine error category from error message or type
const categorizeError = (error) => {
  // Safe string conversion to prevent toLowerCase errors
  const safeMessage = typeof error.message === 'string' ? error.message : String(error.message || '');
  const safeStack = typeof error.stack === 'string' ? error.stack : String(error.stack || '');
  
  const message = safeMessage.toLowerCase();
  const stack = safeStack.toLowerCase();

  // Check for specific error patterns
  if (message.includes('validation') || message.includes('invalid')) {
    return 'VALIDATION_ERROR';
  }
  
  if (message.includes('authentication') || message.includes('token')) {
    return 'AUTHENTICATION_ERROR';
  }
  
  if (message.includes('authorization') || message.includes('permission')) {
    return 'AUTHORIZATION_ERROR';
  }
  
  if (message.includes('not found') || error.statusCode === 404) {
    return 'NOT_FOUND_ERROR';
  }
  
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'RATE_LIMIT_ERROR';
  }
  
  if (message.includes('file') || message.includes('upload') || message.includes('multer')) {
    return 'FILE_ERROR';
  }
  
  if (message.includes('transcription') || message.includes('assemblyai') || message.includes('audio')) {
    return 'TRANSCRIPTION_ERROR';
  }
  
  if (message.includes('ai service') || message.includes('bedrock') || message.includes('claude')) {
    return 'AI_SERVICE_ERROR';
  }
  
  if (message.includes('database') || message.includes('mongo') || message.includes('connection')) {
    return 'DATABASE_ERROR';
  }
  
  if (message.includes('cache') || message.includes('redis')) {
    return 'CACHE_ERROR';
  }
  
  if (message.includes('websocket') || message.includes('socket.io')) {
    return 'WEBSOCKET_ERROR';
  }
  
  return 'INTERNAL_ERROR';
};

// Generate error tracking ID
const generateErrorId = () => {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Sanitize error message for public response
const sanitizeErrorMessage = (error, category) => {
  // Safe message extraction with type checking
  const rawMessage = typeof error.message === 'string' ? error.message : String(error.message || 'An error occurred');
  const message = rawMessage || 'An error occurred';
  
  // For production, sanitize sensitive information
  if (process.env.NODE_ENV === 'production') {
    switch (category) {
      case 'DATABASE_ERROR':
        return 'Database operation failed. Please try again.';
      case 'INTERNAL_ERROR':
        return 'Internal server error. Please contact support if the issue persists.';
      case 'AI_SERVICE_ERROR':
        return 'AI service temporarily unavailable. Please try again later.';
      case 'TRANSCRIPTION_ERROR':
        return 'Audio processing failed. Please check your file and try again.';
      default:
        // Remove potential sensitive information
        return message
          .replace(/password/gi, '***')
          .replace(/token/gi, '***')
          .replace(/key/gi, '***')
          .replace(/secret/gi, '***');
    }
  }
  
  return message;
};

// Get helpful suggestions based on error category
const getErrorSuggestions = (category, error) => {
  const suggestions = {
    VALIDATION_ERROR: [
      'Check that all required fields are provided',
      'Verify that field values are in the correct format',
      'Review the API documentation for parameter requirements'
    ],
    FILE_ERROR: [
      'Ensure your file is in a supported format (MP3, WAV, M4A, FLAC, OGG, WebM)',
      'Check that your file size is under 25MB',
      'Try uploading a different audio file'
    ],
    TRANSCRIPTION_ERROR: [
      'Ensure your audio file is clear and audible',
      'Try a shorter audio file',
      'Check your internet connection and try again',
      'Contact support if the issue persists'
    ],
    AI_SERVICE_ERROR: [
      'Try again in a few moments',
      'Ensure your input text is clear and descriptive',
      'Contact support if the issue persists'
    ],
    RATE_LIMIT_ERROR: [
      'Wait a few minutes before trying again',
      'Reduce the frequency of your requests',
      'Consider upgrading your plan for higher limits'
    ],
    AUTHENTICATION_ERROR: [
      'Check that you are logged in',
      'Verify your authentication token is valid',
      'Try logging out and logging back in'
    ],
    DATABASE_ERROR: [
      'Try again in a few moments',
      'Contact support if the issue persists'
    ]
  };

  return suggestions[category] || [
    'Try again in a few moments',
    'Contact support if the issue persists'
  ];
};

// Enhanced error handler middleware
export const enhancedErrorHandler = (error, req, res, next) => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  const errorId = generateErrorId();
  const category = categorizeError(error);
  const errorConfig = ERROR_CATEGORIES[category];
  
  // Determine status code
  const statusCode = error.statusCode || errorConfig.statusCode || 500;
  
  // Create error context for logging
  const errorContext = {
    errorId,
    category,
    statusCode,
    message: error.message,
    stack: error.stack,
    request: {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.get('user-agent'),
        'content-type': req.get('content-type'),
        'x-request-id': req.get('x-request-id')
      },
      ip: req.ip,
      userId: req.user?._id,
      params: req.params,
      query: req.query,
      // Don't log sensitive body data
      bodySize: JSON.stringify(req.body || {}).length
    },
    timestamp: new Date().toISOString()
  };

  // Log error with appropriate level
  if (statusCode >= 500) {
    errorLogger.error('Server Error', errorContext);
    
    // Log to HIPAA audit for server errors
    logAuditEvent(HIPAA_EVENTS.SYSTEM_ERROR, {
      userId: req.user?._id || 'anonymous',
      sourceIp: req.ip,
      resource: req.route?.path || req.url,
      action: req.method,
      outcome: 'error',
      additionalInfo: {
        errorId,
        category,
        statusCode,
        message: error.message
      }
    });
  } else if (statusCode >= 400) {
    errorLogger.warn('Client Error', errorContext);
  }

  // Prepare public error response
  const publicErrorResponse = {
    success: false,
    error: {
      id: errorId,
      code: category,
      message: sanitizeErrorMessage(error, category),
      statusCode,
      category: errorConfig.category,
      retryable: errorConfig.retryable,
      timestamp: new Date().toISOString()
    }
  };

  // Add additional details for client errors
  if (statusCode < 500) {
    publicErrorResponse.error.suggestions = getErrorSuggestions(category, error);
    
    // Add validation details if available
    if (error.validationDetails) {
      publicErrorResponse.error.validationDetails = error.validationDetails;
    }
    
    // Add retry information for rate limits
    if (category === 'RATE_LIMIT_ERROR') {
      publicErrorResponse.error.retryAfter = error.retryAfter || 60;
      publicErrorResponse.error.limit = error.limit;
      publicErrorResponse.error.remaining = error.remaining || 0;
    }
  }

  // Add debug information in development
  if (process.env.NODE_ENV === 'development') {
    publicErrorResponse.debug = {
      stack: error.stack,
      originalMessage: error.message,
      errorContext
    };
  }

  // Set appropriate headers
  res.status(statusCode);
  
  // Set retry headers for retryable errors
  if (errorConfig.retryable) {
    const retryAfter = error.retryAfter || (category === 'RATE_LIMIT_ERROR' ? 60 : 30);
    res.set('Retry-After', retryAfter.toString());
  }

  // Set error tracking header
  res.set('X-Error-ID', errorId);

  // Send error response
  res.json(publicErrorResponse);
};

// Async error wrapper
export const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    404, 
    `Route ${req.method} ${req.originalUrl} not found`
  );
  
  error.suggestions = [
    'Check the URL for typos',
    'Verify the HTTP method is correct',
    'Review the API documentation for available endpoints'
  ];
  
  next(error);
};

// Request timeout handler
export const timeoutHandler = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new ApiError(
          408,
          `Request timeout after ${timeoutMs}ms`
        );
        error.retryable = true;
        error.retryAfter = 30;
        next(error);
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

// Unhandled promise rejection handler for Express
export const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason, promise) => {
    errorLogger.error('Unhandled Promise Rejection', {
      reason: reason.toString(),
      stack: reason.stack,
      promise: promise.toString()
    });
  });
};

// Export error categories for use in other modules
export { ERROR_CATEGORIES, categorizeError, generateErrorId };