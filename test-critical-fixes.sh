#!/bin/bash

# Critical Backend Fixes Verification Test
# Tests that import conflicts and multer errors are resolved

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

print_step "CRITICAL BACKEND FIXES VERIFICATION"

# Test 1: Server Startup (Tests import fix)
print_step "1. Testing Server Startup (Import Conflict Resolution)"

# Start server and capture startup errors
timeout 15s node src/index.js > startup_errors.log 2>&1 &
SERVER_PID=$!
sleep 5

# Check if server is running
if curl -s "$BASE_URL/health" > /dev/null; then
    print_success "Server startup successful - no import conflicts detected"
else
    print_error "Server startup failed - check import conflicts"
    cat startup_errors.log | head -10
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Check for import-related errors in logs
IMPORT_ERRORS=$(grep -E "(Cannot resolve|Module not found|TypeError.*import|ReferenceError.*not defined)" startup_errors.log 2>/dev/null | wc -l)
if [ "$IMPORT_ERRORS" -eq 0 ]; then
    print_success "No import/module resolution errors found"
else
    print_error "$IMPORT_ERRORS import errors detected:"
    grep -E "(Cannot resolve|Module not found|TypeError.*import|ReferenceError.*not defined)" startup_errors.log | head -3
fi

# Test 2: Authentication
print_step "2. Testing Authentication System"
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
    print_success "Authentication system working"
    ACCESS_TOKEN=$(echo "$login_body" | jq -r '.data.accessToken' 2>/dev/null)
else
    print_error "Authentication failed ($login_http_code)"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Test 3: Audio Upload (Tests multer fix)
print_step "3. Testing Audio Upload (Multer Fix Verification)"

AUDIO_FILE="./public/temp/audio/6293799922567223745.mp3"
if [ ! -f "$AUDIO_FILE" ]; then
    print_error "Audio file not found: $AUDIO_FILE"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Test audio processing with multiple form fields (this would trigger "Too many files" error if not fixed)
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

print_step "4. Analyzing Audio Upload Response"
echo "HTTP Code: $audio_http_code"

# Check for specific multer errors
MULTER_ERRORS=$(echo "$audio_body" | grep -E "Too many files|TOO_MANY_FILES|LIMIT_FILE_COUNT" | wc -l 2>/dev/null || echo "0")

if [ "$MULTER_ERRORS" -gt 0 ]; then
    print_error "MULTER ERRORS STILL PRESENT:"
    echo "$audio_body" | grep -E "Too many files|TOO_MANY_FILES|LIMIT_FILE_COUNT" | head -3
    kill $SERVER_PID 2>/dev/null
    exit 1
else
    print_success "No multer file count errors detected"
fi

if [ "$audio_http_code" -eq 200 ]; then
    print_success "Audio upload and processing successful"
    
    # Verify transcription worked
    if echo "$audio_body" | grep -q '"transcription"'; then
        TRANSCRIPTION=$(echo "$audio_body" | jq -r '.data.transcription.text' 2>/dev/null)
        print_success "Transcription: $TRANSCRIPTION"
    fi
    
    # Verify website generation worked
    if echo "$audio_body" | grep -q '"generatedContent"'; then
        WEBSITE_TITLE=$(echo "$audio_body" | jq -r '.data.generatedContent.websiteTitle' 2>/dev/null)
        print_success "Generated website: $WEBSITE_TITLE"
    fi
    
else
    print_error "Audio upload failed with HTTP $audio_http_code"
    echo "$audio_body" | jq '.' 2>/dev/null || echo "$audio_body" | head -5
fi

# Test 4: Rate Limiting (Tests that imports work correctly)
print_step "5. Testing Rate Limiting Functionality"

# Test AI rate limiter endpoint
ai_response=$(curl -s -X POST \
             -H "Authorization: Bearer $ACCESS_TOKEN" \
             -H "Content-Type: application/json" \
             -d '{"text": "test"}' \
             -w "%{http_code}" \
             "$API_BASE/ai/generate-content")

ai_http_code=${ai_response: -3}

if [ "$ai_http_code" -eq 200 ] || [ "$ai_http_code" -eq 400 ]; then
    print_success "Rate limiting system accessible (HTTP $ai_http_code)"
else
    print_warning "Rate limiting test inconclusive (HTTP $ai_http_code)"
fi

# Cleanup
kill $SERVER_PID 2>/dev/null
rm -f startup_errors.log

print_step "VERIFICATION COMPLETE!"

# Final summary
echo ""
echo "=== CRITICAL FIXES VERIFICATION SUMMARY ==="

if [ "$IMPORT_ERRORS" -eq 0 ]; then
    echo "✅ IMPORT CONFLICTS: Resolved successfully"
else
    echo "❌ IMPORT CONFLICTS: Still present ($IMPORT_ERRORS errors)"
fi

if [ "$MULTER_ERRORS" -eq 0 ] && [ "$audio_http_code" -eq 200 ]; then
    echo "✅ MULTER FILE UPLOAD: Fixed and working correctly"
else
    echo "❌ MULTER FILE UPLOAD: Issues still present"
fi

if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo "✅ SERVER STARTUP: Successful"
else
    echo "❌ SERVER STARTUP: Failed"
fi

if [ "$audio_http_code" -eq 200 ]; then
    echo "✅ AUDIO PROCESSING: End-to-end pipeline functional"
else
    echo "❌ AUDIO PROCESSING: Pipeline not working"
fi

echo ""
if [ "$IMPORT_ERRORS" -eq 0 ] && [ "$MULTER_ERRORS" -eq 0 ] && [ "$audio_http_code" -eq 200 ]; then
    echo "🎉 ALL CRITICAL FIXES VERIFIED SUCCESSFULLY!"
    exit 0
else
    echo "⚠️  Some critical issues remain - check output above"
    exit 1
fi