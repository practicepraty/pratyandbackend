// src/middlewares/errorHandler.middleware.js
import { ApiError } from "../utils/apierror.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(400, message);
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ApiError(400, message);
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ApiError(404, message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ApiError(401, message);
  }

  // Handle JWT expired errors
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ApiError(401, message);
  }

  // Handle AWS/Bedrock specific errors
  if (err.name === 'ProvisionedThroughputExceededException') {
    const message = 'AI service is currently busy. Please try again in a moment.';
    error = new ApiError(429, message);
  }

  if (err.name === 'ModelNotReadyException') {
    const message = 'AI model is currently unavailable. Please try again later.';
    error = new ApiError(503, message);
  }

  if (err.name === 'AccessDeniedException') {
    const message = 'AI service access denied. Please contact support.';
    error = new ApiError(403, message);
  }

  // Handle rate limiting errors
  if (err.name === 'ThrottleException') {
    const message = 'Too many requests. Please try again later.';
    error = new ApiError(429, message);
  }

  // Log error for debugging
  console.error('Error Handler:', {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    statusCode: error.statusCode || 500,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export { errorHandler };