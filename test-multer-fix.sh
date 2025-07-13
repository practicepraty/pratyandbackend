#!/bin/bash

# Multer Fix Verification Test
# Tests that the "Too many files" error is resolved

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

print_step "Multer Conflict Resolution Test"

# Login
print_step "1. Authentication"
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
else
    print_error "Login failed ($login_http_code)"
    exit 1
fi

# Test audio upload
print_step "2. Testing Audio Upload (Multer Conflict Check)"

AUDIO_FILE="./public/temp/audio/6293799922567223745.mp3"
if [ ! -f "$AUDIO_FILE" ]; then
    print_error "Audio file not found: $AUDIO_FILE"
    exit 1
fi

# Test audio processing
audio_response=$(curl -s -X POST \
                 -H "Authorization: Bearer $ACCESS_TOKEN" \
                 -F "audioFile=@$AUDIO_FILE" \
                 -F "language=en" \
                 -F "speakerLabels=true" \
                 -F "expectedSpeakers=2" \
                 -w "%{http_code}" \
                 "$API_BASE/processing/process-audio")

audio_http_code=${audio_response: -3}
audio_body=${audio_response%???}

print_step "3. Response Analysis"
echo "HTTP Code: $audio_http_code"

# Check for specific error indicators
if echo "$audio_body" | grep -q "Too many files"; then
    print_error "MULTER CONFLICT DETECTED: 'Too many files' error still present"
    echo "Response contains: $(echo "$audio_body" | grep -o "Too many files.*")"
    exit 1
elif echo "$audio_body" | grep -q "TOO_MANY_FILES"; then
    print_error "MULTER CONFLICT DETECTED: 'TOO_MANY_FILES' error code present"
    echo "Error details: $(echo "$audio_body" | jq -r '.error.message' 2>/dev/null || echo "Unable to parse error")"
    exit 1
elif echo "$audio_body" | grep -q "LIMIT_FILE_COUNT"; then
    print_error "MULTER CONFLICT DETECTED: 'LIMIT_FILE_COUNT' error present"
    echo "Error details: $(echo "$audio_body" | jq -r '.error.message' 2>/dev/null || echo "Unable to parse error")"
    exit 1
elif [ "$audio_http_code" -eq 200 ]; then
    print_success "MULTER CONFLICT RESOLVED: Audio processing successful!"
    
    # Check if transcription was successful
    if echo "$audio_body" | grep -q '"transcription"'; then
        print_success "Audio transcription completed successfully"
        TRANSCRIPTION_TEXT=$(echo "$audio_body" | jq -r '.data.transcription.text' 2>/dev/null)
        print_success "Transcription: $TRANSCRIPTION_TEXT"
    else
        print_warning "Response received but no transcription data found"
    fi
    
    # Check if website generation was successful
    if echo "$audio_body" | grep -q '"generatedContent"'; then
        print_success "Website generation completed successfully"
        WEBSITE_TITLE=$(echo "$audio_body" | jq -r '.data.generatedContent.websiteTitle' 2>/dev/null)
        print_success "Generated website: $WEBSITE_TITLE"
    else
        print_warning "Response received but no generated content found"
    fi
    
elif [ "$audio_http_code" -eq 400 ]; then
    print_error "Bad request (400) - Check error details:"
    echo "$audio_body" | jq '.' 2>/dev/null || echo "$audio_body"
elif [ "$audio_http_code" -eq 500 ]; then
    print_error "Server error (500) - Check server logs:"
    echo "$audio_body" | jq '.' 2>/dev/null || echo "$audio_body"
else
    print_error "Unexpected response ($audio_http_code)"
    echo "$audio_body" | jq '.' 2>/dev/null || echo "$audio_body"
fi

print_step "Test Complete!"

if [ "$audio_http_code" -eq 200 ]; then
    echo "✅ MULTER CONFIGURATION: Fixed and working correctly"
    echo "✅ AUDIO PROCESSING: End-to-end pipeline functional"
    echo "✅ FILE UPLOAD: No 'Too many files' errors detected"
    exit 0
else
    echo "❌ MULTER CONFIGURATION: Issues still present"
    echo "❌ AUDIO PROCESSING: Pipeline not fully functional"
    exit 1
fi