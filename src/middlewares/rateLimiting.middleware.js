import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import winston from 'winston';
import { config } from '../config/environment.js';
import { getRedisClient, isRedisHealthy } from '../config/redis.config.js';

// Configure logger for rate limiting
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: './logs/rate-limit.log',
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiter configurations
const rateLimiterConfigs = {
  // General API rate limiting
  general: {
    storeClient: null, // Will be set dynamically
    keyPrefix: 'rl_general_',
    points: 100, // Number of requests
    duration: 900, // Per 15 minutes (900 seconds)
    blockDuration: 900, // Block for 15 minutes
    execEvenly: true, // Spread requests evenly across duration
  },
  
  // Authentication rate limiting
  auth: {
    storeClient: null,
    keyPrefix: 'rl_auth_',
    points: 5, // 5 attempts
    duration: 900, // per 15 minutes
    blockDuration: 3600, // block for 1 hour
    execEvenly: false,
  },
  
  // Registration rate limiting
  register: {
    storeClient: null,
    keyPrefix: 'rl_register_',
    points: 3, // 3 attempts
    duration: 3600, // per 1 hour
    blockDuration: 3600, // block for 1 hour
    execEvenly: false,
  },
  
  // Password reset rate limiting
  passwordReset: {
    storeClient: null,
    keyPrefix: 'rl_password_reset_',
    points: 3, // 3 attempts
    duration: 3600, // per 1 hour
    blockDuration: 3600, // block for 1 hour
    execEvenly: false,
  },
  
  // File upload rate limiting
  fileUpload: {
    storeClient: null,
    keyPrefix: 'rl_file_upload_',
    points: 10, // 10 uploads
    duration: 60, // per minute
    blockDuration: 300, // block for 5 minutes
    execEvenly: true,
  },
  
  // AI generation rate limiting
  aiGeneration: {
    storeClient: null,
    keyPrefix: 'rl_ai_generation_',
    points: 3, // 3 requests
    duration: 60, // per minute
    blockDuration: 300, // block for 5 minutes
    execEvenly: true,
  },
  
  // Website generation rate limiting
  websiteGeneration: {
    storeClient: null,
    keyPrefix: 'rl_website_generation_',
    points: 5, // 5 requests
    duration: 300, // per 5 minutes
    blockDuration: 900, // block for 15 minutes
    execEvenly: true,
  },
  
  // Email sending rate limiting
  emailSending: {
    storeClient: null,
    keyPrefix: 'rl_email_sending_',
    points: 10, // 10 emails
    duration: 3600, // per hour
    blockDuration: 3600, // block for 1 hour
    execEvenly: true,
  },
  
  // Heavy operations rate limiting
  heavyOperations: {
    storeClient: null,
    keyPrefix: 'rl_heavy_ops_',
    points: 2, // 2 operations
    duration: 60, // per minute
    blockDuration: 300, // block for 5 minutes
    execEvenly: true,
  },
  
  // Admin operations rate limiting
  adminOperations: {
    storeClient: null,
    keyPrefix: 'rl_admin_ops_',
    points: 100, // 100 operations
    duration: 3600, // per hour
    blockDuration: 1800, // block for 30 minutes
    execEvenly: true,
  }
};

// Rate limiter instances
const rateLimiters = {};
const memoryLimiters = {};

// Initialize rate limiters
export const initializeRateLimiters = async () => {
  try {
    const redisClient = isRedisHealthy() ? getRedisClient() : null;
    
    for (const [key, config] of Object.entries(rateLimiterConfigs)) {
      try {
        // Set Redis client if available
        if (redisClient) {
          config.storeClient = redisClient;
          rateLimiters[key] = new RateLimiterRedis(config);
          logger.info(`Redis rate limiter initialized for ${key}`);
        } else {
          // Fallback to memory limiter
          logger.warn(`Using memory rate limiter for ${key} (Redis unavailable)`);
          memoryLimiters[key] = new RateLimiterMemory(config);
        }
      } catch (error) {
        logger.error(`Failed to initialize rate limiter for ${key}:`, error);
        // Fallback to memory limiter if Redis setup fails
        memoryLimiters[key] = new RateLimiterMemory(config);
      }
    }
    
    logger.info('Rate limiters initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize rate limiters:', error);
    return false;
  }
};

// Get rate limiter instance
const getRateLimiter = (type) => {
  if (rateLimiters[type]) {
    return rateLimiters[type];
  }
  
  if (memoryLimiters[type]) {
    return memoryLimiters[type];
  }
  
  logger.error(`Rate limiter not found for type: ${type}`);
  return null;
};

// Generate rate limit key
const generateRateLimitKey = (req, type, additionalKey = '') => {
  const baseKey = req.ip || 'unknown';
  const userKey = req.user?.id || 'anonymous';
  
  switch (type) {
    case 'auth':
      return `${baseKey}_${req.body?.email || req.body?.professionalEmail || 'unknown'}`;
    case 'register':
      return `${baseKey}_${req.body?.email || req.body?.professionalEmail || 'unknown'}`;
    case 'passwordReset':
      return `${baseKey}_${req.body?.email || 'unknown'}`;
    case 'fileUpload':
      return `${baseKey}_${userKey}`;
    case 'aiGeneration':
      return `${userKey}_${baseKey}`;
    case 'websiteGeneration':
      return `${userKey}_${baseKey}`;
    case 'emailSending':
      return `${baseKey}_${req.body?.to || req.body?.email || 'unknown'}`;
    case 'heavyOperations':
      return `${userKey}_${baseKey}`;
    case 'adminOperations':
      return `${userKey}_${baseKey}`;
    default:
      return `${baseKey}_${additionalKey}`;
  }
};

// Create rate limiting middleware
export const createRateLimitMiddleware = (type, options = {}) => {
  return async (req, res, next) => {
    try {
      // Skip rate limiting in development if configured
      if (config.development.bypassRateLimit && config.env === 'development') {
        return next();
      }
      
      const rateLimiter = getRateLimiter(type);
      if (!rateLimiter) {
        logger.error(`Rate limiter not available for type: ${type}`);
        return next();
      }
      
      const key = generateRateLimitKey(req, type, options.additionalKey);
      
      // Consume rate limit
      const result = await rateLimiter.consume(key);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimiterConfigs[type].points,
        'X-RateLimit-Remaining': result.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
        'Retry-After': Math.round(result.msBeforeNext / 1000)
      });
      
      // Log successful rate limit check
      logger.debug('Rate limit check passed', {
        type,
        key,
        remainingPoints: result.remainingPoints,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      next();
    } catch (rejRes) {
      const msBeforeNext = rejRes.msBeforeNext || 1000;
      const remainingPoints = rejRes.remainingPoints || 0;
      
      // Log rate limit exceeded
      logger.warn('Rate limit exceeded', {
        type,
        key: generateRateLimitKey(req, type, options.additionalKey),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        msBeforeNext,
        remainingPoints
      });
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimiterConfigs[type].points,
        'X-RateLimit-Remaining': remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
        'Retry-After': Math.round(msBeforeNext / 1000)
      });
      
      // Send security alert for suspicious activity
      if (type === 'auth' && rejRes.totalHits > 10) {
        await sendSecurityAlert('excessive_auth_attempts', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          totalAttempts: rejRes.totalHits,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(429).json({
        success: false,
        message: `Too many ${type} requests. Please try again later.`,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(msBeforeNext / 1000),
        limit: rateLimiterConfigs[type].points,
        remaining: remainingPoints
      });
    }
  };
};

// Express rate limit middleware (fallback)
export const expressRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
  handler: (req, res) => {
    logger.warn('Express rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(config.rateLimit.windowMs / 1000)
    });
  }
});

// Slow down middleware
export const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipSuccessfulRequests: false,
  skip: (req) => {
    return req.path === '/health' || req.path === '/api/health';
  },
  validate: {
    delayMs: false // Disable the delayMs validation warning
  }
});

// Specific rate limiting middleware exports
export const generalRateLimit = createRateLimitMiddleware('general');
export const authRateLimit = createRateLimitMiddleware('auth');
export const registerRateLimit = createRateLimitMiddleware('register');
export const passwordResetRateLimit = createRateLimitMiddleware('passwordReset');
export const fileUploadRateLimit = createRateLimitMiddleware('fileUpload');
export const aiGenerationRateLimit = createRateLimitMiddleware('aiGeneration');
export const websiteGenerationRateLimit = createRateLimitMiddleware('websiteGeneration');
export const emailSendingRateLimit = createRateLimitMiddleware('emailSending');
export const heavyOperationsRateLimit = createRateLimitMiddleware('heavyOperations');
export const adminOperationsRateLimit = createRateLimitMiddleware('adminOperations');

// Get rate limit status for a key
export const getRateLimitStatus = async (type, key) => {
  try {
    const rateLimiter = getRateLimiter(type);
    if (!rateLimiter) {
      return { error: 'Rate limiter not available' };
    }
    
    const result = await rateLimiter.get(key);
    return {
      limit: rateLimiterConfigs[type].points,
      remaining: result ? result.remainingPoints : rateLimiterConfigs[type].points,
      reset: result ? new Date(Date.now() + result.msBeforeNext).toISOString() : null,
      blocked: result ? result.remainingPoints <= 0 : false
    };
  } catch (error) {
    logger.error('Failed to get rate limit status:', error);
    return { error: error.message };
  }
};

// Reset rate limit for a key
export const resetRateLimit = async (type, key) => {
  try {
    const rateLimiter = getRateLimiter(type);
    if (!rateLimiter) {
      return { error: 'Rate limiter not available' };
    }
    
    await rateLimiter.delete(key);
    logger.info('Rate limit reset', { type, key });
    return { success: true };
  } catch (error) {
    logger.error('Failed to reset rate limit:', error);
    return { error: error.message };
  }
};

// Get rate limiting statistics
export const getRateLimitStats = async () => {
  try {
    const stats = {};
    
    for (const [type, limiter] of Object.entries(rateLimiters)) {
      try {
        // This is a simplified stats collection
        // In practice, you might want to store and retrieve more detailed stats
        stats[type] = {
          config: rateLimiterConfigs[type],
          active: true,
          backend: 'redis'
        };
      } catch (error) {
        stats[type] = {
          config: rateLimiterConfigs[type],
          active: false,
          error: error.message
        };
      }
    }
    
    for (const [type, limiter] of Object.entries(memoryLimiters)) {
      stats[type] = {
        config: rateLimiterConfigs[type],
        active: true,
        backend: 'memory'
      };
    }
    
    return stats;
  } catch (error) {
    logger.error('Failed to get rate limit stats:', error);
    return { error: error.message };
  }
};

// Send security alert
const sendSecurityAlert = async (type, details) => {
  try {
    if (!config.notifications.securityAlertsEnabled) {
      return;
    }
    
    logger.warn('Security alert triggered', { type, details });
    
    // TODO: Implement email notification
    // await sendEmail({
    //   to: config.notifications.securityAlertEmail,
    //   subject: `Security Alert: ${type.toUpperCase()}`,
    //   body: JSON.stringify(details, null, 2)
    // });
    
  } catch (error) {
    logger.error('Failed to send security alert:', error);
  }
};

// Cleanup expired rate limit entries
export const cleanupRateLimitEntries = async () => {
  try {
    if (!isRedisHealthy()) {
      return { message: 'Redis not available for cleanup' };
    }
    
    const redisClient = getRedisClient();
    const keys = await redisClient.keys('rl_*');
    
    let cleanedCount = 0;
    for (const key of keys) {
      const ttl = await redisClient.ttl(key);
      if (ttl === -1) {
        await redisClient.del(key);
        cleanedCount++;
      }
    }
    
    logger.info(`Rate limit cleanup completed: ${cleanedCount} entries cleaned`);
    return { cleanedCount, totalKeys: keys.length };
  } catch (error) {
    logger.error('Rate limit cleanup failed:', error);
    return { error: error.message };
  }
};

export default {
  initializeRateLimiters,
  createRateLimitMiddleware,
  expressRateLimit,
  slowDownMiddleware,
  getRateLimitStatus,
  resetRateLimit,
  getRateLimitStats,
  cleanupRateLimitEntries,
  // Specific middleware exports
  generalRateLimit,
  authRateLimit,
  registerRateLimit,
  passwordResetRateLimit,
  fileUploadRateLimit,
  aiGenerationRateLimit,
  websiteGenerationRateLimit,
  emailSendingRateLimit,
  heavyOperationsRateLimit,
  adminOperationsRateLimit
};