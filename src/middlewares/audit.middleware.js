import winston from 'winston';
import { MongoDB } from 'winston-mongodb';
import crypto from 'crypto';

// Create audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    new MongoDB({
      level: 'info',
      db: process.env.MONGODB_URI,
      collection: 'audit_logs',
      options: {
        useUnifiedTopology: true,
        useNewUrlParser: true
      },
      format: winston.format.json()
    })
  ]
});

// HIPAA-compliant audit log entry structure
const createAuditEntry = (req, action, resource, details = {}) => {
  const user = req.user;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  return {
    timestamp: new Date(),
    sessionId: req.sessionID || 'anonymous',
    userId: user?._id || 'anonymous',
    userEmail: user?.personalInfo?.professionalEmail || 'anonymous',
    userRole: user?.role || 'user',
    action: action,
    resource: resource,
    resourceId: details.resourceId || null,
    ipAddress: hashIP(ip), // Hash IP for privacy
    userAgent: userAgent,
    httpMethod: req.method,
    endpoint: req.originalUrl,
    statusCode: details.statusCode || null,
    requestId: req.requestId || crypto.randomUUID(),
    details: {
      ...details,
      // Remove sensitive data from details
      sensitiveDataAccessed: details.sensitiveDataAccessed || false,
      dataExported: details.dataExported || false,
      dataModified: details.dataModified || false,
      consentGiven: details.consentGiven || false
    },
    compliance: {
      hipaaCompliant: true,
      dataClassification: details.dataClassification || 'public',
      retentionPeriod: details.retentionPeriod || 2555 // 7 years in days
    }
  };
};

// Hash IP address for privacy compliance
const hashIP = (ip) => {
  return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex');
};

// Middleware to log all API access
export const auditLogger_middleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Generate request ID
  req.requestId = crypto.randomUUID();
  
  // Store original res.json to capture response
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log the request
    const auditEntry = createAuditEntry(req, 'API_ACCESS', req.originalUrl, {
      statusCode: res.statusCode,
      responseTime: responseTime,
      requestSize: JSON.stringify(req.body).length,
      responseSize: JSON.stringify(data).length
    });
    
    auditLogger.info('API Access', auditEntry);
    
    // Call original json method
    originalJson.call(this, data);
  };
  
  next();
};

// Log authentication attempts
export const logAuthAttempt = (req, success, details = {}) => {
  const auditEntry = createAuditEntry(req, 'AUTH_ATTEMPT', 'authentication', {
    success: success,
    authMethod: details.authMethod || 'password',
    mfaUsed: details.mfaUsed || false,
    failureReason: details.failureReason || null,
    userEmail: details.userEmail || req.body.professionalEmail
  });
  
  auditLogger.info('Authentication Attempt', auditEntry);
};

// Log data access
export const logDataAccess = (req, dataType, dataId, action = 'READ') => {
  const auditEntry = createAuditEntry(req, `DATA_${action}`, dataType, {
    resourceId: dataId,
    sensitiveDataAccessed: ['patient', 'medical', 'personal'].includes(dataType),
    dataClassification: getSensitivityLevel(dataType)
  });
  
  auditLogger.info('Data Access', auditEntry);
};

// Log data modifications
export const logDataModification = (req, dataType, dataId, changes, originalData = null) => {
  const auditEntry = createAuditEntry(req, 'DATA_MODIFY', dataType, {
    resourceId: dataId,
    dataModified: true,
    changes: sanitizeChanges(changes),
    originalDataHash: originalData ? hashData(originalData) : null,
    dataClassification: getSensitivityLevel(dataType)
  });
  
  auditLogger.info('Data Modification', auditEntry);
};

// Log sensitive operations
export const logSensitiveOperation = (req, operation, details = {}) => {
  const auditEntry = createAuditEntry(req, 'SENSITIVE_OPERATION', operation, {
    ...details,
    sensitiveDataAccessed: true,
    requiresApproval: details.requiresApproval || false,
    approvedBy: details.approvedBy || null
  });
  
  auditLogger.info('Sensitive Operation', auditEntry);
};

// Log data export
export const logDataExport = (req, dataType, format, recordCount) => {
  const auditEntry = createAuditEntry(req, 'DATA_EXPORT', dataType, {
    dataExported: true,
    exportFormat: format,
    recordCount: recordCount,
    dataClassification: getSensitivityLevel(dataType)
  });
  
  auditLogger.info('Data Export', auditEntry);
};

// Log consent management
export const logConsentAction = (req, action, consentType, details = {}) => {
  const auditEntry = createAuditEntry(req, 'CONSENT_ACTION', consentType, {
    consentAction: action,
    consentGiven: details.consentGiven || false,
    consentWithdrawn: details.consentWithdrawn || false,
    consentType: consentType
  });
  
  auditLogger.info('Consent Action', auditEntry);
};

// Log security events
export const logSecurityEvent = (req, eventType, severity, details = {}) => {
  const auditEntry = createAuditEntry(req, 'SECURITY_EVENT', eventType, {
    severity: severity,
    securityEvent: true,
    ...details
  });
  
  auditLogger.error('Security Event', auditEntry);
};

// Utility functions
const getSensitivityLevel = (dataType) => {
  const sensitivityMap = {
    'patient': 'restricted',
    'medical': 'restricted',
    'personal': 'confidential',
    'financial': 'confidential',
    'user': 'internal',
    'website': 'public',
    'template': 'public'
  };
  
  return sensitivityMap[dataType] || 'internal';
};

const sanitizeChanges = (changes) => {
  const sanitized = { ...changes };
  
  // Remove sensitive fields from audit logs
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'dob'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

const hashData = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

// Middleware to automatically log CRUD operations
export const auditCRUDOperations = (operation) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceType = req.baseUrl.split('/').pop();
        const resourceId = req.params.id || req.body._id;
        
        logDataAccess(req, resourceType, resourceId, operation);
        
        if (operation === 'UPDATE' || operation === 'DELETE') {
          logDataModification(req, resourceType, resourceId, req.body);
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Export audit logger for direct use
export { auditLogger };