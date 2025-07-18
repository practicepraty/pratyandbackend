import express from 'express';
import { checkRedisHealth } from '../config/redis.config.js';
import { ApiResponse } from '../utils/apirespose.js';

const router = express.Router();

router.get('/redis', async (req, res) => {
  try {
    const redisHealth = await checkRedisHealth();
    return res.status(200).json(
      new ApiResponse(200, redisHealth, "Redis health check completed")
    );
  } catch (error) {
    return res.status(500).json(
      new ApiResponse(500, { error: error.message }, "Redis health check failed")
    );
  }
});

export default router;