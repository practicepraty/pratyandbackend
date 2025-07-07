// src/models/website.models.js
import mongoose, { Schema } from "mongoose";

// Content section schema for reusable content blocks
const contentSectionSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['hero', 'about', 'services', 'contact', 'testimonials', 'gallery']
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    metadata: {
        type: Map,
        of: Schema.Types.Mixed
    }
});

// Service schema for medical services
const serviceSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: "medical-icon"
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

// SEO metadata schema
const seoMetaSchema = new Schema({
    title: {
        type: String,
        required: true,
        maxlength: 60
    },
    description: {
        type: String,
        required: true,
        maxlength: 160
    },
    keywords: [{
        type: String
    }],
    ogImage: {
        type: String
    },
    canonicalUrl: {
        type: String
    }
});

// Contact information schema
const contactInfoSchema = new Schema({
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    hours: {
        type: String,
        required: true
    },
    website: {
        type: String
    },
    socialMedia: {
        facebook: String,
        twitter: String,
        instagram: String,
        linkedin: String
    }
});

// Main website schema
const websiteSchema = new Schema({
    // Basic Information
    websiteTitle: {
        type: String,
        required: true,
        trim: true
    },
    tagline: {
        type: String,
        required: true,
        trim: true
    },
    specialty: {
        type: String,
        required: true,
        lowercase: true
    },
    
    // Content Sections
    heroSection: {
        headline: {
            type: String,
            required: true
        },
        subheadline: {
            type: String,
            required: true
        },
        ctaText: {
            type: String,
            default: "Schedule Appointment"
        },
        backgroundImage: {
            type: String
        }
    },
    
    aboutSection: {
        title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        highlights: [{
            type: String
        }],
        image: {
            type: String
        }
    },
    
    // Services
    services: [serviceSchema],
    
    // Contact Information
    contactInfo: contactInfoSchema,
    
    // SEO
    seoMeta: seoMetaSchema,
    
    // Generation Details
    originalTranscription: {
        type: String,
        required: true
    },
    
    // User Association
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    // Status and Metadata
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Customization
    customizations: {
        theme: {
            primaryColor: {
                type: String,
                default: "#007bff"
            },
            secondaryColor: {
                type: String,
                default: "#6c757d"
            },
            fontFamily: {
                type: String,
                default: "Arial, sans-serif"
            }
        },
        layout: {
            header: {
                type: String,
                default: "default"
            },
            footer: {
                type: String,
                default: "default"
            }
        }
    },
    
    // Generation Metadata
    generationMetadata: {
        aiModel: {
            type: String,
            default: "anthropic.claude-3-sonnet-20240229-v1:0"
        },
        processingTime: {
            type: Number // in milliseconds
        },
        fallbackUsed: {
            type: Boolean,
            default: false
        },
        confidenceScore: {
            type: Number,
            min: 0,
            max: 1
        }
    }
    
}, {
    timestamps: true
});

// Indexes for better performance
websiteSchema.index({ userId: 1, createdAt: -1 });
websiteSchema.index({ specialty: 1 });
websiteSchema.index({ status: 1 });
websiteSchema.index({ isActive: 1 });

// Content variation schema for A/B testing
const contentVariationSchema = new Schema({
    websiteId: {
        type: Schema.Types.ObjectId,
        ref: "Website",
        required: true
    },
    variationName: {
        type: String,
        required: true
    },
    content: {
        type: Schema.Types.Mixed,
        required: true
    },
    performance: {
        views: {
            type: Number,
            default: 0
        },
        clicks: {
            type: Number,
            default: 0
        },
        conversions: {
            type: Number,
            default: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Content template schema for reusable templates
const contentTemplateSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    specialty: {
        type: String,
        required: true
    },
    template: {
        type: Schema.Types.Mixed,
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: String,
        default: "system"
    }
}, {
    timestamps: true
});

// Virtual for website URL
websiteSchema.virtual('websiteUrl').get(function() {
    return `/websites/${this._id}`;
});

// Virtual for total services count
websiteSchema.virtual('serviceCount').get(function() {
    return this.services.length;
});

// Methods
websiteSchema.methods.generateSlug = function() {
    return this.websiteTitle.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
};

websiteSchema.methods.addService = function(serviceData) {
    this.services.push(serviceData);
    return this.save();
};

websiteSchema.methods.updateService = function(serviceId, updateData) {
    const service = this.services.id(serviceId);
    if (service) {
        Object.assign(service, updateData);
        return this.save();
    }
    throw new Error('Service not found');
};

websiteSchema.methods.removeService = function(serviceId) {
    this.services.id(serviceId).remove();
    return this.save();
};

// Static methods
websiteSchema.statics.findBySpecialty = function(specialty) {
    return this.find({ specialty: specialty.toLowerCase(), isActive: true });
};

websiteSchema.statics.findByUser = function(userId) {
    return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

websiteSchema.statics.getActiveWebsites = function() {
    return this.find({ isActive: true, status: 'published' });
};

// Pre-save middleware
websiteSchema.pre('save', function(next) {
    // Auto-generate SEO title if not provided
    if (!this.seoMeta.title) {
        this.seoMeta.title = `${this.websiteTitle} - ${this.specialty} Specialist`;
    }
    
    // Auto-generate SEO description if not provided
    if (!this.seoMeta.description) {
        this.seoMeta.description = `Professional ${this.specialty} services. ${this.tagline}`;
    }
    
    next();
});

export const Website = mongoose.model("Website", websiteSchema);
export const ContentVariation = mongoose.model("ContentVariation", contentVariationSchema);
export const ContentTemplate = mongoose.model("ContentTemplate", contentTemplateSchema);