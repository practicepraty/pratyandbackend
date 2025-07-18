#!/usr/bin/env node

// Test script to check API logging
const BASE_URL = 'http://localhost:8000'; // Try the expected port first

async function testAPI() {
    console.log('🔍 Testing API endpoints and logging...');
    
    // Test health endpoint first
    try {
        console.log('Testing health endpoint...');
        const healthResponse = await fetch(`${BASE_URL}/health`);
        console.log(`Health endpoint status: ${healthResponse.status}`);
        const healthData = await healthResponse.text();
        console.log(`Health response: ${healthData}`);
    } catch (error) {
        console.log(`Health endpoint error: ${error.message}`);
    }
    
    // Test website generation endpoint
    try {
        console.log('\nTesting website generation endpoint...');
        const response = await fetch(`${BASE_URL}/api/v1/website-generation/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({
                transcribedContent: 'I am Dr. Sarah Johnson, a dermatologist with 15 years of experience. I specialize in skin cancer detection, acne treatment, and cosmetic procedures.',
                specialty: 'dermatology',
                saveToDatabase: false
            })
        });
        
        console.log(`Website generation status: ${response.status}`);
        const data = await response.text();
        console.log(`Website generation response: ${data.substring(0, 200)}...`);
        
    } catch (error) {
        console.log(`Website generation error: ${error.message}`);
    }
    
    // Test different ports
    const ports = [8000, 8001, 8002, 8003, 8004, 8005];
    
    for (const port of ports) {
        try {
            console.log(`\nTesting port ${port}...`);
            const response = await fetch(`http://localhost:${port}/health`, {
                method: 'GET',
                timeout: 2000
            });
            
            if (response.ok) {
                const data = await response.text();
                console.log(`✅ Port ${port} is active with health endpoint`);
                console.log(`Response: ${data}`);
                break;
            }
        } catch (error) {
            console.log(`❌ Port ${port} not responding: ${error.message}`);
        }
    }
}

testAPI().catch(console.error);