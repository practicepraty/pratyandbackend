// src/routes/ai.routes.js
// src/routes/ai.routes.js (Enhanced Version)
import express from "express";
import { 
  testAIConnection, 
  generateContent, 
  generateContentVariations,
  getUserWebsites,
  getWebsiteById,
  updateWebsiteContent,
  deleteWebsite,
  regenerateWebsiteContent,
  getContentTemplates,
  createContentTemplate,
  getAvailableModels,
  getWebsiteAnalytics,
  
  // New audio transcription endpoints
  transcribeAudio,
  getTranscriptionStatus,
  generateFromAudio,
  deleteTranscription,
  getSupportedLanguages,
  getTranscriptionStats
} from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { singleAudioUpload, handleMulterError, validateAudioFile } from "../middlewares/multer.middleware.js";
import { rateLimiter, aiRateLimiter, uploadRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// Public routes (for testing)
router.route("/test-connection").get(testAIConnection);
router.route("/models").get(getAvailableModels);
router.route("/templates").get(getContentTemplates);
router.route("/languages").get(getSupportedLanguages);

// Protected routes (require authentication)
// Content generation routes
router.route("/generate-content").post(verifyJWT, aiRateLimiter.generation, generateContent);
router.route("/generate-variations").post(verifyJWT, aiRateLimiter.variations, generateContentVariations);

// Audio transcription routes (AUTH REQUIRED for security)
router.route("/transcribe-audio").post(
  verifyJWT,
  uploadRateLimiter.audio, 
  singleAudioUpload, 
  handleMulterError,
  validateAudioFile,
  transcribeAudio
);

router.route("/transcription/:jobId").get(verifyJWT, getTranscriptionStatus);
router.route("/transcription/:jobId").delete(verifyJWT, deleteTranscription);

router.route("/generate-from-audio").post(
  verifyJWT,
  uploadRateLimiter.audio, 
  singleAudioUpload, 
  handleMulterError,
  validateAudioFile,
  generateFromAudio
);

// Website management routes
router.route("/websites").get(verifyJWT, getUserWebsites);
router.route("/websites/:websiteId").get(verifyJWT, getWebsiteById);
router.route("/websites/:websiteId").put(verifyJWT, updateWebsiteContent);
router.route("/websites/:websiteId").delete(verifyJWT, deleteWebsite);

// Website regeneration
router.route("/websites/:websiteId/regenerate").post(verifyJWT, aiRateLimiter.regeneration, regenerateWebsiteContent);

// Content templates
router.route("/templates").post(verifyJWT, createContentTemplate);

// Analytics and statistics
router.route("/analytics").get(verifyJWT, getWebsiteAnalytics);
router.route("/transcription-stats").get(verifyJWT, getTranscriptionStats);

export default router;