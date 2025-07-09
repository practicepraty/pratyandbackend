// src/controllers/template.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import TemplateService from "../service/template.service.js";
import AIService from "../service/ai.service.js";

// Get available templates
const getAvailableTemplates = asyncHandler(async (req, res) => {
    try {
        const templates = TemplateService.getAvailableTemplates();
        
        return res.status(200).json(
            new ApiResponse(200, templates, "Available templates retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to retrieve templates: ${error.message}`);
    }
});

// Get template configuration for a specialty
const getTemplateConfig = asyncHandler(async (req, res) => {
    const { specialty } = req.params;
    
    try {
        const config = TemplateService.getTemplateConfig(specialty);
        
        return res.status(200).json(
            new ApiResponse(200, config, "Template configuration retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to get template configuration: ${error.message}`);
    }
});

// Generate template preview
const generateTemplatePreview = asyncHandler(async (req, res) => {
    const { specialty } = req.params;
    
    try {
        const previewData = TemplateService.generatePreviewData(specialty);
        const generatedWebsite = TemplateService.generateWebsite(previewData);
        
        return res.status(200).json(
            new ApiResponse(200, {
                html: generatedWebsite.html,
                templateName: generatedWebsite.templateName,
                previewData: previewData,
                metadata: generatedWebsite.metadata
            }, "Template preview generated successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to generate template preview: ${error.message}`);
    }
});

// Generate complete website from AI data
const generateWebsiteFromAI = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    
    try {
        // Get website data from database
        const { Website } = await import("../models/website.models.js");
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });
        
        if (!website) {
            throw new ApiError(404, "Website not found");
        }
        
        // Generate HTML using template service
        const websiteData = {
            websiteTitle: website.websiteTitle,
            tagline: website.tagline,
            specialty: website.specialty,
            heroSection: website.heroSection,
            aboutSection: website.aboutSection,
            services: website.services,
            contactInfo: website.contactInfo,
            seoMeta: website.seoMeta,
            customizations: website.customizations,
            logo: website.logo,
            certifications: website.certifications
        };
        
        const generatedWebsite = TemplateService.generateWebsite(websiteData);
        
        // Update website with generated HTML
        website.generatedHtml = generatedWebsite.html;
        website.templateName = generatedWebsite.templateName;
        website.lastGenerated = new Date();
        
        await website.save();
        
        return res.status(200).json(
            new ApiResponse(200, {
                html: generatedWebsite.html,
                templateName: generatedWebsite.templateName,
                websiteId: website._id,
                metadata: generatedWebsite.metadata
            }, "Website generated successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to generate website: ${error.message}`);
    }
});

// Generate website from transcription (combined AI + Template)
const generateWebsiteFromTranscription = asyncHandler(async (req, res) => {
    const { transcription, saveToDatabase = true } = req.body;
    
    if (!transcription || !transcription.trim()) {
        throw new ApiError(400, "Transcription is required");
    }
    
    try {
        // Step 1: Generate content using AI service
        const aiResult = await AIService.generateWebsiteContent(transcription);
        
        // Step 2: Generate HTML using template service
        const generatedWebsite = TemplateService.generateWebsite(aiResult);
        
        // Step 3: Save to database if requested
        let websiteId = null;
        if (saveToDatabase && req.user) {
            const { Website } = await import("../models/website.models.js");
            
            const website = new Website({
                ...aiResult,
                originalTranscription: transcription,
                userId: req.user._id,
                generatedHtml: generatedWebsite.html,
                templateName: generatedWebsite.templateName,
                lastGenerated: new Date(),
                generationMetadata: {
                    aiModel: AIService.modelId,
                    processingTime: Date.now(),
                    fallbackUsed: aiResult.fallbackUsed || false,
                    confidenceScore: aiResult.confidenceScore || 0.8
                }
            });
            
            const savedWebsite = await website.save();
            websiteId = savedWebsite._id;
        }
        
        return res.status(200).json(
            new ApiResponse(200, {
                html: generatedWebsite.html,
                templateName: generatedWebsite.templateName,
                websiteId: websiteId,
                aiContent: aiResult,
                metadata: generatedWebsite.metadata
            }, "Website generated from transcription successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to generate website from transcription: ${error.message}`);
    }
});

// Regenerate website with different template
const regenerateWithTemplate = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { templateName } = req.body;
    
    try {
        const { Website } = await import("../models/website.models.js");
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });
        
        if (!website) {
            throw new ApiError(404, "Website not found");
        }
        
        // Override specialty temporarily for template selection
        const websiteData = {
            ...website.toObject(),
            specialty: templateName
        };
        
        const generatedWebsite = TemplateService.generateWebsite(websiteData);
        
        // Update website
        website.generatedHtml = generatedWebsite.html;
        website.templateName = generatedWebsite.templateName;
        website.lastGenerated = new Date();
        
        await website.save();
        
        return res.status(200).json(
            new ApiResponse(200, {
                html: generatedWebsite.html,
                templateName: generatedWebsite.templateName,
                websiteId: website._id,
                metadata: generatedWebsite.metadata
            }, "Website regenerated with new template successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to regenerate website: ${error.message}`);
    }
});

// Get template cache statistics
const getTemplateStats = asyncHandler(async (req, res) => {
    try {
        const stats = TemplateService.getCacheStats();
        
        return res.status(200).json(
            new ApiResponse(200, stats, "Template statistics retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to get template statistics: ${error.message}`);
    }
});

// Clear template cache
const clearTemplateCache = asyncHandler(async (req, res) => {
    try {
        TemplateService.clearCache();
        
        return res.status(200).json(
            new ApiResponse(200, {}, "Template cache cleared successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to clear template cache: ${error.message}`);
    }
});

// Validate template data
const validateTemplateData = asyncHandler(async (req, res) => {
    const templateData = req.body;
    
    try {
        const validation = TemplateService.validateTemplateData(templateData);
        
        return res.status(200).json(
            new ApiResponse(200, validation, "Template data validation completed")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to validate template data: ${error.message}`);
    }
});

// Export HTML file
const exportWebsiteHtml = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    
    try {
        const { Website } = await import("../models/website.models.js");
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });
        
        if (!website) {
            throw new ApiError(404, "Website not found");
        }
        
        if (!website.generatedHtml) {
            throw new ApiError(400, "Website HTML not generated yet");
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${website.websiteTitle.replace(/[^a-zA-Z0-9]/g, '_')}_website.html"`);
        
        return res.send(website.generatedHtml);
    } catch (error) {
        throw new ApiError(500, `Failed to export website HTML: ${error.message}`);
    }
});

// Get template mapping for specialty
const getTemplateMapping = asyncHandler(async (req, res) => {
    const { specialty } = req.params;
    
    try {
        const templateName = TemplateService.mapSpecialtyToTemplate(specialty);
        const config = TemplateService.getTemplateConfig(specialty);
        
        return res.status(200).json(
            new ApiResponse(200, {
                inputSpecialty: specialty,
                mappedTemplate: templateName,
                config: config
            }, "Template mapping retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to get template mapping: ${error.message}`);
    }
});

export {
    getAvailableTemplates,
    getTemplateConfig,
    generateTemplatePreview,
    generateWebsiteFromAI,
    generateWebsiteFromTranscription,
    regenerateWithTemplate,
    getTemplateStats,
    clearTemplateCache,
    validateTemplateData,
    exportWebsiteHtml,
    getTemplateMapping
};