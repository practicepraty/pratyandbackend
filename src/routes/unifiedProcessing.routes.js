// src/routes/unifiedProcessing.routes.js
import express from "express";
import { 
  processTextToWebsite,
  processAudioToWebsite,
  getProcessingStatus,
  getUserProcessingJobs,
  cancelProcessingJob,
  getServiceStats,
  clearCache
} from "../controllers/unifiedProcessing.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { singleAudioUpload, flexibleAudioUpload, handleMulterError, validateAudioFile } from "../middlewares/multer.middleware.js";
import { authLoggingMiddleware } from "../middlewares/authLogging.middleware.js";
import { rateLimiter, aiRateLimiter, uploadRateLimiter } from "../middleware/rateLimit.js";
import { body, param, query, validationResult } from "express-validator";
import { ApiError } from "../utils/apierror.js";

const router = express.Router();

// Validation middleware for handling express-validator errors
const handleValidationErrors = (req, res, next) => {
  console.log(`[VALIDATION DEBUG] Starting handleValidationErrors middleware`);
  console.log(`[VALIDATION DEBUG] Has file: ${!!req.file}`);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array();
    const errorMessages = errorDetails.map(error => error.msg);
    
    // Enhanced debugging for validation errors
    console.error(`[VALIDATION ERROR] Request validation failed:`, {
      url: req.originalUrl,
      method: req.method,
      errors: errorDetails,
      body: req.body,
      hasFile: !!req.file,
      fileDetails: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null,
      userId: req.user?._id
    });
    
    throw new ApiError(400, errorMessages.join('; '));
  }
  
  console.log(`[VALIDATION DEBUG] Validation passed, file still present: ${!!req.file}`);
  next();
};

// Text input validation rules
const textInputValidation = [
  body('text')
    .notEmpty()
    .withMessage('Text content is required')
    .isLength({ min: 10, max: 10000 })
    .withMessage('Text must be between 10 and 10,000 characters')
    .trim()
    .escape(),
  body('specialty')
    .optional()
    .isIn(['general-practice', 'cardiology', 'dermatology', 'dentistry', 'pediatrics'])
    .withMessage('Invalid medical specialty'),
  body('saveToDatabase')
    .optional()
    .isBoolean()
    .withMessage('saveToDatabase must be a boolean'),
  body('skipCache')
    .optional()
    .isBoolean()
    .withMessage('skipCache must be a boolean'),
  body('notifyProgress')
    .optional()
    .isBoolean()
    .withMessage('notifyProgress must be a boolean')
];

// Audio input validation rules - flexible for FormData
const audioInputValidation = [
  body('language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'hi', 'ja', 'zh', 'ko', 'ru', 'ar', 'tr', 'pl', 'uk'])
    .withMessage('Invalid language code'),
  body('speakerLabels')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      return ['true', 'false', true, false].includes(value);
    })
    .withMessage('speakerLabels must be a boolean or boolean string'),
  body('expectedSpeakers')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      const num = parseInt(value);
      return !isNaN(num) && num >= 1 && num <= 10;
    })
    .withMessage('expectedSpeakers must be between 1 and 10'),
  body('autoHighlights')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      return ['true', 'false', true, false].includes(value);
    })
    .withMessage('autoHighlights must be a boolean or boolean string'),
  body('saveToDatabase')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      return ['true', 'false', true, false].includes(value);
    })
    .withMessage('saveToDatabase must be a boolean or boolean string'),
  body('skipCache')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      return ['true', 'false', true, false].includes(value);
    })
    .withMessage('skipCache must be a boolean or boolean string'),
  body('notifyProgress')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      return ['true', 'false', true, false].includes(value);
    })
    .withMessage('notifyProgress must be a boolean or boolean string')
];

// Request ID validation
const requestIdValidation = [
  param('requestId')
    .isUUID()
    .withMessage('Invalid request ID format - must be a valid UUID')
];

// Cache pattern validation
const cachePatternValidation = [
  query('pattern')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Cache pattern must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9:*_-]+$/)
    .withMessage('Cache pattern contains invalid characters')
];

// Public routes (no authentication required)
// Health check and service statistics
router.route("/health").get(getServiceStats);

// Protected routes (require authentication)

// Text processing endpoints
router.route("/process-text").post(
  verifyJWT,
  aiRateLimiter.generation,
  textInputValidation,
  handleValidationErrors,
  processTextToWebsite
);

// Audio processing endpoints
router.route("/process-audio").post(
  verifyJWT,
  uploadRateLimiter.audio,
  flexibleAudioUpload,
  handleMulterError,
  validateAudioFile,
  audioInputValidation,
  handleValidationErrors,
  processAudioToWebsite
);

// Processing status and management endpoints
router.route("/status/:requestId").get(
  authLoggingMiddleware,
  verifyJWT,
  requestIdValidation,
  handleValidationErrors,
  getProcessingStatus
);

router.route("/jobs").get(
  authLoggingMiddleware,
  verifyJWT,
  getUserProcessingJobs
);

router.route("/cancel/:requestId").post(
  authLoggingMiddleware,
  verifyJWT,
  requestIdValidation,
  handleValidationErrors,
  cancelProcessingJob
);

// Service stats route (accessible by authenticated users)
router.route("/stats").get(
  verifyJWT,
  getServiceStats
);

router.route("/cache/clear").delete(
  verifyJWT,
  // TODO: Add admin permission check middleware
  cachePatternValidation,
  handleValidationErrors,
  clearCache
);

// Enhanced error handling middleware specific to this router
router.use((error, req, res, next) => {
  // Log error for debugging
  console.error('Unified Processing Route Error:', {
    error: error.message,
    stack: error.stack,
    route: req.route?.path,
    method: req.method,
    params: req.params,
    body: req.body,
    user: req.user?._id
  });

  // Handle specific error types
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Audio file exceeds 25MB limit. Please compress your file and try again.',
        maxSize: '25MB'
      }
    });
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_AUDIO_FORMAT',
        message: 'Invalid audio file format. Supported formats: MP3, WAV, M4A, FLAC, OGG, WebM.',
        supportedFormats: ['MP3', 'WAV', 'M4A', 'FLAC', 'OGG', 'WebM']
      }
    });
  }

  if (error.message?.includes('AssemblyAI')) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'TRANSCRIPTION_SERVICE_UNAVAILABLE',
        message: 'Audio transcription service is temporarily unavailable. Please try again later.',
        retryAfter: 300 // 5 minutes
      }
    });
  }

  if (error.message?.includes('rate limit')) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait before trying again.',
        retryAfter: error.retryAfter || 60
      }
    });
  }

  // Pass to global error handler
  next(error);
});

export default router;