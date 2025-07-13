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
const audioFileFilter = (req, file, cb) => {
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
  
  // Basic MIME type and extension check - accept if either MIME type OR extension is valid
  const validMimeType = allowedAudioTypes.includes(file.mimetype);
  const validExtension = allowedExtensions.includes(fileExtension);
  
  console.log(`[MULTER] File validation check:`, {
    originalname: file.originalname,
    mimetype: file.mimetype,
    extension: fileExtension,
    validMimeType,
    validExtension
  });
  
  if (!validMimeType && !validExtension) {
    console.error(`[MULTER] File rejected - MIME: ${file.mimetype}, Extension: ${fileExtension}`);
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
  console.log(`[VALIDATE DEBUG] Starting validateAudioFile middleware`);
  console.log(`[VALIDATE DEBUG] Has file: ${!!req.file}`);
  
  if (!req.file) {
    console.log(`[VALIDATE DEBUG] No file present, skipping validation`);
    return next();
  }
  
  console.log(`[DEBUG] Validating audio file:`, {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    destination: req.file.destination,
    filename: req.file.filename
  });
  
  // Verify file exists on filesystem
  if (!fs.existsSync(req.file.path)) {
    console.error(`[ERROR] Audio file not found at: ${req.file.path}`);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'Audio file was not saved properly during upload'
      }
    });
  }
  
  try {
    // Check if file exists and has content
    const fileStats = fs.statSync(req.file.path);
    if (fileStats.size === 0) {
      console.error(`[ERROR] Audio file is empty: ${req.file.originalname}`);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_FILE',
          message: 'Audio file is empty or contains no data'
        }
      });
    }
    
    // Check minimum file size (1KB for audio)
    if (fileStats.size < 1024) {
      console.error(`[ERROR] Audio file too small: ${fileStats.size} bytes`);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_SMALL',
          message: 'Audio file is too small to contain valid audio data'
        }
      });
    }
    
    // Read the first few bytes to detect file type
    const buffer = fs.readFileSync(req.file.path, { start: 0, end: 32 });
    const detectedType = await fileTypeFromBuffer(buffer);
    
    console.log(`[DEBUG] Detected file type:`, detectedType);
    
    const validAudioTypes = ['mp3', 'wav', 'mp4', 'flac', 'ogg', 'webm'];
    
    if (!detectedType || !validAudioTypes.includes(detectedType.ext)) {
      console.error(`[ERROR] Invalid file type detected:`, detectedType);
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
    
    // Additional audio content validation
    try {
      const audioBuffer = fs.readFileSync(req.file.path);
      
      // Check for common audio file headers/signatures
      let isValidAudio = false;
      
      if (detectedType.ext === 'mp3') {
        // MP3 files should have ID3 tag or MP3 frame header
        isValidAudio = audioBuffer.indexOf(Buffer.from('ID3')) === 0 || 
                      audioBuffer.indexOf(Buffer.from([0xFF, 0xFB])) !== -1 ||
                      audioBuffer.indexOf(Buffer.from([0xFF, 0xFA])) !== -1;
      } else if (detectedType.ext === 'wav') {
        // WAV files should have RIFF header
        isValidAudio = audioBuffer.indexOf(Buffer.from('RIFF')) === 0 && 
                      audioBuffer.indexOf(Buffer.from('WAVE')) === 8;
      } else if (detectedType.ext === 'mp4') {
        // M4A files should have proper atoms
        isValidAudio = audioBuffer.indexOf(Buffer.from('ftyp')) !== -1;
      } else {
        // For other formats, accept if file type detection passed
        isValidAudio = true;
      }
      
      if (!isValidAudio) {
        console.error(`[ERROR] Audio file appears corrupted or invalid`);
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: {
            code: 'CORRUPTED_AUDIO',
            message: 'Audio file appears to be corrupted or invalid'
          }
        });
      }
      
      console.log(`[DEBUG] Audio file validation passed for: ${req.file.originalname}`);
      
    } catch (audioCheckError) {
      console.error(`[ERROR] Audio content validation failed:`, audioCheckError);
      // Don't fail here, let the transcription service handle it
    }
    
    // Add detected type to request for later use
    req.file.detectedMimeType = detectedType.mime;
    req.file.detectedExtension = detectedType.ext;
    
    console.log(`[VALIDATE DEBUG] File validation completed successfully`);
    console.log(`[VALIDATE DEBUG] File still present: ${!!req.file}`);
    
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

// Dedicated audio upload middleware with robust configuration
export const audioUpload = multer({
    storage: audioStorage,
    fileFilter: audioFileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit for audio files
      files: 1, // Only allow one audio file at a time
      fields: 20, // Allow multiple form fields (language, speakerLabels, etc.)
      fieldSize: 10 * 1024 * 1024, // 10MB per field
      fieldNameSize: 100, // Field name size limit
      parts: 30 // Total parts limit (files + fields)
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

// Clean, dedicated audio upload middleware without conflicts
export const singleAudioUpload = (req, res, next) => {
  // Use the dedicated audio upload configuration directly
  audioUpload.single('audioFile')(req, res, (err) => {
    if (err) {
      console.error(`[MULTER ERROR] Audio upload failed:`, {
        message: err.message,
        code: err.code,
        field: err.field
      });
      return next(err);
    }
    
    if (req.file) {
      console.log(`[MULTER] Audio file processed: ${req.file.originalname} (${req.file.size} bytes)`);
    }
    
    next();
  });
};

// Array of audio files upload middleware
export const multipleAudioUpload = audioUpload.array('audioFiles', 3);

// Single image upload middleware  
export const singleImageUpload = imageUpload.single('image');

// Array of images upload middleware
export const multipleImageUpload = imageUpload.array('images', 10);

// Error handling middleware for multer
export const handleMulterError = (error, req, res, next) => {
  console.log(`[MULTER ERROR DEBUG] Starting handleMulterError middleware`);
  console.log(`[MULTER ERROR DEBUG] Has file: ${!!req.file}`);
  console.log(`[MULTER ERROR DEBUG] Error: ${error ? error.message : 'none'}`);
  
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
      console.error(`[MULTER ERROR] File count limit exceeded:`, {
        message: error.message,
        code: error.code,
        field: error.field,
        limit: error.limit
      });
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Too many files uploaded. Please upload only one audio file.',
          details: `Expected 1 file, received ${error.limit || 'multiple'}. Ensure you're only sending one audio file in the 'audioFile' field.`,
          expectedField: 'audioFile',
          maxFiles: 1
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
  
  console.log(`[MULTER ERROR DEBUG] No multer error, passing to next middleware. File present: ${!!req.file}`);
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