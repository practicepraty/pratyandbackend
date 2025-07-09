// src/middleware/validation.js
import { body, validationResult } from 'express-validator';
import { ApiError } from '../utils/apierror.js';

// Validation middleware for website updates
export const validateWebsiteUpdate = [
    body('websiteTitle')
        .optional()
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Website title must be between 1 and 100 characters'),
    
    body('tagline')
        .optional()
        .isString()
        .isLength({ max: 200 })
        .withMessage('Tagline must not exceed 200 characters'),
    
    body('heroSection.headline')
        .optional()
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Hero headline must be between 1 and 200 characters'),
    
    body('heroSection.subheadline')
        .optional()
        .isString()
        .isLength({ max: 300 })
        .withMessage('Hero subheadline must not exceed 300 characters'),
    
    body('aboutSection.title')
        .optional()
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('About title must be between 1 and 100 characters'),
    
    body('aboutSection.content')
        .optional()
        .isString()
        .isLength({ min: 1, max: 2000 })
        .withMessage('About content must be between 1 and 2000 characters'),
    
    body('services')
        .optional()
        .isArray({ min: 1, max: 10 })
        .withMessage('Services must be an array with 1-10 items'),
    
    body('services.*.name')
        .optional()
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Service name must be between 1 and 100 characters'),
    
    body('services.*.description')
        .optional()
        .isString()
        .isLength({ min: 1, max: 500 })
        .withMessage('Service description must be between 1 and 500 characters'),
    
    body('contactInfo.phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    
    body('contactInfo.email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    
    body('contactInfo.address')
        .optional()
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Address must be between 1 and 200 characters'),
    
    body('seoMeta.title')
        .optional()
        .isString()
        .isLength({ min: 1, max: 60 })
        .withMessage('SEO title must be between 1 and 60 characters'),
    
    body('seoMeta.description')
        .optional()
        .isString()
        .isLength({ min: 1, max: 160 })
        .withMessage('SEO description must be between 1 and 160 characters'),
    
    body('seoMeta.keywords')
        .optional()
        .isArray()
        .withMessage('SEO keywords must be an array'),
    
    body('customizations.theme')
        .optional()
        .isIn(['modern', 'classic', 'minimal', 'professional'])
        .withMessage('Theme must be one of: modern, classic, minimal, professional'),
    
    body('customizations.colorScheme.primary')
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage('Primary color must be a valid hex color'),
    
    body('customizations.colorScheme.secondary')
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage('Secondary color must be a valid hex color'),
    
    body('customizations.colorScheme.accent')
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage('Accent color must be a valid hex color'),
    
    body('customizations.colorScheme.background')
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage('Background color must be a valid hex color'),
    
    body('customizations.typography.fontSize')
        .optional()
        .isIn(['small', 'medium', 'large'])
        .withMessage('Font size must be one of: small, medium, large'),
    
    body('customizations.layout.headerStyle')
        .optional()
        .isIn(['fixed', 'static', 'transparent'])
        .withMessage('Header style must be one of: fixed, static, transparent'),
    
    body('customizations.layout.footerStyle')
        .optional()
        .isIn(['simple', 'detailed', 'minimal'])
        .withMessage('Footer style must be one of: simple, detailed, minimal'),
    
    body('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('Status must be one of: draft, published, archived'),
    
    // Validation result handler
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }));
            
            throw new ApiError(400, 'Validation failed', errorMessages);
        }
        next();
    }
];

// Validation middleware for website creation
export const validateWebsiteCreation = [
    body('websiteTitle')
        .notEmpty()
        .withMessage('Website title is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Website title must be between 1 and 100 characters'),
    
    body('specialty')
        .notEmpty()
        .withMessage('Specialty is required')
        .isIn([
            'cardiology', 'orthopedics', 'dermatology', 'pediatrics', 
            'gynecology', 'neurology', 'psychiatry', 'oncology', 
            'ophthalmology', 'dentistry', 'urology', 'endocrinology', 
            'general medicine'
        ])
        .withMessage('Invalid specialty'),
    
    body('originalTranscription')
        .notEmpty()
        .withMessage('Original transcription is required')
        .isString()
        .isLength({ min: 10 })
        .withMessage('Transcription must be at least 10 characters'),
    
    body('heroSection.headline')
        .notEmpty()
        .withMessage('Hero headline is required')
        .isLength({ min: 1, max: 200 })
        .withMessage('Hero headline must be between 1 and 200 characters'),
    
    body('aboutSection.title')
        .notEmpty()
        .withMessage('About title is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('About title must be between 1 and 100 characters'),
    
    body('aboutSection.content')
        .notEmpty()
        .withMessage('About content is required')
        .isLength({ min: 1, max: 2000 })
        .withMessage('About content must be between 1 and 2000 characters'),
    
    body('services')
        .isArray({ min: 1, max: 10 })
        .withMessage('At least one service is required, maximum 10 allowed'),
    
    body('contactInfo.phone')
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    
    body('contactInfo.email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address'),
    
    body('contactInfo.address')
        .notEmpty()
        .withMessage('Address is required')
        .isLength({ min: 1, max: 200 })
        .withMessage('Address must be between 1 and 200 characters'),
    
    body('seoMeta.title')
        .notEmpty()
        .withMessage('SEO title is required')
        .isLength({ min: 1, max: 60 })
        .withMessage('SEO title must be between 1 and 60 characters'),
    
    body('seoMeta.description')
        .notEmpty()
        .withMessage('SEO description is required')
        .isLength({ min: 1, max: 160 })
        .withMessage('SEO description must be between 1 and 160 characters'),
    
    // Validation result handler
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }));
            
            throw new ApiError(400, 'Validation failed', errorMessages);
        }
        next();
    }
];

// Validation middleware for bulk operations
export const validateBulkWebsiteOperation = [
    body('websiteIds')
        .isArray({ min: 1, max: 20 })
        .withMessage('Website IDs must be an array with 1-20 items'),
    
    body('websiteIds.*')
        .isMongoId()
        .withMessage('Each website ID must be a valid MongoDB ObjectId'),
    
    // Validation result handler
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }));
            
            throw new ApiError(400, 'Validation failed', errorMessages);
        }
        next();
    }
];

// Validation middleware for publishing
export const validatePublishWebsite = [
    body('versionNumber')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Version number must be a positive integer'),
    
    body('publishMessage')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Publish message must not exceed 500 characters'),
    
    // Validation result handler
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }));
            
            throw new ApiError(400, 'Validation failed', errorMessages);
        }
        next();
    }
];

// General validation helper functions
export const validateObjectId = (id) => {
    const mongoose = require('mongoose');
    return mongoose.Types.ObjectId.isValid(id);
};

export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone);
};

export const validateUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

export const validateHexColor = (color) => {
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    return hexColorRegex.test(color);
};

// Sanitization helpers
export const sanitizeHtml = (html) => {
    // Basic HTML sanitization - in production use a proper library like DOMPurify
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/on\w+\s*=\s*'[^']*'/gi, '')
        .replace(/javascript:/gi, '');
};

export const sanitizeText = (text) => {
    return text
        .replace(/[<>]/g, '')
        .trim();
};

export const sanitizeEmail = (email) => {
    return email.toLowerCase().trim();
};

export const sanitizePhone = (phone) => {
    return phone.replace(/[^\d\+\-\(\)\s]/g, '');
};