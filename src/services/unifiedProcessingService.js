// src/services/unifiedProcessingService.js
import crypto from 'crypto';
import AudioTranscriptionService from './audioTranscriptionService.js';
import AIService from '../service/ai.service.js';
import cacheService from './cacheService.js';
import websocketService from './websocketService.js';
import { ApiError } from '../utils/apierror.js';
import { Website } from '../models/website.models.js';
import { isMongoDBAvailable, safeDBOperation } from '../utils/dbHelper.js';

class UnifiedProcessingService {
  constructor() {
    this.audioService = null;
    this.processingQueue = new Map();
    this.maxConcurrentProcessing = 5;
    this.currentProcessing = 0;

    // Initialize audio service if available
    try {
      if (process.env.ASSEMBLYAI_API_KEY) {
        this.audioService = new AudioTranscriptionService();
      }
    } catch (error) {
      console.warn('Audio transcription service not available:', error.message);
    }
  }

  // Generate unique request ID
  generateRequestId() {
    return crypto.randomUUID();
  }

  // Estimate processing time based on input type and size
  estimateProcessingTime(inputType, inputData) {
    const baseTimes = {
      text: 5000, // 5 seconds base for text
      audio: 15000 // 15 seconds base for audio
    };

    let estimatedTime = baseTimes[inputType] || 10000;

    if (inputType === 'text') {
      // Add time based on text length
      const textLength = inputData.text?.length || 0;
      estimatedTime += Math.min(textLength * 10, 30000); // Max 30 seconds additional
    } else if (inputType === 'audio') {
      // Add time based on file size (rough estimate)
      const fileSize = inputData.fileSize || 0;
      const fileSizeInMB = fileSize / (1024 * 1024);
      estimatedTime += fileSizeInMB * 2000; // 2 seconds per MB
    }

    return Math.min(estimatedTime, 120000); // Max 2 minutes
  }

  // Process text input
  async processTextInput(textData, userId, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Create progress tracker
      const totalSteps = 4;
      websocketService.createProgressTracker(requestId, userId, totalSteps);

      // Step 1: Validate and clean text
      websocketService.updateProgress(requestId, {
        step: 1,
        progress: 10,
        status: 'processing',
        stepName: 'text_validation',
        message: 'Validating and cleaning text input...',
        metadata: { inputLength: textData.text.length }
      });

      const cleanedText = this.validateAndCleanText(textData.text);
      
      // Check cache for similar text processing
      const cacheKey = `${cleanedText}_${textData.specialty || 'auto'}`;
      const cachedResult = await cacheService.getCachedTextProcessing(cleanedText, textData.specialty || 'auto');
      
      if (cachedResult && !options.skipCache) {
        websocketService.updateProgress(requestId, {
          step: 4,
          progress: 100,
          status: 'completed',
          stepName: 'cache_hit',
          message: 'Retrieved from cache',
          metadata: { cached: true, processingTime: Date.now() - startTime }
        });

        websocketService.completeProgress(requestId, cachedResult);
        return {
          requestId,
          ...cachedResult,
          cached: true,
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Detect medical specialty
      websocketService.updateProgress(requestId, {
        step: 2,
        progress: 30,
        status: 'processing',
        stepName: 'specialty_detection',
        message: 'Detecting medical specialty...',
        metadata: { textLength: cleanedText.length }
      });

      const detectedSpecialty = textData.specialty || await AIService.detectMedicalSpecialty(cleanedText);

      // Step 3: Generate website content
      websocketService.updateProgress(requestId, {
        step: 3,
        progress: 60,
        status: 'processing',
        stepName: 'content_generation',
        message: 'Generating website content with AI...',
        metadata: { specialty: detectedSpecialty }
      });

      const websiteContent = await AIService.generateWebsiteContent(cleanedText, detectedSpecialty);

      // Step 4: Prepare final result
      websocketService.updateProgress(requestId, {
        step: 4,
        progress: 90,
        status: 'processing',
        stepName: 'result_preparation',
        message: 'Preparing final result...',
        metadata: { contentSections: Object.keys(websiteContent).length }
      });

      const processingTime = Date.now() - startTime;
      const result = {
        requestId,
        inputType: 'text',
        originalText: cleanedText,
        detectedSpecialty,
        generatedContent: websiteContent,
        processingMetadata: {
          processingTime,
          aiModel: AIService.modelId,
          cached: false,
          inputValidation: {
            originalLength: textData.text.length,
            cleanedLength: cleanedText.length,
            hasSpecialty: !!textData.specialty
          }
        },
        generatedAt: new Date().toISOString(),
        contentStructure: {
          hasHeroSection: !!websiteContent.heroSection,
          hasAboutSection: !!websiteContent.aboutSection,
          servicesCount: websiteContent.services?.length || 0,
          hasContactInfo: !!websiteContent.contactInfo,
          hasSeoMeta: !!websiteContent.seoMeta
        }
      };

      // Cache the result
      await cacheService.cacheTextProcessing(cleanedText, detectedSpecialty, result);

      // Save to database if requested and MongoDB is available
      if (options.saveToDatabase && userId && isMongoDBAvailable()) {
        try {
          const website = new Website({
            ...websiteContent,
            originalTranscription: cleanedText,
            userId: userId,
            generationMetadata: {
              aiModel: AIService.modelId,
              processingTime: processingTime,
              inputType: 'text',
              fallbackUsed: websiteContent.fallbackUsed || false,
              confidenceScore: websiteContent.confidenceScore || 0.9
            }
          });

          const savedWebsite = await website.save();
          result.websiteId = savedWebsite._id;
          result.savedToDatabase = true;
        } catch (dbError) {
          console.error('Database save error:', dbError);
          result.savedToDatabase = false;
          result.dbError = 'Failed to save to database';
        }
      } else if (options.saveToDatabase && userId && !isMongoDBAvailable()) {
        result.savedToDatabase = false;
        result.dbError = 'Database not available - content generated but not saved';
      }

      // Complete progress tracking
      websocketService.completeProgress(requestId, result);

      return result;

    } catch (error) {
      console.error('Text processing error:', error);
      websocketService.errorProgress(requestId, error);
      throw error;
    }
  }

  // Process audio input
  async processAudioInput(audioData, userId, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      if (!this.audioService) {
        throw new ApiError(503, 'Audio processing service not configured');
      }

      // Create progress tracker
      const totalSteps = 6;
      websocketService.createProgressTracker(requestId, userId, totalSteps);

      // Step 1: Validate audio file
      websocketService.updateProgress(requestId, {
        step: 1,
        progress: 5,
        status: 'processing',
        stepName: 'audio_validation',
        message: 'Validating audio file...',
        metadata: { fileSize: audioData.fileSize, format: audioData.format }
      });

      this.audioService.validateAudioFile(audioData.filePath);

      // Check cache for audio transcription
      const audioHash = await this.generateAudioHash(audioData.filePath);
      const cachedTranscription = await cacheService.getCachedTranscription(audioHash);

      let transcriptionResult;
      
      if (cachedTranscription && !options.skipCache) {
        websocketService.updateProgress(requestId, {
          step: 3,
          progress: 40,
          status: 'processing',
          stepName: 'transcription_cached',
          message: 'Using cached transcription...',
          metadata: { cached: true }
        });
        
        transcriptionResult = cachedTranscription;
      } else {
        // Step 2: Upload audio
        websocketService.updateProgress(requestId, {
          step: 2,
          progress: 15,
          status: 'processing',
          stepName: 'audio_upload',
          message: 'Uploading audio for transcription...',
          metadata: { fileSize: audioData.fileSize }
        });

        // Step 3: Transcribe audio
        websocketService.updateProgress(requestId, {
          step: 3,
          progress: 25,
          status: 'processing',
          stepName: 'audio_transcription',
          message: 'Transcribing audio (this may take a while)...',
          metadata: { estimatedDuration: audioData.estimatedDuration }
        });

        transcriptionResult = await this.audioService.transcribeAudio(audioData.filePath, audioData.options || {});
        
        // Cache transcription result
        await cacheService.cacheTranscription(audioHash, transcriptionResult);
      }

      // Clean up audio file
      await this.audioService.cleanupAudioFile(audioData.filePath);

      // Step 4: Detect specialty from transcription
      websocketService.updateProgress(requestId, {
        step: 4,
        progress: 50,
        status: 'processing',
        stepName: 'specialty_detection',
        message: 'Analyzing transcription and detecting medical specialty...',
        metadata: { 
          transcriptionLength: transcriptionResult.text.length,
          confidence: transcriptionResult.confidence 
        }
      });

      const detectedSpecialty = await AIService.detectMedicalSpecialty(transcriptionResult.text);

      // Step 5: Generate website content
      websocketService.updateProgress(requestId, {
        step: 5,
        progress: 70,
        status: 'processing',
        stepName: 'content_generation',
        message: 'Generating website content from transcription...',
        metadata: { specialty: detectedSpecialty }
      });

      const websiteContent = await AIService.generateWebsiteContent(transcriptionResult.text, detectedSpecialty);

      // Step 6: Prepare final result
      websocketService.updateProgress(requestId, {
        step: 6,
        progress: 95,
        status: 'processing',
        stepName: 'result_preparation',
        message: 'Finalizing website generation...',
        metadata: { contentSections: Object.keys(websiteContent).length }
      });

      const processingTime = Date.now() - startTime;
      const result = {
        requestId,
        inputType: 'audio',
        transcription: {
          id: transcriptionResult.id,
          text: transcriptionResult.text,
          confidence: transcriptionResult.confidence,
          speakers: transcriptionResult.speakers,
          qualityMetrics: transcriptionResult.quality_metrics,
          processingTime: transcriptionResult.processing_time
        },
        detectedSpecialty,
        generatedContent: websiteContent,
        processingMetadata: {
          totalProcessingTime: processingTime,
          transcriptionTime: transcriptionResult.processing_time,
          aiGenerationTime: processingTime - (transcriptionResult.processing_time || 0),
          aiModel: AIService.modelId,
          cached: !!cachedTranscription,
          audioMetadata: {
            duration: transcriptionResult.audio_duration,
            format: audioData.format,
            fileSize: audioData.fileSize
          }
        },
        generatedAt: new Date().toISOString(),
        contentStructure: {
          hasHeroSection: !!websiteContent.heroSection,
          hasAboutSection: !!websiteContent.aboutSection,
          servicesCount: websiteContent.services?.length || 0,
          hasContactInfo: !!websiteContent.contactInfo,
          hasSeoMeta: !!websiteContent.seoMeta
        }
      };

      // Save to database if requested and MongoDB is available
      if (options.saveToDatabase && userId && isMongoDBAvailable()) {
        try {
          const website = new Website({
            ...websiteContent,
            originalTranscription: transcriptionResult.text,
            userId: userId,
            generationMetadata: {
              aiModel: AIService.modelId,
              processingTime: processingTime,
              inputType: 'audio',
              fallbackUsed: websiteContent.fallbackUsed || false,
              confidenceScore: transcriptionResult.confidence,
              transcriptionId: transcriptionResult.id,
              audioProcessingTime: transcriptionResult.processing_time
            }
          });

          const savedWebsite = await website.save();
          result.websiteId = savedWebsite._id;
          result.savedToDatabase = true;
        } catch (dbError) {
          console.error('Database save error:', dbError);
          result.savedToDatabase = false;
          result.dbError = 'Failed to save to database';
        }
      } else if (options.saveToDatabase && userId && !isMongoDBAvailable()) {
        result.savedToDatabase = false;
        result.dbError = 'Database not available - content generated but not saved';
      }

      // Complete progress tracking
      websocketService.completeProgress(requestId, result);

      return result;

    } catch (error) {
      console.error('Audio processing error:', error);
      
      // Clean up audio file on error
      if (audioData.filePath) {
        try {
          await this.audioService?.cleanupAudioFile(audioData.filePath);
        } catch (cleanupError) {
          console.error('Audio cleanup error:', cleanupError);
        }
      }

      websocketService.errorProgress(requestId, error);
      throw error;
    }
  }

  // Validate and clean text input
  validateAndCleanText(text) {
    if (!text || typeof text !== 'string') {
      throw new ApiError(400, 'Invalid text input');
    }

    // Clean and normalize text
    let cleaned = text.trim();
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove control characters except newlines and tabs
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Validate length
    if (cleaned.length < 10) {
      throw new ApiError(400, 'Text too short - minimum 10 characters required');
    }
    
    if (cleaned.length > 10000) {
      throw new ApiError(400, 'Text too long - maximum 10,000 characters allowed');
    }

    // Check for meaningful content
    const uniqueChars = new Set(cleaned.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size < 5) {
      throw new ApiError(400, 'Text lacks meaningful content');
    }

    return cleaned;
  }

  // Generate hash for audio file caching
  async generateAudioHash(filePath) {
    const fs = await import('fs');
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  // Get processing status
  getProcessingStatus(requestId) {
    return websocketService.getProgressTracker(requestId);
  }

  // Get processing result for completed requests
  getProcessingResult(requestId) {
    const tracker = websocketService.getProgressTracker(requestId);
    
    if (!tracker) {
      return null;
    }

    // Only return results for completed processing
    if (tracker.status !== 'completed') {
      return {
        requestId: tracker.requestId || requestId,
        status: tracker.status,
        message: 'Processing not completed yet'
      };
    }

    // Return the complete result data
    return tracker.result || tracker;
  }

  // Get user's active processing jobs
  getUserProcessingJobs(userId) {
    return websocketService.getUserProgressTrackers(userId);
  }

  // Cancel processing job
  async cancelProcessing(requestId, userId) {
    const tracker = websocketService.getProgressTracker(requestId);
    
    if (!tracker || tracker.userId !== userId) {
      throw new ApiError(404, 'Processing job not found');
    }

    if (tracker.status === 'completed' || tracker.status === 'error') {
      throw new ApiError(400, 'Cannot cancel completed or failed job');
    }

    // Update status to cancelled
    websocketService.updateProgress(requestId, {
      status: 'cancelled',
      message: 'Processing cancelled by user',
      progress: tracker.progress
    });

    return {
      requestId,
      status: 'cancelled',
      message: 'Processing job cancelled successfully'
    };
  }

  // Get service statistics
  getServiceStats() {
    return {
      audioServiceAvailable: !!this.audioService,
      currentProcessing: this.currentProcessing,
      maxConcurrentProcessing: this.maxConcurrentProcessing,
      queueSize: this.processingQueue.size,
      cacheStats: cacheService.getStats(),
      websocketStats: websocketService.getConnectionStats()
    };
  }
}

// Create singleton instance
const unifiedProcessingService = new UnifiedProcessingService();

export default unifiedProcessingService;