import express from "express";
import crypto from "crypto";
import { config } from "./config/environment.js";
const app = express();

import cors from "cors"
import cookieParser from "cookie-parser"
import session from "express-session"
import MongoStore from "connect-mongo"
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import { enhancedErrorHandler, notFoundHandler, timeoutHandler } from "./middlewares/enhancedErrorHandler.middleware.js";
import loggingService from "./services/loggingService.js";
import { handleMulterError } from "./middlewares/multer.middleware.js";
import { 
  helmetConfig,
  generalRateLimit,
  speedLimiter,
  mongoSanitizer,
  httpParameterPollution,
  xssProtection,
  securityHeaders,
  generateCSRFToken,
  validateCSRFToken
} from "./middlewares/security.middleware.js";
import { safeRedisOperation } from "./config/redis.config.js";
import { fallbackGeneralRateLimit } from "./middlewares/fallbackRateLimit.middleware.js";
import { auditLogger_middleware } from "./middlewares/audit.middleware.js";
import { sanitizeInput } from "./middlewares/validation.middleware.js";
import { 
  requestDebugger, 
  processingStatusDebugger, 
  audioProcessingDebugger,
  errorTracker,
  healthCheckLogger,
  performanceMonitor
} from "./middlewares/debugLogging.middleware.js";
import { csrfProtection, csrfErrorHandler, provideCsrfToken } from "./middlewares/csrf.middleware.js";
import { xssProtection as enhancedXssProtection, contentSecurityPolicy, antiXssHeaders } from "./middlewares/xss.middleware.js";
import { httpsRedirect, hsts, sslSecurityHeaders } from "./config/https.config.js";
import xssClean from 'xss-clean';

// Security middleware (applied first)
app.use(httpsRedirect); // Redirect HTTP to HTTPS
app.use(hsts); // HTTP Strict Transport Security
app.use(sslSecurityHeaders); // SSL/TLS security headers
app.use(helmetConfig); // Helmet security headers
app.use(securityHeaders); // Custom security headers
app.use(antiXssHeaders); // Anti-XSS headers
app.use(contentSecurityPolicy); // Content Security Policy
// Smart rate limiting with fallback
app.use(async (req, res, next) => {
  try {
    // Try Redis-based rate limiting first
    const redisResult = await safeRedisOperation(
      async (client) => {
        // Use existing Redis rate limiting
        return generalRateLimit(req, res, next);
      },
      null
    );
    
    // If Redis failed, use fallback rate limiting
    if (redisResult === null) {
      console.log('Using fallback rate limiting (Redis unavailable)');
      return fallbackGeneralRateLimit(req, res, next);
    }
  } catch (error) {
    console.warn('Rate limiting error, using fallback:', error.message);
    return fallbackGeneralRateLimit(req, res, next);
  }
});
app.use(speedLimiter); // Speed limiting for suspicious activity
app.use(mongoSanitizer); // MongoDB injection protection
app.use(httpParameterPollution); // HTTP Parameter Pollution protection
app.use(xssClean()); // XSS clean from package
app.use(xssProtection); // Original XSS protection
app.use(enhancedXssProtection); // Enhanced XSS protection
app.use(sanitizeInput); // Input sanitization

// Session configuration for CSRF protection
app.use(session({
  secret: process.env.SESSION_SECRET || 'ultra-secure-session-secret-for-healthcare-app-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, // lazy session update
    crypto: {
      secret: process.env.SESSION_SECRET || 'ultra-secure-session-secret-for-healthcare-app-2024'
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Allow cross-origin in dev
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined
  },
  rolling: true // Reset expiry on activity
}));

// CSRF protection middleware with bypass for API endpoints and development routes
app.use((req, res, next) => {
  // Skip CSRF for development routes (when NODE_ENV is not production)
  if (process.env.NODE_ENV !== 'production' && req.path.includes('-dev')) {
    console.log('Skipping CSRF for development route:', req.path);
    return next();
  }
  
  // Skip CSRF for API endpoints that use JWT authentication
  const apiExemptPaths = [
    '/api/v1/processing/',
    '/api/v1/users/login',
    '/api/v1/users/register',
    '/api/v1/users/logout',
    '/api/v1/users/refresh',
    '/api/v1/users/verify-email',
    '/api/v1/users/reset-password',
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/auth/refresh',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/reset-password',
    '/api/v1/content/regenerate',
    '/api/v1/content/improve',
    '/api/v1/content/optimize-seo',
    '/api/v1/content/adjust-tone',
    '/api/v1/websites/',
    '/api/v1/images/'
  ];
  
  if (apiExemptPaths.some(path => req.path.startsWith(path))) {
    console.log('Skipping CSRF for API endpoint:', req.path);
    return next();
  }
  
  return csrfProtection(req, res, next);
});
app.use(provideCsrfToken);

// CORS configuration with enhanced security
app.use(cors({
    origin: function(origin, callback) {
      // In development, allow localhost origins and no origin (for tools like Postman)
      if (config.env === 'development') {
        if (!origin || 
            origin.startsWith('http://localhost:') || 
            origin.startsWith('http://127.0.0.1:') ||
            origin.startsWith('https://localhost:') ||
            origin.startsWith('https://127.0.0.1:') ||
            origin === 'http://localhost:5173' ||
            origin === 'http://127.0.0.1:5173' ||
            origin === 'http://localhost:5174' ||
            origin === 'http://127.0.0.1:5174' ||
            origin === 'http://localhost:5175' ||
            origin === 'http://127.0.0.1:5175' ||
            origin === 'http://localhost:5177' ||
            origin === 'http://127.0.0.1:5177') {
          return callback(null, true);
        }
      }
      
      // Get allowed origins from environment with fallback
      const corsOrigins = config.cors?.origin || process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177';
      const allowedOrigins = corsOrigins.split(',')
        .map(o => o.trim())
        .filter(o => o && o !== '*'); // Remove empty and wildcard
      
      // Always allow if origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log rejected origins for debugging
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-CSRF-Token', 
      'X-MFA-Token', 
      'X-API-Key',
      'X-API-Version',
      'X-Request-ID',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: [
      'X-CSRF-Token', 
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Reset'
    ],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200,
    preflightContinue: false
}))

// Body parsing middleware
app.use(express.json({
  limit: "16kb",
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public", {
  dotfiles: 'deny',
  index: false,
  redirect: false
}))
app.use(cookieParser(process.env.COOKIE_SECRET))

// Debug and monitoring middleware
app.use(requestDebugger);
app.use(healthCheckLogger);
app.use(performanceMonitor);

// Audit logging middleware
app.use(auditLogger_middleware);

//routes import
import userRouter from './routes/user.routes.js'
import aiRouter from './routes/ai.routes.js'
import templateRouter from './routes/template.routes.js'
import websiteGenerationRouter from './routes/websiteGeneration.routes.js'
import websiteRouter from './routes/websites.js'
import websitePublishRouter from './routes/websitePublish.routes.js'
import websiteVersionsRouter from './routes/websiteVersions.routes.js'
import unifiedProcessingRouter from './routes/unifiedProcessing.routes.js'
import contentRegenerationRouter from './routes/contentRegeneration.routes.js'
import imageUploadRouter from './routes/imageUpload.routes.js'

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    statusCode: 200,
    data: {
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    },
    message: 'Server is healthy'
  });
});

// CSRF token endpoint
app.get('/api/v1/csrf-token', (req, res) => {
  res.json({ 
    success: true,
    statusCode: 200,
    data: {
      csrfToken: res.locals.csrfToken 
    },
    message: "CSRF token retrieved successfully"
  });
});

// CSRF error handler
app.use(csrfErrorHandler);

// Multer error handler for file uploads
app.use(handleMulterError);

// Request timeout middleware with exceptions for audio processing
app.use((req, res, next) => {
  // Use longer timeout for audio processing endpoints
  if (req.path.includes('/process-audio')) {
    return timeoutHandler(120000)(req, res, next); // 2 minute timeout for audio
  }
  return timeoutHandler(30000)(req, res, next); // 30 second timeout for other requests
});

// Apply enhanced security checks to API routes
app.use('/api/v1/*', (req, res, next) => {
  // Add request ID for tracking
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  // Add start time for performance tracking
  req.startTime = Date.now();
  
  // Validate API version
  const apiVersion = req.headers['x-api-version'];
  if (apiVersion && !['v1', 'v2'].includes(apiVersion)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      supportedVersions: ['v1', 'v2']
    });
  }
  
  next();
});

// Request logging middleware
app.use('/api/v1/*', (req, res, next) => {
  // Log request start
  loggingService.logAppEvent('info', 'API Request Started', {
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    userId: req.user?._id
  });

  // Log response when finished
  res.on('finish', () => {
    const processingTime = Date.now() - req.startTime;
    loggingService.logRequest(req, res, processingTime);
  });

  next();
});

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/ai", aiRouter)
app.use("/api/v1/templates", templateRouter)
app.use("/api/v1/website-generation", websiteGenerationRouter)
app.use("/api/v1/websites", websiteRouter)
app.use("/api/v1/websites", websitePublishRouter)
app.use("/api/v1/websites", websiteVersionsRouter)
app.use("/api/v1/processing", processingStatusDebugger, audioProcessingDebugger, unifiedProcessingRouter)
app.use("/api/v1/content", contentRegenerationRouter)
app.use("/api/v1/images", imageUploadRouter)

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// 404 handler for other routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    statusCode: 404
  });
});

// Error tracking middleware (before enhanced error handler)
app.use(errorTracker);

// Enhanced error handler (must be last)
app.use(enhancedErrorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export {app}