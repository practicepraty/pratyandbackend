import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ApiError } from '../utils/apierror.js';
import { config } from '../config/environment.js';
import loggingService from './loggingService.js';
import { Website } from '../models/website.models.js';

class ContentRegenerationService {
    constructor() {
        this.bedrockClient = new BedrockRuntimeClient({
            region: config.aws.bedrockRegion || 'us-east-1',
            credentials: {
                accessKeyId: config.aws.accessKeyId,
                secretAccessKey: config.aws.secretAccessKey
            }
        });
        
        this.modelId = config.ai.modelId || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
        this.maxTokens = config.ai.maxTokens || 2000;
        this.timeout = config.ai.timeout || 30000;
    }

    async regenerateSection(websiteId, sectionId, prompt, currentContent, userId, options = {}) {
        try {
            const { fieldId, action = 'regenerate', targetAudience = 'patients', keywords = [] } = options;
            
            // Verify user owns the website
            const website = await Website.findOne({
                _id: websiteId,
                userId: userId,
                isActive: true
            });

            if (!website) {
                throw new ApiError(404, "Website not found or access denied");
            }

            const regenerationPrompt = `You are an expert medical website content creator specializing in ${website.specialty} practices.

Website Context:
- Specialty: ${website.specialty}
- Practice: ${website.websiteTitle}
- Section: ${sectionId}
- Field: ${fieldId || 'general'}
- Action: ${action}
- Target Audience: ${targetAudience}
- Keywords to include: ${keywords.join(', ')}

Current Content: 
${currentContent}

Regeneration Instructions: 
${prompt}

Please regenerate this content following these guidelines:
1. Maintain medical professionalism and accuracy
2. Use patient-friendly language when appropriate
3. Include relevant medical terminology for SEO
4. Ensure content builds trust and credibility
5. Keep the content length similar to the original unless specified otherwise
6. Follow HIPAA-compliant communication standards
7. Incorporate the provided keywords naturally
8. Tailor the tone for the target audience

Return your response in this exact JSON format:
{
  "content": "regenerated content here",
  "alternatives": [
    "Alternative version 1",
    "Alternative version 2", 
    "Alternative version 3"
  ],
  "changes": [
    {"type": "improvement_type", "description": "specific change made"},
    {"type": "improvement_type", "description": "specific change made"}
  ],
  "confidence": 0.95,
  "wordCount": 150,
  "improvements": [
    "List of key improvements made",
    "Another improvement"
  ],
  "suggestedAction": "approve",
  "keywordsUsed": ["keyword1", "keyword2"],
  "toneAnalysis": {
    "current": "professional",
    "target": "friendly",
    "achieved": "professional-friendly"
  }
}`;

            const result = await this.callBedrock(regenerationPrompt);
            
            // Log the regeneration
            loggingService.logAIUsage('content_regeneration', {
                websiteId,
                sectionId,
                fieldId,
                userId,
                action,
                promptLength: prompt.length,
                originalContentLength: currentContent.length,
                regeneratedContentLength: result.content ? result.content.length : 0,
                confidence: result.confidence
            });

            return {
                websiteId,
                sectionId,
                fieldId,
                originalContent: currentContent,
                regeneratedContent: result.content,
                alternatives: result.alternatives || [],
                changes: result.changes || [],
                confidence: result.confidence || 0.9,
                wordCount: result.wordCount || this.countWords(result.content),
                improvements: result.improvements || [],
                suggestedAction: result.suggestedAction || 'review',
                keywordsUsed: result.keywordsUsed || [],
                toneAnalysis: result.toneAnalysis || {},
                metadata: {
                    specialty: website.specialty,
                    regeneratedAt: new Date(),
                    model: this.modelId,
                    promptUsed: prompt,
                    action,
                    targetAudience,
                    requestedKeywords: keywords
                }
            };

        } catch (error) {
            loggingService.logError('Content regeneration failed', error, { websiteId, sectionId, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to regenerate content: ${error.message}`);
        }
    }

    async improveContent(content, improvementType, specialty, userId) {
        try {
            const improvementPrompts = {
                clarity: "Make this content clearer and easier to understand for patients",
                professionalism: "Enhance the professional tone while maintaining approachability",
                seo: "Optimize for search engines while maintaining readability",
                engagement: "Make this content more engaging and compelling for website visitors",
                medical_accuracy: "Ensure medical accuracy and add relevant clinical terminology",
                patient_friendly: "Make this more patient-friendly and less technical",
                trust_building: "Enhance trust-building elements and credibility"
            };

            const prompt = `You are an expert medical content writer specializing in ${specialty}.

Current Content:
${content}

Improvement Focus: ${improvementType}
Instruction: ${improvementPrompts[improvementType] || "Improve the overall quality of this content"}

Guidelines:
1. Maintain factual accuracy and medical professionalism
2. Use appropriate medical terminology for the specialty
3. Ensure content builds patient trust and confidence
4. Follow healthcare communication best practices
5. Keep the improved content similar in length

Return your response in this exact JSON format:
{
  "content": "improved content here",
  "improvements": [
    {"type": "${improvementType}", "description": "specific improvement made"},
    {"type": "${improvementType}", "description": "another improvement made"}
  ],
  "confidence": 0.92,
  "wordCount": 120,
  "qualityScore": 0.88,
  "seoKeywords": ["keyword1", "keyword2", "keyword3"]
}`;

            const result = await this.callBedrock(prompt);
            
            // Log the improvement
            loggingService.logAIUsage('content_improvement', {
                improvementType,
                specialty,
                userId,
                originalContentLength: content.length,
                improvedContentLength: result.content ? result.content.length : 0,
                confidence: result.confidence
            });

            return {
                originalContent: content,
                improvedContent: result.content,
                improvementType,
                improvements: result.improvements || [],
                confidence: result.confidence || 0.9,
                wordCount: result.wordCount || this.countWords(result.content),
                qualityScore: result.qualityScore || 0.85,
                seoKeywords: result.seoKeywords || [],
                metadata: {
                    specialty,
                    improvedAt: new Date(),
                    model: this.modelId
                }
            };

        } catch (error) {
            loggingService.logError('Content improvement failed', error, { improvementType, specialty, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to improve content: ${error.message}`);
        }
    }

    async generateVariations(content, variationCount, focus, specialty, userId) {
        try {
            const prompt = `You are an expert medical content writer specializing in ${specialty}.

Original Content:
${content}

Generate ${variationCount} distinct variations of this content with focus on: ${focus}

Requirements:
1. Each variation should maintain the core message
2. Use different phrasing and structure
3. Maintain medical accuracy and professionalism
4. Vary the tone slightly (professional, warm, authoritative, etc.)
5. Each should be appropriate for ${specialty} practice

Return your response in this exact JSON format:
{
  "variations": [
    {
      "content": "variation 1 text",
      "tone": "professional",
      "confidence": 0.9,
      "wordCount": 150
    },
    {
      "content": "variation 2 text", 
      "tone": "warm",
      "confidence": 0.88,
      "wordCount": 145
    }
  ],
  "recommendedVariation": 0,
  "overallConfidence": 0.89
}`;

            const result = await this.callBedrock(prompt);
            
            // Log the variation generation
            loggingService.logAIUsage('content_variations', {
                variationCount,
                focus,
                specialty,
                userId,
                originalContentLength: content.length,
                variationsGenerated: result.variations ? result.variations.length : 0
            });

            return {
                originalContent: content,
                variations: result.variations || [],
                recommendedVariation: result.recommendedVariation || 0,
                overallConfidence: result.overallConfidence || 0.85,
                focus,
                metadata: {
                    specialty,
                    generatedAt: new Date(),
                    model: this.modelId,
                    requestedCount: variationCount
                }
            };

        } catch (error) {
            loggingService.logError('Content variation generation failed', error, { variationCount, focus, specialty, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to generate content variations: ${error.message}`);
        }
    }

    async optimizeForSEO(content, targetKeywords, contentType, userId) {
        try {
            const keywordList = Array.isArray(targetKeywords) ? targetKeywords.join(', ') : targetKeywords || '';
            
            const prompt = `You are an SEO expert specializing in medical practice websites.

Content Type: ${contentType}
Current Content:
${content}

Target Keywords: ${keywordList}

Optimize this content for SEO while maintaining:
1. Natural readability and flow
2. Medical accuracy and professionalism
3. Patient-friendly language
4. Keyword integration that feels organic
5. Search engine optimization best practices

Return your response in this exact JSON format:
{
  "optimizedContent": "SEO optimized content here",
  "seoImprovements": [
    {"type": "keyword_integration", "description": "Added target keywords naturally"},
    {"type": "structure", "description": "Improved content structure for SEO"}
  ],
  "keywordDensity": {
    "keyword1": 2.5,
    "keyword2": 1.8
  },
  "seoScore": 0.85,
  "confidence": 0.91,
  "recommendations": [
    "Add more internal linking opportunities",
    "Consider adding FAQ section"
  ]
}`;

            const result = await this.callBedrock(prompt);
            
            // Log the SEO optimization
            loggingService.logAIUsage('seo_optimization', {
                contentType,
                targetKeywords: keywordList,
                userId,
                originalContentLength: content.length,
                optimizedContentLength: result.optimizedContent ? result.optimizedContent.length : 0,
                seoScore: result.seoScore
            });

            return {
                originalContent: content,
                optimizedContent: result.optimizedContent,
                seoImprovements: result.seoImprovements || [],
                keywordDensity: result.keywordDensity || {},
                seoScore: result.seoScore || 0.8,
                confidence: result.confidence || 0.9,
                recommendations: result.recommendations || [],
                metadata: {
                    contentType,
                    targetKeywords: keywordList,
                    optimizedAt: new Date(),
                    model: this.modelId
                }
            };

        } catch (error) {
            loggingService.logError('SEO optimization failed', error, { contentType, targetKeywords, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to optimize content for SEO: ${error.message}`);
        }
    }

    async checkContentQuality(content, contentType, specialty, userId) {
        try {
            const prompt = `You are a medical content quality expert specializing in ${specialty}.

Content Type: ${contentType}
Content to Analyze:
${content}

Analyze this content for:
1. Medical accuracy and appropriateness
2. Professional tone and clarity
3. Patient-friendliness and accessibility
4. SEO potential and keyword usage
5. Trust-building elements
6. Grammar and readability
7. Compliance with healthcare communication standards

Return your response in this exact JSON format:
{
  "qualityScore": 0.85,
  "analysis": {
    "medicalAccuracy": 0.9,
    "professionalism": 0.8,
    "patientFriendly": 0.85,
    "seoOptimization": 0.7,
    "trustBuilding": 0.9,
    "readability": 0.85
  },
  "strengths": [
    "Professional and trustworthy tone",
    "Clear explanation of procedures"
  ],
  "improvements": [
    "Add more patient testimonials",
    "Include more specific medical keywords"
  ],
  "recommendations": [
    "Consider adding FAQ section",
    "Include call-to-action"
  ],
  "riskFactors": [],
  "confidence": 0.92
}`;

            const result = await this.callBedrock(prompt);
            
            // Log the quality check
            loggingService.logAIUsage('content_quality_check', {
                contentType,
                specialty,
                userId,
                contentLength: content.length,
                qualityScore: result.qualityScore
            });

            return {
                content,
                qualityScore: result.qualityScore || 0.8,
                analysis: result.analysis || {},
                strengths: result.strengths || [],
                improvements: result.improvements || [],
                recommendations: result.recommendations || [],
                riskFactors: result.riskFactors || [],
                confidence: result.confidence || 0.9,
                metadata: {
                    contentType,
                    specialty,
                    checkedAt: new Date(),
                    model: this.modelId
                }
            };

        } catch (error) {
            loggingService.logError('Content quality check failed', error, { contentType, specialty, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to check content quality: ${error.message}`);
        }
    }

    async getContentSuggestions(content, sectionType, specialty, userId) {
        try {
            const prompt = `You are a medical website content strategist specializing in ${specialty}.

Section Type: ${sectionType}
Current Content:
${content}

Provide content suggestions to improve this ${sectionType} section for a ${specialty} practice:

Return your response in this exact JSON format:
{
  "suggestions": [
    {
      "type": "addition",
      "title": "Add Patient Testimonials",
      "description": "Include patient success stories to build trust",
      "priority": "high",
      "implementation": "Add 2-3 testimonials below the main content"
    },
    {
      "type": "improvement",
      "title": "Enhance Call-to-Action",
      "description": "Make the CTA more compelling and specific",
      "priority": "medium",
      "implementation": "Change generic 'Contact Us' to 'Schedule Your Consultation'"
    }
  ],
  "bestPractices": [
    "Use patient-centered language",
    "Include relevant medical keywords"
  ],
  "examplePhrases": [
    "Our experienced team specializes in...",
    "We understand your concerns about..."
  ],
  "seoOpportunities": [
    "Add location-based keywords",
    "Include service-specific terms"
  ],
  "confidence": 0.88
}`;

            const result = await this.callBedrock(prompt);
            
            // Log the suggestion generation
            loggingService.logAIUsage('content_suggestions', {
                sectionType,
                specialty,
                userId,
                contentLength: content.length,
                suggestionsCount: result.suggestions ? result.suggestions.length : 0
            });

            return {
                content,
                sectionType,
                suggestions: result.suggestions || [],
                bestPractices: result.bestPractices || [],
                examplePhrases: result.examplePhrases || [],
                seoOpportunities: result.seoOpportunities || [],
                confidence: result.confidence || 0.85,
                metadata: {
                    specialty,
                    generatedAt: new Date(),
                    model: this.modelId
                }
            };

        } catch (error) {
            loggingService.logError('Content suggestions generation failed', error, { sectionType, specialty, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to generate content suggestions: ${error.message}`);
        }
    }

    async callBedrock(prompt) {
        try {
            const command = new InvokeModelCommand({
                modelId: this.modelId,
                body: JSON.stringify({
                    anthropic_version: 'bedrock-2023-05-31',
                    max_tokens: this.maxTokens,
                    messages: [{ 
                        role: 'user', 
                        content: prompt 
                    }],
                    temperature: 0.7,
                    top_p: 0.9
                })
            });

            const response = await this.bedrockClient.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            
            if (!responseBody.content || !responseBody.content[0] || !responseBody.content[0].text) {
                throw new Error('Invalid response from Bedrock');
            }
            
            try {
                return JSON.parse(responseBody.content[0].text);
            } catch (parseError) {
                // If JSON parsing fails, return a fallback response
                loggingService.logError('Failed to parse Bedrock response as JSON', parseError, { 
                    response: responseBody.content[0].text 
                });
                return {
                    content: responseBody.content[0].text,
                    confidence: 0.7,
                    error: 'Failed to parse structured response'
                };
            }

        } catch (error) {
            loggingService.logError('Bedrock API call failed', error);
            throw new ApiError(500, `AI service unavailable: ${error.message}`);
        }
    }

    // Helper method to count words
    countWords(text) {
        if (!text || typeof text !== 'string') return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    // Adjust content tone
    async adjustTone(content, targetTone, audience, specialty = 'general medicine', userId) {
        try {
            const prompt = `You are a medical content tone specialist.

Content to adjust:
${content}

Target Tone: ${targetTone}
Target Audience: ${audience}
Medical Specialty: ${specialty}

Adjust the tone of this content while maintaining:
1. Medical accuracy and professionalism
2. Appropriate terminology for the specialty
3. Clear, understandable language for the audience
4. Trust-building elements

Return your response in this exact JSON format:
{
  "adjustedContent": "tone-adjusted content here",
  "toneChanges": [
    {"from": "formal", "to": "friendly", "description": "Made language more approachable"},
    {"aspect": "terminology", "change": "simplified medical terms"}
  ],
  "audienceAppropriate": true,
  "confidence": 0.92,
  "suggestedImprovements": [
    "Consider adding patient testimonials",
    "Include more empathetic language"
  ]
}`;

            const result = await this.callBedrock(prompt);
            
            loggingService.logAIUsage('tone_adjustment', {
                targetTone,
                audience,
                specialty,
                userId,
                originalContentLength: content.length,
                adjustedContentLength: result.adjustedContent ? result.adjustedContent.length : 0
            });

            return {
                originalContent: content,
                adjustedContent: result.adjustedContent,
                toneChanges: result.toneChanges || [],
                audienceAppropriate: result.audienceAppropriate || true,
                confidence: result.confidence || 0.9,
                suggestedImprovements: result.suggestedImprovements || [],
                metadata: {
                    targetTone,
                    audience,
                    specialty,
                    adjustedAt: new Date(),
                    model: this.modelId
                }
            };

        } catch (error) {
            loggingService.logError('Tone adjustment failed', error, { targetTone, audience, specialty, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to adjust tone: ${error.message}`);
        }
    }

    // Expand content
    async expandContent(content, expansionType = 'detailed', targetLength, specialty = 'general medicine', userId) {
        try {
            const prompt = `You are a medical content expansion specialist.

Content to expand:
${content}

Expansion Type: ${expansionType}
Target Length: ${targetLength ? `approximately ${targetLength} words` : 'significantly longer'}
Medical Specialty: ${specialty}

Expand this content while:
1. Maintaining medical accuracy
2. Adding valuable information for patients
3. Including relevant medical terminology
4. Keeping the content engaging and informative
5. Following logical structure and flow

Return your response in this exact JSON format:
{
  "expandedContent": "expanded content here",
  "addedElements": [
    {"type": "detail", "description": "Added procedure explanation"},
    {"type": "benefit", "description": "Included patient benefits"}
  ],
  "wordCount": 250,
  "expansionRatio": 2.1,
  "confidence": 0.88,
  "qualityScore": 0.92
}`;

            const result = await this.callBedrock(prompt);
            
            loggingService.logAIUsage('content_expansion', {
                expansionType,
                targetLength,
                specialty,
                userId,
                originalContentLength: content.length,
                expandedContentLength: result.expandedContent ? result.expandedContent.length : 0
            });

            return {
                originalContent: content,
                expandedContent: result.expandedContent,
                addedElements: result.addedElements || [],
                wordCount: result.wordCount || this.countWords(result.expandedContent),
                expansionRatio: result.expansionRatio || 1.5,
                confidence: result.confidence || 0.9,
                qualityScore: result.qualityScore || 0.85,
                metadata: {
                    expansionType,
                    targetLength,
                    specialty,
                    expandedAt: new Date(),
                    model: this.modelId
                }
            };

        } catch (error) {
            loggingService.logError('Content expansion failed', error, { expansionType, specialty, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to expand content: ${error.message}`);
        }
    }

    // Shorten content
    async shortenContent(content, targetLength, preserveKeyPoints = true, specialty = 'general medicine', userId) {
        try {
            const prompt = `You are a medical content conciseness specialist.

Content to shorten:
${content}

Target Length: ${targetLength ? `approximately ${targetLength} words` : 'significantly shorter'}
Preserve Key Points: ${preserveKeyPoints}
Medical Specialty: ${specialty}

Shorten this content while:
1. Maintaining medical accuracy and essential information
2. Preserving key points and critical details
3. Keeping the professional tone
4. Ensuring clarity and readability
5. Maintaining patient trust elements

Return your response in this exact JSON format:
{
  "shortenedContent": "shortened content here",
  "removedElements": [
    {"type": "redundancy", "description": "Removed repetitive information"},
    {"type": "detail", "description": "Condensed technical explanation"}
  ],
  "wordCount": 120,
  "compressionRatio": 0.6,
  "keyPointsPreserved": ["benefit 1", "benefit 2", "key info"],
  "confidence": 0.91,
  "readabilityScore": 0.88
}`;

            const result = await this.callBedrock(prompt);
            
            loggingService.logAIUsage('content_shortening', {
                targetLength,
                preserveKeyPoints,
                specialty,
                userId,
                originalContentLength: content.length,
                shortenedContentLength: result.shortenedContent ? result.shortenedContent.length : 0
            });

            return {
                originalContent: content,
                shortenedContent: result.shortenedContent,
                removedElements: result.removedElements || [],
                wordCount: result.wordCount || this.countWords(result.shortenedContent),
                compressionRatio: result.compressionRatio || 0.7,
                keyPointsPreserved: result.keyPointsPreserved || [],
                confidence: result.confidence || 0.9,
                readabilityScore: result.readabilityScore || 0.85,
                metadata: {
                    targetLength,
                    preserveKeyPoints,
                    specialty,
                    shortenedAt: new Date(),
                    model: this.modelId
                }
            };

        } catch (error) {
            loggingService.logError('Content shortening failed', error, { targetLength, specialty, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to shorten content: ${error.message}`);
        }
    }

    // Enhanced content analysis for frontend
    async analyzeContentForFrontend(content, sectionType, specialty = 'general medicine', userId) {
        try {
            const prompt = `You are a medical content analysis expert.

Content to analyze:
${content}

Section Type: ${sectionType}
Medical Specialty: ${specialty}

Provide a comprehensive analysis of this content including:
1. Content quality and effectiveness
2. Patient engagement potential
3. SEO optimization opportunities
4. Medical accuracy assessment
5. Trust-building elements
6. Accessibility and readability

Return your response in this exact JSON format:
{
  "analysis": {
    "qualityScore": 0.85,
    "engagementScore": 0.78,
    "seoScore": 0.72,
    "medicalAccuracy": 0.95,
    "trustScore": 0.88,
    "readabilityScore": 0.82
  },
  "strengths": [
    "Clear medical explanations",
    "Professional tone",
    "Patient-focused language"
  ],
  "weaknesses": [
    "Limited SEO keywords",
    "Could use more patient testimonials"
  ],
  "recommendations": [
    {
      "type": "seo",
      "priority": "high",
      "description": "Add location-based keywords",
      "implementation": "Include city and specialty terms"
    },
    {
      "type": "engagement",
      "priority": "medium", 
      "description": "Add patient success stories",
      "implementation": "Include 1-2 brief testimonials"
    }
  ],
  "keywordOpportunities": ["cardiology", "heart health", "cardiac care"],
  "toneAnalysis": {
    "current": "professional",
    "appropriateness": "high",
    "suggestions": ["Add more empathetic language"]
  },
  "confidence": 0.92
}`;

            const result = await this.callBedrock(prompt);
            
            loggingService.logAIUsage('content_analysis', {
                sectionType,
                specialty,
                userId,
                contentLength: content.length
            });

            return {
                content,
                sectionType,
                analysis: result.analysis || {},
                strengths: result.strengths || [],
                weaknesses: result.weaknesses || [],
                recommendations: result.recommendations || [],
                keywordOpportunities: result.keywordOpportunities || [],
                toneAnalysis: result.toneAnalysis || {},
                confidence: result.confidence || 0.9,
                metadata: {
                    specialty,
                    analyzedAt: new Date(),
                    model: this.modelId
                }
            };

        } catch (error) {
            loggingService.logError('Content analysis failed', error, { sectionType, specialty, userId });
            throw error instanceof ApiError ? error : new ApiError(500, `Failed to analyze content: ${error.message}`);
        }
    }

    // Get service statistics
    getServiceStats() {
        return {
            modelId: this.modelId,
            maxTokens: this.maxTokens,
            timeout: this.timeout,
            isConfigured: !!(this.bedrockClient && config.aws.accessKeyId),
            supportedActions: [
                'regenerate', 'improve', 'optimize-seo', 'adjust-tone', 
                'expand', 'shorten', 'analyze', 'suggestions'
            ]
        };
    }
}

export default new ContentRegenerationService();