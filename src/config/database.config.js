import mongoose from 'mongoose';
import mongooseFieldEncryption from 'mongoose-field-encryption';
import { encryptSensitiveFields, decryptSensitiveFields } from '../utils/encryption.js';

// MongoDB connection options with security
const mongooseOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  
  // Security options
  authSource: 'admin',
  ssl: process.env.NODE_ENV === 'production',
  sslValidate: process.env.NODE_ENV === 'production',
  sslCA: process.env.MONGODB_SSL_CA,
  sslCert: process.env.MONGODB_SSL_CERT,
  sslKey: process.env.MONGODB_SSL_KEY,
  
  // Connection security
  connectTimeoutMS: 30000,
  bufferMaxEntries: 0,
  bufferCommands: false,
  
  // Read preference for security
  readPreference: 'primaryPreferred',
  
  // Write concern for data integrity
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 30000
  },
  
  // Read concern for consistency
  readConcern: {
    level: 'majority'
  }
};

// Database connection state
let isConnected = false;
let connectionAttempts = 0;
const maxRetries = 5;

// Connect to MongoDB with retry logic
export const connectDB = async () => {
  try {
    if (isConnected) {
      console.log('Database already connected');
      return;
    }

    connectionAttempts++;
    
    if (connectionAttempts > maxRetries) {
      throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    // Validate MongoDB URI format
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB URI format');
    }

    console.log(`Attempting to connect to MongoDB (attempt ${connectionAttempts}/${maxRetries})...`);
    
    await mongoose.connect(mongoUri, mongooseOptions);
    
    isConnected = true;
    connectionAttempts = 0;
    
    console.log('✅ MongoDB connected successfully');
    
    // Set up connection event handlers
    setupConnectionHandlers();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    if (connectionAttempts < maxRetries) {
      console.log(`Retrying connection in 5 seconds...`);
      setTimeout(() => connectDB(), 5000);
    } else {
      console.error('Max connection attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

// Setup connection event handlers
const setupConnectionHandlers = () => {
  const db = mongoose.connection;
  
  db.on('connected', () => {
    console.log('📊 Database connected');
    isConnected = true;
  });
  
  db.on('error', (error) => {
    console.error('❌ Database error:', error);
    isConnected = false;
  });
  
  db.on('disconnected', () => {
    console.log('📊 Database disconnected');
    isConnected = false;
    
    // Attempt to reconnect
    if (connectionAttempts < maxRetries) {
      console.log('Attempting to reconnect...');
      setTimeout(() => connectDB(), 5000);
    }
  });
  
  db.on('reconnected', () => {
    console.log('📊 Database reconnected');
    isConnected = true;
  });
  
  // Handle application termination
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('📊 Database connection closed through app termination');
      process.exit(0);
    } catch (error) {
      console.error('Error closing database connection:', error);
      process.exit(1);
    }
  });
};

// Disconnect from MongoDB
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('📊 Database disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
};

// Get connection status
export const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    states: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
  };
};

// Database health check
export const healthCheck = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const result = await admin.ping();
    
    return {
      status: 'healthy',
      ping: result.ok === 1,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// Security middleware for MongoDB queries
export const secureQuery = () => {
  return function(next) {
    // Prevent NoSQL injection by sanitizing query
    const sanitizeQuery = (query) => {
      if (typeof query !== 'object' || query === null) {
        return query;
      }
      
      const sanitized = {};
      for (const key in query) {
        if (query.hasOwnProperty(key)) {
          const value = query[key];
          
          // Remove dangerous operators
          if (key.startsWith('$') && !isAllowedOperator(key)) {
            continue;
          }
          
          // Sanitize values
          if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeQuery(value);
          } else {
            sanitized[key] = value;
          }
        }
      }
      return sanitized;
    };
    
    if (this.getQuery) {
      const query = this.getQuery();
      const sanitizedQuery = sanitizeQuery(query);
      this.setQuery(sanitizedQuery);
    }
    
    next();
  };
};

// Check if MongoDB operator is allowed
const isAllowedOperator = (operator) => {
  const allowedOperators = [
    '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
    '$in', '$nin', '$exists', '$type', '$mod',
    '$regex', '$text', '$where', '$all', '$elemMatch',
    '$size', '$and', '$or', '$not', '$nor'
  ];
  
  return allowedOperators.includes(operator);
};

// Audit query middleware
export const auditQuery = (model) => {
  return function(next) {
    const query = this.getQuery();
    const options = this.getOptions();
    
    console.log(`[AUDIT] ${model} query:`, {
      query: JSON.stringify(query),
      options: JSON.stringify(options),
      timestamp: new Date().toISOString()
    });
    
    next();
  };
};

// Field-level encryption setup
export const setupFieldEncryption = (schema, fields) => {
  schema.plugin(mongooseFieldEncryption.fieldEncryption, {
    fields: fields,
    secret: process.env.ENCRYPTION_KEY,
    saltGenerator: (secret) => secret.slice(0, 16),
    encryptNull: false
  });
};

// Sensitive data encryption middleware
export const encryptSensitiveData = function(next) {
  if (this.isNew || this.isModified()) {
    try {
      // Encrypt sensitive fields before saving
      const encryptedData = encryptSensitiveFields(this.toObject());
      Object.assign(this, encryptedData);
    } catch (error) {
      return next(error);
    }
  }
  next();
};

// Sensitive data decryption middleware
export const decryptSensitiveData = function(doc, next) {
  try {
    if (doc) {
      // Decrypt sensitive fields after retrieval
      const decryptedData = decryptSensitiveFields(doc.toObject());
      Object.assign(doc, decryptedData);
    }
  } catch (error) {
    console.error('Error decrypting data:', error);
  }
  next();
};

// Data masking for non-production environments
export const maskSensitiveData = (data) => {
  if (process.env.NODE_ENV === 'production') {
    return data;
  }
  
  const masked = { ...data };
  
  // Fields to mask
  const sensitiveFields = [
    'personalInfo.phone',
    'personalInfo.dateOfBirth',
    'professionalInfo.licenseNumber',
    'practiceInfo.address',
    'accountInfo.password',
    'accountInfo.mfaSecret'
  ];
  
  sensitiveFields.forEach(field => {
    const value = getNestedValue(masked, field);
    if (value) {
      setNestedValue(masked, field, maskValue(value));
    }
  });
  
  return masked;
};

// Helper function to mask values
const maskValue = (value) => {
  if (typeof value === 'string') {
    if (value.length <= 4) {
      return '***';
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }
  return '***';
};

// Helper functions
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current && current[key], obj);
};

const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

// Database backup configuration
export const backupConfig = {
  enabled: process.env.BACKUP_ENABLED === 'true',
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  retention: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  encryption: true,
  compression: true
};

// Create database backup
export const createBackup = async () => {
  if (!backupConfig.enabled) {
    console.log('Database backup disabled');
    return;
  }
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backups/db-backup-${timestamp}.gz`;
    
    // This is a simplified backup - in production, use mongodump
    console.log(`Creating database backup: ${backupPath}`);
    
    // Implement actual backup logic here
    // const { exec } = require('child_process');
    // exec(`mongodump --uri="${process.env.MONGODB_URI}" --gzip --archive=${backupPath}`, callback);
    
  } catch (error) {
    console.error('Database backup failed:', error);
  }
};

// Export database configuration
export default {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  healthCheck,
  secureQuery,
  auditQuery,
  setupFieldEncryption,
  encryptSensitiveData,
  decryptSensitiveData,
  maskSensitiveData,
  backupConfig,
  createBackup
};