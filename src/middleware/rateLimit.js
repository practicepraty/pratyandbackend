// src/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apierror.js';

// Rate limiter configurations
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: message || 'Too many requests, please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            }
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests, please try again later.',
                    retryAfter: Math.ceil(windowMs / 1000)
                }
            });
        },
        // Custom key generator based on user ID if authenticated, otherwise IP
        keyGenerator: (req) => {
            return req.user ? req.user._id.toString() : req.ip;
        },
        // Skip rate limiting for certain conditions
        skip: (req) => {
            // Skip rate limiting for certain user roles (if needed)
            if (req.user && req.user.role === 'admin') {
                return true;
            }
            return false;
        }
    });
};

// Different rate limiting tiers
export const rateLimiter = {
    // Very strict limits - for sensitive operations
    strict: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        5, // 5 requests per window
        'Too many sensitive operations. Please wait before trying again.'
    ),
    
    // Moderate limits - for standard operations
    moderate: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        30, // 30 requests per window
        'Too many requests. Please slow down.'
    ),
    
    // Standard limits - for general API usage
    standard: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        100, // 100 requests per window
        'API rate limit exceeded. Please try again later.'
    ),
    
    // Lenient limits - for frequent operations like auto-save
    lenient: createRateLimiter(
        1 * 60 * 1000, // 1 minute
        60, // 60 requests per minute
        'Too many auto-save requests. Please slow down.'
    ),
    
    // Very lenient - for read operations
    veryLenient: createRateLimiter(
        1 * 60 * 1000, // 1 minute
        200, // 200 requests per minute
        'Too many read requests. Please slow down.'
    )
};

// Specific rate limiters for different endpoints
export const websiteRateLimiter = {
    // Website creation - strict limits
    creation: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        10, // 10 websites per hour
        'Too many websites created. Please wait before creating another.'
    ),
    
    // Website updates - moderate limits
    update: createRateLimiter(
        5 * 60 * 1000, // 5 minutes
        20, // 20 updates per 5 minutes
        'Too many website updates. Please slow down.'
    ),
    
    // Website deletion - very strict limits
    deletion: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        5, // 5 deletions per hour
        'Too many deletion requests. Please wait before deleting more websites.'
    ),
    
    // Website preview generation - moderate limits
    preview: createRateLimiter(
        5 * 60 * 1000, // 5 minutes
        15, // 15 previews per 5 minutes
        'Too many preview requests. Please wait before generating more previews.'
    ),
    
    // Website export - moderate limits
    export: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        10, // 10 exports per 15 minutes
        'Too many export requests. Please wait before exporting more websites.'
    ),
    
    // Website publishing - strict limits
    publishing: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        10, // 10 publishes per 15 minutes
        'Too many publish requests. Please wait before publishing more websites.'
    ),
    
    // Auto-save - very lenient
    autoSave: createRateLimiter(
        1 * 60 * 1000, // 1 minute
        120, // 120 auto-saves per minute
        'Auto-save rate limit exceeded. Please slow down your editing.'
    )
};

// AI/Generation specific rate limiters
export const aiRateLimiter = {
    // AI content generation - strict limits due to cost
    generation: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        20, // 20 generations per hour
        'Too many AI generation requests. Please wait before generating more content.'
    ),
    
    // Section regeneration - moderate limits
    regeneration: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        10, // 10 regenerations per 15 minutes
        'Too many regeneration requests. Please wait before regenerating more sections.'
    ),
    
    // Content variations - moderate limits
    variations: createRateLimiter(
        30 * 60 * 1000, // 30 minutes
        15, // 15 variation requests per 30 minutes
        'Too many variation requests. Please wait before requesting more variations.'
    )
};

// Upload rate limiters
export const uploadRateLimiter = {
    // Audio upload - strict limits
    audio: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        10, // 10 uploads per hour
        'Too many audio uploads. Please wait before uploading more files.'
    ),
    
    // Image upload - moderate limits
    image: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        20, // 20 uploads per 15 minutes
        'Too many image uploads. Please wait before uploading more images.'
    ),
    
    // Document upload - moderate limits
    document: createRateLimiter(
        30 * 60 * 1000, // 30 minutes
        15, // 15 uploads per 30 minutes
        'Too many document uploads. Please wait before uploading more documents.'
    )
};

// Authentication rate limiters
export const authRateLimiter = {
    // Login attempts - strict limits
    login: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        5, // 5 login attempts per 15 minutes
        'Too many login attempts. Please wait before trying again.'
    ),
    
    // Registration - strict limits
    registration: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        3, // 3 registrations per hour per IP
        'Too many registration attempts. Please wait before trying again.'
    ),
    
    // Password reset - strict limits
    passwordReset: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        3, // 3 password reset attempts per hour
        'Too many password reset attempts. Please wait before trying again.'
    ),
    
    // Token refresh - moderate limits
    tokenRefresh: createRateLimiter(
        15 * 60 * 1000, // 15 minutes
        20, // 20 token refreshes per 15 minutes
        'Too many token refresh attempts. Please slow down.'
    )
};

// Create custom rate limiter for specific use cases
export const createCustomRateLimiter = (options) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes default
        max = 100, // 100 requests default
        message = 'Too many requests, please try again later.',
        keyGenerator = null,
        skip = null,
        onLimitReached = null
    } = options;
    
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message,
                retryAfter: Math.ceil(windowMs / 1000)
            }
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: keyGenerator || ((req) => {
            return req.user ? req.user._id.toString() : req.ip;
        }),
        skip: skip || ((req) => {
            return req.user && req.user.role === 'admin';
        }),
        handler: (req, res) => {
            if (onLimitReached) {
                onLimitReached(req, res);
            }
            
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message,
                    retryAfter: Math.ceil(windowMs / 1000)
                }
            });
        }
    });
};

// Rate limiter for IP-based restrictions (for public endpoints)
export const ipRateLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    200, // 200 requests per IP per 15 minutes
    'Too many requests from this IP. Please try again later.'
);

// Global rate limiter (applied to all routes)
export const globalRateLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    1000, // 1000 requests per 15 minutes
    'Global rate limit exceeded. Please try again later.'
);

// Bypass rate limiter for testing/development
export const bypassRateLimiter = (req, res, next) => {
    if (process.env.NODE_ENV === 'test' || process.env.BYPASS_RATE_LIMIT === 'true') {
        return next();
    }
    
    // Apply standard rate limiting in other environments
    return rateLimiter.standard(req, res, next);
};

// Rate limiter store cleanup (for production)
export const cleanupRateLimiterStore = () => {
    // This would be implemented based on the store being used
    // For memory store, it's automatically cleaned up
    // For Redis store, you might want to implement cleanup logic
    console.log('Rate limiter store cleanup executed');
};

// Export default rate limiter
export default rateLimiter;