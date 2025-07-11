#!/bin/bash

set -e

REDIS_CONTAINER_NAME="redis-server"
REDIS_PORT="6379"

echo "🔍 Checking Docker installation..."

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

# Function to start Redis with plain Docker
start_redis_docker() {
    echo "🐳 Starting Redis with plain Docker..."
    
    # Stop existing container if running
    if docker ps -q -f name=$REDIS_CONTAINER_NAME | grep -q .; then
        echo "🛑 Stopping existing Redis container..."
        docker stop $REDIS_CONTAINER_NAME >/dev/null 2>&1 || true
    fi
    
    # Remove existing container
    if docker ps -a -q -f name=$REDIS_CONTAINER_NAME | grep -q .; then
        echo "🗑️  Removing existing Redis container..."
        docker rm $REDIS_CONTAINER_NAME >/dev/null 2>&1 || true
    fi
    
    # Create volume if it doesn't exist
    if ! docker volume ls | grep -q redis_data; then
        echo "📦 Creating Redis data volume..."
        docker volume create redis_data
    fi
    
    # Start Redis container
    echo "🚀 Starting Redis container..."
    docker run -d \
        --name $REDIS_CONTAINER_NAME \
        -p $REDIS_PORT:6379 \
        -v redis_data:/data \
        --restart unless-stopped \
        redis:7-alpine redis-server --appendonly yes
    
    if [ $? -eq 0 ]; then
        echo "✅ Redis container started successfully"
        return 0
    else
        echo "❌ Failed to start Redis container"
        return 1
    fi
}

# Function to wait for Redis to be ready
wait_for_redis() {
    echo "⏳ Waiting for Redis to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec $REDIS_CONTAINER_NAME redis-cli ping >/dev/null 2>&1; then
            echo "✅ Redis is ready!"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - waiting..."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo "❌ Redis failed to start within $max_attempts seconds"
    return 1
}

# Main execution
echo "🔧 Starting Redis setup..."

# Check if Docker is available
if ! command_exists docker; then
    echo "❌ Docker is not installed or not in PATH"
    echo "📖 Please install Docker first: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon is not running"
    echo "🔧 Please start Docker daemon first"
    exit 1
fi

# Try Docker Compose first
compose_method=$(detect_compose)
if [ "$compose_method" != "none" ]; then
    echo "🐳 Using $compose_method..."
    
    if run_compose up -d redis; then
        echo "✅ Redis started with $compose_method"
        
        # Wait for Redis to be ready
        if wait_for_redis; then
            echo "🎉 Redis is ready! Service running on port $REDIS_PORT"
            echo "🔗 Connection: redis://localhost:$REDIS_PORT"
        else
            echo "⚠️  Redis container started but not responding"
            exit 1
        fi
    else
        echo "❌ Failed to start Redis with $compose_method, trying plain Docker..."
        start_redis_docker && wait_for_redis
    fi
else
    echo "🐳 Docker Compose not available, using plain Docker..."
    start_redis_docker && wait_for_redis
fi

echo "🎉 Redis setup complete!"
echo "📊 Container status:"
docker ps --filter name=$REDIS_CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"