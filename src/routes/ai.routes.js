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
  getWebsiteAnalytics
} from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes (for testing)
router.route("/test-connection").get(testAIConnection);
router.route("/models").get(getAvailableModels);
router.route("/templates").get(getContentTemplates);

// Protected routes (require authentication)
// Content generation routes
router.route("/generate-content").post(verifyJWT, generateContent);
router.route("/generate-variations").post(verifyJWT, generateContentVariations);

// Website management routes
router.route("/websites").get(verifyJWT, getUserWebsites);
router.route("/websites/:websiteId").get(verifyJWT, getWebsiteById);
router.route("/websites/:websiteId").put(verifyJWT, updateWebsiteContent);
router.route("/websites/:websiteId").delete(verifyJWT, deleteWebsite);

// Website regeneration
router.route("/websites/:websiteId/regenerate").post(verifyJWT, regenerateWebsiteContent);

// Content templates
router.route("/templates").post(verifyJWT, createContentTemplate);

// Analytics
router.route("/analytics").get(verifyJWT, getWebsiteAnalytics);

export default router;