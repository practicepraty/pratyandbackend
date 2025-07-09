// src/service/ai.service.js (Enhanced Version)
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockClient } from "../config/aws.js";
import { ApiError } from "../utils/apierror.js";
import { DEFAULT_TEMPLATES, getTemplateBySpecialty } from "../config/templates.config.js";

class AIService {
    constructor() {
        this.client = createBedrockClient();
        this.modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";
        this.specialtyKeywords = this.initializeSpecialtyKeywords();
        this.contentTemplates = this.initializeContentTemplates();
        this.contentQualityThresholds = this.initializeQualityThresholds();
        this.generationCache = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // Initialize medical specialty keywords for better detection
    initializeSpecialtyKeywords() {
        return {
            cardiology: ['heart', 'cardiac', 'cardiovascular', 'chest pain', 'ecg', 'ekg', 'blood pressure', 'arrhythmia', 'coronary', 'hypertension', 'pacemaker', 'stent'],
            orthopedics: ['bone', 'joint', 'fracture', 'spine', 'knee', 'hip', 'shoulder', 'arthritis', 'sports injury', 'ligament', 'tendon', 'cartilage', 'osteoporosis'],
            dermatology: ['skin', 'acne', 'rash', 'mole', 'eczema', 'psoriasis', 'dermatitis', 'melanoma', 'wrinkles', 'botox', 'laser', 'biopsy'],
            pediatrics: ['child', 'children', 'infant', 'baby', 'vaccination', 'pediatric', 'growth', 'development', 'adolescent', 'immunization', 'newborn'],
            gynecology: ['women', 'pregnancy', 'menstrual', 'reproductive', 'prenatal', 'obstetric', 'gynecological', 'fertility', 'contraception', 'menopause'],
            neurology: ['brain', 'nerve', 'neurological', 'seizure', 'migraine', 'stroke', 'paralysis', 'memory', 'alzheimer', 'parkinson', 'epilepsy'],
            psychiatry: ['mental health', 'depression', 'anxiety', 'therapy', 'psychological', 'bipolar', 'adhd', 'counseling', 'psychiatric', 'medication'],
            oncology: ['cancer', 'tumor', 'chemotherapy', 'radiation', 'oncology', 'malignant', 'metastasis', 'biopsy', 'lymphoma', 'leukemia'],
            ophthalmology: ['eye', 'vision', 'glaucoma', 'cataract', 'retina', 'ophthalmology', 'visual', 'glasses', 'contact lenses', 'surgery'],
            dentistry: ['dental', 'teeth', 'oral', 'cavity', 'gum', 'root canal', 'orthodontic', 'periodontal', 'implant', 'crown', 'braces'],
            urology: ['kidney', 'bladder', 'prostate', 'urinary', 'stones', 'incontinence', 'erectile', 'testosterone', 'vasectomy'],
            endocrinology: ['diabetes', 'thyroid', 'hormone', 'insulin', 'metabolism', 'endocrine', 'glucose', 'adrenal', 'pituitary']
        };
    }

    // Initialize content templates for different specialties
    initializeContentTemplates() {
        return {
            cardiology: {
                tagline: "Your Heart Health is Our Priority",
                services: ["Cardiac Consultation", "ECG/EKG Testing", "Stress Testing", "Heart Disease Prevention", "Blood Pressure Management", "Cardiac Catheterization"],
                about: "comprehensive cardiac care with state-of-the-art technology and personalized treatment plans",
                keywords: ["cardiology", "heart care", "cardiac services", "cardiovascular health", "heart specialist"]
            },
            orthopedics: {
                tagline: "Restoring Movement, Rebuilding Lives",
                services: ["Joint Replacement", "Sports Medicine", "Fracture Care", "Spine Treatment", "Arthritis Management", "Physical Therapy"],
                about: "specialized orthopedic care focusing on bone, joint, and musculoskeletal health",
                keywords: ["orthopedics", "bone care", "joint replacement", "sports medicine", "spine treatment"]
            },
            dermatology: {
                tagline: "Healthy Skin, Confident You",
                services: ["Skin Cancer Screening", "Acne Treatment", "Cosmetic Dermatology", "Psoriasis Care", "Mole Removal", "Laser Treatments"],
                about: "expert dermatological care for all your skin, hair, and nail concerns",
                keywords: ["dermatology", "skin care", "acne treatment", "skin cancer screening", "cosmetic dermatology"]
            },
            pediatrics: {
                tagline: "Growing Healthy, Happy Children",
                services: ["Well-Child Visits", "Vaccinations", "Growth Monitoring", "Developmental Assessments", "Sick Child Care", "Adolescent Medicine"],
                about: "compassionate pediatric care supporting your child's health and development",
                keywords: ["pediatrics", "child healthcare", "vaccinations", "pediatrician", "children's health"]
            },
            'general medicine': {
                tagline: "Comprehensive Healthcare for Life",
                services: ["Annual Check-ups", "Preventive Care", "Chronic Disease Management", "Health Screenings", "Wellness Programs", "Urgent Care"],
                about: "personalized healthcare services for patients of all ages and medical needs",
                keywords: ["family medicine", "primary care", "healthcare", "medical center", "physician"]
            }
        };
    }

    // Initialize quality thresholds for content validation
    initializeQualityThresholds() {
        return {
            minTitleLength: 10,
            maxTitleLength: 100,
            minDescriptionLength: 50,
            maxDescriptionLength: 500,
            minServicesCount: 3,
            maxServicesCount: 10,
            minKeywordsCount: 3,
            maxKeywordsCount: 15
        };
    }

    // Test AI connectivity with enhanced error handling
    async testConnection() {
        try {
            const testPrompt = "Respond with exactly: 'AI connection successful'";
            const response = await this.generateContent(testPrompt);
            return {
                success: true,
                response: response.trim(),
                modelId: this.modelId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("AI Connection Test Failed:", error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Generate content using Bedrock with retry logic
    async generateContent(prompt, retryCount = 0) {
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(prompt);
            if (this.generationCache.has(cacheKey)) {
                return this.generationCache.get(cacheKey);
            }

            const payload = {
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 3000,
                temperature: 0.7,
                top_p: 0.9,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            };

            const command = new InvokeModelCommand({
                modelId: this.modelId,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify(payload)
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            
            const generatedText = responseBody.content[0].text;
            
            // Cache the result
            this.generationCache.set(cacheKey, generatedText);
            
            return generatedText;
        } catch (error) {
            console.error("Content generation error:", error);
            
            // Retry logic
            if (retryCount < this.maxRetries) {
                await this.delay(this.retryDelay * (retryCount + 1));
                return this.generateContent(prompt, retryCount + 1);
            }
            
            throw new ApiError(500, `Failed to generate content after ${this.maxRetries} retries: ${error.message}`);
        }
    }

    // Enhanced specialty detection with confidence scoring
    async detectMedicalSpecialty(transcription) {
        try {
            const lowerTranscription = transcription.toLowerCase();
            
            // Keyword-based detection with confidence scoring
            const keywordResults = this.detectSpecialtyByKeywords(lowerTranscription);
            
            // If high confidence, return keyword result
            if (keywordResults.confidence > 0.7) {
                return {
                    specialty: keywordResults.specialty,
                    confidence: keywordResults.confidence,
                    method: 'keyword'
                };
            }

            // AI-based detection for low confidence cases
            const aiResult = await this.detectSpecialtyByAI(transcription);
            
            return {
                specialty: aiResult.specialty,
                confidence: Math.max(keywordResults.confidence, aiResult.confidence),
                method: 'hybrid'
            };
        } catch (error) {
            console.error("Medical specialty detection error:", error);
            return {
                specialty: 'general medicine',
                confidence: 0.5,
                method: 'fallback'
            };
        }
    }

    // Keyword-based specialty detection with confidence scoring
    detectSpecialtyByKeywords(transcription) {
        let maxScore = 0;
        let detectedSpecialty = 'general medicine';
        const specialtyScores = {};

        for (const [specialty, keywords] of Object.entries(this.specialtyKeywords)) {
            let score = 0;
            let matchedKeywords = 0;
            
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = transcription.match(regex);
                if (matches) {
                    score += matches.length;
                    matchedKeywords++;
                }
            });

            // Normalize score based on transcription length and keyword count
            const normalizedScore = (score / transcription.length) * 1000 + (matchedKeywords / keywords.length) * 100;
            specialtyScores[specialty] = normalizedScore;

            if (normalizedScore > maxScore) {
                maxScore = normalizedScore;
                detectedSpecialty = specialty;
            }
        }

        const confidence = Math.min(maxScore / 50, 1); // Normalize to 0-1 range

        return {
            specialty: detectedSpecialty,
            confidence: confidence,
            scores: specialtyScores
        };
    }

    // AI-based specialty detection
    async detectSpecialtyByAI(transcription) {
        try {
            const prompt = `
            Analyze this medical practice description and identify the medical specialty. 
            Consider the services offered, target patients, and medical focus areas.
            
            Description: "${transcription}"
            
            Available specialties: Cardiology, Orthopedics, Dermatology, Pediatrics, Gynecology, 
            Neurology, Psychiatry, Oncology, Ophthalmology, Dentistry, Urology, Endocrinology, General Medicine.
            
            Respond with JSON format:
            {
                "specialty": "detected_specialty",
                "confidence": 0.8,
                "reasoning": "brief explanation"
            }
            `;

            const response = await this.generateContent(prompt);
            
            try {
                const parsed = JSON.parse(response);
                return {
                    specialty: parsed.specialty.toLowerCase(),
                    confidence: parsed.confidence || 0.6,
                    reasoning: parsed.reasoning
                };
            } catch (parseError) {
                // Fallback to simple text parsing
                const specialtyMatch = response.match(/specialty["\s]*:\s*["']?([^"',\n]+)/i);
                return {
                    specialty: specialtyMatch ? specialtyMatch[1].toLowerCase() : 'general medicine',
                    confidence: 0.5,
                    reasoning: 'Parsed from text response'
                };
            }
        } catch (error) {
            console.error("AI specialty detection error:", error);
            return {
                specialty: 'general medicine',
                confidence: 0.3,
                reasoning: 'Error fallback'
            };
        }
    }

    // Generate comprehensive website content with enhanced logic
    async generateWebsiteContent(transcription, specialty) {
        try {
            const specialtyLower = typeof specialty === 'string' ? specialty.toLowerCase() : specialty.specialty.toLowerCase();
            const template = this.contentTemplates[specialtyLower] || this.contentTemplates['general medicine'];
            const defaultTemplate = getTemplateBySpecialty(specialtyLower);

            const prompt = `
            Create professional medical website content for a ${specialtyLower} practice.
            
            Practice Description: "${transcription}"
            
            Generate comprehensive, professional content following this structure:
            
            {
                "websiteTitle": "Professional practice name (creative but professional)",
                "tagline": "Compelling tagline specific to ${specialtyLower}",
                "heroSection": {
                    "headline": "Primary headline that captures attention",
                    "subheadline": "Supporting text that builds trust and explains value",
                    "ctaText": "Action-oriented button text"
                },
                "aboutSection": {
                    "title": "About section heading",
                    "content": "Professional 2-3 paragraph about section that builds credibility",
                    "highlights": ["3-4 key practice highlights/differentiators"]
                },
                "services": [
                    {
                        "name": "Service Name",
                        "description": "Detailed service description",
                        "icon": "relevant-icon-name"
                    }
                ],
                "contactInfo": {
                    "phone": "Professional phone format",
                    "email": "Professional email address",
                    "address": "Complete professional address",
                    "hours": "Professional operating hours"
                },
                "seoMeta": {
                    "title": "SEO-optimized title (under 60 chars)",
                    "description": "SEO description (under 160 chars)",
                    "keywords": ["relevant", "seo", "keywords"]
                },
                "qualityScore": 0.85,
                "contentFeatures": ["feature1", "feature2", "feature3"]
            }

            Requirements:
            - Content must be professional and medically appropriate
            - Include 4-6 relevant services for ${specialtyLower}
            - Use compelling, trust-building language
            - Ensure all content is unique and engaging
            - Include location-appropriate contact information
            - SEO-optimize all meta content
            
            Base the content on the practice description provided, but enhance it professionally.
            `;

            const response = await this.generateContent(prompt);
            
            try {
                const parsedContent = JSON.parse(response);
                return this.validateAndEnhanceContent(parsedContent, specialtyLower, template, defaultTemplate);
            } catch (parseError) {
                console.warn("JSON parsing failed, using advanced fallback");
                return this.generateAdvancedFallbackContent(transcription, specialtyLower, template, defaultTemplate);
            }
        } catch (error) {
            console.error("Website content generation error:", error);
            throw new ApiError(500, `Failed to generate website content: ${error.message}`);
        }
    }

    // Validate and enhance AI-generated content with quality checks
    validateAndEnhanceContent(content, specialty, template, defaultTemplate) {
        const thresholds = this.contentQualityThresholds;
        
        // Validate and enhance each section
        const enhancedContent = {
            websiteTitle: this.validateAndEnhanceTitle(content.websiteTitle, specialty, defaultTemplate),
            tagline: content.tagline || template.tagline,
            heroSection: this.validateAndEnhanceHeroSection(content.heroSection, specialty),
            aboutSection: this.validateAndEnhanceAboutSection(content.aboutSection, specialty, template),
            services: this.validateAndEnhanceServices(content.services, specialty, template),
            contactInfo: this.validateAndEnhanceContactInfo(content.contactInfo, specialty),
            seoMeta: this.validateAndEnhanceSeoMeta(content.seoMeta, specialty, template),
            generatedAt: new Date().toISOString(),
            specialty: specialty,
            qualityScore: this.calculateQualityScore(content),
            contentFeatures: this.extractContentFeatures(content),
            validationPassed: true
        };

        return enhancedContent;
    }

    // Validate and enhance title
    validateAndEnhanceTitle(title, specialty, defaultTemplate) {
        if (!title || title.length < this.contentQualityThresholds.minTitleLength) {
            return defaultTemplate.template.websiteTitle || `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Medical Center`;
        }
        
        if (title.length > this.contentQualityThresholds.maxTitleLength) {
            return title.substring(0, this.contentQualityThresholds.maxTitleLength - 3) + '...';
        }
        
        return title;
    }

    // Validate and enhance hero section
    validateAndEnhanceHeroSection(heroSection, specialty) {
        return {
            headline: heroSection?.headline || `Expert ${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Care`,
            subheadline: heroSection?.subheadline || "Professional medical services with personalized care and attention",
            ctaText: heroSection?.ctaText || "Schedule Appointment"
        };
    }

    // Validate and enhance about section
    validateAndEnhanceAboutSection(aboutSection, specialty, template) {
        return {
            title: aboutSection?.title || "About Our Practice",
            content: aboutSection?.content || `We provide ${template.about} with experienced medical professionals dedicated to your health and wellbeing.`,
            highlights: aboutSection?.highlights || ["Experienced Medical Team", "State-of-the-Art Technology", "Patient-Centered Care"]
        };
    }

    // Validate and enhance services
    validateAndEnhanceServices(services, specialty, template) {
        if (!services || services.length < this.contentQualityThresholds.minServicesCount) {
            return template.services.map(service => ({
                name: service,
                description: `Professional ${service.toLowerCase()} services tailored to your needs`,
                icon: "medical-icon"
            }));
        }

        return services.slice(0, this.contentQualityThresholds.maxServicesCount).map(service => ({
            name: service.name || "Medical Service",
            description: service.description || "Professional medical service",
            icon: service.icon || "medical-icon"
        }));
    }

    // Validate and enhance contact info
    validateAndEnhanceContactInfo(contactInfo, specialty) {
        return {
            phone: contactInfo?.phone || "(555) 123-4567",
            email: contactInfo?.email || `info@${specialty.replace(/\s+/g, '')}practice.com`,
            address: contactInfo?.address || "123 Medical Center Drive, Healthcare City, HC 12345",
            hours: contactInfo?.hours || "Monday-Friday: 9:00 AM - 5:00 PM"
        };
    }

    // Validate and enhance SEO meta
    validateAndEnhanceSeoMeta(seoMeta, specialty, template) {
        return {
            title: seoMeta?.title || `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Specialist - Expert Medical Care`,
            description: seoMeta?.description || `Professional ${specialty} services with experienced specialists and personalized care.`,
            keywords: seoMeta?.keywords || template.keywords || [specialty, "medical", "healthcare", "treatment", "specialist"]
        };
    }

    // Calculate content quality score
    calculateQualityScore(content) {
        let score = 0;
        let maxScore = 0;

        // Title quality (20%)
        maxScore += 20;
        if (content.websiteTitle && content.websiteTitle.length >= 10) score += 20;

        // Services quality (30%)
        maxScore += 30;
        if (content.services && content.services.length >= 4) score += 30;
        else if (content.services && content.services.length >= 3) score += 20;

        // About section quality (20%)
        maxScore += 20;
        if (content.aboutSection && content.aboutSection.content && content.aboutSection.content.length >= 100) score += 20;

        // SEO quality (15%)
        maxScore += 15;
        if (content.seoMeta && content.seoMeta.title && content.seoMeta.description) score += 15;

        // Contact info quality (15%)
        maxScore += 15;
        if (content.contactInfo && content.contactInfo.phone && content.contactInfo.email) score += 15;

        return Math.round((score / maxScore) * 100) / 100;
    }

    // Extract content features
    extractContentFeatures(content) {
        const features = [];
        
        if (content.services && content.services.length > 5) features.push("comprehensive-services");
        if (content.aboutSection && content.aboutSection.highlights && content.aboutSection.highlights.length > 3) features.push("detailed-highlights");
        if (content.seoMeta && content.seoMeta.keywords && content.seoMeta.keywords.length > 5) features.push("seo-optimized");
        if (content.heroSection && content.heroSection.headline && content.heroSection.subheadline) features.push("compelling-hero");
        
        return features;
    }

    // Generate advanced fallback content when AI fails
    generateAdvancedFallbackContent(transcription, specialty, template, defaultTemplate) {
        const practiceTypes = {
            cardiology: "Cardiology",
            orthopedics: "Orthopedic", 
            dermatology: "Dermatology",
            pediatrics: "Pediatric",
            'general medicine': "Family Medicine"
        };

        const practiceType = practiceTypes[specialty] || "Medical";

        return {
            websiteTitle: `${practiceType} Medical Center`,
            tagline: template.tagline,
            heroSection: {
                headline: `Expert ${practiceType} Care`,
                subheadline: "Providing comprehensive medical services with personalized attention and advanced technology",
                ctaText: "Schedule Consultation"
            },
            aboutSection: {
                title: "About Our Practice",
                content: `Our ${practiceType.toLowerCase()} practice is dedicated to providing exceptional medical care with a focus on patient comfort and treatment excellence. We combine years of experience with the latest medical technologies to ensure the best possible outcomes for our patients.`,
                highlights: ["Experienced Medical Team", "Advanced Medical Technology", "Patient-Centered Approach", "Comprehensive Care"]
            },
            services: template.services.map(service => ({
                name: service,
                description: `Professional ${service.toLowerCase()} services delivered with expertise and care`,
                icon: "medical-icon"
            })),
            contactInfo: {
                phone: "(555) 123-4567",
                email: `info@${specialty.replace(/\s+/g, '')}medical.com`,
                address: "123 Medical Plaza, Healthcare City, HC 12345",
                hours: "Monday-Friday: 8:00 AM - 6:00 PM"
            },
            seoMeta: {
                title: `${practiceType} Medical Center - Expert Healthcare Services`,
                description: `Professional ${specialty} medical services with experienced specialists and comprehensive care options.`,
                keywords: template.keywords
            },
            generatedAt: new Date().toISOString(),
            specialty: specialty,
            qualityScore: 0.75,
            contentFeatures: ["professional-fallback", "template-based"],
            fallbackUsed: true,
            validationPassed: true
        };
    }

    // Generate content variations for A/B testing
    async generateContentVariations(transcription, specialty, variationCount = 2) {
        const variations = [];
        const specialtyInfo = typeof specialty === 'string' ? { specialty: specialty } : specialty;
        
        for (let i = 0; i < variationCount; i++) {
            try {
                // Add variation-specific instructions
                const variationPrompt = `
                Generate variation ${i + 1} of professional medical website content.
                Make this variation unique with different tone and approach:
                
                ${i === 0 ? 'Focus on trust and experience' : ''}
                ${i === 1 ? 'Focus on technology and innovation' : ''}
                ${i === 2 ? 'Focus on patient care and comfort' : ''}
                ${i === 3 ? 'Focus on comprehensive services' : ''}
                
                Practice: "${transcription}"
                Specialty: ${specialtyInfo.specialty}
                `;

                const content = await this.generateWebsiteContent(variationPrompt, specialtyInfo.specialty);
                
                variations.push({
                    id: `variation_${i + 1}`,
                    content: content,
                    focus: this.getVariationFocus(i),
                    createdAt: new Date().toISOString(),
                    qualityScore: content.qualityScore || 0.8
                });
            } catch (error) {
                console.error(`Failed to generate variation ${i + 1}:`, error);
                // Add fallback variation
                variations.push({
                    id: `variation_${i + 1}`,
                    content: this.generateAdvancedFallbackContent(transcription, specialtyInfo.specialty, 
                        this.contentTemplates[specialtyInfo.specialty], getTemplateBySpecialty(specialtyInfo.specialty)),
                    focus: 'fallback',
                    createdAt: new Date().toISOString(),
                    qualityScore: 0.7,
                    fallbackUsed: true
                });
            }
        }

        return variations;
    }

    // Get variation focus
    getVariationFocus(index) {
        const focuses = ['trust-experience', 'technology-innovation', 'patient-care', 'comprehensive-services'];
        return focuses[index] || 'general';
    }

    // Regenerate specific section
    async regenerateSection(transcription, specialty, sectionName) {
        try {
            const prompt = `
            Regenerate the ${sectionName} section for a ${specialty} medical practice.
            
            Practice Description: "${transcription}"
            Section: ${sectionName}
            
            Generate only the ${sectionName} content in JSON format:
            ${this.getSectionPrompt(sectionName)}
            
            Make it professional, engaging, and relevant to ${specialty}.
            `;

            const response = await this.generateContent(prompt);
            
            try {
                return JSON.parse(response);
            } catch (parseError) {
                return this.generateSectionFallback(sectionName, specialty);
            }
        } catch (error) {
            console.error(`Section regeneration error for ${sectionName}:`, error);
            return this.generateSectionFallback(sectionName, specialty);
        }
    }

    // Get section-specific prompt
    getSectionPrompt(sectionName) {
        const prompts = {
            heroSection: `{
                "headline": "Compelling main headline",
                "subheadline": "Supporting headline that builds trust",
                "ctaText": "Action button text"
            }`,
            aboutSection: `{
                "title": "About section title",
                "content": "Professional about content (2-3 paragraphs)",
                "highlights": ["highlight1", "highlight2", "highlight3"]
            }`,
            services: `[
                {
                    "name": "Service Name",
                    "description": "Service description",
                    "icon": "icon-name"
                }
            ]`
        };
        
        return prompts[sectionName] || '{}';
    }

    // Generate section fallback
    generateSectionFallback(sectionName, specialty) {
        const fallbacks = {
            heroSection: {
                headline: `Expert ${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Care`,
                subheadline: "Professional medical services with personalized attention",
                ctaText: "Schedule Appointment"
            },
            aboutSection: {
                title: "About Our Practice",
                content: `Our ${specialty} practice provides comprehensive medical care with a focus on patient wellbeing and treatment excellence.`,
                highlights: ["Experienced Team", "Advanced Technology", "Patient-Centered Care"]
            },
            services: [
                {
                    name: "Consultation",
                    description: "Comprehensive medical consultation",
                    icon: "consultation-icon"
                }
            ]
        };
        
        return fallbacks[sectionName] || {};
    }

    // Utility methods
    generateCacheKey(prompt) {
        return `cache_${Buffer.from(prompt).toString('base64').slice(0, 32)}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clear cache
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

export default new AIService();