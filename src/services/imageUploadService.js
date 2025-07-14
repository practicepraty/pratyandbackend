import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '../utils/apierror.js';
import { Website } from '../models/website.models.js';
import { config } from '../config/environment.js';
import loggingService from './loggingService.js';
import crypto from 'crypto';
import path from 'path';
import sharp from 'sharp';

class ImageUploadService {
    constructor() {
        // Configure Cloudinary
        cloudinary.config({
            cloud_name: config.cloudinary.cloudName,
            api_key: config.cloudinary.apiKey,
            api_secret: config.cloudinary.apiSecret
        });
        
        // Allowed image types
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    async uploadImage(websiteId, file, userId, options = {}) {
        try {
            // Validate file
            this.validateFile(file);
            
            // Verify user owns the website
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // Generate unique filename
            const fileExtension = path.extname(file.originalname);
            const uniqueId = crypto.randomUUID();
            const filename = `${websiteId}_${uniqueId}${fileExtension}`;

            // Upload to Cloudinary
            const uploadResult = await this.uploadToCloudinary(file.buffer, filename, options);
            
            // Generate thumbnail
            const thumbnailResult = await this.generateThumbnail(file.buffer, filename);

            // Create image record
            const imageData = {
                id: uniqueId,
                filename: filename,
                originalName: file.originalname,
                url: uploadResult.secure_url,
                thumbnailUrl: thumbnailResult.secure_url,
                size: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date(),
                optimized: false,
                crops: [],
                alt: options.alt || '',
                caption: options.caption || ''
            };

            // Add image to website
            website.images.push(imageData);
            await website.save();

            // Log the upload
            loggingService.logAppEvent('info', 'Image uploaded', {
                websiteId,
                userId,
                imageId: uniqueId,
                filename: file.originalname,
                size: file.size
            });

            return {
                success: true,
                image: imageData,
                message: 'Image uploaded successfully'
            };

        } catch (error) {
            loggingService.logError('Image upload failed', error, { websiteId, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to upload image: ${error.message}`);
        }
    }

    async optimizeImage(websiteId, imageId, userId, options = {}) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const imageIndex = website.images.findIndex(img => img.id === imageId);
            if (imageIndex === -1) {
                throw new ApiError(404, "Image not found");
            }

            const image = website.images[imageIndex];
            
            // If already optimized, return current image
            if (image.optimized) {
                return {
                    success: true,
                    image: image,
                    message: 'Image already optimized'
                };
            }

            // Optimize image using Cloudinary transformations
            const optimizationParams = {
                quality: options.quality || 'auto',
                fetch_format: 'auto',
                flags: 'progressive'
            };

            const optimizedUrl = cloudinary.url(image.filename, optimizationParams);
            
            // Update image record
            website.images[imageIndex].url = optimizedUrl;
            website.images[imageIndex].optimized = true;
            await website.save();

            // Log optimization
            loggingService.logAppEvent('info', 'Image optimized', {
                websiteId,
                userId,
                imageId,
                optimizationParams
            });

            return {
                success: true,
                image: website.images[imageIndex],
                message: 'Image optimized successfully'
            };

        } catch (error) {
            loggingService.logError('Image optimization failed', error, { websiteId, imageId, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to optimize image: ${error.message}`);
        }
    }

    async cropImage(websiteId, imageId, userId, cropData) {
        try {
            const { width, height, x, y, name } = cropData;
            
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const imageIndex = website.images.findIndex(img => img.id === imageId);
            if (imageIndex === -1) {
                throw new ApiError(404, "Image not found");
            }

            const image = website.images[imageIndex];
            
            // Create crop transformation
            const cropParams = {
                width,
                height,
                x,
                y,
                crop: 'crop'
            };

            const croppedUrl = cloudinary.url(image.filename, cropParams);
            
            // Add crop to image record
            const cropRecord = {
                name: name || `crop_${Date.now()}`,
                width,
                height,
                x,
                y,
                url: croppedUrl
            };

            website.images[imageIndex].crops.push(cropRecord);
            await website.save();

            // Log crop operation
            loggingService.logAppEvent('info', 'Image cropped', {
                websiteId,
                userId,
                imageId,
                cropData
            });

            return {
                success: true,
                crop: cropRecord,
                image: website.images[imageIndex],
                message: 'Image cropped successfully'
            };

        } catch (error) {
            loggingService.logError('Image crop failed', error, { websiteId, imageId, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to crop image: ${error.message}`);
        }
    }

    async deleteImage(websiteId, imageId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const imageIndex = website.images.findIndex(img => img.id === imageId);
            if (imageIndex === -1) {
                throw new ApiError(404, "Image not found");
            }

            const image = website.images[imageIndex];
            
            // Delete from Cloudinary
            try {
                await cloudinary.uploader.destroy(path.parse(image.filename).name);
                // Delete thumbnail if exists
                if (image.thumbnailUrl) {
                    const thumbnailFilename = path.parse(image.filename).name + '_thumb';
                    await cloudinary.uploader.destroy(thumbnailFilename);
                }
            } catch (cloudinaryError) {
                // Log but don't fail if Cloudinary deletion fails
                loggingService.logError('Cloudinary deletion failed', cloudinaryError, { imageId });
            }

            // Remove from website
            website.images.splice(imageIndex, 1);
            await website.save();

            // Log deletion
            loggingService.logAppEvent('info', 'Image deleted', {
                websiteId,
                userId,
                imageId,
                filename: image.filename
            });

            return {
                success: true,
                message: 'Image deleted successfully'
            };

        } catch (error) {
            loggingService.logError('Image deletion failed', error, { websiteId, imageId, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to delete image: ${error.message}`);
        }
    }

    async getWebsiteImages(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            }).select('images');

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            return {
                success: true,
                images: website.images,
                count: website.images.length
            };

        } catch (error) {
            loggingService.logError('Get website images failed', error, { websiteId, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to get images: ${error.message}`);
        }
    }

    // Private helper methods
    validateFile(file) {
        if (!file) {
            throw new ApiError(400, "No file provided");
        }

        if (!this.allowedTypes.includes(file.mimetype)) {
            throw new ApiError(400, `Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`);
        }

        if (file.size > this.maxFileSize) {
            throw new ApiError(400, `File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`);
        }
    }

    async uploadToCloudinary(buffer, filename, options = {}) {
        return new Promise((resolve, reject) => {
            const uploadOptions = {
                public_id: path.parse(filename).name,
                folder: 'medical-websites',
                resource_type: 'image',
                quality: options.quality || 'auto',
                format: options.format || 'auto',
                ...options.cloudinaryOptions
            };

            cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
                    } else {
                        resolve(result);
                    }
                }
            ).end(buffer);
        });
    }

    async generateThumbnail(buffer, filename) {
        try {
            // Create thumbnail using Sharp
            const thumbnailBuffer = await sharp(buffer)
                .resize(300, 200, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Upload thumbnail to Cloudinary
            const thumbnailFilename = path.parse(filename).name + '_thumb';
            return await this.uploadToCloudinary(thumbnailBuffer, thumbnailFilename, {
                folder: 'medical-websites/thumbnails'
            });

        } catch (error) {
            // If thumbnail generation fails, return original image
            loggingService.logError('Thumbnail generation failed', error);
            return await this.uploadToCloudinary(buffer, filename);
        }
    }

    // Get service statistics
    getServiceStats() {
        return {
            allowedTypes: this.allowedTypes,
            maxFileSize: this.maxFileSize,
            cloudinaryConfigured: !!(config.cloudinary.cloudName && config.cloudinary.apiKey)
        };
    }
}

export default new ImageUploadService();