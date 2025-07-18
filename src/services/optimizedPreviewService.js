// Optimized preview service with better caching and error handling
import { Website } from "../models/website.models.js";
import { ApiError } from "../utils/apierror.js";
import { PreviewGenerator } from "./previewGenerator.js";
import { safeRedisOperation } from "../config/redis.config.js";
import crypto from 'crypto';

class OptimizedPreviewService {
  constructor() {
    this.memoryCache = new Map();
    this.previewGenerator = new PreviewGenerator();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
    this.maxCacheSize = 100; // Maximum cache entries
  }

  // Generate cache key for preview
  generateCacheKey(websiteId, deviceType, zoom, userId) {
    const keyData = `${websiteId}:${deviceType}:${zoom}:${userId}`;
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  // Get preview from cache (Redis or memory)
  async getPreviewFromCache(cacheKey) {
    // Try Redis first
    const redisResult = await safeRedisOperation(
      async (client) => {
        const cached = await client.get(`preview:${cacheKey}`);
        return cached ? JSON.parse(cached) : null;
      },
      null
    );
    
    if (redisResult) {
      return redisResult;
    }

    // Fallback to memory cache
    const memoryResult = this.memoryCache.get(cacheKey);
    if (memoryResult && Date.now() - memoryResult.timestamp < this.cacheExpiry) {
      return memoryResult.data;
    }

    return null;
  }

  // Store preview in cache
  async storePreviewInCache(cacheKey, previewData) {
    const cacheEntry = {
      data: previewData,
      timestamp: Date.now()
    };

    // Store in Redis with TTL
    await safeRedisOperation(
      async (client) => {
        await client.setex(`preview:${cacheKey}`, 600, JSON.stringify(previewData)); // 10 minutes TTL
      },
      null
    );

    // Store in memory cache as fallback
    this.memoryCache.set(cacheKey, cacheEntry);
    
    // Clean up memory cache if too large
    if (this.memoryCache.size > this.maxCacheSize) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }
  }

  // Clear preview cache
  async clearPreviewCache(websiteId = null) {
    if (websiteId) {
      // Clear specific website cache
      await safeRedisOperation(
        async (client) => {
          const keys = await client.keys(`preview:*${websiteId}*`);
          if (keys.length > 0) {
            await client.del(...keys);
          }
        },
        null
      );
      
      // Clear from memory cache
      for (const [key, value] of this.memoryCache.entries()) {
        if (key.includes(websiteId)) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      await safeRedisOperation(
        async (client) => {
          const keys = await client.keys('preview:*');
          if (keys.length > 0) {
            await client.del(...keys);
          }
        },
        null
      );
      
      this.memoryCache.clear();
    }
  }

  // Generate preview with caching
  async generatePreview(websiteId, userId, options = {}) {
    try {
      const { deviceType = 'desktop', zoom = 100, forceRegenerate = false } = options;
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(websiteId, deviceType, zoom, userId);
      
      // Check cache first (unless force regenerate)
      if (!forceRegenerate) {
        const cachedPreview = await this.getPreviewFromCache(cacheKey);
        if (cachedPreview) {
          return {
            ...cachedPreview,
            cached: true,
            cacheKey
          };
        }
      }

      // Get website data
      const website = await Website.findOne({
        _id: websiteId,
        userId: userId,
        isActive: true
      });

      if (!website) {
        throw new ApiError(404, "Website not found or access denied");
      }

      // Transform website data for preview generation
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

      // Transform customizations
      const customizations = {
        colors: website.customizations?.colorScheme || {},
        fonts: website.customizations?.typography || {},
        layout: website.customizations?.layout || {},
        features: website.customizations?.features || {}
      };

      // Generate preview
      const previewResult = await this.previewGenerator.generatePreview(websiteData, customizations);
      
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

      // Format response
      const result = {
        websiteId: website._id,
        html: devicePreview.html,
        css: devicePreview.css,
        content: this.formatContentForFrontend(website),
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
        accessibility: previewResult.accessibility,
        cached: false,
        cacheKey,
        generatedAt: new Date().toISOString()
      };

      // Store in cache
      await this.storePreviewInCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Preview generation error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, `Failed to generate preview: ${error.message}`);
    }
  }

  // Format content for frontend
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

  // Format section for editing
  formatSectionForEditing(section, sectionType) {
    if (!section) return null;
    
    const formatted = {};
    
    if (Array.isArray(section)) {
      return section.map(item => this.formatObjectForEditing(item));
    }
    
    for (const [key, value] of Object.entries(section)) {
      if (typeof value === 'string') {
        formatted[key] = {
          text: value,
          editable: true,
          type: this.getFieldType(key)
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
          type: this.getFieldType(key)
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

  // Get cache statistics
  getCacheStats() {
    return {
      memoryCache: {
        size: this.memoryCache.size,
        maxSize: this.maxCacheSize
      },
      cacheExpiry: this.cacheExpiry
    };
  }
}

export default new OptimizedPreviewService();