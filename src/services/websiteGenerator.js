// src/services/websiteGenerator.js
import AIService from "../service/ai.service.js";
import TemplateService from "../service/template.service.js";
import { ContentProcessor } from "./contentProcessor.js";
import { PreviewGenerator } from "./previewGenerator.js";
import { StyleProcessor } from "./styleProcessor.js";
import { Website } from "../models/website.models.js";
import { ApiError } from "../utils/apierror.js";

class WebsiteGenerator {
    constructor() {
        this.aiService = AIService;
        this.templateService = TemplateService;
        this.contentProcessor = new ContentProcessor();
        this.previewGenerator = new PreviewGenerator();
        this.styleProcessor = new StyleProcessor();
        this.generationCache = new Map();
        this.defaultSpecialties = [
            'general-practice', 'dentistry', 'dermatology', 
            'cardiology', 'pediatrics', 'orthopedics'
        ];
    }

    // Main website generation pipeline
    async generateWebsite(options) {
        const startTime = Date.now();
        
        try {
            // Step 1: Validate and process input
            const processedInput = await this.contentProcessor.processInput(options);
            
            // Step 2: Detect medical specialty if not provided
            const specialtyInfo = await this.detectSpecialty(
                processedInput.transcribedContent, 
                processedInput.specialty
            );
            
            // Step 3: Generate AI content
            const aiContent = await this.generateAIContent(
                processedInput.transcribedContent,
                specialtyInfo,
                processedInput.customizations
            );
            
            // Step 4: Select and render template
            const templateResult = await this.renderTemplate(
                aiContent,
                specialtyInfo,
                processedInput.customizations
            );
            
            // Step 5: Apply styling
            const styledWebsite = await this.styleProcessor.applyStyles(
                templateResult,
                processedInput.customizations
            );
            
            // Step 6: Generate preview
            const previewData = await this.previewGenerator.generatePreview(
                styledWebsite,
                processedInput.customizations
            );
            
            // Step 7: Save to database if user is authenticated
            let websiteRecord = null;
            if (processedInput.userId) {
                websiteRecord = await this.saveWebsite(
                    {
                        ...aiContent,
                        ...styledWebsite,
                        originalTranscription: processedInput.transcribedContent,
                        customizations: processedInput.customizations,
                        generationMetadata: {
                            processingTime: Date.now() - startTime,
                            specialtyDetection: specialtyInfo,
                            aiModel: this.aiService.modelId,
                            templateName: templateResult.templateName,
                            fallbackUsed: aiContent.fallbackUsed || false,
                            confidenceScore: specialtyInfo.confidence || 0.8
                        }
                    },
                    processedInput.userId
                );
            }
            
            // Step 8: Format response
            const response = {
                success: true,
                websiteId: websiteRecord?._id,
                websiteData: {
                    html: previewData.html,
                    css: previewData.css,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        processingTime: Date.now() - startTime,
                        specialty: specialtyInfo.specialty,
                        templateName: templateResult.templateName,
                        qualityScore: aiContent.qualityScore || 0.8,
                        features: styledWebsite.features || []
                    },
                    sections: this.extractSections(aiContent),
                    customizations: processedInput.customizations,
                    previewUrl: websiteRecord ? `/api/v1/website-generation/websites/${websiteRecord._id}/preview` : null
                },
                specialtyInfo: specialtyInfo,
                recommendations: this.generateRecommendations(aiContent, specialtyInfo)
            };
            
            return response;
            
        } catch (error) {
            console.error('Website generation pipeline error:', error);
            throw new ApiError(500, `Website generation failed: ${error.message}`);
        }
    }

    // Detect medical specialty from transcription
    async detectSpecialty(transcription, providedSpecialty) {
        try {
            if (providedSpecialty && this.defaultSpecialties.includes(providedSpecialty)) {
                return {
                    specialty: providedSpecialty,
                    confidence: 1.0,
                    method: 'provided'
                };
            }

            // Use AI service for specialty detection
            const detectionResult = await this.aiService.detectMedicalSpecialty(transcription);
            
            // Fallback to general practice if confidence is too low
            if (detectionResult.confidence < 0.4) {
                return {
                    specialty: 'general-practice',
                    confidence: 0.5,
                    method: 'fallback',
                    originalDetection: detectionResult
                };
            }

            return detectionResult;
            
        } catch (error) {
            console.error('Specialty detection error:', error);
            return {
                specialty: 'general-practice',
                confidence: 0.3,
                method: 'error-fallback',
                error: error.message
            };
        }
    }

    // Generate AI content with enhanced error handling
    async generateAIContent(transcription, specialtyInfo, customizations) {
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(transcription, specialtyInfo.specialty);
            if (this.generationCache.has(cacheKey)) {
                return this.generationCache.get(cacheKey);
            }

            // Generate content using AI service
            const aiContent = await this.aiService.generateWebsiteContent(
                transcription,
                specialtyInfo.specialty
            );

            // Apply customizations to AI content
            const customizedContent = this.applyContentCustomizations(
                aiContent,
                customizations
            );

            // Cache the result
            this.generationCache.set(cacheKey, customizedContent);
            
            return customizedContent;
            
        } catch (error) {
            console.error('AI content generation error:', error);
            
            // Generate fallback content
            return this.generateFallbackContent(transcription, specialtyInfo.specialty);
        }
    }

    // Render template with content
    async renderTemplate(content, specialtyInfo, customizations) {
        try {
            // Prepare template data
            const templateData = {
                ...content,
                specialty: specialtyInfo.specialty,
                customizations: customizations
            };

            // Generate website using template service
            const templateResult = this.templateService.generateWebsite(templateData);
            
            return {
                html: templateResult.html,
                templateName: templateResult.templateName,
                metadata: templateResult.metadata
            };
            
        } catch (error) {
            console.error('Template rendering error:', error);
            throw new ApiError(500, `Template rendering failed: ${error.message}`);
        }
    }

    // Apply content customizations
    applyContentCustomizations(content, customizations) {
        if (!customizations) return content;

        const customizedContent = { ...content };

        // Apply color customizations
        if (customizations.colors) {
            customizedContent.customizations = {
                ...customizedContent.customizations,
                colorScheme: customizations.colors
            };
        }

        // Apply typography customizations
        if (customizations.fonts) {
            customizedContent.customizations = {
                ...customizedContent.customizations,
                typography: customizations.fonts
            };
        }

        // Apply layout customizations
        if (customizations.layout) {
            customizedContent.customizations = {
                ...customizedContent.customizations,
                layout: customizations.layout
            };
        }

        return customizedContent;
    }

    // Generate fallback content when AI fails
    generateFallbackContent(transcription, specialty) {
        const specialtyTitles = {
            'general-practice': 'Family Medical Practice',
            'dentistry': 'Dental Care Center',
            'dermatology': 'Dermatology Specialists',
            'cardiology': 'Heart & Cardiovascular Center',
            'pediatrics': 'Pediatric Medical Center',
            'orthopedics': 'Orthopedic Care Center'
        };

        const specialtyServices = {
            'general-practice': [
                'Annual Physical Exams',
                'Preventive Care',
                'Chronic Disease Management',
                'Urgent Care Services',
                'Health Screenings',
                'Family Medicine'
            ],
            'dentistry': [
                'Dental Cleanings',
                'Cavity Treatment',
                'Root Canal Therapy',
                'Orthodontics',
                'Cosmetic Dentistry',
                'Oral Surgery'
            ],
            'dermatology': [
                'Skin Cancer Screening',
                'Acne Treatment',
                'Eczema Care',
                'Cosmetic Procedures',
                'Mole Removal',
                'Psoriasis Treatment'
            ]
        };

        const title = specialtyTitles[specialty] || 'Medical Practice';
        const services = specialtyServices[specialty] || specialtyServices['general-practice'];

        return {
            websiteTitle: title,
            tagline: `Professional ${specialty.replace('-', ' ')} care you can trust`,
            heroSection: {
                headline: `Expert ${specialty.replace('-', ' ').toUpperCase()} Care`,
                subheadline: 'Providing comprehensive medical services with personalized attention and advanced technology',
                ctaText: 'Schedule Appointment'
            },
            aboutSection: {
                title: 'About Our Practice',
                content: `Our ${specialty.replace('-', ' ')} practice is dedicated to providing exceptional medical care with a focus on patient comfort and treatment excellence. We combine years of experience with the latest medical technologies to ensure the best possible outcomes for our patients.`,
                highlights: [
                    'Experienced Medical Team',
                    'State-of-the-Art Technology',
                    'Patient-Centered Care',
                    'Comprehensive Services'
                ]
            },
            services: services.map(service => ({
                name: service,
                description: `Professional ${service.toLowerCase()} services delivered with expertise and care`,
                icon: 'medical-icon'
            })),
            contactInfo: {
                phone: '(555) 123-4567',
                email: 'info@medicalcenter.com',
                address: '123 Medical Plaza, Healthcare City, HC 12345',
                hours: 'Monday-Friday: 8:00 AM - 6:00 PM'
            },
            seoMeta: {
                title: `${title} - Professional Healthcare Services`,
                description: `Expert ${specialty.replace('-', ' ')} services with experienced medical professionals and comprehensive care.`,
                keywords: [specialty, 'medical', 'healthcare', 'treatment', 'specialist', 'professional']
            },
            specialty: specialty,
            qualityScore: 0.7,
            fallbackUsed: true,
            contentFeatures: ['fallback-content', 'professional-template']
        };
    }

    // Save website to database
    async saveWebsite(websiteData, userId) {
        try {
            const website = new Website({
                ...websiteData,
                userId: userId,
                status: 'draft',
                version: 1,
                lastGenerated: new Date()
            });

            const savedWebsite = await website.save();
            return savedWebsite;
            
        } catch (error) {
            console.error('Website save error:', error);
            throw new ApiError(500, `Failed to save website: ${error.message}`);
        }
    }

    // Extract sections from content for frontend consumption
    extractSections(content) {
        return {
            header: {
                title: content.websiteTitle,
                tagline: content.tagline,
                navigation: ['Home', 'About', 'Services', 'Contact']
            },
            hero: content.heroSection,
            about: content.aboutSection,
            services: {
                title: 'Our Services',
                items: content.services
            },
            contact: {
                title: 'Contact Us',
                info: content.contactInfo
            },
            footer: {
                copyright: `© ${new Date().getFullYear()} ${content.websiteTitle}. All rights reserved.`,
                links: ['Privacy Policy', 'Terms of Service', 'Sitemap']
            }
        };
    }

    // Generate recommendations based on content analysis
    generateRecommendations(content, specialtyInfo) {
        const recommendations = [];

        // Quality score recommendations
        if (content.qualityScore < 0.8) {
            recommendations.push({
                type: 'quality',
                priority: 'high',
                message: 'Consider providing more detailed information about your practice to improve content quality.',
                action: 'regenerate'
            });
        }

        // Specialty confidence recommendations
        if (specialtyInfo.confidence < 0.7) {
            recommendations.push({
                type: 'specialty',
                priority: 'medium',
                message: 'The detected medical specialty has low confidence. Consider specifying your specialty explicitly.',
                action: 'specify-specialty'
            });
        }

        // Services recommendations
        if (content.services && content.services.length < 4) {
            recommendations.push({
                type: 'services',
                priority: 'medium',
                message: 'Adding more services can improve your website\'s comprehensiveness.',
                action: 'add-services'
            });
        }

        // SEO recommendations
        if (content.seoMeta && content.seoMeta.keywords.length < 5) {
            recommendations.push({
                type: 'seo',
                priority: 'low',
                message: 'Adding more relevant keywords can improve search engine visibility.',
                action: 'improve-seo'
            });
        }

        return recommendations;
    }

    // Regenerate specific section
    async regenerateSection(websiteId, sectionName, userId, options = {}) {
        try {
            // Get existing website
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, 'Website not found');
            }

            // Regenerate section using AI service
            const newSection = await this.aiService.regenerateSection(
                website.originalTranscription,
                website.specialty,
                sectionName
            );

            // Update website with new section
            website[sectionName] = newSection;
            website.lastGenerated = new Date();
            website.version += 1;

            await website.save();

            // Regenerate HTML with new section
            const templateResult = await this.renderTemplate(
                website.toObject(),
                { specialty: website.specialty },
                website.customizations
            );

            // Update generated HTML
            website.generatedHtml = templateResult.html;
            await website.save();

            return {
                success: true,
                websiteId: website._id,
                updatedSection: sectionName,
                newContent: newSection,
                html: templateResult.html,
                metadata: {
                    regeneratedAt: new Date().toISOString(),
                    version: website.version
                }
            };

        } catch (error) {
            console.error('Section regeneration error:', error);
            throw new ApiError(500, `Failed to regenerate section: ${error.message}`);
        }
    }

    // Update website customizations
    async updateCustomizations(websiteId, customizations, userId) {
        try {
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, 'Website not found');
            }

            // Update customizations
            website.customizations = {
                ...website.customizations,
                ...customizations
            };

            // Regenerate with new customizations
            const templateResult = await this.renderTemplate(
                website.toObject(),
                { specialty: website.specialty },
                website.customizations
            );

            // Apply new styling
            const styledWebsite = await this.styleProcessor.applyStyles(
                templateResult,
                website.customizations
            );

            // Update website
            website.generatedHtml = styledWebsite.html;
            website.lastGenerated = new Date();
            website.version += 1;

            await website.save();

            return {
                success: true,
                websiteId: website._id,
                customizations: website.customizations,
                html: styledWebsite.html,
                metadata: {
                    updatedAt: new Date().toISOString(),
                    version: website.version
                }
            };

        } catch (error) {
            console.error('Customization update error:', error);
            throw new ApiError(500, `Failed to update customizations: ${error.message}`);
        }
    }

    // Utility methods
    generateCacheKey(transcription, specialty) {
        const content = transcription + specialty;
        return `gen_${Buffer.from(content).toString('base64').slice(0, 32)}`;
    }

    // Clear generation cache
    clearCache() {
        this.generationCache.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.generationCache.size,
            memoryUsage: JSON.stringify([...this.generationCache.entries()]).length
        };
    }
}

export default new WebsiteGenerator();
