import winston from 'winston';
import WintonMongoDB from 'winston-mongodb';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { config } from '../config/environment.js';

// HIPAA audit event types
export const HIPAA_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  
  // Data access events
  DATA_ACCESS: 'data_access',
  DATA_EXPORT: 'data_export',
  DATA_VIEW: 'data_view',
  DATA_SEARCH: 'data_search',
  
  // Data modification events
  DATA_CREATE: 'data_create',
  DATA_UPDATE: 'data_update',
  DATA_DELETE: 'data_delete',
  DATA_RESTORE: 'data_restore',
  
  // System events
  SYSTEM_ACCESS: 'system_access',
  CONFIGURATION_CHANGE: 'configuration_change',
  SECURITY_ALERT: 'security_alert',
  BACKUP_CREATED: 'backup_created',
  BACKUP_RESTORED: 'backup_restored',
  
  // File operations
  FILE_UPLOAD: 'file_upload',
  FILE_DOWNLOAD: 'file_download',
  FILE_DELETE: 'file_delete',
  FILE_SHARE: 'file_share',
  
  // Administrative events
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_ROLE_CHANGED: 'user_role_changed',
  
  // Privacy events
  CONSENT_GRANTED: 'consent_granted',
  CONSENT_REVOKED: 'consent_revoked',
  DATA_ANONYMIZED: 'data_anonymized',
  DATA_RETENTION_APPLIED: 'data_retention_applied',
  
  // Security events
  MALWARE_DETECTED: 'malware_detected',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

// HIPAA data classifications
export const DATA_CLASSIFICATIONS = {
  PHI: 'protected_health_information',
  PII: 'personally_identifiable_information',
  FINANCIAL: 'financial_data',
  SENSITIVE: 'sensitive_data',
  PUBLIC: 'public_data',
  INTERNAL: 'internal_data'
};

// Audit log encryption key
const AUDIT_ENCRYPTION_KEY = config.security.encryptionKey;

// Create HIPAA compliant logger
const createHIPAALogger = () => {
  const transports = [];
  
  // File transport for audit logs
  transports.push(new winston.transports.File({
    filename: './logs/hipaa-audit.log',
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    tailable: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf(info => {
        // Encrypt sensitive audit data
        const encrypted = encryptAuditData(info);
        return JSON.stringify(encrypted);
      })
    )
  }));
  
  // MongoDB transport for audit logs (if enabled)
  if (config.hipaa.auditEnabled) {
    transports.push(new WintonMongoDB.MongoDB({
      db: config.database.uri,
      collection: 'hipaa_audit_logs',
      options: {
        useUnifiedTopology: true,
        maxPoolSize: 10
      },
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(info => {
          return JSON.stringify(encryptAuditData(info));
        })
      )
    }));
  }
  
  // Console transport for development
  if (config.env === 'development') {
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }
  
  return winston.createLogger({
    level: 'info',
    transports,
    exitOnError: false
  });
};

// Initialize HIPAA audit logger
const hipaaLogger = createHIPAALogger();

// Encrypt audit data
const encryptAuditData = (data) => {
  try {
    if (!config.hipaa.encryptAtRest) {
      return data;
    }
    
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(AUDIT_ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: true,
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: 'aes-256-gcm',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to encrypt audit data:', error);
    return data;
  }
};

// Decrypt audit data
export const decryptAuditData = (encryptedData) => {
  try {
    if (!encryptedData.encrypted) {
      return encryptedData;
    }
    
    if (!config.hipaa.encryptAtRest) {
      return encryptedData;
    }
    
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const key = crypto.scryptSync(AUDIT_ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt audit data:', error);
    return encryptedData;
  }
};

// Generate audit trail ID
const generateAuditTrailId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Create audit entry
export const createAuditEntry = (eventType, details = {}) => {
  const auditEntry = {
    auditTrailId: generateAuditTrailId(),
    eventType,
    timestamp: new Date().toISOString(),
    sessionId: details.sessionId || 'unknown',
    userId: details.userId || 'anonymous',
    userRole: details.userRole || 'unknown',
    sourceIp: details.sourceIp || 'unknown',
    userAgent: details.userAgent || 'unknown',
    resource: details.resource || 'unknown',
    action: details.action || 'unknown',
    outcome: details.outcome || 'unknown',
    dataClassification: details.dataClassification || DATA_CLASSIFICATIONS.PUBLIC,
    patientId: details.patientId || null,
    recordId: details.recordId || null,
    affectedRecords: details.affectedRecords || 0,
    dataFields: details.dataFields || [],
    reasonForAccess: details.reasonForAccess || null,
    additionalInfo: details.additionalInfo || {},
    riskLevel: details.riskLevel || 'low',
    compliance: {
      hipaa: true,
      hitech: true,
      gdpr: details.gdpr || false
    },
    location: {
      country: details.country || 'unknown',
      state: details.state || 'unknown',
      city: details.city || 'unknown'
    },
    system: {
      application: 'doctors-website-builder',
      version: process.env.APP_VERSION || '1.0.0',
      environment: config.env,
      hostname: os.hostname()
    }
  };
  
  return auditEntry;
};

// Log audit event
export const logAuditEvent = (eventType, details = {}) => {
  try {
    const auditEntry = createAuditEntry(eventType, details);
    hipaaLogger.info('HIPAA Audit Event', auditEntry);
    
    // Log to console in development for debugging
    if (config.env === 'development' && config.development.debug) {
      console.log('HIPAA Audit Event:', {
        eventType,
        userId: details.userId,
        resource: details.resource,
        outcome: details.outcome
      });
    }
    
    return auditEntry;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    return null;
  }
};

// HIPAA audit middleware
export const hipaaAuditMiddleware = (req, res, next) => {
  // Skip audit logging for health checks and static assets
  if (req.path === '/health' || req.path.startsWith('/public/')) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Extract user information
  const userId = req.user?.id || 'anonymous';
  const userRole = req.user?.role || 'unknown';
  const sessionId = req.sessionID || req.session?.id || 'unknown';
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override res.end to capture response
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Determine data classification based on endpoint
    let dataClassification = DATA_CLASSIFICATIONS.PUBLIC;
    if (req.path.includes('/users/') || req.path.includes('/profile/')) {
      dataClassification = DATA_CLASSIFICATIONS.PII;
    } else if (req.path.includes('/medical/') || req.path.includes('/health/')) {
      dataClassification = DATA_CLASSIFICATIONS.PHI;
    }
    
    // Determine event type based on method and path
    let eventType = HIPAA_EVENTS.SYSTEM_ACCESS;
    if (req.method === 'POST' && req.path.includes('/login')) {
      eventType = res.statusCode === 200 ? HIPAA_EVENTS.LOGIN_SUCCESS : HIPAA_EVENTS.LOGIN_FAILURE;
    } else if (req.method === 'POST' && req.path.includes('/logout')) {
      eventType = HIPAA_EVENTS.LOGOUT;
    } else if (req.method === 'GET' && dataClassification !== DATA_CLASSIFICATIONS.PUBLIC) {
      eventType = HIPAA_EVENTS.DATA_ACCESS;
    } else if (req.method === 'POST' && dataClassification !== DATA_CLASSIFICATIONS.PUBLIC) {
      eventType = HIPAA_EVENTS.DATA_CREATE;
    } else if (req.method === 'PUT' && dataClassification !== DATA_CLASSIFICATIONS.PUBLIC) {
      eventType = HIPAA_EVENTS.DATA_UPDATE;
    } else if (req.method === 'DELETE' && dataClassification !== DATA_CLASSIFICATIONS.PUBLIC) {
      eventType = HIPAA_EVENTS.DATA_DELETE;
    }
    
    // Log audit event
    logAuditEvent(eventType, {
      sessionId,
      userId,
      userRole,
      sourceIp: req.ip,
      userAgent: req.get('User-Agent'),
      resource: req.path,
      action: req.method,
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      dataClassification,
      reasonForAccess: req.headers['x-reason-for-access'] || null,
      additionalInfo: {
        method: req.method,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('Content-Length'),
        query: req.query,
        body: req.method === 'POST' || req.method === 'PUT' ? 
          sanitizeRequestBody(req.body) : undefined
      },
      riskLevel: determineRiskLevel(req, res),
      country: req.headers['cf-ipcountry'] || 'unknown',
      state: req.headers['cf-region'] || 'unknown',
      city: req.headers['cf-city'] || 'unknown'
    });
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Sanitize request body for audit logging
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'confirmPassword', 'token', 'secret', 'key',
    'ssn', 'socialSecurityNumber', 'creditCard', 'bankAccount'
  ];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Determine risk level based on request
const determineRiskLevel = (req, res) => {
  // High risk conditions
  if (res.statusCode >= 400) return 'high';
  if (req.path.includes('/admin/')) return 'high';
  if (req.path.includes('/delete/')) return 'high';
  if (req.method === 'DELETE') return 'high';
  
  // Medium risk conditions
  if (req.path.includes('/users/')) return 'medium';
  if (req.path.includes('/profile/')) return 'medium';
  if (req.method === 'PUT' || req.method === 'POST') return 'medium';
  
  // Low risk (default)
  return 'low';
};

// Audit data access
export const auditDataAccess = (req, dataType, recordIds = [], reasonForAccess = null) => {
  logAuditEvent(HIPAA_EVENTS.DATA_ACCESS, {
    sessionId: req.sessionID,
    userId: req.user?.id || 'anonymous',
    userRole: req.user?.role || 'unknown',
    sourceIp: req.ip,
    userAgent: req.get('User-Agent'),
    resource: req.path,
    action: 'READ',
    outcome: 'success',
    dataClassification: dataType,
    affectedRecords: recordIds.length,
    recordId: recordIds.join(','),
    reasonForAccess: reasonForAccess || req.headers['x-reason-for-access'],
    additionalInfo: {
      recordIds,
      dataType
    }
  });
};

// Audit data modification
export const auditDataModification = (req, action, dataType, recordId, changes = {}) => {
  const eventType = action === 'create' ? HIPAA_EVENTS.DATA_CREATE :
                   action === 'update' ? HIPAA_EVENTS.DATA_UPDATE :
                   action === 'delete' ? HIPAA_EVENTS.DATA_DELETE :
                   HIPAA_EVENTS.DATA_ACCESS;
  
  logAuditEvent(eventType, {
    sessionId: req.sessionID,
    userId: req.user?.id || 'anonymous',
    userRole: req.user?.role || 'unknown',
    sourceIp: req.ip,
    userAgent: req.get('User-Agent'),
    resource: req.path,
    action,
    outcome: 'success',
    dataClassification: dataType,
    recordId,
    affectedRecords: 1,
    additionalInfo: {
      changes: sanitizeRequestBody(changes),
      action
    }
  });
};

// Audit security events
export const auditSecurityEvent = (eventType, details = {}) => {
  logAuditEvent(eventType, {
    ...details,
    outcome: 'security_alert',
    riskLevel: 'high',
    dataClassification: DATA_CLASSIFICATIONS.SENSITIVE
  });
};

// Get audit trail for a specific user or record
export const getAuditTrail = async (filters = {}) => {
  try {
    // This would query the audit log database
    // Implementation depends on your database choice
    const query = {};
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.recordId) query.recordId = filters.recordId;
    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.startDate) query.timestamp = { $gte: filters.startDate };
    if (filters.endDate) query.timestamp = { ...query.timestamp, $lte: filters.endDate };
    
    // TODO: Implement database query
    // const results = await AuditLog.find(query).sort({ timestamp: -1 }).limit(filters.limit || 100);
    
    return {
      success: true,
      message: 'Audit trail retrieved',
      // data: results.map(decryptAuditData)
      data: []
    };
  } catch (error) {
    console.error('Failed to retrieve audit trail:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate audit report
export const generateAuditReport = async (filters = {}) => {
  try {
    const auditTrail = await getAuditTrail(filters);
    
    if (!auditTrail.success) {
      return auditTrail;
    }
    
    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        startDate: filters.startDate || 'beginning',
        endDate: filters.endDate || 'present'
      },
      summary: {
        totalEvents: auditTrail.data.length,
        eventTypes: {},
        riskLevels: {},
        outcomes: {},
        dataClassifications: {}
      },
      compliance: {
        hipaa: true,
        hitech: true,
        auditRetention: config.hipaa.logRetentionDays,
        encryptionEnabled: config.hipaa.encryptAtRest
      },
      events: auditTrail.data
    };
    
    // Calculate summary statistics
    for (const event of auditTrail.data) {
      report.summary.eventTypes[event.eventType] = 
        (report.summary.eventTypes[event.eventType] || 0) + 1;
      report.summary.riskLevels[event.riskLevel] = 
        (report.summary.riskLevels[event.riskLevel] || 0) + 1;
      report.summary.outcomes[event.outcome] = 
        (report.summary.outcomes[event.outcome] || 0) + 1;
      report.summary.dataClassifications[event.dataClassification] = 
        (report.summary.dataClassifications[event.dataClassification] || 0) + 1;
    }
    
    return {
      success: true,
      report
    };
  } catch (error) {
    console.error('Failed to generate audit report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Archive old audit logs
export const archiveAuditLogs = async (retentionDays = config.hipaa.logRetentionDays) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // TODO: Implement archival logic
    // const archived = await AuditLog.find({ timestamp: { $lt: cutoffDate } });
    // await AuditLog.deleteMany({ timestamp: { $lt: cutoffDate } });
    
    const archivedCount = 0; // Replace with actual count
    
    logAuditEvent(HIPAA_EVENTS.BACKUP_CREATED, {
      userId: 'system',
      userRole: 'system',
      sourceIp: 'localhost',
      resource: 'audit_logs',
      action: 'archive',
      outcome: 'success',
      additionalInfo: {
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        archivedCount
      }
    });
    
    return {
      success: true,
      archivedCount,
      cutoffDate: cutoffDate.toISOString()
    };
  } catch (error) {
    console.error('Failed to archive audit logs:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  hipaaAuditMiddleware,
  logAuditEvent,
  auditDataAccess,
  auditDataModification,
  auditSecurityEvent,
  getAuditTrail,
  generateAuditReport,
  archiveAuditLogs,
  createAuditEntry,
  decryptAuditData,
  HIPAA_EVENTS,
  DATA_CLASSIFICATIONS
};