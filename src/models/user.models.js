import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import argon2 from "argon2"
import { encryptData, decryptData } from "../middlewares/security.middleware.js"

const UserSchema = new mongoose.Schema({

  // Personal Information
  personalInfo: {
    title: {
      type: String,
      required: false, // Make title optional since it's not always provided
      enum: ['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.'],
      trim: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    fullName: {
      type: String,
      // Auto-generated from firstName and lastName
    },
    professionalEmail: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      validate: {
        validator: function(v) {
          return /^\+?[\d\s\-\(\)]{10,}$/.test(v);
        },
        message: 'Please provide a valid phone number'
      }
    },
    dateOfBirth: {
      type: String,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    profilePhoto: {
      type: String // from cloudinary
    }
  },

  // Professional Information
  professionalInfo: {
    specialty: {
      type: String,
      required: [true, 'Medical specialty is required'],
      enum: [
        'general-practice', 'internal-medicine', 'cardiology', 'dermatology',
        'neurology', 'orthopedics', 'pediatrics', 'psychiatry', 'surgery',
        'oncology', 'radiology', 'emergency-medicine', 'anesthesiology',
        'pathology', 'ophthalmology', 'otolaryngology', 'urology',
        'obstetrics-gynecology', 'family-medicine', 'infectious-disease',
        'pulmonology', 'nephrology', 'endocrinology', 'gastroenterology',
        'rheumatology', 'hematology', 'plastic-surgery', 'other'
      ]
    },
    subSpecialty: {
      type: String,
      trim: true,
      maxlength: [100, 'Sub-specialty cannot exceed 100 characters']
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      trim: true,
      unique: true,
      index: true
    },
    licenseState: {
      type: String,
      required: [true, 'License state is required'],
      trim: true
    },
    licenseExpiryDate: {
      type: Date,
      required: false
    },
    yearsOfExperience: {
      type: String,
      required: [true, 'Years of experience is required'],
      enum: ['0-2', '3-5', '6-10', '11-15', '16-20', '20+']
    },
    medicalSchool: {
      type: String,
      required: [true, 'Medical school is required'],
      trim: true,
      maxlength: [200, 'Medical school name cannot exceed 200 characters']
    },
    graduationYear: {
      type: Number,
      min: [1950, 'Graduation year must be after 1950'],
      max: [new Date().getFullYear(), 'Graduation year cannot be in the future']
    },
    residency: {
      program: String,
      institution: String,
      completionYear: Number
    },
    fellowship: {
      program: String,
      institution: String,
      completionYear: Number
    },
    boardCertifications: [{
      board: String,
      certification: String,
      certificationDate: Date,
      expiryDate: Date
    }],
    cv: {
      type: String //from cloudinary
    }
  },

  // Practice Information
  practiceInfo: {
    practiceType: {
      type: String,
      required: [true, 'Practice type is required'],
      enum: [
        'private-practice', 'hospital', 'clinic', 'academic-medical-center',
        'group-practice', 'telemedicine', 'government-hospital',
        'community-health-center', 'urgent-care', 'other'
      ]
    },
    institutionName: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      maxlength: [201, 'Institution name cannot exceed 200 characters']
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
      },
      zipCode: {
        type: String,
        required: [true, 'ZIP code is required'],
        trim: true,

      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        default: 'IN' // Default to India
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    officeHours: {
      monday: { start: String, end: String, closed: { type: Boolean, default: false } },
      tuesday: { start: String, end: String, closed: { type: Boolean, default: false } },
      wednesday: { start: String, end: String, closed: { type: Boolean, default: false } },
      thursday: { start: String, end: String, closed: { type: Boolean, default: false } },
      friday: { start: String, end: String, closed: { type: Boolean, default: false } },
      saturday: { start: String, end: String, closed: { type: Boolean, default: true } },
      sunday: { start: String, end: String, closed: { type: Boolean, default: true } }
    },
    languages: [{
      type: String,
      trim: true
    }],
    insuranceAccepted: [{
      type: String,
      trim: true
    }]
  },

  // Account Information
  accountInfo: {
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
      validate: {
        validator: function(v) {
          // More flexible password: min 8 chars, at least one letter and one number
          return /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(v);
        },
        message: 'Password must contain at least 8 characters with at least one letter and one number'
      }
    },
    refreshToken: {
      type: String,
      select: false
    },
    // Password Recovery
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    passwordResetUsed: {
      type: Boolean,
      default: false,
      select: false
    },
    // MFA Configuration
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: {
      type: String,
      select: false
    },
    mfaBackupCodes: {
      type: [String],
      select: false
    },
    mfaSetupDate: {
      type: Date
    },
    // Security Settings
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date
    },
    lastLogin: {
      type: Date
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now
    },
    passwordHistory: {
      type: [String],
      select: false,
      default: []
    },
    // Session Management
    activeSessions: [{
      sessionId: String,
      deviceInfo: String,
      ipAddress: String,
      createdAt: { type: Date, default: Date.now },
      lastAccessed: { type: Date, default: Date.now }
    }],
    // Consent and Privacy
    consentGiven: {
      type: Boolean,
      default: false
    },
    consentDate: {
      type: Date
    },
    privacyPolicyAccepted: {
      type: Boolean,
      default: false
    },
    privacyPolicyDate: {
      type: Date
    },
    // Data retention
    dataRetentionConsent: {
      type: Boolean,
      default: true
    },
    accountDeletionRequested: {
      type: Boolean,
      default: false
    },
    accountDeletionDate: {
      type: Date
    }
  }
},
{
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

UserSchema.pre("save", async function (next) {
    if(!this.isModified("accountInfo.password")) return next();

    // Store previous password in history
    if (this.accountInfo.password && this.isModified("accountInfo.password")) {
      if (!this.accountInfo.passwordHistory) {
        this.accountInfo.passwordHistory = [];
      }
      // Keep last 5 passwords
      if (this.accountInfo.passwordHistory.length >= 5) {
        this.accountInfo.passwordHistory.shift();
      }
      this.accountInfo.passwordHistory.push(this.accountInfo.password);
    }

    // Use Argon2 for password hashing (more secure than bcrypt)
    this.accountInfo.password = await argon2.hash(this.accountInfo.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
    
    this.accountInfo.lastPasswordChange = new Date();
    next();
})

UserSchema.methods.generatePasswordResetToken = function() {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to passwordResetToken field
  this.accountInfo.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiry (15 minutes from now)
  this.accountInfo.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  this.accountInfo.passwordResetUsed = false;
  
  // Return unhashed token (this will be sent via email)
  return resetToken;
};

UserSchema.methods.verifyPasswordResetToken = function(token) {
  // Hash the provided token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Check if token matches and hasn't expired
  return (
    this.accountInfo.passwordResetToken === hashedToken &&
    this.accountInfo.passwordResetExpires > Date.now() &&
    !this.accountInfo.passwordResetUsed
  );
};

UserSchema.methods.isPasswordCorrect = async function(password){
    try {
      return await argon2.verify(this.accountInfo.password, password);
    } catch (error) {
      return false;
    }
}

// Check if password was used before
UserSchema.methods.isPasswordReused = async function(password) {
  if (!this.accountInfo.passwordHistory) return false;
  
  for (const oldPassword of this.accountInfo.passwordHistory) {
    try {
      const isMatch = await argon2.verify(oldPassword, password);
      if (isMatch) return true;
    } catch (error) {
      continue;
    }
  }
  return false;
}

// Account lockout methods
UserSchema.methods.isAccountLocked = function() {
  return !!(this.accountInfo.lockUntil && this.accountInfo.lockUntil > Date.now());
}

UserSchema.methods.incLoginAttempts = async function() {
  if (this.accountInfo.lockUntil && this.accountInfo.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'accountInfo.lockUntil': 1 },
      $set: { 'accountInfo.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'accountInfo.loginAttempts': 1 } };
  
  if (this.accountInfo.loginAttempts + 1 >= 5 && !this.accountInfo.lockUntil) {
    updates.$set = { 'accountInfo.lockUntil': Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }
  
  return this.updateOne(updates);
}

UserSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: { 'accountInfo.loginAttempts': 1, 'accountInfo.lockUntil': 1 }
  });
}

UserSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {
      _id: this._id,
      professionalEmail: this.personalInfo.professionalEmail,
      firstName: this.personalInfo.firstName,
      lastName: this.personalInfo.lastName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

UserSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

export const User = mongoose.model('User', UserSchema);