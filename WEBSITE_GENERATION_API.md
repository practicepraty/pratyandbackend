# Website Generation API Documentation

## Overview

The Website Generation API provides a complete pipeline for generating medical practice websites from audio transcriptions. The system combines AI content generation, template rendering, and responsive design to create professional medical websites.

## Base URL

```
/api/v1/website-generation
```

## Authentication

All protected endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

## Endpoints

### 1. Generate Website

**POST** `/generate-website`

Generate a complete website from transcribed audio content.

**Request Body:**
```json
{
  "transcribedContent": "string (required) - Audio transcription of medical practice description",
  "specialty": "string (optional) - Medical specialty (auto-detected if not provided)",
  "customizations": {
    "colors": {
      "primary": "#2563eb",
      "secondary": "#64748b",
      "accent": "#10b981",
      "background": "#ffffff",
      "text": "#1f2937"
    },
    "fonts": {
      "headingFont": "Inter",
      "bodyFont": "Inter",
      "fontSize": "medium"
    },
    "layout": {
      "headerStyle": "static",
      "footerStyle": "detailed",
      "sidebarEnabled": false
    },
    "features": {
      "appointmentBooking": false,
      "liveChat": false,
      "testimonials": true,
      "blog": false,
      "newsletter": false
    }
  },
  "saveToDatabase": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Website generated successfully",
  "data": {
    "websiteId": "string",
    "websiteData": {
      "html": "string - Complete HTML website",
      "css": "string - Complete CSS styles",
      "metadata": {
        "generatedAt": "ISO datetime",
        "processingTime": "number - milliseconds",
        "specialty": "string",
        "templateName": "string",
        "qualityScore": "number (0-1)",
        "features": ["array of features"]
      },
      "sections": {
        "header": {...},
        "hero": {...},
        "about": {...},
        "services": {...},
        "contact": {...},
        "footer": {...}
      },
      "customizations": {...},
      "previewUrl": "string"
    },
    "specialtyInfo": {
      "specialty": "string",
      "confidence": "number (0-1)",
      "method": "string - detection method used"
    },
    "recommendations": [
      {
        "type": "string",
        "priority": "string",
        "message": "string",
        "action": "string"
      }
    ]
  }
}
```

### 2. Generate Website Preview

**POST** `/websites/:websiteId/preview`

Generate a preview of an existing website with updated customizations.

**Request Body:**
```json
{
  "customizations": {
    "colors": {...},
    "fonts": {...},
    "layout": {...}
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Website preview generated successfully",
  "data": {
    "html": "string - Preview HTML",
    "css": "string - Preview CSS",
    "metadata": {...},
    "websiteId": "string",
    "previewGenerated": true
  }
}
```

### 3. Get Website Preview

**GET** `/websites/:websiteId/preview`

Retrieve the HTML preview of a website.

**Response:** HTML content (Content-Type: text/html)

### 4. Update Website Customizations

**PUT** `/websites/:websiteId/customize`

Update the customizations of an existing website.

**Request Body:**
```json
{
  "customizations": {
    "colors": {...},
    "fonts": {...},
    "layout": {...},
    "features": {...}
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Website customizations updated successfully",
  "data": {
    "websiteId": "string",
    "customizations": {...},
    "html": "string - Updated HTML",
    "metadata": {
      "updatedAt": "ISO datetime",
      "version": "number"
    }
  }
}
```

### 5. Regenerate Website Section

**POST** `/websites/:websiteId/regenerate/:section`

Regenerate a specific section of the website.

**Valid sections:** `heroSection`, `aboutSection`, `services`, `contactInfo`

**Request Body:**
```json
{
  "options": {
    "tone": "professional",
    "focus": "trust-building"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "heroSection regenerated successfully",
  "data": {
    "websiteId": "string",
    "updatedSection": "string",
    "newContent": {...},
    "html": "string - Updated HTML",
    "metadata": {
      "regeneratedAt": "ISO datetime",
      "version": "number"
    }
  }
}
```

### 6. Export Website Data

**GET** `/websites/:websiteId/export?format=html`

Export website data in various formats.

**Query Parameters:**
- `format` - Export format (`html`, `json`, `pdf`)

**Response:** File download with appropriate Content-Type

### 7. Validate Website Data

**POST** `/websites/:websiteId/validate`

Validate website data for completeness and quality.

**Response:**
```json
{
  "success": true,
  "message": "Website validation completed",
  "data": {
    "completeness": "number (0-100)",
    "qualityScore": "number (0-1)",
    "seoScore": "number (0-1)",
    "accessibilityScore": "number (0-1)",
    "errors": ["array of error messages"],
    "warnings": ["array of warning messages"],
    "recommendations": ["array of improvement suggestions"]
  }
}
```

### 8. Get Website Generation History

**GET** `/websites/:websiteId/history?limit=10&offset=0`

Get the generation history of a website.

**Query Parameters:**
- `limit` - Number of records to return (default: 10)
- `offset` - Number of records to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "message": "Generation history retrieved successfully",
  "data": {
    "history": [
      {
        "action": "string",
        "changes": {...},
        "metadata": {...},
        "createdAt": "ISO datetime"
      }
    ],
    "pagination": {
      "total": "number",
      "limit": "number",
      "offset": "number",
      "hasMore": "boolean"
    }
  }
}
```

### 9. Duplicate Website

**POST** `/websites/:websiteId/duplicate`

Create a copy of an existing website.

**Request Body:**
```json
{
  "newTitle": "string (optional) - Title for the duplicated website"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Website duplicated successfully",
  "data": {
    "websiteId": "string - New website ID",
    "title": "string - New website title",
    "originalId": "string - Original website ID"
  }
}
```

### 10. Get Website Statistics

**GET** `/websites/:websiteId/stats`

Get comprehensive statistics about a website.

**Response:**
```json
{
  "success": true,
  "message": "Website statistics retrieved successfully",
  "data": {
    "website": {
      "title": "string",
      "specialty": "string",
      "status": "string",
      "version": "number",
      "qualityScore": "number",
      "completeness": "number",
      "createdAt": "ISO datetime",
      "lastModified": "ISO datetime"
    },
    "analytics": {
      "views": "number",
      "generatedViews": "number",
      "exportCount": "number",
      "lastViewed": "ISO datetime"
    },
    "history": {
      "totalActions": "number",
      "lastAction": "string",
      "lastActionDate": "ISO datetime",
      "actionBreakdown": {...}
    },
    "content": {
      "servicesCount": "number",
      "keywordsCount": "number",
      "contentFeatures": ["array"],
      "hasLogo": "boolean",
      "hasCertifications": "boolean"
    },
    "technical": {
      "templateName": "string",
      "hasGeneratedHtml": "boolean",
      "fallbackUsed": "boolean",
      "processingTime": "number",
      "aiModel": "string"
    }
  }
}
```

## Medical Specialties Supported

- `general-practice` - Family Medicine
- `dentistry` - Dental Care
- `dermatology` - Skin Care
- `cardiology` - Heart Care
- `pediatrics` - Children's Medicine
- `orthopedics` - Bone and Joint Care
- `gynecology` - Women's Health
- `neurology` - Brain and Nervous System
- `psychiatry` - Mental Health
- `oncology` - Cancer Care
- `ophthalmology` - Eye Care
- `urology` - Urinary System
- `endocrinology` - Hormones and Metabolism

## Error Codes

- `400` - Bad Request (invalid input data)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server-side error)
- `501` - Not Implemented (feature not available)

## Rate Limits

- **Website Generation:** 10 requests per minute per user
- **Preview Generation:** 30 requests per minute per user
- **Other Operations:** 100 requests per minute per user

## Example Usage

### Generate a Dental Practice Website

```bash
curl -X POST http://localhost:3000/api/v1/website-generation/generate-website \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "transcribedContent": "Welcome to Bright Smile Dental Care! I am Dr. Sarah Johnson, a general dentist with over 10 years of experience. We provide comprehensive dental services including cleanings, fillings, crowns, and cosmetic procedures. Our modern facility uses the latest technology to ensure comfortable treatment.",
    "specialty": "dentistry",
    "customizations": {
      "colors": {
        "primary": "#0ea5e9",
        "accent": "#06b6d4"
      },
      "features": {
        "appointmentBooking": true,
        "testimonials": true
      }
    }
  }'
```

### Update Website Colors

```bash
curl -X PUT http://localhost:3000/api/v1/website-generation/websites/WEBSITE_ID/customize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customizations": {
      "colors": {
        "primary": "#dc2626",
        "secondary": "#64748b",
        "accent": "#ea580c"
      }
    }
  }'
```

### Export Website as HTML

```bash
curl -X GET "http://localhost:3000/api/v1/website-generation/websites/WEBSITE_ID/export?format=html" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o website.html
```

## Integration with Existing APIs

The Website Generation API integrates seamlessly with:

- **AI API** (`/api/v1/ai`) - For content generation and specialty detection
- **Template API** (`/api/v1/templates`) - For template management and rendering
- **User API** (`/api/v1/users`) - For authentication and user management

## Best Practices

1. **Input Validation:** Always validate transcribed content length (20-10,000 characters)
2. **Error Handling:** Implement proper error handling for all API calls
3. **Caching:** Cache generated previews for better performance
4. **Rate Limiting:** Respect API rate limits to avoid throttling
5. **Security:** Never expose JWT tokens in client-side code
6. **Optimization:** Use appropriate image formats and sizes for better performance

## Support

For technical support and questions about the Website Generation API, please contact the development team or refer to the main project documentation.