#!/bin/bash

set -e

REDIS_CONTAINER_NAME="redis-server"

echo "🛑 Stopping Redis..."

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

# Function to stop Redis with plain Docker
stop_redis_docker() {
    echo "🐳 Stopping Redis with plain Docker..."
    
    # Check if container exists and is running
    if docker ps -q -f name=$REDIS_CONTAINER_NAME | grep -q .; then
        echo "🛑 Stopping Redis container..."
        docker stop $REDIS_CONTAINER_NAME
        echo "✅ Redis container stopped"
    else
        echo "⚠️  Redis container is not running"
    fi
    
    # Remove container if it exists
    if docker ps -a -q -f name=$REDIS_CONTAINER_NAME | grep -q .; then
        echo "🗑️  Removing Redis container..."
        docker rm $REDIS_CONTAINER_NAME
        echo "✅ Redis container removed"
    fi
}

# Main execution
if ! command_exists docker; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Try Docker Compose first
compose_method=$(detect_compose)
if [ "$compose_method" != "none" ]; then
    echo "🐳 Using $compose_method..."
    
    if run_compose down; then
        echo "✅ Redis stopped with $compose_method"
    else
        echo "❌ Failed to stop Redis with $compose_method, trying plain Docker..."
        stop_redis_docker
    fi
else
    echo "🐳 Docker Compose not available, using plain Docker..."
    stop_redis_docker
fi

echo "🎉 Redis stopped successfully!"

# Show current container status
echo "📊 Current container status:"
if docker ps -a --filter name=$REDIS_CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q $REDIS_CONTAINER_NAME; then
    docker ps -a --filter name=$REDIS_CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "No Redis containers found"
fi