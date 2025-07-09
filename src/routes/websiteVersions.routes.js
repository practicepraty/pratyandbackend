// src/routes/websiteVersions.routes.js
import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { rateLimiter } from "../middleware/rateLimit.js";
import versionService from "../services/versionService.js";

const router = express.Router();

// Apply authentication to all routes
router.use(verifyJWT);

// Get all versions for a website
router.get("/:websiteId/versions", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { limit = 10, offset = 0, type = 'all' } = req.query;
    
    try {
        const result = await versionService.getVersionHistory(websiteId, req.user._id, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            type: type
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Version history retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get specific version
router.get("/:websiteId/versions/:versionId", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId, versionId } = req.params;
    
    try {
        const result = await versionService.getVersion(websiteId, versionId, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Version retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Create new version from current state
router.post("/:websiteId/versions", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { content, changeDescription, versionType = 'draft' } = req.body;
    
    try {
        const result = await versionService.createVersion(websiteId, req.user._id, {
            content,
            changeDescription: changeDescription || 'Manual version created',
            versionType
        });
        
        return res.status(201).json(
            new ApiResponse(201, result, "Version created successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Revert to specific version
router.post("/:websiteId/versions/:versionId/revert", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, versionId } = req.params;
    const { createNewVersion = true } = req.body;
    
    try {
        const result = await versionService.revertToVersion(websiteId, versionId, req.user._id, {
            createNewVersion
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Successfully reverted to version")
        );
    } catch (error) {
        throw error;
    }
}));

// Compare two versions
router.get("/:websiteId/versions/:versionId1/compare/:versionId2", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId, versionId1, versionId2 } = req.params;
    
    try {
        const result = await versionService.compareVersions(websiteId, versionId1, versionId2, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Version comparison completed successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Delete specific version
router.delete("/:websiteId/versions/:versionId", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, versionId } = req.params;
    const { force = false } = req.query;
    
    try {
        const result = await versionService.deleteVersion(websiteId, versionId, req.user._id, {
            force: force === 'true'
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Version deleted successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Get version statistics
router.get("/:websiteId/versions/stats", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    
    try {
        const result = await versionService.getVersionStats(websiteId, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Version statistics retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Clean up old versions
router.delete("/:websiteId/versions/cleanup", rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { keepCount = 5, type = 'draft' } = req.query;
    
    try {
        const result = await versionService.cleanupOldVersions(websiteId, req.user._id, {
            keepCount: parseInt(keepCount),
            type
        });
        
        return res.status(200).json(
            new ApiResponse(200, result, "Old versions cleaned up successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Export version as JSON
router.get("/:websiteId/versions/:versionId/export", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId, versionId } = req.params;
    const { format = 'json' } = req.query;
    
    try {
        const version = await versionService.getVersion(websiteId, versionId, req.user._id);
        
        if (!version) {
            throw new ApiError(404, "Version not found");
        }
        
        const exportData = {
            version: version.version,
            content: version.version.content,
            metadata: {
                versionNumber: version.version.versionNumber,
                versionType: version.version.versionType,
                createdAt: version.version.createdAt,
                publishedAt: version.version.publishedAt,
                changeDescription: version.version.changeDescription
            },
            exportedAt: new Date().toISOString(),
            exportedBy: req.user._id
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 
            `attachment; filename="version_${version.version.versionNumber}_export.json"`
        );
        
        return res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
        throw error;
    }
}));

// Get version diff (changes made in this version)
router.get("/:websiteId/versions/:versionId/diff", rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId, versionId } = req.params;
    
    try {
        const result = await versionService.getVersionDiff(websiteId, versionId, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Version diff retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

export default router;