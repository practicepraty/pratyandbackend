#!/bin/bash

# Test script to verify the audio upload fix
API_BASE="http://localhost:8004/api/v1"

echo "Testing audio upload fix..."

# Create a small test audio file
echo "Creating test audio file..."
ffmpeg -f lavfi -i "sine=frequency=1000:duration=5" -acodec mp3 test_audio.mp3 2>/dev/null || echo "Warning: Could not create audio file with ffmpeg"

# If ffmpeg failed, create a simple MP3 header for testing
if [ ! -f "test_audio.mp3" ]; then
    echo "Creating mock MP3 file for testing..."
    # Create a minimal MP3 file with proper headers
    echo -e "\xFF\xFB\x90\x00" > test_audio.mp3
    head -c 1024 /dev/urandom >> test_audio.mp3
fi

echo "Test audio file created: $(ls -la test_audio.mp3)"

# First, get a valid auth token (using existing test infrastructure)
echo "Getting auth token..."

# Register a test user
REGISTER_RESPONSE=$(curl -s -X POST \
  "$API_BASE/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "audiotest",
    "email": "audiotest@example.com",
    "password": "TestPass123!",
    "fullName": "Audio Test User",
    "specialty": "general-practice"
  }')

echo "Register response: $REGISTER_RESPONSE"

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "audiotest@example.com",
    "password": "TestPass123!"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo "Failed to get access token. Login response:"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo "Got access token: ${ACCESS_TOKEN:0:20}..."

# Test the audio upload
echo "Testing audio upload..."

AUDIO_RESPONSE=$(curl -s -w "%{http_code}" \
  -X POST \
  "$API_BASE/processing/process-audio" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "audioFile=@test_audio.mp3" \
  -F "language=en" \
  -F "saveToDatabase=false")

HTTP_CODE=${AUDIO_RESPONSE: -3}
BODY=${AUDIO_RESPONSE%???}

echo "HTTP Code: $HTTP_CODE"
echo "Response Body: $BODY"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    echo "✅ Audio upload test PASSED - No more 'Too many files' error"
else
    echo "❌ Audio upload test FAILED"
    if echo "$BODY" | grep -q "Too many files"; then
        echo "ERROR: Still getting 'Too many files' error"
    else
        echo "Different error encountered"
    fi
fi

# Cleanup
rm -f test_audio.mp3

echo "Test completed."