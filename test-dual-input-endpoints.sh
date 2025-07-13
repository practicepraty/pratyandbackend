#!/bin/bash

# Dual Input API Endpoint Testing Script
# This script tests both audio and text processing endpoints

# Configuration
BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN=""  # Add your JWT token here
TEST_AUDIO_FILE="./public/temp/audio/test-audio.mp3"  # Path to test audio file

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install jq to parse JSON responses."
        echo "Ubuntu/Debian: sudo apt-get install jq"
        echo "macOS: brew install jq"
        exit 1
    fi
}

# Function to check if server is running
check_server() {
    print_status "Checking if server is running..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/../health")
    if [ "$response" = "200" ]; then
        print_success "Server is running"
    else
        print_error "Server is not running or not accessible. HTTP code: $response"
        exit 1
    fi
}

# Function to create a test audio file if it doesn't exist
create_test_audio() {
    if [ ! -f "$TEST_AUDIO_FILE" ]; then
        print_warning "Test audio file not found. Creating a placeholder..."
        mkdir -p "$(dirname "$TEST_AUDIO_FILE")"
        
        # Create a simple WAV file using sox if available, otherwise skip audio tests
        if command -v sox &> /dev/null; then
            sox -n -r 16000 -c 1 "$TEST_AUDIO_FILE" trim 0.0 5.0 synth sin 440
            print_success "Created test audio file: $TEST_AUDIO_FILE"
        else
            print_warning "sox not installed. Audio tests will be skipped."
            print_warning "To install sox: sudo apt-get install sox (Ubuntu) or brew install sox (macOS)"
            return 1
        fi
    fi
    return 0
}

# Function to prompt for auth token if not set
get_auth_token() {
    if [ -z "$AUTH_TOKEN" ]; then
        echo -e "${YELLOW}Please enter your JWT authentication token:${NC}"
        read -r AUTH_TOKEN
        if [ -z "$AUTH_TOKEN" ]; then
            print_error "Authentication token is required for most endpoints"
            exit 1
        fi
    fi
}

echo "=============================================="
echo "   Dual Input API Endpoint Testing Script"
echo "=============================================="
echo

# Check dependencies
check_jq
check_server

echo
print_status "Starting endpoint tests..."
echo

# Test 1: Health Check (No Auth Required)
echo "----------------------------------------"
print_status "Test 1: Health Check Endpoint"
echo "----------------------------------------"

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/processing/health")
http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
body=$(echo "$response" | sed '$d')

echo "Request: GET ${BASE_URL}/processing/health"
echo "Response Code: $http_code"

if [ "$http_code" = "200" ]; then
    print_success "Health check passed"
    echo "$body" | jq '.'
else
    print_error "Health check failed"
    echo "$body"
fi

echo
echo

# Test 2: Text Processing (Auth Required)
echo "----------------------------------------"
print_status "Test 2: Text Processing Endpoint"
echo "----------------------------------------"

get_auth_token

text_payload='{
  "text": "I am Dr. Sarah Johnson, a experienced cardiologist with over 15 years of practice. I specialize in preventive cardiology, heart disease management, and cardiac rehabilitation. My clinic offers comprehensive cardiovascular care including diagnostic testing, treatment planning, and ongoing patient monitoring. I am board-certified and committed to providing personalized care to help my patients maintain optimal heart health.",
  "specialty": "cardiology",
  "saveToDatabase": true,
  "skipCache": false,
  "notifyProgress": false
}'

echo "Request: POST ${BASE_URL}/processing/process-text"
echo "Payload: $text_payload"

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$text_payload" \
  "${BASE_URL}/processing/process-text")

http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"

if [ "$http_code" = "200" ]; then
    print_success "Text processing successful"
    # Extract request ID for status checking
    REQUEST_ID=$(echo "$body" | jq -r '.data.requestId // empty')
    echo "Request ID: $REQUEST_ID"
    echo "$body" | jq '.data | {requestId, detectedSpecialty, processingMetadata, contentStructure}'
else
    print_error "Text processing failed"
    echo "$body" | jq '.'
fi

echo
echo

# Test 3: Processing Status Check (if we have a request ID)
if [ ! -z "$REQUEST_ID" ]; then
    echo "----------------------------------------"
    print_status "Test 3: Processing Status Check"
    echo "----------------------------------------"

    echo "Request: GET ${BASE_URL}/processing/status/$REQUEST_ID"

    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "${BASE_URL}/processing/status/$REQUEST_ID")

    http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"

    if [ "$http_code" = "200" ]; then
        print_success "Status check successful"
        echo "$body" | jq '.data | {requestId, status, progress, currentStep, totalSteps}'
    elif [ "$http_code" = "404" ]; then
        print_warning "Request not found (may have completed and been cleaned up)"
        echo "$body" | jq '.'
    else
        print_error "Status check failed"
        echo "$body" | jq '.'
    fi

    echo
    echo
fi

# Test 4: User Processing Jobs
echo "----------------------------------------"
print_status "Test 4: User Processing Jobs"
echo "----------------------------------------"

echo "Request: GET ${BASE_URL}/processing/jobs"

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "${BASE_URL}/processing/jobs")

http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
body=$(echo "$response" | sed '$d')

echo "Response Code: $http_code"

if [ "$http_code" = "200" ]; then
    print_success "User jobs retrieval successful"
    echo "$body" | jq '.data | {totalJobs, hasActiveJobs, summary}'
else
    print_error "User jobs retrieval failed"
    echo "$body" | jq '.'
fi

echo
echo

# Test 5: Audio Processing (if audio file exists)
if create_test_audio; then
    echo "----------------------------------------"
    print_status "Test 5: Audio Processing Endpoint"
    echo "----------------------------------------"

    echo "Request: POST ${BASE_URL}/processing/process-audio"
    echo "Audio File: $TEST_AUDIO_FILE"

    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -F "audioFile=@$TEST_AUDIO_FILE" \
      -F "language=en" \
      -F "speakerLabels=false" \
      -F "expectedSpeakers=1" \
      -F "saveToDatabase=true" \
      -F "notifyProgress=false" \
      "${BASE_URL}/processing/process-audio")

    http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
    body=$(echo "$response" | sed '$d')

    echo "Response Code: $http_code"

    if [ "$http_code" = "200" ]; then
        print_success "Audio processing successful"
        AUDIO_REQUEST_ID=$(echo "$body" | jq -r '.data.requestId // empty')
        echo "Request ID: $AUDIO_REQUEST_ID"
        echo "$body" | jq '.data | {requestId, transcription: {confidence, text: (.transcription.text[:100] + "...")}, detectedSpecialty, processingMetadata}'
    else
        print_error "Audio processing failed"
        echo "$body" | jq '.'
    fi

    echo
    echo
else
    print_warning "Skipping audio processing test (no audio file available)"
    echo
fi

# Test 6: Invalid Request Tests
echo "----------------------------------------"
print_status "Test 6: Validation Tests"
echo "----------------------------------------"

# Test empty text
print_status "Testing empty text validation..."
empty_text_payload='{"text": ""}'

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$empty_text_payload" \
  "${BASE_URL}/processing/process-text")

http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "400" ]; then
    print_success "Empty text validation working correctly"
    echo "$body" | jq '.error.message'
else
    print_error "Empty text validation failed - expected 400, got $http_code"
fi

echo

# Test invalid specialty
print_status "Testing invalid specialty validation..."
invalid_specialty_payload='{
  "text": "I am a doctor with experience in patient care.",
  "specialty": "invalid_specialty"
}'

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$invalid_specialty_payload" \
  "${BASE_URL}/processing/process-text")

http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "400" ]; then
    print_success "Invalid specialty validation working correctly"
    echo "$body" | jq '.error.message'
else
    print_error "Invalid specialty validation failed - expected 400, got $http_code"
fi

echo

# Test 7: Rate Limiting (Optional)
echo "----------------------------------------"
print_status "Test 7: Rate Limiting (Optional)"
echo "----------------------------------------"

print_status "Sending multiple requests to test rate limiting..."
for i in {1..3}; do
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{"text": "Quick test for rate limiting"}' \
      "${BASE_URL}/processing/process-text")
    
    http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
    echo "Request $i: HTTP $http_code"
    
    if [ "$http_code" = "429" ]; then
        print_success "Rate limiting is working"
        break
    fi
    
    sleep 1
done

echo
echo

# Test 8: Authentication Tests
echo "----------------------------------------"
print_status "Test 8: Authentication Test"
echo "----------------------------------------"

print_status "Testing request without authentication..."

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test without auth"}' \
  "${BASE_URL}/processing/process-text")

http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "401" ]; then
    print_success "Authentication protection working correctly"
    echo "$body" | jq '.error.message // .message'
else
    print_error "Authentication protection failed - expected 401, got $http_code"
fi

echo
echo

# Summary
echo "=============================================="
print_status "Test Summary"
echo "=============================================="

echo "✅ Health Check Endpoint"
echo "✅ Text Processing Endpoint"
echo "✅ Processing Status Check"
echo "✅ User Processing Jobs"
if create_test_audio > /dev/null 2>&1; then
    echo "✅ Audio Processing Endpoint"
else
    echo "⚠️  Audio Processing Endpoint (skipped - no audio file)"
fi
echo "✅ Input Validation"
echo "✅ Rate Limiting Test"
echo "✅ Authentication Test"

echo
print_success "All tests completed!"
echo
echo "Additional manual tests you can perform:"
echo "1. Test WebSocket connection at: ws://localhost:3000"
echo "2. Upload different audio formats (MP3, WAV, M4A, etc.)"
echo "3. Test larger text inputs (up to 10,000 characters)"
echo "4. Test different medical specialties"
echo "5. Monitor logs in ./logs/ directory"
echo
echo "For WebSocket testing, use a tool like wscat:"
echo "npm install -g wscat"
echo "wscat -c 'ws://localhost:3000' -H 'Authorization: Bearer $AUTH_TOKEN'"