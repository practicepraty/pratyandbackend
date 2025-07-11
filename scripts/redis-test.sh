#!/bin/bash

set -e

REDIS_CONTAINER_NAME="redis-server"
REDIS_PORT="6379"

echo "🧪 Testing Redis connection..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect Docker Compose method
detect_compose() {
    if command_exists docker-compose; then
        echo "docker-compose"
    elif command_exists docker && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        echo "none"
    fi
}

# Function to run Docker Compose command
run_compose() {
    local compose_method=$(detect_compose)
    case $compose_method in
        "docker-compose")
            docker-compose "$@"
            ;;
        "docker compose")
            docker compose "$@"
            ;;
        "none")
            echo "❌ Neither docker-compose nor docker compose is available"
            return 1
            ;;
    esac
}

# Function to execute Redis command
exec_redis_cmd() {
    local compose_method=$(detect_compose)
    
    if [ "$compose_method" != "none" ]; then
        # Try compose first
        if run_compose exec redis redis-cli "$@" 2>/dev/null; then
            return 0
        fi
    fi
    
    # Fall back to plain Docker
    if docker exec $REDIS_CONTAINER_NAME redis-cli "$@" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to check if Redis container is running
is_redis_running() {
    # Check with compose first
    local compose_method=$(detect_compose)
    if [ "$compose_method" != "none" ]; then
        if run_compose ps redis 2>/dev/null | grep -q "Up"; then
            return 0
        fi
    fi
    
    # Check with plain Docker
    if docker ps --filter name=$REDIS_CONTAINER_NAME --format "{{.Status}}" | grep -q "Up"; then
        return 0
    fi
    
    return 1
}

# Main execution
if ! command_exists docker; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Test if Redis container is running
echo "🔍 Checking if Redis container is running..."
if ! is_redis_running; then
    echo "❌ Redis container is not running"
    echo "🚀 Start it with: ./scripts/redis-start.sh"
    exit 1
fi

echo "✅ Redis container is running"

# Test Redis ping
echo "🏓 Testing Redis ping..."
if exec_redis_cmd ping | grep -q "PONG"; then
    echo "✅ Redis is responding to ping"
else
    echo "❌ Redis is not responding to ping"
    
    # Try to get more information
    echo "🔍 Checking container logs..."
    if docker logs $REDIS_CONTAINER_NAME --tail 10 2>/dev/null; then
        echo "☝️  Check logs above for Redis startup issues"
    fi
    exit 1
fi

# Test basic operations
echo "🔧 Testing basic Redis operations..."

# Set a test key
if exec_redis_cmd set test_key "Hello Redis" | grep -q "OK"; then
    echo "✅ Redis SET operation working"
else
    echo "❌ Redis SET operation failed"
    exit 1
fi

# Get the test key
RESULT=$(exec_redis_cmd get test_key 2>/dev/null)
if echo "$RESULT" | grep -q "Hello Redis"; then
    echo "✅ Redis GET operation working"
else
    echo "❌ Redis GET operation failed (got: '$RESULT')"
    exit 1
fi

# Delete the test key
if exec_redis_cmd del test_key >/dev/null 2>&1; then
    echo "✅ Redis DEL operation working"
else
    echo "❌ Redis DEL operation failed"
    exit 1
fi

# Test connection from host
echo "🌐 Testing Redis connection from host..."
if command_exists redis-cli; then
    if redis-cli -h localhost -p $REDIS_PORT ping 2>/dev/null | grep -q "PONG"; then
        echo "✅ Redis accessible from host via redis-cli"
    else
        echo "⚠️  Redis not accessible from host (redis-cli not working)"
        echo "   This might be normal if redis-cli is not installed on host"
    fi
else
    echo "ℹ️  redis-cli not installed on host - testing via Docker only"
fi

# Test with Node.js-style connection
echo "🔗 Testing connection parameters for Node.js..."
echo "   Host: localhost"
echo "   Port: $REDIS_PORT"
echo "   Connection string: redis://localhost:$REDIS_PORT"

# Show container info
echo "📊 Redis container info:"
docker ps --filter name=$REDIS_CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test Redis info
echo "ℹ️  Redis server info:"
REDIS_VERSION=$(exec_redis_cmd info server | grep "redis_version" | cut -d: -f2 | tr -d '\r' 2>/dev/null || echo "unknown")
echo "   Redis version: $REDIS_VERSION"

REDIS_MODE=$(exec_redis_cmd info server | grep "redis_mode" | cut -d: -f2 | tr -d '\r' 2>/dev/null || echo "unknown")
echo "   Redis mode: $REDIS_MODE"

echo "🎉 All Redis tests passed!"
echo "🚀 Your Node.js app should now be able to connect to Redis!"