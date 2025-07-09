// src/utils/urlGenerator.js
import crypto from 'crypto';

// Generate public URL for published website
export const generatePublicUrl = (websiteId, versionNumber = null) => {
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://medical-websites.com';
    const shortId = generateShortId(websiteId);
    
    if (versionNumber) {
        return `${baseUrl}/sites/${shortId}/v${versionNumber}`;
    }
    
    return `${baseUrl}/sites/${shortId}`;
};

// Generate short ID from website ObjectId
export const generateShortId = (websiteId) => {
    const hash = crypto.createHash('md5').update(websiteId.toString()).digest('hex');
    return hash.substring(0, 8);
};

// Generate preview URL for draft
export const generatePreviewUrl = (websiteId, versionNumber = null) => {
    const baseUrl = process.env.PREVIEW_BASE_URL || 'https://preview.medical-websites.com';
    const shortId = generateShortId(websiteId);
    
    if (versionNumber) {
        return `${baseUrl}/preview/${shortId}/v${versionNumber}`;
    }
    
    return `${baseUrl}/preview/${shortId}`;
};

// Generate admin URL for website management
export const generateAdminUrl = (websiteId) => {
    const baseUrl = process.env.ADMIN_BASE_URL || 'https://admin.medical-websites.com';
    return `${baseUrl}/websites/${websiteId}`;
};

// Generate sharing URL
export const generateSharingUrl = (websiteId, token = null) => {
    const baseUrl = process.env.SHARING_BASE_URL || 'https://share.medical-websites.com';
    const shortId = generateShortId(websiteId);
    
    if (token) {
        return `${baseUrl}/share/${shortId}?token=${token}`;
    }
    
    return `${baseUrl}/share/${shortId}`;
};

// Generate custom domain URL
export const generateCustomDomainUrl = (customDomain, path = '') => {
    const protocol = process.env.CUSTOM_DOMAIN_PROTOCOL || 'https';
    const fullPath = path ? `/${path}` : '';
    return `${protocol}://${customDomain}${fullPath}`;
};

// Generate API endpoint URL
export const generateApiUrl = (endpoint) => {
    const baseUrl = process.env.API_BASE_URL || 'https://api.medical-websites.com';
    return `${baseUrl}${endpoint}`;
};

// Generate QR code URL for website
export const generateQRCodeUrl = (websiteUrl) => {
    const qrService = process.env.QR_SERVICE_URL || 'https://api.qrserver.com/v1/create-qr-code/';
    const size = '200x200';
    const format = 'png';
    
    return `${qrService}?size=${size}&format=${format}&data=${encodeURIComponent(websiteUrl)}`;
};

// Generate sitemap URL
export const generateSitemapUrl = (websiteId) => {
    const publicUrl = generatePublicUrl(websiteId);
    return `${publicUrl}/sitemap.xml`;
};

// Generate RSS feed URL
export const generateRSSUrl = (websiteId) => {
    const publicUrl = generatePublicUrl(websiteId);
    return `${publicUrl}/rss.xml`;
};

// Generate robots.txt URL
export const generateRobotsUrl = (websiteId) => {
    const publicUrl = generatePublicUrl(websiteId);
    return `${publicUrl}/robots.txt`;
};

// Validate URL format
export const validateUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

// Extract domain from URL
export const extractDomain = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (error) {
        return null;
    }
};

// Generate secure token for temporary access
export const generateSecureToken = (data, expiresIn = '24h') => {
    const payload = {
        ...data,
        exp: Date.now() + (expiresIn === '24h' ? 24 * 60 * 60 * 1000 : parseInt(expiresIn))
    };
    
    return crypto.createHash('sha256')
        .update(JSON.stringify(payload) + process.env.JWT_SECRET)
        .digest('hex');
};

// Verify secure token
export const verifySecureToken = (token, data) => {
    try {
        const expectedToken = generateSecureToken(data);
        return token === expectedToken;
    } catch (error) {
        return false;
    }
};

// Generate URL-safe slug from title
export const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim('-'); // Remove leading/trailing hyphens
};

// Generate canonical URL
export const generateCanonicalUrl = (websiteId, path = '') => {
    const baseUrl = generatePublicUrl(websiteId);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};

// Generate social media sharing URLs
export const generateSocialUrls = (websiteUrl, title, description) => {
    const encodedUrl = encodeURIComponent(websiteUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);
    
    return {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`
    };
};

// Generate analytics tracking URLs
export const generateAnalyticsUrls = (websiteId) => {
    const publicUrl = generatePublicUrl(websiteId);
    
    return {
        googleAnalytics: `https://analytics.google.com/analytics/web/#/realtime/rt-overview/a{account-id}w{web-property-id}p{view-id}/`,
        googleSearchConsole: `https://search.google.com/search-console?resource=${encodeURIComponent(publicUrl)}`,
        bingWebmaster: `https://www.bing.com/webmaster/home/addsite?url=${encodeURIComponent(publicUrl)}`
    };
};

// Generate backup URLs
export const generateBackupUrls = (websiteId) => {
    const baseUrl = process.env.BACKUP_BASE_URL || 'https://backup.medical-websites.com';
    
    return {
        fullBackup: `${baseUrl}/backups/${websiteId}/full`,
        contentBackup: `${baseUrl}/backups/${websiteId}/content`,
        assetsBackup: `${baseUrl}/backups/${websiteId}/assets`,
        databaseBackup: `${baseUrl}/backups/${websiteId}/database`
    };
};

// URL utilities object
export const urlUtils = {
    generatePublicUrl,
    generateShortId,
    generatePreviewUrl,
    generateAdminUrl,
    generateSharingUrl,
    generateCustomDomainUrl,
    generateApiUrl,
    generateQRCodeUrl,
    generateSitemapUrl,
    generateRSSUrl,
    generateRobotsUrl,
    validateUrl,
    extractDomain,
    generateSecureToken,
    verifySecureToken,
    generateSlug,
    generateCanonicalUrl,
    generateSocialUrls,
    generateAnalyticsUrls,
    generateBackupUrls
};

export default urlUtils;