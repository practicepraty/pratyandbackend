import mongoose from "mongoose"
import bcrypt from "bcrypt" // or "bcrypt"
import jwt from "jsonwebtoken"

const UserSchema = new mongoose.Schema({

  // Personal Information
  personalInfo: {
    title: {
      type: String,
      required: [true, 'Title is required'],
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
  type:String,
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
      select: false // Don't include password in queries by default
    },
    refreshToken: {
      type: String,
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

UserSchema.pre("save", async function (next) {
    if(!this.isModified("accountInfo.password")) return next(); // Fixed: correct path

    this.accountInfo.password = await bcrypt.hash(this.accountInfo.password, 10) // Fixed: correct path
    next()
})

UserSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.accountInfo.password) // Fixed: correct path
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