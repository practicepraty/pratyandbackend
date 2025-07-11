# Doctor's Website Builder Security Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Doctor's Website Builder backend with enterprise-grade security features, HIPAA compliance, and production-ready configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Security Infrastructure Setup](#security-infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Service Installation](#service-installation)
5. [SSL/HTTPS Configuration](#ssl-https-configuration)
6. [Security Testing](#security-testing)
7. [Production Deployment](#production-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [HIPAA Compliance Checklist](#hipaa-compliance-checklist)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or later (recommended), CentOS 8+, or macOS 10.15+
- **Node.js**: Version 18.x or later
- **Memory**: Minimum 4GB RAM (8GB recommended for production)
- **Storage**: Minimum 20GB free space
- **Network**: Stable internet connection for updates and external services

### Required Tools

```bash
# Install required system tools
sudo apt update
sudo apt install -y curl wget git unzip openssl build-essential

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
node --version
npm --version
```

## Security Infrastructure Setup

### 1. Run Security Services Installation Script

```bash
# Make the script executable
chmod +x scripts/install-security-services.sh

# Run the installation script
./scripts/install-security-services.sh
```

This script will install and configure:
- ClamAV antivirus with automatic updates
- Redis server with password authentication
- UFW firewall with secure defaults
- Fail2ban for intrusion prevention
- Log rotation for security logs

### 2. Manual Service Verification

```bash
# Check ClamAV status
sudo systemctl status clamav-daemon
sudo systemctl status clamav-freshclam

# Check Redis status
sudo systemctl status redis-server

# Test ClamAV scanning
echo "Test file" | clamdscan -

# Test Redis connection (use password from /tmp/redis_credentials.txt)
redis-cli -a YOUR_REDIS_PASSWORD ping
```

## Environment Configuration

### 1. Create Production Environment File

Copy the sample environment file and configure for production:

```bash
cp .env.sample .env.production
```

### 2. Required Environment Variables

#### Security Configuration
```bash
# JWT Configuration (CRITICAL - Generate secure secrets)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
REFRESH_TOKEN_SECRET=your-super-secure-refresh-token-secret-minimum-32-characters
SESSION_SECRET=your-ultra-secure-session-secret-minimum-64-characters-for-healthcare-app
COOKIE_SECRET=your-secure-cookie-secret-minimum-32-characters
ENCRYPTION_KEY=your-aes-256-encryption-key-32-characters

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password-from-installation
REDIS_DB=0
REDIS_TLS=false

# SSL/HTTPS Configuration
HTTPS_ENABLED=true
HTTPS_PORT=443
SSL_CERT_PATH=/path/to/your/ssl/cert.pem
SSL_KEY_PATH=/path/to/your/ssl/key.pem
SSL_CA_PATH=/path/to/your/ssl/ca.pem

# ClamAV Configuration
CLAMAV_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_TIMEOUT=30000
CLAMAV_QUARANTINE_DIR=/opt/doctor-website-builder/quarantine

# HIPAA Compliance
HIPAA_AUDIT_ENABLED=true
HIPAA_ENCRYPT_AT_REST=true
HIPAA_LOG_RETENTION_DAYS=2555
HIPAA_ACCESS_LOG_ENABLED=true

# Production Security
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
IP_WHITELIST_ENABLED=false
IP_BLACKLIST_ENABLED=true
API_KEY_REQUIRED=false
SECURITY_ALERTS_ENABLED=true
SECURITY_ALERT_EMAIL=security@yourdomain.com
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate session secret (64+ characters)
openssl rand -base64 64

# Generate encryption key (32 characters for AES-256)
openssl rand -hex 32

# Generate cookie secret
openssl rand -base64 32
```

## Service Installation

### 1. Install Application Dependencies

```bash
# Install production dependencies
npm ci --only=production

# For development with testing
npm install
```

### 2. Install Additional Security Packages

The security packages are already included in package.json:

- `node-clamav`: Malware scanning integration
- `ioredis`: Redis client with clustering support
- `rate-limiter-flexible`: Advanced rate limiting
- `helmet`: Security headers
- `express-rate-limit`: Basic rate limiting
- `winston`: Logging framework
- `argon2`: Password hashing
- `crypto-js`: Data encryption
- `validator`: Input validation

### 3. Database Setup

```bash
# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB connection
mongosh --eval "db.adminCommand('ismaster')"
```

## SSL/HTTPS Configuration

### 1. For Development (Self-Signed Certificates)

The installation script creates self-signed certificates in the `ssl/` directory.

### 2. For Production (CA-Signed Certificates)

#### Option A: Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot

# Generate certificates (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to your application
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
sudo chmod 600 ssl/key.pem
sudo chmod 644 ssl/cert.pem
```

#### Option B: Commercial SSL Certificate

1. Generate a Certificate Signing Request (CSR):
```bash
openssl req -new -newkey rsa:4096 -nodes -keyout ssl/key.pem -out ssl/domain.csr
```

2. Submit the CSR to your Certificate Authority
3. Download and install the signed certificate as `ssl/cert.pem`

### 3. Configure SSL in Environment

```bash
# Update .env.production
HTTPS_ENABLED=true
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
```

## Security Testing

### 1. Run Security Test Suite

```bash
# Run all security tests
npm test -- src/tests/security.test.js

# Run specific security test categories
npm test -- --grep "Authentication Security"
npm test -- --grep "Input Validation"
npm test -- --grep "Rate Limiting"
```

### 2. Manual Security Verification

#### Check Security Headers
```bash
# Test security headers
curl -I https://yourdomain.com/health

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# Content-Security-Policy: default-src 'self'
```

#### Test Rate Limiting
```bash
# Test general rate limiting (should be limited after 100 requests)
for i in {1..110}; do curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com/health; done

# Test authentication rate limiting
for i in {1..10}; do curl -X POST https://yourdomain.com/api/v1/users/login -d '{"email":"test@test.com","password":"wrong"}'; done
```

#### Test Malware Scanning
```bash
# Create a test file and upload it
echo "X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" > eicar.com
curl -X POST -F "file=@eicar.com" https://yourdomain.com/api/v1/upload

# Should return: {"success": false, "message": "File upload blocked - malware detected"}
```

### 3. External Security Scans

#### SSL/TLS Testing
```bash
# Test SSL configuration
curl -I https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

#### OWASP ZAP Security Scan
```bash
# Install OWASP ZAP
sudo snap install zaproxy --classic

# Run baseline scan
zaproxy -cmd -quickurl https://yourdomain.com -quickprogress
```

## Production Deployment

### 1. Create System User

```bash
# Create dedicated user for the application
sudo useradd -r -s /bin/false -d /opt/doctor-website-builder doctorweb
sudo mkdir -p /opt/doctor-website-builder
sudo chown doctorweb:doctorweb /opt/doctor-website-builder
```

### 2. Deploy Application Code

```bash
# Copy application to production directory
sudo cp -r . /opt/doctor-website-builder/
sudo chown -R doctorweb:doctorweb /opt/doctor-website-builder
sudo chmod -R 755 /opt/doctor-website-builder
sudo chmod 600 /opt/doctor-website-builder/.env.production
```

### 3. Create Systemd Service

```bash
sudo tee /etc/systemd/system/doctor-website-builder.service > /dev/null <<EOF
[Unit]
Description=Doctor's Website Builder HIPAA-Compliant Backend
After=network.target mongod.service redis-server.service clamav-daemon.service
Wants=mongod.service redis-server.service clamav-daemon.service

[Service]
Type=simple
User=doctorweb
Group=doctorweb
WorkingDirectory=/opt/doctor-website-builder
ExecStart=/usr/bin/node src/server.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=doctor-website-builder

# Environment
Environment=NODE_ENV=production
EnvironmentFile=/opt/doctor-website-builder/.env.production

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/doctor-website-builder/logs
ReadWritePaths=/opt/doctor-website-builder/public/temp
ReadWritePaths=/opt/doctor-website-builder/quarantine

# Resource limits
LimitNOFILE=65536
MemoryLimit=1G
TasksMax=4096

[Install]
WantedBy=multi-user.target
EOF
```

### 4. Start Production Service

```bash
# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable doctor-website-builder
sudo systemctl start doctor-website-builder

# Check service status
sudo systemctl status doctor-website-builder

# View logs
sudo journalctl -u doctor-website-builder -f
```

### 5. Configure Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/doctor-website-builder > /dev/null <<EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /opt/doctor-website-builder/ssl/cert.pem;
    ssl_certificate_key /opt/doctor-website-builder/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy Configuration
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Forwarded-Host \$server_name;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # File upload size limit
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/doctor-website-builder.access.log;
    error_log /var/log/nginx/doctor-website-builder.error.log;
}
EOF

# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/doctor-website-builder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Monitoring and Maintenance

### 1. Log Monitoring

```bash
# Application logs
sudo tail -f /opt/doctor-website-builder/logs/app.log

# Security audit logs
sudo tail -f /opt/doctor-website-builder/logs/hipaa-audit.log

# Malware scan logs
sudo tail -f /opt/doctor-website-builder/logs/malware-scan.log

# Rate limiting logs
sudo tail -f /opt/doctor-website-builder/logs/rate-limit.log

# System service logs
sudo journalctl -u doctor-website-builder -f
sudo journalctl -u redis-server -f
sudo journalctl -u clamav-daemon -f
```

### 2. Health Monitoring

```bash
# Check application health
curl -s https://yourdomain.com/health | jq

# Check security status
curl -s https://yourdomain.com/security-status | jq

# Monitor system resources
htop
df -h
free -m
```

### 3. Automated Updates

Create update scripts for regular maintenance:

```bash
# Create update script
cat > /opt/doctor-website-builder/scripts/update-security.sh <<EOF
#!/bin/bash
# Daily security update script

# Update virus definitions
sudo freshclam

# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services if needed
if [ -f /var/run/reboot-required ]; then
    echo "System reboot required"
fi

# Clean up old logs
find /opt/doctor-website-builder/logs -name "*.log" -mtime +30 -delete

# Generate security report
node /opt/doctor-website-builder/scripts/security-report.js
EOF

chmod +x /opt/doctor-website-builder/scripts/update-security.sh
```

### 4. Backup Strategy

```bash
# Create backup script
cat > /opt/doctor-website-builder/scripts/backup.sh <<EOF
#!/bin/bash
BACKUP_DIR="/opt/backups/doctor-website-builder"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application code
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/doctor-website-builder

# Backup database
mongodump --out $BACKUP_DIR/db_$DATE

# Backup Redis data
redis-cli -a $REDIS_PASSWORD --rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /opt/doctor-website-builder/logs

# Clean old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
EOF
```

### 5. Cron Jobs Setup

```bash
# Add to crontab
crontab -e

# Add these lines:
# Update virus definitions daily at 2 AM
0 2 * * * /usr/bin/freshclam

# Security updates daily at 3 AM
0 3 * * * /opt/doctor-website-builder/scripts/update-security.sh

# Full backup weekly on Sunday at 1 AM
0 1 * * 0 /opt/doctor-website-builder/scripts/backup.sh

# Health check every 5 minutes
*/5 * * * * curl -f https://yourdomain.com/health || echo "Health check failed" | mail -s "Doctor Website Builder Health Alert" admin@yourdomain.com
```

## HIPAA Compliance Checklist

### Technical Safeguards

- [x] **Access Control**: User authentication with JWT tokens
- [x] **Audit Controls**: Comprehensive audit logging with HIPAA events
- [x] **Integrity**: Data integrity through encryption and validation
- [x] **Person or Entity Authentication**: Multi-factor authentication support
- [x] **Transmission Security**: HTTPS/SSL encryption for all communications

### Administrative Safeguards

- [x] **Security Officer**: Designated security contact configuration
- [x] **Workforce Training**: Security documentation and procedures
- [x] **Information Access Management**: Role-based access control
- [x] **Security Awareness**: Security alerts and monitoring
- [x] **Security Incident Procedures**: Automated security alerts

### Physical Safeguards

- [x] **Facility Access Controls**: Server security (environment dependent)
- [x] **Workstation Use**: Secure workstation guidelines
- [x] **Device and Media Controls**: File upload restrictions and malware scanning

### Security Features Implemented

- [x] **Data Encryption**: AES-256 encryption for sensitive data at rest
- [x] **Access Logging**: All data access attempts logged with user attribution
- [x] **Rate Limiting**: Protection against brute force attacks
- [x] **Malware Scanning**: Real-time file scanning with ClamAV
- [x] **Input Validation**: XSS and injection attack prevention
- [x] **Session Management**: Secure session handling with expiration
- [x] **Audit Trail**: Tamper-evident audit logs with 7-year retention
- [x] **Data Backup**: Automated backup procedures
- [x] **Intrusion Detection**: Fail2ban and monitoring systems

## Troubleshooting

### Common Issues

#### 1. ClamAV Not Starting

```bash
# Check ClamAV logs
sudo tail -f /var/log/clamav/clamav.log

# Common fixes:
sudo freshclam
sudo systemctl restart clamav-freshclam
sudo systemctl restart clamav-daemon

# Check permissions
sudo chown -R clamav:clamav /var/lib/clamav
sudo chmod 755 /var/lib/clamav
```

#### 2. Redis Connection Issues

```bash
# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Test connection
redis-cli -a YOUR_PASSWORD ping

# Common fixes:
sudo systemctl restart redis-server
sudo ufw allow from 127.0.0.1 to any port 6379
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Check private key
openssl rsa -in ssl/key.pem -check

# Verify certificate and key match
openssl x509 -noout -modulus -in ssl/cert.pem | openssl md5
openssl rsa -noout -modulus -in ssl/key.pem | openssl md5
```

#### 4. High Memory Usage

```bash
# Check memory usage by service
sudo ps aux --sort=-%mem | head -10

# Restart services if needed
sudo systemctl restart doctor-website-builder
sudo systemctl restart redis-server
```

### Log Analysis

#### Security Event Investigation

```bash
# Search for failed login attempts
grep "LOGIN_FAILURE" /opt/doctor-website-builder/logs/hipaa-audit.log

# Search for malware detections
grep "MALWARE_DETECTED" /opt/doctor-website-builder/logs/malware-scan.log

# Search for rate limit violations
grep "RATE_LIMIT_EXCEEDED" /opt/doctor-website-builder/logs/rate-limit.log

# Search for security alerts
grep "SECURITY_ALERT" /opt/doctor-website-builder/logs/hipaa-audit.log
```

### Performance Optimization

#### Database Optimization

```bash
# MongoDB index creation
mongosh yourdatabase <<EOF
db.users.createIndex({ "personalInfo.professionalEmail": 1 }, { unique: true })
db.auditLogs.createIndex({ "timestamp": 1 })
db.auditLogs.createIndex({ "userId": 1, "timestamp": -1 })
EOF
```

#### Redis Optimization

```bash
# Monitor Redis performance
redis-cli -a YOUR_PASSWORD --latency-history -i 1

# Check Redis memory usage
redis-cli -a YOUR_PASSWORD info memory
```

## Security Maintenance Schedule

### Daily
- Monitor system health endpoints
- Check security alert emails
- Review application logs for errors

### Weekly
- Update virus definitions (automated)
- Review rate limiting statistics
- Check SSL certificate expiration

### Monthly
- Security scan with OWASP ZAP
- Review audit logs
- Update system packages
- Test backup and restore procedures

### Quarterly
- Security penetration testing
- Review and update security policies
- Staff security training updates
- Third-party security audit

## Contact and Support

For security issues or questions:

- **Security Team**: security@yourdomain.com
- **Emergency**: Immediately disable affected services and contact security team
- **Documentation**: Keep this guide updated with any configuration changes

---

**Important**: This guide contains sensitive security information. Restrict access to authorized personnel only and keep configurations secure.