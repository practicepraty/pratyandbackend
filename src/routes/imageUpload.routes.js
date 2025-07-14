import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apierror.js';
import { ApiResponse } from '../utils/apirespose.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import imageUploadService from '../services/imageUploadService.js';
import rateLimiter from '../middleware/rateLimit.js';
import { Website } from '../models/website.models.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new ApiError(400, `Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
        }
    }
});

// Apply authentication to all routes
router.use(verifyJWT);

// Upload image to website
router.post('/websites/:websiteId/upload-image', 
    rateLimiter.fileUpload, 
    upload.single('image'), 
    asyncHandler(async (req, res) => {
        const { websiteId } = req.params;
        const { alt, caption } = req.body;
        
        if (!req.file) {
            throw new ApiError(400, "No image file provided");
        }
        
        try {
            const result = await imageUploadService.uploadImage(
                websiteId, 
                req.file, 
                req.user._id,
                { alt, caption }
            );
            
            return res.status(201).json(
                new ApiResponse(201, result, "Image uploaded successfully")
            );
        } catch (error) {
            throw error;
        }
    })
);

// Get all images for a website
router.get('/websites/:websiteId/images', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    
    try {
        const result = await imageUploadService.getWebsiteImages(websiteId, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Images retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Delete image
router.delete('/websites/:websiteId/images/:imageId', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, imageId } = req.params;
    
    try {
        const result = await imageUploadService.deleteImage(websiteId, imageId, req.user._id);
        
        return res.status(200).json(
            new ApiResponse(200, result, "Image deleted successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Optimize image
router.post('/websites/:websiteId/images/:imageId/optimize', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, imageId } = req.params;
    const { quality = 'auto', format = 'auto' } = req.body;
    
    try {
        const result = await imageUploadService.optimizeImage(
            websiteId, 
            imageId, 
            req.user._id,
            { quality, format }
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Image optimized successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Crop image
router.post('/websites/:websiteId/images/:imageId/crop', rateLimiter.moderate, asyncHandler(async (req, res) => {
    const { websiteId, imageId } = req.params;
    const { width, height, x, y, name } = req.body;
    
    // Validation
    if (!width || !height || x === undefined || y === undefined) {
        throw new ApiError(400, "width, height, x, and y are required for cropping");
    }
    
    if (width <= 0 || height <= 0 || x < 0 || y < 0) {
        throw new ApiError(400, "Invalid crop dimensions");
    }
    
    try {
        const result = await imageUploadService.cropImage(
            websiteId, 
            imageId, 
            req.user._id,
            { width, height, x, y, name }
        );
        
        return res.status(200).json(
            new ApiResponse(200, result, "Image cropped successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Update image metadata
router.put('/websites/:websiteId/images/:imageId', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId, imageId } = req.params;
    const { alt, caption } = req.body;
    
    try {
        // This would update image metadata in the database
        // For now, we'll implement a basic version
        const website = await Website.findOne({
            _id: websiteId,
            userId: req.user._id,
            isActive: true
        });

        if (!website) {
            throw new ApiError(404, "Website not found or access denied");
        }

        const imageIndex = website.images.findIndex(img => img.id === imageId);
        if (imageIndex === -1) {
            throw new ApiError(404, "Image not found");
        }

        // Update metadata
        if (alt !== undefined) website.images[imageIndex].alt = alt;
        if (caption !== undefined) website.images[imageIndex].caption = caption;

        await website.save();
        
        return res.status(200).json(
            new ApiResponse(200, {
                image: website.images[imageIndex],
                success: true
            }, "Image metadata updated successfully")
        );
    } catch (error) {
        throw error;
    }
}));

// Bulk upload images
router.post('/websites/:websiteId/upload-images', 
    rateLimiter.fileUpload, 
    upload.array('images', 5), // Max 5 images at once
    asyncHandler(async (req, res) => {
        const { websiteId } = req.params;
        
        if (!req.files || req.files.length === 0) {
            throw new ApiError(400, "No image files provided");
        }
        
        try {
            const uploadPromises = req.files.map(file => 
                imageUploadService.uploadImage(websiteId, file, req.user._id)
            );
            
            const results = await Promise.allSettled(uploadPromises);
            
            const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
            const failed = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
            
            return res.status(201).json(
                new ApiResponse(201, {
                    successful: successful.length,
                    failed: failed.length,
                    results: successful,
                    errors: failed
                }, "Bulk upload completed")
            );
        } catch (error) {
            throw error;
        }
    })
);

// Get image service statistics
router.get('/stats', rateLimiter.standard, asyncHandler(async (req, res) => {
    try {
        const stats = imageUploadService.getServiceStats();
        
        return res.status(200).json(
            new ApiResponse(200, stats, "Image service statistics retrieved")
        );
    } catch (error) {
        throw error;
    }
}));

export default router;