// src/models/website.models.js
// src/models/website.models.js
import mongoose from "mongoose";

// Content Variation Schema (for A/B testing)
const contentVariationSchema = new mongoose.Schema({
  variationId: {
    type: String,
    required: true
  },
  focus: {
    type: String,
    enum: ['trust-experience', 'technology-innovation', 'patient-care', 'comprehensive-services', 'general', 'fallback'],
    default: 'general'
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  qualityScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  fallbackUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// SEO Meta Schema
const seoMetaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 60
  },
  description: {
    type: String,
    required: true,
    maxlength: 200,
    set: function(v) {
      // Auto-truncate if too long but preserve readability
      if (v && v.length > 160) {
        return v.substring(0, 157) + '...';
      }
      return v;
    }
  },
  keywords: [{
    type: String,
    trim: true
  }],
  canonicalUrl: String,
  ogTitle: String,
  ogDescription: String,
  ogImage: String
});

// Hero Section Schema
const heroSectionSchema = new mongoose.Schema({
  headline: {
    type: String,
    required: true,
    maxlength: 200
  },
  subheadline: {
    type: String,
    maxlength: 300
  },
  ctaText: {
    type: String,
    maxlength: 50,
    default: "Schedule Appointment"
  },
  backgroundImage: String,
  backgroundColor: String
});

// About Section Schema
const aboutSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  highlights: [{
    type: String,
    maxlength: 100
  }],
  image: String,
  videoUrl: String
});

// Service Schema
const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  icon: {
    type: String,
    default: "medical-icon"
  },
  price: {
    type: Number,
    min: 0
  },
  duration: String,
  isActive: {
    type: Boolean,
    default: true
  }
});

// Contact Info Schema
const contactInfoSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty phone numbers
        // Accept common phone formats: (555) 123-4567, 555-123-4567, +1-555-123-4567, etc.
        return /^[\d\s\-\+\(\)\.x]+$/.test(v);
      },
      message: 'Phone number contains invalid characters'
    }
  },
  email: {
    type: String,
    required: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  address: {
    type: String,
    required: true,
    maxlength: 200
  },
  city: String,
  state: String,
  zipCode: String,
  country: {
    type: String,
    default: "United States"
  },
  hours: {
    type: String,
    default: "Monday-Friday: 9:00 AM - 5:00 PM"
  },
  website: String,
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  }
});

// Generation Metadata Schema
const generationMetadataSchema = new mongoose.Schema({
  aiModel: {
    type: String,
    required: true
  },
  processingTime: {
    type: Number,
    required: true
  },
  fallbackUsed: {
    type: Boolean,
    default: false
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  regeneratedAt: Date,
  regenerationCount: {
    type: Number,
    default: 0
  },
  specialtyDetection: {
    method: {
      type: String,
      enum: ['keyword', 'ai', 'hybrid', 'fallback'],
      default: 'hybrid'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    alternativeSpecialties: [{
      specialty: String,
      confidence: Number
    }]
  }
});

// Customization Schema
const customizationSchema = new mongoose.Schema({
  theme: {
    type: String,
    enum: ['modern', 'classic', 'minimal', 'professional'],
    default: 'professional'
  },
  colorScheme: {
    primary: {
      type: String,
      default: "#2563eb"
    },
    secondary: {
      type: String,
      default: "#64748b"
    },
    accent: {
      type: String,
      default: "#10b981"
    },
    background: {
      type: String,
      default: "#ffffff"
    }
  },
  typography: {
    headingFont: {
      type: String,
      default: "Inter"
    },
    bodyFont: {
      type: String,
      default: "Inter"
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    }
  },
  layout: {
    headerStyle: {
      type: String,
      enum: ['fixed', 'static', 'transparent'],
      default: 'static'
    },
    footerStyle: {
      type: String,
      enum: ['simple', 'detailed', 'minimal'],
      default: 'detailed'
    },
    sidebarEnabled: {
      type: Boolean,
      default: false
    }
  },
  features: {
    appointmentBooking: {
      type: Boolean,
      default: false
    },
    liveChat: {
      type: Boolean,
      default: false
    },
    testimonials: {
      type: Boolean,
      default: true
    },
    blog: {
      type: Boolean,
      default: false
    },
    newsletter: {
      type: Boolean,
      default: false
    }
  }
});

// Content History Schema for undo/redo
const contentHistorySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['edit', 'regenerate', 'undo', 'redo', 'auto_save'],
    default: 'edit'
  },
  sectionId: String,
  fieldId: String,
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed
});

// Auto-save Schema
const autoSaveSchema = new mongoose.Schema({
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isAutoSave: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Image Schema for website images
const imageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  optimized: {
    type: Boolean,
    default: false
  },
  crops: [{
    name: String,
    width: Number,
    height: Number,
    x: Number,
    y: Number,
    url: String
  }],
  alt: String,
  caption: String
});

// Enhanced Content Section Schemas for Frontend Compatibility

// Header Schema with editable fields
const headerSchema = new mongoose.Schema({
  logo: {
    text: String,
    image: String,
    alt: String,
    editable: { type: Boolean, default: true }
  },
  navigation: [{
    text: String,
    link: String,
    editable: { type: Boolean, default: true },
    order: Number
  }]
});

// Enhanced Hero Section Schema
const enhancedHeroSectionSchema = new mongoose.Schema({
  title: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 200 },
      required: { type: Boolean, default: true }
    }
  },
  subtitle: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 300 }
    }
  },
  cta: {
    text: String,
    link: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 50 }
    }
  },
  backgroundImage: {
    src: String,
    alt: String,
    editable: { type: Boolean, default: true }
  },
  backgroundColor: String
});

// Enhanced About Section Schema
const enhancedAboutSectionSchema = new mongoose.Schema({
  heading: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 100 },
      required: { type: Boolean, default: true }
    }
  },
  content: {
    text: String,
    editable: { type: Boolean, default: true },
    type: { type: String, default: 'richtext' },
    validation: {
      maxLength: { type: Number, default: 2000 },
      required: { type: Boolean, default: true }
    }
  },
  image: {
    src: String,
    alt: String,
    editable: { type: Boolean, default: true }
  },
  highlights: [{
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 100 }
    }
  }]
});

// Enhanced Service Schema with frontend compatibility
const enhancedServiceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 100 },
      required: { type: Boolean, default: true }
    }
  },
  description: {
    text: String,
    editable: { type: Boolean, default: true },
    type: { type: String, default: 'richtext' },
    validation: {
      maxLength: { type: Number, default: 500 },
      required: { type: Boolean, default: true }
    }
  },
  icon: {
    type: String,
    value: String
  },
  image: {
    src: String,
    alt: String,
    editable: { type: Boolean, default: true }
  },
  price: {
    value: Number,
    currency: { type: String, default: 'USD' },
    editable: { type: Boolean, default: true }
  },
  duration: {
    text: String,
    editable: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
});

// Enhanced Contact Schema
const enhancedContactSchema = new mongoose.Schema({
  heading: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 100 }
    }
  },
  email: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      pattern: String,
      required: { type: Boolean, default: true },
      message: String
    }
  },
  phone: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      pattern: String,
      required: { type: Boolean, default: true },
      message: String
    }
  },
  address: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 200 },
      required: { type: Boolean, default: true }
    }
  },
  hours: [{
    day: String,
    time: String,
    editable: { type: Boolean, default: true }
  }],
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  }
});

// Footer Schema
const footerSchema = new mongoose.Schema({
  copyright: {
    text: String,
    editable: { type: Boolean, default: true },
    validation: {
      maxLength: { type: Number, default: 100 }
    }
  },
  links: [{
    text: String,
    link: String,
    editable: { type: Boolean, default: true },
    order: Number
  }]
});

// Main Website Schema
const websiteSchema = new mongoose.Schema({
  // Basic Information
  websiteTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  tagline: {
    type: String,
    trim: true,
    maxlength: 200
  },
  specialty: {
    type: String,
    required: true,
    enum: [
      'cardiology', 'orthopedics', 'dermatology', 'pediatrics', 
      'gynecology', 'neurology', 'psychiatry', 'oncology', 
      'ophthalmology', 'dentistry', 'urology', 'endocrinology', 
      'general medicine'
    ],
    index: true
  },
  
  // Enhanced Content Structure for Frontend
  content: {
    header: headerSchema,
    hero: enhancedHeroSectionSchema,
    about: enhancedAboutSectionSchema,
    services: [enhancedServiceSchema],
    contact: enhancedContactSchema,
    footer: footerSchema
  },
  
  // Content Sections
  heroSection: {
    type: heroSectionSchema,
    required: true
  },
  aboutSection: {
    type: aboutSectionSchema,
    required: true
  },
  services: {
    type: [serviceSchema],
    validate: {
      validator: function(services) {
        return services.length >= 1 && services.length <= 10;
      },
      message: 'Services must contain between 1 and 10 items'
    }
  },
  contactInfo: {
    type: contactInfoSchema,
    required: true
  },
  
  // SEO and Marketing
  seoMeta: {
    type: seoMetaSchema,
    required: true
  },
  
  // Generation Data
  originalTranscription: {
    type: String,
    required: true
  },
  generationMetadata: {
    type: generationMetadataSchema,
    required: true
  },
  
  // Transcription tracking
  transcriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transcription',
    index: true
  },
  assemblyJobId: {
    type: String,
    index: true
  },
  transcriptionSource: {
    type: String,
    enum: ['manual', 'audio_transcription', 'imported'],
    default: 'manual'
  },
  
  // Template Generation Fields
  generatedHtml: {
    type: String,
    required: false
  },
  templateName: {
    type: String,
    required: false
  },
  lastGenerated: {
    type: Date,
    required: false
  },
  
  // Customization
  customizations: {
    type: customizationSchema,
    default: () => ({})
  },
  
  // Content Variations
  contentVariations: [contentVariationSchema],
  
  // Content History for undo/redo functionality
  contentHistory: [contentHistorySchema],
  
  // Auto-save data
  autoSaveData: autoSaveSchema,
  
  // Image management
  images: [imageSchema],
  
  // User and Status
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  
  // Quality and Performance
  qualityScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  contentFeatures: [{
    type: String,
    enum: [
      'comprehensive-services', 'detailed-highlights', 'seo-optimized',
      'compelling-hero', 'professional-fallback', 'template-based'
    ]
  }],
  
  // Versioning
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    content: mongoose.Schema.Types.Mixed,
    createdAt: Date
  }],
  
  // Analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    generatedViews: {
      type: Number,
      default: 0
    },
    exportCount: {
      type: Number,
      default: 0
    }
  },
  
  // Flags
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  publishedAt: Date,
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Content Template Schema (for reusable templates)
const contentTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  specialty: {
    type: String,
    required: true,
    enum: [
      'cardiology', 'orthopedics', 'dermatology', 'pediatrics', 
      'gynecology', 'neurology', 'psychiatry', 'oncology', 
      'ophthalmology', 'dentistry', 'urology', 'endocrinology', 
      'general medicine'
    ],
    index: true
  },
  template: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  }
}, {
  timestamps: true
});

// Website Generation History Schema
const generationHistorySchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['generated', 'regenerated', 'updated', 'published', 'archived'],
    required: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed
  },
  previousVersion: {
    type: mongoose.Schema.Types.Mixed
  },
  metadata: {
    aiModel: String,
    processingTime: Number,
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
websiteSchema.index({ userId: 1, specialty: 1 });
websiteSchema.index({ userId: 1, status: 1 });
websiteSchema.index({ userId: 1, createdAt: -1 });
websiteSchema.index({ specialty: 1, isPublic: 1 });
websiteSchema.index({ qualityScore: -1 });

contentTemplateSchema.index({ specialty: 1, isActive: 1 });
contentTemplateSchema.index({ createdBy: 1 });
contentTemplateSchema.index({ usageCount: -1 });

generationHistorySchema.index({ websiteId: 1, createdAt: -1 });
generationHistorySchema.index({ userId: 1, action: 1 });

// Virtual for full contact address
websiteSchema.virtual('contactInfo.fullAddress').get(function() {
  if (this.contactInfo) {
    const parts = [
      this.contactInfo.address,
      this.contactInfo.city,
      this.contactInfo.state,
      this.contactInfo.zipCode
    ].filter(Boolean);
    return parts.join(', ');
  }
  return '';
});

// Virtual for services count
websiteSchema.virtual('servicesCount').get(function() {
  return this.services ? this.services.length : 0;
});

// Virtual for content completeness
websiteSchema.virtual('contentCompleteness').get(function() {
  let score = 0;
  let maxScore = 0;
  
  // Check required sections
  if (this.heroSection) score += 20;
  maxScore += 20;
  
  if (this.aboutSection && this.aboutSection.content) score += 20;
  maxScore += 20;
  
  if (this.services && this.services.length > 0) score += 20;
  maxScore += 20;
  
  if (this.contactInfo && this.contactInfo.phone && this.contactInfo.email) score += 20;
  maxScore += 20;
  
  if (this.seoMeta && this.seoMeta.title && this.seoMeta.description) score += 20;
  maxScore += 20;
  
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
});

// Pre-save middleware
websiteSchema.pre('save', function(next) {
  this.lastModified = new Date();
  
  // Auto-increment version on content changes
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  
  next();
});

// Post-save middleware for analytics
websiteSchema.post('save', function(doc, next) {
  if (doc.isModified('analytics.views')) {
    // Could trigger analytics events here
  }
  next();
});

// Instance methods
websiteSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  return this.save();
};

websiteSchema.methods.updateQualityScore = function() {
  // Calculate quality score based on content completeness
  const completeness = this.contentCompleteness;
  const servicesQuality = this.services.length >= 4 ? 0.2 : 0.1;
  const seoQuality = this.seoMeta.keywords.length >= 5 ? 0.2 : 0.1;
  
  this.qualityScore = Math.min(1, (completeness / 100) * 0.6 + servicesQuality + seoQuality);
  return this.save();
};

websiteSchema.methods.createVersion = function() {
  this.previousVersions.push({
    version: this.version,
    content: this.toObject(),
    createdAt: new Date()
  });
  
  // Keep only last 5 versions
  if (this.previousVersions.length > 5) {
    this.previousVersions = this.previousVersions.slice(-5);
  }
  
  return this.save();
};

// Static methods
websiteSchema.statics.findBySpecialty = function(specialty, limit = 10) {
  return this.find({ specialty, isActive: true, isPublic: true })
    .sort({ qualityScore: -1, createdAt: -1 })
    .limit(limit);
};

websiteSchema.statics.getPopularSpecialties = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$specialty', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
};

websiteSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalWebsites: { $sum: 1 },
        avgQualityScore: { $avg: '$qualityScore' },
        specialties: { $addToSet: '$specialty' },
        published: {
          $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Create models
const Website = mongoose.model('Website', websiteSchema);
const ContentTemplate = mongoose.model('ContentTemplate', contentTemplateSchema);
const ContentVariation = mongoose.model('ContentVariation', contentVariationSchema);
const GenerationHistory = mongoose.model('GenerationHistory', generationHistorySchema);

export { 
  Website, 
  ContentTemplate, 
  ContentVariation, 
  GenerationHistory 
};