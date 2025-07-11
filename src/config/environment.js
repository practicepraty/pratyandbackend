import dotenv from 'dotenv';
import joi from 'joi';

// Load environment variables
dotenv.config();

// Environment configuration schema
const envSchema = joi.object({
  // Server Configuration
  NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
  PORT: joi.number().default(8000),
  
  // Database Configuration
  MONGODB_URI: joi.string().required(),
  DATABASE_NAME: joi.string().default('doctors-website-builder'),
  
  // Security Configuration
  JWT_SECRET: joi.string().min(32).required(),
  JWT_EXPIRY: joi.string().default('1d'),
  REFRESH_TOKEN_SECRET: joi.string().min(32).required(),
  REFRESH_TOKEN_EXPIRY: joi.string().default('10d'),
  SESSION_SECRET: joi.string().min(64).required(),
  COOKIE_SECRET: joi.string().min(32).required(),
  ENCRYPTION_KEY: joi.string().min(32).required(),
  
  // Redis Configuration
  REDIS_HOST: joi.string().default('localhost'),
  REDIS_PORT: joi.number().default(6379),
  REDIS_PASSWORD: joi.string().when('NODE_ENV', {
    is: 'production',
    then: joi.required(),
    otherwise: joi.optional()
  }),
  REDIS_DB: joi.number().default(0),
  REDIS_TLS: joi.boolean().default(false),
  
  // SSL/HTTPS Configuration
  HTTPS_ENABLED: joi.boolean().default(false),
  HTTPS_PORT: joi.number().default(443),
  SSL_CERT_PATH: joi.string().when('HTTPS_ENABLED', {
    is: true,
    then: joi.required(),
    otherwise: joi.optional()
  }),
  SSL_KEY_PATH: joi.string().when('HTTPS_ENABLED', {
    is: true,
    then: joi.required(),
    otherwise: joi.optional()
  }),
  SSL_CA_PATH: joi.string().optional(),
  
  // ClamAV Configuration
  CLAMAV_ENABLED: joi.boolean().default(true),
  CLAMAV_HOST: joi.string().default('localhost'),
  CLAMAV_PORT: joi.number().default(3310),
  CLAMAV_TIMEOUT: joi.number().default(30000),
  CLAMAV_QUARANTINE_DIR: joi.string().default('./quarantine'),
  
  // CORS Configuration
  CORS_ORIGIN: joi.string().required(),
  CORS_CREDENTIALS: joi.boolean().default(true),
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: joi.number().default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: joi.boolean().default(false),
  
  // File Upload Configuration
  UPLOAD_MAX_FILE_SIZE: joi.number().default(10485760),
  UPLOAD_TEMP_DIR: joi.string().default('./public/temp'),
  UPLOAD_ALLOWED_TYPES: joi.string().default('image/jpeg,image/png,image/gif,image/webp'),
  
  // Logging Configuration
  LOG_LEVEL: joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: joi.string().default('./logs/app.log'),
  LOG_MAX_SIZE: joi.number().default(10485760),
  LOG_MAX_FILES: joi.number().default(5),
  
  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: joi.string().required(),
  CLOUDINARY_API_KEY: joi.string().required(),
  CLOUDINARY_API_SECRET: joi.string().required(),
  
  // AWS Configuration
  AWS_ACCESS_KEY_ID: joi.string().required(),
  AWS_SECRET_ACCESS_KEY: joi.string().required(),
  AWS_REGION: joi.string().default('us-east-1'),
  AWS_BEDROCK_REGION: joi.string().default('us-east-1'),
  
  // Email Configuration
  EMAIL_HOST: joi.string().required(),
  EMAIL_PORT: joi.number().default(587),
  EMAIL_USER: joi.string().required(),
  EMAIL_PASS: joi.string().required(),
  EMAIL_FROM: joi.string().email().required(),
  EMAIL_FROM_NAME: joi.string().default('Doctor Website Builder'),
  
  // Audio Configuration
  AUDIO_MAX_FILE_SIZE: joi.number().default(26214400),
  AUDIO_SUPPORTED_FORMATS: joi.string().default('mp3,wav,m4a,flac,ogg,webm'),
  AUDIO_TEMP_DIR: joi.string().default('./public/temp/audio'),
  
  // AssemblyAI Configuration
  ASSEMBLYAI_API_KEY: joi.string().required(),
  ASSEMBLYAI_BASE_URL: joi.string().default('https://api.assemblyai.com/v2'),
  
  // AI Configuration
  AI_MODEL_ID: joi.string().required(),
  AI_MODEL_TIMEOUT: joi.number().default(30000),
  AI_MAX_TOKENS: joi.number().default(4000),
  
  // Security Headers
  HSTS_MAX_AGE: joi.number().default(31536000),
  CSP_REPORT_URI: joi.string().optional(),
  
  // Monitoring Configuration
  ENABLE_ANALYTICS: joi.boolean().default(true),
  ANALYTICS_TRACK_ERRORS: joi.boolean().default(true),
  ANALYTICS_TRACK_PERFORMANCE: joi.boolean().default(true),
  
  // Development Configuration
  DEBUG: joi.boolean().default(false),
  BYPASS_RATE_LIMIT: joi.boolean().default(false),
  MOCK_AI_RESPONSES: joi.boolean().default(false),
  
  // Backup Configuration
  BACKUP_ENABLED: joi.boolean().default(false),
  BACKUP_INTERVAL: joi.number().default(86400000),
  BACKUP_RETENTION_DAYS: joi.number().default(30),
  BACKUP_LOCAL_PATH: joi.string().default('./backups'),
  
  // Cache Configuration
  CACHE_TTL: joi.number().default(3600000),
  CACHE_MAX_KEYS: joi.number().default(1000),
  
  // Security Thresholds
  BCRYPT_SALT_ROUNDS: joi.number().default(12),
  MAX_LOGIN_ATTEMPTS: joi.number().default(5),
  ACCOUNT_LOCKOUT_DURATION: joi.number().default(1800000), // 30 minutes
  PASSWORD_MIN_LENGTH: joi.number().default(8),
  PASSWORD_REQUIRE_UPPERCASE: joi.boolean().default(true),
  PASSWORD_REQUIRE_LOWERCASE: joi.boolean().default(true),
  PASSWORD_REQUIRE_NUMBERS: joi.boolean().default(true),
  PASSWORD_REQUIRE_SYMBOLS: joi.boolean().default(true),
  
  // HIPAA Compliance
  HIPAA_AUDIT_ENABLED: joi.boolean().default(true),
  HIPAA_ENCRYPT_AT_REST: joi.boolean().default(true),
  HIPAA_LOG_RETENTION_DAYS: joi.number().default(2555), // 7 years
  HIPAA_ACCESS_LOG_ENABLED: joi.boolean().default(true),
  
  // IP Whitelisting
  IP_WHITELIST_ENABLED: joi.boolean().default(false),
  IP_WHITELIST: joi.string().optional(),
  IP_BLACKLIST_ENABLED: joi.boolean().default(false),
  IP_BLACKLIST: joi.string().optional(),
  
  // API Security
  API_KEY_REQUIRED: joi.boolean().default(false),
  API_KEY_HEADER_NAME: joi.string().default('X-API-Key'),
  API_VERSION_HEADER_NAME: joi.string().default('X-API-Version'),
  
  // Data Retention
  DATA_RETENTION_DAYS: joi.number().default(2555), // 7 years for HIPAA
  SOFT_DELETE_ENABLED: joi.boolean().default(true),
  
  // Notification Settings
  SECURITY_ALERTS_ENABLED: joi.boolean().default(true),
  SECURITY_ALERT_EMAIL: joi.string().email().optional(),
  FAILED_LOGIN_ALERT_THRESHOLD: joi.number().default(10),
  
  // Testing Configuration
  TEST_MODE: joi.boolean().default(false),
  TEST_DATABASE_URI: joi.string().when('NODE_ENV', {
    is: 'test',
    then: joi.required(),
    otherwise: joi.optional()
  }),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error('Environment validation error:', error.details);
  process.exit(1);
}

// Export validated configuration
export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  
  // Database
  database: {
    uri: envVars.MONGODB_URI,
    name: envVars.DATABASE_NAME,
    testUri: envVars.TEST_DATABASE_URI,
  },
  
  // Security
  security: {
    jwtSecret: envVars.JWT_SECRET,
    jwtExpiry: envVars.JWT_EXPIRY,
    refreshTokenSecret: envVars.REFRESH_TOKEN_SECRET,
    refreshTokenExpiry: envVars.REFRESH_TOKEN_EXPIRY,
    sessionSecret: envVars.SESSION_SECRET,
    cookieSecret: envVars.COOKIE_SECRET,
    encryptionKey: envVars.ENCRYPTION_KEY,
    bcryptSaltRounds: envVars.BCRYPT_SALT_ROUNDS,
    maxLoginAttempts: envVars.MAX_LOGIN_ATTEMPTS,
    accountLockoutDuration: envVars.ACCOUNT_LOCKOUT_DURATION,
    passwordPolicy: {
      minLength: envVars.PASSWORD_MIN_LENGTH,
      requireUppercase: envVars.PASSWORD_REQUIRE_UPPERCASE,
      requireLowercase: envVars.PASSWORD_REQUIRE_LOWERCASE,
      requireNumbers: envVars.PASSWORD_REQUIRE_NUMBERS,
      requireSymbols: envVars.PASSWORD_REQUIRE_SYMBOLS,
    },
  },
  
  // Redis
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    db: envVars.REDIS_DB,
    tls: envVars.REDIS_TLS,
  },
  
  // SSL/HTTPS
  https: {
    enabled: envVars.HTTPS_ENABLED,
    port: envVars.HTTPS_PORT,
    certPath: envVars.SSL_CERT_PATH,
    keyPath: envVars.SSL_KEY_PATH,
    caPath: envVars.SSL_CA_PATH,
  },
  
  // ClamAV
  clamav: {
    enabled: envVars.CLAMAV_ENABLED,
    host: envVars.CLAMAV_HOST,
    port: envVars.CLAMAV_PORT,
    timeout: envVars.CLAMAV_TIMEOUT,
    quarantineDir: envVars.CLAMAV_QUARANTINE_DIR,
  },
  
  // CORS
  cors: {
    origin: envVars.CORS_ORIGIN,
    credentials: envVars.CORS_CREDENTIALS,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests: envVars.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
  },
  
  // File Upload
  upload: {
    maxFileSize: envVars.UPLOAD_MAX_FILE_SIZE,
    tempDir: envVars.UPLOAD_TEMP_DIR,
    allowedTypes: envVars.UPLOAD_ALLOWED_TYPES.split(','),
  },
  
  // Logging
  logging: {
    level: envVars.LOG_LEVEL,
    file: envVars.LOG_FILE,
    maxSize: envVars.LOG_MAX_SIZE,
    maxFiles: envVars.LOG_MAX_FILES,
  },
  
  // Cloudinary
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },
  
  // AWS
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    bedrockRegion: envVars.AWS_BEDROCK_REGION,
  },
  
  // Email
  email: {
    host: envVars.EMAIL_HOST,
    port: envVars.EMAIL_PORT,
    user: envVars.EMAIL_USER,
    pass: envVars.EMAIL_PASS,
    from: envVars.EMAIL_FROM,
    fromName: envVars.EMAIL_FROM_NAME,
  },
  
  // Audio
  audio: {
    maxFileSize: envVars.AUDIO_MAX_FILE_SIZE,
    supportedFormats: envVars.AUDIO_SUPPORTED_FORMATS.split(','),
    tempDir: envVars.AUDIO_TEMP_DIR,
  },
  
  // AssemblyAI
  assemblyai: {
    apiKey: envVars.ASSEMBLYAI_API_KEY,
    baseUrl: envVars.ASSEMBLYAI_BASE_URL,
  },
  
  // AI
  ai: {
    modelId: envVars.AI_MODEL_ID,
    timeout: envVars.AI_MODEL_TIMEOUT,
    maxTokens: envVars.AI_MAX_TOKENS,
  },
  
  // Security Headers
  headers: {
    hstsMaxAge: envVars.HSTS_MAX_AGE,
    cspReportUri: envVars.CSP_REPORT_URI,
  },
  
  // Monitoring
  monitoring: {
    analytics: envVars.ENABLE_ANALYTICS,
    trackErrors: envVars.ANALYTICS_TRACK_ERRORS,
    trackPerformance: envVars.ANALYTICS_TRACK_PERFORMANCE,
  },
  
  // Development
  development: {
    debug: envVars.DEBUG,
    bypassRateLimit: envVars.BYPASS_RATE_LIMIT,
    mockAiResponses: envVars.MOCK_AI_RESPONSES,
  },
  
  // Backup
  backup: {
    enabled: envVars.BACKUP_ENABLED,
    interval: envVars.BACKUP_INTERVAL,
    retentionDays: envVars.BACKUP_RETENTION_DAYS,
    localPath: envVars.BACKUP_LOCAL_PATH,
  },
  
  // Cache
  cache: {
    ttl: envVars.CACHE_TTL,
    maxKeys: envVars.CACHE_MAX_KEYS,
  },
  
  // HIPAA
  hipaa: {
    auditEnabled: envVars.HIPAA_AUDIT_ENABLED,
    encryptAtRest: envVars.HIPAA_ENCRYPT_AT_REST,
    logRetentionDays: envVars.HIPAA_LOG_RETENTION_DAYS,
    accessLogEnabled: envVars.HIPAA_ACCESS_LOG_ENABLED,
  },
  
  // IP Controls
  ipControl: {
    whitelistEnabled: envVars.IP_WHITELIST_ENABLED,
    whitelist: envVars.IP_WHITELIST ? envVars.IP_WHITELIST.split(',') : [],
    blacklistEnabled: envVars.IP_BLACKLIST_ENABLED,
    blacklist: envVars.IP_BLACKLIST ? envVars.IP_BLACKLIST.split(',') : [],
  },
  
  // API Security
  api: {
    keyRequired: envVars.API_KEY_REQUIRED,
    keyHeaderName: envVars.API_KEY_HEADER_NAME,
    versionHeaderName: envVars.API_VERSION_HEADER_NAME,
  },
  
  // Data Retention
  dataRetention: {
    days: envVars.DATA_RETENTION_DAYS,
    softDeleteEnabled: envVars.SOFT_DELETE_ENABLED,
  },
  
  // Notifications
  notifications: {
    securityAlertsEnabled: envVars.SECURITY_ALERTS_ENABLED,
    securityAlertEmail: envVars.SECURITY_ALERT_EMAIL,
    failedLoginAlertThreshold: envVars.FAILED_LOGIN_ALERT_THRESHOLD,
  },
  
  // Testing
  testing: {
    testMode: envVars.TEST_MODE,
  },
};

// Environment validation function
export const validateEnvironment = () => {
  const missingVars = [];
  const warnings = [];
  
  // Check critical production variables
  if (config.env === 'production') {
    if (!config.security.jwtSecret || config.security.jwtSecret.length < 32) {
      missingVars.push('JWT_SECRET must be at least 32 characters');
    }
    
    if (!config.security.sessionSecret || config.security.sessionSecret.length < 64) {
      missingVars.push('SESSION_SECRET must be at least 64 characters');
    }
    
    if (!config.redis.password) {
      warnings.push('REDIS_PASSWORD not set for production');
    }
    
    if (!config.https.enabled) {
      warnings.push('HTTPS not enabled for production');
    }
    
    if (config.cors.origin === '*') {
      warnings.push('CORS origin is set to wildcard (*) in production');
    }
    
    if (!config.clamav.enabled) {
      warnings.push('ClamAV malware scanning disabled in production');
    }
  }
  
  // Check HIPAA compliance requirements
  if (config.hipaa.auditEnabled && !config.hipaa.encryptAtRest) {
    warnings.push('HIPAA audit enabled but encryption at rest is disabled');
  }
  
  if (missingVars.length > 0) {
    console.error('Critical environment variables missing:');
    missingVars.forEach(msg => console.error(`  - ${msg}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('Environment warnings:');
    warnings.forEach(msg => console.warn(`  - ${msg}`));
  }
  
  return true;
};

// Security configuration summary
export const getSecuritySummary = () => {
  return {
    environment: config.env,
    httpsEnabled: config.https.enabled,
    redisAuthEnabled: !!config.redis.password,
    clamavEnabled: config.clamav.enabled,
    hipaaCompliant: config.hipaa.auditEnabled && config.hipaa.encryptAtRest,
    securityHeaders: true,
    rateLimitingEnabled: true,
    corsConfigured: config.cors.origin !== '*',
    encryptionEnabled: !!config.security.encryptionKey,
    auditLoggingEnabled: config.hipaa.auditEnabled,
    ipControlsEnabled: config.ipControl.whitelistEnabled || config.ipControl.blacklistEnabled,
  };
};

export default config;