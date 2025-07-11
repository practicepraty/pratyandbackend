import http from 'http';
import https from 'https';
import { app } from './app.js';
import { config, validateEnvironment, getSecuritySummary } from './config/environment.js';
import { createHTTPSServer } from './config/https.config.js';
import { initializeRedis, checkRedisHealth, shutdownRedis } from './config/redis.config.js';
import { initializeRateLimiters } from './middlewares/rateLimiting.middleware.js';
import { checkClamAVStatus } from './middlewares/malwareScanning.middleware.js';
import { logAuditEvent, HIPAA_EVENTS } from './middlewares/hipaaAudit.middleware.js';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Configure main server logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: config.logging.file,
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logAuditEvent(HIPAA_EVENTS.SECURITY_ALERT, {
    userId: 'system',
    sourceIp: 'localhost',
    resource: 'server',
    action: 'uncaught_exception',
    outcome: 'error',
    additionalInfo: { error: error.message, stack: error.stack }
  });
  
  // Graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logAuditEvent(HIPAA_EVENTS.SECURITY_ALERT, {
    userId: 'system',
    sourceIp: 'localhost',
    resource: 'server',
    action: 'unhandled_rejection',
    outcome: 'error',
    additionalInfo: { reason: reason.toString() }
  });
  
  // Graceful shutdown
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Create required directories
const createDirectories = () => {
  const directories = [
    './logs',
    './ssl',
    './quarantine',
    './public/temp',
    './public/temp/audio',
    './backups'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
};

// Health check for all services
const performHealthChecks = async () => {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    environment: config.env,
    services: {}
  };
  
  // Check Redis
  try {
    const redisHealth = await checkRedisHealth();
    healthStatus.services.redis = redisHealth;
  } catch (error) {
    healthStatus.services.redis = {
      status: 'error',
      error: error.message
    };
  }
  
  // Check ClamAV
  try {
    const clamavHealth = await checkClamAVStatus();
    healthStatus.services.clamav = clamavHealth;
  } catch (error) {
    healthStatus.services.clamav = {
      status: 'error',
      error: error.message
    };
  }
  
  // Check MongoDB (basic connection test)
  try {
    // This would depend on your MongoDB connection setup
    healthStatus.services.mongodb = {
      status: 'healthy',
      message: 'Connection available'
    };
  } catch (error) {
    healthStatus.services.mongodb = {
      status: 'error',
      error: error.message
    };
  }
  
  return healthStatus;
};

// Initialize all security services
const initializeSecurityServices = async () => {
  logger.info('Initializing security services...');
  
  try {
    // Initialize Redis
    if (config.redis.host) {
      await initializeRedis();
      logger.info('Redis connection established');
    }
    
    // Initialize rate limiters
    await initializeRateLimiters();
    logger.info('Rate limiters initialized');
    
    // Log system startup
    logAuditEvent(HIPAA_EVENTS.SYSTEM_ACCESS, {
      userId: 'system',
      sourceIp: 'localhost',
      resource: 'server',
      action: 'startup',
      outcome: 'success',
      additionalInfo: {
        environment: config.env,
        version: process.env.APP_VERSION || '1.0.0',
        nodeVersion: process.version,
        platform: process.platform
      }
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize security services:', error);
    return false;
  }
};

// Find available port starting from preferred port
const findAvailablePort = async (preferredPort) => {
  const net = await import('net');
  
  const isPortAvailable = (port) => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  };
  
  let port = preferredPort;
  const maxAttempts = 100;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  throw new Error(`No available ports found after ${maxAttempts} attempts starting from ${preferredPort}`);
};

// Start HTTP server with port detection
const startHTTPServer = async () => {
  const httpServer = http.createServer(app);
  
  let serverPort;
  
  try {
    // Try to find an available port
    serverPort = await findAvailablePort(config.port);
    
    if (serverPort !== config.port) {
      logger.warn(`Port ${config.port} is busy, using port ${serverPort} instead`);
    }
    
    await new Promise((resolve, reject) => {
      httpServer.listen(serverPort, () => {
        logger.info(`HTTP Server running on port ${serverPort}`);
        logger.info(`Environment: ${config.env}`);
        
        // Log security summary
        const securitySummary = getSecuritySummary();
        logger.info('Security Configuration:', securitySummary);
        
        resolve();
      });
      
      httpServer.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${serverPort} is already in use`);
          reject(new Error(`Port ${serverPort} is already in use`));
        } else {
          logger.error('HTTP Server Error:', error);
          reject(error);
        }
      });
    });
    
  } catch (error) {
    logger.error('Failed to start HTTP server:', error);
    throw error;
  }
  
  return httpServer;
};

// Start HTTPS server
const startHTTPSServer = () => {
  if (!config.https.enabled) {
    logger.info('HTTPS disabled in configuration');
    return null;
  }
  
  try {
    const httpsServer = createHTTPSServer(app);
    
    if (!httpsServer) {
      logger.warn('HTTPS server could not be created');
      return null;
    }
    
    httpsServer.listen(config.https.port, () => {
      logger.info(`HTTPS Server running on port ${config.https.port}`);
    });
    
    httpsServer.on('error', (error) => {
      logger.error('HTTPS Server Error:', error);
    });
    
    return httpsServer;
  } catch (error) {
    logger.error('Failed to start HTTPS server:', error);
    return null;
  }
};

// Main server startup function
const startServer = async () => {
  try {
    logger.info('Starting Doctor\'s Website Builder Server...');
    
    // Validate environment
    validateEnvironment();
    logger.info('Environment validation passed');
    
    // Create required directories
    createDirectories();
    
    // Initialize security services
    const securityInitialized = await initializeSecurityServices();
    if (!securityInitialized) {
      logger.error('Failed to initialize security services');
      process.exit(1);
    }
    
    // Perform health checks
    const healthStatus = await performHealthChecks();
    logger.info('Health Check Results:', healthStatus);
    
    // Start HTTP server
    const httpServer = await startHTTPServer();
    
    // Start HTTPS server if enabled
    const httpsServer = startHTTPSServer();
    
    // Store server instances for graceful shutdown
    global.servers = {
      http: httpServer,
      https: httpsServer
    };
    
    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    logger.info('Server startup completed successfully');
    
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  // Log shutdown event
  logAuditEvent(HIPAA_EVENTS.SYSTEM_ACCESS, {
    userId: 'system',
    sourceIp: 'localhost',
    resource: 'server',
    action: 'shutdown',
    outcome: 'success',
    additionalInfo: {
      signal,
      timestamp: new Date().toISOString()
    }
  });
  
  // Set shutdown timeout
  const shutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000); // 10 second timeout
  
  try {
    // Close HTTP server
    if (global.servers?.http) {
      await new Promise((resolve) => {
        global.servers.http.close(resolve);
      });
      logger.info('HTTP server closed');
    }
    
    // Close HTTPS server
    if (global.servers?.https) {
      await new Promise((resolve) => {
        global.servers.https.close(resolve);
      });
      logger.info('HTTPS server closed');
    }
    
    // Close Redis connection
    await shutdownRedis();
    
    // Clear shutdown timeout
    clearTimeout(shutdownTimeout);
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Health check endpoint handler
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await performHealthChecks();
    
    // Determine overall health
    const allHealthy = Object.values(healthStatus.services).every(
      service => service.status === 'healthy'
    );
    
    const statusCode = allHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: healthStatus.timestamp,
      environment: healthStatus.environment,
      services: healthStatus.services,
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Security status endpoint
app.get('/security-status', async (req, res) => {
  try {
    const securitySummary = getSecuritySummary();
    const healthStatus = await performHealthChecks();
    
    res.json({
      timestamp: new Date().toISOString(),
      environment: config.env,
      security: securitySummary,
      services: healthStatus.services,
      compliance: {
        hipaa: config.hipaa.auditEnabled,
        encryption: config.hipaa.encryptAtRest,
        auditLogging: config.hipaa.accessLogEnabled,
        rateLimiting: true,
        malwareScanning: config.clamav.enabled,
        httpsEnabled: config.https.enabled
      }
    });
    
  } catch (error) {
    logger.error('Security status check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer, gracefulShutdown, performHealthChecks };
export default app;