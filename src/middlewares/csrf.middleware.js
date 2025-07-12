import csrf from 'csrf';
import { ApiError } from '../utils/apierror.js';

const tokens = new csrf();

// CSRF protection middleware
export const csrfProtection = (req, res, next) => {
  // Check if session exists
  if (!req.session) {
    console.warn('Session not found, skipping CSRF protection');
    return next();
  }
  
  const secret = req.session.csrfSecret || (req.session.csrfSecret = tokens.secretSync());
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Extract CSRF token from various sources
    let token = req.headers['x-csrf-token'] || 
                req.headers['csrf-token'] ||
                (req.body && req.body._csrf) || 
                (req.body && req.body.csrfToken) ||
                req.query._csrf ||
                req.query.csrfToken;
    
    // For multipart/form-data, check if token is in the body fields
    if (!token && req.headers['content-type']?.includes('multipart/form-data')) {
      // Try to extract from form fields
      if (req.body) {
        token = req.body.csrfToken || req.body._csrf;
      }
    }
    
    if (!token) {
      console.log('CSRF token not found in headers, body, or query');
      console.log('Available headers:', Object.keys(req.headers));
      console.log('Body keys:', req.body ? Object.keys(req.body) : 'No body');
      return res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token validation failed - token not provided'
      });
    }
    
    if (!tokens.verify(secret, token)) {
      console.log('CSRF token verification failed');
      return res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token validation failed - invalid token'
      });
    }
  }
  
  next();
};

// Error handler for CSRF failures
export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID',
      message: 'CSRF token validation failed'
    });
  } else {
    next(err);
  }
};

// Middleware to provide CSRF token to client
export const provideCsrfToken = (req, res, next) => {
  // Check if session exists
  if (!req.session) {
    console.warn('Session not found, skipping CSRF token provision');
    return next();
  }
  
  const secret = req.session.csrfSecret || (req.session.csrfSecret = tokens.secretSync());
  res.locals.csrfToken = tokens.create(secret);
  next();
};

// Skip CSRF for certain routes (like health checks)
export const skipCsrfFor = (paths) => {
  return (req, res, next) => {
    if (paths.includes(req.path)) {
      return next();
    }
    return csrfProtection(req, res, next);
  };
};