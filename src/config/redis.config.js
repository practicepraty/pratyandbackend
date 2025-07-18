// Enhanced Redis configuration with better fallback handling
import Redis from 'ioredis';
import winston from 'winston';
import { config } from './environment.js';

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

// Enhanced Redis configuration with better connection handling
const redisConfig = {
  host: config.redis.host || 'localhost',
  port: config.redis.port || 6379,
  password: config.redis.password || undefined,
  db: config.redis.db || 0,
  
  // Enhanced connection options
  connectTimeout: 5000,
  commandTimeout: 3000,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  keepAlive: 30000,
  
  // Improved retry strategy
  retryStrategy: (times) => {
    if (times > 2) {
      logger.warn('Redis retry limit reached, using fallback mode');
      return null;
    }
    const delay = Math.min(times * 100, 1000);
    logger.debug(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  
  // Connection name for monitoring
  connectionName: 'website-builder',
  
  // Enable offline queue for better reliability
  enableOfflineQueue: true,
  
  // Connection monitoring
  showFriendlyErrorStack: config.env === 'development'
};

let redisClient = null;
let redisHealthy = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

// Initialize Redis with enhanced error handling
export const initializeRedis = async () => {
  try {
    if (redisClient) {
      try {
        await redisClient.disconnect();
      } catch (error) {
        logger.debug('Error disconnecting existing Redis client:', error.message);
      }
    }
    
    // Create new Redis client
    redisClient = new Redis(redisConfig);
    
    // Enhanced event listeners
    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
      redisHealthy = true;
      reconnectAttempts = 0;
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis ready to receive commands');
      redisHealthy = true;
    });
    
    redisClient.on('error', (error) => {
      logger.warn(`Redis error: ${error.message}`);
      redisHealthy = false;
      
      // Don't throw, allow graceful degradation
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        logger.info(`Attempting Redis reconnection (${reconnectAttempts}/${maxReconnectAttempts})`);
      } else {
        logger.warn('Max Redis reconnection attempts reached, using fallback mode');
      }
    });
    
    redisClient.on('close', () => {
      logger.info('Redis connection closed');
      redisHealthy = false;
    });
    
    redisClient.on('reconnecting', (delay) => {
      logger.info(`Redis reconnecting in ${delay}ms`);
    });
    
    redisClient.on('end', () => {
      logger.info('Redis connection ended');
      redisHealthy = false;
    });
    
    // Test connection with shorter timeout
    try {
      await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
        )
      ]);
      logger.info('Redis connection established and tested');
      return redisClient;
    } catch (error) {
      logger.warn('Redis connection test failed, using fallback mode:', error.message);
      redisHealthy = false;
      return null;
    }
    
  } catch (error) {
    logger.warn('Redis initialization failed, using fallback mode:', error.message);
    redisHealthy = false;
    redisClient = null;
    return null;
  }
};

// Enhanced Redis operation wrapper with circuit breaker pattern
let circuitBreakerOpen = false;
let circuitBreakerOpenTime = 0;
const circuitBreakerTimeout = 30000; // 30 seconds

export const safeRedisOperation = async (operation, fallback = null) => {
  // Check circuit breaker
  if (circuitBreakerOpen) {
    const now = Date.now();
    if (now - circuitBreakerOpenTime > circuitBreakerTimeout) {
      circuitBreakerOpen = false;
      logger.info('Circuit breaker reset, attempting Redis operations');
    } else {
      return fallback;
    }
  }
  
  try {
    const client = getRedisClient();
    if (!client || !redisHealthy) {
      return fallback;
    }
    
    const result = await operation(client);
    return result;
  } catch (error) {
    logger.debug('Redis operation failed:', error.message);
    
    // Open circuit breaker on consecutive failures
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      circuitBreakerOpen = true;
      circuitBreakerOpenTime = Date.now();
      logger.warn('Circuit breaker opened due to Redis failures');
    }
    
    return fallback;
  }
};

// Get Redis client with health check
export const getRedisClient = () => {
  if (!redisClient || !redisHealthy) {
    return null;
  }
  return redisClient;
};

// Enhanced health check
export const checkRedisHealth = async () => {
  try {
    if (!redisClient) {
      return {
        status: 'unavailable',
        message: 'Redis client not initialized',
        healthy: false
      };
    }
    
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime,
      healthy: true,
      circuitBreakerOpen,
      reconnectAttempts,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      healthy: false,
      circuitBreakerOpen,
      reconnectAttempts,
      timestamp: new Date().toISOString()
    };
  }
};

// Check if Redis is healthy
export const isRedisHealthy = () => redisHealthy && !circuitBreakerOpen;

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

export default {
  initializeRedis,
  getRedisClient,
  checkRedisHealth,
  safeRedisOperation,
  isRedisHealthy,
  shutdownRedis
};