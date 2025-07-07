// src/routes/ai.routes.js
import express from "express";
import { 
  testAIConnection, 
  generateContent, 
  getAvailableModels 
} from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes (for testing)
router.route("/test-connection").get(testAIConnection);
router.route("/models").get(getAvailableModels);

// Protected routes (require authentication)
router.route("/generate-content").post(verifyJWT, generateContent);

export default router;