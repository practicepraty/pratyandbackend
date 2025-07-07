// src/controllers/ai.controller.js
// src/controllers/ai.controller.js (Enhanced Version)
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import AIService from "../service/ai.service.js";
import { Website, ContentVariation, ContentTemplate } from "../models/website.models.js";

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

  // Validation
  if (!transcription || !transcription.trim()) {
    throw new ApiError(400, "Transcription is required");
  }

  if (transcription.length < 10) {
    throw new ApiError(400, "Transcription too short. Please provide a meaningful description.");
  }

  if (transcription.length > 10000) {
    throw new ApiError(400, "Transcription too long. Please limit to 10,000 characters.");
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
    throw new ApiError(400, "Transcription is required");
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

    const result = {
      websites: websites,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      },
      specialties: await Website.distinct('specialty', { userId: req.user._id, isActive: true })
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
      generatedAt: new Date().toISOString()
    };

    return res.status(200).json(
      new ApiResponse(200, analytics, "Website analytics retrieved successfully")
    );

  } catch (error) {
    console.error("Get website analytics error:", error);
    throw new ApiError(500, "Failed to retrieve website analytics");
  }
});

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
  getWebsiteAnalytics
};