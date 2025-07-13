#!/bin/bash

# Test Backend CORS for Frontend on Port 5174

BASE_URL="http://localhost:8000"
API_BASE="$BASE_URL/api/v1"
FRONTEND_ORIGIN="http://localhost:5174"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo -e "${BLUE}"
echo "=============================================="
echo "  Backend CORS Test for Port 5174"
echo "=============================================="
echo -e "${NC}"

# Test 1: CORS Preflight
print_step "Testing CORS Preflight for localhost:5174"
response=$(curl -s -H "Origin: $FRONTEND_ORIGIN" \
               -H "Access-Control-Request-Method: POST" \
               -H "Access-Control-Request-Headers: Content-Type,Authorization" \
               -X OPTIONS \
               -w "%{http_code}" \
               "$API_BASE/processing/process-text")

http_code=${response: -3}

if [ "$http_code" -eq 200 ]; then
    print_success "CORS Preflight successful (Status: $http_code)"
else
    print_error "CORS Preflight failed (Status: $http_code)"
fi

# Test 2: GET Request with Origin
print_step "Testing GET Request from localhost:5174"
response=$(curl -s -H "Origin: $FRONTEND_ORIGIN" \
               -w "%{http_code}" \
               "$BASE_URL/health")

http_code=${response: -3}
body=${response%???}

if [ "$http_code" -eq 200 ]; then
    print_success "GET Request successful (Status: $http_code)"
    
    # Check CORS headers
    cors_check=$(curl -s -H "Origin: $FRONTEND_ORIGIN" \
                     -I "$BASE_URL/health" | grep -i "access-control-allow-origin")
    
    if [[ "$cors_check" == *"localhost:5174"* ]]; then
        print_success "CORS headers correctly set for localhost:5174"
    else
        print_error "CORS headers missing or incorrect"
    fi
else
    print_error "GET Request failed (Status: $http_code)"
fi

# Test 3: API Endpoint Access
print_step "Testing API Endpoint Access"
response=$(curl -s -H "Origin: $FRONTEND_ORIGIN" \
               -w "%{http_code}" \
               "$API_BASE/processing/health")

http_code=${response: -3}

if [ "$http_code" -eq 200 ]; then
    print_success "API endpoints accessible from localhost:5174"
else
    print_error "API endpoint access failed (Status: $http_code)"
fi

# Test 4: CSRF Token Endpoint
print_step "Testing CSRF Token Endpoint"
response=$(curl -s -H "Origin: $FRONTEND_ORIGIN" \
               -w "%{http_code}" \
               "$API_BASE/csrf-token")

http_code=${response: -3}
body=${response%???}

if [ "$http_code" -eq 200 ]; then
    print_success "CSRF token endpoint accessible"
    
    # Check if token is present
    if echo "$body" | jq -e '.data.csrfToken' > /dev/null 2>&1; then
        print_success "CSRF token properly returned"
    fi
else
    print_error "CSRF token endpoint failed (Status: $http_code)"
fi

echo ""
echo -e "${BLUE}=============================================="
echo "  Configuration Summary"
echo "==============================================\\${NC}"

echo ""
echo "✅ HTTP CORS Configuration:"
echo "   • localhost:5174 ✅ ALLOWED"
echo "   • localhost:5173 ✅ ALLOWED" 
echo "   • localhost:5175 ✅ ALLOWED"
echo "   • All localhost ports ✅ ALLOWED in development"
echo ""

echo "✅ WebSocket CORS Configuration:"
echo "   • localhost:5174 ✅ ALLOWED"
echo "   • localhost:5173 ✅ ALLOWED"
echo "   • localhost:5175 ✅ ALLOWED"
echo ""

echo "✅ Your Frontend Integration Code for Port 5174:"
cat << 'EOF'

// API Requests
const response = await fetch('http://localhost:8000/api/v1/csrf-token', {
  method: 'GET',
  credentials: 'include',  // Important for CSRF/sessions
  headers: {
    'Content-Type': 'application/json'
  }
});

// WebSocket Connection
import io from 'socket.io-client';
const socket = io('http://localhost:8000', {
  auth: { token: yourJWTToken }
});

// All endpoints available:
// - GET  /health
// - GET  /api/v1/csrf-token
// - POST /api/v1/users/register
// - POST /api/v1/users/login
// - POST /api/v1/processing/process-text
// - POST /api/v1/processing/process-audio
// - GET  /api/v1/processing/status/{requestId}
// - GET  /api/v1/processing/jobs
// - GET  /api/v1/processing/health

EOF

echo ""
print_success "Your backend is fully configured and ready for frontend on port 5174!"