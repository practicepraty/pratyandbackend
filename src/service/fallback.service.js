// src/service/fallback.service.js
import { DEFAULT_TEMPLATES, getTemplateBySpecialty } from "../config/templates.config.js";

class FallbackService {
  
  /**
   * Generate fallback content when AI service fails
   * @param {string} transcription - Original transcription
   * @param {string} detectedSpecialty - Detected medical specialty
   * @returns {Object} Fallback website content
   */
  static generateFallbackContent(transcription, detectedSpecialty = 'general medicine') {
    try {
      console.log(`Generating fallback content for specialty: ${detectedSpecialty}`);
      
      // Get template based on specialty
      const template = getTemplateBySpecialty(detectedSpecialty);
      
      if (!template) {
        throw new Error(`No template found for specialty: ${detectedSpecialty}`);
      }

      // Create personalized content based on transcription
      const personalizedContent = this.personalizeTemplate(template.template, transcription);
      
      return {
        ...personalizedContent,
        specialty: detectedSpecialty,
        fallbackUsed: true,
        confidenceScore: 0.6, // Lower confidence for fallback
        generationMethod: 'template_fallback'
      };
      
    } catch (error) {
      console.error('Fallback content generation failed:', error);
      return this.getEmergencyFallback(detectedSpecialty);
    }
  }

  /**
   * Personalize template content based on transcription
   * @param {Object} template - Template object
   * @param {string} transcription - Original transcription
   * @returns {Object} Personalized content
   */
  static personalizeTemplate(template, transcription) {
    const keywords = this.extractKeywords(transcription);
    const personalizedTemplate = JSON.parse(JSON.stringify(template)); // Deep clone
    
    // Personalize based on extracted keywords
    if (keywords.includes('emergency') || keywords.includes('urgent')) {
      personalizedTemplate.heroSection.ctaText = "Emergency Consultation";
      personalizedTemplate.contactInfo.hours = "24/7 Emergency Care Available";
    }
    
    if (keywords.includes('pediatric') || keywords.includes('children')) {
      personalizedTemplate.tagline = "Specialized Care for Children";
    }
    
    if (keywords.includes('senior') || keywords.includes('elderly')) {
      personalizedTemplate.tagline = "Comprehensive Care for Seniors";
    }
    
    // Add location-based personalization if mentioned
    const location = this.extractLocation(transcription);
    if (location) {
      personalizedTemplate.contactInfo.address = `${location} Medical Center`;
      personalizedTemplate.seoMeta.title = `${personalizedTemplate.websiteTitle} - ${location}`;
    }
    
    return personalizedTemplate;
  }

  /**
   * Extract keywords from transcription
   * @param {string} transcription - Text to analyze
   * @returns {Array} Array of keywords
   */
  static extractKeywords(transcription) {
    const text = transcription.toLowerCase();
    const keywords = [];
    
    // Medical keywords
    const medicalKeywords = [
      'emergency', 'urgent', 'pediatric', 'children', 'senior', 'elderly',
      'surgery', 'consultation', 'therapy', 'treatment', 'diagnosis',
      'preventive', 'screening', 'vaccination', 'wellness', 'rehabilitation'
    ];
    
    medicalKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    });
    
    return keywords;
  }

  /**
   * Extract location from transcription
   * @param {string} transcription - Text to analyze
   * @returns {string|null} Extracted location or null
   */
  static extractLocation(transcription) {
    const text = transcription.toLowerCase();
    
    // Common location indicators
    const locationPatterns = [
      /in\s+([a-z\s]+)/,
      /at\s+([a-z\s]+)/,
      /located\s+in\s+([a-z\s]+)/,
      /based\s+in\s+([a-z\s]+)/
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Filter out common words that aren't locations
        if (location.length > 2 && !['the', 'and', 'or', 'but'].includes(location)) {
          return location.charAt(0).toUpperCase() + location.slice(1);
        }
      }
    }
    
    return null;
  }

  /**
   * Get emergency fallback content when everything else fails
   * @param {string} specialty - Medical specialty
   * @returns {Object} Emergency fallback content
   */
  static getEmergencyFallback(specialty = 'general medicine') {
    return {
      websiteTitle: "Medical Practice",
      tagline: "Professional Healthcare Services",
      specialty: specialty,
      heroSection: {
        headline: "Professional Medical Care",
        subheadline: "Quality healthcare services tailored to your needs",
        ctaText: "Schedule Appointment"
      },
      aboutSection: {
        title: "About Our Practice",
        content: "We are dedicated to providing comprehensive medical care with a focus on patient-centered treatment and personalized healthcare solutions.",
        highlights: [
          "Licensed medical professionals",
          "Comprehensive health services",
          "Patient-centered care",
          "Modern medical facilities"
        ]
      },
      services: [
        {
          name: "Medical Consultation",
          description: "Comprehensive medical evaluation and consultation",
          icon: "medical-icon"
        },
        {
          name: "Health Screening",
          description: "Preventive health screenings and check-ups",
          icon: "screening-icon"
        },
        {
          name: "Treatment Planning",
          description: "Personalized treatment plans for optimal health outcomes",
          icon: "treatment-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 000-0000",
        email: "info@medicalpractice.com",
        address: "Medical Center, Healthcare City, HC 00000",
        hours: "Mon-Fri: 9:00 AM - 5:00 PM"
      },
      seoMeta: {
        title: "Medical Practice - Professional Healthcare Services",
        description: "Professional medical practice offering comprehensive healthcare services with experienced medical professionals.",
        keywords: ["medical practice", "healthcare", "medical services", "physician", "medical care"]
      },
      fallbackUsed: true,
      confidenceScore: 0.3,
      generationMethod: 'emergency_fallback'
    };
  }

  /**
   * Detect medical specialty from transcription using simple keyword matching
   * @param {string} transcription - Text to analyze
   * @returns {string} Detected specialty
   */
  static detectSpecialtyFallback(transcription) {
    const text = transcription.toLowerCase();
    
    // Specialty keywords mapping
    const specialtyKeywords = {
      'cardiology': ['heart', 'cardiac', 'cardiovascular', 'chest pain', 'blood pressure', 'ecg', 'ekg'],
      'orthopedics': ['bone', 'joint', 'fracture', 'spine', 'surgery', 'sports injury', 'arthritis'],
      'dermatology': ['skin', 'dermatology', 'acne', 'rash', 'mole', 'eczema', 'psoriasis'],
      'pediatrics': ['children', 'pediatric', 'kids', 'baby', 'infant', 'vaccination', 'growth'],
      'neurology': ['brain', 'neurological', 'headache', 'migraine', 'seizure', 'stroke', 'memory'],
      'gastroenterology': ['stomach', 'digestive', 'gastro', 'intestinal', 'liver', 'colonoscopy'],
      'psychiatry': ['mental health', 'depression', 'anxiety', 'psychiatric', 'therapy', 'counseling'],
      'ophthalmology': ['eye', 'vision', 'ophthalmology', 'glasses', 'cataract', 'glaucoma'],
      'urology': ['urinary', 'kidney', 'bladder', 'prostate', 'urology', 'urologist'],
      'oncology': ['cancer', 'oncology', 'chemotherapy', 'radiation', 'tumor', 'malignant']
    };
    
    // Count matches for each specialty
    const specialtyScores = {};
    
    Object.entries(specialtyKeywords).forEach(([specialty, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score++;
        }
      });
      specialtyScores[specialty] = score;
    });
    
    // Find specialty with highest score
    const detectedSpecialty = Object.keys(specialtyScores).reduce((a, b) => 
      specialtyScores[a] > specialtyScores[b] ? a : b
    );
    
    // Return detected specialty if score > 0, otherwise return general medicine
    return specialtyScores[detectedSpecialty] > 0 ? detectedSpecialty : 'general medicine';
  }

  /**
   * Validate generated content structure
   * @param {Object} content - Generated content
   * @returns {boolean} Whether content is valid
   */
  static validateContent(content) {
    const requiredFields = [
      'websiteTitle', 'tagline', 'heroSection', 'aboutSection', 
      'services', 'contactInfo', 'seoMeta'
    ];
    
    return requiredFields.every(field => {
      const hasField = content.hasOwnProperty(field);
      if (!hasField) {
        console.warn(`Missing required field: ${field}`);
      }
      return hasField;
    });
  }

  /**
   * Get content quality score
   * @param {Object} content - Generated content
   * @returns {number} Quality score between 0 and 1
   */
  static getContentQualityScore(content) {
    let score = 0;
    let maxScore = 0;
    
    // Check title quality
    maxScore += 10;
    if (content.websiteTitle && content.websiteTitle.length > 5) score += 10;
    
    // Check services count
    maxScore += 20;
    if (content.services && content.services.length >= 3) score += 20;
    else if (content.services && content.services.length > 0) score += 10;
    
    // Check content completeness
    maxScore += 30;
    if (content.aboutSection && content.aboutSection.content && content.aboutSection.content.length > 50) score += 30;
    
    // Check contact info
    maxScore += 20;
    if (content.contactInfo && content.contactInfo.phone && content.contactInfo.email) score += 20;
    
    // Check SEO meta
    maxScore += 20;
    if (content.seoMeta && content.seoMeta.title && content.seoMeta.description) score += 20;
    
    return score / maxScore;
  }
}

export default FallbackService;