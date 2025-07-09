// src/services/versionService.js
import WebsiteVersion from "../models/WebsiteVersion.js";
import { Website } from "../models/website.models.js";
import { ApiError } from "../utils/apierror.js";

class VersionService {
    constructor() {
        this.maxVersionsPerWebsite = 50;
        this.maxDraftVersions = 10;
        this.cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
        this.startCleanupTimer();
    }

    // Get version history for a website
    async getVersionHistory(websiteId, userId, options = {}) {
        try {
            const { page = 1, limit = 20, versionType = 'all' } = options;
            const skip = (page - 1) * limit;

            // Verify user owns the website
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const query = { websiteId };
            if (versionType !== 'all') {
                query.versionType = versionType;
            }

            const versions = await WebsiteVersion.find(query)
                .sort({ versionNumber: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'fullName email')
                .select('-content.generatedHtml'); // Exclude large HTML content

            const totalCount = await WebsiteVersion.countDocuments(query);

            return {
                versions,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                    hasNextPage: page < Math.ceil(totalCount / limit),
                    hasPrevPage: page > 1
                },
                summary: {
                    totalVersions: totalCount,
                    publishedVersions: await WebsiteVersion.countDocuments({ websiteId, versionType: 'published' }),
                    draftVersions: await WebsiteVersion.countDocuments({ websiteId, versionType: 'draft' }),
                    archivedVersions: await WebsiteVersion.countDocuments({ websiteId, versionType: 'archived' })
                }
            };

        } catch (error) {
            console.error('Get version history error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to retrieve version history: ${error.message}`);
        }
    }

    // Get specific version
    async getVersion(websiteId, versionId, userId) {
        try {
            // Verify user owns the website
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const version = await WebsiteVersion.findOne({
                _id: versionId,
                websiteId: websiteId
            }).populate('createdBy', 'fullName email');

            if (!version) {
                throw new ApiError(404, "Version not found");
            }

            return {
                version: version.toObject(),
                website: {
                    _id: website._id,
                    websiteTitle: website.websiteTitle,
                    specialty: website.specialty,
                    status: website.status
                }
            };

        } catch (error) {
            console.error('Get version error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to retrieve version: ${error.message}`);
        }
    }

    // Create new version
    async createVersion(websiteId, userId, contentChanges = {}, options = {}) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // Get the latest version number
            const latestVersion = await WebsiteVersion.findOne({ websiteId })
                .sort({ versionNumber: -1 });

            const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

            // Create new version
            const newVersion = new WebsiteVersion({
                websiteId: websiteId,
                versionNumber: newVersionNumber,
                versionType: options.versionType || 'draft',
                content: {
                    websiteTitle: contentChanges.websiteTitle || website.websiteTitle,
                    tagline: contentChanges.tagline || website.tagline,
                    heroSection: contentChanges.heroSection || website.heroSection,
                    aboutSection: contentChanges.aboutSection || website.aboutSection,
                    services: contentChanges.services || website.services,
                    contactInfo: contentChanges.contactInfo || website.contactInfo,
                    seoMeta: contentChanges.seoMeta || website.seoMeta,
                    customizations: contentChanges.customizations || website.customizations,
                    generatedHtml: contentChanges.generatedHtml || website.generatedHtml,
                    templateName: contentChanges.templateName || website.templateName
                },
                createdBy: userId,
                changeDescription: options.changeDescription || 'New version created',
                parentVersionId: latestVersion ? latestVersion._id : null,
                isAutoSave: options.isAutoSave || false
            });

            // Track changes if comparing with previous version
            if (latestVersion) {
                newVersion.changes = this.calculateChanges(latestVersion.content, newVersion.content);
            }

            await newVersion.save();

            // Cleanup old draft versions if needed
            await this.cleanupOldDrafts(websiteId);

            return {
                version: newVersion.toObject(),
                message: "Version created successfully"
            };

        } catch (error) {
            console.error('Create version error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to create version: ${error.message}`);
        }
    }

    // Revert to specific version
    async revertToVersion(websiteId, versionId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const targetVersion = await WebsiteVersion.findOne({
                _id: versionId,
                websiteId: websiteId
            });

            if (!targetVersion) {
                throw new ApiError(404, "Version not found");
            }

            // Create new version based on target version
            const revertedVersion = await this.createVersion(
                websiteId,
                userId,
                targetVersion.content,
                {
                    versionType: 'draft',
                    changeDescription: `Reverted to version ${targetVersion.versionNumber}`,
                    isAutoSave: false
                }
            );

            // Update main website record
            Object.assign(website, targetVersion.content);
            website.lastModified = new Date();
            website.version += 1;
            
            await website.save();

            return {
                version: revertedVersion.version,
                targetVersion: targetVersion.versionNumber,
                message: `Successfully reverted to version ${targetVersion.versionNumber}`
            };

        } catch (error) {
            console.error('Revert version error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to revert to version: ${error.message}`);
        }
    }

    // Compare two versions
    async compareVersions(websiteId, versionId1, versionId2, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const [version1, version2] = await Promise.all([
                WebsiteVersion.findOne({ _id: versionId1, websiteId }),
                WebsiteVersion.findOne({ _id: versionId2, websiteId })
            ]);

            if (!version1 || !version2) {
                throw new ApiError(404, "One or both versions not found");
            }

            const changes = this.calculateChanges(version1.content, version2.content);

            return {
                version1: {
                    _id: version1._id,
                    versionNumber: version1.versionNumber,
                    versionType: version1.versionType,
                    createdAt: version1.createdAt
                },
                version2: {
                    _id: version2._id,
                    versionNumber: version2.versionNumber,
                    versionType: version2.versionType,
                    createdAt: version2.createdAt
                },
                changes: changes,
                summary: {
                    totalChanges: changes.length,
                    addedFields: changes.filter(c => c.changeType === 'added').length,
                    modifiedFields: changes.filter(c => c.changeType === 'modified').length,
                    removedFields: changes.filter(c => c.changeType === 'removed').length
                }
            };

        } catch (error) {
            console.error('Compare versions error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to compare versions: ${error.message}`);
        }
    }

    // Delete specific version
    async deleteVersion(websiteId, versionId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const version = await WebsiteVersion.findOne({
                _id: versionId,
                websiteId: websiteId
            });

            if (!version) {
                throw new ApiError(404, "Version not found");
            }

            // Don't allow deletion of published versions
            if (version.versionType === 'published') {
                throw new ApiError(400, "Cannot delete published version. Unpublish first.");
            }

            // Don't allow deletion of the only version
            const versionCount = await WebsiteVersion.countDocuments({ websiteId });
            if (versionCount <= 1) {
                throw new ApiError(400, "Cannot delete the only version");
            }

            await WebsiteVersion.deleteOne({ _id: versionId });

            return {
                message: "Version deleted successfully",
                deletedVersion: version.versionNumber
            };

        } catch (error) {
            console.error('Delete version error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to delete version: ${error.message}`);
        }
    }

    // Calculate changes between two content objects
    calculateChanges(oldContent, newContent) {
        const changes = [];
        const allKeys = new Set([...Object.keys(oldContent), ...Object.keys(newContent)]);

        for (const key of allKeys) {
            const oldValue = oldContent[key];
            const newValue = newContent[key];

            if (oldValue === undefined && newValue !== undefined) {
                changes.push({
                    field: key,
                    changeType: 'added',
                    newValue: newValue
                });
            } else if (oldValue !== undefined && newValue === undefined) {
                changes.push({
                    field: key,
                    changeType: 'removed',
                    oldValue: oldValue
                });
            } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    field: key,
                    changeType: 'modified',
                    oldValue: oldValue,
                    newValue: newValue
                });
            }
        }

        return changes;
    }

    // Cleanup old draft versions
    async cleanupOldDrafts(websiteId) {
        try {
            const draftVersions = await WebsiteVersion.find({
                websiteId: websiteId,
                versionType: 'draft'
            }).sort({ versionNumber: -1 });

            if (draftVersions.length > this.maxDraftVersions) {
                const versionsToDelete = draftVersions.slice(this.maxDraftVersions);
                const idsToDelete = versionsToDelete.map(v => v._id);
                
                await WebsiteVersion.deleteMany({ _id: { $in: idsToDelete } });
                
                console.log(`Cleaned up ${versionsToDelete.length} old draft versions for website ${websiteId}`);
            }
        } catch (error) {
            console.error('Cleanup old drafts error:', error);
        }
    }

    // Cleanup expired versions
    async cleanupExpiredVersions() {
        try {
            const result = await WebsiteVersion.deleteMany({
                versionType: 'draft',
                expiresAt: { $lt: new Date() }
            });

            console.log(`Cleaned up ${result.deletedCount} expired draft versions`);
            return result.deletedCount;
        } catch (error) {
            console.error('Cleanup expired versions error:', error);
            return 0;
        }
    }

    // Start cleanup timer
    startCleanupTimer() {
        setInterval(async () => {
            await this.cleanupExpiredVersions();
        }, this.cleanupInterval);
    }

    // Get version statistics
    async getVersionStats(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const stats = await WebsiteVersion.aggregate([
                { $match: { websiteId: websiteId } },
                {
                    $group: {
                        _id: '$versionType',
                        count: { $sum: 1 },
                        avgQualityScore: { $avg: '$qualityScore' },
                        latestVersion: { $max: '$versionNumber' }
                    }
                }
            ]);

            const totalVersions = await WebsiteVersion.countDocuments({ websiteId });
            const firstVersion = await WebsiteVersion.findOne({ websiteId }).sort({ versionNumber: 1 });
            const latestVersion = await WebsiteVersion.findOne({ websiteId }).sort({ versionNumber: -1 });

            return {
                totalVersions,
                versionTypes: stats.reduce((acc, stat) => {
                    acc[stat._id] = {
                        count: stat.count,
                        avgQualityScore: stat.avgQualityScore,
                        latestVersion: stat.latestVersion
                    };
                    return acc;
                }, {}),
                timeline: {
                    firstCreated: firstVersion ? firstVersion.createdAt : null,
                    lastModified: latestVersion ? latestVersion.createdAt : null,
                    daysSinceCreation: firstVersion ? Math.floor((Date.now() - firstVersion.createdAt) / (1000 * 60 * 60 * 24)) : 0
                }
            };

        } catch (error) {
            console.error('Get version stats error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to retrieve version statistics: ${error.message}`);
        }
    }

    // Clean up old versions with options
    async cleanupOldVersions(websiteId, userId, options = {}) {
        try {
            const { keepCount = 5, type = 'draft' } = options;

            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const query = { websiteId: websiteId };
            if (type !== 'all') {
                query.versionType = type;
            }

            const versions = await WebsiteVersion.find(query)
                .sort({ versionNumber: -1 })
                .skip(keepCount);

            if (versions.length === 0) {
                return {
                    message: "No old versions to cleanup",
                    deletedCount: 0
                };
            }

            const idsToDelete = versions.map(v => v._id);
            const result = await WebsiteVersion.deleteMany({ _id: { $in: idsToDelete } });

            return {
                message: `Cleaned up ${result.deletedCount} old versions`,
                deletedCount: result.deletedCount,
                keepCount: keepCount
            };

        } catch (error) {
            console.error('Cleanup old versions error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to cleanup old versions: ${error.message}`);
        }
    }

    // Get version diff (changes made in specific version)
    async getVersionDiff(websiteId, versionId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const version = await WebsiteVersion.findOne({
                _id: versionId,
                websiteId: websiteId
            });

            if (!version) {
                throw new ApiError(404, "Version not found");
            }

            // Get parent version to compare against
            const parentVersion = version.parentVersionId ? 
                await WebsiteVersion.findById(version.parentVersionId) : null;

            if (!parentVersion) {
                return {
                    version: {
                        versionNumber: version.versionNumber,
                        versionType: version.versionType,
                        createdAt: version.createdAt
                    },
                    changes: version.changes || [],
                    message: "This is the first version, no diff available"
                };
            }

            const changes = this.calculateChanges(parentVersion.content, version.content);

            return {
                version: {
                    versionNumber: version.versionNumber,
                    versionType: version.versionType,
                    createdAt: version.createdAt
                },
                parentVersion: {
                    versionNumber: parentVersion.versionNumber,
                    versionType: parentVersion.versionType,
                    createdAt: parentVersion.createdAt
                },
                changes: changes,
                summary: {
                    totalChanges: changes.length,
                    addedFields: changes.filter(c => c.changeType === 'added').length,
                    modifiedFields: changes.filter(c => c.changeType === 'modified').length,
                    removedFields: changes.filter(c => c.changeType === 'removed').length
                }
            };

        } catch (error) {
            console.error('Get version diff error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to get version diff: ${error.message}`);
        }
    }

    // Create version from existing content
    async createVersionFromContent(websiteId, userId, content, options = {}) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            return await this.createVersion(websiteId, userId, content, options);

        } catch (error) {
            console.error('Create version from content error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to create version from content: ${error.message}`);
        }
    }

    // Revert to version with options
    async revertToVersion(websiteId, versionId, userId, options = {}) {
        try {
            const { createNewVersion = true } = options;

            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const targetVersion = await WebsiteVersion.findOne({
                _id: versionId,
                websiteId: websiteId
            });

            if (!targetVersion) {
                throw new ApiError(404, "Version not found");
            }

            if (createNewVersion) {
                // Create new version based on target version
                const revertedVersion = await this.createVersion(
                    websiteId,
                    userId,
                    targetVersion.content,
                    {
                        versionType: 'draft',
                        changeDescription: `Reverted to version ${targetVersion.versionNumber}`,
                        isAutoSave: false
                    }
                );

                // Update main website record
                Object.assign(website, targetVersion.content);
                website.lastModified = new Date();
                website.version += 1;
                
                await website.save();

                return {
                    version: revertedVersion.version,
                    targetVersion: targetVersion.versionNumber,
                    message: `Successfully reverted to version ${targetVersion.versionNumber}`
                };
            } else {
                // Just update the main website record
                Object.assign(website, targetVersion.content);
                website.lastModified = new Date();
                website.version += 1;
                
                await website.save();

                return {
                    website: website.toObject(),
                    targetVersion: targetVersion.versionNumber,
                    message: `Successfully reverted to version ${targetVersion.versionNumber} without creating new version`
                };
            }

        } catch (error) {
            console.error('Revert version error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to revert to version: ${error.message}`);
        }
    }

    // Delete version with force option
    async deleteVersion(websiteId, versionId, userId, options = {}) {
        try {
            const { force = false } = options;

            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const version = await WebsiteVersion.findOne({
                _id: versionId,
                websiteId: websiteId
            });

            if (!version) {
                throw new ApiError(404, "Version not found");
            }

            // Don't allow deletion of published versions unless forced
            if (version.versionType === 'published' && !force) {
                throw new ApiError(400, "Cannot delete published version. Use force option or unpublish first.");
            }

            // Don't allow deletion of the only version unless forced
            const versionCount = await WebsiteVersion.countDocuments({ websiteId });
            if (versionCount <= 1 && !force) {
                throw new ApiError(400, "Cannot delete the only version. Use force option to override.");
            }

            await WebsiteVersion.deleteOne({ _id: versionId });

            return {
                message: "Version deleted successfully",
                deletedVersion: version.versionNumber,
                versionType: version.versionType
            };

        } catch (error) {
            console.error('Delete version error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to delete version: ${error.message}`);
        }
    }

    // Get version history with enhanced options
    async getVersionHistory(websiteId, userId, options = {}) {
        try {
            const { 
                limit = 10, 
                offset = 0, 
                type = 'all',
                includeContent = false,
                sortBy = 'versionNumber',
                sortOrder = 'desc'
            } = options;

            // Verify user owns the website
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const query = { websiteId };
            if (type !== 'all') {
                query.versionType = type;
            }

            let selectFields = '-content.generatedHtml'; // Exclude large HTML by default
            if (!includeContent) {
                selectFields = '-content'; // Exclude all content if not requested
            }

            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const versions = await WebsiteVersion.find(query)
                .sort(sortOptions)
                .skip(offset)
                .limit(limit)
                .populate('createdBy', 'personalInfo.firstName personalInfo.lastName personalInfo.professionalEmail')
                .select(selectFields);

            const totalCount = await WebsiteVersion.countDocuments(query);

            return {
                versions: versions,
                pagination: {
                    total: totalCount,
                    limit,
                    offset,
                    hasMore: (offset + limit) < totalCount
                },
                summary: {
                    totalVersions: totalCount,
                    publishedVersions: await WebsiteVersion.countDocuments({ websiteId, versionType: 'published' }),
                    draftVersions: await WebsiteVersion.countDocuments({ websiteId, versionType: 'draft' }),
                    archivedVersions: await WebsiteVersion.countDocuments({ websiteId, versionType: 'archived' })
                }
            };

        } catch (error) {
            console.error('Get version history error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to retrieve version history: ${error.message}`);
        }
    }
}

export default new VersionService();