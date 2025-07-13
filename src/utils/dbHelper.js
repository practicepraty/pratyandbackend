// src/utils/dbHelper.js
import mongoose from 'mongoose';

// Check if MongoDB is available and connected
export const isMongoDBAvailable = () => {
  return mongoose.connection.readyState === 1 && process.env.MONGODB_AVAILABLE !== 'false';
};

// Safe database operation wrapper
export const safeDBOperation = async (operation, fallbackValue = null) => {
  if (!isMongoDBAvailable()) {
    console.warn('MongoDB not available, skipping database operation');
    return fallbackValue;
  }

  try {
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error.message);
    return fallbackValue;
  }
};

// Get database status for health checks
export const getDatabaseStatus = () => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    available: isMongoDBAvailable(),
    state: states[readyState] || 'unknown',
    readyState,
    host: mongoose.connection.host || 'unknown',
    name: mongoose.connection.name || 'unknown'
  };
};