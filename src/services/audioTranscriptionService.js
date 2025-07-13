// src/services/audioTranscriptionService.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ApiError } from '../utils/apierror.js';

class AudioTranscriptionService {
  constructor() {
    this.apiKey = process.env.ASSEMBLYAI_API_KEY;
    this.baseUrl = 'https://api.assemblyai.com/v2';
    this.uploadUrl = 'https://api.assemblyai.com/v2/upload';
    this.transcriptUrl = 'https://api.assemblyai.com/v2/transcript';
    
    if (!this.apiKey) {
      throw new Error('AssemblyAI API key is required');
    }
    
    this.axiosInstance = axios.create({
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // Upload audio file to AssemblyAI
  async uploadAudioFile(filePath) {
    try {
      console.log(`[DEBUG] Starting audio file upload: ${filePath}`);
      
      const fileStats = fs.statSync(filePath);
      const fileSizeInMB = fileStats.size / (1024 * 1024);
      
      console.log(`[DEBUG] File stats - Size: ${fileSizeInMB.toFixed(2)}MB, Exists: ${fs.existsSync(filePath)}`);
      
      // Check file size limit (25MB)
      if (fileSizeInMB > 25) {
        throw new ApiError(400, 'Audio file size exceeds 25MB limit');
      }

      const audioData = fs.readFileSync(filePath);
      console.log(`[DEBUG] Audio data read, buffer size: ${audioData.length} bytes`);
      
      console.log(`[DEBUG] Uploading to: ${this.uploadUrl}`);
      console.log(`[DEBUG] Using API key: ${this.apiKey ? 'Present' : 'Missing'}`);
      
      const response = await axios.post(this.uploadUrl, audioData, {
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/octet-stream'
        }
      });

      console.log(`[DEBUG] Upload successful, response:`, response.data);
      return response.data.upload_url;
    } catch (error) {
      console.error('[ERROR] Audio upload error:', error.message);
      console.error('[ERROR] Error response:', error.response?.data);
      console.error('[ERROR] Error status:', error.response?.status);
      console.error('[ERROR] Error headers:', error.response?.headers);
      
      if (error.response?.data?.error) {
        throw new ApiError(400, `Upload failed: ${error.response.data.error}`);
      }
      if (error.response?.status === 401) {
        throw new ApiError(401, 'Assembly AI authentication failed - check API key');
      }
      if (error.response?.status === 413) {
        throw new ApiError(400, 'File too large for Assembly AI upload');
      }
      throw new ApiError(500, `Failed to upload audio file: ${error.message}`);
    }
  }

  // Submit transcription request
  async submitTranscriptionRequest(audioUrl, options = {}) {
    try {
      // Assembly AI requires specific language codes - let's use only supported ones
      const languageMap = {
        'en': 'en',
        'es': 'es', 
        'fr': 'fr',
        'de': 'de',
        'it': 'it',
        'pt': 'pt',
        'nl': 'nl',
        'hi': 'hi',
        'ja': 'ja',
        'zh': 'zh',
        'ko': 'ko',
        'ru': 'ru',
        'ar': 'ar',
        'tr': 'tr',
        'pl': 'pl',
        'uk': 'uk'
      };

      // Create minimal, valid transcription config
      const transcriptionConfig = {
        audio_url: audioUrl
      };

      // Add optional parameters only if they have valid values
      const mappedLanguage = languageMap[options.language] || 'en';
      if (mappedLanguage !== 'en') {
        transcriptionConfig.language_code = mappedLanguage;
      }

      // Add speaker labels only if explicitly requested
      if (options.speakerLabels === true) {
        transcriptionConfig.speaker_labels = true;
        if (options.expectedSpeakers && options.expectedSpeakers > 1 && options.expectedSpeakers <= 10) {
          transcriptionConfig.speakers_expected = parseInt(options.expectedSpeakers);
        }
      }

      // Add auto highlights only if requested
      if (options.autoHighlights === true) {
        transcriptionConfig.auto_highlights = true;
      }

      console.log('[DEBUG] Assembly AI transcription config:', JSON.stringify(transcriptionConfig, null, 2));
      console.log('[DEBUG] Assembly AI URL:', this.transcriptUrl);
      console.log('[DEBUG] Assembly AI headers:', this.axiosInstance.defaults.headers);

      const response = await this.axiosInstance.post(this.transcriptUrl, transcriptionConfig);
      return response.data;
    } catch (error) {
      console.error('Transcription request error:', error);
      if (error.response?.data?.error) {
        throw new ApiError(400, `Transcription failed: ${error.response.data.error}`);
      }
      throw new ApiError(500, 'Failed to submit transcription request');
    }
  }

  // Get transcription status and result
  async getTranscriptionResult(transcriptionId) {
    try {
      const response = await this.axiosInstance.get(`${this.transcriptUrl}/${transcriptionId}`);
      return response.data;
    } catch (error) {
      console.error('Get transcription result error:', error);
      if (error.response?.data?.error) {
        throw new ApiError(400, `Failed to get transcription: ${error.response.data.error}`);
      }
      throw new ApiError(500, 'Failed to retrieve transcription result');
    }
  }

  // Poll for transcription completion with timeout
  async pollForCompletion(transcriptionId, maxAttempts = 60, intervalMs = 5000) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await this.getTranscriptionResult(transcriptionId);
        
        if (result.status === 'completed') {
          return result;
        } else if (result.status === 'error') {
          throw new ApiError(500, `Transcription failed: ${result.error}`);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        console.error('Polling error:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    throw new ApiError(408, 'Transcription timeout - process taking too long');
  }

  // Complete transcription workflow
  async transcribeAudio(filePath, options = {}) {
    try {
      // Step 1: Upload audio file
      console.log('Uploading audio file...');
      const audioUrl = await this.uploadAudioFile(filePath);
      
      // Step 2: Submit transcription request
      console.log('Submitting transcription request...');
      const transcriptionJob = await this.submitTranscriptionRequest(audioUrl, options);
      
      // Step 3: Poll for completion
      console.log('Polling for transcription completion...');
      const result = await this.pollForCompletion(transcriptionJob.id);
      
      // Step 4: Process and return structured result
      return this.processTranscriptionResult(result);
    } catch (error) {
      console.error('Complete transcription error:', error);
      throw error;
    }
  }

  // Process transcription result into structured format
  processTranscriptionResult(result) {
    const processedResult = {
      id: result.id,
      status: result.status,
      text: result.text,
      confidence: result.confidence,
      audio_duration: result.audio_duration,
      
      // Speaker information
      speakers: null,
      speakerLabels: null,
      
      // Word-level details
      words: result.words || [],
      
      // Paragraphs for better formatting
      paragraphs: result.paragraphs || [],
      
      // Highlights (if enabled)
      auto_highlights: result.auto_highlights_result || null,
      
      // Content safety (if enabled)
      content_safety: result.content_safety_labels || null,
      
      // Processing metadata
      processing_time: result.audio_duration ? 
        Math.round((Date.now() - new Date(result.created).getTime()) / 1000) : null,
      
      // Quality metrics
      quality_metrics: {
        word_count: result.words ? result.words.length : 0,
        avg_confidence: result.confidence || 0,
        has_speaker_labels: !!(result.utterances && result.utterances.length > 0),
        audio_duration_seconds: result.audio_duration
      }
    };

    // Process speaker information if available
    if (result.utterances && result.utterances.length > 0) {
      processedResult.speakers = this.extractSpeakerInfo(result.utterances);
      processedResult.speakerLabels = result.utterances.map(utterance => ({
        speaker: utterance.speaker,
        text: utterance.text,
        confidence: utterance.confidence,
        start: utterance.start,
        end: utterance.end
      }));
    }

    return processedResult;
  }

  // Extract speaker information
  extractSpeakerInfo(utterances) {
    const speakers = new Map();
    
    utterances.forEach(utterance => {
      if (!speakers.has(utterance.speaker)) {
        speakers.set(utterance.speaker, {
          speaker: utterance.speaker,
          word_count: 0,
          total_duration: 0,
          avg_confidence: 0,
          utterances: []
        });
      }
      
      const speaker = speakers.get(utterance.speaker);
      speaker.utterances.push(utterance);
      speaker.word_count += utterance.words ? utterance.words.length : 0;
      speaker.total_duration += (utterance.end - utterance.start);
      speaker.avg_confidence = 
        (speaker.avg_confidence + utterance.confidence) / 2;
    });
    
    return Array.from(speakers.values());
  }

  // Delete transcription from AssemblyAI
  async deleteTranscription(transcriptionId) {
    try {
      await this.axiosInstance.delete(`${this.transcriptUrl}/${transcriptionId}`);
      return true;
    } catch (error) {
      console.error('Delete transcription error:', error);
      // Don't throw error for deletion failures
      return false;
    }
  }

  // Validate audio file format with detailed error messages
  validateAudioFile(filePath) {
    const supportedFormats = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm'];
    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (!supportedFormats.includes(fileExtension)) {
      throw new ApiError(400, 
        `The audio file format ${fileExtension} is not supported. Please upload a file in one of these formats: ${supportedFormats.join(', ')}. For best results, use MP3 or WAV format.`
      );
    }
    
    if (!fs.existsSync(filePath)) {
      throw new ApiError(400, 'Audio file not found. Please ensure the file was uploaded correctly and try again.');
    }
    
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    if (fileSizeInMB > 25) {
      throw new ApiError(400, 
        `Audio file size is ${fileSizeInMB.toFixed(1)}MB, which exceeds the 25MB limit. Please compress your audio file or use a shorter recording.`
      );
    }
    
    if (fileSizeInMB < 0.01) {
      throw new ApiError(400, 
        'Audio file is too small (less than 10KB). Please ensure you uploaded a valid audio file with content.'
      );
    }
    
    return true;
  }

  // Clean up audio file
  async cleanupAudioFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Audio file cleaned up:', filePath);
      }
    } catch (error) {
      console.error('Audio cleanup error:', error);
      // Don't throw error for cleanup failures
    }
  }

  // Get supported languages
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'nl', name: 'Dutch' },
      { code: 'hi', name: 'Hindi' },
      { code: 'ja', name: 'Japanese' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ru', name: 'Russian' },
      { code: 'ar', name: 'Arabic' },
      { code: 'tr', name: 'Turkish' },
      { code: 'pl', name: 'Polish' },
      { code: 'uk', name: 'Ukrainian' }
    ];
  }

  // Retry logic for failed requests
  async retryRequest(requestFn, maxRetries = 3, delayMs = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          console.log(`Request failed, retrying in ${delayMs}ms... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  // Get account usage statistics
  async getUsageStats() {
    try {
      const response = await this.axiosInstance.get(`${this.baseUrl}/account`);
      return response.data;
    } catch (error) {
      console.error('Get usage stats error:', error);
      return null;
    }
  }
}

export default AudioTranscriptionService;