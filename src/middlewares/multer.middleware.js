import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { ApiError } from "../utils/apierror.js";

// Create directories if they don't exist
const createDirectories = () => {
  const tempDir = "./public/temp";
  const audioDir = "./public/temp/audio";
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
};

// Initialize directories
createDirectories();

// Enhanced storage configuration for general files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      // Generate secure filename to prevent path traversal
      const uniqueId = crypto.randomUUID();
      const extension = path.extname(file.originalname).toLowerCase();
      const sanitizedName = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 50); // Limit length
      
      cb(null, `${uniqueId}-${sanitizedName}${extension}`);
    }
});

// Enhanced storage configuration for audio files
const audioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp/audio")
    },
    filename: function (req, file, cb) {
      // Generate secure filename with UUID for audio files
      const uniqueId = crypto.randomUUID();
      const extension = path.extname(file.originalname).toLowerCase();
      const timestamp = Date.now();
      
      // Validate extension
      const allowedExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm'];
      if (!allowedExtensions.includes(extension)) {
        return cb(new ApiError(400, 'Invalid audio file extension'), false);
      }
      
      cb(null, `audio-${timestamp}-${uniqueId}${extension}`);
    }
});

// Enhanced file filter for audio files with magic number validation
const audioFileFilter = async (req, file, cb) => {
  const allowedAudioTypes = [
    'audio/mpeg',      // MP3
    'audio/wav',       // WAV
    'audio/x-wav',     // WAV alternative
    'audio/mp4',       // M4A
    'audio/x-m4a',     // M4A alternative
    'audio/flac',      // FLAC
    'audio/x-flac',    // FLAC alternative
    'audio/ogg',       // OGG
    'audio/webm'       // WebM
  ];
  
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Basic MIME type and extension check
  if (!allowedAudioTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
    return cb(new ApiError(400, 'Invalid audio file format. Supported formats: MP3, WAV, M4A, FLAC, OGG, WebM'), false);
  }
  
  // Additional security checks
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(new ApiError(400, 'Invalid filename - path traversal detected'), false);
  }
  
  if (file.originalname.length > 255) {
    return cb(new ApiError(400, 'Filename too long'), false);
  }
  
  cb(null, true);
};

// Enhanced magic number validation middleware
export const validateAudioFile = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    // Read the first few bytes to detect file type
    const buffer = fs.readFileSync(req.file.path, { start: 0, end: 32 });
    const detectedType = await fileTypeFromBuffer(buffer);
    
    const validAudioTypes = ['mp3', 'wav', 'mp4', 'flac', 'ogg', 'webm'];
    
    if (!detectedType || !validAudioTypes.includes(detectedType.ext)) {
      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File content does not match expected audio format'
        }
      });
    }
    
    // Add detected type to request for later use
    req.file.detectedMimeType = detectedType.mime;
    req.file.detectedExtension = detectedType.ext;
    
    next();
  } catch (error) {
    // Clean up the uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'FILE_VALIDATION_ERROR',
        message: 'Error validating file type'
      }
    });
  }
};

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid image file format. Supported formats: JPEG, PNG, GIF, WebP'), false);
  }
};

// General upload middleware
export const upload = multer({ 
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB for general files
    }
});

// Audio upload middleware
export const audioUpload = multer({
    storage: audioStorage,
    fileFilter: audioFileFilter,
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
      files: 1 // Only allow one audio file at a time
    }
});

// Image upload middleware
export const imageUpload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB for images
      files: 10 // Allow up to 10 images
    }
});

// Multiple file upload middleware
export const multipleUpload = multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 5 // Max 5 files
    }
});

// Single audio file upload middleware
export const singleAudioUpload = audioUpload.single('audioFile');

// Array of audio files upload middleware
export const multipleAudioUpload = audioUpload.array('audioFiles', 3);

// Single image upload middleware  
export const singleImageUpload = imageUpload.single('image');

// Array of images upload middleware
export const multipleImageUpload = imageUpload.array('images', 10);

// Error handling middleware for multer
export const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the allowed limit'
        }
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Too many files uploaded'
        }
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNEXPECTED_FILE',
          message: 'Unexpected file field'
        }
      });
    }
  } else if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message
      }
    });
  }
  
  next(error);
};

// Cleanup uploaded files utility
export const cleanupFiles = (files) => {
  if (!files) return;
  
  const fileArray = Array.isArray(files) ? files : [files];
  
  fileArray.forEach(file => {
    if (file && file.path) {
      try {
        fs.unlinkSync(file.path);
        console.log('Cleaned up file:', file.path);
      } catch (error) {
        console.error('Error cleaning up file:', file.path, error);
      }
    }
  });
};