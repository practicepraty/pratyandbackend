// src/routes/template.routes.js
import express from "express";
import { 
    getAvailableTemplates,
    getTemplateConfig,
    generateTemplatePreview,
    generateWebsiteFromAI,
    generateWebsiteFromTranscription,
    regenerateWithTemplate,
    getTemplateStats,
    clearTemplateCache,
    validateTemplateData,
    exportWebsiteHtml,
    getTemplateMapping
} from "../controllers/template.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.route("/templates").get(getAvailableTemplates);
router.route("/templates/:specialty/config").get(getTemplateConfig);
router.route("/templates/:specialty/preview").get(generateTemplatePreview);
router.route("/templates/:specialty/mapping").get(getTemplateMapping);

// Protected routes (require authentication)
router.route("/generate-from-transcription").post(verifyJWT, generateWebsiteFromTranscription);
router.route("/websites/:websiteId/generate").post(verifyJWT, generateWebsiteFromAI);
router.route("/websites/:websiteId/regenerate").post(verifyJWT, regenerateWithTemplate);
router.route("/websites/:websiteId/export").get(verifyJWT, exportWebsiteHtml);
router.route("/validate").post(verifyJWT, validateTemplateData);

// Admin routes (for development/debugging)
router.route("/admin/stats").get(verifyJWT, getTemplateStats);
router.route("/admin/cache/clear").post(verifyJWT, clearTemplateCache);

export default router;