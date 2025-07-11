import crypto from 'crypto';
import CryptoJS from 'crypto-js';

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // For GCM, recommended size is 12 bytes

// Generate encryption key if not exists
export const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Encrypt data with AES-256-GCM
export const encryptData = (data, key = ENCRYPTION_KEY) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipherGCM(ALGORITHM, Buffer.from(key, 'hex'), iv);
    cipher.setAAD(Buffer.from('additional-data'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
};

// Decrypt data with AES-256-GCM
export const decryptData = (encryptedData, key = ENCRYPTION_KEY) => {
  try {
    const { encrypted, iv, authTag } = encryptedData;
    
    const decipher = crypto.createDecipherGCM(ALGORITHM, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
};

// Encrypt sensitive fields in user documents
export const encryptSensitiveFields = (userData) => {
  const sensitiveFields = [
    'personalInfo.phone',
    'personalInfo.dateOfBirth',
    'professionalInfo.licenseNumber',
    'practiceInfo.address',
    'accountInfo.mfaSecret',
    'accountInfo.mfaBackupCodes'
  ];
  
  const encryptedData = { ...userData };
  
  sensitiveFields.forEach(field => {
    const value = getNestedValue(encryptedData, field);
    if (value) {
      setNestedValue(encryptedData, field, encryptData(value));
    }
  });
  
  return encryptedData;
};

// Decrypt sensitive fields in user documents
export const decryptSensitiveFields = (encryptedData) => {
  const sensitiveFields = [
    'personalInfo.phone',
    'personalInfo.dateOfBirth',
    'professionalInfo.licenseNumber',
    'practiceInfo.address',
    'accountInfo.mfaSecret',
    'accountInfo.mfaBackupCodes'
  ];
  
  const decryptedData = { ...encryptedData };
  
  sensitiveFields.forEach(field => {
    const value = getNestedValue(decryptedData, field);
    if (value && typeof value === 'object' && value.encrypted) {
      try {
        setNestedValue(decryptedData, field, decryptData(value));
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error.message);
      }
    }
  });
  
  return decryptedData;
};

// Hash sensitive data for indexing (one-way)
export const hashForIndex = (data) => {
  return crypto.createHash('sha256').update(data + process.env.HASH_SALT || 'default-salt').digest('hex');
};

// Encrypt file data
export const encryptFile = (fileBuffer, key = ENCRYPTION_KEY) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipherGCM(ALGORITHM, Buffer.from(key, 'hex'), iv);
  
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted,
    iv: iv,
    authTag: authTag
  };
};

// Decrypt file data
export const decryptFile = (encryptedFileData, key = ENCRYPTION_KEY) => {
  const { encrypted, iv, authTag } = encryptedFileData;
  
  const decipher = crypto.createDecipherGCM(ALGORITHM, Buffer.from(key, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

// Generate data anonymization hash
export const anonymizeData = (data) => {
  const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return hash.substring(0, 8); // Use first 8 characters for anonymization
};

// Utility functions for nested object access
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

// Generate secure random tokens
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Create HMAC for data integrity
export const createHMAC = (data, key = ENCRYPTION_KEY) => {
  return crypto.createHmac('sha256', key).update(JSON.stringify(data)).digest('hex');
};

// Verify HMAC
export const verifyHMAC = (data, providedHMAC, key = ENCRYPTION_KEY) => {
  const calculatedHMAC = createHMAC(data, key);
  return crypto.timingSafeEqual(Buffer.from(providedHMAC), Buffer.from(calculatedHMAC));
};

// Password strength checker
export const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?\":{}|<>]/.test(password),
    noCommon: !isCommonPassword(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    score: score,
    maxScore: 6,
    strength: score < 4 ? 'weak' : score < 5 ? 'medium' : 'strong',
    checks: checks
  };
};

// Check against common passwords
const isCommonPassword = (password) => {
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890', 'password1'
  ];
  return commonPasswords.includes(password.toLowerCase());
};

// Secure data wiping
export const secureWipe = (data) => {
  if (typeof data === 'string') {
    // Overwrite string with random data
    const randomData = crypto.randomBytes(data.length).toString('hex');
    return randomData;
  } else if (Buffer.isBuffer(data)) {
    // Overwrite buffer with random data
    crypto.randomFillSync(data);
    return data;
  }
  return null;
};