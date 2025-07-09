// src/services/contentProcessor.js
import { ApiError } from "../utils/apierror.js";

export class ContentProcessor {
    constructor() {
        this.minTranscriptionLength = 20;
        this.maxTranscriptionLength = 10000;
        this.supportedSpecialties = [
            'general-practice', 'dentistry', 'dermatology', 'cardiology',
            'pediatrics', 'orthopedics', 'gynecology', 'neurology',
            'psychiatry', 'oncology', 'ophthalmology', 'urology', 'endocrinology'
        ];
        this.defaultCustomizations = {
            colors: {
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#10b981',
                background: '#ffffff',
                text: '#1f2937'
            },
            fonts: {
                headingFont: 'Inter',
                bodyFont: 'Inter',
                fontSize: 'medium'
            },
            layout: {
                headerStyle: 'static',
                footerStyle: 'detailed',
                sidebarEnabled: false
            },
            features: {
                appointmentBooking: false,
                liveChat: false,
                testimonials: true,
                blog: false,
                newsletter: false
            }
        };
    }

    // Process and validate input data
    async processInput(options) {
        try {
            const processed = {
                transcribedContent: this.validateTranscription(options.transcribedContent),
                userId: options.userId || null,
                specialty: this.validateSpecialty(options.specialty),
                customizations: this.processCustomizations(options.customizations),
                saveToDatabase: options.saveToDatabase !== false,
                generatePreview: options.generatePreview !== false,
                variationCount: Math.min(options.variationCount || 1, 5)
            };

            return processed;
            
        } catch (error) {
            console.error('Input processing error:', error);
            throw new ApiError(400, `Invalid input data: ${error.message}`);
        }
    }

    // Validate transcription content
    validateTranscription(transcription) {
        if (!transcription || typeof transcription !== 'string') {
            throw new Error('Transcription is required and must be a string');
        }

        const trimmed = transcription.trim();
        
        if (trimmed.length < this.minTranscriptionLength) {
            throw new Error(`Transcription must be at least ${this.minTranscriptionLength} characters long`);
        }

        if (trimmed.length > this.maxTranscriptionLength) {
            throw new Error(`Transcription cannot exceed ${this.maxTranscriptionLength} characters`);
        }

        // Basic content validation
        if (this.containsInappropriateContent(trimmed)) {
            throw new Error('Transcription contains inappropriate content');
        }

        return trimmed;
    }

    // Validate medical specialty
    validateSpecialty(specialty) {
        if (!specialty) {
            return null; // Let the system auto-detect
        }

        if (typeof specialty !== 'string') {
            throw new Error('Specialty must be a string');
        }

        const normalizedSpecialty = specialty.toLowerCase().trim();
        
        if (!this.supportedSpecialties.includes(normalizedSpecialty)) {
            // Check for common variations
            const specialtyMappings = {
                'family medicine': 'general-practice',
                'general medicine': 'general-practice',
                'primary care': 'general-practice',
                'dental': 'dentistry',
                'oral health': 'dentistry',
                'skin': 'dermatology',
                'heart': 'cardiology',
                'cardiac': 'cardiology',
                'children': 'pediatrics',
                'kids': 'pediatrics',
                'child': 'pediatrics',
                'bone': 'orthopedics',
                'joint': 'orthopedics',
                'women': 'gynecology',
                'brain': 'neurology',
                'mental health': 'psychiatry',
                'cancer': 'oncology',
                'eye': 'ophthalmology',
                'vision': 'ophthalmology',
                'kidney': 'urology',
                'diabetes': 'endocrinology',
                'hormone': 'endocrinology'
            };

            const mappedSpecialty = specialtyMappings[normalizedSpecialty];
            if (mappedSpecialty) {
                return mappedSpecialty;
            }

            // If not found, return null to let system auto-detect
            console.warn(`Unsupported specialty: ${specialty}, will auto-detect`);
            return null;
        }

        return normalizedSpecialty;
    }

    // Process customizations with validation and defaults
    processCustomizations(customizations) {
        if (!customizations || typeof customizations !== 'object') {
            return this.defaultCustomizations;
        }

        const processed = {
            colors: this.processColorCustomizations(customizations.colors),
            fonts: this.processFontCustomizations(customizations.fonts),
            layout: this.processLayoutCustomizations(customizations.layout),
            features: this.processFeatureCustomizations(customizations.features)
        };

        return processed;
    }

    // Process color customizations
    processColorCustomizations(colors) {
        const defaults = this.defaultCustomizations.colors;
        
        if (!colors || typeof colors !== 'object') {
            return defaults;
        }

        const processed = { ...defaults };

        // Validate and process each color
        Object.keys(defaults).forEach(colorKey => {
            if (colors[colorKey]) {
                const validatedColor = this.validateColor(colors[colorKey]);
                if (validatedColor) {
                    processed[colorKey] = validatedColor;
                }
            }
        });

        return processed;
    }

    // Process font customizations
    processFontCustomizations(fonts) {
        const defaults = this.defaultCustomizations.fonts;
        
        if (!fonts || typeof fonts !== 'object') {
            return defaults;
        }

        const processed = { ...defaults };
        const supportedFonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins'];
        const supportedSizes = ['small', 'medium', 'large'];

        if (fonts.headingFont && supportedFonts.includes(fonts.headingFont)) {
            processed.headingFont = fonts.headingFont;
        }

        if (fonts.bodyFont && supportedFonts.includes(fonts.bodyFont)) {
            processed.bodyFont = fonts.bodyFont;
        }

        if (fonts.fontSize && supportedSizes.includes(fonts.fontSize)) {
            processed.fontSize = fonts.fontSize;
        }

        return processed;
    }

    // Process layout customizations
    processLayoutCustomizations(layout) {
        const defaults = this.defaultCustomizations.layout;
        
        if (!layout || typeof layout !== 'object') {
            return defaults;
        }

        const processed = { ...defaults };
        const supportedHeaderStyles = ['fixed', 'static', 'transparent'];
        const supportedFooterStyles = ['simple', 'detailed', 'minimal'];

        if (layout.headerStyle && supportedHeaderStyles.includes(layout.headerStyle)) {
            processed.headerStyle = layout.headerStyle;
        }

        if (layout.footerStyle && supportedFooterStyles.includes(layout.footerStyle)) {
            processed.footerStyle = layout.footerStyle;
        }

        if (typeof layout.sidebarEnabled === 'boolean') {
            processed.sidebarEnabled = layout.sidebarEnabled;
        }

        return processed;
    }

    // Process feature customizations
    processFeatureCustomizations(features) {
        const defaults = this.defaultCustomizations.features;
        
        if (!features || typeof features !== 'object') {
            return defaults;
        }

        const processed = { ...defaults };

        // Validate each feature flag
        Object.keys(defaults).forEach(featureKey => {
            if (typeof features[featureKey] === 'boolean') {
                processed[featureKey] = features[featureKey];
            }
        });

        return processed;
    }

    // Validate color format (hex, rgb, rgba, hsl, hsla)
    validateColor(color) {
        if (!color || typeof color !== 'string') {
            return null;
        }

        const trimmed = color.trim();
        
        // Hex color validation
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (hexRegex.test(trimmed)) {
            return trimmed;
        }

        // RGB/RGBA validation
        const rgbRegex = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*[0-1]?(?:\.\d+)?)?\s*\)$/;
        if (rgbRegex.test(trimmed)) {
            return trimmed;
        }

        // HSL/HSLA validation
        const hslRegex = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(?:,\s*[0-1]?(?:\.\d+)?)?\s*\)$/;
        if (hslRegex.test(trimmed)) {
            return trimmed;
        }

        // Named colors (basic validation)
        const namedColors = [
            'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
            'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
            'maroon', 'olive', 'teal', 'silver', 'gold'
        ];
        
        if (namedColors.includes(trimmed.toLowerCase())) {
            return trimmed.toLowerCase();
        }

        return null;
    }

    // Check for inappropriate content
    containsInappropriateContent(content) {
        const inappropriateKeywords = [
            'illegal', 'fraud', 'scam', 'fake', 'unlicensed', 'unregistered',
            'miracle cure', 'guaranteed cure', 'experimental', 'untested'
        ];

        const lowerContent = content.toLowerCase();
        
        return inappropriateKeywords.some(keyword => 
            lowerContent.includes(keyword)
        );
    }

    // Sanitize content
    sanitizeContent(content) {
        if (!content || typeof content !== 'string') {
            return '';
        }

        // Remove potentially harmful content
        let sanitized = content
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();

        return sanitized;
    }

    // Validate contact information
    validateContactInfo(contactInfo) {
        if (!contactInfo || typeof contactInfo !== 'object') {
            return null;
        }

        const validated = {};

        // Validate phone number
        if (contactInfo.phone) {
            const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
            if (phoneRegex.test(contactInfo.phone.replace(/\s/g, ''))) {
                validated.phone = contactInfo.phone;
            }
        }

        // Validate email
        if (contactInfo.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(contactInfo.email)) {
                validated.email = contactInfo.email;
            }
        }

        // Validate address
        if (contactInfo.address && typeof contactInfo.address === 'string') {
            validated.address = this.sanitizeContent(contactInfo.address);
        }

        // Validate hours
        if (contactInfo.hours && typeof contactInfo.hours === 'string') {
            validated.hours = this.sanitizeContent(contactInfo.hours);
        }

        return Object.keys(validated).length > 0 ? validated : null;
    }

    // Validate services array
    validateServices(services) {
        if (!Array.isArray(services)) {
            return null;
        }

        const validated = services
            .filter(service => service && typeof service === 'object')
            .map(service => ({
                name: this.sanitizeContent(service.name || ''),
                description: this.sanitizeContent(service.description || ''),
                icon: this.sanitizeContent(service.icon || 'medical-icon')
            }))
            .filter(service => service.name && service.description);

        return validated.length > 0 ? validated : null;
    }

    // Validate SEO metadata
    validateSeoMeta(seoMeta) {
        if (!seoMeta || typeof seoMeta !== 'object') {
            return null;
        }

        const validated = {};

        // Validate title
        if (seoMeta.title && typeof seoMeta.title === 'string') {
            const title = this.sanitizeContent(seoMeta.title);
            if (title.length >= 10 && title.length <= 60) {
                validated.title = title;
            }
        }

        // Validate description
        if (seoMeta.description && typeof seoMeta.description === 'string') {
            const description = this.sanitizeContent(seoMeta.description);
            if (description.length >= 50 && description.length <= 160) {
                validated.description = description;
            }
        }

        // Validate keywords
        if (Array.isArray(seoMeta.keywords)) {
            const keywords = seoMeta.keywords
                .filter(keyword => keyword && typeof keyword === 'string')
                .map(keyword => this.sanitizeContent(keyword))
                .filter(keyword => keyword.length > 0);
            
            if (keywords.length > 0) {
                validated.keywords = keywords;
            }
        }

        return Object.keys(validated).length > 0 ? validated : null;
    }

    // Get processing statistics
    getProcessingStats() {
        return {
            supportedSpecialties: this.supportedSpecialties.length,
            minTranscriptionLength: this.minTranscriptionLength,
            maxTranscriptionLength: this.maxTranscriptionLength,
            defaultCustomizations: this.defaultCustomizations
        };
    }
}