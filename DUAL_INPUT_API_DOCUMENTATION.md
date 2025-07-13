# Dual Input API Documentation
## Medical Website Builder - Audio & Text Processing API

### Overview
This API supports both audio and text input for generating medical websites. It provides real-time progress updates via WebSockets and comprehensive caching for optimal performance.

---

## Base URLs
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://your-domain.com/api/v1`

---

## Authentication
All endpoints require JWT authentication except where noted.

```http
Authorization: Bearer <your-jwt-token>
```

---

## WebSocket Connection
For real-time progress updates, connect to the WebSocket endpoint:

```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Subscribe to progress updates
socket.emit('subscribe-progress', { requestId: 'your-request-id' });

// Listen for progress updates
socket.on('progress-update', (data) => {
  console.log('Progress:', data.progress + '%');
});
```

---

## Endpoints

### 1. Text Processing

#### POST `/processing/process-text`
Generate a medical website from text input.

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "text": "I am Dr. John Smith, a cardiologist with 15 years of experience...",
  "specialty": "cardiology",
  "saveToDatabase": true,
  "skipCache": false,
  "notifyProgress": true
}
```

**Request Body Parameters:**
- `text` (string, required): Description of medical practice (10-10,000 characters)
- `specialty` (string, optional): Medical specialty. Options: `general-practice`, `cardiology`, `dermatology`, `dentistry`, `pediatrics`
- `saveToDatabase` (boolean, optional): Save generated website to database. Default: `true`
- `skipCache` (boolean, optional): Skip cache lookup. Default: `false`
- `notifyProgress` (boolean, optional): Send WebSocket progress updates. Default: `true`

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "inputType": "text",
    "originalText": "I am Dr. John Smith...",
    "detectedSpecialty": "cardiology",
    "generatedContent": {
      "websiteTitle": "Dr. John Smith - Cardiology",
      "tagline": "Expert Heart Care",
      "heroSection": {
        "headline": "...",
        "subheadline": "...",
        "ctaButton": "..."
      },
      "aboutSection": {
        "heading": "...",
        "content": "...",
        "credentials": [...]
      },
      "services": [
        {
          "name": "Cardiac Consultation",
          "description": "...",
          "features": [...]
        }
      ],
      "contactInfo": {
        "phone": "",
        "email": "",
        "address": ""
      },
      "seoMeta": {
        "title": "...",
        "description": "...",
        "keywords": [...]
      }
    },
    "processingMetadata": {
      "processingTime": 5230,
      "aiModel": "claude-3-sonnet",
      "cached": false
    },
    "contentStructure": {
      "hasHeroSection": true,
      "hasAboutSection": true,
      "servicesCount": 5,
      "hasContactInfo": true,
      "hasSeoMeta": true
    },
    "websiteId": "64f7e8a9b1234567890abcde",
    "savedToDatabase": true,
    "requestInfo": {
      "inputType": "text",
      "processingMethod": "generated",
      "userId": "64f7e8a9b1234567890abcdf",
      "requestTimestamp": "2024-01-15T10:30:00.000Z"
    },
    "nextSteps": {
      "available_actions": [
        "edit_content",
        "regenerate_section",
        "publish_website",
        "save_as_template"
      ],
      "endpoints": {
        "edit": "/api/v1/websites/64f7e8a9b1234567890abcde",
        "regenerate": "/api/v1/ai/websites/64f7e8a9b1234567890abcde/regenerate",
        "publish": "/api/v1/websites/64f7e8a9b1234567890abcde/publish"
      }
    }
  },
  "message": "Website content generated from text successfully"
}
```

---

### 2. Audio Processing

#### POST `/processing/process-audio`
Generate a medical website from audio input.

**Request Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body (Form Data):**
- `audioFile` (file, required): Audio file (MP3, WAV, M4A, FLAC, OGG, WebM, max 25MB)
- `language` (string, optional): Language code. Default: `en`
- `speakerLabels` (boolean, optional): Enable speaker identification. Default: `false`
- `expectedSpeakers` (number, optional): Number of expected speakers (1-10). Default: `2`
- `autoHighlights` (boolean, optional): Enable auto highlights. Default: `false`
- `saveToDatabase` (boolean, optional): Save to database. Default: `true`
- `skipCache` (boolean, optional): Skip cache lookup. Default: `false`
- `notifyProgress` (boolean, optional): Send progress updates. Default: `true`

**Example cURL:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "audioFile=@doctor_recording.mp3" \
  -F "language=en" \
  -F "speakerLabels=true" \
  -F "expectedSpeakers=1" \
  -F "saveToDatabase=true" \
  http://localhost:3000/api/v1/processing/process-audio
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "requestId": "123e4567-e89b-12d3-a456-426614174001",
    "inputType": "audio",
    "transcription": {
      "id": "assemblyai_transcript_id",
      "text": "I am Dr. John Smith, a cardiologist...",
      "confidence": 0.95,
      "speakers": [
        {
          "speaker": "A",
          "word_count": 245,
          "total_duration": 45.2,
          "avg_confidence": 0.94
        }
      ],
      "qualityMetrics": {
        "word_count": 245,
        "avg_confidence": 0.95,
        "has_speaker_labels": true,
        "audio_duration_seconds": 47.3
      },
      "processingTime": 12500
    },
    "detectedSpecialty": "cardiology",
    "generatedContent": { /* Same structure as text processing */ },
    "processingMetadata": {
      "totalProcessingTime": 18750,
      "transcriptionTime": 12500,
      "aiGenerationTime": 6250,
      "aiModel": "claude-3-sonnet",
      "cached": false,
      "audioMetadata": {
        "duration": 47.3,
        "format": "mp3",
        "fileSize": 1048576
      }
    },
    "qualityMetrics": {
      "transcriptionConfidence": 0.95,
      "audioQuality": { /* Quality metrics */ },
      "speakerIdentification": 1,
      "processingEfficiency": {
        "totalTime": 18750,
        "transcriptionTime": 12500,
        "aiGenerationTime": 6250
      }
    },
    "websiteId": "64f7e8a9b1234567890abcde",
    "savedToDatabase": true
  },
  "message": "Website generated from audio transcription successfully"
}
```

---

### 3. Processing Status

#### GET `/processing/status/{requestId}`
Get the current status of a processing request.

**Parameters:**
- `requestId` (string, required): UUID of the processing request

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "currentStep": 3,
    "totalSteps": 4,
    "progress": 75,
    "status": "processing",
    "steps": [
      {
        "step": 1,
        "name": "text_validation",
        "status": "completed",
        "message": "Text validated successfully",
        "timestamp": "2024-01-15T10:30:01.000Z",
        "duration": 500
      },
      {
        "step": 2,
        "name": "specialty_detection",
        "status": "completed",
        "message": "Medical specialty detected",
        "timestamp": "2024-01-15T10:30:03.000Z",
        "duration": 2000
      },
      {
        "step": 3,
        "name": "content_generation",
        "status": "processing",
        "message": "Generating website content...",
        "timestamp": "2024-01-15T10:30:05.000Z",
        "duration": null
      }
    ],
    "startTime": "2024-01-15T10:30:00.000Z",
    "lastUpdate": "2024-01-15T10:30:05.000Z",
    "estimatedTimeRemaining": 15,
    "metadata": {
      "inputType": "text",
      "specialty": "cardiology"
    },
    "elapsedTime": 5000
  },
  "message": "Processing status retrieved successfully"
}
```

---

### 4. User Processing Jobs

#### GET `/processing/jobs`
Get all active processing jobs for the authenticated user.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "activeJobs": [
      {
        "requestId": "123e4567-e89b-12d3-a456-426614174000",
        "currentStep": 3,
        "totalSteps": 4,
        "progress": 75,
        "status": "processing",
        "startTime": "2024-01-15T10:30:00.000Z",
        "lastUpdate": "2024-01-15T10:30:05.000Z",
        "estimatedTimeRemaining": 15,
        "elapsedTime": 5000,
        "inputType": "text"
      }
    ],
    "totalJobs": 1,
    "hasActiveJobs": true,
    "summary": {
      "processing": 1,
      "completed": 0,
      "error": 0,
      "cancelled": 0
    }
  },
  "message": "User processing jobs retrieved successfully"
}
```

---

### 5. Cancel Processing

#### POST `/processing/cancel/{requestId}`
Cancel an active processing job.

**Parameters:**
- `requestId` (string, required): UUID of the processing request

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "cancelled",
    "message": "Processing job cancelled successfully"
  },
  "message": "Processing job cancelled successfully"
}
```

---

### 6. Service Health

#### GET `/processing/health`
Get service health and statistics (no authentication required).

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "services": {
      "audioProcessing": {
        "available": true,
        "status": "operational"
      },
      "textProcessing": {
        "available": true,
        "status": "operational"
      },
      "caching": {
        "available": true,
        "redis": true,
        "memory": true,
        "status": "operational"
      },
      "websockets": {
        "available": true,
        "connectedClients": 5,
        "status": "operational"
      }
    },
    "processing": {
      "currentJobs": 2,
      "maxConcurrent": 5,
      "queueSize": 0,
      "utilization": 40
    },
    "cache": {
      "memory": {
        "keys": 150,
        "hits": 1250,
        "misses": 75,
        "hitRate": "94.3%"
      },
      "redis": {
        "connected": true,
        "memory": "2.5MB"
      }
    },
    "health": {
      "overall": "healthy",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "uptime": 86400
    }
  },
  "message": "Service statistics retrieved successfully"
}
```

---

## WebSocket Events

### Client to Server Events

#### `subscribe-progress`
Subscribe to progress updates for a specific request.
```javascript
socket.emit('subscribe-progress', { requestId: 'your-request-id' });
```

#### `unsubscribe-progress`
Unsubscribe from progress updates.
```javascript
socket.emit('unsubscribe-progress', { requestId: 'your-request-id' });
```

### Server to Client Events

#### `connected`
Sent when client successfully connects.
```javascript
{
  "message": "Connected to progress tracking service",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `progress-update`
Real-time progress updates.
```javascript
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "step": 3,
  "totalSteps": 4,
  "progress": 75,
  "status": "processing",
  "message": "Generating website content...",
  "stepName": "content_generation",
  "timestamp": "2024-01-15T10:30:05.000Z",
  "metadata": {
    "specialty": "cardiology"
  },
  "estimatedTimeRemaining": 15
}
```

#### `progress-complete`
Sent when processing is completed.
```javascript
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "progress": 100,
  "message": "Processing completed successfully",
  "timestamp": "2024-01-15T10:30:15.000Z",
  "totalDuration": 15000,
  "result": { /* Complete result object */ }
}
```

#### `progress-error`
Sent when an error occurs during processing.
```javascript
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "error",
  "progress": 50,
  "message": "Audio transcription failed",
  "error": {
    "code": "TRANSCRIPTION_ERROR",
    "message": "Audio transcription service is temporarily unavailable"
  },
  "timestamp": "2024-01-15T10:30:10.000Z"
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "id": "ERR_1705306200000_abc123def",
    "code": "VALIDATION_ERROR",
    "message": "Text content is required",
    "statusCode": 400,
    "category": "client_error",
    "retryable": false,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "suggestions": [
      "Check that all required fields are provided",
      "Verify that field values are in the correct format"
    ]
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Input validation failed
- `FILE_TOO_LARGE` (400): File exceeds size limit
- `INVALID_AUDIO_FORMAT` (400): Unsupported audio format
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `TRANSCRIPTION_SERVICE_UNAVAILABLE` (503): Audio service down
- `AI_SERVICE_ERROR` (500): AI generation failed
- `INTERNAL_ERROR` (500): Server error

---

## Rate Limits

- **Text Processing**: 10 requests per minute per user
- **Audio Processing**: 5 requests per minute per user
- **Status Checks**: 100 requests per minute per user
- **General API**: 100 requests per minute per IP

---

## Supported Audio Formats

- **MP3**: .mp3
- **WAV**: .wav
- **M4A**: .m4a
- **FLAC**: .flac
- **OGG**: .ogg
- **WebM**: .webm

**Maximum file size**: 25MB  
**Supported languages**: 16 languages including English, Spanish, French, German, etc.

---

## Caching

The API uses intelligent caching to improve performance:

- **Text Processing**: 2 hours cache
- **Audio Transcriptions**: 24 hours cache
- **AI Generations**: 1 hour cache

Use `skipCache: true` to bypass cache when needed.

---

## Best Practices

1. **Use WebSocket connections** for real-time progress updates
2. **Check processing status** periodically if WebSocket is unavailable
3. **Handle rate limits** gracefully with exponential backoff
4. **Validate inputs** client-side before sending requests
5. **Use appropriate audio formats** for best transcription quality
6. **Keep audio files under 25MB** and under 2 hours duration
7. **Provide clear, descriptive text** for better AI generation quality

---

## Support

For API support, contact: [support@your-domain.com](mailto:support@your-domain.com)

Documentation last updated: January 15, 2024