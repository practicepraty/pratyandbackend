import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { ApiError } from '../utils/apierror.js';

// Generate MFA secret for user
export const generateMFASecret = (userEmail, appName = 'Doctor Website Builder') => {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${userEmail})`,
    issuer: appName,
    length: 32
  });
  
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
};

// Generate QR code for MFA setup
export const generateMFAQRCode = async (otpauthUrl) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    throw new ApiError(500, 'Failed to generate QR code');
  }
};

// Verify MFA token
export const verifyMFAToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps tolerance
  });
};

// Middleware to check if MFA is required
export const checkMFARequired = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Check if user has MFA enabled
    if (user.accountInfo?.mfaEnabled) {
      const mfaToken = req.headers['x-mfa-token'] || req.body.mfaToken;
      
      if (!mfaToken) {
        return res.status(401).json({
          error: 'MFA token required',
          code: 'MFA_TOKEN_REQUIRED',
          mfaRequired: true
        });
      }
      
      // Verify MFA token
      const isValid = verifyMFAToken(mfaToken, user.accountInfo.mfaSecret);
      
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid MFA token',
          code: 'MFA_TOKEN_INVALID'
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to enforce MFA for sensitive operations
export const enforceMFAForSensitiveOps = async (req, res, next) => {
  try {
    const user = req.user;
    
    // List of sensitive operations that require MFA
    const sensitiveOperations = [
      'password-change',
      'account-deletion',
      'sensitive-data-access',
      'export-data',
      'admin-actions'
    ];
    
    const operation = req.headers['x-operation'] || req.body.operation;
    
    if (sensitiveOperations.includes(operation)) {
      const mfaToken = req.headers['x-mfa-token'] || req.body.mfaToken;
      
      if (!mfaToken) {
        return res.status(401).json({
          error: 'MFA token required for sensitive operation',
          code: 'MFA_TOKEN_REQUIRED_SENSITIVE',
          operation: operation
        });
      }
      
      if (!user.accountInfo?.mfaSecret) {
        return res.status(401).json({
          error: 'MFA must be enabled for sensitive operations',
          code: 'MFA_SETUP_REQUIRED'
        });
      }
      
      const isValid = verifyMFAToken(mfaToken, user.accountInfo.mfaSecret);
      
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid MFA token for sensitive operation',
          code: 'MFA_TOKEN_INVALID_SENSITIVE',
          operation: operation
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Generate backup codes for MFA
export const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
  }
  return codes;
};

// Verify backup code
export const verifyBackupCode = (code, userBackupCodes) => {
  const index = userBackupCodes.indexOf(code);
  if (index !== -1) {
    // Remove used backup code
    userBackupCodes.splice(index, 1);
    return true;
  }
  return false;
};

// Middleware to handle MFA fallback with backup codes
export const handleMFAFallback = async (req, res, next) => {
  try {
    const user = req.user;
    const backupCode = req.headers['x-backup-code'] || req.body.backupCode;
    
    if (backupCode && user.accountInfo?.mfaBackupCodes) {
      const isValidBackup = verifyBackupCode(backupCode, user.accountInfo.mfaBackupCodes);
      
      if (isValidBackup) {
        // Save updated backup codes
        await user.save();
        return next();
      }
    }
    
    // If no valid backup code, proceed with normal MFA check
    return checkMFARequired(req, res, next);
  } catch (error) {
    next(error);
  }
};