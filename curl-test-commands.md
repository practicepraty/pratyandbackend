# Quick cURL Test Commands

## Setup
```bash
# Set your JWT token
export AUTH_TOKEN="your_jwt_token_here"
export BASE_URL="http://localhost:3000/api/v1"
```

## 1. Health Check (No Auth Required)
```bash
curl -X GET \
  "$BASE_URL/processing/health" \
  -H "Content-Type: application/json" | jq '.'
```

## 2. Text Processing
```bash
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "text": "I am Dr. Sarah Johnson, a experienced cardiologist with over 15 years of practice. I specialize in preventive cardiology, heart disease management, and cardiac rehabilitation. My clinic offers comprehensive cardiovascular care including diagnostic testing, treatment planning, and ongoing patient monitoring.",
    "specialty": "cardiology",
    "saveToDatabase": true,
    "skipCache": false,
    "notifyProgress": false
  }' | jq '.'
```

## 3. Audio Processing
```bash
# Create a test audio file first (if you don't have one)
curl -X POST \
  "$BASE_URL/processing/process-audio" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "audioFile=@path/to/your/audio.mp3" \
  -F "language=en" \
  -F "speakerLabels=false" \
  -F "expectedSpeakers=1" \
  -F "saveToDatabase=true" \
  -F "skipCache=false" \
  -F "notifyProgress=false" | jq '.'
```

## 4. Check Processing Status
```bash
# Replace REQUEST_ID with actual ID from previous responses
curl -X GET \
  "$BASE_URL/processing/status/REQUEST_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

## 5. Get User Processing Jobs
```bash
curl -X GET \
  "$BASE_URL/processing/jobs" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

## 6. Cancel Processing Job
```bash
# Replace REQUEST_ID with actual ID
curl -X POST \
  "$BASE_URL/processing/cancel/REQUEST_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

## 7. Service Statistics
```bash
curl -X GET \
  "$BASE_URL/processing/health" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'
```

## Validation Tests

### Test Empty Text (Should Return 400)
```bash
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"text": ""}' | jq '.'
```

### Test Invalid Specialty (Should Return 400)
```bash
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "text": "I am a doctor with experience in patient care.",
    "specialty": "invalid_specialty"
  }' | jq '.'
```

### Test No Authentication (Should Return 401)
```bash
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test without auth"}' | jq '.'
```

### Test Large Text (Should Work)
```bash
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "text": "I am Dr. Michael Thompson, a board-certified physician with extensive experience in internal medicine and family practice. Over the past 20 years, I have dedicated my career to providing comprehensive healthcare services to patients of all ages. My practice focuses on preventive medicine, chronic disease management, and acute care. I believe in building strong doctor-patient relationships based on trust, communication, and personalized care. My clinic is equipped with modern diagnostic equipment and I work closely with specialists when needed to ensure my patients receive the best possible care. I am committed to staying current with medical advances and regularly participate in continuing education programs. My goal is to help my patients achieve and maintain optimal health through evidence-based medicine and compassionate care.",
    "specialty": "general-practice",
    "saveToDatabase": true
  }' | jq '.'
```

## Audio File Formats Testing

### Test MP3 File
```bash
curl -X POST \
  "$BASE_URL/processing/process-audio" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "audioFile=@test.mp3" \
  -F "language=en" | jq '.'
```

### Test WAV File
```bash
curl -X POST \
  "$BASE_URL/processing/process-audio" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "audioFile=@test.wav" \
  -F "language=en" | jq '.'
```

### Test with Speaker Labels
```bash
curl -X POST \
  "$BASE_URL/processing/process-audio" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "audioFile=@test.mp3" \
  -F "language=en" \
  -F "speakerLabels=true" \
  -F "expectedSpeakers=2" \
  -F "autoHighlights=true" | jq '.'
```

## Error Testing

### Test File Too Large (Create a large file first)
```bash
# This should return 400 if file > 25MB
curl -X POST \
  "$BASE_URL/processing/process-audio" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "audioFile=@large_file.mp3" | jq '.'
```

### Test Invalid File Format
```bash
# Try uploading a text file as audio
curl -X POST \
  "$BASE_URL/processing/process-audio" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "audioFile=@test.txt" | jq '.'
```

## Cache Testing

### Test Cache Hit (Run same request twice)
```bash
# First request
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "text": "Cache test - I am Dr. John Doe specializing in family medicine.",
    "specialty": "general-practice",
    "skipCache": false
  }' | jq '.data.processingMetadata.cached'

# Second request (should be faster and cached=true)
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "text": "Cache test - I am Dr. John Doe specializing in family medicine.",
    "specialty": "general-practice",
    "skipCache": false
  }' | jq '.data.processingMetadata.cached'
```

### Test Cache Skip
```bash
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "text": "Cache skip test - I am Dr. Jane Doe specializing in pediatrics.",
    "specialty": "pediatrics",
    "skipCache": true
  }' | jq '.data.processingMetadata.cached'
```

## Rate Limiting Test
```bash
# Send multiple requests quickly
for i in {1..10}; do
  echo "Request $i:"
  curl -X POST \
    "$BASE_URL/processing/process-text" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{"text": "Rate limit test request '$i'"}' \
    -w "HTTP %{http_code}\n" -o /dev/null -s
  sleep 0.1
done
```

## WebSocket Testing (using wscat)
```bash
# Install wscat first: npm install -g wscat
wscat -c "ws://localhost:3000" -H "Authorization: Bearer $AUTH_TOKEN"

# Then send these messages:
# {"type": "subscribe-progress", "requestId": "your-request-id"}
# {"type": "unsubscribe-progress", "requestId": "your-request-id"}
```

## Performance Testing
```bash
# Measure response time
curl -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "text": "Performance test - I am Dr. Smith with 10 years experience in cardiology.",
    "specialty": "cardiology"
  }' \
  -w "\nResponse Time: %{time_total}s\nHTTP Code: %{http_code}\n" | jq '.'
```

## Complete Integration Test
```bash
#!/bin/bash
# Save this as integration-test.sh

# 1. Text processing
echo "Testing text processing..."
RESPONSE=$(curl -s -X POST \
  "$BASE_URL/processing/process-text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "text": "Integration test - Dr. Alice Johnson, cardiology specialist with 12 years experience.",
    "specialty": "cardiology",
    "notifyProgress": true
  }')

REQUEST_ID=$(echo $RESPONSE | jq -r '.data.requestId')
echo "Request ID: $REQUEST_ID"

# 2. Check status
echo "Checking status..."
sleep 2
curl -X GET \
  "$BASE_URL/processing/status/$REQUEST_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data.status'

# 3. Get user jobs
echo "Getting user jobs..."
curl -X GET \
  "$BASE_URL/processing/jobs" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data.totalJobs'

echo "Integration test complete!"
```