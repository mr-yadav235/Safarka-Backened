import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testAuthValidation() {
  console.log('🧪 Testing Auth Validation Service...\n');

  try {
    // Test 1: Login to get a valid token
    console.log('1️⃣ Testing login to get token...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      phone_number: '+919876543210', // Replace with a valid phone number
      password: 'password123' // Replace with a valid password
    });

    if (loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      console.log('✅ Login successful, token received');
      
      // Test 2: Validate the token
      console.log('\n2️⃣ Testing token validation...');
      const validateResponse = await axios.get(`${API_BASE}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (validateResponse.data.success) {
        console.log('✅ Token validation successful');
        console.log('📋 User info:', JSON.stringify(validateResponse.data.data.user, null, 2));
      } else {
        console.log('❌ Token validation failed:', validateResponse.data.message);
      }
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }

  // Test 3: Test with invalid token
  console.log('\n3️⃣ Testing with invalid token...');
  try {
    await axios.get(`${API_BASE}/auth/validate`, {
      headers: {
        'Authorization': 'Bearer invalid_token_here'
      }
    });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Invalid token correctly rejected');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 4: Test with no token
  console.log('\n4️⃣ Testing with no token...');
  try {
    await axios.get(`${API_BASE}/auth/validate`);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ No token correctly rejected');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  console.log('\n🏁 Auth validation tests completed!');
}

// Run the test
testAuthValidation().catch(console.error);
