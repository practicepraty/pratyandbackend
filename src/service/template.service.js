// src/service/template.service.js - Template Engine Service
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/apierror.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load template configuration
const templateConfigPath = path.join(__dirname, '..', 'templates', 'config', 'template-config.json');
const templateConfig = JSON.parse(fs.readFileSync(templateConfigPath, 'utf-8'));

class TemplateService {
    constructor() {
        this.templatesPath = path.join(__dirname, '..', 'templates');
        this.config = templateConfig;
        this.templateCache = new Map();
        this.initializeTemplateCache();
    }

    // Initialize template cache for better performance
    initializeTemplateCache() {
        try {
            // Cache base templates
            this.cacheTemplate('base/layout.html');
            this.cacheTemplate('base/header.html');
            this.cacheTemplate('base/footer.html');
            
            // Cache specialty templates
            this.config.supportedSpecialties.forEach(specialty => {
                this.cacheTemplate(`specialties/${specialty}.html`);
            });
            
            console.log('Template cache initialized successfully');
        } catch (error) {
            console.error('Failed to initialize template cache:', error);
        }
    }

    // Cache a template file
    cacheTemplate(templatePath) {
        try {
            const fullPath = path.join(this.templatesPath, templatePath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                this.templateCache.set(templatePath, content);
            }
        } catch (error) {
            console.error(`Failed to cache template ${templatePath}:`, error);
        }
    }

    // Get template content from cache or file
    getTemplate(templatePath) {
        if (this.templateCache.has(templatePath)) {
            return this.templateCache.get(templatePath);
        }
        
        try {
            const fullPath = path.join(this.templatesPath, templatePath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                this.templateCache.set(templatePath, content);
                return content;
            }
        } catch (error) {
            console.error(`Failed to read template ${templatePath}:`, error);
        }
        
        return null;
    }

    // Map specialty to template name
    mapSpecialtyToTemplate(specialty) {
        if (!specialty) return this.config.defaultTemplate;
        
        const normalizedSpecialty = specialty.toLowerCase().trim();
        
        // Direct mapping
        if (this.config.supportedSpecialties.includes(normalizedSpecialty)) {
            return normalizedSpecialty;
        }
        
        // Check template mappings
        const mappedTemplate = this.config.templateMappings[normalizedSpecialty];
        if (mappedTemplate && this.config.supportedSpecialties.includes(mappedTemplate)) {
            return mappedTemplate;
        }
        
        // Fuzzy matching for common variations
        for (const [key, value] of Object.entries(this.config.templateMappings)) {
            if (normalizedSpecialty.includes(key) || key.includes(normalizedSpecialty)) {
                return value;
            }
        }
        
        return this.config.defaultTemplate;
    }

    // Get template configuration for a specialty
    getTemplateConfig(specialty) {
        const templateName = this.mapSpecialtyToTemplate(specialty);
        return {
            templateName,
            colors: this.config.colorSchemes[templateName] || this.config.colorSchemes[this.config.defaultTemplate],
            features: this.config.templateFeatures[templateName] || this.config.templateFeatures[this.config.defaultTemplate],
            seo: this.config.seoDefaults[templateName] || this.config.seoDefaults[this.config.defaultTemplate],
            settings: this.config.templateSettings
        };
    }

    // Replace template variables with actual data
    renderTemplate(templateContent, data) {
        if (!templateContent || !data) return templateContent;
        
        let rendered = templateContent;
        
        // Handle simple variable replacement {{variable}}
        rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const value = this.getNestedValue(data, key.trim());
            return value !== undefined ? value : match;
        });
        
        // Handle conditional blocks {{#if condition}}...{{/if}}
        rendered = this.handleConditionals(rendered, data);
        
        // Handle loops {{#each array}}...{{/each}}
        rendered = this.handleLoops(rendered, data);
        
        // Handle partials {{> partial}}
        rendered = this.handlePartials(rendered, data);
        
        return rendered;
    }

    // Get nested object value using dot notation
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    // Handle conditional blocks
    handleConditionals(template, data) {
        const conditionalRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
        
        return template.replace(conditionalRegex, (match, condition, content) => {
            const conditionValue = this.getNestedValue(data, condition.trim());
            return conditionValue ? content : '';
        });
    }

    // Handle loops
    handleLoops(template, data) {
        const loopRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
        
        return template.replace(loopRegex, (match, arrayPath, content) => {
            const array = this.getNestedValue(data, arrayPath.trim());
            
            if (!Array.isArray(array)) return '';
            
            return array.map(item => {
                return this.renderTemplate(content, { ...data, ...item, this: item });
            }).join('');
        });
    }

    // Handle partials (nested templates)
    handlePartials(template, data) {
        const partialRegex = /\{\{>\s*([^}]+)\}\}/g;
        
        return template.replace(partialRegex, (match, partialName) => {
            const partialPath = `base/${partialName.trim()}.html`;
            const partialContent = this.getTemplate(partialPath);
            
            if (partialContent) {
                return this.renderTemplate(partialContent, data);
            }
            
            return match;
        });
    }

    // Generate complete website HTML
    generateWebsite(websiteData) {
        try {
            const templateConfig = this.getTemplateConfig(websiteData.specialty);
            
            // Prepare template data
            const templateData = this.prepareTemplateData(websiteData, templateConfig);
            
            // Get layout template
            const layoutTemplate = this.getTemplate('base/layout.html');
            if (!layoutTemplate) {
                throw new ApiError(500, 'Layout template not found');
            }
            
            // Get specialty template
            const specialtyTemplate = this.getTemplate(`specialties/${templateConfig.templateName}.html`);
            if (!specialtyTemplate) {
                throw new ApiError(500, `Specialty template not found: ${templateConfig.templateName}`);
            }
            
            // Render specialty template
            const renderedSpecialty = this.renderTemplate(specialtyTemplate, templateData);
            
            // Combine with layout
            const finalData = {
                ...templateData,
                content: renderedSpecialty
            };
            
            // Render final HTML
            const finalHtml = this.renderTemplate(layoutTemplate, finalData);
            
            return {
                html: finalHtml,
                templateName: templateConfig.templateName,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    template: templateConfig.templateName,
                    specialty: websiteData.specialty,
                    features: templateConfig.features
                }
            };
            
        } catch (error) {
            console.error('Website generation error:', error);
            throw new ApiError(500, `Failed to generate website: ${error.message}`);
        }
    }

    // Prepare template data with defaults and configurations
    prepareTemplateData(websiteData, templateConfig) {
        const currentYear = new Date().getFullYear();
        const fallback = this.config.fallbackContent;
        
        return {
            // Basic information
            practiceTitle: websiteData.websiteTitle || fallback.defaultTitle,
            tagline: websiteData.tagline || fallback.defaultTagline,
            specialty: websiteData.specialty || 'general-practice',
            
            // Page metadata
            pageTitle: websiteData.seoMeta?.title || `${websiteData.websiteTitle} | ${templateConfig.seo.titleSuffix}`,
            seoDescription: websiteData.seoMeta?.description || templateConfig.seo.description,
            seoKeywords: websiteData.seoMeta?.keywords?.join(', ') || templateConfig.seo.metaKeywords.join(', '),
            
            // Content sections
            heroSection: websiteData.heroSection || {
                headline: `Expert ${websiteData.specialty} Care`,
                subheadline: fallback.defaultDescription,
                ctaText: templateConfig.features.primaryCTA
            },
            
            aboutSection: websiteData.aboutSection || {
                title: 'About Our Practice',
                content: fallback.defaultDescription,
                highlights: ['Experienced Team', 'Quality Care', 'Patient-Centered']
            },
            
            services: websiteData.services || fallback.defaultServices.map(service => ({
                name: service,
                description: `Professional ${service.toLowerCase()} services`,
                icon: 'medical-icon'
            })),
            
            // Contact information
            contactInfo: websiteData.contactInfo || fallback.defaultContact,
            phone: websiteData.contactInfo?.phone || fallback.defaultContact.phone,
            email: websiteData.contactInfo?.email || fallback.defaultContact.email,
            address: websiteData.contactInfo?.address || fallback.defaultContact.address,
            hours: websiteData.contactInfo?.hours || fallback.defaultContact.hours,
            
            // Social media
            socialMedia: websiteData.contactInfo?.socialMedia || {},
            
            // Colors and styling
            primaryColor: templateConfig.colors.primary,
            secondaryColor: templateConfig.colors.secondary,
            accentColor: templateConfig.colors.accent,
            backgroundColor: templateConfig.colors.background,
            cardBackground: templateConfig.colors.cardBackground,
            textColor: templateConfig.colors.textColor,
            borderColor: templateConfig.colors.borderColor,
            
            // Features
            showEmergencyBanner: templateConfig.features.showEmergencyBanner,
            showAppointments: templateConfig.features.showAppointments,
            showBlog: templateConfig.features.showBlog,
            showTestimonials: templateConfig.features.showTestimonials,
            showNewsletter: templateConfig.features.showNewsletter,
            
            // Metadata
            currentYear,
            baseUrl: process.env.BASE_URL || 'https://example.com',
            ogImage: websiteData.ogImage || '/images/default-og-image.jpg',
            logo: websiteData.logo || null,
            
            // Certifications
            certifications: websiteData.certifications || [],
            
            // Emergency contact
            nurseLinePhone: websiteData.nurseLinePhone || fallback.defaultContact.phone,
            mapUrl: websiteData.mapUrl || '#'
        };
    }

    // Get available templates
    getAvailableTemplates() {
        return this.config.supportedSpecialties.map(specialty => ({
            name: specialty,
            displayName: this.formatSpecialtyName(specialty),
            description: this.config.seoDefaults[specialty]?.description || '',
            features: this.config.templateFeatures[specialty]?.customSections || [],
            colors: this.config.colorSchemes[specialty]
        }));
    }

    // Format specialty name for display
    formatSpecialtyName(specialty) {
        return specialty.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Generate preview data for template
    generatePreviewData(specialty) {
        const templateConfig = this.getTemplateConfig(specialty);
        const previewData = {
            websiteTitle: `${this.formatSpecialtyName(specialty)} Medical Center`,
            specialty: specialty,
            tagline: templateConfig.seo.description,
            heroSection: {
                headline: `Expert ${this.formatSpecialtyName(specialty)} Care`,
                subheadline: 'Professional medical services with personalized attention',
                ctaText: templateConfig.features.primaryCTA
            },
            aboutSection: {
                title: 'About Our Practice',
                content: 'We provide exceptional medical care with a focus on patient comfort and treatment excellence.',
                highlights: ['Experienced Team', 'Modern Technology', 'Patient-Centered Care']
            },
            services: [
                { name: 'Consultation', description: 'Comprehensive medical consultation', icon: 'stethoscope' },
                { name: 'Diagnostics', description: 'Advanced diagnostic services', icon: 'chart-line' },
                { name: 'Treatment', description: 'Personalized treatment plans', icon: 'pills' }
            ],
            contactInfo: {
                phone: '(555) 123-4567',
                email: 'info@example.com',
                address: '123 Medical Center Dr, City, State 12345',
                hours: 'Mon-Fri: 9AM-5PM'
            },
            seoMeta: {
                title: `${this.formatSpecialtyName(specialty)} Medical Center`,
                description: templateConfig.seo.description,
                keywords: templateConfig.seo.metaKeywords
            }
        };
        
        return previewData;
    }

    // Validate template data
    validateTemplateData(data) {
        const errors = [];
        
        if (!data.websiteTitle || data.websiteTitle.trim().length < 3) {
            errors.push('Website title must be at least 3 characters long');
        }
        
        if (!data.specialty) {
            errors.push('Medical specialty is required');
        }
        
        if (!data.services || !Array.isArray(data.services) || data.services.length === 0) {
            errors.push('At least one service is required');
        }
        
        if (!data.contactInfo || !data.contactInfo.phone || !data.contactInfo.email) {
            errors.push('Contact information (phone and email) is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Clear template cache
    clearCache() {
        this.templateCache.clear();
        this.initializeTemplateCache();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cachedTemplates: this.templateCache.size,
            cacheKeys: Array.from(this.templateCache.keys()),
            memoryUsage: JSON.stringify(Array.from(this.templateCache.entries())).length
        };
    }
}

export default new TemplateService();