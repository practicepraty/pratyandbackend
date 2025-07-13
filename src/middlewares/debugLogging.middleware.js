// Enhanced Debug Logging Middleware for Frontend Integration Issues
import winston from 'winston';
import { ApiError } from '../utils/apierror.js';

// Create debug logger
const debugLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: './logs/debug.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    })
  ]
});

// Request debugging middleware
export const requestDebugger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  
  // Log incoming request details
  debugLogger.info(`[REQUEST] ${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer [REDACTED]' : 'None',
      'x-csrf-token': req.headers['x-csrf-token'] ? '[REDACTED]' : 'None',
      'origin': req.headers.origin,
      'user-agent': req.headers['user-agent']
    },
    query: req.query,
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
    hasFile: !!req.file,
    userId: req.user?._id,
    ip: req.ip
  });

  // Track request timing
  const startTime = Date.now();
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body) {
    const responseTime = Date.now() - startTime;
    
    debugLogger.info(`[RESPONSE] ${req.method} ${req.originalUrl}`, {
      requestId,
      statusCode: res.statusCode,
      responseTime,
      success: res.statusCode < 400,
      bodySize: JSON.stringify(body).length,
      userId: req.user?._id
    });
    
    return originalJson.call(this, body);
  };

  next();
};

// Processing status debug middleware
export const processingStatusDebugger = (req, res, next) => {
  if (req.originalUrl.includes('/processing/status/')) {
    const { requestId } = req.params;
    
    debugLogger.debug(`[PROCESSING STATUS] Request for ID: ${requestId}`, {
      requestId: req.requestId,
      processingRequestId: requestId,
      userId: req.user?._id,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Audio processing debug middleware
export const audioProcessingDebugger = (req, res, next) => {
  if (req.originalUrl.includes('/process-audio')) {
    debugLogger.debug(`[AUDIO PROCESSING] Request details`, {
      requestId: req.requestId,
      hasFile: !!req.file,
      fileDetails: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename
      } : null,
      bodyParameters: req.body,
      userId: req.user?._id
    });
  }
  
  next();
};

// WebSocket connection debugger
export const websocketDebugger = (io) => {
  io.use((socket, next) => {
    debugLogger.debug(`[WEBSOCKET] Connection attempt`, {
      socketId: socket.id,
      origin: socket.handshake.headers.origin,
      userAgent: socket.handshake.headers['user-agent'],
      hasToken: !!(socket.handshake.auth.token || socket.handshake.query.token),
      timestamp: new Date().toISOString()
    });
    next();
  });

  io.on('connection', (socket) => {
    debugLogger.info(`[WEBSOCKET] Client connected`, {
      socketId: socket.id,
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });

    socket.on('disconnect', (reason) => {
      debugLogger.info(`[WEBSOCKET] Client disconnected`, {
        socketId: socket.id,
        userId: socket.userId,
        reason,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('error', (error) => {
      debugLogger.error(`[WEBSOCKET] Socket error`, {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
  });
};

// Error tracking middleware
export const errorTracker = (error, req, res, next) => {
  const errorDetails = {
    requestId: req.requestId,
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: {
        'content-type': req.headers['content-type'],
        'origin': req.headers.origin,
        'user-agent': req.headers['user-agent']
      },
      body: req.body,
      params: req.params,
      query: req.query,
      hasFile: !!req.file,
      fileDetails: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null
    },
    user: {
      id: req.user?._id,
      email: req.user?.personalInfo?.professionalEmail
    },
    timestamp: new Date().toISOString()
  };

  debugLogger.error(`[ERROR] ${error.message}`, errorDetails);

  // Track specific error patterns
  if (error.message.includes('processing status')) {
    debugLogger.error(`[PROCESSING STATUS ERROR] Critical error in status endpoint`, errorDetails);
  }

  if (error.message.includes('toLowerCase')) {
    debugLogger.error(`[TOLOWERCASE ERROR] String conversion error`, errorDetails);
  }

  if (req.originalUrl.includes('process-audio') && error.statusCode === 400) {
    debugLogger.error(`[AUDIO PROCESSING ERROR] 400 error in audio endpoint`, errorDetails);
  }

  next(error);
};

// Health check logger
export const healthCheckLogger = (req, res, next) => {
  if (req.originalUrl === '/health' || req.originalUrl.includes('/health')) {
    debugLogger.debug(`[HEALTH CHECK] Request from ${req.ip}`, {
      requestId: req.requestId,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Performance monitoring
export const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    if (responseTime > 1000) { // Log slow requests (> 1 second)
      debugLogger.warn(`[PERFORMANCE] Slow request detected`, {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        responseTime,
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed
        },
        statusCode: res.statusCode,
        userId: req.user?._id
      });
    }
  });

  next();
};

export { debugLogger };