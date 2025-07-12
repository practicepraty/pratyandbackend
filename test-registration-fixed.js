import axios from 'axios';

// Test registration with proper data structure
const testRegistration = async () => {
  try {
    console.log('Testing user registration...');
    
    // Create axios instance with credentials
    const axiosInstance = axios.create({
      baseURL: 'http://localhost:8000',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // First, get CSRF token
    console.log('Getting CSRF token...');
    const csrfResponse = await axiosInstance.get('/api/v1/csrf-token');
    const csrfToken = csrfResponse.data.data.csrfToken;
    console.log('CSRF token obtained:', csrfToken);

    const userData = {
      // Personal info
      firstName: 'John',
      lastName: 'Doe',
      professionalEmail: 'john.doe.test@example.com',
      phone: '+1234567890',
      dateOfBirth: '1985-05-15',
      gender: 'male',
      
      // Professional info
      specialty: 'general-practice',
      licenseNumber: 'MD123456',
      licenseState: 'CA',
      yearsOfExperience: '6-10',
      medicalSchool: 'Stanford Medical School',
      
      // Practice info
      practiceType: 'private-practice',
      institutionName: 'Downtown Medical Center',
      
      // Address info
      street: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'US',
      
      // Account info
      password: 'TestPassword123'
    };

    console.log('Sending registration request...');
    console.log('Data being sent:', JSON.stringify(userData, null, 2));

    const response = await axiosInstance.post('/api/v1/users/register-dev', userData, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('✅ Registration successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Registration failed!');
    console.error('Status:', error.response?.status);
    console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error message:', error.message);
  }
};

testRegistration();