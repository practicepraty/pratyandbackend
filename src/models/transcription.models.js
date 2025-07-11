// src/models/transcription.models.js
import mongoose from "mongoose";

// Speaker information schema
const speakerSchema = new mongoose.Schema({
  speaker: {
    type: String,
    required: true
  },
  word_count: {
    type: Number,
    default: 0
  },
  total_duration: {
    type: Number,
    default: 0
  },
  avg_confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  utterances: [{
    text: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    start: Number,
    end: Number,
    words: [{
      text: String,
      confidence: Number,
      start: Number,
      end: Number
    }]
  }]
});

// Quality metrics schema
const qualityMetricsSchema = new mongoose.Schema({
  word_count: {
    type: Number,
    default: 0
  },
  avg_confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  has_speaker_labels: {
    type: Boolean,
    default: false
  },
  audio_duration_seconds: {
    type: Number,
    default: 0
  },
  low_confidence_words: {
    type: Number,
    default: 0
  },
  silence_ratio: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  }
});

// Transcription options schema
const transcriptionOptionsSchema = new mongoose.Schema({
  language: {
    type: String,
    default: 'en'
  },
  speaker_labels: {
    type: Boolean,
    default: false
  },
  expected_speakers: {
    type: Number,
    min: 1,
    max: 10,
    default: 2
  },
  auto_highlights: {
    type: Boolean,
    default: false
  },
  content_safety: {
    type: Boolean,
    default: false
  },
  punctuate: {
    type: Boolean,
    default: true
  },
  format_text: {
    type: Boolean,
    default: true
  },
  word_boost: [String],
  boost_param: {
    type: String,
    default: 'default'
  }
});

// Main transcription schema
const transcriptionSchema = new mongoose.Schema({
  // AssemblyAI job information
  assembly_job_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // User information
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Original audio file information
  original_filename: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  file_format: {
    type: String,
    required: true
  },
  audio_duration: {
    type: Number, // in seconds
    required: true
  },
  
  // Transcription status
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'error', 'expired'],
    default: 'queued',
    index: true
  },
  
  // Transcription results
  text: {
    type: String,
    required: function() {
      return this.status === 'completed';
    }
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  
  // Speaker information
  speakers: [speakerSchema],
  speaker_labels: [{
    speaker: String,
    text: String,
    confidence: Number,
    start: Number,
    end: Number
  }],
  
  // Word-level details
  words: [{
    text: String,
    confidence: Number,
    start: Number,
    end: Number
  }],
  
  // Paragraphs for better formatting
  paragraphs: [{
    text: String,
    start: Number,
    end: Number,
    confidence: Number,
    words: [{
      text: String,
      confidence: Number,
      start: Number,
      end: Number
    }]
  }],
  
  // Additional features
  auto_highlights: {
    status: String,
    results: [{
      count: Number,
      rank: Number,
      text: String,
      timestamps: [{
        start: Number,
        end: Number
      }]
    }]
  },
  
  content_safety: [{
    text: String,
    labels: [{
      label: String,
      confidence: Number,
      severity: Number
    }],
    start: Number,
    end: Number
  }],
  
  // Processing metadata
  processing_time: {
    type: Number, // in milliseconds
    default: 0
  },
  
  // Transcription options used
  options: transcriptionOptionsSchema,
  
  // Quality metrics
  quality_metrics: qualityMetricsSchema,
  
  // Error information
  error_message: String,
  error_code: String,
  
  // Usage tracking
  website_generated: {
    type: Boolean,
    default: false
  },
  website_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website'
  },
  
  // Expiration
  expires_at: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    },
    index: true
  },
  
  // Cleanup status
  audio_file_cleaned: {
    type: Boolean,
    default: false
  },
  assembly_ai_deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Transcription usage statistics schema
const transcriptionUsageSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Monthly usage tracking
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  
  // Usage metrics
  total_transcriptions: {
    type: Number,
    default: 0
  },
  total_audio_minutes: {
    type: Number,
    default: 0
  },
  total_words_transcribed: {
    type: Number,
    default: 0
  },
  
  // Success metrics
  successful_transcriptions: {
    type: Number,
    default: 0
  },
  failed_transcriptions: {
    type: Number,
    default: 0
  },
  
  // Average quality metrics
  avg_confidence_score: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  
  // Language usage
  language_usage: [{
    language: String,
    count: Number,
    total_minutes: Number
  }],
  
  // Feature usage
  speaker_labels_used: {
    type: Number,
    default: 0
  },
  auto_highlights_used: {
    type: Number,
    default: 0
  },
  
  // Website generation
  websites_generated: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
transcriptionSchema.index({ user_id: 1, created_at: -1 });
transcriptionSchema.index({ assembly_job_id: 1 });
transcriptionSchema.index({ status: 1 });
transcriptionSchema.index({ expires_at: 1 });
transcriptionSchema.index({ user_id: 1, status: 1 });

transcriptionUsageSchema.index({ user_id: 1, year: 1, month: 1 }, { unique: true });

// Virtual for transcription age
transcriptionSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for time remaining until expiration
transcriptionSchema.virtual('timeUntilExpiration').get(function() {
  return this.expires_at.getTime() - Date.now();
});

// Virtual for words per minute
transcriptionSchema.virtual('wordsPerMinute').get(function() {
  if (!this.audio_duration || this.audio_duration === 0) return 0;
  const minutes = this.audio_duration / 60;
  return Math.round((this.quality_metrics?.word_count || 0) / minutes);
});

// Virtual for confidence grade
transcriptionSchema.virtual('confidenceGrade').get(function() {
  const confidence = this.confidence || 0;
  if (confidence >= 0.9) return 'Excellent';
  if (confidence >= 0.8) return 'Good';
  if (confidence >= 0.7) return 'Fair';
  if (confidence >= 0.6) return 'Poor';
  return 'Very Poor';
});

// Pre-save middleware
transcriptionSchema.pre('save', function(next) {
  // Update processing time if status changes to completed
  if (this.isModified('status') && this.status === 'completed') {
    this.processing_time = Date.now() - this.createdAt.getTime();
  }
  
  next();
});

// Post-save middleware for usage tracking
transcriptionSchema.post('save', async function(doc) {
  if (doc.isModified('status') && doc.status === 'completed') {
    await updateUsageStats(doc);
  }
});

// Instance methods
transcriptionSchema.methods.markAsExpired = function() {
  this.status = 'expired';
  return this.save();
};

transcriptionSchema.methods.markAsWebsiteGenerated = function(websiteId) {
  this.website_generated = true;
  this.website_id = websiteId;
  return this.save();
};

transcriptionSchema.methods.cleanup = async function() {
  // Mark as cleaned up
  this.audio_file_cleaned = true;
  this.assembly_ai_deleted = true;
  
  // Could also physically delete the transcription text if needed for privacy
  // this.text = null;
  // this.words = [];
  // this.paragraphs = [];
  
  return this.save();
};

// Static methods
transcriptionSchema.statics.findExpired = function() {
  return this.find({
    expires_at: { $lte: new Date() },
    status: { $ne: 'expired' }
  });
};

transcriptionSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total_transcriptions: { $sum: 1 },
        successful_transcriptions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        total_audio_minutes: { $sum: { $divide: ['$audio_duration', 60] } },
        avg_confidence: { $avg: '$confidence' },
        total_words: { $sum: '$quality_metrics.word_count' },
        websites_generated: {
          $sum: { $cond: ['$website_generated', 1, 0] }
        }
      }
    }
  ]);
};

transcriptionSchema.statics.getLanguageStats = function(userId) {
  return this.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$options.language',
        count: { $sum: 1 },
        total_minutes: { $sum: { $divide: ['$audio_duration', 60] } },
        avg_confidence: { $avg: '$confidence' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Helper function to update usage statistics
async function updateUsageStats(transcription) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  const updateData = {
    $inc: {
      total_transcriptions: 1,
      total_audio_minutes: transcription.audio_duration / 60,
      total_words_transcribed: transcription.quality_metrics?.word_count || 0,
      successful_transcriptions: transcription.status === 'completed' ? 1 : 0,
      failed_transcriptions: transcription.status === 'error' ? 1 : 0,
      speaker_labels_used: transcription.options?.speaker_labels ? 1 : 0,
      auto_highlights_used: transcription.options?.auto_highlights ? 1 : 0
    },
    $set: {
      avg_confidence_score: transcription.confidence || 0
    }
  };
  
  await TranscriptionUsage.findOneAndUpdate(
    { user_id: transcription.user_id, year, month },
    updateData,
    { upsert: true, new: true }
  );
}

// Create models
const Transcription = mongoose.model('Transcription', transcriptionSchema);
const TranscriptionUsage = mongoose.model('TranscriptionUsage', transcriptionUsageSchema);

export { Transcription, TranscriptionUsage };