// src/controllers/ai.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apirespose.js";
import AIService from "../service/ai.service.js";

// Test AI connectivity
const testAIConnection = asyncHandler(async (req, res) => {
  try {
    const testResult = await AIService.testConnection();
    
    if (testResult.success) {
      return res.status(200).json(
        new ApiResponse(200, testResult, "AI connection successful")
      );
    } else {
      return res.status(500).json(
        new ApiResponse(500, testResult, "AI connection failed")
      );
    }
  } catch (error) {
    throw new ApiError(500, `AI connection test failed: ${error.message}`);
  }
});

// Generate content from transcription
const generateContent = asyncHandler(async (req, res) => {
  const { transcription } = req.body;

  // Validation
  if (!transcription || !transcription.trim()) {
    throw new ApiError(400, "Transcription is required");
  }

  if (transcription.length < 10) {
    throw new ApiError(400, "Transcription too short. Please provide a meaningful description.");
  }

  if (transcription.length > 5000) {
    throw new ApiError(400, "Transcription too long. Please limit to 5000 characters.");
  }

  try {
    // Step 1: Detect medical specialty
    console.log("Detecting medical specialty...");
    const detectedSpecialty = await AIService.detectMedicalSpecialty(transcription);
    console.log("Detected specialty:", detectedSpecialty);

    // Step 2: Generate website content
    console.log("Generating website content...");
    const websiteContent = await AIService.generateWebsiteContent(transcription, detectedSpecialty);
    console.log("Website content generated successfully");

    // Step 3: Return structured response
    const result = {
      originalTranscription: transcription,
      detectedSpecialty: detectedSpecialty,
      generatedContent: websiteContent,
      generatedAt: new Date().toISOString(),
      processingTime: new Date().getTime() - new Date().getTime() // You can implement actual timing
    };

    return res.status(200).json(
      new ApiResponse(200, result, "Content generated successfully")
    );

  } catch (error) {
    console.error("Content generation error:", error);
    
    // Provide user-friendly error messages
    if (error.message.includes('credentials')) {
      throw new ApiError(500, "AI service configuration error. Please contact support.");
    } else if (error.message.includes('throttling')) {
      throw new ApiError(429, "AI service is busy. Please try again in a moment.");
    } else if (error.message.includes('model')) {
      throw new ApiError(503, "AI model temporarily unavailable. Please try again later.");
    } else {
      throw new ApiError(500, "Failed to generate content. Please try again.");
    }
  }
});

// Get available AI models (for future use)
const getAvailableModels = asyncHandler(async (req, res) => {
  const models = [
    {
      id: "anthropic.claude-3-sonnet-20240229-v1:0",
      name: "Claude 3 Sonnet",
      description: "Balanced performance and speed",
      recommended: true
    },
    {
      id: "anthropic.claude-3-haiku-20240307-v1:0", 
      name: "Claude 3 Haiku",
      description: "Fastest responses",
      recommended: false
    }
  ];

  return res.status(200).json(
    new ApiResponse(200, models, "Available AI models")
  );
});

export {
  testAIConnection,
  generateContent,
  getAvailableModels
};