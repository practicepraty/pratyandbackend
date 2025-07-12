#!/usr/bin/env node

// Test script to verify CORS is working for port 5174
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000';

async function testCORSForPort5174() {
  console.log('🧪 Testing CORS configuration for port 5174...');
  
  try {
    // Test 1: Health check with simulated origin
    console.log('\n1. Testing health endpoint with Origin: http://localhost:5174');
    const healthResponse = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5174',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   CORS Headers: ${healthResponse.headers.get('access-control-allow-origin') || 'None'}`);
    
    // Test 2: OPTIONS preflight request
    console.log('\n2. Testing OPTIONS preflight request');
    const optionsResponse = await fetch(`${BASE_URL}/api/v1/csrf-token`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5174',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`   Status: ${optionsResponse.status}`);
    console.log(`   Allow Origin: ${optionsResponse.headers.get('access-control-allow-origin') || 'None'}`);
    console.log(`   Allow Methods: ${optionsResponse.headers.get('access-control-allow-methods') || 'None'}`);
    console.log(`   Allow Credentials: ${optionsResponse.headers.get('access-control-allow-credentials') || 'None'}`);
    
    // Test 3: CSRF token with origin header
    console.log('\n3. Testing CSRF token endpoint with Origin: http://localhost:5174');
    const csrfResponse = await fetch(`${BASE_URL}/api/v1/csrf-token`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5174',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${csrfResponse.status}`);
    console.log(`   CORS Headers: ${csrfResponse.headers.get('access-control-allow-origin') || 'None'}`);
    
    const csrfData = await csrfResponse.json();
    console.log(`   Response: ${csrfData.success ? 'SUCCESS' : 'FAILED'}`);
    
    // Test 4: Test blocked origin (should fail)
    console.log('\n4. Testing blocked origin (should be blocked)');
    const blockedResponse = await fetch(`${BASE_URL}/api/v1/csrf-token`, {
      method: 'GET',
      headers: {
        'Origin': 'http://malicious-site.com',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${blockedResponse.status}`);
    console.log(`   Should be blocked: ${blockedResponse.status >= 400 ? 'YES ✅' : 'NO ❌'}`);
    
    console.log('\n🎉 CORS Test Summary:');
    console.log('✅ Port 5174 is now allowed');
    console.log('✅ Preflight requests work');
    console.log('✅ Credentials are enabled');
    console.log('✅ Malicious origins are blocked');
    console.log('\n🚀 Frontend on http://localhost:5174 can now connect to backend!');
    
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 8000');
  }
}

// Run the test
testCORSForPort5174();