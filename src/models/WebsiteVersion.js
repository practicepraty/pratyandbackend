// src/models/WebsiteVersion.js
import mongoose from "mongoose";
import crypto from "crypto";

// Website Version Schema for tracking all versions
const websiteVersionSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    index: true
  },
  versionNumber: {
    type: Number,
    required: true,
    min: 1
  },
  versionType: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  
  // Complete website content snapshot
  content: {
    websiteTitle: String,
    tagline: String,
    heroSection: mongoose.Schema.Types.Mixed,
    aboutSection: mongoose.Schema.Types.Mixed,
    services: [mongoose.Schema.Types.Mixed],
    contactInfo: mongoose.Schema.Types.Mixed,
    seoMeta: mongoose.Schema.Types.Mixed,
    customizations: mongoose.Schema.Types.Mixed,
    generatedHtml: String,
    templateName: String
  },
  
  // Version metadata
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changeType: {
      type: String,
      enum: ['created', 'updated', 'deleted']
    }
  }],
  
  changeDescription: {
    type: String,
    maxlength: 500
  },
  
  // Publication info
  publishedAt: Date,
  unpublishedAt: Date,
  publicUrl: String,
  
  // Quality metrics
  qualityScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  
  // Performance metrics
  performanceMetrics: {
    loadTime: Number,
    htmlSize: Number,
    cssSize: Number,
    imageCount: Number,
    totalAssets: Number
  },
  
  // User who created this version
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Auto-save info
  isAutoSave: {
    type: Boolean,
    default: false
  },
  
  parentVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebsiteVersion'
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    // Auto-delete draft versions after 30 days
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

// Indexes for better performance
websiteVersionSchema.index({ websiteId: 1, versionNumber: -1 });
websiteVersionSchema.index({ websiteId: 1, versionType: 1 });
websiteVersionSchema.index({ createdAt: -1 });
websiteVersionSchema.index({ publishedAt: -1 });
websiteVersionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted version
websiteVersionSchema.virtual('versionString').get(function() {
  return `v${this.versionNumber}.${this.versionType === 'draft' ? 'draft' : 'published'}`;
});

// Instance methods
websiteVersionSchema.methods.publish = function() {
  this.versionType = 'published';
  this.publishedAt = new Date();
  this.expiresAt = undefined; // Don't auto-delete published versions
  return this.save();
};

websiteVersionSchema.methods.unpublish = function() {
  this.versionType = 'archived';
  this.unpublishedAt = new Date();
  return this.save();
};

websiteVersionSchema.methods.createNextVersion = function(changes = {}) {
  const nextVersion = new WebsiteVersion({
    websiteId: this.websiteId,
    versionNumber: this.versionNumber + 1,
    versionType: 'draft',
    content: {
      ...this.content,
      ...changes
    },
    createdBy: this.createdBy,
    parentVersionId: this._id
  });
  
  return nextVersion.save();
};

// Static methods
websiteVersionSchema.statics.getLatestVersion = function(websiteId, versionType = 'draft') {
  return this.findOne({ websiteId, versionType })
    .sort({ versionNumber: -1 })
    .limit(1);
};

websiteVersionSchema.statics.getVersionHistory = function(websiteId, limit = 10) {
  return this.find({ websiteId })
    .sort({ versionNumber: -1 })
    .limit(limit)
    .populate('createdBy', 'fullName email');
};

websiteVersionSchema.statics.getPublishedVersion = function(websiteId) {
  return this.findOne({ 
    websiteId, 
    versionType: 'published' 
  }).sort({ publishedAt: -1 });
};

websiteVersionSchema.statics.cleanupOldDrafts = function(websiteId, keepCount = 5) {
  return this.find({ websiteId, versionType: 'draft' })
    .sort({ versionNumber: -1 })
    .skip(keepCount)
    .then(oldVersions => {
      const idsToDelete = oldVersions.map(v => v._id);
      return this.deleteMany({ _id: { $in: idsToDelete } });
    });
};

// Pre-save middleware
websiteVersionSchema.pre('save', function(next) {
  if (this.isNew) {
    // Calculate content hash for change detection
    this.contentHash = this.calculateContentHash();
  }
  next();
});

// Instance method to calculate content hash
websiteVersionSchema.methods.calculateContentHash = function() {
  const contentString = JSON.stringify(this.content);
  return crypto.createHash('sha256').update(contentString).digest('hex');
};

// Export model
const WebsiteVersion = mongoose.model('WebsiteVersion', websiteVersionSchema);

export default WebsiteVersion;