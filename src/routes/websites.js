// src/routes/websites.js
import express from "express";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import websiteService from "../services/websiteService.js";
import { validateWebsiteUpdate } from "../middleware/validation.js";
import rateLimiter from "../middleware/rateLimit.js";
import { Website } from "../models/website.models.js";

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

// Enhanced auto-save with section/field targeting
router.post("/:id/content/auto-save", rateLimiter.lenient, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { changes, sectionId, fieldId, isMinorChange = true } = req.body;
    
    try {
        const result = await websiteService.autoSaveContent(
            id, 
            req.user._id, 
            changes, 
            { sectionId, fieldId, isMinorChange }
        );
        
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

// Get content history
router.get("/:id/content/history", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 20, sectionId, actionType } = req.query;
    
    try {
        const result = await websiteService.getContentHistory(
            id, 
            req.user._id, 
            { limit: parseInt(limit), sectionId, actionType }
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Content history retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Undo last change
router.post("/:id/content/undo", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await websiteService.undoChange(id, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Change undone successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Redo last undone change
router.post("/:id/content/redo", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await websiteService.redoChange(id, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Change redone successfully")
        );
    } catch (error) {
        throw error;
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

// Get website preview (alias for preview-data for frontend compatibility)
router.get('/:websiteId/preview', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { deviceType = 'desktop', zoom = 100 } = req.query;
    
    try {
        const previewData = await websiteService.getPreviewData(websiteId, req.user._id, {
            deviceType,
            zoom: parseInt(zoom)
        });
        
        return res.status(200).json(
            new ApiResponse(200, previewData, "Website preview retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get website data for frontend preview
router.get('/:websiteId/preview-data', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { deviceType = 'desktop', zoom = 100 } = req.query;
    
    try {
        const previewData = await websiteService.getPreviewData(websiteId, req.user._id, {
            deviceType,
            zoom: parseInt(zoom)
        });
        
        return res.status(200).json(
            new ApiResponse(200, previewData, "Preview data retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Refresh preview (regenerate HTML/CSS)
router.post('/:websiteId/preview/refresh', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { deviceType = 'desktop', zoom = 100, forceRegenerate = false } = req.body;
    
    try {
        // Clear any cached preview data
        websiteService.clearCache();
        
        const previewData = await websiteService.getPreviewData(websiteId, req.user._id, {
            deviceType,
            zoom: parseInt(zoom),
            forceRegenerate
        });
        
        return res.status(200).json(
            new ApiResponse(200, previewData, "Preview refreshed successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Switch preview device type
router.post('/:websiteId/preview/device', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { deviceType, zoom = 100 } = req.body;
    
    // Validation
    const validDeviceTypes = ['desktop', 'tablet', 'mobile'];
    if (!validDeviceTypes.includes(deviceType)) {
        throw new ApiError(400, `Invalid device type. Must be one of: ${validDeviceTypes.join(', ')}`);
    }
    
    if (zoom < 25 || zoom > 200) {
        throw new ApiError(400, "Zoom must be between 25 and 200");
    }
    
    try {
        const previewData = await websiteService.getPreviewData(websiteId, req.user._id, {
            deviceType,
            zoom: parseInt(zoom)
        });
        
        return res.status(200).json(
            new ApiResponse(200, previewData, `Preview switched to ${deviceType} view`)
        );
    } catch (error) {
        throw error;
    }
}));

// Get specific content section
router.get('/:websiteId/content/:sectionId', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId, sectionId } = req.params;
    
    try {
        const sectionData = await websiteService.getContentSection(websiteId, req.user._id, sectionId);
        
        return res.status(200).json(
            new ApiResponse(200, sectionData, "Content section retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Update content section
router.put('/:websiteId/content/:sectionId', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, sectionId } = req.params;
    const { content } = req.body;
    
    try {
        const updated = await websiteService.updateContentSection(websiteId, req.user._id, sectionId, content);
        
        return res.status(200).json(
            new ApiResponse(200, updated, "Content section updated successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Service Management Endpoints

// Add new service
router.post('/:websiteId/services', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const serviceData = req.body;
    
    // Validation
    if (!serviceData.name || !serviceData.description) {
        throw new ApiError(400, "Service name and description are required");
    }
    
    try {
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!website) {
            throw new ApiError(404, "Website not found or access denied");
        }

        // Create new service with unique ID
        const newService = {
            id: crypto.randomUUID(),
            name: { text: serviceData.name, editable: true },
            description: { text: serviceData.description, editable: true },
            icon: serviceData.icon || { type: 'medical', value: 'stethoscope' },
            image: serviceData.image || {},
            price: serviceData.price || {},
            duration: serviceData.duration || {},
            isActive: true,
            order: website.services?.length || 0
        };

        if (!website.services) {
            website.services = [];
        }
        
        website.services.push(newService);
        await website.save();
        
        return res.status(201).json(
            new ApiResponse(201, { service: newService }, "Service added successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Update existing service
router.put('/:websiteId/services/:serviceId', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, serviceId } = req.params;
    const updateData = req.body;
    
    try {
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!website) {
            throw new ApiError(404, "Website not found or access denied");
        }

        const serviceIndex = website.services?.findIndex(service => service.id === serviceId);
        if (serviceIndex === -1 || serviceIndex === undefined) {
            throw new ApiError(404, "Service not found");
        }

        // Update service data
        const service = website.services[serviceIndex];
        if (updateData.name) service.name = { ...service.name, ...updateData.name };
        if (updateData.description) service.description = { ...service.description, ...updateData.description };
        if (updateData.icon) service.icon = updateData.icon;
        if (updateData.image) service.image = updateData.image;
        if (updateData.price) service.price = updateData.price;
        if (updateData.duration) service.duration = updateData.duration;
        if (updateData.order !== undefined) service.order = updateData.order;
        if (updateData.isActive !== undefined) service.isActive = updateData.isActive;

        await website.save();
        
        return res.status(200).json(
            new ApiResponse(200, { service: website.services[serviceIndex] }, "Service updated successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Delete service
router.delete('/:websiteId/services/:serviceId', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, serviceId } = req.params;
    
    try {
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!website) {
            throw new ApiError(404, "Website not found or access denied");
        }

        const serviceIndex = website.services?.findIndex(service => service.id === serviceId);
        if (serviceIndex === -1 || serviceIndex === undefined) {
            throw new ApiError(404, "Service not found");
        }

        // Remove service
        const deletedService = website.services.splice(serviceIndex, 1)[0];
        
        // Reorder remaining services
        website.services.forEach((service, index) => {
            service.order = index;
        });

        await website.save();
        
        return res.status(200).json(
            new ApiResponse(200, { deletedService }, "Service deleted successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Reorder services
router.put('/:websiteId/services/reorder', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { serviceOrder } = req.body; // Array of service IDs in new order
    
    if (!Array.isArray(serviceOrder)) {
        throw new ApiError(400, "serviceOrder must be an array of service IDs");
    }
    
    try {
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!website) {
            throw new ApiError(404, "Website not found or access denied");
        }

        if (!website.services || website.services.length === 0) {
            throw new ApiError(400, "No services to reorder");
        }

        // Validate all service IDs exist
        const existingServiceIds = website.services.map(s => s.id);
        const invalidIds = serviceOrder.filter(id => !existingServiceIds.includes(id));
        
        if (invalidIds.length > 0) {
            throw new ApiError(400, `Invalid service IDs: ${invalidIds.join(', ')}`);
        }

        // Reorder services
        const reorderedServices = serviceOrder.map((serviceId, index) => {
            const service = website.services.find(s => s.id === serviceId);
            service.order = index;
            return service;
        });

        website.services = reorderedServices;
        await website.save();
        
        return res.status(200).json(
            new ApiResponse(200, { services: website.services }, "Services reordered successfully")
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