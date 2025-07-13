// src/controllers/unifiedProcessing.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import unifiedProcessingService from "../services/unifiedProcessingService.js";
import cacheService from "../services/cacheService.js";
import websocketService from "../services/websocketService.js";
import { cleanupFiles } from "../middlewares/multer.middleware.js";
import { isMongoDBAvailable, safeDBOperation, getDatabaseStatus } from "../utils/dbHelper.js";
import { logOwnershipCheck } from "../middlewares/authLogging.middleware.js";

// Process text input to generate website
const processTextToWebsite = asyncHandler(async (req, res) => {
  const { 
    text, 
    specialty, 
    saveToDatabase = true, 
    skipCache = false,
    notifyProgress = true 
  } = req.body;

  // Comprehensive input validation
  if (!text || typeof text !== 'string') {
    throw new ApiError(400, "Text content is required and must be a valid string describing your medical practice.");
  }

  const cleanText = text.trim();
  if (cleanText.length === 0) {
    throw new ApiError(400, "Text content cannot be empty. Please provide a description of your medical practice.");
  }

  if (cleanText.length < 10) {
    throw new ApiError(400, "Text content is too short. Please provide at least 10 characters describing your medical practice, services, or qualifications.");
  }

  if (cleanText.length > 10000) {
    throw new ApiError(400, "Text content is too long (maximum 10,000 characters). Please shorten your description while keeping essential information.");
  }

  // Validate specialty if provided
  const validSpecialties = ['general-practice', 'cardiology', 'dermatology', 'dentistry', 'pediatrics'];
  if (specialty && !validSpecialties.includes(specialty.toLowerCase())) {
    throw new ApiError(400, `Invalid specialty. Supported specialties: ${validSpecialties.join(', ')}`);
  }

  try {
    const textData = {
      text: cleanText,
      specialty: specialty?.toLowerCase(),
      userId: req.user?._id
    };

    const options = {
      saveToDatabase: saveToDatabase && !!req.user && isMongoDBAvailable(),
      skipCache: skipCache === true,
      notifyProgress: notifyProgress !== false
    };

    const result = await unifiedProcessingService.processTextInput(
      textData, 
      req.user?._id?.toString(), 
      options
    );

    // Enhanced response with metadata
    const response = {
      ...result,
      requestInfo: {
        inputType: 'text',
        processingMethod: result.cached ? 'cached' : 'generated',
        userId: req.user?._id || null,
        requestTimestamp: new Date().toISOString()
      },
      nextSteps: {
        available_actions: [
          'edit_content',
          'regenerate_section',
          'publish_website',
          'save_as_template'
        ],
        endpoints: {
          edit: `/api/v1/websites/${result.websiteId}`,
          regenerate: `/api/v1/ai/websites/${result.websiteId}/regenerate`,
          publish: `/api/v1/websites/${result.websiteId}/publish`
        }
      }
    };

    return res.status(200).json(
      new ApiResponse(
        200, 
        response, 
        result.cached 
          ? "Website content retrieved from cache successfully" 
          : "Website content generated from text successfully"
      )
    );

  } catch (error) {
    console.error("Text to website processing error:", error);
    
    // Provide user-friendly error messages
    if (error.message.includes('specialty')) {
      throw new ApiError(400, "Failed to detect medical specialty from your text. Please provide more specific information about your medical practice.");
    } else if (error.message.includes('content generation')) {
      throw new ApiError(500, "AI content generation failed. Please try again or contact support if the issue persists.");
    } else if (error.message.includes('database')) {
      throw new ApiError(500, "Content generated successfully but failed to save to database. Please try saving manually.");
    } else {
      throw new ApiError(500, "Failed to process text input. Please try again.");
    }
  }
});

// Process audio input to generate website
const processAudioToWebsite = asyncHandler(async (req, res) => {
  console.log(`[AUDIO] Processing request from user: ${req.user?._id}`);
  console.log(`[AUDIO] File received: ${req.file ? req.file.originalname : 'none'}`);
  
  try {
    if (!req.file) {
      console.error("[ERROR] No audio file uploaded");
      throw new ApiError(400, "Audio file is required. Please upload an audio file (MP3, WAV, M4A, FLAC, OGG, WebM) up to 25MB.");
    }

    console.log(`[DEBUG] ==================== AUDIO PROCESSING START ====================`);
    console.log(`[DEBUG] File validation passed, starting post-validation processing`);
    console.log(`[DEBUG] File details:`, {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
      path: req.file.path,
      destination: req.file.destination,
      fieldname: req.file.fieldname
    });

    // Verify file exists on disk
    const fs = await import('fs');
    const fileExists = fs.default.existsSync(req.file.path);
    console.log(`[DEBUG] File exists on disk: ${fileExists}`);
    
    if (!fileExists) {
      console.error(`[ERROR] Uploaded file not found at path: ${req.file.path}`);
      throw new ApiError(500, "Uploaded file not found on server");
    }

    // Safe parameter extraction with validation
    let language, speakerLabels, expectedSpeakers, autoHighlights, saveToDatabase, skipCache, notifyProgress;
    
    console.log(`[DEBUG] ==================== PARAMETER PARSING START ====================`);
    console.log(`[DEBUG] Raw request body:`, req.body);
    
    try {
      language = req.body.language || 'en';
      speakerLabels = req.body.speakerLabels === 'true' || req.body.speakerLabels === true || false;
      expectedSpeakers = req.body.expectedSpeakers || 2;
      autoHighlights = req.body.autoHighlights === 'true' || req.body.autoHighlights === true || false;
      saveToDatabase = req.body.saveToDatabase !== 'false' && req.body.saveToDatabase !== false;
      skipCache = req.body.skipCache === 'true' || req.body.skipCache === true || false;
      notifyProgress = req.body.notifyProgress !== 'false' && req.body.notifyProgress !== false;
      
      console.log(`[DEBUG] Parsed parameters:`, {
        language, speakerLabels, expectedSpeakers, autoHighlights, 
        saveToDatabase, skipCache, notifyProgress
      });
      console.log(`[DEBUG] Parameter parsing completed successfully`);
    } catch (paramError) {
      console.error("[ERROR] Parameter parsing failed:", paramError);
      throw new ApiError(400, "Invalid request parameters. Please check your form data.");
    }

    console.log(`[DEBUG] ==================== PARAMETER VALIDATION START ====================`);
    
    // Validate audio processing options
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'hi', 'ja', 'zh', 'ko', 'ru', 'ar', 'tr', 'pl', 'uk'];
    if (!validLanguages.includes(language)) {
      console.error(`[ERROR] Invalid language: ${language}`);
      throw new ApiError(400, `Invalid language code. Supported languages: ${validLanguages.join(', ')}`);
    }
    console.log(`[DEBUG] Language validation passed: ${language}`);

    const speakerCount = parseInt(expectedSpeakers);
    if (isNaN(speakerCount) || speakerCount < 1 || speakerCount > 10) {
      console.error(`[ERROR] Invalid speaker count: ${expectedSpeakers}`);
      throw new ApiError(400, "Expected speakers must be a number between 1 and 10");
    }
    console.log(`[DEBUG] Speaker count validation passed: ${speakerCount}`);
    console.log(`[DEBUG] Parameter validation completed successfully`);

    console.log(`[DEBUG] ==================== AUDIO DATA PREPARATION START ====================`);
    
    const audioData = {
      filePath: req.file.path,
      fileSize: req.file.size,
      format: req.file.detectedExtension || req.file.mimetype,
      originalName: req.file.originalname,
      options: {
        language,
        speakerLabels: speakerLabels === 'true' || speakerLabels === true,
        expectedSpeakers: speakerCount,
        autoHighlights: autoHighlights === 'true' || autoHighlights === true
      }
    };

    const options = {
      saveToDatabase: saveToDatabase !== 'false' && !!req.user && isMongoDBAvailable(),
      skipCache: skipCache === 'true' || skipCache === true,
      notifyProgress: notifyProgress !== 'false'
    };

    console.log(`[DEBUG] Audio data prepared:`, audioData);
    console.log(`[DEBUG] Processing options:`, options);
    console.log(`[DEBUG] User ID:`, req.user?._id?.toString());
    
    // Verify file exists before processing
    try {
      const fs = await import('fs');
      if (!fs.default.existsSync(audioData.filePath)) {
        console.error(`[ERROR] Audio file not found at path: ${audioData.filePath}`);
        throw new ApiError(500, "Audio file was uploaded but is not accessible on server filesystem");
      }
    } catch (fsError) {
      console.error(`[ERROR] File system check failed:`, fsError);
      throw new ApiError(500, `File system error: ${fsError.message}`);
    }
    
    console.log(`[DEBUG] ==================== CALLING UNIFIED PROCESSING SERVICE ====================`);
    
    let result;
    try {
      result = await unifiedProcessingService.processAudioInput(
        audioData, 
        req.user?._id?.toString(), 
        options
      );
      
      console.log(`[DEBUG] Unified processing service completed successfully`);
      console.log(`[DEBUG] Result summary:`, {
        hasResult: !!result,
        requestId: result?.requestId,
        transcriptionLength: result?.transcription?.text?.length,
        hasGeneratedContent: !!result?.generatedContent
      });
    } catch (serviceError) {
      console.error(`[ERROR] Unified processing service failed:`, {
        message: serviceError.message,
        stack: serviceError.stack,
        statusCode: serviceError.statusCode
      });
      throw serviceError;
    }

    console.log(`[DEBUG] ==================== PREPARING RESPONSE ====================`);

    // Enhanced response with comprehensive metadata
    const response = {
      ...result,
      requestInfo: {
        inputType: 'audio',
        processingMethod: result.processingMetadata.cached ? 'cached_transcription' : 'live_transcription',
        userId: req.user?._id || null,
        requestTimestamp: new Date().toISOString(),
        audioMetadata: {
          originalFileName: req.file.originalname,
          fileSize: req.file.size,
          detectedFormat: req.file.detectedExtension,
          processingOptions: audioData.options
        }
      },
      qualityMetrics: {
        transcriptionConfidence: result.transcription.confidence,
        audioQuality: result.transcription.qualityMetrics,
        speakerIdentification: result.transcription.speakers?.length || 0,
        processingEfficiency: {
          totalTime: result.processingMetadata.totalProcessingTime,
          transcriptionTime: result.processingMetadata.transcriptionTime,
          aiGenerationTime: result.processingMetadata.aiGenerationTime
        }
      },
      nextSteps: {
        available_actions: [
          'edit_content',
          'regenerate_section', 
          'view_transcription',
          'download_transcript',
          'publish_website'
        ],
        endpoints: {
          edit: `/api/v1/websites/${result.websiteId}`,
          regenerate: `/api/v1/ai/websites/${result.websiteId}/regenerate`,
          transcription: `/api/v1/ai/transcription/${result.transcription.id}`,
          publish: `/api/v1/websites/${result.websiteId}/publish`
        }
      }
    };

    return res.status(200).json(
      new ApiResponse(
        200, 
        response, 
        result.processingMetadata.cached 
          ? "Website generated from cached audio transcription successfully"
          : "Website generated from audio transcription successfully"
      )
    );

  } catch (error) {
    // Enhanced error logging for audio processing
    console.error(`[ERROR] Audio processing failed:`, {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      userId: req.user?._id,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      requestBody: req.body
    });

    // Clean up uploaded file in case of error
    if (req.file) {
      try {
        cleanupFiles(req.file);
        console.log(`[DEBUG] Cleaned up file: ${req.file.path}`);
      } catch (cleanupError) {
        console.error(`[ERROR] File cleanup failed:`, cleanupError);
      }
    }
    
    // Provide specific error messages for different failure types
    if (error.statusCode && error.statusCode < 500) {
      // Client errors - pass through with details
      throw error;
    } else if (error.message.includes('upload')) {
      throw new ApiError(400, "Audio file upload failed. Please check your file format and size (max 25MB) and try again.");
    } else if (error.message.includes('transcription')) {
      throw new ApiError(500, "Audio transcription failed. Please ensure your audio is clear and try again.");
    } else if (error.message.includes('Assembly')) {
      throw new ApiError(503, "Audio transcription service is temporarily unavailable. Please try again later.");
    } else if (error.message.includes('generation')) {
      throw new ApiError(500, "Website generation from transcription failed. Please try again.");
    } else if (error.message.includes('format')) {
      throw new ApiError(400, "Unsupported audio format. Please use MP3, WAV, M4A, FLAC, OGG, or WebM format.");
    } else if (error.message.includes('parameter')) {
      throw new ApiError(400, "Invalid request parameters. Please check your form data and try again.");
    } else {
      throw new ApiError(500, "Failed to process audio file. Please try again.");
    }
  }
});

// Get processing status for a request
const getProcessingStatus = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  // Enhanced logging for debugging
  console.log(`[DEBUG] Processing status request for ID: ${requestId}`);
  console.log(`[DEBUG] User ID: ${req.user?._id}`);

  if (!requestId) {
    console.error("[ERROR] Request ID missing in status request");
    throw new ApiError(400, "Request ID is required to check processing status.");
  }

  if (!requestId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    console.error(`[ERROR] Invalid request ID format: ${requestId}`);
    throw new ApiError(400, "Invalid request ID format. Please provide a valid UUID.");
  }

  try {
    console.log(`[DEBUG] Fetching status from unifiedProcessingService for: ${requestId}`);
    const status = unifiedProcessingService.getProcessingStatus(requestId);
    
    console.log(`[DEBUG] Status result:`, status ? 'Found' : 'Not found');

    if (!status) {
      console.log(`[DEBUG] Processing request not found: ${requestId}`);
      throw new ApiError(404, "Processing request not found. The request may have expired or completed.");
    }

    // Verify user ownership with enhanced logging and proper type conversion
    if (req.user) {
      const requestUserId = req.user._id ? req.user._id.toString() : req.user._id;
      const statusUserId = status.userId ? status.userId.toString() : status.userId;
      
      // Use the logging utility for ownership check
      const isAuthorized = logOwnershipCheck(statusUserId, requestUserId, 'processing_request');
      
      if (!isAuthorized) {
        throw new ApiError(403, "Access denied. You don't have permission to view this processing request.");
      }
    }

    // Safe date handling to prevent errors
    let startTimeISO, lastUpdateISO;
    try {
      startTimeISO = status.startTime ? new Date(status.startTime).toISOString() : null;
    } catch (dateError) {
      console.warn(`[WARN] Invalid startTime: ${status.startTime}`);
      startTimeISO = new Date().toISOString();
    }

    try {
      lastUpdateISO = status.lastUpdate ? new Date(status.lastUpdate).toISOString() : null;
    } catch (dateError) {
      console.warn(`[WARN] Invalid lastUpdate: ${status.lastUpdate}`);
      lastUpdateISO = new Date().toISOString();
    }

    const response = {
      requestId: status.requestId || requestId,
      currentStep: status.currentStep || 0,
      totalSteps: status.totalSteps || 1,
      progress: status.progress || 0,
      status: status.status || 'unknown',
      steps: status.steps || [],
      startTime: startTimeISO,
      lastUpdate: lastUpdateISO,
      estimatedTimeRemaining: status.estimatedTimeRemaining || null,
      metadata: status.metadata || {},
      elapsedTime: status.startTime ? (Date.now() - status.startTime) : 0
    };

    console.log(`[DEBUG] Returning status response for ${requestId}:`, response.status);

    return res.status(200).json(
      new ApiResponse(200, response, "Processing status retrieved successfully")
    );

  } catch (error) {
    console.error(`[ERROR] Get processing status error for ${requestId}:`, {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      userId: req.user?._id
    });
    
    // Don't throw the original error in the catch block - handle it properly
    if (error.statusCode && error.statusCode < 500) {
      // Client errors (400, 404, 403) - pass through
      throw error;
    } else {
      // Server errors - log and return generic message
      throw new ApiError(500, "Failed to retrieve processing status");
    }
  }
});

// Get user's active processing jobs
const getUserProcessingJobs = asyncHandler(async (req, res) => {
  try {
    console.log(`[DEBUG] Getting processing jobs for user: ${req.user._id}`);
    console.log(`[AUTH DEBUG] User access check:`, {
      userId: req.user._id,
      userIdString: req.user._id.toString(),
      userEmail: req.user.personalInfo?.professionalEmail,
      requestUrl: req.originalUrl,
      method: req.method,
      headers: req.headers.authorization ? 'Present' : 'Missing',
      timestamp: new Date().toISOString()
    });
    
    const jobs = unifiedProcessingService.getUserProcessingJobs(req.user._id.toString());
    
    console.log(`[AUTH DEBUG] Retrieved ${jobs.length} jobs for user ${req.user._id}:`, {
      jobCount: jobs.length,
      jobIds: jobs.map(j => j.requestId),
      userIdMatch: jobs.every(j => j.userId === req.user._id.toString()),
      timestamp: new Date().toISOString()
    });

    // Format jobs for response
    const formattedJobs = jobs.map(job => ({
      requestId: job.requestId,
      currentStep: job.currentStep,
      totalSteps: job.totalSteps,
      progress: job.progress,
      status: job.status,
      startTime: new Date(job.startTime).toISOString(),
      lastUpdate: new Date(job.lastUpdate).toISOString(),
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      elapsedTime: Date.now() - job.startTime,
      inputType: job.metadata?.inputType || 'unknown'
    }));

    const response = {
      activeJobs: formattedJobs,
      totalJobs: formattedJobs.length,
      hasActiveJobs: formattedJobs.length > 0,
      summary: {
        processing: formattedJobs.filter(job => job.status === 'processing').length,
        completed: formattedJobs.filter(job => job.status === 'completed').length,
        error: formattedJobs.filter(job => job.status === 'error').length,
        cancelled: formattedJobs.filter(job => job.status === 'cancelled').length
      }
    };

    return res.status(200).json(
      new ApiResponse(200, response, "User processing jobs retrieved successfully")
    );

  } catch (error) {
    console.error("Get user processing jobs error:", error);
    throw new ApiError(500, "Failed to retrieve processing jobs");
  }
});

// Cancel a processing job
const cancelProcessingJob = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  console.log(`[DEBUG] Cancel processing request: ${requestId} by user: ${req.user._id}`);
  console.log(`[AUTH DEBUG] Cancel request authorization:`, {
    requestId,
    userId: req.user._id,
    userIdString: req.user._id.toString(),
    userEmail: req.user.personalInfo?.professionalEmail,
    requestUrl: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (!requestId) {
    throw new ApiError(400, "Request ID is required to cancel processing.");
  }

  if (!requestId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    throw new ApiError(400, "Invalid request ID format.");
  }

  try {
    const result = await unifiedProcessingService.cancelProcessing(requestId, req.user._id.toString());

    return res.status(200).json(
      new ApiResponse(200, result, "Processing job cancelled successfully")
    );

  } catch (error) {
    console.error("Cancel processing job error:", error);
    
    if (error.statusCode === 404) {
      throw error;
    } else if (error.statusCode === 400) {
      throw error;
    } else {
      throw new ApiError(500, "Failed to cancel processing job");
    }
  }
});

// Get service statistics and health
const getServiceStats = asyncHandler(async (req, res) => {
  try {
    const stats = unifiedProcessingService.getServiceStats();
    const cacheStats = await cacheService.getStats();
    const websocketStats = websocketService.getConnectionStats();

    const response = {
      services: {
        audioProcessing: {
          available: stats.audioServiceAvailable,
          status: stats.audioServiceAvailable ? 'operational' : 'unavailable'
        },
        textProcessing: {
          available: true,
          status: 'operational'
        },
        caching: {
          available: true,
          redis: cacheStats.redis.connected,
          memory: true,
          status: 'operational'
        },
        websockets: {
          available: true,
          connectedClients: websocketStats.connectedClients,
          status: 'operational'
        },
        database: {
          ...getDatabaseStatus(),
          status: isMongoDBAvailable() ? 'operational' : 'unavailable'
        }
      },
      processing: {
        currentJobs: stats.currentProcessing,
        maxConcurrent: stats.maxConcurrentProcessing,
        queueSize: stats.queueSize,
        utilization: Math.round((stats.currentProcessing / stats.maxConcurrentProcessing) * 100)
      },
      cache: cacheStats,
      websockets: websocketStats,
      health: {
        overall: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    };

    return res.status(200).json(
      new ApiResponse(200, response, "Service statistics retrieved successfully")
    );

  } catch (error) {
    console.error("Get service stats error:", error);
    throw new ApiError(500, "Failed to retrieve service statistics");
  }
});

// Clear cache (admin only)
const clearCache = asyncHandler(async (req, res) => {
  const { pattern } = req.query;

  try {
    if (pattern) {
      await cacheService.invalidatePattern(pattern);
      return res.status(200).json(
        new ApiResponse(200, { pattern }, `Cache cleared for pattern: ${pattern}`)
      );
    } else {
      await cacheService.clearAll();
      return res.status(200).json(
        new ApiResponse(200, {}, "All cache cleared successfully")
      );
    }

  } catch (error) {
    console.error("Clear cache error:", error);
    throw new ApiError(500, "Failed to clear cache");
  }
});

export {
  processTextToWebsite,
  processAudioToWebsite,
  getProcessingStatus,
  getUserProcessingJobs,
  cancelProcessingJob,
  getServiceStats,
  clearCache
};