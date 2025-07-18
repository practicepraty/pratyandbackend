#!/usr/bin/env node

import AIService from './src/service/ai.service.js';

async function testCacheFix() {
    console.log('\n🧪 Testing Cache Fix');
    console.log('===================');
    
    // Test 1: Cardiology prompt
    console.log('\n1. Testing cardiology prompt...');
    const cardiologyPrompt = `
    Create professional medical website content for a cardiology practice.
    
    SPECIALTY: cardiology
    TIMESTAMP: ${Date.now()}
    Practice Description: "heart and cardiology"
    
    Generate test content.
    `;
    
    const cardiologyKey = AIService.generateCacheKey(cardiologyPrompt);
    console.log(`Cardiology cache key: ${cardiologyKey}`);
    
    // Test 2: Dentistry prompt
    console.log('\n2. Testing dentistry prompt...');
    const dentistryPrompt = `
    Create professional medical website content for a dentistry practice.
    
    SPECIALTY: dentistry
    TIMESTAMP: ${Date.now()}
    Practice Description: "teeth and dentistry"
    
    Generate test content.
    `;
    
    const dentistryKey = AIService.generateCacheKey(dentistryPrompt);
    console.log(`Dentistry cache key: ${dentistryKey}`);
    
    // Test 3: Check if keys are different
    console.log('\n3. Checking cache key uniqueness...');
    const areKeysDifferent = cardiologyKey !== dentistryKey;
    console.log(`Keys are different: ${areKeysDifferent ? '✅ YES' : '❌ NO'}`);
    
    if (areKeysDifferent) {
        console.log('🎉 Cache fix successful! Keys are now unique per specialty.');
    } else {
        console.log('❌ Cache fix failed! Keys are still the same.');
    }
    
    // Test 4: Check cache stats
    console.log('\n4. Current cache stats:');
    const stats = AIService.getCacheStats();
    console.log(stats);
    
    return areKeysDifferent;
}

testCacheFix()
    .then(success => {
        console.log(`\n${success ? '✅ Test passed!' : '❌ Test failed!'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });