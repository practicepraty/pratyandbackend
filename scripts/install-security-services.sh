#!/bin/bash

# Installation script for security services
# Doctor's Website Builder Backend Security Setup

set -e

echo "=========================================="
echo "Installing Security Services"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Update package list
print_status "Updating package list..."
sudo apt update

# Install ClamAV
print_status "Installing ClamAV antivirus..."
sudo apt install -y clamav clamav-daemon clamav-freshclam

# Configure ClamAV
print_status "Configuring ClamAV..."

# Stop services to configure them
sudo systemctl stop clamav-freshclam
sudo systemctl stop clamav-daemon

# Update virus definitions
print_status "Updating ClamAV virus definitions..."
sudo freshclam

# Configure ClamAV daemon
print_status "Configuring ClamAV daemon..."
sudo tee /etc/clamav/clamd.conf > /dev/null <<EOF
# ClamAV Daemon Configuration for Doctor's Website Builder
LocalSocket /var/run/clamav/clamd.ctl
FixStaleSocket true
LocalSocketGroup clamav
LocalSocketMode 666
User clamav
AllowSupplementaryGroups true
ScanMail true
ScanArchive true
ArchiveBlockEncrypted false
MaxDirectoryRecursion 15
FollowDirectorySymlinks false
FollowFileSymlinks false
ReadTimeout 180
MaxThreads 12
MaxConnectionQueueLength 15
LogSyslog false
LogFile /var/log/clamav/clamav.log
LogTime true
LogClean false
LogVerbose false
PidFile /var/run/clamav/clamd.pid
DatabaseDirectory /var/lib/clamav
OfficialDatabaseOnly false
SelfCheck 3600
Foreground false
Debug false
ScanPE true
ScanELF true
ScanOLE2 true
ScanPDF true
ScanSWF true
ScanMail true
PhishingSignatures true
PhishingScanURLs true
HeuristicScanPrecedence false
StructuredDataDetection false
CommandReadTimeout 30
SendBufTimeout 200
MaxQueue 100
ExtendedDetectionInfo true
OLE2BlockMacros false
ScanOnAccess false
OnAccessMaxFileSize 5M
OnAccessIncludePath /tmp
OnAccessExcludePath /etc
OnAccessExcludePath /dev
OnAccessExcludePath /proc
OnAccessExcludePath /sys
OnAccessExcludeRootUID false
OnAccessExcludeUID -1
DisableCertCheck false
AlgorithmicDetection true
Bytecode true
BytecodeSecurity TrustSigned
BytecodeTimeout 60000
EOF

# Configure freshclam for automatic updates
print_status "Configuring automatic virus definition updates..."
sudo tee /etc/clamav/freshclam.conf > /dev/null <<EOF
# FreshClam Configuration for Doctor's Website Builder
DatabaseDirectory /var/lib/clamav
UpdateLogFile /var/log/clamav/freshclam.log
LogFileMaxSize 2M
LogTime true
LogSyslog false
LogVerbose false
LogRotate true
PidFile /var/run/clamav/freshclam.pid
DatabaseOwner clamav
AllowSupplementaryGroups true
DNSDatabaseInfo current.cvd.clamav.net
DatabaseMirror db.local.clamav.net
DatabaseMirror database.clamav.net
MaxAttempts 5
ScriptedUpdates true
CompressLocalDatabase false
SafeBrowsing false
Bytecode true
NotifyClamd /etc/clamav/clamd.conf
Checks 24
TestDatabases yes
EOF

# Add user to clamav group
print_status "Adding current user to clamav group..."
sudo usermod -a -G clamav $USER

# Start and enable ClamAV services
print_status "Starting ClamAV services..."
sudo systemctl enable clamav-freshclam
sudo systemctl enable clamav-daemon
sudo systemctl start clamav-freshclam
sudo systemctl start clamav-daemon

# Install Redis
print_status "Installing Redis server..."
sudo apt install -y redis-server

# Configure Redis for security
print_status "Configuring Redis security..."
sudo tee /etc/redis/redis.conf > /dev/null <<EOF
# Redis Configuration for Doctor's Website Builder
bind 127.0.0.1 ::1
protected-mode yes
port 6379
timeout 0
tcp-keepalive 300
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16
always-show-logo yes
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
rdb-del-sync-files no
dir /var/lib/redis
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5
repl-diskless-load disabled
repl-disable-tcp-nodelay no
replica-priority 100
acllog-max-len 128
lazyfree-lazy-eviction no
lazyfree-lazy-expire no
lazyfree-lazy-server-del no
replica-lazy-flush no
lazyfree-lazy-user-del no
oom-score-adj no
oom-score-adj-values 0 200 800
appendonly no
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 0
notify-keyspace-events ""
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
client-query-buffer-limit 1gb
proto-max-bulk-len 512mb
hz 10
dynamic-hz yes
aof-rewrite-incremental-fsync yes
rdb-save-incremental-fsync yes
jemalloc-bg-thread yes

# Security settings
requirepass $(openssl rand -base64 32)
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""
rename-command SHUTDOWN ""
rename-command EVAL ""
EOF

# Generate Redis password and save it
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> /tmp/redis_credentials.txt
print_status "Redis password generated and saved to /tmp/redis_credentials.txt"

# Update Redis config with the generated password
sudo sed -i "s/requirepass .*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf

# Start and enable Redis
print_status "Starting Redis service..."
sudo systemctl enable redis-server
sudo systemctl restart redis-server

# Install additional security tools
print_status "Installing additional security tools..."
sudo apt install -y fail2ban ufw logrotate

# Configure UFW firewall basic rules
print_status "Configuring basic firewall rules..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Configure log rotation for security logs
print_status "Configuring log rotation..."
sudo tee /etc/logrotate.d/doctor-website-builder > /dev/null <<EOF
/var/log/doctor-website-builder/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}

/var/log/clamav/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 clamav clamav
    postrotate
        systemctl reload clamav-daemon > /dev/null 2>&1 || true
    endscript
}
EOF

# Create necessary directories
print_status "Creating necessary directories..."
sudo mkdir -p /var/log/doctor-website-builder
sudo mkdir -p /opt/doctor-website-builder/uploads
sudo mkdir -p /opt/doctor-website-builder/quarantine
sudo mkdir -p /opt/doctor-website-builder/ssl

# Set proper permissions
sudo chown -R www-data:www-data /var/log/doctor-website-builder
sudo chown -R www-data:www-data /opt/doctor-website-builder
sudo chmod 755 /opt/doctor-website-builder
sudo chmod 755 /opt/doctor-website-builder/uploads
sudo chmod 700 /opt/doctor-website-builder/quarantine
sudo chmod 700 /opt/doctor-website-builder/ssl

# Verify installations
print_status "Verifying installations..."

# Check ClamAV
if systemctl is-active --quiet clamav-daemon; then
    print_status "✓ ClamAV daemon is running"
else
    print_error "✗ ClamAV daemon is not running"
fi

# Check Redis
if systemctl is-active --quiet redis-server; then
    print_status "✓ Redis server is running"
else
    print_error "✗ Redis server is not running"
fi

# Test ClamAV
print_status "Testing ClamAV installation..."
echo "Test file for ClamAV" | sudo clamdscan - 2>/dev/null && print_status "✓ ClamAV is working" || print_warning "ClamAV test had issues"

# Test Redis
print_status "Testing Redis connection..."
redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null && print_status "✓ Redis is working" || print_warning "Redis test had issues"

# Display service status
print_status "Service Status Summary:"
echo "===================="
systemctl status clamav-daemon --no-pager -l
echo "===================="
systemctl status redis-server --no-pager -l
echo "===================="

print_status "Security services installation completed!"
print_status "Redis password saved to: /tmp/redis_credentials.txt"
print_warning "Please add the Redis password to your .env file"
print_warning "Reboot recommended to ensure all group permissions take effect"

echo ""
echo "Next steps:"
echo "1. Add Redis password to your .env file"
echo "2. Update your Node.js application with security middleware"
echo "3. Configure SSL certificates"
echo "4. Run security tests"
echo ""