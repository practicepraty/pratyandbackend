#!/bin/bash

set -e

echo "🐳 Docker Installation Helper for Ubuntu/Debian"
echo "================================================"

# Function to check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        echo "❌ Please don't run this script as root"
        echo "   Run as regular user and use sudo when needed"
        exit 1
    fi
}

# Function to check if Docker is already installed
check_docker() {
    if command -v docker >/dev/null 2>&1; then
        echo "✅ Docker is already installed"
        docker --version
        return 0
    else
        echo "❌ Docker is not installed"
        return 1
    fi
}

# Function to install Docker
install_docker() {
    echo "📦 Installing Docker..."
    
    # Update package index
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed successfully"
    echo "⚠️  Please log out and log back in for group changes to take effect"
    echo "   Or run: newgrp docker"
}

# Function to start Docker service
start_docker() {
    echo "🚀 Starting Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
    echo "✅ Docker service started and enabled"
}

# Function to test Docker installation
test_docker() {
    echo "🧪 Testing Docker installation..."
    
    # Test basic Docker command
    if docker --version >/dev/null 2>&1; then
        echo "✅ Docker command works"
    else
        echo "❌ Docker command failed"
        echo "   Try: newgrp docker"
        return 1
    fi
    
    # Test Docker daemon
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker daemon is running"
    else
        echo "❌ Docker daemon is not running"
        echo "   Try: sudo systemctl start docker"
        return 1
    fi
    
    # Test Docker compose
    if docker compose version >/dev/null 2>&1; then
        echo "✅ Docker Compose plugin is available"
    else
        echo "❌ Docker Compose plugin not available"
        return 1
    fi
    
    echo "🎉 Docker installation test passed!"
}

# Main execution
check_root

echo "🔍 Checking current Docker installation..."
if check_docker; then
    echo "🧪 Testing current installation..."
    if test_docker; then
        echo "🎉 Docker is working correctly!"
        echo "🚀 You can now run: ./scripts/redis-start.sh"
        exit 0
    else
        echo "⚠️  Docker is installed but not working correctly"
        echo "   Attempting to fix..."
        start_docker
        echo "   Please run: newgrp docker"
        exit 1
    fi
else
    echo "📦 Docker not found. Installing..."
    
    # Check if we're on Ubuntu/Debian
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "ubuntu" || "$ID" == "debian" ]]; then
            install_docker
            start_docker
            echo ""
            echo "🎉 Docker installation complete!"
            echo "⚠️  IMPORTANT: Please log out and log back in, then run:"
            echo "   ./scripts/redis-start.sh"
        else
            echo "❌ This script is designed for Ubuntu/Debian"
            echo "   Please install Docker manually for your OS"
            exit 1
        fi
    else
        echo "❌ Cannot detect OS. Please install Docker manually"
        exit 1
    fi
fi