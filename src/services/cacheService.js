// src/services/cacheService.js
import NodeCache from 'node-cache';
import crypto from 'crypto';
import { safeRedisOperation } from '../config/redis.config.js';

class CacheService {
  constructor() {
    // In-memory cache as fallback
    this.memoryCache = new NodeCache({
      stdTTL: 3600, // 1 hour default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false
    });

    this.defaultTTL = {
      transcription: 86400, // 24 hours
      textProcessing: 7200, // 2 hours
      aiGeneration: 3600, // 1 hour
      userSessions: 1800, // 30 minutes
      apiResponses: 300, // 5 minutes
      progress: 3600 // 1 hour
    };
  }

  // Generate cache key
  generateKey(type, identifier, suffix = '') {
    const hash = crypto.createHash('md5').update(identifier).digest('hex');
    return `${type}:${hash}${suffix ? ':' + suffix : ''}`;
  }

  // Set cache with Redis fallback to memory
  async set(key, value, ttl = null) {
    const actualTTL = ttl || this.defaultTTL.apiResponses;
    
    try {
      // Try Redis first
      const redisResult = await safeRedisOperation(
        async (client) => {
          await client.setEx(key, actualTTL, JSON.stringify(value));
          return true;
        },
        null
      );

      if (redisResult === null) {
        // Redis failed, use memory cache
        this.memoryCache.set(key, value, actualTTL);
        console.log(`Set cache key in memory: ${key}`);
      } else {
        console.log(`Set cache key in Redis: ${key}`);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      // Fallback to memory cache
      this.memoryCache.set(key, value, actualTTL);
      return true;
    }
  }

  // Get cache with Redis fallback to memory
  async get(key) {
    try {
      // Try Redis first
      const redisResult = await safeRedisOperation(
        async (client) => {
          const value = await client.get(key);
          return value ? JSON.parse(value) : null;
        },
        null
      );

      if (redisResult !== null) {
        console.log(`Cache hit in Redis: ${key}`);
        return redisResult;
      }

      // Redis failed or no value, try memory cache
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== undefined) {
        console.log(`Cache hit in memory: ${key}`);
        return memoryValue;
      }

      console.log(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      // Try memory cache as final fallback
      const memoryValue = this.memoryCache.get(key);
      return memoryValue !== undefined ? memoryValue : null;
    }
  }

  // Delete cache key
  async delete(key) {
    try {
      // Try Redis first
      await safeRedisOperation(
        async (client) => {
          await client.del(key);
        },
        null
      );

      // Also delete from memory cache
      this.memoryCache.del(key);
      console.log(`Deleted cache key: ${key}`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      // Still try to delete from memory
      this.memoryCache.del(key);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      // Check Redis first
      const redisResult = await safeRedisOperation(
        async (client) => {
          return await client.exists(key);
        },
        null
      );

      if (redisResult === 1) {
        return true;
      }

      // Check memory cache
      return this.memoryCache.has(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return this.memoryCache.has(key);
    }
  }

  // Cache transcription results
  async cacheTranscription(transcriptionId, result) {
    const key = this.generateKey('transcription', transcriptionId);
    return await this.set(key, result, this.defaultTTL.transcription);
  }

  // Get cached transcription
  async getCachedTranscription(transcriptionId) {
    const key = this.generateKey('transcription', transcriptionId);
    return await this.get(key);
  }

  // Cache text processing results
  async cacheTextProcessing(text, specialty, result) {
    const textHash = crypto.createHash('md5').update(text + specialty).digest('hex');
    const key = this.generateKey('textProcessing', textHash);
    return await this.set(key, result, this.defaultTTL.textProcessing);
  }

  // Get cached text processing
  async getCachedTextProcessing(text, specialty) {
    const textHash = crypto.createHash('md5').update(text + specialty).digest('hex');
    const key = this.generateKey('textProcessing', textHash);
    return await this.get(key);
  }

  // Cache AI generation results
  async cacheAIGeneration(prompt, model, result) {
    const promptHash = crypto.createHash('md5').update(prompt + model).digest('hex');
    const key = this.generateKey('aiGeneration', promptHash);
    return await this.set(key, result, this.defaultTTL.aiGeneration);
  }

  // Get cached AI generation
  async getCachedAIGeneration(prompt, model) {
    const promptHash = crypto.createHash('md5').update(prompt + model).digest('hex');
    const key = this.generateKey('aiGeneration', promptHash);
    return await this.get(key);
  }

  // Cache user session data
  async cacheUserSession(userId, sessionData) {
    const key = this.generateKey('userSession', userId);
    return await this.set(key, sessionData, this.defaultTTL.userSessions);
  }

  // Get cached user session
  async getCachedUserSession(userId) {
    const key = this.generateKey('userSession', userId);
    return await this.get(key);
  }

  // Cache progress data
  async cacheProgress(requestId, progressData) {
    const key = this.generateKey('progress', requestId);
    return await this.set(key, progressData, this.defaultTTL.progress);
  }

  // Get cached progress
  async getCachedProgress(requestId) {
    const key = this.generateKey('progress', requestId);
    return await this.get(key);
  }

  // Cache API response
  async cacheApiResponse(endpoint, params, response) {
    const paramsHash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    const key = this.generateKey('apiResponse', endpoint, paramsHash);
    return await this.set(key, response, this.defaultTTL.apiResponses);
  }

  // Get cached API response
  async getCachedApiResponse(endpoint, params) {
    const paramsHash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    const key = this.generateKey('apiResponse', endpoint, paramsHash);
    return await this.get(key);
  }

  // Invalidate cache by pattern
  async invalidatePattern(pattern) {
    try {
      // For Redis
      await safeRedisOperation(
        async (client) => {
          const keys = await client.keys(pattern);
          if (keys.length > 0) {
            await client.del(keys);
          }
        },
        null
      );

      // For memory cache, we need to manually find matching keys
      const memoryKeys = this.memoryCache.keys();
      const matchingKeys = memoryKeys.filter(key => {
        // Simple pattern matching (replace * with .*)
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(key);
      });

      matchingKeys.forEach(key => {
        this.memoryCache.del(key);
      });

      console.log(`Invalidated ${matchingKeys.length} keys matching pattern: ${pattern}`);
      return true;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return false;
    }
  }

  // Clear all cache
  async clearAll() {
    try {
      // Clear Redis
      await safeRedisOperation(
        async (client) => {
          await client.flushAll();
        },
        null
      );

      // Clear memory cache
      this.memoryCache.flushAll();
      console.log('All cache cleared');
      return true;
    } catch (error) {
      console.error('Clear all cache error:', error);
      // Still clear memory cache
      this.memoryCache.flushAll();
      return false;
    }
  }

  // Get cache statistics
  async getStats() {
    try {
      const memoryStats = this.memoryCache.getStats();
      
      let redisStats = null;
      await safeRedisOperation(
        async (client) => {
          const info = await client.info('memory');
          redisStats = {
            connected: true,
            memory: info
          };
        },
        null
      );

      return {
        memory: {
          keys: memoryStats.keys,
          hits: memoryStats.hits,
          misses: memoryStats.misses,
          ksize: memoryStats.ksize,
          vsize: memoryStats.vsize
        },
        redis: redisStats || { connected: false },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get cache stats error:', error);
      return {
        memory: this.memoryCache.getStats(),
        redis: { connected: false, error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Warmup cache with frequently accessed data
  async warmupCache() {
    console.log('Starting cache warmup...');
    
    // Add any frequently accessed static data here
    const staticData = {
      supportedLanguages: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        // ... more languages
      ],
      medicalSpecialties: [
        'general-practice',
        'cardiology',
        'dermatology',
        'dentistry',
        'pediatrics'
      ]
    };

    await this.set('static:supportedLanguages', staticData.supportedLanguages, 86400);
    await this.set('static:medicalSpecialties', staticData.medicalSpecialties, 86400);
    
    console.log('Cache warmup completed');
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;