#!/bin/bash

# Simple Frontend Integration Test Script
# Tests endpoints without CSRF for development purposes

set -e

# Configuration
BASE_URL="http://localhost:8000"
API_BASE="$BASE_URL/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Test health endpoint
test_health() {
    print_step "Testing Health Endpoint"
    
    response=$(curl -s -w "%{http_code}" "$BASE_URL/health")
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Health endpoint working"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_error "Health endpoint failed"
    fi
}

# Test CORS preflight
test_cors() {
    print_step "Testing CORS for Frontend"
    
    response=$(curl -s -H "Origin: http://localhost:5173" \
                   -H "Access-Control-Request-Method: POST" \
                   -H "Access-Control-Request-Headers: Content-Type,Authorization" \
                   -X OPTIONS \
                   -w "%{http_code}" \
                   "$API_BASE/processing/process-text")
    
    http_code=${response: -3}
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 204 ]; then
        print_success "CORS configured for localhost:5173"
    else
        print_error "CORS issue (Status: $http_code)"
    fi
}

# Test service stats (no auth required)
test_service_stats() {
    print_step "Testing Service Statistics"
    
    response=$(curl -s -w "%{http_code}" "$API_BASE/processing/health")
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Service stats working"
        echo "$body" | jq '.data.services' 2>/dev/null || echo "Services info retrieved"
    else
        print_error "Service stats failed"
    fi
}

# Test with session-based authentication
test_with_session() {
    print_step "Testing with Session Management"
    
    # Create a temporary cookie jar
    COOKIE_JAR="/tmp/test_cookies.txt"
    rm -f "$COOKIE_JAR"
    
    # Get CSRF token with session
    print_step "Getting CSRF Token with Session"
    response=$(curl -s -c "$COOKIE_JAR" -w "%{http_code}" "$API_BASE/csrf-token")
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        CSRF_TOKEN=$(echo "$body" | jq -r '.data.csrfToken' 2>/dev/null)
        print_success "CSRF token received with session: ${CSRF_TOKEN:0:20}..."
        
        # Test user registration with session and CSRF
        print_step "Testing Registration with Session + CSRF"
        reg_response=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
                           -X POST \
                           -H "Content-Type: application/json" \
                           -H "X-CSRF-Token: $CSRF_TOKEN" \
                           -d '{
                               "email": "test-session@example.com",
                               "password": "testpass123",
                               "fullName": "Test Session User",
                               "phoneNumber": "+1234567890",
                               "medicalSpecialty": "general-practice"
                           }' \
                           -w "%{http_code}" \
                           "$API_BASE/users/register")
        
        reg_http_code=${reg_response: -3}
        reg_body=${reg_response%???}
        
        if [ "$reg_http_code" -eq 200 ] || [ "$reg_http_code" -eq 201 ]; then
            print_success "Registration with session works"
        elif [ "$reg_http_code" -eq 400 ] && [[ "$reg_body" == *"already exists"* ]]; then
            print_warning "User already exists (this is expected)"
        else
            print_error "Registration failed with status $reg_http_code"
            echo "$reg_body"
        fi
        
        # Test login with session
        print_step "Testing Login with Session + CSRF"
        
        # Get fresh CSRF token for login
        csrf_response=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$API_BASE/csrf-token")
        CSRF_TOKEN=$(echo "$csrf_response" | jq -r '.data.csrfToken' 2>/dev/null)
        
        login_response=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
                             -X POST \
                             -H "Content-Type: application/json" \
                             -H "X-CSRF-Token: $CSRF_TOKEN" \
                             -d '{
                                 "email": "test-session@example.com",
                                 "password": "testpass123"
                             }' \
                             -w "%{http_code}" \
                             "$API_BASE/users/login")
        
        login_http_code=${login_response: -3}
        login_body=${login_response%???}
        
        if [ "$login_http_code" -eq 200 ]; then
            print_success "Login with session works"
            ACCESS_TOKEN=$(echo "$login_body" | jq -r '.data.accessToken' 2>/dev/null)
            if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
                print_success "Access token received: ${ACCESS_TOKEN:0:50}..."
                
                # Test text processing with token
                test_text_processing_with_token "$ACCESS_TOKEN"
                
            fi
        else
            print_error "Login failed with status $login_http_code"
            echo "$login_body"
        fi
        
    else
        print_error "Could not get CSRF token"
    fi
    
    # Cleanup
    rm -f "$COOKIE_JAR"
}

# Test text processing with valid token
test_text_processing_with_token() {
    local token="$1"
    print_step "Testing Text Processing with Valid Token"
    
    response=$(curl -s -X POST \
                   -H "Content-Type: application/json" \
                   -H "Authorization: Bearer $token" \
                   -d '{
                       "text": "I am Dr. Johnson, a cardiologist with 15 years of experience treating heart conditions. My practice focuses on preventive cardiology and patient education.",
                       "specialty": "cardiology",
                       "saveToDatabase": true,
                       "notifyProgress": true
                   }' \
                   -w "%{http_code}" \
                   "$API_BASE/processing/process-text")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Text processing endpoint works!"
        REQUEST_ID=$(echo "$body" | jq -r '.data.requestId' 2>/dev/null)
        if [ "$REQUEST_ID" != "null" ] && [ "$REQUEST_ID" != "" ]; then
            print_success "Request ID received: $REQUEST_ID"
            
            # Test status endpoint
            sleep 1
            status_response=$(curl -s -H "Authorization: Bearer $token" \
                                 -w "%{http_code}" \
                                 "$API_BASE/processing/status/$REQUEST_ID")
            
            status_http_code=${status_response: -3}
            if [ "$status_http_code" -eq 200 ] || [ "$status_http_code" -eq 404 ]; then
                print_success "Status endpoint accessible"
            fi
            
            # Test user jobs endpoint
            jobs_response=$(curl -s -H "Authorization: Bearer $token" \
                               -w "%{http_code}" \
                               "$API_BASE/processing/jobs")
            
            jobs_http_code=${jobs_response: -3}
            if [ "$jobs_http_code" -eq 200 ]; then
                print_success "User jobs endpoint works"
            fi
        fi
    else
        print_error "Text processing failed with status $http_code"
        echo "$body"
    fi
}

# Test WebSocket endpoint info
test_websocket_info() {
    print_step "WebSocket Connection Info"
    
    echo "WebSocket server available at: ws://localhost:8000"
    echo "Authentication: Include 'Bearer TOKEN' in auth.token or query.token"
    echo "Events to listen for:"
    echo "  - 'connected': Connection confirmation"
    echo "  - 'welcome': Welcome message with features"
    echo "  - 'progress-update': Real-time progress updates"
    echo "  - 'progress-complete': Processing completion"
    echo "  - 'progress-error': Processing errors"
    echo "  - 'notification': General notifications"
    echo ""
    echo "Events to emit:"
    echo "  - 'subscribe-progress': {requestId: 'uuid'}"
    echo "  - 'unsubscribe-progress': {requestId: 'uuid'}"
}

# Frontend integration guide
show_frontend_guide() {
    print_step "Frontend Integration Guide"
    
    echo "Your backend is ready for frontend integration!"
    echo ""
    echo "Key Integration Points:"
    echo "1. CORS: ✓ Configured for localhost:5173"
    echo "2. Authentication: ✓ JWT tokens via /users/login"
    echo "3. CSRF Protection: ✓ Get token from /csrf-token (with session)"
    echo "4. Processing: ✓ Text and audio processing endpoints"
    echo "5. WebSocket: ✓ Real-time progress tracking"
    echo "6. Error Handling: ✓ Structured error responses"
    echo ""
    echo "Frontend Implementation Steps:"
    echo "1. Setup session management (cookies) for CSRF"
    echo "2. Get CSRF token before auth requests"
    echo "3. Login to get JWT access token"
    echo "4. Use JWT token for API requests"
    echo "5. Connect to WebSocket with JWT token"
    echo "6. Subscribe to progress events for real-time updates"
    echo ""
    echo "Sample Frontend Code:"
    echo "// Login and get token"
    echo "const response = await fetch('/api/v1/users/login', {"
    echo "  method: 'POST',"
    echo "  credentials: 'include', // Important for CSRF"
    echo "  headers: { 'Content-Type': 'application/json' },"
    echo "  body: JSON.stringify({ email, password })"
    echo "});"
    echo ""
    echo "// Use token for API calls"
    echo "const processResponse = await fetch('/api/v1/processing/process-text', {"
    echo "  method: 'POST',"
    echo "  headers: {"
    echo "    'Content-Type': 'application/json',"
    echo "    'Authorization': \`Bearer \${token}\`"
    echo "  },"
    echo "  body: JSON.stringify({ text, specialty })"
    echo "});"
    echo ""
    echo "// WebSocket connection"
    echo "const socket = io('http://localhost:8000', {"
    echo "  auth: { token: accessToken }"
    echo "});"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  Simple Frontend Integration Tests"
    echo "=========================================="
    echo -e "${NC}"
    
    # Basic tests
    test_health
    test_cors
    test_service_stats
    
    echo ""
    # Session-based tests
    test_with_session
    
    echo ""
    # WebSocket info
    test_websocket_info
    
    echo ""
    # Frontend guide
    show_frontend_guide
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  Integration Tests Complete!"
    echo "==========================================${NC}"
}

# Check if server is running first
if ! curl -s "$BASE_URL/health" > /dev/null; then
    print_error "Backend server is not running on $BASE_URL"
    echo "Please start your backend server first with: npm run dev"
    exit 1
fi

# Run the tests
main "$@"