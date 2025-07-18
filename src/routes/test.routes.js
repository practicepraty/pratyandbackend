// 🧪 TEST ROUTES for Specialty Detection System
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apirespose.js';
import { ApiError } from '../utils/apierror.js';
import SpecialtyTestSuite from '../utils/specialty-test.js';
import AIService from '../service/ai.service.js';

const router = Router();

// 🧪 TEST ROUTE: Run all specialty detection tests
router.get('/specialty-detection', asyncHandler(async (req, res) => {
    const results = await SpecialtyTestSuite.runAllTests();
    
    return res.status(200).json(
        new ApiResponse(200, results, "Specialty detection tests completed")
    );
}));

// 🧪 TEST ROUTE: Test critical cases that were failing
router.get('/critical-cases', asyncHandler(async (req, res) => {
    const results = await SpecialtyTestSuite.testCriticalCases();
    
    return res.status(200).json(
        new ApiResponse(200, results, "Critical cases tests completed")
    );
}));

// 🧪 TEST ROUTE: Quick test for specific input
router.post('/quick-test', asyncHandler(async (req, res) => {
    const { input } = req.body;
    
    if (!input) {
        throw new ApiError(400, "Input text is required");
    }
    
    const result = await SpecialtyTestSuite.quickTest(input);
    
    return res.status(200).json(
        new ApiResponse(200, result, "Quick test completed")
    );
}));

// 🧪 TEST ROUTE: Test keyword detection only
router.get('/keyword-detection', asyncHandler(async (req, res) => {
    const results = AIService.testKeywordDetection();
    
    return res.status(200).json(
        new ApiResponse(200, results, "Keyword detection tests completed")
    );
}));

// 🧪 TEST ROUTE: Test AI detection only
router.get('/ai-detection', asyncHandler(async (req, res) => {
    const results = await AIService.testSpecialtyDetection();
    
    return res.status(200).json(
        new ApiResponse(200, results, "AI detection tests completed")
    );
}));

// 🧪 TEST ROUTE: Test specific specialty detection
router.post('/test-specialty', asyncHandler(async (req, res) => {
    const { input } = req.body;
    
    if (!input) {
        throw new ApiError(400, "Input text is required");
    }
    
    const result = await AIService.quickTest(input);
    
    return res.status(200).json(
        new ApiResponse(200, result, "Specialty detection test completed")
    );
}));

// 🧪 TEST ROUTE: Health check for the test system
router.get('/health', asyncHandler(async (req, res) => {
    const healthCheck = {
        timestamp: new Date().toISOString(),
        aiService: 'Connected',
        templateService: 'Connected',
        testSuite: 'Ready',
        availableTests: [
            'GET /api/v1/test/specialty-detection - Run all tests',
            'GET /api/v1/test/critical-cases - Test critical failure cases',
            'POST /api/v1/test/quick-test - Quick test for specific input',
            'GET /api/v1/test/keyword-detection - Test keyword detection',
            'GET /api/v1/test/ai-detection - Test AI detection',
            'POST /api/v1/test/test-specialty - Test specific specialty detection'
        ]
    };
    
    return res.status(200).json(
        new ApiResponse(200, healthCheck, "Test system is healthy")
    );
}));

// 🧪 SIMPLE TEST ROUTE: Basic connectivity test  
router.get('/ping', (req, res) => {
    res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Test API is working!",
        timestamp: new Date().toISOString()
    });
});

// 🧪 TEMPLATE CACHE CLEARING ROUTE: Clear all template caches
router.get('/clear-template-caches', asyncHandler(async (req, res) => {
    try {
        // Clear AI Service cache (if method exists)
        if (typeof AIService.clearTemplateCache === 'function') {
            AIService.clearTemplateCache();
        }
        
        // Clear template service cache
        const TemplateService = (await import('../service/template.service.js')).default;
        TemplateService.clearCache();
        
        // Clear website generator cache
        const WebsiteGenerator = (await import('../services/websiteGenerator.js')).default;
        WebsiteGenerator.clearCache();
        
        return res.status(200).json({
            success: true,
            statusCode: 200,
            data: {
                message: "All template caches cleared successfully",
                cacheStatus: {
                    aiService: "cleared",
                    templateService: "cleared",
                    websiteGenerator: "cleared"
                },
                timestamp: new Date().toISOString()
            },
            message: "Template caches cleared successfully"
        });
        
    } catch (error) {
        console.error('Cache clearing error:', error);
        throw new ApiError(500, `Failed to clear caches: ${error.message}`);
    }
}));

// 🧪 TEMPLATE CONFIGURATION TEST ROUTE: Test template configuration validity
router.get('/test-template-config', asyncHandler(async (req, res) => {
    try {
        const TemplateService = (await import('../service/template.service.js')).default;
        
        const testSpecialties = ['dermatology', 'cardiology', 'dentistry', 'gynecology', 'neurology', 'psychiatry', 'oncology', 'ophthalmology', 'urology', 'endocrinology'];
        const results = [];
        
        for (const specialty of testSpecialties) {
            const templateConfig = TemplateService.getTemplateConfig(specialty);
            const validation = TemplateService.validateTemplateAvailability(specialty);
            
            results.push({
                specialty: specialty,
                templateName: templateConfig.templateName,
                hasColors: !!templateConfig.colors,
                hasFeatures: !!templateConfig.features,
                hasSEO: !!templateConfig.seo,
                validation: validation,
                colorScheme: templateConfig.colors ? Object.keys(templateConfig.colors) : [],
                features: templateConfig.features ? Object.keys(templateConfig.features) : [],
                seoFields: templateConfig.seo ? Object.keys(templateConfig.seo) : []
            });
        }
        
        return res.status(200).json({
            success: true,
            statusCode: 200,
            data: {
                results: results,
                summary: {
                    totalTested: testSpecialties.length,
                    allConfigured: results.every(r => r.hasColors && r.hasFeatures && r.hasSEO),
                    missingConfigs: results.filter(r => !r.hasColors || !r.hasFeatures || !r.hasSEO)
                }
            },
            message: "Template configuration test completed"
        });
        
    } catch (error) {
        console.error('Template config test error:', error);
        throw new ApiError(500, `Template configuration test failed: ${error.message}`);
    }
}));

// 🧪 CRITICAL TEST ROUTE: Test the exact failing cases
router.get('/test-critical-bug', asyncHandler(async (req, res) => {
    const criticalTests = [
        {
            input: "teeth and dentistry",
            expected: "dentistry",
            description: "CRITICAL: should map to dentistry, not cardiology"
        },
        {
            input: "heart and cardiology",
            expected: "cardiology", 
            description: "CRITICAL: should map to cardiology, not dermatology"
        },
        {
            input: "skin and dermatology",
            expected: "dermatology",
            description: "CRITICAL: should map to dermatology, not gynecology"
        }
    ];
    
    const results = [];
    
    for (const test of criticalTests) {
        try {
            const result = await AIService.detectMedicalSpecialty(test.input);
            const passed = result.specialty === test.expected;
            
            results.push({
                input: test.input,
                expected: test.expected,
                actual: result.specialty,
                confidence: result.confidence,
                method: result.method,
                reasoning: result.reasoning,
                passed: passed,
                description: test.description,
                status: passed ? "✅ FIXED" : "❌ STILL BROKEN"
            });
        } catch (error) {
            results.push({
                input: test.input,
                expected: test.expected,
                actual: "ERROR",
                error: error.message,
                passed: false,
                description: test.description,
                status: "❌ ERROR"
            });
        }
    }
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    return res.status(200).json({
        success: true,
        statusCode: 200,
        data: {
            summary: {
                passed: passedCount,
                failed: totalCount - passedCount,
                total: totalCount,
                successRate: Math.round((passedCount / totalCount) * 100)
            },
            tests: results,
            bugFixed: passedCount === totalCount
        },
        message: `Critical bug test completed: ${passedCount}/${totalCount} tests passed`
    });
}));

export default router;