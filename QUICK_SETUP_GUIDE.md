# Quick Setup Guide - Audio Transcription Integration

## 🚀 **No AWS S3 Required!**

This integration uses **local file storage only** - no cloud storage setup needed.

## ✅ **Required Setup (Minimal)**

### 1. Install Dependencies
```bash
npm install  # axios is already included
```

### 2. Environment Variables
Add **only these required variables** to your `.env` file:

```env
# Required for AssemblyAI transcription
ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here

# Optional: Audio processing settings (uses defaults if not set)
AUDIO_MAX_FILE_SIZE=26214400
AUDIO_TEMP_DIR=./public/temp/audio
```

### 3. Get AssemblyAI API Key
1. Sign up at: https://www.assemblyai.com/
2. Get your API key from the dashboard
3. Replace `your-assemblyai-api-key-here` in your `.env` file

### 4. Test the Integration
```bash
npm run dev
```

## 🎯 **What Works Out of the Box**

- ✅ **Local file storage** - files stored in `./public/temp/audio/`
- ✅ **Automatic cleanup** - files deleted after processing
- ✅ **No cloud setup** - no AWS S3, no external storage
- ✅ **Multiple formats** - MP3, WAV, M4A, FLAC, OGG, WebM
- ✅ **Rate limiting** - built-in protection
- ✅ **Error handling** - comprehensive error management

## 📁 **File Storage Architecture**

```
project/
├── public/
│   └── temp/
│       └── audio/          # Temporary audio files (auto-cleanup)
├── src/
│   └── services/
│       └── audioTranscriptionService.js  # Handles AssemblyAI
└── uploads are handled locally - no external storage needed
```

## 🔧 **How It Works**

1. **Upload**: Audio file saved to `./public/temp/audio/`
2. **Process**: File sent to AssemblyAI for transcription
3. **Cleanup**: Local file automatically deleted after processing
4. **Storage**: Transcription text saved to MongoDB (no file storage)

## 🛡️ **Security Features**

- File type validation
- Size limits (25MB default)
- Automatic cleanup prevents storage bloat
- No external storage = no cloud security concerns

## 🎨 **Optional Features**

All optional - system works without these:

```env
# AWS (only for Bedrock AI - completely optional)
AWS_ACCESS_KEY_ID=your-aws-key      # Only if using Bedrock AI
AWS_SECRET_ACCESS_KEY=your-secret   # Only if using Bedrock AI

# Email (only for notifications - optional)
EMAIL_HOST=smtp.gmail.com           # Only if you want email notifications
EMAIL_USER=your-email@gmail.com     # Only if you want email notifications
```

## 📝 **API Endpoints Ready to Use**

- `POST /api/v1/ai/transcribe-audio` - Upload & transcribe
- `GET /api/v1/ai/transcription/:jobId` - Get status
- `POST /api/v1/ai/generate-from-audio` - Audio to website
- `DELETE /api/v1/ai/transcription/:jobId` - Cleanup

## 🔧 **Troubleshooting**

### Common Issues:
1. **"AssemblyAI API key is required"** - Add `ASSEMBLYAI_API_KEY` to `.env`
2. **"Directory not found"** - App auto-creates directories
3. **"File too large"** - Default limit is 25MB
4. **"Upload failed"** - Check file format (MP3, WAV, etc.)

### Test Upload:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audioFile=@test.mp3" \
  http://localhost:8000/api/v1/ai/transcribe-audio
```

## 🎯 **That's It!**

No S3 buckets, no cloud storage setup, no complex configuration. Just add your AssemblyAI API key and start transcribing audio files!

**Next Steps:**
1. Add `ASSEMBLYAI_API_KEY` to your `.env` file
2. Start your server: `npm run dev`
3. Upload an audio file via the API
4. Watch it get transcribed automatically!

For detailed API documentation, see `AUDIO_TRANSCRIPTION_API.md`.