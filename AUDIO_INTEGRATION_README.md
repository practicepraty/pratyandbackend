# AssemblyAI Audio Transcription Integration

## Overview
This integration adds comprehensive audio transcription capabilities to the Doctor's Website Builder using AssemblyAI. It enables users to upload audio files, get accurate transcriptions with speaker identification, and generate websites directly from audio content.

## Features

### ✅ Core Functionality
- **Audio Upload & Transcription**: Support for MP3, WAV, M4A, FLAC, OGG, WebM formats
- **Real-time Processing**: Automatic transcription with status polling
- **Speaker Identification**: Multi-speaker detection and labeling
- **Confidence Scoring**: Quality metrics for transcription accuracy
- **Direct Website Generation**: One-step audio-to-website conversion

### ✅ Advanced Features
- **Auto-highlights**: Automatic extraction of key topics
- **Content Safety**: Detection of inappropriate content
- **Multi-language Support**: 16+ supported languages
- **Retry Logic**: Automatic retry for failed requests
- **File Cleanup**: Automatic cleanup of uploaded files
- **Usage Tracking**: Comprehensive statistics and analytics

### ✅ Security & Performance
- **Rate Limiting**: Tiered rate limiting for different operations
- **File Validation**: Comprehensive file type and size validation
- **Error Handling**: Robust error handling with user-friendly messages
- **Memory Management**: Efficient transcription job caching
- **Database Integration**: Full database tracking and persistence

## Installation & Setup

### 1. Install Dependencies
```bash
# Navigate to your project directory
cd /path/to/your/project

# Install required packages (axios should already be installed)
npm install axios
```

### 2. Environment Configuration
Create or update your `.env` file with the following variables:

```env
# AssemblyAI Configuration
ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here
ASSEMBLYAI_BASE_URL=https://api.assemblyai.com/v2
ASSEMBLYAI_UPLOAD_URL=https://api.assemblyai.com/v2/upload
ASSEMBLYAI_TRANSCRIPT_URL=https://api.assemblyai.com/v2/transcript

# Audio Processing Configuration
AUDIO_MAX_FILE_SIZE=26214400
AUDIO_SUPPORTED_FORMATS=mp3,wav,m4a,flac,ogg,webm
AUDIO_TEMP_DIR=./public/temp/audio
AUDIO_CLEANUP_INTERVAL=3600000
TRANSCRIPTION_CACHE_TTL=86400000

# Rate Limiting Configuration
AUDIO_RATE_LIMIT_WINDOW_MS=3600000
AUDIO_RATE_LIMIT_MAX_REQUESTS=10
AI_GENERATION_RATE_LIMIT_MAX_REQUESTS=20
```

### 3. Directory Structure
The integration creates the following directory structure:
```
project/
├── public/
│   └── temp/
│       └── audio/          # Audio file uploads
├── src/
│   ├── controllers/
│   │   └── ai.controller.js    # Updated with transcription endpoints
│   ├── middleware/
│   │   └── validation.js       # Updated with audio validation
│   ├── middlewares/
│   │   └── multer.middleware.js # Updated with audio upload handling
│   ├── models/
│   │   ├── transcription.models.js  # New transcription models
│   │   └── website.models.js        # Updated with transcription tracking
│   ├── routes/
│   │   └── ai.routes.js            # Updated with new routes
│   └── services/
│       └── audioTranscriptionService.js # New AssemblyAI service
└── docs/
    └── AUDIO_TRANSCRIPTION_API.md  # API documentation
```

### 4. AssemblyAI API Key Setup
1. Sign up for AssemblyAI account: https://www.assemblyai.com/
2. Get your API key from the dashboard
3. Add it to your `.env` file:
   ```env
   ASSEMBLYAI_API_KEY=your-actual-api-key-here
   ```

### 5. File Storage Configuration
The system uses **local file storage only** - no AWS S3 bucket required:
- Audio files are temporarily stored in `./public/temp/audio/`
- Files are automatically cleaned up after processing
- No external storage dependencies or cloud storage setup needed

## API Endpoints

### New Endpoints Added
- `POST /api/v1/ai/transcribe-audio` - Upload and transcribe audio
- `GET /api/v1/ai/transcription/:jobId` - Get transcription status/result
- `POST /api/v1/ai/generate-from-audio` - Direct audio-to-website generation
- `DELETE /api/v1/ai/transcription/:jobId` - Clean up transcription data
- `GET /api/v1/ai/languages` - Get supported languages
- `GET /api/v1/ai/transcription-stats` - Get user transcription statistics

### Usage Examples

#### Basic Audio Transcription
```javascript
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
```

#### Direct Website Generation from Audio
```javascript
const formData = new FormData();
formData.append('audioFile', audioFile);
formData.append('language', 'en');
formData.append('saveToDatabase', true);

const response = await fetch('/api/v1/ai/generate-from-audio', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
// result.data.websiteId contains the generated website ID
```

## Code Architecture

### Key Components

#### 1. AudioTranscriptionService (`src/services/audioTranscriptionService.js`)
- Handles all AssemblyAI API interactions
- Manages audio file uploads and transcription requests
- Implements retry logic and error handling
- Provides utility methods for file validation and cleanup

#### 2. Enhanced AI Controller (`src/controllers/ai.controller.js`)
- New transcription endpoints with comprehensive error handling
- Integration with existing website generation pipeline
- In-memory transcription job caching
- Automatic cleanup of expired jobs

#### 3. Updated Multer Middleware (`src/middlewares/multer.middleware.js`)
- Audio-specific file upload handling
- Format validation and size limits
- Automatic directory creation
- Error handling for upload failures

#### 4. Transcription Models (`src/models/transcription.models.js`)
- Database schema for transcription tracking
- Usage statistics and analytics
- Automatic cleanup and expiration handling

#### 5. Enhanced Validation (`src/middleware/validation.js`)
- Audio file validation middleware
- Transcription parameter validation
- Language code validation
- File format and size validation

## Database Schema

### Transcription Model
```javascript
{
  assembly_job_id: String,        // AssemblyAI job ID
  user_id: ObjectId,              // User reference
  original_filename: String,       // Original file name
  file_size: Number,              // File size in bytes
  file_format: String,            // File format
  audio_duration: Number,         // Duration in seconds
  status: String,                 // Processing status
  text: String,                   // Transcribed text
  confidence: Number,             // Confidence score
  speakers: Array,                // Speaker information
  quality_metrics: Object,        // Quality metrics
  options: Object,                // Transcription options
  expires_at: Date,               // Expiration date
  created_at: Date,               // Creation timestamp
  updated_at: Date                // Last update timestamp
}
```

### Website Model Updates
```javascript
{
  // ... existing fields
  transcriptionId: ObjectId,      // Reference to transcription
  assemblyJobId: String,          // AssemblyAI job ID
  transcriptionSource: String,    // Source type (manual/audio/imported)
  // ... existing fields
}
```

## Configuration Options

### Audio Processing Settings
```javascript
// File size limits
AUDIO_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Supported formats
SUPPORTED_FORMATS = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm'];

// Transcription options
const transcriptionOptions = {
  language: 'en',                 // Language code
  speakerLabels: false,          // Enable speaker identification
  expectedSpeakers: 2,           // Expected number of speakers
  autoHighlights: false,         // Enable auto-highlights
  contentSafety: false,          // Enable content safety
  punctuate: true,               // Add punctuation
  formatText: true              // Format text output
};
```

### Rate Limiting Configuration
```javascript
// Audio upload limits
uploadRateLimiter.audio = {
  windowMs: 60 * 60 * 1000,     // 1 hour
  max: 10,                      // 10 uploads per hour
  message: 'Too many audio uploads. Please wait before uploading more files.'
};

// AI generation limits
aiRateLimiter.generation = {
  windowMs: 60 * 60 * 1000,     // 1 hour
  max: 20,                      // 20 generations per hour
  message: 'Too many AI generation requests. Please wait before generating more content.'
};
```

## Error Handling

### Common Error Scenarios
1. **Invalid Audio Format**: Returns 400 with supported formats
2. **File Too Large**: Returns 413 with size limit information
3. **AssemblyAI API Errors**: Returns 500 with service-specific error
4. **Rate Limit Exceeded**: Returns 429 with retry information
5. **Transcription Timeout**: Returns 408 with timeout message
6. **Database Errors**: Returns 500 with database error details

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

## Security Considerations

### File Upload Security
- File type validation using MIME types and extensions
- File size limits to prevent DoS attacks
- Automatic file cleanup to prevent storage exhaustion
- Secure file naming to prevent path traversal

### API Security
- JWT authentication for all protected endpoints
- Rate limiting to prevent abuse
- Input validation and sanitization
- Error message sanitization to prevent information leakage

### Data Privacy
- Automatic expiration of transcription data (24 hours)
- Option to delete transcriptions from AssemblyAI
- Secure storage of API keys
- Optional transcription text cleanup for privacy

## Performance Optimization

### Caching Strategy
- In-memory caching of transcription jobs
- Automatic cleanup of expired jobs
- Efficient status polling to reduce API calls

### File Management
- Automatic cleanup of uploaded audio files
- Temporary file storage with expiration
- Optimized file upload handling

### Database Optimization
- Indexed fields for efficient queries
- Automatic cleanup of expired records
- Efficient aggregation queries for statistics

## Testing

### Test the Integration
1. Start your server:
   ```bash
   npm run dev
   ```

2. Test basic transcription:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "audioFile=@test-audio.mp3" \
     -F "language=en" \
     http://localhost:3000/api/v1/ai/transcribe-audio
   ```

3. Test website generation:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "audioFile=@doctor-intro.mp3" \
     -F "saveToDatabase=true" \
     http://localhost:3000/api/v1/ai/generate-from-audio
   ```

## Monitoring & Analytics

### Usage Tracking
- Total transcriptions per user
- Audio duration processed
- Average confidence scores
- Language usage statistics
- Feature usage analytics

### Performance Metrics
- Transcription processing times
- Error rates and types
- API usage patterns
- Resource utilization

## Maintenance

### Regular Tasks
1. **Cleanup Expired Jobs**: Automatic cleanup runs every hour
2. **Monitor API Usage**: Check AssemblyAI usage limits
3. **Review Error Logs**: Monitor for recurring issues
4. **Update Dependencies**: Keep packages up to date

### Troubleshooting
1. **Check API Key**: Verify AssemblyAI API key is correct
2. **Verify File Permissions**: Ensure temp directory is writable
3. **Monitor Rate Limits**: Check for rate limiting issues
4. **Review Logs**: Check application logs for errors

## Future Enhancements

### Potential Improvements
- Real-time transcription streaming
- Custom vocabulary support
- Batch processing for multiple files
- Integration with other transcription services
- Advanced analytics dashboard
- Webhook support for long-running jobs

### Scalability Considerations
- Redis caching for distributed systems
- Database sharding for large datasets
- CDN integration for file serving
- Message queue for background processing
- Horizontal scaling support

## Support

For technical support or questions about the AssemblyAI integration:
1. Check the API documentation: `AUDIO_TRANSCRIPTION_API.md`
2. Review the error logs
3. Contact the development team
4. Check AssemblyAI documentation: https://www.assemblyai.com/docs/

## License

This integration is part of the Doctor's Website Builder project and follows the same licensing terms.