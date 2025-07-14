import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apierror.js';
import { ApiResponse } from '../utils/apirespose.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import contentRegenerationService from '../services/contentRegenerationService.js';
import rateLimiter from '../middleware/rateLimit.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyJWT);

// Regenerate content section
router.post('/regenerate', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, sectionId, prompt, currentContent, fieldId, action, targetAudience, keywords, options } = req.body;
    
    // Validation - allow either prompt or action
    if (!websiteId || !sectionId || !currentContent) {
        throw new ApiError(400, "websiteId, sectionId, and currentContent are required");
    }
    
    if (!prompt && !action) {
        throw new ApiError(400, "Either prompt or action is required");
    }
    
    if (prompt && prompt.length > 500) {
        throw new ApiError(400, "Prompt must be less than 500 characters");
    }
    
    if (currentContent.length > 5000) {
        throw new ApiError(400, "Current content must be less than 5000 characters");
    }
    
    try {
        // Use prompt if provided, otherwise create prompt from action
        const effectivePrompt = prompt || `Please ${action} this content for better engagement`;
        
        const result = await contentRegenerationService.regenerateSection(
            websiteId, 
            sectionId, 
            effectivePrompt, 
            currentContent,
            req.user._id,
            { fieldId, action, targetAudience, keywords, options }
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content regenerated successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Improve content
router.post('/improve', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { content, improvementType, specialty } = req.body;
    
    // Validation
    if (!content || !improvementType) {
        throw new ApiError(400, "content and improvementType are required");
    }
    
    const validImprovementTypes = [
        'clarity', 'professionalism', 'seo', 'engagement', 
        'medical_accuracy', 'patient_friendly', 'trust_building'
    ];
    
    if (!validImprovementTypes.includes(improvementType)) {
        throw new ApiError(400, `Invalid improvement type. Must be one of: ${validImprovementTypes.join(', ')}`);
    }
    
    if (content.length > 5000) {
        throw new ApiError(400, "Content must be less than 5000 characters");
    }
    
    try {
        const result = await contentRegenerationService.improveContent(
            content, 
            improvementType, 
            specialty || 'general medicine',
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content improved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Generate content variations
router.post('/variations', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { content, variationCount = 3, focus, specialty } = req.body;
    
    // Validation
    if (!content) {
        throw new ApiError(400, "content is required");
    }
    
    if (variationCount < 1 || variationCount > 5) {
        throw new ApiError(400, "variationCount must be between 1 and 5");
    }
    
    if (content.length > 3000) {
        throw new ApiError(400, "Content must be less than 3000 characters");
    }
    
    try {
        const result = await contentRegenerationService.generateVariations(
            content,
            variationCount,
            focus || 'general',
            specialty || 'general medicine',
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content variations generated successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Optimize content for SEO
router.post('/optimize-seo', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { content, targetKeywords, contentType = 'general' } = req.body;
    
    // Validation
    if (!content) {
        throw new ApiError(400, "content is required");
    }
    
    if (content.length > 4000) {
        throw new ApiError(400, "Content must be less than 4000 characters");
    }
    
    try {
        const result = await contentRegenerationService.optimizeForSEO(
            content,
            targetKeywords || [],
            contentType,
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content optimized for SEO successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Check content quality
router.post('/quality-check', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { content, contentType = 'general', specialty } = req.body;
    
    // Validation
    if (!content) {
        throw new ApiError(400, "content is required");
    }
    
    if (content.length > 5000) {
        throw new ApiError(400, "Content must be less than 5000 characters");
    }
    
    try {
        const result = await contentRegenerationService.checkContentQuality(
            content,
            contentType,
            specialty || 'general medicine',
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content quality check completed")
        );
    } catch (error) {
        throw error;
    }
}));

// Get content suggestions
router.post('/suggestions', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { content, sectionType, specialty } = req.body;
    
    // Validation
    if (!content || !sectionType) {
        throw new ApiError(400, "content and sectionType are required");
    }
    
    const validSectionTypes = [
        'hero', 'about', 'services', 'contact', 'testimonials', 'general'
    ];
    
    if (!validSectionTypes.includes(sectionType)) {
        throw new ApiError(400, `Invalid section type. Must be one of: ${validSectionTypes.join(', ')}`);
    }
    
    if (content.length > 3000) {
        throw new ApiError(400, "Content must be less than 3000 characters");
    }
    
    try {
        const result = await contentRegenerationService.getContentSuggestions(
            content,
            sectionType,
            specialty || 'general medicine',
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content suggestions generated successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Adjust content tone
router.post('/adjust-tone', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { content, targetTone, audience, specialty } = req.body;
    
    // Validation
    if (!content || !targetTone || !audience) {
        throw new ApiError(400, "content, targetTone, and audience are required");
    }
    
    const validTones = [
        'professional', 'friendly', 'authoritative', 'compassionate', 
        'formal', 'casual', 'reassuring', 'confident'
    ];
    
    if (!validTones.includes(targetTone)) {
        throw new ApiError(400, `Invalid tone. Must be one of: ${validTones.join(', ')}`);
    }
    
    if (content.length > 4000) {
        throw new ApiError(400, "Content must be less than 4000 characters");
    }
    
    try {
        const result = await contentRegenerationService.adjustTone(
            content,
            targetTone,
            audience,
            specialty || 'general medicine',
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content tone adjusted successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Expand content
router.post('/expand', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { content, expansionType = 'detailed', targetLength, specialty } = req.body;
    
    // Validation
    if (!content) {
        throw new ApiError(400, "content is required");
    }
    
    const validExpansionTypes = [
        'detailed', 'examples', 'benefits', 'technical', 'patient-friendly'
    ];
    
    if (!validExpansionTypes.includes(expansionType)) {
        throw new ApiError(400, `Invalid expansion type. Must be one of: ${validExpansionTypes.join(', ')}`);
    }
    
    if (content.length > 3000) {
        throw new ApiError(400, "Content must be less than 3000 characters");
    }
    
    if (targetLength && (targetLength < 50 || targetLength > 2000)) {
        throw new ApiError(400, "Target length must be between 50 and 2000 words");
    }
    
    try {
        const result = await contentRegenerationService.expandContent(
            content,
            expansionType,
            targetLength,
            specialty || 'general medicine',
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content expanded successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Shorten content
router.post('/shorten', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { content, targetLength, preserveKeyPoints = true, specialty } = req.body;
    
    // Validation
    if (!content) {
        throw new ApiError(400, "content is required");
    }
    
    if (content.length > 5000) {
        throw new ApiError(400, "Content must be less than 5000 characters");
    }
    
    if (targetLength && (targetLength < 20 || targetLength > 1000)) {
        throw new ApiError(400, "Target length must be between 20 and 1000 words");
    }
    
    try {
        const result = await contentRegenerationService.shortenContent(
            content,
            targetLength,
            preserveKeyPoints,
            specialty || 'general medicine',
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content shortened successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Analyze content for frontend
router.post('/analyze', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { content, sectionType, specialty } = req.body;
    
    // Validation
    if (!content || !sectionType) {
        throw new ApiError(400, "content and sectionType are required");
    }
    
    const validSectionTypes = [
        'hero', 'about', 'services', 'contact', 'testimonials', 'general'
    ];
    
    if (!validSectionTypes.includes(sectionType)) {
        throw new ApiError(400, `Invalid section type. Must be one of: ${validSectionTypes.join(', ')}`);
    }
    
    if (content.length > 5000) {
        throw new ApiError(400, "Content must be less than 5000 characters");
    }
    
    try {
        const result = await contentRegenerationService.analyzeContentForFrontend(
            content,
            sectionType,
            specialty || 'general medicine',
            req.user._id
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content analysis completed successfully")
        );
    } catch (error) {
        throw error;
    }
}));

export default router;