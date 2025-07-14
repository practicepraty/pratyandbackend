// src/services/websiteService.js
import { Website, GenerationHistory } from "../models/website.models.js";
import WebsiteVersion from "../models/WebsiteVersion.js";
import { ApiError } from "../utils/apierror.js";
import { generatePublicUrl } from "../utils/urlGenerator.js";
import loggingService from "./loggingService.js";
import { PreviewGenerator } from "./previewGenerator.js";

class WebsiteService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.previewGenerator = new PreviewGenerator();
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

    // Enhanced auto-save functionality
    async autoSaveContent(websiteId, userId, changes, options = {}) {
        try {
            const { sectionId, fieldId, isMinorChange = true } = options;
            
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // Create auto-save record
            const autoSaveData = {
                content: changes,
                timestamp: new Date(),
                isAutoSave: true,
                userId: userId
            };

            // Add to content history
            const historyEntry = {
                timestamp: new Date(),
                changes: changes,
                userId: userId,
                action: 'auto_save',
                sectionId: sectionId,
                fieldId: fieldId,
                previousValue: this.extractCurrentValue(website, sectionId, fieldId),
                newValue: changes
            };

            website.contentHistory.push(historyEntry);
            website.autoSaveData = autoSaveData;

            // Apply changes to website content if not just a draft
            if (!isMinorChange) {
                this.applyChangesToWebsite(website, changes, sectionId, fieldId);
            }

            await website.save();

            // Log auto-save
            loggingService.logAppEvent('info', 'Content auto-saved', {
                websiteId,
                userId,
                sectionId,
                fieldId,
                changesSize: JSON.stringify(changes).length
            });

            return {
                success: true,
                autoSavedAt: autoSaveData.timestamp,
                historyId: historyEntry._id,
                message: 'Content auto-saved successfully'
            };

        } catch (error) {
            console.error('Auto-save error:', error);
            // Log error but don't throw - auto-save should be non-blocking
            loggingService.logError('Auto-save failed', error, { websiteId, userId });
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Undo last change
    async undoChange(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            if (!website.contentHistory || website.contentHistory.length === 0) {
                throw new ApiError(400, "No changes to undo");
            }

            // Find the last non-undo action
            const historyIndex = website.contentHistory.findLastIndex(
                entry => entry.action !== 'undo' && entry.action !== 'redo'
            );

            if (historyIndex === -1) {
                throw new ApiError(400, "No changes to undo");
            }

            const lastChange = website.contentHistory[historyIndex];
            
            // Restore previous value
            if (lastChange.sectionId && lastChange.fieldId) {
                this.restoreFieldValue(website, lastChange.sectionId, lastChange.fieldId, lastChange.previousValue);
            }

            // Add undo action to history
            const undoEntry = {
                timestamp: new Date(),
                changes: { undoTarget: lastChange._id },
                userId: userId,
                action: 'undo',
                sectionId: lastChange.sectionId,
                fieldId: lastChange.fieldId,
                previousValue: lastChange.newValue,
                newValue: lastChange.previousValue
            };

            website.contentHistory.push(undoEntry);
            await website.save();

            // Clear cache
            const cacheKey = `website:${websiteId}:${userId}`;
            this.cache.delete(cacheKey);

            return {
                success: true,
                undoneChange: lastChange,
                currentContent: this.formatSectionForEditing(
                    this.getSectionData(website, lastChange.sectionId), 
                    lastChange.sectionId
                ),
                message: 'Change undone successfully'
            };

        } catch (error) {
            console.error('Undo change error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to undo change: ${error.message}`);
        }
    }

    // Redo last undone change
    async redoChange(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            if (!website.contentHistory || website.contentHistory.length === 0) {
                throw new ApiError(400, "No changes to redo");
            }

            // Find the last undo action
            const lastUndoIndex = website.contentHistory.findLastIndex(
                entry => entry.action === 'undo'
            );

            if (lastUndoIndex === -1) {
                throw new ApiError(400, "No changes to redo");
            }

            const lastUndo = website.contentHistory[lastUndoIndex];
            
            // Restore the undone value
            if (lastUndo.sectionId && lastUndo.fieldId) {
                this.restoreFieldValue(website, lastUndo.sectionId, lastUndo.fieldId, lastUndo.previousValue);
            }

            // Add redo action to history
            const redoEntry = {
                timestamp: new Date(),
                changes: { redoTarget: lastUndo._id },
                userId: userId,
                action: 'redo',
                sectionId: lastUndo.sectionId,
                fieldId: lastUndo.fieldId,
                previousValue: lastUndo.newValue,
                newValue: lastUndo.previousValue
            };

            website.contentHistory.push(redoEntry);
            await website.save();

            // Clear cache
            const cacheKey = `website:${websiteId}:${userId}`;
            this.cache.delete(cacheKey);

            return {
                success: true,
                redoneChange: lastUndo,
                currentContent: this.formatSectionForEditing(
                    this.getSectionData(website, lastUndo.sectionId), 
                    lastUndo.sectionId
                ),
                message: 'Change redone successfully'
            };

        } catch (error) {
            console.error('Redo change error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to redo change: ${error.message}`);
        }
    }

    // Get content history
    async getContentHistory(websiteId, userId, options = {}) {
        try {
            const { limit = 20, sectionId, actionType } = options;
            
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            }).select('contentHistory');

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            let history = website.contentHistory || [];

            // Filter by section if specified
            if (sectionId) {
                history = history.filter(entry => entry.sectionId === sectionId);
            }

            // Filter by action type if specified
            if (actionType) {
                history = history.filter(entry => entry.action === actionType);
            }

            // Sort by timestamp (newest first) and limit
            history = history
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);

            return {
                success: true,
                history: history,
                totalCount: website.contentHistory.length,
                filteredCount: history.length
            };

        } catch (error) {
            console.error('Get content history error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to get content history: ${error.message}`);
        }
    }

    // Helper methods for history management
    extractCurrentValue(website, sectionId, fieldId) {
        if (!sectionId || !fieldId) return null;
        
        const section = this.getSectionData(website, sectionId);
        if (!section) return null;
        
        return fieldId.split('.').reduce((obj, key) => obj && obj[key], section);
    }

    applyChangesToWebsite(website, changes, sectionId, fieldId) {
        if (!sectionId) {
            // Apply changes to entire website
            Object.assign(website, changes);
            return;
        }

        const section = this.getSectionData(website, sectionId);
        if (!section) return;

        if (!fieldId) {
            // Apply changes to entire section
            Object.assign(section, changes);
        } else {
            // Apply changes to specific field
            const keys = fieldId.split('.');
            let target = section;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!target[keys[i]]) target[keys[i]] = {};
                target = target[keys[i]];
            }
            
            target[keys[keys.length - 1]] = changes;
        }
    }

    restoreFieldValue(website, sectionId, fieldId, value) {
        if (!sectionId || !fieldId) return;
        
        const section = this.getSectionData(website, sectionId);
        if (!section) return;
        
        const keys = fieldId.split('.');
        let target = section;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]]) target[keys[i]] = {};
            target = target[keys[i]];
        }
        
        target[keys[keys.length - 1]] = value;
    }

    getSectionData(website, sectionId) {
        const sectionMap = {
            'hero': website.heroSection,
            'about': website.aboutSection,
            'services': website.services,
            'contact': website.contactInfo,
            'seo': website.seoMeta,
            'customizations': website.customizations,
            'header': website.content?.header,
            'footer': website.content?.footer
        };
        
        return sectionMap[sectionId];
    }

    // Legacy auto-save method for backward compatibility
    async autoSave(websiteId, userId, contentChanges) {
        return this.autoSaveContent(websiteId, userId, contentChanges, { isMinorChange: true });
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        this.previewGenerator.clearCache();
    }

    // Get website data for frontend preview with device switching support
    async getPreviewData(websiteId, userId, options = {}) {
        try {
            const { deviceType = 'desktop', zoom = 100, forceRegenerate = false } = options;
            
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // Check preview cache
            const cacheKey = `preview:${websiteId}:${deviceType}:${zoom}`;
            if (!forceRegenerate && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.data;
                }
            }

            // Transform website data for PreviewGenerator
            const websiteData = {
                websiteTitle: website.websiteTitle,
                tagline: website.tagline,
                specialty: website.specialty,
                templateName: website.templateName,
                logo: website.logo,
                ogImage: website.ogImage,
                seoMeta: website.seoMeta,
                heroSection: website.heroSection,
                aboutSection: website.aboutSection,
                services: website.services || [],
                contactInfo: website.contactInfo
            };

            // Transform customizations for PreviewGenerator
            const customizations = {
                colors: website.customizations?.colorScheme || {},
                fonts: website.customizations?.typography || {},
                layout: website.customizations?.layout || {},
                features: website.customizations?.features || {}
            };

            // Generate preview using PreviewGenerator
            const previewResult = await this.previewGenerator.generatePreview(websiteData, customizations);
            
            // Format content for frontend editing
            const formattedContent = this.formatContentForFrontend(website);
            
            // Get device-specific preview
            let devicePreview;
            switch (deviceType) {
                case 'mobile':
                    devicePreview = previewResult.responsive.mobile;
                    break;
                case 'tablet':
                    devicePreview = previewResult.responsive.tablet;
                    break;
                case 'desktop':
                default:
                    devicePreview = previewResult.responsive.desktop;
                    break;
            }

            const result = {
                websiteId: website._id,
                html: devicePreview.html,
                css: devicePreview.css,
                content: formattedContent,
                styling: {
                    primaryColor: customizations.colors.primary || '#2563eb',
                    fontFamily: customizations.fonts.bodyFont || 'Inter',
                    customCSS: website.customizations?.customCSS || '',
                    ...website.customizations
                },
                metadata: {
                    template: website.templateName,
                    specialty: website.specialty,
                    lastUpdated: website.updatedAt || website.lastModified,
                    status: website.status,
                    qualityScore: website.qualityScore,
                    deviceType: deviceType,
                    zoom: zoom,
                    viewport: devicePreview.viewport,
                    breakpoint: devicePreview.breakpoint
                },
                performance: previewResult.performance,
                accessibility: previewResult.accessibility
            };

            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error('Get preview data error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to get preview data: ${error.message}`);
        }
    }

    // Get specific content section
    async getContentSection(websiteId, userId, sectionId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            let section = null;
            
            // Map section IDs to website fields
            switch (sectionId) {
                case 'hero':
                    section = website.heroSection;
                    break;
                case 'about':
                    section = website.aboutSection;
                    break;
                case 'services':
                    section = website.services;
                    break;
                case 'contact':
                    section = website.contactInfo;
                    break;
                case 'seo':
                    section = website.seoMeta;
                    break;
                case 'customizations':
                    section = website.customizations;
                    break;
                default:
                    throw new ApiError(400, `Invalid section ID: ${sectionId}`);
            }

            if (!section) {
                throw new ApiError(404, `Section '${sectionId}' not found`);
            }

            return {
                sectionId,
                content: this.formatSectionForEditing(section, sectionId),
                metadata: { 
                    lastModified: website.lastModified,
                    websiteTitle: website.websiteTitle,
                    specialty: website.specialty
                }
            };

        } catch (error) {
            console.error('Get content section error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to get content section: ${error.message}`);
        }
    }

    // Update content section
    async updateContentSection(websiteId, userId, sectionId, contentData) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // Update the appropriate section
            switch (sectionId) {
                case 'hero':
                    website.heroSection = { ...website.heroSection, ...contentData };
                    break;
                case 'about':
                    website.aboutSection = { ...website.aboutSection, ...contentData };
                    break;
                case 'services':
                    if (Array.isArray(contentData)) {
                        website.services = contentData;
                    } else {
                        website.services = { ...website.services, ...contentData };
                    }
                    break;
                case 'contact':
                    website.contactInfo = { ...website.contactInfo, ...contentData };
                    break;
                case 'seo':
                    website.seoMeta = { ...website.seoMeta, ...contentData };
                    break;
                case 'customizations':
                    website.customizations = { ...website.customizations, ...contentData };
                    break;
                default:
                    throw new ApiError(400, `Invalid section ID: ${sectionId}`);
            }

            website.lastModified = new Date();
            website.version += 1;
            
            // Update quality score
            await website.updateQualityScore();
            
            await website.save();

            // Clear cache
            const cacheKey = `website:${websiteId}:${userId}`;
            this.cache.delete(cacheKey);

            return {
                sectionId,
                content: this.formatSectionForEditing(website[this.getSectionFieldName(sectionId)], sectionId),
                success: true,
                metadata: {
                    lastModified: website.lastModified,
                    version: website.version,
                    qualityScore: website.qualityScore
                }
            };

        } catch (error) {
            console.error('Update content section error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to update content section: ${error.message}`);
        }
    }

    // Generate complete HTML for preview
    generateCompleteHTML(website, options = {}) {
        const { deviceType = 'desktop', zoom = 100 } = options;
        
        // Basic HTML template - in production, use your template system
        const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${website.seoMeta?.title || website.websiteTitle || 'Medical Practice'}</title>
    <meta name="description" content="${website.seoMeta?.description || website.tagline || ''}">
    <style>${this.generateCSS(website.customizations, options)}</style>
</head>
<body>
    <header>
        <h1>${website.websiteTitle || 'Medical Practice'}</h1>
        ${website.tagline ? `<p class="tagline">${website.tagline}</p>` : ''}
    </header>
    
    <main>
        ${this.generateHeroHTML(website.heroSection)}
        ${this.generateAboutHTML(website.aboutSection)}
        ${this.generateServicesHTML(website.services)}
        ${this.generateContactHTML(website.contactInfo)}
    </main>
    
    <footer>
        <p>&copy; ${new Date().getFullYear()} ${website.websiteTitle || 'Medical Practice'}. All rights reserved.</p>
    </footer>
</body>
</html>`;

        return template;
    }

    // Format content for frontend editing
    formatContentForFrontend(website) {
        const formatted = {};
        
        const sections = {
            hero: website.heroSection,
            about: website.aboutSection,
            services: website.services,
            contact: website.contactInfo,
            seo: website.seoMeta,
            customizations: website.customizations
        };
        
        for (const [key, value] of Object.entries(sections)) {
            if (value) {
                formatted[key] = this.formatSectionForEditing(value, key);
            }
        }
        
        return formatted;
    }

    // Format section for editing interface
    formatSectionForEditing(section, sectionType) {
        if (!section) return null;
        
        const formatted = {};
        
        if (Array.isArray(section)) {
            // Handle services array
            return section.map(item => this.formatObjectForEditing(item));
        }
        
        for (const [key, value] of Object.entries(section)) {
            if (typeof value === 'string') {
                formatted[key] = {
                    text: value,
                    editable: true,
                    type: this.getFieldType(key),
                    validation: this.getValidationRules(key, sectionType)
                };
            } else if (typeof value === 'number') {
                formatted[key] = {
                    value: value,
                    editable: true,
                    type: 'number',
                    validation: this.getValidationRules(key, sectionType)
                };
            } else if (typeof value === 'boolean') {
                formatted[key] = {
                    value: value,
                    editable: true,
                    type: 'boolean',
                    validation: {}
                };
            } else if (typeof value === 'object' && value !== null) {
                formatted[key] = this.formatObjectForEditing(value);
            } else {
                formatted[key] = value;
            }
        }
        
        return formatted;
    }

    // Format object for editing
    formatObjectForEditing(obj) {
        const formatted = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                formatted[key] = {
                    text: value,
                    editable: true,
                    type: this.getFieldType(key),
                    validation: this.getValidationRules(key)
                };
            } else {
                formatted[key] = value;
            }
        }
        
        return formatted;
    }

    // Get field type for UI
    getFieldType(fieldKey) {
        const typeMap = {
            email: 'email',
            phone: 'tel',
            website: 'url',
            address: 'textarea',
            content: 'textarea',
            description: 'textarea',
            headline: 'text',
            title: 'text',
            name: 'text'
        };
        
        return typeMap[fieldKey] || 'text';
    }

    // Get validation rules for fields
    getValidationRules(fieldKey, sectionType = '') {
        const rules = {
            title: { maxLength: 100, required: true },
            headline: { maxLength: 200, required: true },
            subheadline: { maxLength: 300 },
            description: { maxLength: 500 },
            content: { maxLength: 2000 },
            email: { 
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
                required: true,
                message: 'Please enter a valid email address'
            },
            phone: { 
                pattern: /^[\d\s\-\+\(\)]+$/, 
                required: true,
                message: 'Please enter a valid phone number'
            },
            name: { maxLength: 100, required: true },
            address: { maxLength: 200, required: true },
            ctaText: { maxLength: 50 },
            keywords: { maxLength: 200 }
        };
        
        return rules[fieldKey] || {};
    }

    // Get section field name
    getSectionFieldName(sectionId) {
        const fieldMap = {
            'hero': 'heroSection',
            'about': 'aboutSection',
            'services': 'services',
            'contact': 'contactInfo',
            'seo': 'seoMeta',
            'customizations': 'customizations'
        };
        
        return fieldMap[sectionId] || sectionId;
    }

    // Generate CSS for preview
    generateCSS(styling, options) {
        const { deviceType = 'desktop', zoom = 100 } = options;
        
        const colors = styling?.colorScheme || {};
        const typography = styling?.typography || {};
        
        let css = `
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
                font-family: ${typography.bodyFont || 'Inter, sans-serif'};
                color: ${colors.primary || '#333'};
                line-height: 1.6;
                background-color: ${colors.background || '#ffffff'};
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            header { background: ${colors.primary || '#2563eb'}; color: white; padding: 20px 0; text-align: center; }
            .tagline { font-size: 1.1em; margin-top: 10px; opacity: 0.9; }
            .hero { padding: 60px 0; text-align: center; background: ${colors.secondary || '#f8fafc'}; }
            .hero h2 { font-size: 2.5em; margin-bottom: 20px; color: ${colors.primary || '#2563eb'}; }
            .section { padding: 40px 0; }
            .services { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .service { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .contact { background: ${colors.accent || '#10b981'}; color: white; padding: 40px 0; }
            footer { background: #1f2937; color: white; padding: 20px 0; text-align: center; }
        `;
        
        if (deviceType === 'mobile') {
            css += `
                @media (max-width: 767px) { 
                    .container { padding: 10px; }
                    .hero h2 { font-size: 1.8em; }
                    .services { grid-template-columns: 1fr; }
                }
            `;
        }
        
        if (zoom !== 100) {
            css += `body { zoom: ${zoom / 100}; }`;
        }
        
        return css;
    }

    // Generate HTML sections
    generateHeroHTML(heroSection) {
        if (!heroSection) return '';
        
        return `
            <section class="hero">
                <div class="container">
                    <h2>${heroSection.headline || ''}</h2>
                    ${heroSection.subheadline ? `<p>${heroSection.subheadline}</p>` : ''}
                    ${heroSection.ctaText ? `<button style="margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">${heroSection.ctaText}</button>` : ''}
                </div>
            </section>
        `;
    }

    generateAboutHTML(aboutSection) {
        if (!aboutSection) return '';
        
        return `
            <section class="section">
                <div class="container">
                    <h2>${aboutSection.title || 'About Us'}</h2>
                    <p>${aboutSection.content || ''}</p>
                    ${aboutSection.highlights && aboutSection.highlights.length > 0 ? 
                        `<ul style="margin-top: 20px;">${aboutSection.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
                </div>
            </section>
        `;
    }

    generateServicesHTML(services) {
        if (!services || !Array.isArray(services) || services.length === 0) return '';
        
        return `
            <section class="section">
                <div class="container">
                    <h2>Our Services</h2>
                    <div class="services">
                        ${services.map(service => `
                            <div class="service">
                                <h3>${service.name || ''}</h3>
                                <p>${service.description || ''}</p>
                                ${service.price ? `<p style="font-weight: bold; margin-top: 10px;">$${service.price}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;
    }

    generateContactHTML(contactInfo) {
        if (!contactInfo) return '';
        
        return `
            <section class="contact">
                <div class="container">
                    <h2>Contact Us</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
                        ${contactInfo.phone ? `<p><strong>Phone:</strong> ${contactInfo.phone}</p>` : ''}
                        ${contactInfo.email ? `<p><strong>Email:</strong> ${contactInfo.email}</p>` : ''}
                        ${contactInfo.address ? `<p><strong>Address:</strong> ${contactInfo.address}</p>` : ''}
                        ${contactInfo.hours ? `<p><strong>Hours:</strong> ${contactInfo.hours}</p>` : ''}
                    </div>
                </div>
            </section>
        `;
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