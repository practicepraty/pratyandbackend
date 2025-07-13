#!/bin/bash

# Frontend Integration Test Script for Backend API
# This script tests all endpoints that the frontend will use

set -e

# Configuration
BASE_URL="http://localhost:8000"
API_BASE="$BASE_URL/api/v1"
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="testpass123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if server is running
check_server() {
    print_step "Checking if backend server is running"
    
    if curl -s "$BASE_URL/health" > /dev/null; then
        print_success "Backend server is running on $BASE_URL"
    else
        print_error "Backend server is not running on $BASE_URL"
        echo "Please start your backend server first with: npm run dev"
        exit 1
    fi
}

# Function to test health endpoint
test_health() {
    print_step "Testing Health Endpoint"
    
    response=$(curl -s -w "%{http_code}" "$BASE_URL/health")
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Health endpoint working"
        echo "Response: $body"
    else
        print_error "Health endpoint failed with status $http_code"
    fi
}

# Function to test CORS
test_cors() {
    print_step "Testing CORS Configuration"
    
    response=$(curl -s -H "Origin: http://localhost:5173" \
                   -H "Access-Control-Request-Method: POST" \
                   -H "Access-Control-Request-Headers: Content-Type,Authorization" \
                   -X OPTIONS \
                   -w "%{http_code}" \
                   "$API_BASE/processing/process-text")
    
    http_code=${response: -3}
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 204 ]; then
        print_success "CORS configured correctly for localhost:5173"
    else
        print_error "CORS configuration issue (Status: $http_code)"
    fi
}

# Function to test user registration
test_user_registration() {
    print_step "Testing User Registration"
    
    # First get CSRF token
    csrf_response=$(curl -s "$API_BASE/csrf-token")
    CSRF_TOKEN=$(echo "$csrf_response" | jq -r '.data.csrfToken' 2>/dev/null)
    
    if [ "$CSRF_TOKEN" = "null" ] || [ "$CSRF_TOKEN" = "" ]; then
        print_error "Could not get CSRF token for registration"
        return 1
    fi
    
    response=$(curl -s -X POST \
                   -H "Content-Type: application/json" \
                   -H "X-CSRF-Token: $CSRF_TOKEN" \
                   -d '{
                       "email": "'$TEST_USER_EMAIL'",
                       "password": "'$TEST_USER_PASSWORD'",
                       "fullName": "Test User",
                       "phoneNumber": "+1234567890",
                       "medicalSpecialty": "general-practice"
                   }' \
                   -w "%{http_code}" \
                   "$API_BASE/users/register")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        print_success "User registration working"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_warning "User registration returned $http_code (might already exist)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
}

# Function to test user login and get token
test_user_login() {
    print_step "Testing User Login"
    
    # First get CSRF token
    csrf_response=$(curl -s "$API_BASE/csrf-token")
    CSRF_TOKEN=$(echo "$csrf_response" | jq -r '.data.csrfToken' 2>/dev/null)
    
    if [ "$CSRF_TOKEN" = "null" ] || [ "$CSRF_TOKEN" = "" ]; then
        print_error "Could not get CSRF token for login"
        return 1
    fi
    
    response=$(curl -s -X POST \
                   -H "Content-Type: application/json" \
                   -H "X-CSRF-Token: $CSRF_TOKEN" \
                   -d '{
                       "email": "'$TEST_USER_EMAIL'",
                       "password": "'$TEST_USER_PASSWORD'"
                   }' \
                   -w "%{http_code}" \
                   "$API_BASE/users/login")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "User login working"
        
        # Extract access token
        ACCESS_TOKEN=$(echo "$body" | jq -r '.data.accessToken' 2>/dev/null)
        
        if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
            print_success "Access token received: ${ACCESS_TOKEN:0:50}..."
            echo "$ACCESS_TOKEN" > /tmp/test_token.txt
        else
            print_error "No access token in response"
            echo "$body"
        fi
    else
        print_error "User login failed with status $http_code"
        echo "$body"
    fi
}

# Function to test text processing endpoint
test_text_processing() {
    print_step "Testing Text Processing Endpoint"
    
    if [ ! -f "/tmp/test_token.txt" ]; then
        print_error "No access token available. Login failed."
        return 1
    fi
    
    ACCESS_TOKEN=$(cat /tmp/test_token.txt)
    
    response=$(curl -s -X POST \
                   -H "Content-Type: application/json" \
                   -H "Authorization: Bearer $ACCESS_TOKEN" \
                   -d '{
                       "text": "I am Dr. Smith, a cardiologist with 15 years of experience. I specialize in heart disease treatment and prevention. My clinic offers comprehensive cardiac care including ECG, stress testing, and cardiac rehabilitation. I am board certified and committed to providing excellent patient care.",
                       "specialty": "cardiology",
                       "saveToDatabase": true,
                       "notifyProgress": true
                   }' \
                   -w "%{http_code}" \
                   "$API_BASE/processing/process-text")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Text processing endpoint working"
        echo "$body" | jq '.data.requestId' 2>/dev/null || echo "Response received"
        
        # Extract request ID for status checking
        REQUEST_ID=$(echo "$body" | jq -r '.data.requestId' 2>/dev/null)
        if [ "$REQUEST_ID" != "null" ] && [ "$REQUEST_ID" != "" ]; then
            echo "$REQUEST_ID" > /tmp/test_request_id.txt
        fi
    else
        print_error "Text processing failed with status $http_code"
        echo "$body"
    fi
}

# Function to test processing status endpoint
test_processing_status() {
    print_step "Testing Processing Status Endpoint"
    
    if [ ! -f "/tmp/test_token.txt" ] || [ ! -f "/tmp/test_request_id.txt" ]; then
        print_warning "No access token or request ID available. Skipping status test."
        return 0
    fi
    
    ACCESS_TOKEN=$(cat /tmp/test_token.txt)
    REQUEST_ID=$(cat /tmp/test_request_id.txt)
    
    response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                   -w "%{http_code}" \
                   "$API_BASE/processing/status/$REQUEST_ID")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Processing status endpoint working"
        echo "$body" | jq '.data.status' 2>/dev/null || echo "Status retrieved"
    elif [ "$http_code" -eq 404 ]; then
        print_warning "Processing request not found (may have completed)"
    else
        print_error "Processing status failed with status $http_code"
        echo "$body"
    fi
}

# Function to test user jobs endpoint
test_user_jobs() {
    print_step "Testing User Processing Jobs Endpoint"
    
    if [ ! -f "/tmp/test_token.txt" ]; then
        print_warning "No access token available. Skipping user jobs test."
        return 0
    fi
    
    ACCESS_TOKEN=$(cat /tmp/test_token.txt)
    
    response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                   -w "%{http_code}" \
                   "$API_BASE/processing/jobs")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "User jobs endpoint working"
        echo "$body" | jq '.data.totalJobs' 2>/dev/null || echo "Jobs retrieved"
    else
        print_error "User jobs failed with status $http_code"
        echo "$body"
    fi
}

# Function to test service stats (health endpoint for frontend)
test_service_stats() {
    print_step "Testing Service Statistics Endpoint"
    
    response=$(curl -s -w "%{http_code}" "$API_BASE/processing/health")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Service stats endpoint working"
        echo "$body" | jq '.data.services' 2>/dev/null || echo "Stats retrieved"
    else
        print_error "Service stats failed with status $http_code"
        echo "$body"
    fi
}

# Function to test CSRF token endpoint
test_csrf_token() {
    print_step "Testing CSRF Token Endpoint"
    
    response=$(curl -s -w "%{http_code}" "$API_BASE/csrf-token")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "CSRF token endpoint working"
        CSRF_TOKEN=$(echo "$body" | jq -r '.data.csrfToken' 2>/dev/null)
        if [ "$CSRF_TOKEN" != "null" ] && [ "$CSRF_TOKEN" != "" ]; then
            print_success "CSRF token received: ${CSRF_TOKEN:0:20}..."
        fi
    else
        print_error "CSRF token failed with status $http_code"
        echo "$body"
    fi
}

# Function to create test audio file
create_test_audio() {
    print_step "Creating Test Audio File"
    
    # Create a simple test audio file (requires ffmpeg)
    if command -v ffmpeg >/dev/null 2>&1; then
        ffmpeg -f lavfi -i "sine=frequency=1000:duration=2" -ac 1 -ar 16000 /tmp/test_audio.wav -y 2>/dev/null
        if [ -f "/tmp/test_audio.wav" ]; then
            print_success "Test audio file created"
            return 0
        fi
    fi
    
    print_warning "FFmpeg not available or audio creation failed. Skipping audio test."
    return 1
}

# Function to test audio processing (if test audio exists)
test_audio_processing() {
    print_step "Testing Audio Processing Endpoint"
    
    if [ ! -f "/tmp/test_token.txt" ]; then
        print_warning "No access token available. Skipping audio test."
        return 0
    fi
    
    if [ ! -f "/tmp/test_audio.wav" ]; then
        print_warning "No test audio file. Skipping audio test."
        return 0
    fi
    
    ACCESS_TOKEN=$(cat /tmp/test_token.txt)
    
    response=$(curl -s -X POST \
                   -H "Authorization: Bearer $ACCESS_TOKEN" \
                   -F "audio=@/tmp/test_audio.wav" \
                   -F "language=en" \
                   -F "saveToDatabase=true" \
                   -F "notifyProgress=true" \
                   -w "%{http_code}" \
                   "$API_BASE/processing/process-audio")
    
    http_code=${response: -3}
    body=${response%???}
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Audio processing endpoint working"
        echo "$body" | jq '.data.requestId' 2>/dev/null || echo "Audio processing initiated"
    else
        print_warning "Audio processing failed with status $http_code (may be due to missing AssemblyAI key)"
        echo "$body"
    fi
}

# Function to test WebSocket connection
test_websocket() {
    print_step "Testing WebSocket Connection"
    
    if [ ! -f "/tmp/test_token.txt" ]; then
        print_warning "No access token available. Skipping WebSocket test."
        return 0
    fi
    
    if ! command -v node >/dev/null 2>&1; then
        print_warning "Node.js not available. Skipping WebSocket test."
        return 0
    fi
    
    ACCESS_TOKEN=$(cat /tmp/test_token.txt)
    
    # Create a simple WebSocket test script
    cat > /tmp/websocket_test.js << EOF
const io = require('socket.io-client');

const socket = io('http://localhost:8000', {
    auth: {
        token: '$ACCESS_TOKEN'
    },
    timeout: 5000
});

socket.on('connect', () => {
    console.log('✓ WebSocket connected successfully');
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.log('✗ WebSocket connection failed:', error.message);
    process.exit(1);
});

socket.on('welcome', (data) => {
    console.log('✓ Welcome message received:', data.message);
});

setTimeout(() => {
    console.log('✗ WebSocket connection timeout');
    process.exit(1);
}, 5000);
EOF

    if node /tmp/websocket_test.js 2>/dev/null; then
        print_success "WebSocket connection test passed"
    else
        print_warning "WebSocket test failed (socket.io-client may not be installed)"
    fi
    
    rm -f /tmp/websocket_test.js
}

# Function to cleanup test files
cleanup() {
    print_step "Cleaning up test files"
    rm -f /tmp/test_token.txt
    rm -f /tmp/test_request_id.txt
    rm -f /tmp/test_audio.wav
    rm -f /tmp/websocket_test.js
    print_success "Cleanup completed"
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "  Frontend Integration Test Suite"
    echo "=========================================="
    echo -e "${NC}"
    
    check_server
    test_health
    test_cors
    test_csrf_token
    test_service_stats
    
    echo ""
    print_step "Authentication Tests"
    test_user_registration
    test_user_login
    
    echo ""
    print_step "Processing Endpoint Tests"
    test_text_processing
    test_processing_status
    test_user_jobs
    
    echo ""
    print_step "Audio Processing Tests"
    if create_test_audio; then
        test_audio_processing
    fi
    
    echo ""
    print_step "WebSocket Tests"
    test_websocket
    
    echo ""
    cleanup
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "  Integration Test Suite Complete"
    echo "==========================================${NC}"
    echo ""
    echo "Frontend developers can now:"
    echo "1. Connect to WebSocket at ws://localhost:8000"
    echo "2. Use API endpoints at http://localhost:8000/api/v1"
    echo "3. Authenticate users and get access tokens"
    echo "4. Process text and audio inputs"
    echo "5. Track progress via WebSocket events"
    echo ""
    echo "Key endpoints for frontend:"
    echo "- POST /api/v1/users/register"
    echo "- POST /api/v1/users/login"
    echo "- POST /api/v1/processing/process-text"
    echo "- POST /api/v1/processing/process-audio"
    echo "- GET  /api/v1/processing/status/:requestId"
    echo "- GET  /api/v1/processing/jobs"
    echo "- GET  /api/v1/processing/health"
}

# Run the tests
main "$@"