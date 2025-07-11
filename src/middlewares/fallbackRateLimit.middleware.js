// Fallback rate limiting middleware for when Redis is unavailable
// Uses in-memory storage with automatic cleanup

import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// In-memory store for rate limiting
const rateLimitStore = new Map();
const rateLimitConfig = new Map();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer = null;

// Start cleanup timer
const startCleanup = () => {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, data] of rateLimitStore.entries()) {
      if (data.resetTime <= now) {
        rateLimitStore.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }, CLEANUP_INTERVAL);
};

// Stop cleanup timer
const stopCleanup = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};

// Get client identifier
const getClientId = (req) => {
  // Use multiple factors for client identification
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.get('User-Agent') || '';
  const userId = req.user?.id || '';
  
  // Create a more sophisticated identifier for authenticated users
  if (userId) {
    return `user:${userId}:${ip}`;
  }
  
  // For anonymous users, use IP + User-Agent hash
  return `anon:${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
};

// Create fallback rate limiter
export const createFallbackRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    message = 'Too many requests, please try again later',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = getClientId,
    skip = () => false,
    onLimitReached = null
  } = options;

  const limitKey = `fallback:${Date.now()}:${Math.random()}`;
  
  // Store configuration for this limiter
  rateLimitConfig.set(limitKey, {
    windowMs,
    max,
    message,
    statusCode,
    skipSuccessfulRequests,
    skipFailedRequests
  });

  // Start cleanup if not already running
  startCleanup();

  return (req, res, next) => {
    // Skip if configured to skip
    if (skip(req)) {
      return next();
    }

    const clientId = keyGenerator(req);
    const key = `${limitKey}:${clientId}`;
    const now = Date.now();
    const resetTime = now + windowMs;

    // Get current data for this client
    let data = rateLimitStore.get(key);

    // Initialize or reset if window expired
    if (!data || data.resetTime <= now) {
      data = {
        count: 0,
        resetTime,
        firstRequest: now
      };
    }

    // Increment request count
    data.count++;
    rateLimitStore.set(key, data);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - data.count),
      'X-RateLimit-Reset': new Date(data.resetTime).toISOString(),
      'X-RateLimit-Window': Math.floor(windowMs / 1000)
    });

    // Check if limit exceeded
    if (data.count > max) {
      // Call onLimitReached callback if provided
      if (onLimitReached) {
        onLimitReached(req, res);
      }

      // Log rate limit violation
      logger.warn('Rate limit exceeded', {
        clientId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        count: data.count,
        limit: max,
        window: windowMs
      });

      return res.status(statusCode).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }

    // Handle response tracking for skipSuccessfulRequests/skipFailedRequests
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(body) {
        const shouldSkip = 
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400);

        if (shouldSkip) {
          // Decrement count if we should skip this request
          const currentData = rateLimitStore.get(key);
          if (currentData) {
            currentData.count = Math.max(0, currentData.count - 1);
            rateLimitStore.set(key, currentData);
          }
        }

        return originalSend.call(this, body);
      };
    }

    next();
  };
};

// Specific rate limiters for different endpoints
export const fallbackGeneralRateLimit = createFallbackRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later'
});

export const fallbackAuthRateLimit = createFallbackRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window for auth endpoints
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true
});

export const fallbackAudioRateLimit = createFallbackRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 audio uploads per hour
  message: 'Too many audio uploads, please try again later'
});

export const fallbackApiRateLimit = createFallbackRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded, please slow down'
});

// Progressive rate limiting (stricter for repeat offenders)
const offenderStore = new Map();

export const createProgressiveRateLimit = (baseOptions = {}) => {
  const baseLimiter = createFallbackRateLimit(baseOptions);
  
  return (req, res, next) => {
    const clientId = getClientId(req);
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Get offender data
    let offenderData = offenderStore.get(clientId);
    if (!offenderData) {
      offenderData = { violations: [], lastViolation: 0 };
      offenderStore.set(clientId, offenderData);
    }
    
    // Clean old violations
    offenderData.violations = offenderData.violations.filter(time => time > hourAgo);
    
    // Apply progressive limits based on violation history
    const violationCount = offenderData.violations.length;
    let modifiedOptions = { ...baseOptions };
    
    if (violationCount > 0) {
      // Reduce limit for repeat offenders
      modifiedOptions.max = Math.max(1, Math.floor(modifiedOptions.max * 0.5 ** violationCount));
      logger.info(`Applied progressive rate limit: ${modifiedOptions.max} (violations: ${violationCount})`);
    }
    
    // Create modified limiter
    const progressiveLimiter = createFallbackRateLimit(modifiedOptions);
    
    // Wrap the limiter to track violations
    const originalNext = next;
    const wrappedNext = (error) => {
      if (error && error.status === 429) {
        // Record violation
        offenderData.violations.push(now);
        offenderData.lastViolation = now;
        offenderStore.set(clientId, offenderData);
      }
      originalNext(error);
    };
    
    progressiveLimiter(req, res, wrappedNext);
  };
};

// Get rate limit statistics
export const getFallbackRateLimitStats = () => {
  const stats = {
    totalEntries: rateLimitStore.size,
    activeConfigs: rateLimitConfig.size,
    offenders: offenderStore.size,
    memoryUsage: JSON.stringify([...rateLimitStore.entries()]).length,
    uptime: cleanupTimer ? 'running' : 'stopped'
  };
  
  return stats;
};

// Clear all rate limit data (for testing/debugging)
export const clearFallbackRateLimit = () => {
  rateLimitStore.clear();
  offenderStore.clear();
  rateLimitConfig.clear();
  logger.info('Fallback rate limit data cleared');
};

// Graceful shutdown
export const shutdownFallbackRateLimit = () => {
  stopCleanup();
  clearFallbackRateLimit();
  logger.info('Fallback rate limiter shutdown complete');
};

// Health check
export const fallbackRateLimitHealth = () => {
  return {
    status: 'healthy',
    store: 'memory',
    entries: rateLimitStore.size,
    configs: rateLimitConfig.size,
    cleanup: cleanupTimer ? 'active' : 'inactive'
  };
};

export default {
  createFallbackRateLimit,
  fallbackGeneralRateLimit,
  fallbackAuthRateLimit,
  fallbackAudioRateLimit,
  fallbackApiRateLimit,
  createProgressiveRateLimit,
  getFallbackRateLimitStats,
  clearFallbackRateLimit,
  shutdownFallbackRateLimit,
  fallbackRateLimitHealth
};