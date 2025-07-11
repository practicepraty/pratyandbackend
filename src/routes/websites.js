// src/routes/websites.js
import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import websiteService from "../services/websiteService.js";
import { validateWebsiteUpdate } from "../middleware/validation.js";
import rateLimiter from "../middleware/rateLimit.js";

const router = express.Router();

// Apply authentication to all routes
router.use(verifyJWT);

// Get single website by ID
router.get("/:id", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { includeVersions = 'true', includeHistory = 'false' } = req.query;
    
    try {
        const result = await websiteService.getWebsite(id, req.user._id, {
            includeVersions: includeVersions === 'true',
            includeHistory: includeHistory === 'true'
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get all websites for current user
router.get("/", rateLimiter.standard, asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        sort = '-lastModified',
        status = 'all',
        specialty = 'all',
        search = ''
    } = req.query;
    
    try {
        const result = await websiteService.getUserWebsites(req.user._id, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 50), // Max 50 per page
            sort,
            status,
            specialty,
            search
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Websites retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Update website
router.put("/:id", rateLimiter.moderate, validateWebsiteUpdate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const { createNewVersion = 'false', changeDescription } = req.query;
    
    try {
        const result = await websiteService.updateWebsite(id, req.user._id, updateData, {
            createNewVersion: createNewVersion === 'true',
            changeDescription: changeDescription || 'Website updated via API'
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website updated successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Soft delete website
router.delete("/:id", rateLimiter.strict, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { force = 'false' } = req.query;
    
    try {
        const result = await websiteService.deleteWebsite(id, req.user._id, {
            force: force === 'true'
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website deleted successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Restore deleted website
router.post("/:id/restore", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await websiteService.restoreWebsite(id, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website restored successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get website statistics
router.get("/stats/overview", rateLimiter.standard, asyncHandler(async (req, res) => {
    try {
        const result = await websiteService.getWebsiteStats(req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Website statistics retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Auto-save website content
router.post("/:id/autosave", rateLimiter.lenient, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const contentChanges = req.body;
    
    try {
        const result = await websiteService.autoSave(id, req.user._id, contentChanges);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content auto-saved successfully")
        );
    } catch (error) {
        // Auto-save should not fail the request
        return res.status(200).json(
            new ApiResponse(200, { success: false, error: error.message }, "Auto-save failed")
        );
    }
}));

// Duplicate website
router.post("/:id/duplicate", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, includeVersions = 'false' } = req.body;
    
    try {
        // Get the website to duplicate
        const originalWebsite = await websiteService.getWebsite(id, req.user._id);
        
        if (!originalWebsite) {
            throw new ApiError(404, "Website not found");
        }
        
        // Create new website with duplicated content
        const duplicatedContent = {
            ...originalWebsite.website,
            websiteTitle: title || `${originalWebsite.website.websiteTitle} (Copy)`,
            status: 'draft',
            isPublished: false,
            publicUrl: null,
            version: 1,
            analytics: {
                views: 0,
                generatedViews: 0,
                exportCount: 0
            }
        };
        
        // Remove fields that shouldn't be duplicated
        delete duplicatedContent._id;
        delete duplicatedContent.createdAt;
        delete duplicatedContent.updatedAt;
        delete duplicatedContent.publishedAt;
        delete duplicatedContent.lastModified;
        
        const result = {
            message: "Website duplicated successfully",
            originalId: id,
            duplicatedWebsite: duplicatedContent
        };
        
        return res.status(201).json(
            new ApiResponse(201, result, "Website duplicated successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get website export data
router.get("/:id/export", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'json', includeVersions = 'false' } = req.query;
    
    try {
        const website = await websiteService.getWebsite(id, req.user._id, {
            includeVersions: includeVersions === 'true'
        });
        
        if (!website) {
            throw new ApiError(404, "Website not found");
        }
        
        switch (format.toLowerCase()) {
            case 'json':
                const exportData = {
                    website: website.website,
                    versions: includeVersions === 'true' ? website.versions : undefined,
                    exportedAt: new Date().toISOString(),
                    exportedBy: req.user._id
                };
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 
                    `attachment; filename="${website.website.websiteTitle.replace(/[^a-zA-Z0-9]/g, '_')}_export.json"`
                );
                return res.send(JSON.stringify(exportData, null, 2));
                
            case 'html':
                if (website.website.generatedHtml) {
                    res.setHeader('Content-Type', 'text/html');
                    res.setHeader('Content-Disposition', 
                        `attachment; filename="${website.website.websiteTitle.replace(/[^a-zA-Z0-9]/g, '_')}_website.html"`
                    );
                    return res.send(website.website.generatedHtml);
                } else {
                    throw new ApiError(400, "No HTML content available for export");
                }
                
            default:
                throw new ApiError(400, "Unsupported export format. Use 'json' or 'html'");
        }
    } catch (error) {
        throw error;
    }
}));

// Bulk operations
router.post("/bulk/delete", rateLimiter.strict, asyncHandler(async (req, res) => {
    const { websiteIds, force = false } = req.body;
    
    if (!Array.isArray(websiteIds) || websiteIds.length === 0) {
        throw new ApiError(400, "Website IDs array is required");
    }
    
    if (websiteIds.length > 10) {
        throw new ApiError(400, "Maximum 10 websites can be deleted at once");
    }
    
    try {
        const results = await Promise.allSettled(
            websiteIds.map(id => websiteService.deleteWebsite(id, req.user._id, { force }))
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
        
        return res.status(200).json(
            new ApiResponse(200, {
                successful: successful.length,
                failed: failed.length,
                results: successful,
                errors: failed
            }, "Bulk delete operation completed")
        );
    } catch (error) {
        throw error;
    }
}));

// Bulk status update
router.put("/bulk/status", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteIds, status } = req.body;
    
    if (!Array.isArray(websiteIds) || websiteIds.length === 0) {
        throw new ApiError(400, "Website IDs array is required");
    }
    
    if (!['draft', 'published', 'archived'].includes(status)) {
        throw new ApiError(400, "Invalid status. Must be 'draft', 'published', or 'archived'");
    }
    
    if (websiteIds.length > 20) {
        throw new ApiError(400, "Maximum 20 websites can be updated at once");
    }
    
    try {
        const results = await Promise.allSettled(
            websiteIds.map(id => websiteService.updateWebsite(id, req.user._id, { status }))
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
        
        return res.status(200).json(
            new ApiResponse(200, {
                successful: successful.length,
                failed: failed.length,
                results: successful,
                errors: failed
            }, "Bulk status update completed")
        );
    } catch (error) {
        throw error;
    }
}));

// Get website analytics
router.get("/:id/analytics", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { period = '30d' } = req.query;
    
    try {
        const website = await websiteService.getWebsite(id, req.user._id);
        
        if (!website) {
            throw new ApiError(404, "Website not found");
        }
        
        // Return current analytics (in production, this would query analytics service)
        const analytics = {
            website: {
                id: website.website._id,
                title: website.website.websiteTitle,
                status: website.website.status
            },
            metrics: {
                views: website.website.analytics.views,
                generatedViews: website.website.analytics.generatedViews,
                exportCount: website.website.analytics.exportCount,
                lastViewed: website.website.analytics.lastViewed
            },
            period: period,
            generatedAt: new Date()
        };
        
        return res.status(200).json(
            new ApiResponse(200, analytics, "Website analytics retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

export default router;