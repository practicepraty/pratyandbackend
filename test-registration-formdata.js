import FormData from 'form-data';
import axios from 'axios';
import fs from 'fs';

const testFormDataRegistration = async () => {
  try {
    console.log('Testing FormData registration...');
    
    const form = new FormData();
    
    // Add all required fields
    form.append('firstName', 'Dr. FormData');
    form.append('lastName', 'Test');
    form.append('professionalEmail', 'formdata.unique@example.com');
    form.append('phone', '+9999999999');
    form.append('dateOfBirth', '1985-01-01');
    form.append('gender', 'male');
    form.append('specialty', 'general-practice');
    form.append('licenseNumber', 'FORMDATA999');
    form.append('licenseState', 'CA');
    form.append('yearsOfExperience', '6-10');
    form.append('medicalSchool', 'FormData Medical School');
    form.append('practiceType', 'private-practice');
    form.append('institutionName', 'FormData Clinic');
    form.append('street', '123 FormData St');
    form.append('city', 'FormData City');
    form.append('state', 'CA');
    form.append('zipCode', '12345');
    form.append('country', 'US');
    form.append('password', 'FormDataPass123');
    
    // Skip file upload for this test
    // const testFile = Buffer.from('Test file content');
    // form.append('profilePhoto', testFile, {
    //   filename: 'test-photo.jpg',
    //   contentType: 'image/jpeg'
    // });

    console.log('Sending FormData request...');
    
    const response = await axios.post('http://localhost:8000/api/v1/users/register-dev', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000
    });

    console.log('✅ FormData registration successful!');
    console.log('Response status:', response.status);
    console.log('User created:', response.data.data.personalInfo.firstName, response.data.data.personalInfo.lastName);

  } catch (error) {
    console.error('❌ FormData registration failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
};

testFormDataRegistration();