# Audio Transcription API Documentation

## Overview
This API provides audio transcription capabilities using AssemblyAI, seamlessly integrated with the Doctor's Website Builder. It supports various audio formats and offers real-time transcription with speaker identification, confidence scoring, and direct website generation from audio.

## Base URL
```
/api/v1/ai
```

## Authentication
All protected endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting
- **Audio Upload**: 10 requests per hour per user
- **Transcription Status**: 100 requests per 15 minutes per user
- **AI Generation**: 20 requests per hour per user

## Endpoints

### 1. Upload and Transcribe Audio
**POST** `/transcribe-audio`

Upload an audio file and get transcription with optional speaker identification.

#### Request
- **Content-Type**: `multipart/form-data`
- **Authentication**: Required

#### Form Data
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| audioFile | File | Yes | Audio file (MP3, WAV, M4A, FLAC, OGG, WebM) |
| language | String | No | Language code (default: 'en') |
| speakerLabels | Boolean | No | Enable speaker identification (default: false) |
| expectedSpeakers | Number | No | Expected number of speakers (1-10, default: 2) |
| autoHighlights | Boolean | No | Enable auto-highlights (default: false) |

#### Response
```json
{
  "success": true,
  "data": {
    "jobId": "5f4d8c7e-1234-5678-9abc-def123456789",
    "status": "completed",
    "text": "Hello, I am Dr. Smith and I specialize in cardiology...",
    "confidence": 0.95,
    "processingTime": 12500,
    "qualityMetrics": {
      "word_count": 156,
      "avg_confidence": 0.95,
      "has_speaker_labels": true,
      "audio_duration_seconds": 45.2
    }
  },
  "message": "Audio transcription completed successfully"
}
```

#### Error Responses
- **400**: Invalid file format or size
- **401**: Unauthorized
- **413**: File too large (>25MB)
- **429**: Rate limit exceeded
- **500**: Transcription service error

### 2. Get Transcription Status
**GET** `/transcription/:jobId`

Retrieve the status and result of a transcription job.

#### Request
- **Authentication**: Required

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | String | Transcription job ID |

#### Response
```json
{
  "success": true,
  "data": {
    "id": "5f4d8c7e-1234-5678-9abc-def123456789",
    "status": "completed",
    "text": "Hello, I am Dr. Smith and I specialize in cardiology...",
    "confidence": 0.95,
    "audio_duration": 45.2,
    "speakers": [
      {
        "speaker": "A",
        "word_count": 156,
        "total_duration": 45.2,
        "avg_confidence": 0.95
      }
    ],
    "speakerLabels": [
      {
        "speaker": "A",
        "text": "Hello, I am Dr. Smith",
        "confidence": 0.98,
        "start": 0.5,
        "end": 3.2
      }
    ],
    "words": [
      {
        "text": "Hello",
        "confidence": 0.99,
        "start": 0.5,
        "end": 1.0
      }
    ],
    "quality_metrics": {
      "word_count": 156,
      "avg_confidence": 0.95,
      "has_speaker_labels": true,
      "audio_duration_seconds": 45.2
    }
  },
  "message": "Transcription status retrieved successfully"
}
```

### 3. Generate Website from Audio
**POST** `/generate-from-audio`

Upload audio, transcribe it, and generate a complete website in one step.

#### Request
- **Content-Type**: `multipart/form-data`
- **Authentication**: Required

#### Form Data
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| audioFile | File | Yes | Audio file (MP3, WAV, M4A, FLAC, OGG, WebM) |
| language | String | No | Language code (default: 'en') |
| speakerLabels | Boolean | No | Enable speaker identification |
| expectedSpeakers | Number | No | Expected number of speakers (1-10) |
| autoHighlights | Boolean | No | Enable auto-highlights |
| saveToDatabase | Boolean | No | Save website to database (default: true) |

#### Response
```json
{
  "success": true,
  "data": {
    "transcription": {
      "id": "5f4d8c7e-1234-5678-9abc-def123456789",
      "text": "Hello, I am Dr. Smith and I specialize in cardiology...",
      "confidence": 0.95,
      "speakers": [...],
      "qualityMetrics": {...}
    },
    "detectedSpecialty": "cardiology",
    "generatedContent": {
      "websiteTitle": "Dr. Smith - Cardiology Specialist",
      "tagline": "Expert Heart Care You Can Trust",
      "heroSection": {
        "headline": "Leading Cardiology Care",
        "subheadline": "Comprehensive heart care with advanced treatments"
      },
      "aboutSection": {
        "title": "About Dr. Smith",
        "content": "Dr. Smith is a board-certified cardiologist..."
      },
      "services": [
        {
          "name": "Cardiac Consultation",
          "description": "Comprehensive heart health evaluation",
          "icon": "heart-icon"
        }
      ],
      "contactInfo": {
        "phone": "+1-555-HEART",
        "email": "info@drsmith.com",
        "address": "123 Medical Center Dr"
      },
      "seoMeta": {
        "title": "Dr. Smith - Cardiology Specialist",
        "description": "Expert cardiology care with Dr. Smith",
        "keywords": ["cardiology", "heart doctor", "cardiac care"]
      }
    },
    "generatedAt": "2024-01-15T10:30:00Z",
    "totalProcessingTime": 25000,
    "contentStructure": {
      "hasHeroSection": true,
      "hasAboutSection": true,
      "servicesCount": 5,
      "hasContactInfo": true,
      "hasSeoMeta": true
    },
    "websiteId": "64f8d7e9a12b3c4d5e6f7890",
    "savedToDatabase": true
  },
  "message": "Website generated from audio successfully"
}
```

### 4. Delete Transcription
**DELETE** `/transcription/:jobId`

Delete transcription data and cleanup associated resources.

#### Request
- **Authentication**: Required

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | String | Transcription job ID |

#### Response
```json
{
  "success": true,
  "data": {
    "jobId": "5f4d8c7e-1234-5678-9abc-def123456789",
    "deleted": true
  },
  "message": "Transcription data deleted successfully"
}
```

### 5. Get Supported Languages
**GET** `/languages`

Get list of supported languages for transcription.

#### Request
- **Authentication**: Not required

#### Response
```json
{
  "success": true,
  "data": [
    {
      "code": "en",
      "name": "English"
    },
    {
      "code": "es",
      "name": "Spanish"
    },
    {
      "code": "fr",
      "name": "French"
    }
  ],
  "message": "Supported languages retrieved successfully"
}
```

### 6. Get Transcription Statistics
**GET** `/transcription-stats`

Get user's transcription usage statistics.

#### Request
- **Authentication**: Required

#### Response
```json
{
  "success": true,
  "data": {
    "total_transcriptions": 25,
    "recent_transcriptions": [
      {
        "id": "5f4d8c7e-1234-5678-9abc-def123456789",
        "text": "Hello, I am Dr. Smith...",
        "confidence": 0.95,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "avg_confidence": 0.92,
    "total_audio_duration": 3600,
    "assembly_ai_usage": {
      "seconds_remaining": 10000,
      "seconds_used": 5000
    },
    "supported_languages": 16
  },
  "message": "Transcription statistics retrieved successfully"
}
```

## Audio File Requirements

### Supported Formats
- **MP3** (audio/mpeg)
- **WAV** (audio/wav)
- **M4A** (audio/mp4)
- **FLAC** (audio/flac)
- **OGG** (audio/ogg)
- **WebM** (audio/webm)

### File Size Limits
- **Maximum**: 25MB per file
- **Minimum**: 1KB

### Audio Quality Recommendations
- **Sample Rate**: 16kHz or higher
- **Bit Rate**: 64kbps or higher
- **Channels**: Mono or Stereo
- **Duration**: 1 second to 5 hours

## Error Handling

### Common Error Codes
- **400**: Bad Request - Invalid parameters or file
- **401**: Unauthorized - Missing or invalid authentication
- **403**: Forbidden - Access denied
- **404**: Not Found - Resource not found
- **413**: Payload Too Large - File exceeds size limit
- **415**: Unsupported Media Type - Invalid file format
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Server or service error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_AUDIO_FORMAT",
    "message": "Unsupported audio format: .txt. Supported formats: .mp3, .wav, .m4a, .flac, .ogg, .webm"
  }
}
```

## Integration Examples

### JavaScript/Node.js Example
```javascript
// Upload and transcribe audio
const formData = new FormData();
formData.append('audioFile', audioFile);
formData.append('language', 'en');
formData.append('speakerLabels', true);

const response = await fetch('/api/v1/ai/transcribe-audio', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Transcription:', result.data.text);
```

### Python Example
```python
import requests

# Generate website from audio
url = 'http://localhost:3000/api/v1/ai/generate-from-audio'
files = {'audioFile': open('doctor-intro.mp3', 'rb')}
data = {
    'language': 'en',
    'speakerLabels': True,
    'saveToDatabase': True
}
headers = {'Authorization': f'Bearer {token}'}

response = requests.post(url, files=files, data=data, headers=headers)
result = response.json()
print(f"Website generated: {result['data']['websiteId']}")
```

### cURL Example
```bash
# Transcribe audio file
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audioFile=@doctor-intro.mp3" \
  -F "language=en" \
  -F "speakerLabels=true" \
  http://localhost:3000/api/v1/ai/transcribe-audio

# Get transcription status
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/ai/transcription/5f4d8c7e-1234-5678-9abc-def123456789
```

## Best Practices

### 1. Audio Quality
- Use clear, high-quality audio recordings
- Minimize background noise
- Ensure speakers are audible and distinct
- Consider using external microphones for better quality

### 2. Performance Optimization
- Use appropriate file compression
- Monitor transcription job status instead of polling
- Cache frequently accessed transcriptions
- Clean up expired transcriptions regularly

### 3. Error Handling
- Implement retry logic for failed transcriptions
- Handle rate limiting gracefully
- Provide user feedback for long processing times
- Validate audio files before upload

### 4. Security
- Store API keys securely
- Use HTTPS in production
- Implement proper authentication
- Sanitize user inputs

### 5. Cost Optimization
- Monitor AssemblyAI usage
- Delete unnecessary transcriptions
- Use appropriate transcription features
- Implement usage quotas for users

## Troubleshooting

### Common Issues
1. **"Audio file too large"** - Reduce file size or use compression
2. **"Unsupported format"** - Convert to supported format
3. **"Transcription timeout"** - Audio may be too long or corrupted
4. **"Rate limit exceeded"** - Wait before making more requests
5. **"Poor transcription quality"** - Check audio quality and clarity

### Support
For technical support or questions about the Audio Transcription API, please contact the development team or check the project documentation.