import { ApiError } from "../utils/apierror.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        console.log(`[AUTH DEBUG] Token extraction:`, {
            hasCookieToken: !!req.cookies?.accessToken,
            hasHeaderToken: !!req.header("Authorization"),
            tokenLength: token ? token.length : 0,
            requestUrl: req.originalUrl,
            method: req.method
        });
        
        if (!token) {
            console.error(`[AUTH ERROR] No token provided for ${req.method} ${req.originalUrl}`);
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        
        console.log(`[AUTH DEBUG] Token decoded successfully:`, {
            userId: decodedToken?._id,
            tokenExp: decodedToken?.exp,
            tokenIat: decodedToken?.iat
        });
    
        const user = await User.findById(decodedToken?._id).select("-accountInfo.password -accountInfo.refreshToken")
    
        if (!user) {
            console.error(`[AUTH ERROR] User not found for ID: ${decodedToken?._id}`);
            throw new ApiError(401, "Invalid Access Token")
        }
        
        // Enhanced user object debugging
        console.log(`[AUTH DEBUG] User authenticated:`, {
            userId: user._id,
            userIdType: typeof user._id,
            userIdString: user._id.toString(),
            email: user.personalInfo?.professionalEmail,
            requestUrl: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
    
        req.user = user;
        next()
    } catch (error) {
        console.error(`[AUTH ERROR] Authentication failed:`, {
            error: error.message,
            stack: error.stack,
            requestUrl: req.originalUrl,
            method: req.method
        });
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})