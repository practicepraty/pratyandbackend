// src/controllers/websiteGeneration.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import WebsiteGenerator from "../services/websiteGenerator.js";
import { Website, GenerationHistory } from "../models/website.models.js";
import loggingService from "../services/loggingService.js";

// Main website generation endpoint
const generateWebsite = asyncHandler(async (req, res) => {
    const { transcribedContent, specialty, customizations, saveToDatabase = true } = req.body;

    // Validate required fields
    if (!transcribedContent || !transcribedContent.trim()) {
        throw new ApiError(400, "Transcribed content is required");
    }

    try {
        // Prepare generation options
        const generationOptions = {
            transcribedContent: transcribedContent.trim(),
            userId: req.user ? req.user._id : null,
            specialty: specialty || null,
            customizations: customizations || {},
            saveToDatabase: saveToDatabase && req.user !== null,
            generatePreview: true,
            variationCount: 1
        };

        // Generate website using the main pipeline
        const result = await WebsiteGenerator.generateWebsite(generationOptions);

        // Log generation history if user is authenticated
        if (req.user && result.websiteId) {
            await GenerationHistory.create({
                websiteId: result.websiteId,
                userId: req.user._id,
                action: 'generated',
                metadata: {
                    aiModel: 'bedrock-claude',
                    processingTime: result.websiteData.metadata.processingTime,
                    userAgent: req.get('User-Agent'),
                    ipAddress: req.ip
                }
            });
        }

        // Log successful website generation with detailed information
        loggingService.logWebsiteGenerationSuccess(
            `Website generated successfully for ${result.specialtyInfo?.specialty || 'unknown'} specialty`,
            {
                websiteId: result.websiteId,
                userId: req.user?._id,
                specialty: result.specialtyInfo?.specialty,
                templateName: result.websiteData?.metadata?.templateName,
                processingTime: result.websiteData?.metadata?.processingTime,
                qualityScore: result.websiteData?.metadata?.qualityScore,
                hasPreview: !!result.websiteData?.previewUrl,
                method: req.method,
                url: req.originalUrl
            }
        );

        return res.status(200).json(
            new ApiResponse(200, result, "Website generated successfully")
        );

    } catch (error) {
        console.error("Website generation error:", error);
        
        // Log generation failure
        loggingService.logError(error, {
            operation: 'website_generation',
            userId: req.user?._id,
            specialty: specialty,
            transcribedContentLength: transcribedContent?.length || 0,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Website generation failed: ${error.message}`);
    }
});

// Generate website preview
const generateWebsitePreview = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { customizations } = req.body;

    try {
        // Get website data
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!website) {
            throw new ApiError(404, "Website not found");
        }

        // Generate preview with updated customizations
        const updatedCustomizations = {
            ...website.customizations,
            ...customizations
        };

        const generationOptions = {
            transcribedContent: website.originalTranscription,
            userId: req.user._id,
            specialty: website.specialty,
            customizations: updatedCustomizations,
            saveToDatabase: false,
            generatePreview: true
        };

        const result = await WebsiteGenerator.generateWebsite(generationOptions);

        // Log successful preview generation
        loggingService.logWebsiteGenerationSuccess(
            `Website preview generated successfully for ${website.specialty || 'unknown'} specialty`,
            {
                websiteId: websiteId,
                userId: req.user._id,
                specialty: website.specialty,
                templateName: result.websiteData?.metadata?.templateName,
                processingTime: result.websiteData?.metadata?.processingTime,
                operation: 'preview_generation',
                method: req.method,
                url: req.originalUrl
            }
        );

        return res.status(200).json(
            new ApiResponse(200, {
                html: result.websiteData.html,
                css: result.websiteData.css,
                metadata: result.websiteData.metadata,
                websiteId: websiteId,
                previewGenerated: true
            }, "Website preview generated successfully")
        );

    } catch (error) {
        console.error("Preview generation error:", error);
        
        // Log preview generation failure
        loggingService.logError(error, {
            operation: 'preview_generation',
            websiteId: websiteId,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Preview generation failed: ${error.message}`);
    }
});

// Get website preview
const getWebsitePreview = asyncHandler(async (req, res) => {
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

        // Return the generated HTML as preview
        if (website.generatedHtml) {
            // Log successful preview retrieval
            loggingService.logAppEvent('info', 'Website preview retrieved successfully', {
                websiteId: websiteId,
                userId: req.user._id,
                operation: 'preview_retrieval',
                method: req.method,
                url: req.originalUrl
            });
            
            res.setHeader('Content-Type', 'text/html');
            return res.send(website.generatedHtml);
        } else {
            throw new ApiError(404, "Website preview not available. Please generate the website first.");
        }

    } catch (error) {
        console.error("Preview retrieval error:", error);
        
        // Log preview retrieval failure
        loggingService.logError(error, {
            operation: 'preview_retrieval',
            websiteId: websiteId,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Failed to retrieve preview: ${error.message}`);
    }
});

// Update website customizations
const updateWebsiteCustomization = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { customizations } = req.body;

    if (!customizations || typeof customizations !== 'object') {
        throw new ApiError(400, "Valid customizations object is required");
    }

    try {
        const result = await WebsiteGenerator.updateCustomizations(
            websiteId,
            customizations,
            req.user._id
        );

        // Log update history
        await GenerationHistory.create({
            websiteId: websiteId,
            userId: req.user._id,
            action: 'updated',
            changes: { customizations },
            metadata: {
                processingTime: Date.now(),
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            }
        });

        // Log successful customization update
        loggingService.logWebsiteGenerationSuccess(
            `Website customizations updated successfully`,
            {
                websiteId: websiteId,
                userId: req.user._id,
                operation: 'customization_update',
                customizationKeys: Object.keys(customizations),
                method: req.method,
                url: req.originalUrl
            }
        );

        return res.status(200).json(
            new ApiResponse(200, result, "Website customizations updated successfully")
        );

    } catch (error) {
        console.error("Customization update error:", error);
        
        // Log customization update failure
        loggingService.logError(error, {
            operation: 'customization_update',
            websiteId: websiteId,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Failed to update customizations: ${error.message}`);
    }
});

// Regenerate specific website section
const regenerateWebsiteSection = asyncHandler(async (req, res) => {
    const { websiteId, section } = req.params;
    const { options } = req.body;

    const validSections = ['heroSection', 'aboutSection', 'services', 'contactInfo'];
    if (!validSections.includes(section)) {
        throw new ApiError(400, `Invalid section. Valid sections are: ${validSections.join(', ')}`);
    }

    try {
        const result = await WebsiteGenerator.regenerateSection(
            websiteId,
            section,
            req.user._id,
            options || {}
        );

        // Log regeneration history
        await GenerationHistory.create({
            websiteId: websiteId,
            userId: req.user._id,
            action: 'regenerated',
            changes: { section, newContent: result.newContent },
            metadata: {
                processingTime: Date.now(),
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            }
        });

        // Log successful section regeneration
        loggingService.logWebsiteGenerationSuccess(
            `${section} regenerated successfully`,
            {
                websiteId: websiteId,
                userId: req.user._id,
                section: section,
                operation: 'section_regeneration',
                method: req.method,
                url: req.originalUrl
            }
        );

        return res.status(200).json(
            new ApiResponse(200, result, `${section} regenerated successfully`)
        );

    } catch (error) {
        console.error("Section regeneration error:", error);
        
        // Log section regeneration failure
        loggingService.logError(error, {
            operation: 'section_regeneration',
            websiteId: websiteId,
            section: section,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Failed to regenerate ${section}: ${error.message}`);
    }
});

// Export website data in various formats
const exportWebsiteData = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { format = 'html' } = req.query;

    try {
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!website) {
            throw new ApiError(404, "Website not found");
        }

        switch (format.toLowerCase()) {
            case 'html':
                // Export as HTML file
                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Content-Disposition', `attachment; filename="${website.websiteTitle.replace(/[^a-zA-Z0-9]/g, '_')}_website.html"`);
                return res.send(website.generatedHtml || '');

            case 'json':
                // Export as JSON
                const jsonData = {
                    websiteData: {
                        title: website.websiteTitle,
                        tagline: website.tagline,
                        specialty: website.specialty,
                        heroSection: website.heroSection,
                        aboutSection: website.aboutSection,
                        services: website.services,
                        contactInfo: website.contactInfo,
                        seoMeta: website.seoMeta,
                        customizations: website.customizations
                    },
                    metadata: {
                        generatedAt: website.createdAt,
                        lastModified: website.lastModified,
                        version: website.version,
                        templateName: website.templateName
                    }
                };

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${website.websiteTitle.replace(/[^a-zA-Z0-9]/g, '_')}_data.json"`);
                return res.json(jsonData);

            case 'pdf':
                // TODO: Implement PDF export
                throw new ApiError(501, "PDF export not implemented yet");

            default:
                throw new ApiError(400, "Unsupported export format. Supported formats: html, json");
        }

    } catch (error) {
        console.error("Export error:", error);
        
        // Log export failure
        loggingService.logError(error, {
            operation: 'website_export',
            websiteId: websiteId,
            format: format,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Failed to export website: ${error.message}`);
    }
});

// Validate website data
const validateWebsiteData = asyncHandler(async (req, res) => {
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

        // Perform validation checks
        const validationResults = {
            completeness: website.contentCompleteness,
            qualityScore: website.qualityScore,
            seoScore: calculateSeoScore(website),
            accessibilityScore: calculateAccessibilityScore(website),
            errors: [],
            warnings: [],
            recommendations: []
        };

        // Check for missing required fields
        if (!website.heroSection || !website.heroSection.headline) {
            validationResults.errors.push("Hero section headline is missing");
        }

        if (!website.aboutSection || !website.aboutSection.content) {
            validationResults.errors.push("About section content is missing");
        }

        if (!website.services || website.services.length === 0) {
            validationResults.errors.push("No services defined");
        }

        if (!website.contactInfo || !website.contactInfo.phone || !website.contactInfo.email) {
            validationResults.errors.push("Contact information is incomplete");
        }

        // Check for warnings
        if (website.services && website.services.length < 3) {
            validationResults.warnings.push("Consider adding more services for better completeness");
        }

        if (!website.seoMeta || !website.seoMeta.keywords || website.seoMeta.keywords.length < 5) {
            validationResults.warnings.push("SEO keywords are insufficient");
        }

        // Generate recommendations
        if (validationResults.qualityScore < 0.8) {
            validationResults.recommendations.push("Consider improving content quality by adding more detailed information");
        }

        if (validationResults.seoScore < 0.7) {
            validationResults.recommendations.push("Improve SEO by adding more relevant keywords and meta descriptions");
        }

        return res.status(200).json(
            new ApiResponse(200, validationResults, "Website validation completed")
        );

    } catch (error) {
        console.error("Validation error:", error);
        
        // Log validation failure
        loggingService.logError(error, {
            operation: 'website_validation',
            websiteId: websiteId,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Validation failed: ${error.message}`);
    }
});

// Get website generation history
const getWebsiteGenerationHistory = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    try {
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!website) {
            throw new ApiError(404, "Website not found");
        }

        const history = await GenerationHistory.find({
            websiteId: websiteId,
            userId: req.user._id
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

        const totalCount = await GenerationHistory.countDocuments({
            websiteId: websiteId,
            userId: req.user._id
        });

        return res.status(200).json(
            new ApiResponse(200, {
                history,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
                }
            }, "Generation history retrieved successfully")
        );

    } catch (error) {
        console.error("History retrieval error:", error);
        
        // Log history retrieval failure
        loggingService.logError(error, {
            operation: 'history_retrieval',
            websiteId: websiteId,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Failed to retrieve history: ${error.message}`);
    }
});

// Duplicate website
const duplicateWebsite = asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { newTitle } = req.body;

    try {
        const originalWebsite = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!originalWebsite) {
            throw new ApiError(404, "Website not found");
        }

        // Create duplicate
        const duplicateData = originalWebsite.toObject();
        delete duplicateData._id;
        delete duplicateData.createdAt;
        delete duplicateData.updatedAt;
        delete duplicateData.__v;

        duplicateData.websiteTitle = newTitle || `${originalWebsite.websiteTitle} (Copy)`;
        duplicateData.status = 'draft';
        duplicateData.version = 1;
        duplicateData.previousVersions = [];
        duplicateData.analytics = {
            views: 0,
            generatedViews: 0,
            exportCount: 0
        };

        const duplicatedWebsite = new Website(duplicateData);
        await duplicatedWebsite.save();

        // Log duplication
        await GenerationHistory.create({
            websiteId: duplicatedWebsite._id,
            userId: req.user._id,
            action: 'generated',
            changes: { duplicatedFrom: websiteId },
            metadata: {
                processingTime: Date.now(),
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            }
        });

        // Log successful website duplication
        loggingService.logWebsiteGenerationSuccess(
            `Website duplicated successfully`,
            {
                originalWebsiteId: websiteId,
                newWebsiteId: duplicatedWebsite._id,
                userId: req.user._id,
                newTitle: duplicatedWebsite.websiteTitle,
                operation: 'website_duplication',
                method: req.method,
                url: req.originalUrl
            }
        );

        return res.status(201).json(
            new ApiResponse(201, {
                websiteId: duplicatedWebsite._id,
                title: duplicatedWebsite.websiteTitle,
                originalId: websiteId
            }, "Website duplicated successfully")
        );

    } catch (error) {
        console.error("Duplication error:", error);
        
        // Log duplication failure
        loggingService.logError(error, {
            operation: 'website_duplication',
            originalWebsiteId: websiteId,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Failed to duplicate website: ${error.message}`);
    }
});

// Get website statistics
const getWebsiteStats = asyncHandler(async (req, res) => {
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

        const generationHistory = await GenerationHistory.find({
            websiteId: websiteId,
            userId: req.user._id
        }).sort({ createdAt: -1 });

        const stats = {
            website: {
                title: website.websiteTitle,
                specialty: website.specialty,
                status: website.status,
                version: website.version,
                qualityScore: website.qualityScore,
                completeness: website.contentCompleteness,
                createdAt: website.createdAt,
                lastModified: website.lastModified,
                lastGenerated: website.lastGenerated
            },
            analytics: website.analytics,
            history: {
                totalActions: generationHistory.length,
                lastAction: generationHistory[0]?.action || null,
                lastActionDate: generationHistory[0]?.createdAt || null,
                actionBreakdown: generationHistory.reduce((acc, item) => {
                    acc[item.action] = (acc[item.action] || 0) + 1;
                    return acc;
                }, {})
            },
            content: {
                servicesCount: website.services?.length || 0,
                keywordsCount: website.seoMeta?.keywords?.length || 0,
                contentFeatures: website.contentFeatures || [],
                hasLogo: !!website.logo,
                hasCertifications: !!(website.certifications && website.certifications.length > 0)
            },
            technical: {
                templateName: website.templateName,
                hasGeneratedHtml: !!website.generatedHtml,
                fallbackUsed: website.generationMetadata?.fallbackUsed || false,
                processingTime: website.generationMetadata?.processingTime || 0,
                aiModel: website.generationMetadata?.aiModel || 'unknown'
            }
        };

        return res.status(200).json(
            new ApiResponse(200, stats, "Website statistics retrieved successfully")
        );

    } catch (error) {
        console.error("Stats retrieval error:", error);
        
        // Log stats retrieval failure
        loggingService.logError(error, {
            operation: 'stats_retrieval',
            websiteId: websiteId,
            userId: req.user?._id,
            method: req.method,
            url: req.originalUrl
        });
        
        throw new ApiError(500, `Failed to retrieve statistics: ${error.message}`);
    }
});

// Helper function to calculate SEO score
function calculateSeoScore(website) {
    let score = 0;
    let maxScore = 0;

    // Title check
    maxScore += 20;
    if (website.seoMeta?.title && website.seoMeta.title.length >= 10 && website.seoMeta.title.length <= 60) {
        score += 20;
    }

    // Description check
    maxScore += 20;
    if (website.seoMeta?.description && website.seoMeta.description.length >= 50 && website.seoMeta.description.length <= 160) {
        score += 20;
    }

    // Keywords check
    maxScore += 20;
    if (website.seoMeta?.keywords && website.seoMeta.keywords.length >= 5) {
        score += 20;
    }

    // Content quality
    maxScore += 20;
    if (website.aboutSection?.content && website.aboutSection.content.length >= 100) {
        score += 20;
    }

    // Services
    maxScore += 20;
    if (website.services && website.services.length >= 4) {
        score += 20;
    }

    return maxScore > 0 ? score / maxScore : 0;
}

// Helper function to calculate accessibility score
function calculateAccessibilityScore(website) {
    let score = 0;
    let maxScore = 0;

    // Alt text for images (assumed based on structure)
    maxScore += 25;
    score += 25; // Assume good practices

    // Proper heading structure
    maxScore += 25;
    if (website.heroSection?.headline && website.aboutSection?.title) {
        score += 25;
    }

    // Contact accessibility
    maxScore += 25;
    if (website.contactInfo?.phone && website.contactInfo?.email) {
        score += 25;
    }

    // Content structure
    maxScore += 25;
    if (website.services && website.services.length > 0) {
        score += 25;
    }

    return maxScore > 0 ? score / maxScore : 0;
}

export {
    generateWebsite,
    generateWebsitePreview,
    getWebsitePreview,
    updateWebsiteCustomization,
    regenerateWebsiteSection,
    exportWebsiteData,
    validateWebsiteData,
    getWebsiteGenerationHistory,
    duplicateWebsite,
    getWebsiteStats
};