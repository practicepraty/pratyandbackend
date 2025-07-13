import Redis from 'ioredis';
import winston from 'winston';
import { config } from './environment.js';

// Configure logger for Redis operations
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: './logs/redis.log',
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Redis configuration with security enhancements
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  
  // Connection options
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  
  // Security options
  tls: config.redis.tls ? {
    rejectUnauthorized: true,
    checkServerIdentity: () => undefined // Allow self-signed certificates in dev
  } : undefined,
  
  // Connection pooling
  family: 4,
  
  // Retry strategy
  retryStrategy: (times) => {
    // Stop retrying after 3 attempts to avoid spam
    if (times > 3) {
      logger.info('Redis retry limit reached, switching to fallback mode');
      return null;
    }
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  
  // Reconnect on error
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    return err.message.includes(targetError);
  },
  
  // Connection name for monitoring
  connectionName: 'doctors-website-builder',
  
  // Enable automatic pipelining for better performance
  enableAutoPipelining: true,
  
  // Maximum number of commands in the pipeline
  maxPipeline: 10,
  
  // Keyspace notifications for monitoring
  keyPrefix: 'dwb:',
  
  // Lua script caching
  enableOfflineQueue: false,
  
  // Connection monitoring
  showFriendlyErrorStack: config.development.debug
};

// Create Redis client instance
let redisClient = null;
let redisHealthy = false;

// Initialize Redis connection with fallback
export const initializeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.disconnect();
    }
    
    redisClient = new Redis(redisConfig);
    
    // Event listeners for connection monitoring
    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
      redisHealthy = true;
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis ready to receive commands');
      redisHealthy = true;
    });
    
    redisClient.on('error', (error) => {
      logger.warn('Redis connection error (using fallback):', error.message);
      redisHealthy = false;
      // Don't throw here, allow graceful degradation
    });
    
    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
      redisHealthy = false;
    });
    
    redisClient.on('reconnecting', (delay) => {
      logger.info(`Redis reconnecting in ${delay}ms`);
    });
    
    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
      redisHealthy = false;
    });
    
    // Test connection with timeout
    const connectionPromise = redisClient.ping();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    logger.info('Redis connection established and tested');
    
    return redisClient;
  } catch (error) {
    logger.warn('Redis initialization failed, will use fallback mechanisms:', error.message);
    redisHealthy = false;
    redisClient = null;
    
    // Return null to indicate fallback mode
    return null;
  }
};

// Get Redis client instance with fallback
export const getRedisClient = () => {
  if (!redisClient) {
    // Only log this occasionally to reduce noise
    if (Math.random() < 0.01) { // 1% chance to log
      logger.info('Redis client not available, using memory fallback');
    }
    return null;
  }
  return redisClient;
};

// Safe Redis operation wrapper
export const safeRedisOperation = async (operation, fallback = null) => {
  try {
    const client = getRedisClient();
    if (!client) {
      // Silent fallback - no need to log every time
      return fallback;
    }
    
    return await operation(client);
  } catch (error) {
    logger.debug('Redis operation failed, using fallback:', error.message);
    return fallback;
  }
};

// Check Redis health
export const checkRedisHealth = async () => {
  try {
    if (!redisClient) {
      return {
        status: 'disconnected',
        message: 'Redis client not initialized'
      };
    }
    
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;
    
    const info = await redisClient.info();
    const memory = await redisClient.memory('usage');
    
    return {
      status: 'healthy',
      responseTime,
      memory,
      info: info.split('\r\n').filter(line => 
        line.includes('redis_version') || 
        line.includes('connected_clients') || 
        line.includes('used_memory_human') ||
        line.includes('total_commands_processed')
      ).join('\n'),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Redis connection pool for rate limiting
export const createRedisPool = (poolSize = 10) => {
  const pool = [];
  
  for (let i = 0; i < poolSize; i++) {
    const client = new Redis({
      ...redisConfig,
      connectionName: `${redisConfig.connectionName}-pool-${i}`
    });
    
    pool.push(client);
  }
  
  return pool;
};

// Get Redis statistics
export const getRedisStats = async () => {
  try {
    const client = getRedisClient();
    const info = await client.info();
    const dbSize = await client.dbsize();
    const memory = await client.memory('usage');
    
    // Parse info string into object
    const stats = {};
    info.split('\r\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });
    
    return {
      dbSize,
      memory,
      connectedClients: parseInt(stats.connected_clients) || 0,
      totalCommandsProcessed: parseInt(stats.total_commands_processed) || 0,
      usedMemory: stats.used_memory_human || '0B',
      redisVersion: stats.redis_version || 'unknown',
      uptime: parseInt(stats.uptime_in_seconds) || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get Redis stats:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Clean up expired keys
export const cleanupExpiredKeys = async () => {
  try {
    const client = getRedisClient();
    const keys = await client.keys('dwb:*');
    
    let cleanedCount = 0;
    for (const key of keys) {
      const ttl = await client.ttl(key);
      if (ttl === -1) { // Key exists but has no expiry
        // Set default expiry based on key type
        if (key.includes('session')) {
          await client.expire(key, 86400); // 24 hours for sessions
        } else if (key.includes('rate_limit')) {
          await client.expire(key, 3600); // 1 hour for rate limits
        } else if (key.includes('cache')) {
          await client.expire(key, 1800); // 30 minutes for cache
        }
        cleanedCount++;
      }
    }
    
    logger.info(`Redis cleanup completed: ${cleanedCount} keys processed`);
    return { cleanedCount, totalKeys: keys.length };
  } catch (error) {
    logger.error('Redis cleanup failed:', error);
    throw error;
  }
};

// Redis monitoring middleware
export const redisMonitoringMiddleware = (req, res, next) => {
  // Track Redis operations for this request
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow Redis operation detected', {
        url: req.url,
        method: req.method,
        duration,
        ip: req.ip
      });
    }
  });
  
  next();
};

// Graceful shutdown
export const shutdownRedis = async () => {
  try {
    if (redisClient) {
      logger.info('Closing Redis connection...');
      await redisClient.quit();
      redisClient = null;
      redisHealthy = false;
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error during Redis shutdown:', error);
  }
};

// Redis security commands
export const secureRedisCommands = async () => {
  try {
    const client = getRedisClient();
    
    // Disable dangerous commands in production
    if (config.env === 'production') {
      const dangerousCommands = [
        'FLUSHDB', 'FLUSHALL', 'CONFIG', 'EVAL', 'EVALSHA',
        'SCRIPT', 'SHUTDOWN', 'DEBUG', 'MONITOR'
      ];
      
      for (const command of dangerousCommands) {
        try {
          await client.config('SET', `rename-command ${command}`, '');
        } catch (error) {
          // Some commands might already be disabled
          logger.warn(`Could not disable Redis command ${command}:`, error.message);
        }
      }
      
      logger.info('Redis security commands configured');
    }
  } catch (error) {
    logger.error('Failed to configure Redis security:', error);
  }
};

// Export Redis configuration
export const redisConnectionConfig = redisConfig;

// Export health status
export const isRedisHealthy = () => redisHealthy;

export default {
  initializeRedis,
  getRedisClient,
  checkRedisHealth,
  createRedisPool,
  getRedisStats,
  cleanupExpiredKeys,
  redisMonitoringMiddleware,
  shutdownRedis,
  secureRedisCommands,
  isRedisHealthy
};