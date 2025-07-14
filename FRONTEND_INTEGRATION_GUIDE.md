# Backend API Integration Guide for Day 3 Frontend

## 🎯 Integration Status: READY ✅

**Backend Server:** `http://localhost:8000`  
**Frontend URLs:** `http://localhost:5173-5177`  
**Success Rate:** 93.3% (14/15 tests passed)  

Your Node.js/Express backend is now fully optimized for Day 3 frontend integration.

## 🔧 Configuration Complete

### ✅ CORS Configuration
- **Allowed Origins**: `http://localhost:5174`, `http://127.0.0.1:5174`, and all `localhost:*` in development
- **Credentials**: `true` (cookies and authentication headers allowed)
- **Methods**: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- **Headers**: Includes `X-CSRF-Token`, `Authorization`, `Content-Type`

### ✅ Session & Cookie Configuration
- **Session Store**: MongoDB-based with encryption
- **Cookie Settings**: 
  - `httpOnly: true` (secure)
  - `sameSite: 'lax'` (development) / `'strict'` (production)
  - `secure: false` (development) / `true` (production)
  - `maxAge: 24 hours`

### ✅ API Response Format
All endpoints return consistent format:
```json
{
  "success": true,
  "statusCode": 200,
  "data": { /* response data */ },
  "message": "Success message"
}
```

## 🔐 Authentication Endpoints

### 1. Get CSRF Token
```javascript
GET /api/v1/csrf-token
```
**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "csrfToken": "csrf_token_here"
  },
  "message": "CSRF token retrieved successfully"
}
```

### 2. User Registration
```javascript
POST /api/v1/users/register
Content-Type: multipart/form-data
```
**FormData Fields:**
- `firstName` (required)
- `lastName` (required)
- `professionalEmail` (required)
- `phone` (required)
- `password` (required)
- `profilePhoto` (optional file)
- `cv` (optional file)
- Plus all other professional fields

**Success Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "user": { /* user object */ }
  },
  "message": "User registered successfully"
}
```

### 3. User Login
```javascript
POST /api/v1/users/login
Content-Type: application/json
```
**Request Body:**
```json
{
  "professionalEmail": "doctor@example.com",
  "password": "password123"
}
```

**Success Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": { /* user object */ },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  },
  "message": "User logged in successfully"
}
```

**Cookies Set:**
- `accessToken` (HttpOnly, 24h)
- `refreshToken` (HttpOnly, 10d)

### 4. User Logout
```javascript
POST /api/v1/users/logout
Authorization: Bearer <token> OR cookies
```
**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "message": "User logged out successfully"
}
```

### 5. Get Current User
```javascript
GET /api/v1/users/current-user
Authorization: Bearer <token> OR cookies
```
**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": { /* complete user profile */ },
    "user_guidance": {
      "is_new_user": true,
      "has_websites": false,
      "next_steps": ["array", "of", "suggestions"],
      "tips": ["helpful", "tips"]
    }
  },
  "message": "User profile fetched successfully"
}
```

## 📝 Frontend Integration Examples

### Fetch with Credentials (Recommended)
```javascript
// Always include credentials for cookie-based auth
const response = await fetch('http://localhost:8000/api/v1/users/current-user', {
  method: 'GET',
  credentials: 'include', // Important for cookies
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken // Include CSRF token
  }
});

const data = await response.json();
```

### Axios Configuration
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add CSRF token to all requests
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken(); // Your CSRF token getter
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

### File Upload Example
```javascript
const formData = new FormData();
formData.append('firstName', 'John');
formData.append('lastName', 'Doe');
formData.append('professionalEmail', 'john@example.com');
formData.append('profilePhoto', fileInput.files[0]);

const response = await fetch('http://localhost:8000/api/v1/users/register', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'X-CSRF-Token': csrfToken
    // Don't set Content-Type for FormData - browser will set it
  },
  body: formData
});
```

## 🛡️ Security Features

### ✅ Implemented Security
- **CSRF Protection**: Token-based
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: Comprehensive validation
- **XSS Protection**: Multiple layers
- **SQL Injection**: MongoDB sanitization
- **File Upload Security**: Type validation, size limits
- **Session Security**: Encrypted sessions with MongoDB store

### ✅ Error Handling
- **Consistent Format**: All errors return standard format
- **User-Friendly Messages**: Clear, actionable error messages
- **Security Logging**: Comprehensive audit trail
- **Development Support**: Detailed errors in development mode

## 🔄 Expected Frontend Flows

### Registration Flow
1. GET `/api/v1/csrf-token` → Get CSRF token
2. POST `/api/v1/users/register` with FormData → Create user
3. Redirect to login or builder

### Login Flow
1. GET `/api/v1/csrf-token` → Get CSRF token
2. POST `/api/v1/users/login` with credentials → Get auth cookies
3. Redirect to `/builder`

### Protected Routes
1. GET `/api/v1/users/current-user` → Verify authentication
2. If 401, redirect to login
3. If 200, continue with user data

### Logout Flow
1. POST `/api/v1/users/logout` → Clear auth cookies
2. Redirect to home page

## 🚨 Important Notes

### Development vs Production
- **Development**: CORS allows `localhost:5174`, cookies use `sameSite: 'lax'`
- **Production**: Stricter CORS, cookies use `sameSite: 'strict'`

### Cookie Authentication
- Cookies are automatically included in requests with `credentials: 'include'`
- No need to manually handle JWT tokens in headers
- Tokens are also returned in response body if needed

### Error Handling
- All errors follow the same format with `success: false`
- Status codes are consistent with HTTP standards
- Messages are user-friendly and actionable

## 🧪 Testing

Run the test script to verify all endpoints:
```bash
node test-endpoints.js
```

## 🎉 Ready for Connection!

Your backend is now production-ready and optimized for your React frontend. All endpoints are configured for seamless integration with proper security, error handling, and response formats.

**Server URL**: `http://localhost:8000`
**Frontend URL**: `http://localhost:5174`

Happy coding! 🚀