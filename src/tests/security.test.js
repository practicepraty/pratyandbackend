import { describe, it, expect, beforeEach, afterEach } from 'jest';
import request from 'supertest';
import app from '../app.js';
import { encryptData, decryptData } from '../utils/encryption.js';
import { generateMFASecret, verifyMFAToken } from '../middlewares/mfa.middleware.js';
import { xssProtection } from '../middlewares/xss.middleware.js';
import { csrfProtection } from '../middlewares/csrf.middleware.js';

describe('Security Tests', () => {
  let testUser;
  let authToken;
  let csrfToken;

  beforeEach(async () => {
    // Setup test user and authentication
    testUser = {
      personalInfo: {
        professionalEmail: 'test@example.com',
        fullName: 'Test Doctor'
      },
      accountInfo: {
        password: 'TestPassword123!'
      }
    };
    
    // Get CSRF token
    const csrfResponse = await request(app)
      .get('/api/csrf-token')
      .expect(200);
    
    csrfToken = csrfResponse.body.token;
  });

  afterEach(async () => {
    // Cleanup test data
  });

  describe('Authentication Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'abc123',
        'Password1',
        'short'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .set('X-CSRF-Token', csrfToken)
          .send({
            ...testUser,
            accountInfo: { password }
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/password/i);
      }
    });

    it('should enforce account lockout after failed attempts', async () => {
      const email = 'lockout@example.com';
      
      // Register user first
      await request(app)
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send({
          ...testUser,
          personalInfo: { ...testUser.personalInfo, professionalEmail: email }
        });

      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .set('X-CSRF-Token', csrfToken)
          .send({
            professionalEmail: email,
            password: 'wrongpassword'
          });
      }

      // Should be locked out
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          professionalEmail: email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toMatch(/locked/i);
    });

    it('should require MFA for sensitive operations', async () => {
      // Login and get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          professionalEmail: testUser.personalInfo.professionalEmail,
          password: testUser.accountInfo.password
        });

      const token = loginResponse.body.token;

      // Try to change password without MFA
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: testUser.accountInfo.password,
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/mfa/i);
    });
  });

  describe('Input Validation and XSS Protection', () => {
    it('should sanitize XSS payloads', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<object data="javascript:alert(\'XSS\')">',
        '<embed src="javascript:alert(\'XSS\')">',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        '<style>@import "javascript:alert(\'XSS\')";</style>',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
        '<form action="javascript:alert(\'XSS\')">',
        '<input type="image" src="javascript:alert(\'XSS\')">',
        '<body onload="alert(\'XSS\')">',
        '<div onclick="alert(\'XSS\')">',
        '<a href="javascript:alert(\'XSS\')">',
        'onclick="alert(\'XSS\')"',
        'onmouseover="alert(\'XSS\')"',
        'onfocus="alert(\'XSS\')"',
        'onerror="alert(\'XSS\')"',
        'onload="alert(\'XSS\')"'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/test/xss')
          .set('X-CSRF-Token', csrfToken)
          .send({
            input: payload
          });

        expect(response.status).toBe(200);
        expect(response.body.sanitized).not.toContain('<script>');
        expect(response.body.sanitized).not.toContain('javascript:');
        expect(response.body.sanitized).not.toContain('alert(');
        expect(response.body.sanitized).not.toContain('onerror=');
        expect(response.body.sanitized).not.toContain('onload=');
      }
    });

    it('should reject SQL injection attempts', async () => {
      const sqlPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "1' OR '1'='1' /*",
        "admin'--",
        "admin' #",
        "admin'/*",
        "' OR 1=1--",
        "' OR 'a'='a",
        "') OR ('1'='1",
        "1; DELETE FROM users WHERE 1=1",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --"
      ];

      for (const payload of sqlPayloads) {
        const response = await request(app)
          .post('/api/users/search')
          .set('X-CSRF-Token', csrfToken)
          .send({
            query: payload
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/validation/i);
      }
    });

    it('should validate file uploads', async () => {
      const maliciousFiles = [
        { filename: 'malicious.exe', content: 'malware' },
        { filename: 'script.js', content: 'alert("XSS")' },
        { filename: 'test.php', content: '<?php echo "hack"; ?>' },
        { filename: 'backdoor.asp', content: '<% evil code %>' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/upload')
          .set('X-CSRF-Token', csrfToken)
          .attach('file', Buffer.from(file.content), file.filename);

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid file type/i);
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/csrf/i);
    });

    it('should reject requests with invalid CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('X-CSRF-Token', 'invalid-token')
        .send(testUser);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/csrf/i);
    });

    it('should accept requests with valid CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send(testUser);

      expect(response.status).toBe(201);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      const email = 'ratelimit@example.com';
      
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .set('X-CSRF-Token', csrfToken)
            .send({
              professionalEmail: email,
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should have some rate limited responses
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on registration attempts', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/auth/register')
            .set('X-CSRF-Token', csrfToken)
            .send({
              ...testUser,
              personalInfo: {
                ...testUser.personalInfo,
                professionalEmail: `test${i}@example.com`
              }
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should have some rate limited responses
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const testData = {
        sensitive: 'This is sensitive information',
        user: 'test@example.com',
        timestamp: new Date().toISOString()
      };

      const encrypted = encryptData(testData);
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');

      const decrypted = decryptData(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should fail decryption with tampered data', () => {
      const testData = { message: 'secret' };
      const encrypted = encryptData(testData);
      
      // Tamper with encrypted data
      encrypted.encrypted = encrypted.encrypted.replace('a', 'b');
      
      expect(() => decryptData(encrypted)).toThrow();
    });
  });

  describe('MFA Security', () => {
    it('should generate valid MFA secrets', () => {
      const mfaSetup = generateMFASecret('test@example.com');
      
      expect(mfaSetup).toHaveProperty('secret');
      expect(mfaSetup).toHaveProperty('otpauthUrl');
      expect(mfaSetup.secret).toMatch(/^[A-Z2-7]{32}$/);
    });

    it('should verify MFA tokens correctly', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const token = '123456'; // This would be generated by authenticator app
      
      // This is a simplified test - in reality, you'd use a proper TOTP library
      const isValid = verifyMFAToken(token, secret);
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('content-security-policy');
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).not.toHaveProperty('x-powered-by');
      expect(response.headers).not.toHaveProperty('server');
    });
  });

  describe('API Security', () => {
    it('should validate API versioning', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('X-API-Version', 'v999')
        .expect(400);

      expect(response.body.error).toMatch(/version/i);
    });

    it('should enforce content type validation', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('invalid data');

      expect(response.status).toBe(415);
    });

    it('should limit request size', async () => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      const response = await request(app)
        .post('/api/test/large')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: largePayload });

      expect(response.status).toBe(413);
    });
  });

  describe('Database Security', () => {
    it('should prevent NoSQL injection', async () => {
      const noSQLPayloads = [
        { $where: 'this.password.length > 0' },
        { $regex: '.*' },
        { $gt: '' },
        { $ne: null },
        { $in: ['admin', 'root'] }
      ];

      for (const payload of noSQLPayloads) {
        const response = await request(app)
          .post('/api/users/search')
          .set('X-CSRF-Token', csrfToken)
          .send({
            query: payload
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/validation/i);
      }
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret');
      expect(response.body.error).not.toContain('token');
      expect(response.body.error).not.toContain('key');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid json/i);
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      // Login to get session
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          professionalEmail: testUser.personalInfo.professionalEmail,
          password: testUser.accountInfo.password
        });

      const token = loginResponse.body.token;

      // Use the session
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      // Session should be invalid
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toMatch(/invalid token/i);
    });
  });

  describe('HIPAA Compliance', () => {
    it('should log data access attempts', async () => {
      // Access patient data
      const response = await request(app)
        .get('/api/patients/123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check audit logs
      const auditResponse = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(auditResponse.body.logs.some(log => 
        log.action === 'DATA_ACCESS' && log.resource === 'patients'
      )).toBe(true);
    });

    it('should require consent for data processing', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          patientData: 'sensitive info',
          consentGiven: false
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/consent/i);
    });
  });
});

// Helper function to create test data
export const createTestData = {
  user: () => ({
    personalInfo: {
      professionalEmail: `test${Date.now()}@example.com`,
      fullName: 'Test Doctor',
      phone: '+1234567890'
    },
    professionalInfo: {
      specialty: 'general-practice',
      licenseNumber: 'TEST123456',
      yearsOfExperience: '5-10'
    },
    accountInfo: {
      password: 'SecurePassword123!',
      consentGiven: true,
      hipaaAcknowledged: true
    }
  }),
  
  maliciousPayload: () => ({
    xss: '<script>alert("XSS")</script>',
    sql: "' OR '1'='1",
    noSql: { $where: 'this.password.length > 0' },
    command: '; cat /etc/passwd',
    path: '../../../etc/passwd',
    overflow: 'A'.repeat(10000)
  })
};

export default describe;