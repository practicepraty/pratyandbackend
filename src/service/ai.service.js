// src/services/ai.service.js
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockClient } from "../config/aws.js";
import { ApiError } from "../utils/apierror.js";

class AIService {
    constructor() {
        this.client = createBedrockClient();
        this.modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";
    }

    // Test AI connectivity
    async testConnection() {
        try {
            const testPrompt = "Say 'Hello, AI is working!' in exactly 5 words.";
            const response = await this.generateContent(testPrompt);
            return {
                success: true,
                response: response,
                modelId: this.modelId
            };
        } catch (error) {
            console.error("AI Connection Test Failed:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate content using Bedrock
    async generateContent(prompt) {
        try {
            const payload = {
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1000,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            };

            const command = new InvokeModelCommand({
                modelId: this.modelId,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify(payload)
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            
            return responseBody.content[0].text;
        } catch (error) {
            console.error("Content generation error:", error);
            throw new ApiError(500, `Failed to generate content: ${error.message}`);
        }
    }

    // Detect medical specialty from transcription
    async detectMedicalSpecialty(transcription) {
        try {
            const prompt = `
            Analyze the following medical transcription and identify the medical specialty it belongs to.
            
            Transcription: "${transcription}"
            
            Please respond with only the medical specialty name (e.g., "Cardiology", "Orthopedics", "Dermatology", etc.).
            If you cannot determine the specialty, respond with "General Medicine".
            `;

            const response = await this.generateContent(prompt);
            return response.trim();
        } catch (error) {
            console.error("Medical specialty detection error:", error);
            throw new ApiError(500, `Failed to detect medical specialty: ${error.message}`);
        }
    }

    // Generate website content from transcription
    async generateWebsiteContent(transcription, specialty) {
        try {
            const prompt = `
            You are a medical website content generator. Based on the following medical transcription and specialty, 
            generate comprehensive website content for a medical practice.

            Medical Specialty: ${specialty}
            Transcription: "${transcription}"

            Please generate a structured response in JSON format with the following sections:
            {
                "practiceInfo": {
                    "name": "Generated practice name",
                    "specialty": "Medical specialty",
                    "description": "Brief description of the practice"
                },
                "services": [
                    "List of medical services offered"
                ],
                "aboutSection": "Detailed about section for the website",
                "contactInfo": {
                    "phone": "Generated phone number",
                    "email": "Generated email",
                    "address": "Generated address"
                },
                "seoKeywords": [
                    "List of relevant SEO keywords"
                ]
            }

            Make sure the content is professional, medically accurate, and suitable for a medical practice website.
            `;

            const response = await this.generateContent(prompt);
            
            try {
                return JSON.parse(response);
            } catch (parseError) {
                // If JSON parsing fails, return a structured response
                return {
                    practiceInfo: {
                        name: `${specialty} Medical Practice`,
                        specialty: specialty,
                        description: "Professional medical care services"
                    },
                    services: ["Consultation", "Diagnosis", "Treatment"],
                    aboutSection: response,
                    contactInfo: {
                        phone: "(555) 123-4567",
                        email: "info@medicalpractice.com",
                        address: "123 Medical Center Dr, Healthcare City, HC 12345"
                    },
                    seoKeywords: [specialty.toLowerCase(), "medical", "healthcare", "treatment"]
                };
            }
        } catch (error) {
            console.error("Website content generation error:", error);
            throw new ApiError(500, `Failed to generate website content: ${error.message}`);
        }
    }
}

export default new AIService();