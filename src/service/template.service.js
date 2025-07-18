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

    // Initialize template cache for better performance with specialty-specific keys
    initializeTemplateCache() {
        try {
            // CRITICAL FIX: Clear all existing cache first to prevent corruption
            this.templateCache.clear();
            console.log('[Template Cache] 🧹 Cleared all existing cache');
            
            // Cache base templates (no specialty needed)
            this.cacheTemplate('base/layout.html');
            this.cacheTemplate('base/header.html');
            this.cacheTemplate('base/footer.html');
            
            // Cache specialty templates with specialty-specific keys
            this.config.supportedSpecialties.forEach(specialty => {
                this.cacheTemplate(`specialties/${specialty}.html`, specialty);
            });
            
            console.log('[Template Cache] ✅ Template cache initialized successfully with specialty-specific keys');
        } catch (error) {
            console.error('[Template Cache] ❌ Failed to initialize template cache:', error);
        }
    }

    // Cache a template file with specialty-specific key
    cacheTemplate(templatePath, specialty = null) {
        try {
            const fullPath = path.join(this.templatesPath, templatePath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                // CRITICAL FIX: Include specialty in cache key to prevent conflicts
                const cacheKey = specialty ? `${templatePath}:${specialty}` : templatePath;
                this.templateCache.set(cacheKey, content);
                console.log(`[Template Cache] ✅ Cached template: ${cacheKey}`);
            }
        } catch (error) {
            console.error(`Failed to cache template ${templatePath}:`, error);
        }
    }

    // Get template content from cache or file with specialty validation
    getTemplate(templatePath, specialty = null) {
        // CRITICAL FIX: Include specialty in cache key to prevent conflicts
        const cacheKey = specialty ? `${templatePath}:${specialty}` : templatePath;
        
        console.log(`[Template Cache] 🔍 Getting template with key: ${cacheKey}`);
        
        if (this.templateCache.has(cacheKey)) {
            console.log(`[Template Cache] ✅ Cache hit for: ${cacheKey}`);
            return this.templateCache.get(cacheKey);
        }
        
        try {
            const fullPath = path.join(this.templatesPath, templatePath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                
                // CRITICAL FIX: Validate template content matches specialty
                if (specialty && !this.validateTemplateForSpecialty(content, specialty, templatePath)) {
                    console.warn(`[Template Cache] ⚠️ Template content validation failed for ${templatePath} with specialty ${specialty}`);
                }
                
                this.templateCache.set(cacheKey, content);
                console.log(`[Template Cache] ✅ Loaded and cached template: ${cacheKey}`);
                return content;
            }
        } catch (error) {
            console.error(`Failed to read template ${templatePath}:`, error);
        }
        
        console.log(`[Template Cache] ❌ Template not found: ${cacheKey}`);
        return null;
    }

    // ENHANCED specialty to template mapping with BULLETPROOF logic
    mapSpecialtyToTemplate(specialty) {
        console.log(`[Template Service] 🔍 Mapping specialty: "${specialty}"`);
        
        if (!specialty) {
            console.log(`[Template Service] ❌ No specialty provided, using default: ${this.config.defaultTemplate}`);
            return this.config.defaultTemplate;
        }
        
        const normalizedSpecialty = specialty.toLowerCase().trim();
        console.log(`[Template Service] 📝 Normalized specialty: "${normalizedSpecialty}"`);
        
        // BULLETPROOF RULE #1: Exact match with supported specialties
        if (this.config.supportedSpecialties.includes(normalizedSpecialty)) {
            console.log(`[Template Service] ✅ EXACT MATCH found: ${normalizedSpecialty}`);
            return normalizedSpecialty;
        }
        
        // BULLETPROOF RULE #2: Direct template mapping (high confidence)
        const mappedTemplate = this.config.templateMappings[normalizedSpecialty];
        if (mappedTemplate && this.config.supportedSpecialties.includes(mappedTemplate)) {
            console.log(`[Template Service] ✅ DIRECT MAPPING found: ${normalizedSpecialty} -> ${mappedTemplate}`);
            return mappedTemplate;
        }
        
        // BULLETPROOF RULE #3: Strict keyword matching for major specialties
        const strictSpecialtyMatches = {
            'dentistry': ['dental', 'teeth', 'tooth', 'oral', 'dentist', 'orthodontic', 'endodontic'],
            'cardiology': ['heart', 'cardiac', 'cardiovascular', 'cardiologist', 'coronary'],
            'dermatology': ['skin', 'dermatology', 'dermatologist', 'acne', 'eczema', 'psoriasis'],
            'gynecology': ['women', 'gynecology', 'gynecologist', 'pregnancy', 'reproductive', 'obstetric'],
            'pediatrics': ['children', 'pediatrics', 'pediatrician', 'child', 'infant', 'baby'],
            'orthopedics': ['bone', 'joint', 'orthopedics', 'fracture', 'spine', 'orthopedic'],
            'neurology': ['brain', 'nerve', 'neurological', 'neurologist', 'epilepsy', 'stroke'],
            'psychiatry': ['mental', 'psychiatric', 'psychiatrist', 'depression', 'anxiety', 'therapy'],
            'oncology': ['cancer', 'oncology', 'oncologist', 'tumor', 'chemotherapy', 'radiation'],
            'ophthalmology': ['eye', 'vision', 'ophthalmology', 'ophthalmologist', 'cataract', 'glaucoma'],
            'urology': ['kidney', 'bladder', 'urology', 'urologist', 'prostate', 'urinary'],
            'endocrinology': ['diabetes', 'thyroid', 'hormone', 'endocrinology', 'endocrinologist', 'metabolic']
        };
        
        // Check for strict keyword matches
        for (const [templateSpecialty, keywords] of Object.entries(strictSpecialtyMatches)) {
            if (this.config.supportedSpecialties.includes(templateSpecialty)) {
                const hasKeywordMatch = keywords.some(keyword => {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                    return regex.test(normalizedSpecialty);
                });
                
                if (hasKeywordMatch) {
                    console.log(`[Template Service] ✅ STRICT KEYWORD MATCH: ${normalizedSpecialty} -> ${templateSpecialty}`);
                    return templateSpecialty;
                }
            }
        }
        
        // BULLETPROOF RULE #4: Conservative fuzzy matching (only for very close matches)
        const conservativeFuzzyMatches = {
            'general-practice': ['general', 'family', 'primary', 'internal'],
            'dentistry': ['dentistry', 'dental'],
            'cardiology': ['cardiology', 'cardiac'],
            'dermatology': ['dermatology', 'skin'],
            'gynecology': ['gynecology', 'women'],
            'pediatrics': ['pediatrics', 'pediatric'],
            'orthopedics': ['orthopedics', 'orthopaedic'],
            'neurology': ['neurology', 'neurological'],
            'psychiatry': ['psychiatry', 'psychiatric'],
            'oncology': ['oncology', 'cancer'],
            'ophthalmology': ['ophthalmology', 'eye'],
            'urology': ['urology', 'urological'],
            'endocrinology': ['endocrinology', 'endocrine']
        };
        
        for (const [templateSpecialty, patterns] of Object.entries(conservativeFuzzyMatches)) {
            if (this.config.supportedSpecialties.includes(templateSpecialty)) {
                const hasPatternMatch = patterns.some(pattern => {
                    return normalizedSpecialty.includes(pattern) || pattern.includes(normalizedSpecialty);
                });
                
                if (hasPatternMatch) {
                    console.log(`[Template Service] ✅ CONSERVATIVE FUZZY MATCH: ${normalizedSpecialty} -> ${templateSpecialty}`);
                    return templateSpecialty;
                }
            }
        }
        
        // BULLETPROOF RULE #5: Fallback to default (prevents wrong mappings)
        console.log(`[Template Service] ❌ No reliable match found for "${normalizedSpecialty}"`);
        console.log(`[Template Service] 📊 Available specialties: ${this.config.supportedSpecialties.join(', ')}`);
        console.log(`[Template Service] 🔄 Using safe fallback: ${this.config.defaultTemplate}`);
        return this.config.defaultTemplate;
    }

    // Get template configuration for a specialty
    getTemplateConfig(specialty) {
        console.log(`[Template Config] Getting config for specialty: ${specialty}`);
        const templateName = this.mapSpecialtyToTemplate(specialty);
        console.log(`[Template Config] Mapped to template: ${templateName}`);
        
        const colors = this.config.colorSchemes[templateName] || this.config.colorSchemes[this.config.defaultTemplate];
        const features = this.config.templateFeatures[templateName] || this.config.templateFeatures[this.config.defaultTemplate];
        const seo = this.config.seoDefaults[templateName] || this.config.seoDefaults[this.config.defaultTemplate];
        
        console.log(`[Template Config] SEO config found: ${seo ? 'Yes' : 'No'}`);
        console.log(`[Template Config] Features found: ${features ? Object.keys(features).length : 0} features`);
        console.log(`[Template Config] Colors found: ${colors ? 'Yes' : 'No'}`);
        
        return {
            templateName,
            colors: colors,
            features: features,
            seo: seo,
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
            
            // Get specialty template with specialty validation
            const specialtyTemplate = this.getTemplate(`specialties/${templateConfig.templateName}.html`, templateConfig.templateName);
            if (!specialtyTemplate) {
                throw new ApiError(500, `Specialty template not found: ${templateConfig.templateName}`);
            }
            
            // CRITICAL FIX: Validate template content matches specialty
            console.log(`[Template Generation] 🔍 Using template: ${templateConfig.templateName} for specialty: ${websiteData.specialty}`);
            if (!this.validateTemplateForSpecialty(specialtyTemplate, templateConfig.templateName, `specialties/${templateConfig.templateName}.html`)) {
                console.error(`[Template Generation] ❌ Template validation failed for ${templateConfig.templateName}`);
                throw new ApiError(500, `Template validation failed for specialty: ${templateConfig.templateName}`);
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
            pageTitle: websiteData.seoMeta?.title || this.constructSEOTitle(websiteData.websiteTitle, templateConfig.seo.titleSuffix),
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

    // Construct SEO title with proper length validation
    constructSEOTitle(practiceTitle, titleSuffix) {
        const maxLength = 55;
        const separator = ' | ';
        
        if (!practiceTitle) {
            return titleSuffix && titleSuffix.length <= maxLength ? titleSuffix : 'Medical Practice';
        }
        
        if (!titleSuffix) {
            return practiceTitle.length <= maxLength ? practiceTitle : practiceTitle.substring(0, maxLength - 3) + '...';
        }
        
        const fullTitle = `${practiceTitle}${separator}${titleSuffix}`;
        
        if (fullTitle.length <= maxLength) {
            return fullTitle;
        }
        
        // If full title is too long, try shortening the practice name
        const availableSpace = maxLength - separator.length - titleSuffix.length;
        if (availableSpace > 10) {
            return `${practiceTitle.substring(0, availableSpace - 3)}...${separator}${titleSuffix}`;
        }
        
        // If still too long, use just the practice name
        return practiceTitle.length <= maxLength ? practiceTitle : practiceTitle.substring(0, maxLength - 3) + '...';
    }

    // Validate template availability and configuration
    validateTemplateAvailability(specialty) {
        console.log(`[Template Validation] Validating availability for: ${specialty}`);
        
        const templateName = this.mapSpecialtyToTemplate(specialty);
        const validationResult = {
            specialty: specialty,
            templateName: templateName,
            isSupported: this.config.supportedSpecialties.includes(templateName),
            hasColors: !!this.config.colorSchemes[templateName],
            hasFeatures: !!this.config.templateFeatures[templateName],
            hasSEO: !!this.config.seoDefaults[templateName],
            issues: []
        };
        
        if (!validationResult.isSupported) {
            validationResult.issues.push(`Template "${templateName}" not in supported specialties`);
        }
        if (!validationResult.hasColors) {
            validationResult.issues.push(`No color scheme found for "${templateName}"`);
        }
        if (!validationResult.hasFeatures) {
            validationResult.issues.push(`No features found for "${templateName}"`);
        }
        if (!validationResult.hasSEO) {
            validationResult.issues.push(`No SEO defaults found for "${templateName}"`);
        }
        
        console.log(`[Template Validation] Results:`, validationResult);
        return validationResult;
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

    // Clear template cache completely and reinitialize
    clearCache() {
        console.log('[Template Cache] 🧹 Clearing all template cache');
        this.templateCache.clear();
        
        // CRITICAL FIX: Force garbage collection of old cache entries
        if (global.gc) {
            global.gc();
        }
        
        this.initializeTemplateCache();
        console.log('[Template Cache] ✅ Template cache cleared and reinitialized');
    }

    // Get cache statistics with detailed breakdown
    getCacheStats() {
        const keys = Array.from(this.templateCache.keys());
        const specialtyKeys = keys.filter(key => key.includes(':'));
        const baseKeys = keys.filter(key => !key.includes(':'));
        
        return {
            cachedTemplates: this.templateCache.size,
            cacheKeys: keys,
            specialtySpecificKeys: specialtyKeys,
            baseTemplateKeys: baseKeys,
            memoryUsage: JSON.stringify(Array.from(this.templateCache.entries())).length,
            cacheIntegrity: this.validateCacheIntegrity()
        };
    }

    // CRITICAL FIX: Validate template content matches specialty
    validateTemplateForSpecialty(templateContent, specialty, templatePath) {
        try {
            if (!templateContent || !specialty) {
                return false;
            }

            // Check if template content contains appropriate specialty indicators
            const specialtyLower = specialty.toLowerCase();
            const contentLower = templateContent.toLowerCase();
            
            // For specialty templates, ensure they don't contain conflicting specialty terms
            const conflictingSpecialties = {
                'dentistry': ['cardiology', 'dermatology', 'pediatrics', 'gynecology'],
                'cardiology': ['dentistry', 'dermatology', 'pediatrics', 'gynecology'],
                'dermatology': ['dentistry', 'cardiology', 'pediatrics', 'gynecology'],
                'pediatrics': ['dentistry', 'cardiology', 'dermatology', 'gynecology'],
                'gynecology': ['dentistry', 'cardiology', 'dermatology', 'pediatrics']
            };

            // Check for conflicting specialty terms
            const conflicts = conflictingSpecialties[specialtyLower] || [];
            for (const conflict of conflicts) {
                if (contentLower.includes(conflict) && !contentLower.includes(specialtyLower)) {
                    console.warn(`[Template Validation] ⚠️ Template ${templatePath} contains conflicting specialty: ${conflict} (expected: ${specialtyLower})`);
                    return false;
                }
            }

            // Positive validation: check if template contains expected specialty terms
            const specialtyTerms = {
                'dentistry': ['dental', 'teeth', 'oral', 'dentist', 'orthodontic'],
                'cardiology': ['cardiac', 'heart', 'cardiovascular', 'cardiology'],
                'dermatology': ['skin', 'dermatology', 'dermatologist', 'acne'],
                'pediatrics': ['pediatric', 'children', 'child', 'pediatrician'],
                'gynecology': ['women', 'gynecology', 'reproductive', 'pregnancy']
            };

            const expectedTerms = specialtyTerms[specialtyLower] || [];
            const hasExpectedTerms = expectedTerms.some(term => contentLower.includes(term));
            
            if (!hasExpectedTerms && templatePath.includes('specialties/')) {
                console.warn(`[Template Validation] ⚠️ Template ${templatePath} missing expected specialty terms for ${specialtyLower}`);
            }

            console.log(`[Template Validation] ✅ Template ${templatePath} validated for specialty ${specialtyLower}`);
            return true;

        } catch (error) {
            console.error(`[Template Validation] ❌ Validation error for ${templatePath}:`, error);
            return false;
        }
    }

    // Validate cache integrity
    validateCacheIntegrity() {
        try {
            const keys = Array.from(this.templateCache.keys());
            const issues = [];

            // Check for duplicate base templates
            const baseTemplates = keys.filter(key => !key.includes(':'));
            const duplicateBase = baseTemplates.filter((key, index) => baseTemplates.indexOf(key) !== index);
            if (duplicateBase.length > 0) {
                issues.push(`Duplicate base templates: ${duplicateBase.join(', ')}`);
            }

            // Check for missing specialty identifiers
            const specialtyTemplates = keys.filter(key => key.includes('specialties/') && !key.includes(':'));
            if (specialtyTemplates.length > 0) {
                issues.push(`Specialty templates missing specialty identifiers: ${specialtyTemplates.join(', ')}`);
            }

            // Check for orphaned cache entries
            const validSpecialties = this.config.supportedSpecialties;
            const invalidSpecialties = keys
                .filter(key => key.includes(':'))
                .map(key => key.split(':')[1])
                .filter(specialty => !validSpecialties.includes(specialty));
            
            if (invalidSpecialties.length > 0) {
                issues.push(`Invalid specialty cache entries: ${invalidSpecialties.join(', ')}`);
            }

            return {
                isValid: issues.length === 0,
                issues: issues,
                totalKeys: keys.length,
                specialtyKeys: keys.filter(key => key.includes(':')).length,
                baseKeys: keys.filter(key => !key.includes(':')).length
            };

        } catch (error) {
            console.error('[Template Validation] ❌ Cache integrity check failed:', error);
            return {
                isValid: false,
                issues: [`Cache integrity check failed: ${error.message}`],
                totalKeys: 0,
                specialtyKeys: 0,
                baseKeys: 0
            };
        }
    }
}

export default new TemplateService();