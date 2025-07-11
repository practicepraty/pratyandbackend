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
    const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf) || req.query._csrf;
    
    if (!token || !tokens.verify(secret, token)) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token validation failed'
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