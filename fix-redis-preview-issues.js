#!/usr/bin/env node

/**
 * Fix script for Redis connection and preview loading issues
 * 
 * This script addresses the root causes of the preview loading problems:
 * 1. Redis connection failures
 * 2. Fallback rate limiting performance issues
 * 3. Preview generation optimization
 * 4. Cache configuration improvements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✓ ${message}`, colors.green);
const logError = (message) => log(`✗ ${message}`, colors.red);
const logWarning = (message) => log(`⚠ ${message}`, colors.yellow);
const logInfo = (message) => log(`ℹ ${message}`, colors.blue);

// Configuration improvements
const fixes = {
  // 1. Enhanced Redis configuration with better fallback handling
  redisConfig: `// Enhanced Redis configuration with better fallback handling
import Redis from 'ioredis';
import winston from 'winston';
import { config } from './environment.js';

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: './logs/redis.log',
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Enhanced Redis configuration with better connection handling
const redisConfig = {
  host: config.redis.host || 'localhost',
  port: config.redis.port || 6379,
  password: config.redis.password || undefined,
  db: config.redis.db || 0,
  
  // Enhanced connection options
  connectTimeout: 5000,
  commandTimeout: 3000,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  keepAlive: 30000,
  
  // Improved retry strategy
  retryStrategy: (times) => {
    if (times > 2) {
      logger.warn('Redis retry limit reached, using fallback mode');
      return null;
    }
    const delay = Math.min(times * 100, 1000);
    logger.debug(\`Redis connection retry attempt \${times}, delay: \${delay}ms\`);
    return delay;
  },
  
  // Connection name for monitoring
  connectionName: 'website-builder',
  
  // Disable offline queue to prevent memory issues
  enableOfflineQueue: false,
  
  // Connection monitoring
  showFriendlyErrorStack: config.env === 'development'
};

let redisClient = null;
let redisHealthy = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

// Initialize Redis with enhanced error handling
export const initializeRedis = async () => {
  try {
    if (redisClient) {
      try {
        await redisClient.disconnect();
      } catch (error) {
        logger.debug('Error disconnecting existing Redis client:', error.message);
      }
    }
    
    // Create new Redis client
    redisClient = new Redis(redisConfig);
    
    // Enhanced event listeners
    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
      redisHealthy = true;
      reconnectAttempts = 0;
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis ready to receive commands');
      redisHealthy = true;
    });
    
    redisClient.on('error', (error) => {
      logger.warn(\`Redis error: \${error.message}\`);
      redisHealthy = false;
      
      // Don't throw, allow graceful degradation
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        logger.info(\`Attempting Redis reconnection (\${reconnectAttempts}/\${maxReconnectAttempts})\`);
      } else {
        logger.warn('Max Redis reconnection attempts reached, using fallback mode');
      }
    });
    
    redisClient.on('close', () => {
      logger.info('Redis connection closed');
      redisHealthy = false;
    });
    
    redisClient.on('reconnecting', (delay) => {
      logger.info(\`Redis reconnecting in \${delay}ms\`);
    });
    
    redisClient.on('end', () => {
      logger.info('Redis connection ended');
      redisHealthy = false;
    });
    
    // Test connection with shorter timeout
    try {
      await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
        )
      ]);
      logger.info('Redis connection established and tested');
      return redisClient;
    } catch (error) {
      logger.warn('Redis connection test failed, using fallback mode:', error.message);
      redisHealthy = false;
      return null;
    }
    
  } catch (error) {
    logger.warn('Redis initialization failed, using fallback mode:', error.message);
    redisHealthy = false;
    redisClient = null;
    return null;
  }
};

// Enhanced Redis operation wrapper with circuit breaker pattern
let circuitBreakerOpen = false;
let circuitBreakerOpenTime = 0;
const circuitBreakerTimeout = 30000; // 30 seconds

export const safeRedisOperation = async (operation, fallback = null) => {
  // Check circuit breaker
  if (circuitBreakerOpen) {
    const now = Date.now();
    if (now - circuitBreakerOpenTime > circuitBreakerTimeout) {
      circuitBreakerOpen = false;
      logger.info('Circuit breaker reset, attempting Redis operations');
    } else {
      return fallback;
    }
  }
  
  try {
    const client = getRedisClient();
    if (!client || !redisHealthy) {
      return fallback;
    }
    
    const result = await operation(client);
    return result;
  } catch (error) {
    logger.debug('Redis operation failed:', error.message);
    
    // Open circuit breaker on consecutive failures
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      circuitBreakerOpen = true;
      circuitBreakerOpenTime = Date.now();
      logger.warn('Circuit breaker opened due to Redis failures');
    }
    
    return fallback;
  }
};

// Get Redis client with health check
export const getRedisClient = () => {
  if (!redisClient || !redisHealthy) {
    return null;
  }
  return redisClient;
};

// Enhanced health check
export const checkRedisHealth = async () => {
  try {
    if (!redisClient) {
      return {
        status: 'unavailable',
        message: 'Redis client not initialized',
        healthy: false
      };
    }
    
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime,
      healthy: true,
      circuitBreakerOpen,
      reconnectAttempts,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      healthy: false,
      circuitBreakerOpen,
      reconnectAttempts,
      timestamp: new Date().toISOString()
    };
  }
};

// Check if Redis is healthy
export const isRedisHealthy = () => redisHealthy && !circuitBreakerOpen;

// Graceful shutdown
export const shutdownRedis = async () => {
  try {
    if (redisClient) {
      logger.info('Closing Redis connection...');
      await redisClient.quit();
      redisClient = null;
      redisHealthy = false;
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error during Redis shutdown:', error);
  }
};

export default {
  initializeRedis,
  getRedisClient,
  checkRedisHealth,
  safeRedisOperation,
  isRedisHealthy,
  shutdownRedis
};`,

  // 2. Optimized preview service with better caching
  previewService: `// Optimized preview service with better caching and error handling
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
    const keyData = \`\${websiteId}:\${deviceType}:\${zoom}:\${userId}\`;
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  // Get preview from cache (Redis or memory)
  async getPreviewFromCache(cacheKey) {
    // Try Redis first
    const redisResult = await safeRedisOperation(
      async (client) => {
        const cached = await client.get(\`preview:\${cacheKey}\`);
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
        await client.setex(\`preview:\${cacheKey}\`, 600, JSON.stringify(previewData)); // 10 minutes TTL
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
          const keys = await client.keys(\`preview:*\${websiteId}*\`);
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
      throw error instanceof ApiError ? error : new ApiError(500, \`Failed to generate preview: \${error.message}\`);
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

export default new OptimizedPreviewService();`,

  // 3. Enhanced app.js with better Redis handling
  appUpdate: `// Enhanced app.js section with improved Redis handling
app.use(async (req, res, next) => {
  try {
    // Check Redis health before attempting operations
    const redisHealthy = await safeRedisOperation(
      async (client) => {
        await client.ping();
        return true;
      },
      false
    );
    
    if (redisHealthy) {
      // Use Redis-based rate limiting
      return generalRateLimit(req, res, next);
    } else {
      // Use fallback rate limiting with reduced logging
      if (Math.random() < 0.001) { // Log only 0.1% of the time to reduce spam
        console.log('Using fallback rate limiting (Redis unavailable)');
      }
      return fallbackGeneralRateLimit(req, res, next);
    }
  } catch (error) {
    // Silent fallback to prevent log spam
    return fallbackGeneralRateLimit(req, res, next);
  }
});`,

  // 4. Environment variable template
  envTemplate: `# Redis Configuration (Add these to your .env file)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false

# Performance optimizations
CACHE_TTL=600000
CACHE_MAX_KEYS=1000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Development settings
DEBUG=false
BYPASS_RATE_LIMIT=false
LOG_LEVEL=info`,

  // 5. Docker compose for Redis (optional)
  dockerCompose: `# docker-compose.yml for Redis development setup
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: website-builder-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  redis_data:
    driver: local`,

  // 6. Startup script to check Redis
  startupScript: `#!/bin/bash
# startup-check.sh - Check Redis connection before starting server

echo "Checking Redis connection..."

# Check if Redis is running
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis is running"
else
    echo "⚠ Redis is not running. Starting Redis..."
    
    # Try to start Redis (adjust path as needed)
    if command -v redis-server >/dev/null 2>&1; then
        redis-server --daemonize yes --port 6379 --maxmemory 256mb --maxmemory-policy allkeys-lru
        sleep 2
        
        if redis-cli ping > /dev/null 2>&1; then
            echo "✓ Redis started successfully"
        else
            echo "⚠ Failed to start Redis. Application will use fallback mode."
        fi
    else
        echo "⚠ Redis not installed. Application will use fallback mode."
    fi
fi

echo "Starting application..."
npm start`
};

// Main fix function
async function applyFixes() {
  logInfo('Starting Redis and preview optimization fixes...');
  
  try {
    // 1. Update Redis configuration
    logInfo('Updating Redis configuration...');
    const redisConfigPath = path.join(__dirname, 'src/config/redis.config.js');
    fs.writeFileSync(redisConfigPath, fixes.redisConfig);
    logSuccess('Redis configuration updated');

    // 2. Create optimized preview service
    logInfo('Creating optimized preview service...');
    const previewServicePath = path.join(__dirname, 'src/services/optimizedPreviewService.js');
    fs.writeFileSync(previewServicePath, fixes.previewService);
    logSuccess('Optimized preview service created');

    // 3. Update app.js rate limiting section
    logInfo('Updating app.js rate limiting...');
    const appPath = path.join(__dirname, 'src/app.js');
    let appContent = fs.readFileSync(appPath, 'utf8');
    
    // Replace the rate limiting section
    const rateLimitingRegex = /app\.use\(async \(req, res, next\) => \{[\s\S]*?\}\);/;
    if (rateLimitingRegex.test(appContent)) {
      appContent = appContent.replace(rateLimitingRegex, fixes.appUpdate);
      fs.writeFileSync(appPath, appContent);
      logSuccess('App.js rate limiting updated');
    } else {
      logWarning('Could not find rate limiting section in app.js - manual update required');
    }

    // 4. Create environment template
    logInfo('Creating environment template...');
    const envTemplatePath = path.join(__dirname, '.env.template');
    fs.writeFileSync(envTemplatePath, fixes.envTemplate);
    logSuccess('Environment template created');

    // 5. Create Docker Compose for Redis
    logInfo('Creating Docker Compose for Redis...');
    const dockerComposePath = path.join(__dirname, 'docker-compose.redis.yml');
    fs.writeFileSync(dockerComposePath, fixes.dockerCompose);
    logSuccess('Docker Compose for Redis created');

    // 6. Create startup script
    logInfo('Creating startup script...');
    const startupScriptPath = path.join(__dirname, 'startup-check.sh');
    fs.writeFileSync(startupScriptPath, fixes.startupScript);
    fs.chmodSync(startupScriptPath, '755');
    logSuccess('Startup script created');

    // 7. Update website routes to use optimized preview service
    logInfo('Updating website routes...');
    const websiteRoutesPath = path.join(__dirname, 'src/routes/websites.js');
    if (fs.existsSync(websiteRoutesPath)) {
      let routesContent = fs.readFileSync(websiteRoutesPath, 'utf8');
      
      // Add import for optimized preview service
      if (!routesContent.includes('optimizedPreviewService')) {
        routesContent = routesContent.replace(
          'import websiteService from "../services/websiteService.js";',
          'import websiteService from "../services/websiteService.js";\nimport optimizedPreviewService from "../services/optimizedPreviewService.js";'
        );
        
        // Replace preview endpoint implementation
        const previewEndpointRegex = /router\.get\('\/:websiteId\/preview'[\s\S]*?\}\)\);/;
        if (previewEndpointRegex.test(routesContent)) {
          const newPreviewEndpoint = `router.get('/:websiteId/preview', rateLimiter.standard, asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { deviceType = 'desktop', zoom = 100, forceRegenerate = false } = req.query;
    
    try {
        const previewData = await optimizedPreviewService.generatePreview(websiteId, req.user._id, {
            deviceType,
            zoom: parseInt(zoom),
            forceRegenerate: forceRegenerate === 'true'
        });
        
        return res.status(200).json(
            new ApiResponse(200, previewData, "Website preview retrieved successfully")
        );
    } catch (error) {
        throw error;
    }
}));`;
          
          routesContent = routesContent.replace(previewEndpointRegex, newPreviewEndpoint);
        }
        
        fs.writeFileSync(websiteRoutesPath, routesContent);
        logSuccess('Website routes updated');
      }
    }

    // 8. Create Redis health check endpoint
    logInfo('Creating Redis health check endpoint...');
    const healthCheckPath = path.join(__dirname, 'src/routes/health.js');
    const healthCheckContent = `import express from 'express';
import { checkRedisHealth } from '../config/redis.config.js';
import { ApiResponse } from '../utils/apirespose.js';

const router = express.Router();

router.get('/redis', async (req, res) => {
  try {
    const redisHealth = await checkRedisHealth();
    return res.status(200).json(
      new ApiResponse(200, redisHealth, "Redis health check completed")
    );
  } catch (error) {
    return res.status(500).json(
      new ApiResponse(500, { error: error.message }, "Redis health check failed")
    );
  }
});

export default router;`;
    
    fs.writeFileSync(healthCheckPath, healthCheckContent);
    logSuccess('Redis health check endpoint created');

    // Summary
    log('\n' + '='.repeat(60), colors.green);
    logSuccess('All fixes applied successfully!');
    log('='.repeat(60), colors.green);
    
    logInfo('Next steps:');
    console.log('1. Install Redis if not already installed:');
    console.log('   - Ubuntu/Debian: sudo apt-get install redis-server');
    console.log('   - MacOS: brew install redis');
    console.log('   - Or use Docker: docker-compose -f docker-compose.redis.yml up -d');
    
    console.log('\n2. Update your .env file with Redis configuration (see .env.template)');
    
    console.log('\n3. Start Redis:');
    console.log('   - System service: sudo systemctl start redis');
    console.log('   - Direct: redis-server');
    console.log('   - Docker: docker-compose -f docker-compose.redis.yml up -d');
    
    console.log('\n4. Test the fixes:');
    console.log('   - Start your application: npm start');
    console.log('   - Check Redis health: curl http://localhost:8000/api/health/redis');
    console.log('   - Test website preview functionality');
    
    console.log('\n5. Monitor logs for "Using fallback rate limiting" messages');
    console.log('   - Should be significantly reduced or eliminated');
    
    logSuccess('Fix script completed!');
    
  } catch (error) {
    logError(`Fix script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the fix
applyFixes();