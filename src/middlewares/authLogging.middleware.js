// Enhanced Authorization Logging Middleware
import { ApiError } from "../utils/apierror.js";

export const authLoggingMiddleware = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp,
    params: req.params,
    query: req.query
  };

  // Log incoming request
  console.log(`[AUTH LOG] Incoming request:`, requestInfo);

  // Log authentication state
  if (req.user) {
    console.log(`[AUTH LOG] User authenticated:`, {
      userId: req.user._id,
      userIdString: req.user._id.toString(),
      email: req.user.personalInfo?.professionalEmail,
      ...requestInfo
    });
  } else {
    console.log(`[AUTH LOG] No user authentication found for request:`, requestInfo);
  }

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    if (data && data.statusCode) {
      console.log(`[AUTH LOG] Response sent:`, {
        statusCode: data.statusCode,
        success: data.success,
        message: data.message,
        userId: req.user?._id,
        ...requestInfo
      });
      
      // Log authorization failures specifically
      if (data.statusCode === 401 || data.statusCode === 403) {
        console.error(`[AUTH ERROR] Authorization failed:`, {
          statusCode: data.statusCode,
          message: data.message,
          userId: req.user?._id,
          hasToken: !!(req.cookies?.accessToken || req.header("Authorization")),
          ...requestInfo
        });
      }
    }
    
    return originalJson.call(this, data);
  };

  next();
};

export const logOwnershipCheck = (resourceUserId, requestUserId, resourceType = 'resource') => {
  const ownershipResult = {
    resourceUserId,
    requestUserId,
    resourceType,
    authorized: resourceUserId === requestUserId,
    timestamp: new Date().toISOString()
  };

  if (ownershipResult.authorized) {
    console.log(`[AUTH SUCCESS] Ownership verified:`, ownershipResult);
  } else {
    console.error(`[AUTH DENIED] Ownership check failed:`, ownershipResult);
  }

  return ownershipResult.authorized;
};