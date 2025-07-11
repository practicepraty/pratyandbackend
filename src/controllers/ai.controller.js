// src/controllers/ai.controller.js
// src/controllers/ai.controller.js (Enhanced Version)
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import AIService from "../service/ai.service.js";
import { Website, ContentVariation, ContentTemplate } from "../models/website.models.js";
import AudioTranscriptionService from "../services/audioTranscriptionService.js";
import { cleanupFiles } from "../middlewares/multer.middleware.js";

// Test AI connectivity
const testAIConnection = asyncHandler(async (req, res) => {
  try {
    const testResult = await AIService.testConnection();
    
    if (testResult.success) {
      return res.status(200).json(
        new ApiResponse(200, testResult, "AI connection successful")
      );
    } else {
      return res.status(500).json(
        new ApiResponse(500, testResult, "AI connection failed")
      );
    }
  } catch (error) {
    throw new ApiError(500, `AI connection test failed: ${error.message}`);
  }
});

// Generate content from transcription (Enhanced with database storage)
const generateContent = asyncHandler(async (req, res) => {
  const { transcription, saveToDatabase = true } = req.body;
  const startTime = Date.now();

  // Enhanced validation with better error messages
  if (!transcription || !transcription.trim()) {
    throw new ApiError(400, "Transcription text is required to generate website content. Please provide a description of your medical practice, services, or qualifications.");
  }

  // Check for empty or whitespace-only transcription
  const cleanTranscription = transcription.trim();
  if (cleanTranscription.length === 0) {
    throw new ApiError(400, "Transcription appears to be empty. Please provide meaningful content about your medical practice.");
  }

  if (cleanTranscription.length < 10) {
    throw new ApiError(400, "Transcription is too short to generate quality content. Please provide at least 10 characters describing your medical practice, services, or background.");
  }

  if (cleanTranscription.length > 10000) {
    throw new ApiError(400, "Transcription is too long (maximum 10,000 characters). Please shorten your description while keeping the essential information about your practice.");
  }

  // Check for meaningful content (not just repeated characters or gibberish)
  const uniqueChars = new Set(cleanTranscription.toLowerCase().replace(/\s/g, ''));
  if (uniqueChars.size < 5) {
    throw new ApiError(400, "Transcription appears to lack meaningful content. Please provide a proper description of your medical practice.");
  }

  try {
    // Step 1: Detect medical specialty
    console.log("Detecting medical specialty...");
    const detectedSpecialty = await AIService.detectMedicalSpecialty(transcription);
    console.log("Detected specialty:", detectedSpecialty);

    // Step 2: Generate comprehensive website content
    console.log("Generating website content...");
    const websiteContent = await AIService.generateWebsiteContent(transcription, detectedSpecialty);
    console.log("Website content generated successfully");

    const processingTime = Date.now() - startTime;

    // Step 3: Prepare structured response
    const result = {
      originalTranscription: transcription,
      detectedSpecialty: detectedSpecialty,
      generatedContent: websiteContent,
      generatedAt: new Date().toISOString(),
      processingTime: processingTime,
      contentStructure: {
        hasHeroSection: !!websiteContent.heroSection,
        hasAboutSection: !!websiteContent.aboutSection,
        servicesCount: websiteContent.services?.length || 0,
        hasContactInfo: !!websiteContent.contactInfo,
        hasSeoMeta: !!websiteContent.seoMeta
      }
    };

    // Step 4: Save to database if requested and user is authenticated
    if (saveToDatabase && req.user) {
      try {
        const website = new Website({
          ...websiteContent,
          originalTranscription: transcription,
          userId: req.user._id,
          generationMetadata: {
            aiModel: AIService.modelId,
            processingTime: processingTime,
            fallbackUsed: websiteContent.fallbackUsed || false,
            confidenceScore: websiteContent.confidenceScore || 0.8
          }
        });

        const savedWebsite = await website.save();
        result.websiteId = savedWebsite._id;
        result.savedToDatabase = true;
        
        console.log("Website saved to database with ID:", savedWebsite._id);
      } catch (dbError) {
        console.error("Database save error:", dbError);
        result.savedToDatabase = false;
        result.dbError = "Failed to save to database";
      }
    }

    return res.status(200).json(
      new ApiResponse(200, result, "Content generated successfully")
    );

  } catch (error) {
    console.error("Content generation error:", error);
    
    // Provide user-friendly error messages
    if (error.message.includes('credentials')) {
      throw new ApiError(500, "AI service configuration error. Please contact support.");
    } else if (error.message.includes('throttling')) {
      throw new ApiError(429, "AI service is busy. Please try again in a moment.");
    } else if (error.message.includes('model')) {
      throw new ApiError(503, "AI model temporarily unavailable. Please try again later.");
    } else {
      throw new ApiError(500, "Failed to generate content. Please try again.");
    }
  }
});

// Generate content variations for A/B testing
const generateContentVariations = asyncHandler(async (req, res) => {
  const { transcription, variationCount = 2 } = req.body;

  if (!transcription || !transcription.trim()) {
    throw new ApiError(400, "Transcription text is required to generate content variations. Please provide a description of your medical practice.");
  }

  // Check for meaningful content
  const cleanTranscription = transcription.trim();
  if (cleanTranscription.length < 10) {
    throw new ApiError(400, "Transcription is too short to generate quality variations. Please provide at least 10 characters describing your medical practice.");
  }

  if (variationCount < 1 || variationCount > 5) {
    throw new ApiError(400, "Variation count must be between 1 and 5");
  }

  try {
    const detectedSpecialty = await AIService.detectMedicalSpecialty(transcription);
    const variations = await AIService.generateContentVariations(transcription, detectedSpecialty, variationCount);

    const result = {
      originalTranscription: transcription,
      detectedSpecialty: detectedSpecialty,
      variations: variations,
      generatedAt: new Date().toISOString(),
      totalVariations: variations.length
    };

    return res.status(200).json(
      new ApiResponse(200, result, "Content variations generated successfully")
    );

  } catch (error) {
    console.error("Content variation generation error:", error);
    throw new ApiError(500, "Failed to generate content variations");
  }
});

// Get user's generated websites
const getUserWebsites = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, specialty, status } = req.query;
    
    const query = { userId: req.user._id, isActive: true };
    
    if (specialty) {
      query.specialty = specialty.toLowerCase();
    }
    
    if (status) {
      query.status = status;
    }

    const websites = await Website.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-originalTranscription -__v');

    const totalCount = await Website.countDocuments(query);

    // Handle empty state for users with no websites
    if (totalCount === 0) {
      const emptyResult = {
        websites: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalCount: 0,
          hasNext: false,
          hasPrev: false
        },
        specialties: [],
        empty_state: true,
        message: "You haven't created any websites yet. Let's get you started!",
        suggestions: [
          "Upload an audio recording describing your practice and we'll generate a website automatically",
          "Use the text-to-website feature by typing about your medical practice",
          "Start with our guided setup to create your first professional medical website"
        ],
        quick_actions: [
          {
            action: "generate_from_audio",
            title: "Generate from Audio",
            description: "Upload an audio file and get a complete website"
          },
          {
            action: "generate_from_text",
            title: "Generate from Text",
            description: "Describe your practice in text and create a website"
          }
        ]
      };

      return res.status(200).json(
        new ApiResponse(200, emptyResult, "Ready to create your first website!")
      );
    }

    const result = {
      websites: websites,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      },
      specialties: await Website.distinct('specialty', { userId: req.user._id, isActive: true }),
      empty_state: false,
      summary: {
        total_websites: totalCount,
        published_count: await Website.countDocuments({ ...query, status: 'published' }),
        draft_count: await Website.countDocuments({ ...query, status: 'draft' }),
        most_recent: websites[0]?.createdAt
      }
    };

    return res.status(200).json(
      new ApiResponse(200, result, "User websites retrieved successfully")
    );

  } catch (error) {
    console.error("Get user websites error:", error);
    throw new ApiError(500, "Failed to retrieve user websites");
  }
});

// Get specific website by ID
const getWebsiteById = asyncHandler(async (req, res) => {
  const { websiteId } = req.params;

  try {
    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user._id,
      isActive: true
    });

    if (!website) {
      throw new ApiError(404, "Website not found");
    }

    return res.status(200).json(
      new ApiResponse(200, website, "Website retrieved successfully")
    );

  } catch (error) {
    console.error("Get website by ID error:", error);
    throw new ApiError(500, "Failed to retrieve website");
  }
});

// Update website content
const updateWebsiteContent = asyncHandler(async (req, res) => {
  const { websiteId } = req.params;
  const updateData = req.body;

  try {
    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user._id,
      isActive: true
    });

    if (!website) {
      throw new ApiError(404, "Website not found");
    }

    // Update allowed fields
    const allowedUpdates = [
      'websiteTitle', 'tagline', 'heroSection', 'aboutSection', 
      'services', 'contactInfo', 'seoMeta', 'customizations', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        website[field] = updateData[field];
      }
    });

    const updatedWebsite = await website.save();

    return res.status(200).json(
      new ApiResponse(200, updatedWebsite, "Website updated successfully")
    );

  } catch (error) {
    console.error("Update website error:", error);
    throw new ApiError(500, "Failed to update website");
  }
});

// Delete website
const deleteWebsite = asyncHandler(async (req, res) => {
  const { websiteId } = req.params;

  try {
    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user._id,
      isActive: true
    });

    if (!website) {
      throw new ApiError(404, "Website not found");
    }

    website.isActive = false;
    await website.save();

    return res.status(200).json(
      new ApiResponse(200, { websiteId }, "Website deleted successfully")
    );

  } catch (error) {
    console.error("Delete website error:", error);
    throw new ApiError(500, "Failed to delete website");
  }
});

// Regenerate website content
const regenerateWebsiteContent = asyncHandler(async (req, res) => {
  const { websiteId } = req.params;
  const { section } = req.body; // optional: specific section to regenerate

  try {
    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user._id,
      isActive: true
    });

    if (!website) {
      throw new ApiError(404, "Website not found");
    }

    const startTime = Date.now();

    if (section) {
      // Regenerate specific section
      const updatedContent = await AIService.regenerateSection(
        website.originalTranscription, 
        website.specialty, 
        section
      );
      
      website[section] = updatedContent;
    } else {
      // Regenerate entire website
      const newContent = await AIService.generateWebsiteContent(
        website.originalTranscription, 
        website.specialty
      );
      
      Object.assign(website, newContent);
    }

    website.generationMetadata.processingTime = Date.now() - startTime;
    website.generationMetadata.regeneratedAt = new Date();

    const updatedWebsite = await website.save();

    return res.status(200).json(
      new ApiResponse(200, updatedWebsite, "Website content regenerated successfully")
    );

  } catch (error) {
    console.error("Regenerate website content error:", error);
    throw new ApiError(500, "Failed to regenerate website content");
  }
});

// Get content templates
const getContentTemplates = asyncHandler(async (req, res) => {
  const { specialty } = req.query;

  try {
    const query = specialty ? { specialty: specialty.toLowerCase() } : {};
    const templates = await ContentTemplate.find(query).sort({ createdAt: -1 });

    return res.status(200).json(
      new ApiResponse(200, templates, "Content templates retrieved successfully")
    );

  } catch (error) {
    console.error("Get content templates error:", error);
    throw new ApiError(500, "Failed to retrieve content templates");
  }
});

// Create custom content template
const createContentTemplate = asyncHandler(async (req, res) => {
  const { name, specialty, template } = req.body;

  if (!name || !specialty || !template) {
    throw new ApiError(400, "Name, specialty, and template are required");
  }

  try {
    const contentTemplate = new ContentTemplate({
      name,
      specialty: specialty.toLowerCase(),
      template,
      createdBy: req.user._id
    });

    const savedTemplate = await contentTemplate.save();

    return res.status(201).json(
      new ApiResponse(201, savedTemplate, "Content template created successfully")
    );

  } catch (error) {
    console.error("Create content template error:", error);
    if (error.code === 11000) {
      throw new ApiError(409, "Template with this name already exists");
    }
    throw new ApiError(500, "Failed to create content template");
  }
});

// Get available AI models
const getAvailableModels = asyncHandler(async (req, res) => {
  const models = [
    {
      id: "anthropic.claude-3-sonnet-20240229-v1:0",
      name: "Claude 3 Sonnet",
      description: "Balanced performance and speed",
      recommended: true,
      pricing: "Medium",
      features: ["High Quality", "Medical Content", "Fast Response"]
    },
    {
      id: "anthropic.claude-3-haiku-20240307-v1:0", 
      name: "Claude 3 Haiku",
      description: "Fastest responses",
      recommended: false,
      pricing: "Low",
      features: ["Very Fast", "Basic Content", "Cost Effective"]
    }
  ];

  return res.status(200).json(
    new ApiResponse(200, models, "Available AI models")
  );
});

// Get analytics for user's websites
const getWebsiteAnalytics = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    // Get basic statistics
    const totalWebsites = await Website.countDocuments({ userId, isActive: true });
    const publishedWebsites = await Website.countDocuments({ userId, isActive: true, status: 'published' });
    const draftWebsites = await Website.countDocuments({ userId, isActive: true, status: 'draft' });

    // Handle empty state for analytics
    if (totalWebsites === 0) {
      const emptyAnalytics = {
        overview: {
          totalWebsites: 0,
          publishedWebsites: 0,
          draftWebsites: 0,
          avgProcessingTime: 0
        },
        specialtyDistribution: [],
        recentActivity: [],
        generatedAt: new Date().toISOString(),
        empty_state: true,
        message: "No website analytics available yet. Create your first website to see insights!",
        getting_started: {
          next_steps: [
            "Generate your first website from audio or text",
            "Publish your website to start tracking performance",
            "Create multiple websites to compare analytics"
          ],
          benefits: [
            "Track website generation performance",
            "Monitor specialty distribution",
            "View recent activity and trends"
          ]
        }
      };

      return res.status(200).json(
        new ApiResponse(200, emptyAnalytics, "Analytics ready - create your first website!")
      );
    }

    // Get specialty distribution
    const specialtyStats = await Website.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: '$specialty', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get recent generation activity
    const recentActivity = await Website.find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('websiteTitle specialty status createdAt');

    // Calculate average processing time
    const avgProcessingTime = await Website.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: null, avgTime: { $avg: '$generationMetadata.processingTime' } } }
    ]);

    const analytics = {
      overview: {
        totalWebsites,
        publishedWebsites,
        draftWebsites,
        avgProcessingTime: avgProcessingTime[0]?.avgTime || 0
      },
      specialtyDistribution: specialtyStats,
      recentActivity: recentActivity,
      generatedAt: new Date().toISOString(),
      empty_state: false,
      insights: {
        most_popular_specialty: specialtyStats[0]?._id || null,
        publish_rate: totalWebsites > 0 ? Math.round((publishedWebsites / totalWebsites) * 100) : 0,
        avg_processing_seconds: Math.round((avgProcessingTime[0]?.avgTime || 0) / 1000)
      }
    };

    return res.status(200).json(
      new ApiResponse(200, analytics, "Website analytics retrieved successfully")
    );

  } catch (error) {
    console.error("Get website analytics error:", error);
    throw new ApiError(500, "Failed to retrieve website analytics");
  }
});

// Initialize AudioTranscriptionService (only if API key is available)
let audioTranscriptionService = null;
try {
  if (process.env.ASSEMBLYAI_API_KEY) {
    audioTranscriptionService = new AudioTranscriptionService();
  }
} catch (error) {
  console.warn('AudioTranscriptionService not initialized:', error.message);
}

// In-memory storage for transcription jobs (in production, use Redis or database)
const transcriptionJobs = new Map();

// Transcribe audio file
const transcribeAudio = asyncHandler(async (req, res) => {
  try {
    if (!audioTranscriptionService) {
      throw new ApiError(503, "Audio transcription service is not configured. Please add ASSEMBLYAI_API_KEY to environment variables.");
    }
    
    if (!req.file) {
      throw new ApiError(400, "Audio file is required");
    }

    const { language, speakerLabels, expectedSpeakers, autoHighlights } = req.body;
    
    // Validate audio file
    audioTranscriptionService.validateAudioFile(req.file.path);

    // Parse options
    const options = {
      language: language || 'en',
      speakerLabels: speakerLabels === 'true' || speakerLabels === true,
      expectedSpeakers: expectedSpeakers ? parseInt(expectedSpeakers) : 2,
      autoHighlights: autoHighlights === 'true' || autoHighlights === true
    };

    // Start transcription process
    const transcriptionResult = await audioTranscriptionService.transcribeAudio(req.file.path, options);

    // Clean up uploaded file
    await audioTranscriptionService.cleanupAudioFile(req.file.path);

    // Store transcription job for later retrieval
    transcriptionJobs.set(transcriptionResult.id, {
      ...transcriptionResult,
      userId: req.user?._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Return immediate response
    return res.status(200).json(
      new ApiResponse(200, {
        jobId: transcriptionResult.id,
        status: transcriptionResult.status,
        text: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        processingTime: transcriptionResult.processing_time,
        qualityMetrics: transcriptionResult.quality_metrics
      }, "Audio transcription completed successfully")
    );

  } catch (error) {
    // Clean up uploaded file in case of error
    if (req.file) {
      cleanupFiles(req.file);
    }
    
    console.error("Audio transcription error:", error);
    throw error;
  }
});

// Get transcription status/result
const getTranscriptionStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    throw new ApiError(400, "Transcription job ID is required. Please provide the job ID from your transcription request.");
  }

  if (jobId.length < 10 || jobId.length > 50) {
    throw new ApiError(400, "Invalid job ID format. Transcription job IDs should be between 10 and 50 characters long.");
  }

  // Check in-memory storage first
  const cachedJob = transcriptionJobs.get(jobId);
  if (cachedJob) {
    // Check if job has expired
    if (new Date() > cachedJob.expiresAt) {
      transcriptionJobs.delete(jobId);
      throw new ApiError(404, "Transcription job expired");
    }

    return res.status(200).json(
      new ApiResponse(200, cachedJob, "Transcription status retrieved successfully")
    );
  }

  // If not in cache, try to fetch from AssemblyAI
  try {
    const result = await audioTranscriptionService.getTranscriptionResult(jobId);
    
    return res.status(200).json(
      new ApiResponse(200, result, "Transcription status retrieved successfully")
    );
  } catch (error) {
    console.error("Get transcription status error:", error);
    throw new ApiError(404, "Transcription job not found");
  }
});

// Generate website content directly from audio
const generateFromAudio = asyncHandler(async (req, res) => {
  try {
    if (!audioTranscriptionService) {
      throw new ApiError(503, "Audio transcription service is not configured. Please add ASSEMBLYAI_API_KEY to environment variables.");
    }
    
    if (!req.file) {
      throw new ApiError(400, "Audio file is required");
    }

    const { language, speakerLabels, expectedSpeakers, autoHighlights, saveToDatabase = true } = req.body;
    const startTime = Date.now();

    // Validate audio file
    audioTranscriptionService.validateAudioFile(req.file.path);

    // Parse options
    const options = {
      language: language || 'en',
      speakerLabels: speakerLabels === 'true' || speakerLabels === true,
      expectedSpeakers: expectedSpeakers ? parseInt(expectedSpeakers) : 2,
      autoHighlights: autoHighlights === 'true' || autoHighlights === true
    };

    // Step 1: Transcribe audio
    console.log("Transcribing audio...");
    const transcriptionResult = await audioTranscriptionService.transcribeAudio(req.file.path, options);

    // Clean up uploaded file
    await audioTranscriptionService.cleanupAudioFile(req.file.path);

    // Step 2: Generate website content from transcription
    console.log("Generating website content from transcription...");
    const detectedSpecialty = await AIService.detectMedicalSpecialty(transcriptionResult.text);
    const websiteContent = await AIService.generateWebsiteContent(transcriptionResult.text, detectedSpecialty);

    const processingTime = Date.now() - startTime;

    // Step 3: Prepare comprehensive result
    const result = {
      // Transcription data
      transcription: {
        id: transcriptionResult.id,
        text: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        speakers: transcriptionResult.speakers,
        qualityMetrics: transcriptionResult.quality_metrics
      },
      
      // Website generation data
      detectedSpecialty: detectedSpecialty,
      generatedContent: websiteContent,
      generatedAt: new Date().toISOString(),
      totalProcessingTime: processingTime,
      
      // Combined metadata
      contentStructure: {
        hasHeroSection: !!websiteContent.heroSection,
        hasAboutSection: !!websiteContent.aboutSection,
        servicesCount: websiteContent.services?.length || 0,
        hasContactInfo: !!websiteContent.contactInfo,
        hasSeoMeta: !!websiteContent.seoMeta
      }
    };

    // Step 4: Save to database if requested
    if (saveToDatabase && req.user) {
      try {
        const website = new Website({
          ...websiteContent,
          originalTranscription: transcriptionResult.text,
          userId: req.user._id,
          generationMetadata: {
            aiModel: AIService.modelId,
            processingTime: processingTime,
            fallbackUsed: websiteContent.fallbackUsed || false,
            confidenceScore: transcriptionResult.confidence,
            transcriptionId: transcriptionResult.id,
            audioProcessingTime: transcriptionResult.processing_time
          }
        });

        const savedWebsite = await website.save();
        result.websiteId = savedWebsite._id;
        result.savedToDatabase = true;
        
        console.log("Website saved to database with ID:", savedWebsite._id);
      } catch (dbError) {
        console.error("Database save error:", dbError);
        result.savedToDatabase = false;
        result.dbError = "Failed to save to database";
      }
    }

    return res.status(200).json(
      new ApiResponse(200, result, "Website generated from audio successfully")
    );

  } catch (error) {
    // Clean up uploaded file in case of error
    if (req.file) {
      cleanupFiles(req.file);
    }
    
    console.error("Generate from audio error:", error);
    
    // Provide user-friendly error messages
    if (error.message.includes('upload')) {
      throw new ApiError(400, "Audio file upload failed. Please try again.");
    } else if (error.message.includes('transcription')) {
      throw new ApiError(500, "Audio transcription failed. Please try again.");
    } else if (error.message.includes('generation')) {
      throw new ApiError(500, "Website generation failed. Please try again.");
    } else {
      throw new ApiError(500, "Failed to process audio. Please try again.");
    }
  }
});

// Delete transcription data
const deleteTranscription = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    throw new ApiError(400, "Transcription job ID is required to delete transcription data.");
  }

  if (jobId.length < 10 || jobId.length > 50) {
    throw new ApiError(400, "Invalid job ID format. Please provide a valid transcription job ID.");
  }

  try {
    // Remove from in-memory storage
    const deleted = transcriptionJobs.delete(jobId);
    
    // Also try to delete from AssemblyAI (cleanup)
    await audioTranscriptionService.deleteTranscription(jobId);

    return res.status(200).json(
      new ApiResponse(200, { 
        jobId, 
        deleted: deleted || true 
      }, "Transcription data deleted successfully")
    );

  } catch (error) {
    console.error("Delete transcription error:", error);
    throw new ApiError(500, "Failed to delete transcription data");
  }
});

// Get supported languages for transcription
const getSupportedLanguages = asyncHandler(async (req, res) => {
  if (!audioTranscriptionService) {
    // Return static list if service not available
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'nl', name: 'Dutch' },
      { code: 'hi', name: 'Hindi' },
      { code: 'ja', name: 'Japanese' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ru', name: 'Russian' },
      { code: 'ar', name: 'Arabic' },
      { code: 'tr', name: 'Turkish' },
      { code: 'pl', name: 'Polish' },
      { code: 'uk', name: 'Ukrainian' }
    ];
    
    return res.status(200).json(
      new ApiResponse(200, languages, "Supported languages retrieved successfully")
    );
  }
  
  const languages = audioTranscriptionService.getSupportedLanguages();
  
  return res.status(200).json(
    new ApiResponse(200, languages, "Supported languages retrieved successfully")
  );
});

// Get transcription usage statistics
const getTranscriptionStats = asyncHandler(async (req, res) => {
  try {
    const usageStats = await audioTranscriptionService.getUsageStats();
    
    // Get user's transcription history from in-memory storage
    const userTranscriptions = Array.from(transcriptionJobs.values())
      .filter(job => job.userId?.toString() === req.user._id.toString())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Handle empty state with helpful messages
    if (userTranscriptions.length === 0) {
      const emptyStats = {
        total_transcriptions: 0,
        recent_transcriptions: [],
        avg_confidence: 0,
        total_audio_duration: 0,
        assembly_ai_usage: usageStats,
        supported_languages: audioTranscriptionService.getSupportedLanguages().length,
        empty_state: true,
        message: "You haven't created any transcriptions yet. Upload an audio file to get started with automatic transcription and website generation.",
        suggestions: [
          "Upload an audio recording describing your medical practice",
          "Use the 'Generate from Audio' feature to create websites directly from audio",
          "Supported formats: MP3, WAV, M4A, FLAC, OGG, WebM (up to 25MB)"
        ]
      };

      return res.status(200).json(
        new ApiResponse(200, emptyStats, "No transcriptions found. Ready to get started!")
      );
    }

    const stats = {
      total_transcriptions: userTranscriptions.length,
      recent_transcriptions: userTranscriptions.slice(0, 10),
      avg_confidence: userTranscriptions.reduce((sum, job) => sum + (job.confidence || 0), 0) / userTranscriptions.length || 0,
      total_audio_duration: userTranscriptions.reduce((sum, job) => sum + (job.audio_duration || 0), 0),
      assembly_ai_usage: usageStats,
      supported_languages: audioTranscriptionService.getSupportedLanguages().length,
      empty_state: false,
      quality_insights: {
        high_confidence_count: userTranscriptions.filter(job => job.confidence > 0.8).length,
        avg_duration_minutes: Math.round((userTranscriptions.reduce((sum, job) => sum + (job.audio_duration || 0), 0) / userTranscriptions.length) / 60),
        most_recent_date: userTranscriptions[0]?.createdAt
      }
    };

    return res.status(200).json(
      new ApiResponse(200, stats, "Transcription statistics retrieved successfully")
    );

  } catch (error) {
    console.error("Get transcription stats error:", error);
    
    // Provide helpful error message for transcription stats
    if (error.message.includes('service not configured')) {
      throw new ApiError(503, "Transcription service is not configured. Please contact support or check your API configuration.");
    }
    
    throw new ApiError(500, "Failed to retrieve transcription statistics. Please try again later.");
  }
});

// Cleanup expired transcription jobs (utility function)
const cleanupExpiredJobs = () => {
  const now = new Date();
  const expired = [];
  
  for (const [jobId, job] of transcriptionJobs.entries()) {
    if (now > job.expiresAt) {
      transcriptionJobs.delete(jobId);
      expired.push(jobId);
    }
  }
  
  if (expired.length > 0) {
    console.log(`Cleaned up ${expired.length} expired transcription jobs`);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredJobs, 60 * 60 * 1000);

export {
  testAIConnection,
  generateContent,
  generateContentVariations,
  getUserWebsites,
  getWebsiteById,
  updateWebsiteContent,
  deleteWebsite,
  regenerateWebsiteContent,
  getContentTemplates,
  createContentTemplate,
  getAvailableModels,
  getWebsiteAnalytics,
  
  // New audio transcription endpoints
  transcribeAudio,
  getTranscriptionStatus,
  generateFromAudio,
  deleteTranscription,
  getSupportedLanguages,
  getTranscriptionStats
};