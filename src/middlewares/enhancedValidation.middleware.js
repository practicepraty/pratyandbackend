// src/middlewares/enhancedValidation.middleware.js
import { body, param, query, validationResult } from 'express-validator';
import { ApiError } from '../utils/apierror.js';
import rateLimit from 'express-rate-limit';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { safeRedisOperation } from '../config/redis.config.js';

// Comprehensive validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path || error.param,
      value: error.value,
      message: error.msg,
      location: error.location
    }));

    const response = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: errorDetails,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(400).json(response);
  }
  next();
};

// Enhanced text content validation
export const validateTextContent = [
  body('text')
    .notEmpty()
    .withMessage('Text content is required')
    .isLength({ min: 10, max: 10000 })
    .withMessage('Text must be between 10 and 10,000 characters')
    .custom((value) => {
      // Check for meaningful content
      const cleanText = value.trim();
      const uniqueChars = new Set(cleanText.toLowerCase().replace(/\s/g, ''));
      if (uniqueChars.size < 5) {
        throw new Error('Text lacks meaningful content - please provide a proper description');
      }
      
      // Check for excessive repetition
      const words = cleanText.split(/\s+/);
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      if (words.length > 50 && uniqueWords.size / words.length < 0.3) {
        throw new Error('Text appears to be repetitive - please provide varied content');
      }
      
      return true;
    })
    .trim()
    .escape(),
  
  body('specialty')
    .optional()
    .isIn(['general-practice', 'cardiology', 'dermatology', 'dentistry', 'pediatrics'])
    .withMessage('Invalid medical specialty. Supported: general-practice, cardiology, dermatology, dentistry, pediatrics'),
    
  body('saveToDatabase')
    .optional()
    .isBoolean()
    .withMessage('saveToDatabase must be a boolean value (true/false)'),
    
  body('skipCache')
    .optional()
    .isBoolean()
    .withMessage('skipCache must be a boolean value (true/false)'),
    
  body('notifyProgress')
    .optional()
    .isBoolean()
    .withMessage('notifyProgress must be a boolean value (true/false)')
];

// Enhanced audio processing validation
export const validateAudioProcessing = [
  body('language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'hi', 'ja', 'zh', 'ko', 'ru', 'ar', 'tr', 'pl', 'uk'])
    .withMessage('Invalid language code. Supported: en, es, fr, de, it, pt, nl, hi, ja, zh, ko, ru, ar, tr, pl, uk'),
    
  body('speakerLabels')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return ['true', 'false'].includes(value.toLowerCase());
      }
      return typeof value === 'boolean';
    })
    .withMessage('speakerLabels must be a boolean value or "true"/"false" string'),
    
  body('expectedSpeakers')
    .optional()
    .custom((value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 1 && num <= 10;
    })
    .withMessage('expectedSpeakers must be a number between 1 and 10'),
    
  body('autoHighlights')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return ['true', 'false'].includes(value.toLowerCase());
      }
      return typeof value === 'boolean';
    })
    .withMessage('autoHighlights must be a boolean value or "true"/"false" string'),
    
  body('saveToDatabase')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return ['true', 'false'].includes(value.toLowerCase());
      }
      return typeof value === 'boolean';
    })
    .withMessage('saveToDatabase must be a boolean value or "true"/"false" string'),
    
  body('skipCache')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return ['true', 'false'].includes(value.toLowerCase());
      }
      return typeof value === 'boolean';
    })
    .withMessage('skipCache must be a boolean value or "true"/"false" string'),
    
  body('notifyProgress')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return ['true', 'false'].includes(value.toLowerCase());
      }
      return typeof value === 'boolean';
    })
    .withMessage('notifyProgress must be a boolean value or "true"/"false" string')
];

// Request ID validation
export const validateRequestId = [
  param('requestId')
    .isUUID(4)
    .withMessage('Invalid request ID format - must be a valid UUID v4')
    .custom((value) => {
      // Additional UUID format check
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Request ID must be a valid UUID v4 format');
      }
      return true;
    })
];

// Cache pattern validation
export const validateCachePattern = [
  query('pattern')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Cache pattern must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9:*_-]+$/)
    .withMessage('Cache pattern can only contain letters, numbers, colons, asterisks, underscores, and hyphens')
    .custom((value) => {
      // Prevent dangerous patterns
      if (value === '*' || value === '**') {
        throw new Error('Wildcard-only patterns are not allowed for safety');
      }
      return true;
    })
];

// File size validation middleware
export const validateFileSize = (maxSizeInMB = 25) => {
  return (req, res, next) => {
    if (req.file) {
      const fileSizeInMB = req.file.size / (1024 * 1024);
      if (fileSizeInMB > maxSizeInMB) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size (${fileSizeInMB.toFixed(2)}MB) exceeds the maximum allowed size of ${maxSizeInMB}MB`,
            maxSize: `${maxSizeInMB}MB`,
            actualSize: `${fileSizeInMB.toFixed(2)}MB`
          }
        });
      }
    }
    next();
  };
};

// Request rate limiting with detailed error messages
export const createDetailedRateLimit = (options) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests',
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      const resetTime = new Date(Date.now() + windowMs);
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `${message}. Maximum ${max} requests per ${Math.round(windowMs / 60000)} minutes.`,
          limit: max,
          windowMs: windowMs,
          resetTime: resetTime.toISOString(),
          retryAfter: Math.round(windowMs / 1000)
        }
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Redis-based rate limiting with fallback
export const createRedisRateLimit = (options) => {
  const {
    points = 100,
    duration = 900, // 15 minutes
    blockDuration = 900, // 15 minutes
    keyPrefix = 'rl:',
    message = 'Too many requests'
  } = options;

  let rateLimiter = null;

  // Try to create Redis rate limiter
  safeRedisOperation(
    async (client) => {
      rateLimiter = new RateLimiterRedis({
        storeClient: client,
        keyPrefix,
        points,
        duration,
        blockDuration
      });
    },
    null
  );

  return async (req, res, next) => {
    const key = req.ip;

    if (!rateLimiter) {
      // Fallback to memory-based rate limiting
      return createDetailedRateLimit({
        windowMs: duration * 1000,
        max: points,
        message
      })(req, res, next);
    }

    try {
      await rateLimiter.consume(key);
      next();
    } catch (rejRes) {
      const resetTime = new Date(Date.now() + Math.round(rejRes.msBeforeNext));
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `${message}. Maximum ${points} requests per ${Math.round(duration / 60)} minutes.`,
          limit: points,
          remaining: rejRes.remainingPoints || 0,
          resetTime: resetTime.toISOString(),
          retryAfter: Math.round(rejRes.msBeforeNext / 1000)
        }
      });
    }
  };
};

// Content type validation
export const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CONTENT_TYPE',
          message: 'Content-Type header is required',
          allowedTypes
        }
      });
    }
    
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed) {
      return res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_CONTENT_TYPE',
          message: `Content-Type '${contentType}' is not supported`,
          allowedTypes,
          received: contentType
        }
      });
    }
    
    next();
  };
};

// Request size validation
export const validateRequestSize = (maxSizeInBytes = 16 * 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength && parseInt(contentLength) > maxSizeInBytes) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds maximum allowed size of ${Math.round(maxSizeInBytes / (1024 * 1024))}MB`,
          maxSize: Math.round(maxSizeInBytes / (1024 * 1024)),
          receivedSize: Math.round(parseInt(contentLength) / (1024 * 1024))
        }
      });
    }
    
    next();
  };
};

// Header validation
export const validateHeaders = (requiredHeaders = []) => {
  return (req, res, next) => {
    const missingHeaders = [];
    
    requiredHeaders.forEach(header => {
      if (!req.get(header)) {
        missingHeaders.push(header);
      }
    });
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_HEADERS',
          message: 'Required headers are missing',
          missingHeaders,
          requiredHeaders
        }
      });
    }
    
    next();
  };
};

// Combined validation middleware for text processing
export const validateTextProcessing = [
  validateContentType(['application/json']),
  validateRequestSize(),
  ...validateTextContent,
  handleValidationErrors
];

// Combined validation middleware for audio processing
export const validateAudioProcessingRequest = [
  validateContentType(['multipart/form-data']),
  validateRequestSize(26 * 1024 * 1024), // 26MB for audio + metadata
  validateFileSize(25),
  ...validateAudioProcessing,
  handleValidationErrors
];

// Export commonly used validators
export {
  body,
  param,
  query,
  validationResult
};