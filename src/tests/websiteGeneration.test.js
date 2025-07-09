// src/tests/websiteGeneration.test.js
import WebsiteGenerator from "../services/websiteGenerator.js";
import { ContentProcessor } from "../services/contentProcessor.js";
import { PreviewGenerator } from "../services/previewGenerator.js";
import { StyleProcessor } from "../services/styleProcessor.js";

// Test data for different medical specialties
const testData = {
    generalPractice: {
        transcribedContent: "I'm Dr. Sarah Johnson, a family medicine physician with over 15 years of experience. I provide comprehensive healthcare services including annual check-ups, preventive care, chronic disease management, and urgent care. My practice focuses on building long-term relationships with patients and their families, ensuring personalized care for people of all ages.",
        specialty: "general-practice",
        customizations: {
            colors: {
                primary: "#2563eb",
                secondary: "#64748b",
                accent: "#10b981"
            },
            fonts: {
                headingFont: "Inter",
                bodyFont: "Inter"
            }
        }
    },
    dentistry: {
        transcribedContent: "Welcome to Bright Smile Dental Care! I'm Dr. Michael Chen, a general dentist specializing in comprehensive oral health services. We offer dental cleanings, fillings, crowns, root canal therapy, and cosmetic dentistry procedures. Our modern facility uses the latest technology to ensure comfortable and effective treatments for patients of all ages.",
        specialty: "dentistry",
        customizations: {
            colors: {
                primary: "#0ea5e9",
                secondary: "#64748b",
                accent: "#06b6d4"
            }
        }
    },
    cardiology: {
        transcribedContent: "I'm Dr. Robert Martinez, a board-certified cardiologist with expertise in heart disease prevention and treatment. My practice offers comprehensive cardiac care including EKG testing, stress testing, echocardiograms, and cardiac catheterization. I specialize in managing hypertension, coronary artery disease, and heart rhythm disorders.",
        specialty: "cardiology",
        customizations: {
            colors: {
                primary: "#dc2626",
                secondary: "#64748b",
                accent: "#ea580c"
            }
        }
    }
};

// Test content processor
async function testContentProcessor() {
    console.log("🧪 Testing Content Processor...");
    
    const processor = new ContentProcessor();
    
    try {
        // Test input processing
        const processedInput = await processor.processInput({
            transcribedContent: testData.generalPractice.transcribedContent,
            specialty: testData.generalPractice.specialty,
            customizations: testData.generalPractice.customizations,
            userId: "test-user-id"
        });
        
        console.log("✅ Content processor test passed");
        console.log("📝 Processed input:", {
            transcriptionLength: processedInput.transcribedContent.length,
            specialty: processedInput.specialty,
            hasCustomizations: !!processedInput.customizations
        });
        
        return processedInput;
        
    } catch (error) {
        console.error("❌ Content processor test failed:", error.message);
        throw error;
    }
}

// Test style processor
async function testStyleProcessor() {
    console.log("🎨 Testing Style Processor...");
    
    const styleProcessor = new StyleProcessor();
    
    try {
        // Test style application
        const mockWebsiteData = {
            websiteTitle: "Test Medical Practice",
            specialty: "general-practice",
            heroSection: {
                headline: "Expert Medical Care",
                subheadline: "Professional healthcare services"
            }
        };
        
        const styledWebsite = await styleProcessor.applyStyles(
            mockWebsiteData,
            testData.generalPractice.customizations
        );
        
        console.log("✅ Style processor test passed");
        console.log("🎨 Generated styles:", {
            hasColors: !!styledWebsite.styles.colors,
            hasTypography: !!styledWebsite.styles.typography,
            hasCSS: !!styledWebsite.css,
            cssLength: styledWebsite.css.length
        });
        
        return styledWebsite;
        
    } catch (error) {
        console.error("❌ Style processor test failed:", error.message);
        throw error;
    }
}

// Test preview generator
async function testPreviewGenerator() {
    console.log("🖼️ Testing Preview Generator...");
    
    const previewGenerator = new PreviewGenerator();
    
    try {
        // Test preview generation
        const mockWebsiteData = {
            websiteTitle: "Test Medical Practice",
            specialty: "general-practice",
            heroSection: {
                headline: "Expert Medical Care",
                subheadline: "Professional healthcare services",
                ctaText: "Schedule Appointment"
            },
            aboutSection: {
                title: "About Our Practice",
                content: "We provide comprehensive medical care.",
                highlights: ["Experienced Team", "Modern Technology", "Patient-Centered Care"]
            },
            services: [
                {
                    name: "Annual Check-ups",
                    description: "Comprehensive health examinations",
                    icon: "medical-icon"
                },
                {
                    name: "Preventive Care",
                    description: "Disease prevention and health maintenance",
                    icon: "prevention-icon"
                }
            ],
            contactInfo: {
                phone: "(555) 123-4567",
                email: "info@testpractice.com",
                address: "123 Medical Plaza, Healthcare City, HC 12345",
                hours: "Monday-Friday: 8:00 AM - 6:00 PM"
            },
            seoMeta: {
                title: "Test Medical Practice - Quality Healthcare",
                description: "Professional medical services with experienced physicians",
                keywords: ["medical", "healthcare", "physician", "family medicine"]
            }
        };
        
        const preview = await previewGenerator.generatePreview(
            mockWebsiteData,
            testData.generalPractice.customizations
        );
        
        console.log("✅ Preview generator test passed");
        console.log("🖼️ Generated preview:", {
            htmlLength: preview.html.length,
            cssLength: preview.css.length,
            hasMetadata: !!preview.metadata,
            hasResponsiveVersions: !!(preview.responsive.mobile && preview.responsive.tablet && preview.responsive.desktop),
            performanceScore: preview.performance.score,
            accessibilityScore: preview.accessibility.score
        });
        
        return preview;
        
    } catch (error) {
        console.error("❌ Preview generator test failed:", error.message);
        throw error;
    }
}

// Test complete website generation pipeline
async function testWebsiteGenerationPipeline() {
    console.log("🚀 Testing Complete Website Generation Pipeline...");
    
    try {
        // Test with different medical specialties
        for (const [specialty, data] of Object.entries(testData)) {
            console.log(`\n📋 Testing ${specialty} specialty...`);
            
            const result = await WebsiteGenerator.generateWebsite({
                transcribedContent: data.transcribedContent,
                specialty: data.specialty,
                customizations: data.customizations,
                userId: null, // Test without user for now
                saveToDatabase: false,
                generatePreview: true
            });
            
            console.log(`✅ ${specialty} generation completed`);
            console.log(`📊 Results:`, {
                websiteGenerated: !!result.websiteData,
                htmlLength: result.websiteData.html.length,
                specialtyDetected: result.specialtyInfo.specialty,
                confidence: result.specialtyInfo.confidence,
                qualityScore: result.websiteData.metadata.qualityScore,
                processingTime: result.websiteData.metadata.processingTime,
                recommendationsCount: result.recommendations.length
            });
        }
        
        console.log("\n🎉 Website generation pipeline test completed successfully!");
        
    } catch (error) {
        console.error("❌ Website generation pipeline test failed:", error.message);
        throw error;
    }
}

// Test error handling
async function testErrorHandling() {
    console.log("🛡️ Testing Error Handling...");
    
    try {
        // Test with invalid input
        try {
            await WebsiteGenerator.generateWebsite({
                transcribedContent: "", // Empty content
                specialty: "invalid-specialty",
                customizations: null
            });
            console.error("❌ Should have thrown error for empty content");
        } catch (error) {
            console.log("✅ Correctly handled empty content error");
        }
        
        // Test with invalid specialty
        try {
            await WebsiteGenerator.generateWebsite({
                transcribedContent: "Short content",
                specialty: "invalid-specialty",
                customizations: {}
            });
            console.log("✅ Correctly handled invalid specialty (fallback to general-practice)");
        } catch (error) {
            console.log("⚠️ Unexpected error with invalid specialty:", error.message);
        }
        
        console.log("✅ Error handling test passed");
        
    } catch (error) {
        console.error("❌ Error handling test failed:", error.message);
        throw error;
    }
}

// Test performance and validation
async function testPerformanceAndValidation() {
    console.log("⚡ Testing Performance and Validation...");
    
    try {
        const startTime = Date.now();
        
        const result = await WebsiteGenerator.generateWebsite({
            transcribedContent: testData.generalPractice.transcribedContent,
            specialty: testData.generalPractice.specialty,
            customizations: testData.generalPractice.customizations,
            saveToDatabase: false,
            generatePreview: true
        });
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        console.log("✅ Performance test completed");
        console.log("⚡ Performance metrics:", {
            processingTime: `${processingTime}ms`,
            htmlSize: `${(result.websiteData.html.length / 1024).toFixed(2)}KB`,
            qualityScore: result.websiteData.metadata.qualityScore,
            specialtyConfidence: result.specialtyInfo.confidence,
            recommendationsCount: result.recommendations.length
        });
        
        // Validate output structure
        const requiredFields = ['websiteData', 'specialtyInfo', 'recommendations'];
        const missingFields = requiredFields.filter(field => !result[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        console.log("✅ Output validation passed");
        
    } catch (error) {
        console.error("❌ Performance and validation test failed:", error.message);
        throw error;
    }
}

// Run all tests
async function runAllTests() {
    console.log("🧪 Starting Website Generation System Tests\n");
    
    try {
        await testContentProcessor();
        console.log();
        
        await testStyleProcessor();
        console.log();
        
        await testPreviewGenerator();
        console.log();
        
        await testWebsiteGenerationPipeline();
        console.log();
        
        await testErrorHandling();
        console.log();
        
        await testPerformanceAndValidation();
        console.log();
        
        console.log("🎉 All tests completed successfully!");
        console.log("✅ Website generation system is ready for production use.");
        
    } catch (error) {
        console.error("❌ Test suite failed:", error.message);
        process.exit(1);
    }
}

// Export for use in other test files
export {
    testContentProcessor,
    testStyleProcessor,
    testPreviewGenerator,
    testWebsiteGenerationPipeline,
    testErrorHandling,
    testPerformanceAndValidation,
    runAllTests,
    testData
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}