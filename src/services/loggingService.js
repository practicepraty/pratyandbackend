// src/services/loggingService.js
import winston from 'winston';
import path from 'path';
import fs from 'fs';

class LoggingService {
  constructor() {
    this.loggers = {};
    this.initializeLoggers();
  }

  // Initialize different types of loggers
  initializeLoggers() {
    // Ensure logs directory exists
    const logsDir = './logs';
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Common log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta, null, 2)}`;
        }
        return msg;
      })
    );

    // Main application logger
    this.loggers.app = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'app.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5242880,
          maxFiles: 5
        })
      ]
    });

    // Add console transport for development
    if (process.env.NODE_ENV !== 'production') {
      this.loggers.app.add(new winston.transports.Console({
        format: consoleFormat
      }));
    }

    // Audio processing logger
    this.loggers.audio = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'audio-processing.log'),
          maxsize: 5242880,
          maxFiles: 3
        })
      ]
    });

    // Text processing logger
    this.loggers.text = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'text-processing.log'),
          maxsize: 5242880,
          maxFiles: 3
        })
      ]
    });

    // AI service logger
    this.loggers.ai = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'ai-service.log'),
          maxsize: 5242880,
          maxFiles: 3
        })
      ]
    });

    // WebSocket logger
    this.loggers.websocket = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'websocket.log'),
          maxsize: 2097152, // 2MB
          maxFiles: 2
        })
      ]
    });

    // Cache operations logger
    this.loggers.cache = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'cache.log'),
          maxsize: 2097152,
          maxFiles: 2
        })
      ]
    });

    // Performance logger
    this.loggers.performance = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'performance.log'),
          maxsize: 5242880,
          maxFiles: 3
        })
      ]
    });

    console.log('Logging service initialized');
  }

  // Get specific logger
  getLogger(type = 'app') {
    return this.loggers[type] || this.loggers.app;
  }

  // Log application events
  logAppEvent(level, message, meta = {}) {
    this.loggers.app[level](message, {
      ...meta,
      timestamp: new Date().toISOString(),
      type: 'app_event'
    });
  }

  // Log audio processing events
  logAudioProcessing(event, data = {}) {
    this.loggers.audio.info(`Audio Processing: ${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
      type: 'audio_processing'
    });
  }

  // Log text processing events
  logTextProcessing(event, data = {}) {
    this.loggers.text.info(`Text Processing: ${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
      type: 'text_processing'
    });
  }

  // Log AI service events
  logAIService(event, data = {}) {
    this.loggers.ai.info(`AI Service: ${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
      type: 'ai_service'
    });
  }

  // Log WebSocket events
  logWebSocket(event, data = {}) {
    this.loggers.websocket.info(`WebSocket: ${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
      type: 'websocket'
    });
  }

  // Log cache operations
  logCache(operation, data = {}) {
    this.loggers.cache.info(`Cache: ${operation}`, {
      ...data,
      timestamp: new Date().toISOString(),
      type: 'cache_operation'
    });
  }

  // Log performance metrics
  logPerformance(metric, data = {}) {
    this.loggers.performance.info(`Performance: ${metric}`, {
      ...data,
      timestamp: new Date().toISOString(),
      type: 'performance_metric'
    });
  }

  // Log request processing with timing
  logRequest(req, res, processingTime, additionalData = {}) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      processingTime,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      userId: req.user?._id,
      requestId: req.requestId,
      contentLength: res.get('content-length'),
      ...additionalData,
      timestamp: new Date().toISOString(),
      type: 'request'
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.loggers.app[level](`${req.method} ${req.originalUrl} - ${res.statusCode}`, logData);
  }

  // Log user authentication events
  logAuth(event, userId, additionalData = {}) {
    this.loggers.app.info(`Auth: ${event}`, {
      userId,
      ...additionalData,
      timestamp: new Date().toISOString(),
      type: 'authentication'
    });
  }

  // Log file operations
  logFileOperation(operation, filename, additionalData = {}) {
    this.loggers.app.info(`File: ${operation}`, {
      filename,
      ...additionalData,
      timestamp: new Date().toISOString(),
      type: 'file_operation'
    });
  }

  // Log database operations
  logDatabase(operation, collection, additionalData = {}) {
    this.loggers.app.info(`Database: ${operation}`, {
      collection,
      ...additionalData,
      timestamp: new Date().toISOString(),
      type: 'database_operation'
    });
  }

  // Log external API calls
  logExternalAPI(service, operation, additionalData = {}) {
    this.loggers.app.info(`External API: ${service} - ${operation}`, {
      service,
      operation,
      ...additionalData,
      timestamp: new Date().toISOString(),
      type: 'external_api'
    });
  }

  // Log security events
  logSecurity(event, additionalData = {}) {
    this.loggers.app.warn(`Security: ${event}`, {
      ...additionalData,
      timestamp: new Date().toISOString(),
      type: 'security_event'
    });
  }

  // Log error with context
  logError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      ...context,
      timestamp: new Date().toISOString(),
      type: 'error'
    };

    this.loggers.app.error(`Error: ${error.message}`, errorData);
  }

  // Create structured log entry
  createLogEntry(category, event, data = {}) {
    return {
      category,
      event,
      ...data,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Log system metrics
  logSystemMetrics() {
    const metrics = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      type: 'system_metrics'
    };

    this.loggers.performance.info('System Metrics', metrics);
  }

  // Start periodic system metrics logging
  startMetricsLogging(intervalMs = 300000) { // 5 minutes
    setInterval(() => {
      this.logSystemMetrics();
    }, intervalMs);
  }

  // Get log statistics
  getLogStats() {
    const stats = {};
    
    Object.keys(this.loggers).forEach(loggerName => {
      const logger = this.loggers[loggerName];
      stats[loggerName] = {
        level: logger.level,
        transports: logger.transports.length
      };
    });

    return {
      loggers: stats,
      logsDirectory: './logs',
      timestamp: new Date().toISOString()
    };
  }

  // Cleanup old log files
  cleanupOldLogs(maxAgeInDays = 30) {
    const logsDir = './logs';
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();

    try {
      const files = fs.readdirSync(logsDir);
      let deletedCount = 0;

      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
          this.logAppEvent('info', 'Old log file deleted', { filename: file, age: Math.round((now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) });
        }
      });

      if (deletedCount > 0) {
        this.logAppEvent('info', 'Log cleanup completed', { deletedFiles: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      this.logError(error, { operation: 'log_cleanup' });
      return 0;
    }
  }

  // Start periodic log cleanup
  startLogCleanup(intervalHours = 24, maxAgeInDays = 30) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(() => {
      this.cleanupOldLogs(maxAgeInDays);
    }, intervalMs);
    
    // Run initial cleanup
    setTimeout(() => {
      this.cleanupOldLogs(maxAgeInDays);
    }, 60000); // 1 minute after startup
  }
}

// Create singleton instance
const loggingService = new LoggingService();

// Start periodic logging and cleanup
loggingService.startMetricsLogging();
loggingService.startLogCleanup();

export default loggingService;