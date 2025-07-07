// src/service/validation.service.js
import { ApiError } from "../utils/apierror.js";

class ValidationService {
  
  /**
   * Validate transcription input
   * @param {string} transcription - Input transcription
   * @returns {Object} Validation result
   */
  static validateTranscription(transcription) {
    const errors = [];
    
    // Check if transcription exists
    if (!transcription || !transcription.trim()) {
      errors.push("Transcription is required");
    }
    
    // Check minimum length
    if (transcription && transcription.trim().length < 10) {
      errors.push("Transcription must be at least 10 characters long");
    }
    
    // Check maximum length
    if (transcription && transcription.length > 10000) {
      errors.push("Transcription cannot exceed 10,000 characters");
    }
    
    // Check for potentially harmful content
    const harmfulPatterns = [
      /javascript:/i,
      /<script/i,
      /eval\(/i,
      /document\.cookie/i,
      /window\.location/i
    ];
    
    const hasHarmfulContent = harmfulPatterns.some(pattern => 
      pattern.test(transcription)
    );
    
    if (hasHarmfulContent) {
      errors.push("Transcription contains potentially harmful content");
    }
    
    // Check for medical relevance
    const medicalKeywords = [
      'medical', 'health', 'doctor', 'patient', 'treatment', 'diagnosis',
      'medicine', 'healthcare', 'clinic', 'hospital', 'therapy', 'care',
      'practice', 'specialist', 'physician', 'nurse', 'consultation'
    ];
    
    const hasMedicalContent = medicalKeywords.some(keyword => 
      transcription.toLowerCase().includes(keyword)
    );
    
    if (!hasMedicalContent) {
      errors.push("Transcription should contain medical or healthcare related content");
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: this.getTranscriptionWarnings(transcription)
    };
  }

  /**
   * Get warnings for transcription
   * @param {string} transcription - Input transcription
   * @returns {Array} Array of warnings
   */
  static getTranscriptionWarnings(transcription) {
    const warnings = [];
    
    // Check for very short transcription
    if (transcription && transcription.trim().length < 50) {
      warnings.push("Short transcription may result in generic content");
    }
    
    // Check for lack of specific details
    const specificKeywords = [
      'specialize', 'expert', 'experienced', 'years', 'certified',
      'board', 'fellowship', 'trained', 'education', 'university'
    ];
    
    const hasSpecificDetails = specificKeywords.some(keyword => 
      transcription.toLowerCase().includes(keyword)
    );
    
    if (!hasSpecificDetails) {
      warnings.push("Adding specific details about expertise may improve content quality");
    }
    
    return warnings;
  }

  /**
   * Validate generated website content
   * @param {Object} content - Generated content
   * @returns {Object} Validation result
   */
  static validateWebsiteContent(content) {
    const errors = [];
    const warnings = [];
    
    // Required fields validation
    const requiredFields = [
      'websiteTitle', 'tagline', 'heroSection', 'aboutSection',
      'services', 'contactInfo', 'seoMeta'
    ];
    
    requiredFields.forEach(field => {
      if (!content[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Hero section validation
    if (content.heroSection) {
      if (!content.heroSection.headline || content.heroSection.headline.length < 5) {
        errors.push("Hero section headline is required and must be at least 5 characters");
      }
      
      if (!content.heroSection.subheadline || content.heroSection.subheadline.length < 10) {
        errors.push("Hero section subheadline is required and must be at least 10 characters");
      }
    }
    
    // About section validation
    if (content.aboutSection) {
      if (!content.aboutSection.title || content.aboutSection.title.length < 5) {
        errors.push("About section title is required and must be at least 5 characters");
      }
      
      if (!content.aboutSection.content || content.aboutSection.content.length < 50) {
        errors.push("About section content is required and must be at least 50 characters");
      }
    }
    
    // Services validation
    if (content.services) {
      if (!Array.isArray(content.services)) {
        errors.push("Services must be an array");
      } else {
        if (content.services.length === 0) {
          warnings.push("No services provided - consider adding medical services");
        }
        
        content.services.forEach((service, index) => {
          if (!service.name || service.name.length < 2) {
            errors.push(`Service ${index + 1}: Name is required and must be at least 2 characters`);
          }
          
          if (!service.description || service.description.length < 10) {
            errors.push(`Service ${index + 1}: Description is required and must be at least 10 characters`);
          }
        });
      }
    }
    
    // Contact info validation
    if (content.contactInfo) {
      if (!content.contactInfo.phone || !this.isValidPhone(content.contactInfo.phone)) {
        errors.push("Valid phone number is required");
      }
      
      if (!content.contactInfo.email || !this.isValidEmail(content.contactInfo.email)) {
        errors.push("Valid email address is required");
      }
      
      if (!content.contactInfo.address || content.contactInfo.address.length < 10) {
        errors.push("Address is required and must be at least 10 characters");
      }
    }
    
    // SEO meta validation
    if (content.seoMeta) {
      if (!content.seoMeta.title || content.seoMeta.title.length < 10 || content.seoMeta.title.length > 60) {
        errors.push("SEO title is required and must be between 10-60 characters");
      }
      
      if (!content.seoMeta.description || content.seoMeta.description.length < 50 || content.seoMeta.description.length > 160) {
        errors.push("SEO description is required and must be between 50-160 characters");
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      quality: this.calculateContentQuality(content)
    };
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number
   * @returns {boolean} Whether phone is valid
   */
  static isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} Whether email is valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Calculate content quality score
   * @param {Object} content - Website content
   * @returns {number} Quality score between 0 and 1
   */
  static calculateContentQuality(content) {
    let score = 0;
    let maxScore = 0;
    
    // Title quality (10 points)
    maxScore += 10;
    if (content.websiteTitle && content.websiteTitle.length > 10) score += 10;
    else if (content.websiteTitle && content.websiteTitle.length > 5) score += 5;
    
    // Services count (20 points)
    maxScore += 20;
    if (content.services && content.services.length >= 5) score += 20;
    else if (content.services && content.services.length >= 3) score += 15;
    else if (content.services && content.services.length > 0) score += 10;
    
    // Content completeness (30 points)
    maxScore += 30;
    if (content.aboutSection && content.aboutSection.content) {
      if (content.aboutSection.content.length > 200) score += 30;
      else if (content.aboutSection.content.length > 100) score += 20;
      else if (content.aboutSection.content.length > 50) score += 10;
    }
    
    // Contact completeness (20 points)
    maxScore += 20;
    if (content.contactInfo) {
      let contactScore = 0;
      if (content.contactInfo.phone) contactScore += 5;
      if (content.contactInfo.email) contactScore += 5;
      if (content.contactInfo.address) contactScore += 5;
      if (content.contactInfo.hours) contactScore += 5;
      score += contactScore;
    }
    
    // SEO optimization (20 points)
    maxScore += 20;
    if (content.seoMeta) {
      let seoScore = 0;
      if (content.seoMeta.title && content.seoMeta.title.length <= 60) seoScore += 10;
      if (content.seoMeta.description && content.seoMeta.description.length <= 160) seoScore += 10;
      score += seoScore;
    }
    
    return score / maxScore;
  }

  /**
   * Validate user input for content updates
   * @param {Object} updateData - Update data
   * @returns {Object} Validation result
   */
  static validateUpdateData(updateData) {
    const errors = [];
    const allowedFields = [
      'websiteTitle', 'tagline', 'heroSection', 'aboutSection',
      'services', 'contactInfo', 'seoMeta', 'customizations', 'status'
    ];
    
    // Check for invalid fields
    Object.keys(updateData).forEach(field => {
      if (!allowedFields.includes(field)) {
        errors.push(`Invalid field: ${field}`);
      }
    });
    
    // Validate specific fields if present
    if (updateData.websiteTitle && updateData.websiteTitle.length < 5) {
      errors.push("Website title must be at least 5 characters");
    }
    
    if (updateData.status && !['draft', 'published', 'archived'].includes(updateData.status)) {
      errors.push("Status must be 'draft', 'published', or 'archived'");
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Sanitize content to prevent XSS and other issues
   * @param {Object} content - Content to sanitize
   * @returns {Object} Sanitized content
   */
  static sanitizeContent(content) {
    const sanitized = JSON.parse(JSON.stringify(content)); // Deep clone
    
    // Function to sanitize strings
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      
      return str
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    };
    
    // Recursively sanitize object properties
    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      const sanitizedObj = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitizedObj[key] = sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitizedObj[key] = sanitizeObject(value);
        } else {
          sanitizedObj[key] = value;
        }
      }
      
      return sanitizedObj;
    };
    
    return sanitizeObject(sanitized);
  }
}

export default ValidationService;