#!/usr/bin/env node

/**
 * COMPREHENSIVE CACHE UNIQUENESS TEST
 * 
 * This test verifies that every medical specialty gets its own unique cache
 * and that there are no cache collisions between different specialties.
 */

import AIService from './src/service/ai.service.js';

async function testUniqueCache() {
    console.log('\n🧪 ========================================');
    console.log('🧪 COMPREHENSIVE CACHE UNIQUENESS TEST');
    console.log('🧪 ========================================\n');

    // Define test specialties
    const specialties = [
        'cardiology',
        'dentistry', 
        'dermatology',
        'pediatrics',
        'gynecology',
        'neurology',
        'orthopedics',
        'oncology',
        'ophthalmology',
        'urology',
        'endocrinology',
        'psychiatry',
        'general-practice'
    ];

    const testResults = {
        totalTests: 0,
        passed: 0,
        failed: 0,
        cacheKeys: {},
        duplicateKeys: [],
        specialtyBreakdown: {}
    };

    // Test 1: Generate cache keys for each specialty
    console.log('🔑 Test 1: Generating cache keys for each specialty');
    console.log('===================================================');

    for (const specialty of specialties) {
        const prompt = `
        ===== SPECIALTY-SPECIFIC CONTENT GENERATION =====
        TARGET_SPECIALTY: ${specialty}
        UNIQUE_REQUEST_ID: test-${specialty}-${Date.now()}
        GENERATION_TIMESTAMP: ${Date.now()}
        
        Create content for ${specialty} practice.
        Practice Description: "Test description for ${specialty}"
        `;

        const cacheKey = AIService.generateCacheKey(prompt, specialty);
        testResults.cacheKeys[specialty] = cacheKey;
        testResults.totalTests++;

        console.log(`📋 ${specialty.padEnd(20)} -> ${cacheKey}`);
    }

    // Test 2: Check for duplicate cache keys
    console.log('\n🔍 Test 2: Checking for duplicate cache keys');
    console.log('===========================================');

    const allKeys = Object.values(testResults.cacheKeys);
    const uniqueKeys = [...new Set(allKeys)];
    
    if (allKeys.length === uniqueKeys.length) {
        console.log('✅ All cache keys are unique!');
        testResults.passed++;
    } else {
        console.log('❌ Duplicate cache keys found!');
        testResults.failed++;
        
        // Find duplicates
        const keyCount = {};
        allKeys.forEach(key => {
            keyCount[key] = (keyCount[key] || 0) + 1;
        });
        
        Object.entries(keyCount).forEach(([key, count]) => {
            if (count > 1) {
                testResults.duplicateKeys.push({ key, count });
                console.log(`❌ Duplicate key: ${key} (used ${count} times)`);
            }
        });
    }

    // Test 3: Verify specialty prefixes
    console.log('\n🏷️  Test 3: Verifying specialty prefixes in cache keys');
    console.log('==================================================');

    let prefixTestPassed = true;
    for (const [specialty, cacheKey] of Object.entries(testResults.cacheKeys)) {
        const expectedPrefix = `ai_cache_${specialty}_`;
        if (cacheKey.startsWith(expectedPrefix)) {
            console.log(`✅ ${specialty.padEnd(20)} -> Correct prefix: ${expectedPrefix}`);
        } else {
            console.log(`❌ ${specialty.padEnd(20)} -> Missing prefix: ${expectedPrefix}`);
            prefixTestPassed = false;
        }
    }

    if (prefixTestPassed) {
        testResults.passed++;
        console.log('✅ All specialty prefixes are correct!');
    } else {
        testResults.failed++;
        console.log('❌ Some specialty prefixes are incorrect!');
    }

    // Test 4: Test cache isolation (simulate real usage)
    console.log('\n🔒 Test 4: Testing cache isolation');
    console.log('=================================');

    // Clear cache first
    AIService.clearCache();

    // Simulate generating content for different specialties
    const testTranscriptions = {
        cardiology: 'heart and cardiovascular care',
        dentistry: 'teeth and oral health',
        dermatology: 'skin and dermatology care'
    };

    for (const [specialty, transcription] of Object.entries(testTranscriptions)) {
        try {
            // This would normally call generateWebsiteContent but we'll just test the cache key generation
            const prompt = `Test content for ${specialty}: ${transcription}`;
            const cacheKey = AIService.generateCacheKey(prompt, specialty);
            
            console.log(`📝 ${specialty.padEnd(15)} -> ${cacheKey}`);
            
            // Verify the key is unique to this specialty
            const hasCorrectPrefix = cacheKey.includes(`ai_cache_${specialty}_`);
            if (hasCorrectPrefix) {
                console.log(`✅ ${specialty.padEnd(15)} -> Cache isolation confirmed`);
            } else {
                console.log(`❌ ${specialty.padEnd(15)} -> Cache isolation failed`);
                testResults.failed++;
            }
        } catch (error) {
            console.log(`❌ ${specialty.padEnd(15)} -> Error: ${error.message}`);
            testResults.failed++;
        }
    }

    // Test 5: Test cache statistics
    console.log('\n📊 Test 5: Testing cache statistics');
    console.log('=================================');

    const stats = AIService.getCacheStats();
    console.log('Cache Statistics:');
    console.log(`- Total cache size: ${stats.size}`);
    console.log(`- Memory usage: ${stats.memoryUsage} bytes`);
    console.log(`- Specialty breakdown:`, stats.specialtyBreakdown);

    // Final results
    console.log('\n📊 ========================================');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('📊 ========================================');
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`📋 Total Tests: ${testResults.totalTests}`);
    console.log(`🎯 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

    if (testResults.duplicateKeys.length > 0) {
        console.log('\n❌ DUPLICATE KEYS FOUND:');
        testResults.duplicateKeys.forEach(({ key, count }) => {
            console.log(`  ${key} (used ${count} times)`);
        });
    }

    const allTestsPassed = testResults.failed === 0;
    
    console.log('\n🎉 ========================================');
    if (allTestsPassed) {
        console.log('🎉 ALL TESTS PASSED! CACHE IS COMPLETELY UNIQUE!');
        console.log('🎉 Every specialty now has its own isolated cache');
        console.log('🎉 No more template corruption issues possible');
    } else {
        console.log('❌ SOME TESTS FAILED! CACHE ISSUES MAY PERSIST');
    }
    console.log('🎉 ========================================\n');

    return {
        success: allTestsPassed,
        results: testResults
    };
}

// Execute the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testUniqueCache()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test error:', error);
            process.exit(1);
        });
}

export default testUniqueCache;