import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';

// Redis client for rate limiting
const redis = new Redis({
  port: process.env.REDIS_PORT || 6379,
  host: process.env.REDIS_HOST || 'localhost',
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
});

// Rate limiter configurations
const rateLimiterOptions = {
  storeClient: redis,
  keyPrefix: 'rl_',
  points: 5, // Number of requests
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes
};

const rateLimiterLogin = new RateLimiterRedis({
  ...rateLimiterOptions,
  points: 5, // 5 attempts
  duration: 900, // per 15 minutes
  blockDuration: 3600, // block for 1 hour
});

const rateLimiterRegister = new RateLimiterRedis({
  ...rateLimiterOptions,
  points: 3, // 3 attempts
  duration: 3600, // per 1 hour
  blockDuration: 3600, // block for 1 hour
});

const rateLimiterPasswordReset = new RateLimiterRedis({
  ...rateLimiterOptions,
  points: 3, // 3 attempts
  duration: 3600, // per 1 hour
  blockDuration: 3600, // block for 1 hour
});

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: []
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

// Rate limiting middleware
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Slow down middleware for repeated requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Login rate limiting
export const loginRateLimit = async (req, res, next) => {
  try {
    const key = `${req.ip}_${req.body.email || req.body.professionalEmail || 'unknown'}`;
    await rateLimiterLogin.consume(key);
    next();
  } catch (rejRes) {
    const msBeforeNext = rejRes.msBeforeNext || 1000;
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

// Registration rate limiting
export const registerRateLimit = async (req, res, next) => {
  try {
    const key = `${req.ip}_register`;
    await rateLimiterRegister.consume(key);
    next();
  } catch (rejRes) {
    const msBeforeNext = rejRes.msBeforeNext || 1000;
    res.status(429).json({
      error: 'Too many registration attempts. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

// Password reset rate limiting
export const passwordResetRateLimit = async (req, res, next) => {
  try {
    const key = `${req.ip}_${req.body.email || 'unknown'}_reset`;
    await rateLimiterPasswordReset.consume(key);
    next();
  } catch (rejRes) {
    const msBeforeNext = rejRes.msBeforeNext || 1000;
    res.status(429).json({
      error: 'Too many password reset attempts. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

// MongoDB sanitization
export const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} from ${req.ip}`);
  }
});

// HPP protection
export const httpParameterPollution = hpp({
  whitelist: ['sort', 'filter', 'specialty', 'location']
});

// XSS Protection function
export const xssProtection = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// CSRF token generation
export const generateCSRFToken = (req, res, next) => {
  if (!req.session) {
    req.session = {};
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  
  res.locals.csrfToken = token;
  next();
};

// CSRF token validation
export const validateCSRFToken = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
};

// Data encryption utilities
export const encryptData = (data, key = process.env.ENCRYPTION_KEY) => {
  if (!key) {
    throw new Error('Encryption key not provided');
  }
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

export const decryptData = (encryptedData, key = process.env.ENCRYPTION_KEY) => {
  if (!key) {
    throw new Error('Encryption key not provided');
  }
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server identification
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Account lockout tracking
const accountLockouts = new Map();

export const trackFailedLogin = (email) => {
  const key = email.toLowerCase();
  const attempts = accountLockouts.get(key) || { count: 0, lastAttempt: Date.now() };
  
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  
  accountLockouts.set(key, attempts);
  
  // Auto-cleanup old entries
  setTimeout(() => {
    accountLockouts.delete(key);
  }, 60 * 60 * 1000); // 1 hour
  
  return attempts;
};

export const checkAccountLockout = (email) => {
  const key = email.toLowerCase();
  const attempts = accountLockouts.get(key);
  
  if (!attempts) return false;
  
  const maxAttempts = 5;
  const lockoutDuration = 30 * 60 * 1000; // 30 minutes
  
  if (attempts.count >= maxAttempts) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (timeSinceLastAttempt < lockoutDuration) {
      return {
        locked: true,
        remainingTime: lockoutDuration - timeSinceLastAttempt
      };
    } else {
      // Reset attempts after lockout period
      accountLockouts.delete(key);
      return false;
    }
  }
  
  return false;
};

export const clearFailedAttempts = (email) => {
  const key = email.toLowerCase();
  accountLockouts.delete(key);
};