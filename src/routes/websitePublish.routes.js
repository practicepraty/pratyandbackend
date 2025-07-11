// src/routes/websitePublish.routes.js
import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validatePublishWebsite } from "../middleware/validation.js";
import rateLimiter from "../middleware/rateLimit.js";
import publishService from "../services/publishService.js";
import versionService from "../services/versionService.js";

const router = express.Router();

// Apply authentication to all routes
router.use(verifyJWT);

// Publish website (make it live)
router.post("/:id/publish", rateLimiter.standard, validatePublishWebsite, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { versionNumber, publishMessage } = req.body;
    
    try {
        const result = await publishService.publishWebsite(id, req.user._id, {
            versionNumber,
            publishMessage: publishMessage || 'Website published via API'
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website published successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Unpublish website (take it offline)
router.post("/:id/unpublish", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
        const result = await publishService.unpublishWebsite(id, req.user._id, {
            reason: reason || 'Website unpublished via API'
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website unpublished successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get published website content (public endpoint)
router.get("/:id/live", asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await publishService.getPublishedWebsite(id);
        
        if (!result) {
            throw new ApiError(404, "Published website not found");
        }
        
        // Return HTML content for public viewing
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        
        return res.send(result.content);
    } catch (error) {
        throw error;
    }
}));

// Get published website metadata (public endpoint)
router.get("/:id/live/meta", asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await publishService.getPublishedWebsiteMetadata(id);
        
        if (!result) {
            throw new ApiError(404, "Published website not found");
        }
        
        res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
        
        return res.status(200).json(
            new ApiResponse(200, result, "Published website metadata retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get publication history
router.get("/:id/publish-history", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    try {
        const result = await publishService.getPublishHistory(id, req.user._id, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Publication history retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get publishing status
router.get("/:id/publish-status", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await publishService.getPublishingStatus(id, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Publishing status retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Schedule website publication
router.post("/:id/schedule-publish", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { scheduledDate, versionNumber, publishMessage } = req.body;
    
    if (!scheduledDate) {
        throw new ApiError(400, "Scheduled date is required");
    }
    
    const scheduleDate = new Date(scheduledDate);
    if (scheduleDate <= new Date()) {
        throw new ApiError(400, "Scheduled date must be in the future");
    }
    
    try {
        const result = await publishService.schedulePublish(id, req.user._id, {
            scheduledDate: scheduleDate,
            versionNumber,
            publishMessage: publishMessage || 'Website scheduled for publication'
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website publication scheduled successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Cancel scheduled publication
router.delete("/:id/schedule-publish", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await publishService.cancelScheduledPublish(id, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Scheduled publication cancelled successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get website SEO analysis for published version
router.get("/:id/seo-analysis", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await publishService.analyzeSEO(id, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "SEO analysis completed successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get website performance metrics
router.get("/:id/performance", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { period = '7d' } = req.query;
    
    try {
        const result = await publishService.getPerformanceMetrics(id, req.user._id, {
            period
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Performance metrics retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Test website before publishing
router.post("/:id/test-publish", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { versionNumber } = req.body;
    
    try {
        const result = await publishService.testPublish(id, req.user._id, {
            versionNumber
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website publish test completed successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get published website analytics
router.get("/:id/analytics", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
        period = '30d',
        metrics = 'views,sessions,bounce_rate',
        groupBy = 'day'
    } = req.query;
    
    try {
        const result = await publishService.getWebsiteAnalytics(id, req.user._id, {
            period,
            metrics: metrics.split(','),
            groupBy
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website analytics retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Update published website (republish with changes)
router.put("/:id/republish", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { versionNumber, publishMessage } = req.body;
    
    try {
        const result = await publishService.republishWebsite(id, req.user._id, {
            versionNumber,
            publishMessage: publishMessage || 'Website republished with updates'
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website republished successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Custom domain management
router.post("/:id/custom-domain", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { domain, sslEnabled = true } = req.body;
    
    if (!domain) {
        throw new ApiError(400, "Domain is required");
    }
    
    try {
        const result = await publishService.setCustomDomain(id, req.user._id, {
            domain,
            sslEnabled
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Custom domain configured successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Remove custom domain
router.delete("/:id/custom-domain", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await publishService.removeCustomDomain(id, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Custom domain removed successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get website sitemap
router.get("/:id/sitemap", asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await publishService.generateSitemap(id);
        
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        
        return res.send(result);
    } catch (error) {
        throw error;
    }
}));

// Get website robots.txt
router.get("/:id/robots.txt", asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await publishService.generateRobotsTxt(id);
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        
        return res.send(result);
    } catch (error) {
        throw error;
    }
}));

export default router;