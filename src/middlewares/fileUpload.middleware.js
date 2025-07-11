import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { fileTypeFromFile } from 'file-type';
import clamscan from 'clamscan';
import { ApiError } from '../utils/apierror.js';
import { logSecurityEvent } from './audit.middleware.js';

// Initialize ClamAV scanner
let clamScanner;
try {
  clamScanner = await clamscan.init({
    removeInfected: true,
    quarantineInfected: false,
    scanLog: 'logs/clamscan.log',
    debugMode: false,
    fileList: null,
    scanRecursively: true,
    clamscan: {
      path: '/usr/bin/clamscan',
      db: null,
      scanArchives: true,
      active: true
    },
    clamdscan: {
      socket: false,
      host: 'localhost',
      port: 3310,
      timeout: 60000,
      localFallback: true,
      active: true
    },
    preference: 'clamdscan'
  });
} catch (error) {
  console.warn('ClamAV not available, file scanning disabled:', error.message);
}

// Allowed file types with their corresponding MIME types
const allowedFileTypes = {
  images: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg']
  },
  audio: {
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/mp4': ['.m4a'],
    'audio/flac': ['.flac'],
    'audio/ogg': ['.ogg'],
    'audio/webm': ['.webm']
  },
  documents: {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  }
};

// File size limits (in bytes)
const fileSizeLimits = {
  image: 10 * 1024 * 1024, // 10MB
  audio: 100 * 1024 * 1024, // 100MB
  document: 25 * 1024 * 1024 // 25MB
};

// Create secure filename
const createSecureFilename = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName).toLowerCase();
  const sanitizedName = path.basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50);
  
  return `${sanitizedName}_${timestamp}_${randomString}${extension}`;
};

// Validate file type by content
const validateFileType = async (filepath, expectedType) => {
  try {
    const fileType = await fileTypeFromFile(filepath);
    
    if (!fileType) {
      throw new Error('Could not determine file type');
    }
    
    const allowedTypes = Object.keys(allowedFileTypes[expectedType] || {});
    
    if (!allowedTypes.includes(fileType.mime)) {
      throw new Error(`Invalid file type. Expected: ${allowedTypes.join(', ')}, Got: ${fileType.mime}`);
    }
    
    return fileType;
  } catch (error) {
    throw new Error(`File type validation failed: ${error.message}`);
  }
};

// Scan file for malware
const scanForMalware = async (filepath) => {
  if (!clamScanner) {
    console.warn('Malware scanning disabled - ClamAV not available');
    return { isInfected: false, viruses: [] };
  }
  
  try {
    const scanResult = await clamScanner.scanFile(filepath);
    
    if (scanResult.isInfected) {
      await fs.unlink(filepath).catch(() => {}); // Clean up infected file
      throw new Error(`Malware detected: ${scanResult.viruses.join(', ')}`);
    }
    
    return scanResult;
  } catch (error) {
    throw new Error(`Malware scan failed: ${error.message}`);
  }
};

// Enhanced file validation
const validateFile = async (file, expectedType) => {
  const errors = [];
  
  // Check file size
  const maxSize = fileSizeLimits[expectedType] || 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size exceeds limit. Max: ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
  }
  
  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = Object.values(allowedFileTypes[expectedType] || {}).flat();
  
  if (!allowedExtensions.includes(extension)) {
    errors.push(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
  }
  
  // Validate MIME type
  const allowedMimeTypes = Object.keys(allowedFileTypes[expectedType] || {});
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`Invalid MIME type. Allowed: ${allowedMimeTypes.join(', ')}`);
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
};

// Secure storage configuration
const createSecureStorage = (uploadPath, fileType) => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const fullPath = path.join(uploadPath, fileType);
        await fs.mkdir(fullPath, { recursive: true });
        cb(null, fullPath);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const secureFilename = createSecureFilename(file.originalname);
      cb(null, secureFilename);
    }
  });
};

// Create secure upload middleware
export const createSecureUpload = (options = {}) => {
  const {
    fileType = 'image',
    uploadPath = './public/temp',
    maxFiles = 1,
    requireAuth = true
  } = options;
  
  const storage = createSecureStorage(uploadPath, fileType);
  
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: fileSizeLimits[fileType] || 10 * 1024 * 1024,
      files: maxFiles
    },
    fileFilter: (req, file, cb) => {
      try {
        validateFile(file, fileType);
        cb(null, true);
      } catch (error) {
        cb(new ApiError(400, error.message));
      }
    }
  });
  
  return [
    ...(requireAuth ? [authenticateUser] : []),
    upload.single('file'),
    validateUploadedFile(fileType),
    scanUploadedFile,
    logFileUpload
  ];
};

// Middleware to authenticate user for uploads
const authenticateUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required for file upload'
    });
  }
  next();
};

// Validate uploaded file
const validateUploadedFile = (expectedType) => {
  return async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No file uploaded');
      }
      
      // Validate file type by content
      const fileType = await validateFileType(req.file.path, expectedType);
      req.file.validatedType = fileType;
      
      next();
    } catch (error) {
      // Clean up uploaded file on validation failure
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      
      logSecurityEvent(req, 'FILE_VALIDATION_FAILED', 'medium', {
        filename: req.file?.originalname,
        error: error.message
      });
      
      next(error);
    }
  };
};

// Scan uploaded file for malware
const scanUploadedFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }
    
    const scanResult = await scanForMalware(req.file.path);
    req.file.scanResult = scanResult;
    
    next();
  } catch (error) {
    // Log security event for malware detection
    logSecurityEvent(req, 'MALWARE_DETECTED', 'critical', {
      filename: req.file?.originalname,
      filepath: req.file?.path,
      error: error.message
    });
    
    next(new ApiError(400, 'File failed security scan'));
  }
};

// Log file upload activity
const logFileUpload = (req, res, next) => {
  if (req.file) {
    logSecurityEvent(req, 'FILE_UPLOADED', 'low', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      destination: req.file.destination,
      scanResult: req.file.scanResult
    });
  }
  next();
};

// Clean up temporary files
export const cleanupTempFiles = async (req, res, next) => {
  // Store original res.end to cleanup after response
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Clean up temporary files
    if (req.file && req.file.path) {
      fs.unlink(req.file.path).catch(() => {});
    }
    
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.path) {
          fs.unlink(file.path).catch(() => {});
        }
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Middleware for specific file types
export const uploadImage = createSecureUpload({
  fileType: 'image',
  uploadPath: './public/temp/images',
  maxFiles: 1
});

export const uploadAudio = createSecureUpload({
  fileType: 'audio',
  uploadPath: './public/temp/audio',
  maxFiles: 1
});

export const uploadDocument = createSecureUpload({
  fileType: 'document',
  uploadPath: './public/temp/documents',
  maxFiles: 1
});

// Scheduled cleanup of old temporary files
export const scheduleCleanup = () => {
  const cleanupInterval = 60 * 60 * 1000; // 1 hour
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  setInterval(async () => {
    const tempDir = './public/temp';
    
    try {
      const files = await fs.readdir(tempDir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(tempDir, file.name);
          const stats = await fs.stat(filePath);
          
          if (Date.now() - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old temp file: ${file.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error during temp file cleanup:', error);
    }
  }, cleanupInterval);
};

// File quarantine for suspicious files
export const quarantineFile = async (filepath) => {
  const quarantineDir = './quarantine';
  const filename = path.basename(filepath);
  const quarantinePath = path.join(quarantineDir, `${Date.now()}_${filename}`);
  
  try {
    await fs.mkdir(quarantineDir, { recursive: true });
    await fs.rename(filepath, quarantinePath);
    
    console.log(`File quarantined: ${filename} -> ${quarantinePath}`);
    return quarantinePath;
  } catch (error) {
    console.error('Error quarantining file:', error);
    throw error;
  }
};

// Initialize cleanup scheduler
if (process.env.NODE_ENV === 'production') {
  scheduleCleanup();
}