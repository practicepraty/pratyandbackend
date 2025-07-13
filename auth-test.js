import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8002';
const API_BASE = `${BASE_URL}/api/v1`;

async function testAuthFlow() {
  console.log('=== Authorization Flow Test ===\n');

  try {
    // Test 1: Access jobs endpoint without authentication (should fail)
    console.log('Test 1: Accessing /jobs without authentication...');
    const response1 = await fetch(`${API_BASE}/processing/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', JSON.stringify(result1, null, 2));
    
    if (response1.status === 401) {
      console.log('✅ Unauthorized access correctly blocked\n');
    } else {
      console.log('❌ Expected 401 Unauthorized\n');
    }

    // Test 2: Access status endpoint without authentication (should fail) 
    console.log('Test 2: Accessing /status/:id without authentication...');
    const testRequestId = '12345678-1234-1234-1234-123456789012';
    const response2 = await fetch(`${API_BASE}/processing/status/${testRequestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', JSON.stringify(result2, null, 2));
    
    if (response2.status === 401) {
      console.log('✅ Unauthorized access correctly blocked\n');
    } else {
      console.log('❌ Expected 401 Unauthorized\n');
    }

    // Test 3: Access health endpoint (should work without auth)
    console.log('Test 3: Accessing /health endpoint...');
    const response3 = await fetch(`${API_BASE}/processing/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Response:', JSON.stringify(result3, null, 2));
    
    if (response3.status === 200) {
      console.log('✅ Health endpoint accessible without auth\n');
    } else {
      console.log('❌ Health endpoint should be accessible\n');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAuthFlow();