import https from 'https';
import fs from 'fs';
import path from 'path';

// HTTPS Configuration
export const httpsConfig = {
  enabled: process.env.HTTPS_ENABLED === 'true',
  port: process.env.HTTPS_PORT || 443,
  certPath: process.env.SSL_CERT_PATH || './ssl/cert.pem',
  keyPath: process.env.SSL_KEY_PATH || './ssl/key.pem',
  caPath: process.env.SSL_CA_PATH || null,
  
  // SSL/TLS Options for security
  options: {
    // Use only TLS 1.2 and above
    secureProtocol: 'TLSv1_2_method',
    
    // Disable weak ciphers
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'DHE-RSA-AES128-GCM-SHA256',
      'DHE-RSA-AES256-GCM-SHA384',
      'DHE-RSA-AES128-SHA256',
      'DHE-RSA-AES256-SHA256'
    ].join(':'),
    
    // Enable server cipher order preference
    honorCipherOrder: true,
    
    // Enable ECDH
    ecdhCurve: 'secp384r1',
    
    // Set minimum TLS version
    minVersion: 'TLSv1.2',
    
    // Enable session resumption
    sessionIdContext: 'doctor-website-builder'
  }
};

// Load SSL certificates
export const loadSSLCertificates = () => {
  try {
    if (!httpsConfig.enabled) {
      return null;
    }
    
    const options = { ...httpsConfig.options };
    
    // Check if certificate files exist
    if (!fs.existsSync(httpsConfig.certPath)) {
      throw new Error(`SSL certificate not found at ${httpsConfig.certPath}`);
    }
    
    if (!fs.existsSync(httpsConfig.keyPath)) {
      throw new Error(`SSL private key not found at ${httpsConfig.keyPath}`);
    }
    
    // Load certificate and key
    options.cert = fs.readFileSync(httpsConfig.certPath);
    options.key = fs.readFileSync(httpsConfig.keyPath);
    
    // Load CA certificate if provided
    if (httpsConfig.caPath && fs.existsSync(httpsConfig.caPath)) {
      options.ca = fs.readFileSync(httpsConfig.caPath);
    }
    
    return options;
  } catch (error) {
    console.error('Error loading SSL certificates:', error.message);
    return null;
  }
};

// Create HTTPS server
export const createHTTPSServer = (app) => {
  const sslOptions = loadSSLCertificates();
  
  if (!sslOptions) {
    console.warn('HTTPS disabled - SSL certificates not available');
    return null;
  }
  
  const httpsServer = https.createServer(sslOptions, app);
  
  // Handle HTTPS server events
  httpsServer.on('error', (error) => {
    console.error('HTTPS Server Error:', error);
  });
  
  httpsServer.on('listening', () => {
    console.log(`HTTPS Server running on port ${httpsConfig.port}`);
  });
  
  // Handle SSL/TLS errors
  httpsServer.on('tlsClientError', (error, socket) => {
    console.error('TLS Client Error:', error.message);
    if (!socket.destroyed) {
      socket.destroy();
    }
  });
  
  return httpsServer;
};

// Generate self-signed certificate for development
export const generateSelfSignedCert = async () => {
  const { execSync } = await import('child_process');
  
  try {
    // Create SSL directory if it doesn't exist
    const sslDir = path.dirname(httpsConfig.certPath);
    if (!fs.existsSync(sslDir)) {
      fs.mkdirSync(sslDir, { recursive: true });
    }
    
    // Generate self-signed certificate
    const command = `openssl req -x509 -newkey rsa:4096 -keyout ${httpsConfig.keyPath} -out ${httpsConfig.certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('Self-signed certificate generated successfully');
    return true;
  } catch (error) {
    console.error('Error generating self-signed certificate:', error.message);
    return false;
  }
};

// HTTP to HTTPS redirect middleware
export const httpsRedirect = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
    return res.redirect(`https://${req.get('Host')}${req.url}`);
  }
  next();
};

// Strict Transport Security middleware
export const hsts = (req, res, next) => {
  if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
};

// SSL/TLS security headers
export const sslSecurityHeaders = (req, res, next) => {
  // Only set these headers for HTTPS requests
  if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
    res.set({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
  }
  next();
};

export default {
  httpsConfig,
  loadSSLCertificates,
  createHTTPSServer,
  generateSelfSignedCert,
  httpsRedirect,
  hsts,
  sslSecurityHeaders
};