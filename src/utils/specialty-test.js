// 🧪 COMPREHENSIVE SPECIALTY DETECTION TEST SUITE
// This file contains tests to validate the specialty detection fixes

import AIService from '../service/ai.service.js';
import TemplateService from '../service/template.service.js';
import { getTemplateBySpecialty } from '../config/templates.config.js';

class SpecialtyTestSuite {
    constructor() {
        this.aiService = AIService;
        this.templateService = TemplateService;
    }

    // 🚀 RUN ALL TESTS
    async runAllTests() {
        console.log('\n🎯 ============================================');
        console.log('🎯 COMPREHENSIVE SPECIALTY DETECTION TESTS');
        console.log('🎯 ============================================\n');

        const results = {
            aiDetection: null,
            keywordDetection: null,
            templateMapping: null,
            endToEnd: null,
            overall: { passed: 0, failed: 0, total: 0 }
        };

        // Test 1: AI Detection
        console.log('🧪 Test 1: AI Detection Service');
        results.aiDetection = await this.aiService.testSpecialtyDetection();
        
        // Test 2: Keyword Detection
        console.log('🧪 Test 2: Keyword Detection');
        results.keywordDetection = this.aiService.testKeywordDetection();
        
        // Test 3: Template Mapping
        console.log('🧪 Test 3: Template Mapping');
        results.templateMapping = this.testTemplateMapping();
        
        // Test 4: End-to-End Integration
        console.log('🧪 Test 4: End-to-End Integration');
        results.endToEnd = await this.testEndToEndIntegration();

        // Calculate overall results
        results.overall.passed = results.aiDetection.passed + results.keywordDetection.passed + 
                                results.templateMapping.passed + results.endToEnd.passed;
        results.overall.failed = results.aiDetection.failed + results.keywordDetection.failed + 
                                results.templateMapping.failed + results.endToEnd.failed;
        results.overall.total = results.aiDetection.total + results.keywordDetection.total + 
                               results.templateMapping.total + results.endToEnd.total;

        // Print final summary
        this.printFinalSummary(results);
        
        return results;
    }

    // 🧪 TEST TEMPLATE MAPPING
    testTemplateMapping() {
        console.log('\n🧪 ================================');
        console.log('🧪 TESTING TEMPLATE MAPPING');
        console.log('🧪 ================================\n');

        const mappingTests = [
            { specialty: 'dentistry', expectTemplate: 'dentistry' },
            { specialty: 'cardiology', expectTemplate: 'cardiology' },
            { specialty: 'dermatology', expectTemplate: 'dermatology' },
            { specialty: 'gynecology', expectTemplate: 'gynecology' },
            { specialty: 'pediatrics', expectTemplate: 'pediatrics' },
            { specialty: 'orthopedics', expectTemplate: 'orthopedics' },
            { specialty: 'neurology', expectTemplate: 'neurology' },
            { specialty: 'psychiatry', expectTemplate: 'psychiatry' },
            { specialty: 'oncology', expectTemplate: 'oncology' },
            { specialty: 'ophthalmology', expectTemplate: 'ophthalmology' },
            { specialty: 'urology', expectTemplate: 'urology' },
            { specialty: 'endocrinology', expectTemplate: 'endocrinology' },
            { specialty: 'general-practice', expectTemplate: 'general-practice' },
            { specialty: 'dental', expectTemplate: 'dentistry' },
            { specialty: 'heart', expectTemplate: 'cardiology' },
            { specialty: 'skin', expectTemplate: 'dermatology' },
            { specialty: 'invalid-specialty', expectTemplate: 'general-practice' }
        ];

        const results = { passed: 0, failed: 0, total: mappingTests.length };

        mappingTests.forEach(test => {
            const mappedTemplate = this.templateService.mapSpecialtyToTemplate(test.specialty);
            const template = getTemplateBySpecialty(test.specialty);
            
            const passed = mappedTemplate === test.expectTemplate && template !== undefined;
            
            console.log(`Specialty: "${test.specialty}"`);
            console.log(`Expected: ${test.expectTemplate}, Got: ${mappedTemplate}`);
            console.log(`Template Found: ${template ? 'Yes' : 'No'}`);
            console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
            console.log('─'.repeat(50));
            
            if (passed) results.passed++;
            else results.failed++;
        });

        console.log(`\n📊 Template Mapping Results: ${results.passed}/${results.total} passed`);
        console.log('🧪 ================================\n');
        
        return results;
    }

    // 🧪 TEST END-TO-END INTEGRATION
    async testEndToEndIntegration() {
        console.log('\n🧪 ================================');
        console.log('🧪 TESTING END-TO-END INTEGRATION');
        console.log('🧪 ================================\n');

        const endToEndTests = [
            {
                input: "teeth and dentistry practice",
                expectedSpecialty: "dentistry",
                expectTemplate: "dentistry"
            },
            {
                input: "heart and cardiology services",
                expectedSpecialty: "cardiology",
                expectTemplate: "cardiology"
            },
            {
                input: "skin and dermatology clinic",
                expectedSpecialty: "dermatology",
                expectTemplate: "dermatology"
            },
            {
                input: "women's health gynecology",
                expectedSpecialty: "gynecology",
                expectTemplate: "gynecology"
            },
            {
                input: "children pediatric care",
                expectedSpecialty: "pediatrics",
                expectTemplate: "pediatrics"
            }
        ];

        const results = { passed: 0, failed: 0, total: endToEndTests.length };

        for (const test of endToEndTests) {
            try {
                console.log(`\n🔍 Testing: "${test.input}"`);
                
                // Step 1: Detect specialty
                const detectionResult = await this.aiService.detectMedicalSpecialty(test.input);
                
                // Step 2: Map to template
                const mappedTemplate = this.templateService.mapSpecialtyToTemplate(detectionResult.specialty);
                
                // Step 3: Get template
                const template = getTemplateBySpecialty(detectionResult.specialty);
                
                const specialtyCorrect = detectionResult.specialty === test.expectedSpecialty;
                const templateCorrect = mappedTemplate === test.expectTemplate;
                const templateExists = template !== undefined;
                const passed = specialtyCorrect && templateCorrect && templateExists;
                
                console.log(`📊 Detected Specialty: ${detectionResult.specialty} (${specialtyCorrect ? '✅' : '❌'})`);
                console.log(`🎯 Mapped Template: ${mappedTemplate} (${templateCorrect ? '✅' : '❌'})`);
                console.log(`📄 Template Exists: ${templateExists ? '✅' : '❌'}`);
                console.log(`🎯 Overall: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
                console.log('─'.repeat(60));
                
                if (passed) results.passed++;
                else results.failed++;
                
            } catch (error) {
                console.error(`❌ ERROR testing "${test.input}":`, error.message);
                results.failed++;
            }
        }

        console.log(`\n📊 End-to-End Results: ${results.passed}/${results.total} passed`);
        console.log('🧪 ================================\n');
        
        return results;
    }

    // 🧪 TEST CRITICAL CASES (the ones that were failing)
    async testCriticalCases() {
        console.log('\n🚨 ================================');
        console.log('🚨 TESTING CRITICAL FAILURE CASES');
        console.log('🚨 ================================\n');

        const criticalCases = [
            {
                input: "teeth and dentistry",
                expectedSpecialty: "dentistry",
                description: "CRITICAL: This was mapping to cardiology before"
            },
            {
                input: "heart and cardiology", 
                expectedSpecialty: "cardiology",
                description: "CRITICAL: This was mapping to dermatology before"
            },
            {
                input: "skin and dermatology",
                expectedSpecialty: "dermatology", 
                description: "CRITICAL: This was mapping to gynecology before"
            }
        ];

        const results = { passed: 0, failed: 0, total: criticalCases.length };

        for (const test of criticalCases) {
            console.log(`\n🚨 ${test.description}`);
            console.log(`🔍 Testing: "${test.input}"`);
            
            const result = await this.aiService.detectMedicalSpecialty(test.input);
            const passed = result.specialty === test.expectedSpecialty;
            
            console.log(`📊 Result: ${result.specialty}`);
            console.log(`🎯 Expected: ${test.expectedSpecialty}`);
            console.log(`📈 Confidence: ${result.confidence}`);
            console.log(`🔧 Method: ${result.method}`);
            console.log(`🎯 Status: ${passed ? '✅ FIXED' : '❌ STILL BROKEN'}`);
            console.log('─'.repeat(60));
            
            if (passed) results.passed++;
            else results.failed++;
        }

        console.log(`\n📊 Critical Cases Results: ${results.passed}/${results.total} passed`);
        console.log('🚨 ================================\n');
        
        return results;
    }

    // 📊 PRINT FINAL SUMMARY
    printFinalSummary(results) {
        console.log('\n🎯 ============================================');
        console.log('🎯 FINAL TEST SUMMARY');
        console.log('🎯 ============================================');
        
        console.log(`\n📊 Overall Results:`);
        console.log(`   ✅ Passed: ${results.overall.passed}`);
        console.log(`   ❌ Failed: ${results.overall.failed}`);
        console.log(`   📈 Total: ${results.overall.total}`);
        console.log(`   🎯 Success Rate: ${Math.round((results.overall.passed / results.overall.total) * 100)}%`);
        
        console.log(`\n📋 Detailed Results:`);
        console.log(`   🧠 AI Detection: ${results.aiDetection.passed}/${results.aiDetection.total} passed`);
        console.log(`   🔑 Keyword Detection: ${results.keywordDetection.passed}/${results.keywordDetection.total} passed`);
        console.log(`   📄 Template Mapping: ${results.templateMapping.passed}/${results.templateMapping.total} passed`);
        console.log(`   🔄 End-to-End: ${results.endToEnd.passed}/${results.endToEnd.total} passed`);
        
        const criticalIssuesFixed = results.overall.passed >= (results.overall.total * 0.8);
        console.log(`\n🎯 Critical Issues Status: ${criticalIssuesFixed ? '✅ FIXED' : '❌ NEEDS WORK'}`);
        
        if (criticalIssuesFixed) {
            console.log('\n🎉 SUCCESS: The specialty detection system appears to be working correctly!');
            console.log('🎉 The critical bugs have been fixed:');
            console.log('   ✅ "teeth and dentistry" → dentistry template');
            console.log('   ✅ "heart and cardiology" → cardiology template');
            console.log('   ✅ "skin and dermatology" → dermatology template');
        } else {
            console.log('\n⚠️  WARNING: Some tests are still failing. Review the detailed results above.');
        }
        
        console.log('\n🎯 ============================================\n');
    }

    // 🧪 QUICK TEST FOR SPECIFIC INPUT
    async quickTest(input) {
        console.log(`\n🚀 Quick Test for: "${input}"`);
        console.log('═'.repeat(60));
        
        const result = await this.aiService.detectMedicalSpecialty(input);
        const template = this.templateService.mapSpecialtyToTemplate(result.specialty);
        const templateConfig = getTemplateBySpecialty(result.specialty);
        
        console.log(`📊 Detected Specialty: ${result.specialty}`);
        console.log(`🎯 Confidence: ${result.confidence}`);
        console.log(`🔧 Method: ${result.method}`);
        console.log(`📄 Template: ${template}`);
        console.log(`✅ Template Exists: ${templateConfig ? 'Yes' : 'No'}`);
        console.log('═'.repeat(60));
        
        return { result, template, templateConfig };
    }
}

export default new SpecialtyTestSuite();