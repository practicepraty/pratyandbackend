#!/bin/bash

# Audio Processing Test Script
# Tests the complete audio processing pipeline

set -e

BASE_URL="http://localhost:8000"
API_BASE="$BASE_URL/api/v1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

# Check server
if ! curl -s "$BASE_URL/health" > /dev/null; then
    print_error "Backend server not running on $BASE_URL"
    exit 1
fi

print_step "Audio Processing Test - Complete Pipeline"

# Create cookie jar for session management
COOKIE_JAR="/tmp/audio_test_cookies.txt"
rm -f "$COOKIE_JAR"

# Step 1: Login with existing user
print_step "1. User Authentication"

# Login with provided credentials
login_response=$(curl -s -X POST \
                 -H "Content-Type: application/json" \
                 -d '{
                     "professionalEmail": "krpratyush47@gmail.com",
                     "password": "hitman47"
                 }' \
                 -w "%{http_code}" \
                 "$API_BASE/users/login")

login_http_code=${login_response: -3}
login_body=${login_response%???}

if [ "$login_http_code" -eq 200 ]; then
    print_success "Login successful"
    ACCESS_TOKEN=$(echo "$login_body" | jq -r '.data.accessToken' 2>/dev/null)
    
    if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
        print_success "Access token received: ${ACCESS_TOKEN:0:50}..."
    else
        print_error "No access token in response"
        echo "$login_body" | jq '.' 2>/dev/null || echo "$login_body"
        exit 1
    fi
else
    print_error "Login failed ($login_http_code)"
    echo "$login_body" | jq '.' 2>/dev/null || echo "$login_body"
    exit 1
fi

# Step 2: Test audio processing with different file types
print_step "2. Testing Audio Processing"

# Check if audio files exist
AUDIO_FILE=""
if [ -f "./public/temp/audio/6293799922567223745.mp3" ]; then
    AUDIO_FILE="./public/temp/audio/6293799922567223745.mp3"
    print_success "Using existing audio file: $AUDIO_FILE"
elif [ -f "./public/temp/audio/audio-1752098184962-577943309.mp3" ]; then
    AUDIO_FILE="./public/temp/audio/audio-1752098184962-577943309.mp3"
    print_success "Using existing audio file: $AUDIO_FILE"
else
    print_error "No audio files found in ./public/temp/audio/"
    ls -la ./public/temp/audio/ || true
    
    # Create a minimal test audio file (this won't actually work for transcription but will test validation)
    print_step "Creating minimal test file for validation testing"
    mkdir -p ./public/temp/audio/
    echo "ID3" > ./public/temp/audio/test.mp3
    AUDIO_FILE="./public/temp/audio/test.mp3"
    print_warning "Created minimal test file: $AUDIO_FILE (won't transcribe but tests validation)"
fi

# Test audio processing without authentication first
print_step "3. Testing Audio Upload Validation (Without Auth)"
no_auth_response=$(curl -s -X POST \
                   -F "audioFile=@$AUDIO_FILE" \
                   -F "language=en" \
                   -F "speakerLabels=true" \
                   -F "expectedSpeakers=2" \
                   -w "%{http_code}" \
                   "$API_BASE/processing/process-audio")

no_auth_http_code=${no_auth_response: -3}
no_auth_body=${no_auth_response%???}

if [ "$no_auth_http_code" -eq 401 ]; then
    print_success "Correctly rejected without authentication"
else
    print_error "Unexpected response without auth ($no_auth_http_code)"
    echo "$no_auth_body" | jq '.' 2>/dev/null || echo "$no_auth_body"
fi

# Test audio processing with authentication
print_step "4. Testing Audio Upload with Authentication"
audio_response=$(curl -s -X POST \
                 -H "Authorization: Bearer $ACCESS_TOKEN" \
                 -F "audioFile=@$AUDIO_FILE" \
                 -F "language=en" \
                 -F "speakerLabels=true" \
                 -F "expectedSpeakers=2" \
                 -F "autoHighlights=true" \
                 -F "saveToDatabase=true" \
                 -F "notifyProgress=true" \
                 -w "%{http_code}" \
                 "$API_BASE/processing/process-audio")

audio_http_code=${audio_response: -3}
audio_body=${audio_response%???}

print_step "5. Audio Processing Response Analysis"
echo "HTTP Code: $audio_http_code"
echo "Response Body:"
echo "$audio_body" | jq '.' 2>/dev/null || echo "$audio_body"

if [ "$audio_http_code" -eq 200 ]; then
    print_success "Audio processing initiated successfully!"
    
    REQUEST_ID=$(echo "$audio_body" | jq -r '.data.requestId' 2>/dev/null)
    if [ "$REQUEST_ID" != "null" ] && [ "$REQUEST_ID" != "" ]; then
        print_success "Request ID: $REQUEST_ID"
        
        # Test status checking
        print_step "6. Checking Processing Status"
        sleep 2
        
        status_response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                             -w "%{http_code}" \
                             "$API_BASE/processing/status/$REQUEST_ID")
        
        status_http_code=${status_response: -3}
        status_body=${status_response%???}
        
        echo "Status HTTP Code: $status_http_code"
        echo "Status Response:"
        echo "$status_body" | jq '.' 2>/dev/null || echo "$status_body"
        
        if [ "$status_http_code" -eq 200 ]; then
            print_success "Status check successful!"
        else
            print_error "Status check failed ($status_http_code)"
        fi
    else
        print_error "No request ID in response"
    fi
elif [ "$audio_http_code" -eq 400 ]; then
    print_error "Bad request - validation failed"
    echo "This indicates an issue with:"
    echo "- File format validation"
    echo "- Parameter validation" 
    echo "- Request structure"
elif [ "$audio_http_code" -eq 500 ]; then
    print_error "Server error - processing failed"
    echo "This indicates an issue with:"
    echo "- Assembly AI integration"
    echo "- File processing"
    echo "- Internal server error"
else
    print_error "Audio processing failed ($audio_http_code)"
fi

# Test jobs endpoint
print_step "7. Testing Jobs Endpoint"
jobs_response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                   -w "%{http_code}" \
                   "$API_BASE/processing/jobs")

jobs_http_code=${jobs_response: -3}
jobs_body=${jobs_response%???}

echo "Jobs HTTP Code: $jobs_http_code"
echo "Jobs Response:"
echo "$jobs_body" | jq '.' 2>/dev/null || echo "$jobs_body"

if [ "$jobs_http_code" -eq 200 ]; then
    print_success "Jobs endpoint working!"
else
    print_error "Jobs endpoint failed ($jobs_http_code)"
fi

print_step "Test Complete!"
echo "Summary:"
echo "- Authentication: ✓"
echo "- Audio endpoint accessibility: $([ "$audio_http_code" -ne 401 ] && echo "✓" || echo "✗")"
echo "- Status endpoint: $([ "$status_http_code" -eq 200 ] && echo "✓" || echo "✗")"
echo "- Jobs endpoint: $([ "$jobs_http_code" -eq 200 ] && echo "✓" || echo "✗")"

# Cleanup
rm -f "$COOKIE_JAR"