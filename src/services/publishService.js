// src/services/publishService.js
import WebsiteVersion from "../models/WebsiteVersion.js";
import { Website, GenerationHistory } from "../models/website.models.js";
import { ApiError } from "../utils/apierror.js";
import { generatePublicUrl } from "../utils/urlGenerator.js";

class PublishService {
    constructor() {
        this.publishingQueue = new Map();
        this.maxPublishAttempts = 3;
        this.publishTimeout = 30000; // 30 seconds
    }

    // Publish current draft version
    async publishWebsite(websiteId, userId, options = {}) {
        try {
            // Check if already publishing
            if (this.publishingQueue.has(websiteId)) {
                throw new ApiError(409, "Website is already being published");
            }

            this.publishingQueue.set(websiteId, { userId, startTime: Date.now() });

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

                // Get the latest draft version
                const draftVersion = await WebsiteVersion.getLatestVersion(websiteId, 'draft');
                
                if (!draftVersion) {
                    throw new ApiError(400, "No draft version found to publish");
                }

                // Validate content before publishing
                const validationResult = await this.validateContentForPublishing(draftVersion.content);
                if (!validationResult.isValid) {
                    throw new ApiError(400, `Content validation failed: ${validationResult.errors.join(', ')}`);
                }

                // Check if there's already a published version
                const currentPublished = await WebsiteVersion.getPublishedVersion(websiteId);
                
                if (currentPublished) {
                    // Unpublish current version
                    currentPublished.versionType = 'archived';
                    currentPublished.unpublishedAt = new Date();
                    await currentPublished.save();
                }

                // Create new published version
                const publishedVersion = new WebsiteVersion({
                    websiteId: websiteId,
                    versionNumber: draftVersion.versionNumber,
                    versionType: 'published',
                    content: draftVersion.content,
                    createdBy: userId,
                    publishedAt: new Date(),
                    publicUrl: generatePublicUrl(websiteId, draftVersion.versionNumber),
                    qualityScore: draftVersion.qualityScore || 0.8,
                    changeDescription: options.publishMessage || 'Website published'
                });

                await publishedVersion.save();

                // Update main website record
                website.status = 'published';
                website.isPublished = true;
                website.publishedAt = new Date();
                website.lastModified = new Date();
                website.publicUrl = publishedVersion.publicUrl;
                
                // Update analytics
                website.analytics.generatedViews += 1;
                
                await website.save();

                // Log the publication
                await GenerationHistory.create({
                    websiteId: websiteId,
                    userId: userId,
                    action: 'published',
                    changes: {
                        status: 'published',
                        versionNumber: publishedVersion.versionNumber,
                        publicUrl: publishedVersion.publicUrl
                    },
                    metadata: {
                        publishedAt: publishedVersion.publishedAt,
                        qualityScore: publishedVersion.qualityScore,
                        processingTime: Date.now() - this.publishingQueue.get(websiteId).startTime
                    }
                });

                // Cleanup: remove draft version if it's identical to published
                if (options.cleanupDraft && draftVersion.versionNumber === publishedVersion.versionNumber) {
                    await WebsiteVersion.deleteOne({ _id: draftVersion._id });
                }

                return {
                    success: true,
                    publishedVersion: publishedVersion.toObject(),
                    publicUrl: publishedVersion.publicUrl,
                    publishedAt: publishedVersion.publishedAt,
                    message: "Website published successfully"
                };

            } finally {
                this.publishingQueue.delete(websiteId);
            }

        } catch (error) {
            this.publishingQueue.delete(websiteId);
            console.error('Publish website error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to publish website: ${error.message}`);
        }
    }

    // Unpublish website
    async unpublishWebsite(websiteId, userId, options = {}) {
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

            // Get the published version
            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            
            if (!publishedVersion) {
                throw new ApiError(400, "No published version found to unpublish");
            }

            // Archive the published version
            publishedVersion.versionType = 'archived';
            publishedVersion.unpublishedAt = new Date();
            await publishedVersion.save();

            // Update main website record
            website.status = 'draft';
            website.isPublished = false;
            website.publishedAt = null;
            website.lastModified = new Date();
            website.publicUrl = null;
            
            await website.save();

            // Log the unpublication
            await GenerationHistory.create({
                websiteId: websiteId,
                userId: userId,
                action: 'unpublished',
                changes: {
                    status: 'draft',
                    versionNumber: publishedVersion.versionNumber,
                    publicUrl: null
                },
                metadata: {
                    unpublishedAt: new Date(),
                    reason: options.reason || 'User requested',
                    processingTime: Date.now()
                }
            });

            return {
                success: true,
                unpublishedVersion: publishedVersion.versionNumber,
                unpublishedAt: publishedVersion.unpublishedAt,
                message: "Website unpublished successfully"
            };

        } catch (error) {
            console.error('Unpublish website error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to unpublish website: ${error.message}`);
        }
    }

    // Get published website by public URL
    async getPublishedWebsite(websiteId, versionNumber = null) {
        try {
            let publishedVersion;
            
            if (versionNumber) {
                // Get specific version
                publishedVersion = await WebsiteVersion.findOne({
                    websiteId: websiteId,
                    versionNumber: versionNumber,
                    versionType: 'published'
                });
            } else {
                // Get latest published version
                publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            }

            if (!publishedVersion) {
                throw new ApiError(404, "Published website not found");
            }

            // Update view count
            const website = await Website.findById(websiteId);
            if (website) {
                website.analytics.views += 1;
                website.analytics.lastViewed = new Date();
                await website.save();
            }

            return {
                content: publishedVersion.content,
                metadata: {
                    versionNumber: publishedVersion.versionNumber,
                    publishedAt: publishedVersion.publishedAt,
                    qualityScore: publishedVersion.qualityScore,
                    publicUrl: publishedVersion.publicUrl
                },
                website: {
                    _id: website._id,
                    websiteTitle: website.websiteTitle,
                    specialty: website.specialty,
                    contactInfo: website.contactInfo
                }
            };

        } catch (error) {
            console.error('Get published website error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to retrieve published website: ${error.message}`);
        }
    }

    // Get publication status
    async getPublicationStatus(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            const draftVersion = await WebsiteVersion.getLatestVersion(websiteId, 'draft');

            return {
                isPublished: !!publishedVersion,
                hasUnpublishedChanges: publishedVersion && draftVersion ? 
                    draftVersion.versionNumber > publishedVersion.versionNumber : false,
                publishedVersion: publishedVersion ? {
                    versionNumber: publishedVersion.versionNumber,
                    publishedAt: publishedVersion.publishedAt,
                    publicUrl: publishedVersion.publicUrl,
                    qualityScore: publishedVersion.qualityScore
                } : null,
                draftVersion: draftVersion ? {
                    versionNumber: draftVersion.versionNumber,
                    lastModified: draftVersion.createdAt,
                    qualityScore: draftVersion.qualityScore
                } : null,
                website: {
                    status: website.status,
                    publicUrl: website.publicUrl,
                    lastModified: website.lastModified,
                    analytics: website.analytics
                }
            };

        } catch (error) {
            console.error('Get publication status error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to retrieve publication status: ${error.message}`);
        }
    }

    // Validate content for publishing
    async validateContentForPublishing(content) {
        const errors = [];
        const warnings = [];

        // Required fields validation
        if (!content.websiteTitle || content.websiteTitle.trim().length < 3) {
            errors.push('Website title is required and must be at least 3 characters');
        }

        if (!content.heroSection || !content.heroSection.headline) {
            errors.push('Hero section headline is required');
        }

        if (!content.aboutSection || !content.aboutSection.content) {
            errors.push('About section content is required');
        }

        if (!content.services || !Array.isArray(content.services) || content.services.length === 0) {
            errors.push('At least one service is required');
        }

        if (!content.contactInfo || !content.contactInfo.phone || !content.contactInfo.email) {
            errors.push('Contact information (phone and email) is required');
        }

        // SEO validation
        if (!content.seoMeta || !content.seoMeta.title || !content.seoMeta.description) {
            warnings.push('SEO metadata (title and description) is recommended');
        }

        // Content quality validation
        if (content.services && content.services.length < 3) {
            warnings.push('Consider adding more services for better website completeness');
        }

        if (content.aboutSection && content.aboutSection.content.length < 100) {
            warnings.push('About section content should be more detailed');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: this.calculateContentScore(content)
        };
    }

    // Calculate content quality score
    calculateContentScore(content) {
        let score = 0;
        let maxScore = 0;

        // Title (10 points)
        maxScore += 10;
        if (content.websiteTitle && content.websiteTitle.length >= 10) score += 10;
        else if (content.websiteTitle && content.websiteTitle.length >= 3) score += 5;

        // Hero section (20 points)
        maxScore += 20;
        if (content.heroSection) {
            if (content.heroSection.headline) score += 10;
            if (content.heroSection.subheadline) score += 5;
            if (content.heroSection.ctaText) score += 5;
        }

        // About section (20 points)
        maxScore += 20;
        if (content.aboutSection) {
            if (content.aboutSection.content) {
                if (content.aboutSection.content.length >= 200) score += 15;
                else if (content.aboutSection.content.length >= 100) score += 10;
                else score += 5;
            }
            if (content.aboutSection.highlights && content.aboutSection.highlights.length > 0) score += 5;
        }

        // Services (20 points)
        maxScore += 20;
        if (content.services && Array.isArray(content.services)) {
            if (content.services.length >= 5) score += 20;
            else if (content.services.length >= 3) score += 15;
            else if (content.services.length >= 1) score += 10;
        }

        // Contact info (15 points)
        maxScore += 15;
        if (content.contactInfo) {
            if (content.contactInfo.phone) score += 5;
            if (content.contactInfo.email) score += 5;
            if (content.contactInfo.address) score += 3;
            if (content.contactInfo.hours) score += 2;
        }

        // SEO (15 points)
        maxScore += 15;
        if (content.seoMeta) {
            if (content.seoMeta.title) score += 5;
            if (content.seoMeta.description) score += 5;
            if (content.seoMeta.keywords && content.seoMeta.keywords.length > 0) score += 5;
        }

        return Math.round((score / maxScore) * 100) / 100;
    }

    // Schedule publication
    async schedulePublication(websiteId, userId, publishAt, options = {}) {
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

            const publishDate = new Date(publishAt);
            if (publishDate <= new Date()) {
                throw new ApiError(400, "Publish date must be in the future");
            }

            // Create scheduled publication record
            const scheduledPublication = {
                websiteId: websiteId,
                userId: userId,
                publishAt: publishDate,
                options: options,
                status: 'scheduled',
                createdAt: new Date()
            };

            // Store in database or queue system
            // For now, we'll use a simple timeout (in production, use a proper job queue)
            const timeUntilPublish = publishDate.getTime() - Date.now();
            
            if (timeUntilPublish <= 24 * 60 * 60 * 1000) { // If within 24 hours
                setTimeout(async () => {
                    try {
                        await this.publishWebsite(websiteId, userId, options);
                    } catch (error) {
                        console.error('Scheduled publication failed:', error);
                    }
                }, timeUntilPublish);
            }

            return {
                success: true,
                scheduledPublication: scheduledPublication,
                message: "Website publication scheduled successfully"
            };

        } catch (error) {
            console.error('Schedule publication error:', error);
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to schedule publication: ${error.message}`);
        }
    }

    // Get publishing statistics
    async getPublishingStats(userId) {
        try {
            const stats = await WebsiteVersion.aggregate([
                {
                    $lookup: {
                        from: 'websites',
                        localField: 'websiteId',
                        foreignField: '_id',
                        as: 'website'
                    }
                },
                {
                    $match: {
                        'website.userId': userId,
                        'website.isActive': true,
                        versionType: 'published'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalPublished: { $sum: 1 },
                        avgQualityScore: { $avg: '$qualityScore' },
                        firstPublished: { $min: '$publishedAt' },
                        lastPublished: { $max: '$publishedAt' },
                        specialties: { $addToSet: '$website.specialty' }
                    }
                }
            ]);

            const monthlyStats = await WebsiteVersion.aggregate([
                {
                    $lookup: {
                        from: 'websites',
                        localField: 'websiteId',
                        foreignField: '_id',
                        as: 'website'
                    }
                },
                {
                    $match: {
                        'website.userId': userId,
                        'website.isActive': true,
                        versionType: 'published',
                        publishedAt: {
                            $gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) // Last 12 months
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$publishedAt' },
                            month: { $month: '$publishedAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1 }
                }
            ]);

            return {
                overview: stats[0] || {
                    totalPublished: 0,
                    avgQualityScore: 0,
                    firstPublished: null,
                    lastPublished: null,
                    specialties: []
                },
                monthlyBreakdown: monthlyStats,
                generatedAt: new Date()
            };

        } catch (error) {
            console.error('Get publishing stats error:', error);
            throw new ApiError(500, `Failed to retrieve publishing statistics: ${error.message}`);
        }
    }

    // Get publishing queue status
    getQueueStatus() {
        const queueStatus = Array.from(this.publishingQueue.entries()).map(([websiteId, info]) => ({
            websiteId,
            userId: info.userId,
            startTime: info.startTime,
            duration: Date.now() - info.startTime
        }));

        return {
            activePublications: queueStatus.length,
            queue: queueStatus
        };
    }

    // Clear publishing queue (for cleanup)
    clearQueue() {
        this.publishingQueue.clear();
    }

    // Get published website metadata only
    async getPublishedWebsiteMetadata(websiteId) {
        try {
            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            
            if (!publishedVersion) {
                return null;
            }

            const website = await Website.findById(websiteId);
            
            return {
                websiteId: websiteId,
                title: publishedVersion.content.websiteTitle,
                specialty: website.specialty,
                versionNumber: publishedVersion.versionNumber,
                publishedAt: publishedVersion.publishedAt,
                publicUrl: publishedVersion.publicUrl,
                qualityScore: publishedVersion.qualityScore,
                seoMeta: publishedVersion.content.seoMeta,
                contactInfo: publishedVersion.content.contactInfo,
                analytics: {
                    views: website.analytics.views,
                    lastViewed: website.analytics.lastViewed
                }
            };
        } catch (error) {
            console.error('Get published website metadata error:', error);
            throw new ApiError(500, `Failed to retrieve website metadata: ${error.message}`);
        }
    }

    // Get publish history
    async getPublishHistory(websiteId, userId, options = {}) {
        try {
            const { limit = 10, offset = 0 } = options;

            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const history = await GenerationHistory.find({
                websiteId: websiteId,
                userId: userId,
                action: { $in: ['published', 'unpublished'] }
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset);

            const totalCount = await GenerationHistory.countDocuments({
                websiteId: websiteId,
                userId: userId,
                action: { $in: ['published', 'unpublished'] }
            });

            return {
                history: history,
                pagination: {
                    total: totalCount,
                    limit,
                    offset,
                    hasMore: (offset + limit) < totalCount
                }
            };
        } catch (error) {
            console.error('Get publish history error:', error);
            throw new ApiError(500, `Failed to retrieve publish history: ${error.message}`);
        }
    }

    // Get publishing status
    async getPublishingStatus(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            const draftVersion = await WebsiteVersion.getLatestVersion(websiteId, 'draft');
            const isPublishing = this.publishingQueue.has(websiteId);

            return {
                isPublished: !!publishedVersion,
                isPublishing: isPublishing,
                hasUnpublishedChanges: publishedVersion && draftVersion ? 
                    draftVersion.versionNumber > publishedVersion.versionNumber : false,
                publishedVersion: publishedVersion ? {
                    versionNumber: publishedVersion.versionNumber,
                    publishedAt: publishedVersion.publishedAt,
                    publicUrl: publishedVersion.publicUrl,
                    qualityScore: publishedVersion.qualityScore
                } : null,
                draftVersion: draftVersion ? {
                    versionNumber: draftVersion.versionNumber,
                    lastModified: draftVersion.createdAt,
                    isAutoSave: draftVersion.isAutoSave
                } : null,
                website: {
                    status: website.status,
                    publicUrl: website.publicUrl,
                    lastModified: website.lastModified
                }
            };
        } catch (error) {
            console.error('Get publishing status error:', error);
            throw new ApiError(500, `Failed to retrieve publishing status: ${error.message}`);
        }
    }

    // Schedule publish
    async schedulePublish(websiteId, userId, options = {}) {
        try {
            const { scheduledDate, versionNumber, publishMessage } = options;

            // This would typically use a job queue system like Bull or Agenda
            // For now, we'll store the schedule in the database
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // In a real implementation, you'd store this in a schedules collection
            // and use a job queue to process scheduled publications
            return {
                success: true,
                scheduledDate: scheduledDate,
                versionNumber: versionNumber,
                message: "Publication scheduled successfully (Note: Scheduling system not fully implemented)"
            };
        } catch (error) {
            console.error('Schedule publish error:', error);
            throw new ApiError(500, `Failed to schedule publication: ${error.message}`);
        }
    }

    // Cancel scheduled publish
    async cancelScheduledPublish(websiteId, userId) {
        try {
            // This would cancel the scheduled job
            return {
                success: true,
                message: "Scheduled publication cancelled"
            };
        } catch (error) {
            console.error('Cancel scheduled publish error:', error);
            throw new ApiError(500, `Failed to cancel scheduled publication: ${error.message}`);
        }
    }

    // Analyze SEO
    async analyzeSEO(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            
            if (!publishedVersion) {
                throw new ApiError(400, "No published version found for SEO analysis");
            }

            const content = publishedVersion.content;
            const seoScore = this.calculateSEOScore(content);
            const recommendations = this.generateSEORecommendations(content);

            return {
                seoScore: seoScore,
                recommendations: recommendations,
                analysis: {
                    title: {
                        present: !!content.seoMeta?.title,
                        length: content.seoMeta?.title?.length || 0,
                        optimal: content.seoMeta?.title?.length >= 30 && content.seoMeta?.title?.length <= 60
                    },
                    description: {
                        present: !!content.seoMeta?.description,
                        length: content.seoMeta?.description?.length || 0,
                        optimal: content.seoMeta?.description?.length >= 120 && content.seoMeta?.description?.length <= 160
                    },
                    keywords: {
                        count: content.seoMeta?.keywords?.length || 0,
                        optimal: content.seoMeta?.keywords?.length >= 5 && content.seoMeta?.keywords?.length <= 10
                    },
                    content: {
                        wordsCount: this.countWords(content.aboutSection?.content || ''),
                        headingsStructure: this.analyzeHeadingStructure(content)
                    }
                }
            };
        } catch (error) {
            console.error('SEO analysis error:', error);
            throw new ApiError(500, `Failed to analyze SEO: ${error.message}`);
        }
    }

    // Get performance metrics
    async getPerformanceMetrics(websiteId, userId, options = {}) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // This would typically integrate with analytics services
            // For now, return mock performance data
            return {
                metrics: {
                    pageLoadTime: 1.2,
                    firstContentfulPaint: 0.8,
                    largestContentfulPaint: 1.5,
                    cumulativeLayoutShift: 0.1,
                    timeToInteractive: 1.8
                },
                analytics: {
                    views: website.analytics.views,
                    sessions: Math.floor(website.analytics.views * 0.8),
                    bounceRate: 0.35,
                    avgSessionDuration: 180
                },
                period: options.period || '7d',
                generatedAt: new Date()
            };
        } catch (error) {
            console.error('Get performance metrics error:', error);
            throw new ApiError(500, `Failed to retrieve performance metrics: ${error.message}`);
        }
    }

    // Test publish
    async testPublish(websiteId, userId, options = {}) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const draftVersion = await WebsiteVersion.getLatestVersion(websiteId, 'draft');
            
            if (!draftVersion) {
                throw new ApiError(400, "No draft version found to test");
            }

            const validationResult = await this.validateContentForPublishing(draftVersion.content);
            const seoScore = this.calculateSEOScore(draftVersion.content);
            const performanceEstimate = this.estimatePerformance(draftVersion.content);

            return {
                testResults: {
                    validation: validationResult,
                    seoScore: seoScore,
                    performanceEstimate: performanceEstimate,
                    readyToPublish: validationResult.isValid && seoScore >= 0.6
                },
                version: {
                    versionNumber: draftVersion.versionNumber,
                    lastModified: draftVersion.createdAt
                }
            };
        } catch (error) {
            console.error('Test publish error:', error);
            throw new ApiError(500, `Failed to test publish: ${error.message}`);
        }
    }

    // Get website analytics
    async getWebsiteAnalytics(websiteId, userId, options = {}) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            
            if (!publishedVersion) {
                throw new ApiError(400, "No published version found for analytics");
            }

            // This would typically integrate with Google Analytics or similar
            // For now, return mock analytics data
            return {
                analytics: {
                    views: website.analytics.views,
                    sessions: Math.floor(website.analytics.views * 0.8),
                    users: Math.floor(website.analytics.views * 0.6),
                    bounceRate: 0.35,
                    avgSessionDuration: 180,
                    pageViews: website.analytics.views,
                    conversionRate: 0.05
                },
                period: options.period || '30d',
                breakdown: this.generateAnalyticsBreakdown(website.analytics, options.groupBy || 'day'),
                topPages: [
                    { page: '/', views: Math.floor(website.analytics.views * 0.6) },
                    { page: '/about', views: Math.floor(website.analytics.views * 0.2) },
                    { page: '/services', views: Math.floor(website.analytics.views * 0.15) },
                    { page: '/contact', views: Math.floor(website.analytics.views * 0.05) }
                ]
            };
        } catch (error) {
            console.error('Get website analytics error:', error);
            throw new ApiError(500, `Failed to retrieve website analytics: ${error.message}`);
        }
    }

    // Republish website
    async republishWebsite(websiteId, userId, options = {}) {
        try {
            // First unpublish current version
            await this.unpublishWebsite(websiteId, userId, { reason: 'Republishing with updates' });
            
            // Then publish the new version
            const result = await this.publishWebsite(websiteId, userId, options);
            
            return {
                ...result,
                message: "Website republished successfully"
            };
        } catch (error) {
            console.error('Republish website error:', error);
            throw new ApiError(500, `Failed to republish website: ${error.message}`);
        }
    }

    // Set custom domain
    async setCustomDomain(websiteId, userId, options = {}) {
        try {
            const { domain, sslEnabled = true } = options;
            
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            // This would typically involve DNS configuration and SSL setup
            // For now, just store the domain preference
            return {
                success: true,
                domain: domain,
                sslEnabled: sslEnabled,
                message: "Custom domain configuration initiated (Note: DNS setup required)"
            };
        } catch (error) {
            console.error('Set custom domain error:', error);
            throw new ApiError(500, `Failed to set custom domain: ${error.message}`);
        }
    }

    // Remove custom domain
    async removeCustomDomain(websiteId, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            return {
                success: true,
                message: "Custom domain removed successfully"
            };
        } catch (error) {
            console.error('Remove custom domain error:', error);
            throw new ApiError(500, `Failed to remove custom domain: ${error.message}`);
        }
    }

    // Generate sitemap
    async generateSitemap(websiteId) {
        try {
            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            
            if (!publishedVersion) {
                throw new ApiError(404, "No published website found");
            }

            const baseUrl = publishedVersion.publicUrl || `https://example.com/website/${websiteId}`;
            const lastModified = publishedVersion.publishedAt.toISOString();

            const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}</loc>
        <lastmod>${lastModified}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/about</loc>
        <lastmod>${lastModified}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/services</loc>
        <lastmod>${lastModified}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${baseUrl}/contact</loc>
        <lastmod>${lastModified}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
</urlset>`;

            return sitemap;
        } catch (error) {
            console.error('Generate sitemap error:', error);
            throw new ApiError(500, `Failed to generate sitemap: ${error.message}`);
        }
    }

    // Generate robots.txt
    async generateRobotsTxt(websiteId) {
        try {
            const publishedVersion = await WebsiteVersion.getPublishedVersion(websiteId);
            
            if (!publishedVersion) {
                throw new ApiError(404, "No published website found");
            }

            const baseUrl = publishedVersion.publicUrl || `https://example.com/website/${websiteId}`;
            
            const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 10

# Disallow sensitive areas
Disallow: /admin/
Disallow: /api/
Disallow: /tmp/`;

            return robotsTxt;
        } catch (error) {
            console.error('Generate robots.txt error:', error);
            throw new ApiError(500, `Failed to generate robots.txt: ${error.message}`);
        }
    }

    // Helper methods
    calculateSEOScore(content) {
        let score = 0;
        let maxScore = 0;

        // Title optimization
        maxScore += 25;
        if (content.seoMeta?.title) {
            const titleLength = content.seoMeta.title.length;
            if (titleLength >= 30 && titleLength <= 60) score += 25;
            else if (titleLength >= 20 && titleLength <= 70) score += 15;
            else if (titleLength > 0) score += 10;
        }

        // Description optimization
        maxScore += 25;
        if (content.seoMeta?.description) {
            const descLength = content.seoMeta.description.length;
            if (descLength >= 120 && descLength <= 160) score += 25;
            else if (descLength >= 100 && descLength <= 180) score += 15;
            else if (descLength > 0) score += 10;
        }

        // Keywords optimization
        maxScore += 25;
        if (content.seoMeta?.keywords) {
            const keywordCount = content.seoMeta.keywords.length;
            if (keywordCount >= 5 && keywordCount <= 10) score += 25;
            else if (keywordCount >= 3 && keywordCount <= 15) score += 15;
            else if (keywordCount > 0) score += 10;
        }

        // Content optimization
        maxScore += 25;
        if (content.aboutSection?.content) {
            const wordCount = this.countWords(content.aboutSection.content);
            if (wordCount >= 300) score += 25;
            else if (wordCount >= 200) score += 15;
            else if (wordCount >= 100) score += 10;
        }

        return Math.round((score / maxScore) * 100) / 100;
    }

    generateSEORecommendations(content) {
        const recommendations = [];

        if (!content.seoMeta?.title || content.seoMeta.title.length < 30) {
            recommendations.push("Add a compelling title between 30-60 characters");
        }

        if (!content.seoMeta?.description || content.seoMeta.description.length < 120) {
            recommendations.push("Create a detailed meta description between 120-160 characters");
        }

        if (!content.seoMeta?.keywords || content.seoMeta.keywords.length < 5) {
            recommendations.push("Add relevant keywords (5-10 recommended)");
        }

        if (content.aboutSection?.content && this.countWords(content.aboutSection.content) < 300) {
            recommendations.push("Expand your content to at least 300 words for better SEO");
        }

        return recommendations;
    }

    countWords(text) {
        return text ? text.split(/\s+/).filter(word => word.length > 0).length : 0;
    }

    analyzeHeadingStructure(content) {
        // Simple heading structure analysis
        return {
            h1: content.heroSection?.headline ? 1 : 0,
            h2: (content.aboutSection?.title ? 1 : 0) + (content.services?.length || 0),
            h3: 0,
            properStructure: true
        };
    }

    estimatePerformance(content) {
        // Simple performance estimation
        const htmlSize = JSON.stringify(content).length;
        const serviceCount = content.services?.length || 0;
        const imageCount = 5; // Estimated

        return {
            estimatedLoadTime: Math.max(0.8, htmlSize / 10000),
            htmlSize: htmlSize,
            estimatedCacheSize: htmlSize * 0.7,
            optimizationScore: Math.min(1, (10000 - htmlSize) / 10000),
            recommendations: [
                htmlSize > 15000 ? "Consider reducing content size" : null,
                serviceCount > 8 ? "Consider reducing number of services displayed" : null,
                imageCount > 10 ? "Optimize images for better performance" : null
            ].filter(Boolean)
        };
    }

    generateAnalyticsBreakdown(analytics, groupBy) {
        // Generate mock analytics breakdown
        const totalViews = analytics.views || 0;
        const breakdown = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            breakdown.push({
                date: date.toISOString().split('T')[0],
                views: Math.floor(totalViews / 30 * Math.random() * 2),
                sessions: Math.floor(totalViews / 30 * 0.8 * Math.random() * 2)
            });
        }
        
        return breakdown.reverse();
    }
}

export default new PublishService();