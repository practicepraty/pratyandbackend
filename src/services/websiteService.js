// src/services/websiteService.js
import { Website, GenerationHistory } from "../models/website.models.js";
import WebsiteVersion from "../models/WebsiteVersion.js";
import { ApiError } from "../utils/apierror.js";
import { generatePublicUrl } from "../utils/urlGenerator.js";

class WebsiteService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    // Get single website with version info
    async getWebsite(websiteId, userId, options = {}) {
        try {
            // Check cache first
            const cacheKey = `website:${websiteId}:${userId}`;
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }

            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            }).populate('userId', 'fullName email');

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // Get version information
            const latestDraft = await WebsiteVersion.getLatestVersion(websiteId, 'draft');
            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            const versionHistory = await WebsiteVersion.getVersionHistory(websiteId, 5);

            const result = {
                website: website.toObject(),
                versions: {
                    current: latestDraft || null,
                    published: publishedVersion || null,
                    history: versionHistory,
                    totalVersions: await WebsiteVersion.countDocuments({ websiteId })
                },
                metadata: {
                    hasUnpublishedChanges: latestDraft && publishedVersion ? 
                        latestDraft.versionNumber > publishedVersion.versionNumber : false,
                    isPublished: !!publishedVersion,
                    publicUrl: publishedVersion ? generatePublicUrl(websiteId, publishedVersion.versionNumber) : null,
                    lastModified: website.lastModified,
                    contentCompleteness: website.contentCompleteness,
                    qualityScore: website.qualityScore
                }
            };

            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error('Get website error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to retrieve website: ${error.message}`);
        }
    }

    // Get all websites for a user
    async getUserWebsites(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sort = '-lastModified',
                status = 'all',
                specialty = 'all',
                search = ''
            } = options;

            const skip = (page - 1) * limit;
            const query = {
                userId: userId,
                isActive: true
            };

            // Add filters
            if (status !== 'all') {
                query.status = status;
            }

            if (specialty !== 'all') {
                query.specialty = specialty;
            }

            if (search) {
                query.$or = [
                    { websiteTitle: { $regex: search, $options: 'i' } },
                    { tagline: { $regex: search, $options: 'i' } },
                    { 'aboutSection.content': { $regex: search, $options: 'i' } }
                ];
            }

            const websites = await Website.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .select('-generatedHtml -originalTranscription'); // Exclude large fields

            const totalCount = await Website.countDocuments(query);

            // Get version info for each website
            const websitesWithVersions = await Promise.all(
                websites.map(async (website) => {
                    const publishedVersion = await WebsiteVersion.getPublishedVersion(website._id);
                    const draftVersion = await WebsiteVersion.getLatestVersion(website._id, 'draft');
                    
                    return {
                        ...website.toObject(),
                        versions: {
                            published: publishedVersion ? publishedVersion.versionNumber : null,
                            draft: draftVersion ? draftVersion.versionNumber : null,
                            hasUnpublishedChanges: draftVersion && publishedVersion ? 
                                draftVersion.versionNumber > publishedVersion.versionNumber : false
                        },
                        publicUrl: publishedVersion ? generatePublicUrl(website._id, publishedVersion.versionNumber) : null
                    };
                })
            );

            return {
                websites: websitesWithVersions,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                    hasNextPage: page < Math.ceil(totalCount / limit),
                    hasPrevPage: page > 1
                },
                filters: {
                    status,
                    specialty,
                    search
                }
            };

        } catch (error) {
            console.error('Get user websites error:', error);
            throw new ApiError(500, `Failed to retrieve websites: ${error.message}`);
        }
    }

    // Update website
    async updateWebsite(websiteId, userId, updateData, options = {}) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // Get current draft version or create new one
            let currentDraft = await WebsiteVersion.getLatestVersion(websiteId, 'draft');
            
            if (!currentDraft) {
                // Create first draft version from current website
                currentDraft = new WebsiteVersion({
                    websiteId: websiteId,
                    versionNumber: 1,
                    versionType: 'draft',
                    content: {
                        websiteTitle: website.websiteTitle,
                        tagline: website.tagline,
                        heroSection: website.heroSection,
                        aboutSection: website.aboutSection,
                        services: website.services,
                        contactInfo: website.contactInfo,
                        seoMeta: website.seoMeta,
                        customizations: website.customizations,
                        generatedHtml: website.generatedHtml,
                        templateName: website.templateName
                    },
                    createdBy: userId
                });
                await currentDraft.save();
            }

            // Track changes
            const changes = [];
            const allowedFields = [
                'websiteTitle', 'tagline', 'heroSection', 'aboutSection', 
                'services', 'contactInfo', 'seoMeta', 'customizations'
            ];

            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    const oldValue = website[field];
                    const newValue = updateData[field];
                    
                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        changes.push({
                            field,
                            oldValue,
                            newValue,
                            changeType: 'updated'
                        });
                        
                        // Update website
                        website[field] = newValue;
                        
                        // Update current draft content
                        currentDraft.content[field] = newValue;
                    }
                }
            }

            if (changes.length === 0) {
                return {
                    website: website.toObject(),
                    message: "No changes detected"
                };
            }

            // Create new version if this is a significant change
            if (options.createNewVersion || changes.length > 3) {
                const newVersion = await currentDraft.createNextVersion(
                    Object.fromEntries(changes.map(c => [c.field, c.newValue]))
                );
                newVersion.changes = changes;
                newVersion.changeDescription = options.changeDescription || 'Updated website content';
                await newVersion.save();
                
                currentDraft = newVersion;
            } else {
                // Update existing draft
                currentDraft.changes.push(...changes);
                currentDraft.changeDescription = options.changeDescription || 'Updated website content';
                await currentDraft.save();
            }

            // Update main website record
            website.lastModified = new Date();
            website.version += 1;
            
            // Update quality score
            await website.updateQualityScore();
            
            await website.save();

            // Log the update
            await GenerationHistory.create({
                websiteId: websiteId,
                userId: userId,
                action: 'updated',
                changes: changes.map(c => ({ field: c.field, changeType: c.changeType })),
                previousVersion: currentDraft.parentVersionId,
                metadata: {
                    changeCount: changes.length,
                    versionNumber: currentDraft.versionNumber,
                    processingTime: Date.now()
                }
            });

            // Clear cache
            this.cache.delete(`website:${websiteId}:${userId}`);

            return {
                website: website.toObject(),
                version: currentDraft.toObject(),
                changes: changes,
                message: "Website updated successfully"
            };

        } catch (error) {
            console.error('Update website error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to update website: ${error.message}`);
        }
    }

    // Soft delete website
    async deleteWebsite(websiteId, userId, options = {}) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // Check if website is published
            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            if (publishedVersion && !options.force) {
                throw new ApiError(400, "Cannot delete published website. Unpublish first or use force option.");
            }

            // Soft delete - mark as inactive
            website.isActive = false;
            website.status = 'archived';
            website.lastModified = new Date();
            
            await website.save();

            // Archive all versions
            await WebsiteVersion.updateMany(
                { websiteId: websiteId },
                { 
                    versionType: 'archived',
                    unpublishedAt: new Date()
                }
            );

            // Log the deletion
            await GenerationHistory.create({
                websiteId: websiteId,
                userId: userId,
                action: 'archived',
                changes: { isActive: false, status: 'archived' },
                metadata: {
                    deletedAt: new Date(),
                    wasPublished: !!publishedVersion,
                    processingTime: Date.now()
                }
            });

            // Clear cache
            this.cache.delete(`website:${websiteId}:${userId}`);

            return {
                message: "Website deleted successfully",
                websiteId: websiteId,
                deletedAt: new Date()
            };

        } catch (error) {
            console.error('Delete website error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to delete website: ${error.message}`);
        }
    }

    // Restore deleted website
    async restoreWebsite(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: false
            });

            if (!website) {
                throw new ApiError(404, "Deleted website not found");
            }

            website.isActive = true;
            website.status = 'draft';
            website.lastModified = new Date();
            
            await website.save();

            // Restore latest version
            const latestVersion = await WebsiteVersion.findOne({ websiteId })
                .sort({ versionNumber: -1 });
            
            if (latestVersion) {
                latestVersion.versionType = 'draft';
                latestVersion.unpublishedAt = undefined;
                await latestVersion.save();
            }

            // Log the restoration
            await GenerationHistory.create({
                websiteId: websiteId,
                userId: userId,
                action: 'restored',
                changes: { isActive: true, status: 'draft' },
                metadata: {
                    restoredAt: new Date(),
                    processingTime: Date.now()
                }
            });

            return {
                message: "Website restored successfully",
                website: website.toObject()
            };

        } catch (error) {
            console.error('Restore website error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to restore website: ${error.message}`);
        }
    }

    // Get website statistics
    async getWebsiteStats(userId) {
        try {
            const stats = await Website.aggregate([
                { $match: { userId: userId, isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalWebsites: { $sum: 1 },
                        published: {
                            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
                        },
                        drafts: {
                            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
                        },
                        avgQualityScore: { $avg: '$qualityScore' },
                        specialties: { $addToSet: '$specialty' },
                        totalViews: { $sum: '$analytics.views' },
                        totalExports: { $sum: '$analytics.exportCount' }
                    }
                }
            ]);

            const specialtyStats = await Website.aggregate([
                { $match: { userId: userId, isActive: true } },
                { $group: { _id: '$specialty', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            const recentActivity = await GenerationHistory.find({ userId })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('websiteId', 'websiteTitle');

            return {
                overview: stats[0] || {
                    totalWebsites: 0,
                    published: 0,
                    drafts: 0,
                    avgQualityScore: 0,
                    specialties: [],
                    totalViews: 0,
                    totalExports: 0
                },
                specialtyBreakdown: specialtyStats,
                recentActivity: recentActivity,
                generatedAt: new Date()
            };

        } catch (error) {
            console.error('Get website stats error:', error);
            throw new ApiError(500, `Failed to retrieve statistics: ${error.message}`);
        }
    }

    // Auto-save functionality
    async autoSave(websiteId, userId, contentChanges) {
        try {
            let draftVersion = await WebsiteVersion.getLatestVersion(websiteId, 'draft');
            
            if (!draftVersion) {
                const website = await Website.findById(websiteId);
                draftVersion = new WebsiteVersion({
                    websiteId: websiteId,
                    versionNumber: 1,
                    versionType: 'draft',
                    content: {
                        websiteTitle: website.websiteTitle,
                        tagline: website.tagline,
                        heroSection: website.heroSection,
                        aboutSection: website.aboutSection,
                        services: website.services,
                        contactInfo: website.contactInfo,
                        seoMeta: website.seoMeta,
                        customizations: website.customizations,
                        generatedHtml: website.generatedHtml,
                        templateName: website.templateName
                    },
                    createdBy: userId,
                    isAutoSave: true
                });
            } else {
                // Update existing draft
                Object.assign(draftVersion.content, contentChanges);
                draftVersion.isAutoSave = true;
            }

            await draftVersion.save();

            return {
                success: true,
                versionNumber: draftVersion.versionNumber,
                autoSavedAt: new Date()
            };

        } catch (error) {
            console.error('Auto-save error:', error);
            // Don't throw error for auto-save failures
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export default new WebsiteService();