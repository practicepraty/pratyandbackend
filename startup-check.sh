#!/bin/bash
# startup-check.sh - Check Redis connection before starting server

echo "Checking Redis connection..."

# Check if Redis is running
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis is running"
else
    echo "⚠ Redis is not running. Starting Redis..."
    
    # Try to start Redis (adjust path as needed)
    if command -v redis-server >/dev/null 2>&1; then
        redis-server --daemonize yes --port 6379 --maxmemory 256mb --maxmemory-policy allkeys-lru
        sleep 2
        
        if redis-cli ping > /dev/null 2>&1; then
            echo "✓ Redis started successfully"
        else
            echo "⚠ Failed to start Redis. Application will use fallback mode."
        fi
    else
        echo "⚠ Redis not installed. Application will use fallback mode."
    fi
fi

echo "Starting application..."
npm start