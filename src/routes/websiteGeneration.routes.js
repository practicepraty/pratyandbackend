// src/routes/websiteGeneration.routes.js
import express from "express";
import { 
    generateWebsite,
    generateWebsitePreview,
    updateWebsiteCustomization,
    getWebsitePreview,
    regenerateWebsiteSection,
    exportWebsiteData,
    validateWebsiteData,
    getWebsiteGenerationHistory,
    duplicateWebsite,
    getWebsiteStats
} from "../controllers/websiteGeneration.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Primary website generation endpoint
router.route("/generate-website").post(verifyJWT, generateWebsite);

// Test endpoint without authentication for debugging
router.route("/generate").post(generateWebsite);

// Website preview and customization
router.route("/websites/:websiteId/preview").get(verifyJWT, getWebsitePreview);
router.route("/websites/:websiteId/preview").post(verifyJWT, generateWebsitePreview);
router.route("/websites/:websiteId/customize").put(verifyJWT, updateWebsiteCustomization);

// Section-specific regeneration
router.route("/websites/:websiteId/regenerate/:section").post(verifyJWT, regenerateWebsiteSection);

// Website data operations
router.route("/websites/:websiteId/export").get(verifyJWT, exportWebsiteData);
router.route("/websites/:websiteId/validate").post(verifyJWT, validateWebsiteData);
router.route("/websites/:websiteId/duplicate").post(verifyJWT, duplicateWebsite);

// Analytics and history
router.route("/websites/:websiteId/history").get(verifyJWT, getWebsiteGenerationHistory);
router.route("/websites/:websiteId/stats").get(verifyJWT, getWebsiteStats);

export default router;