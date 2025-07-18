import mongoose from 'mongoose';
import { Website } from './src/models/website.models.js';
import { User } from './src/models/user.models.js';
import { config } from './src/config/environment.js';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Debug database content
async function debugDatabase() {
  try {
    await connectDB();
    
    console.log('\n=== USERS ===');
    const users = await User.find().select('personalInfo.firstName personalInfo.lastName personalInfo.professionalEmail');
    console.log('Found users:', users.length);
    users.forEach(user => {
      console.log(`User ID: ${user._id}`);
      console.log(`Name: ${user.personalInfo.firstName} ${user.personalInfo.lastName}`);
      console.log(`Email: ${user.personalInfo.professionalEmail}`);
      console.log('---');
    });
    
    console.log('\n=== WEBSITES ===');
    const websites = await Website.find().select('websiteTitle userId specialty isActive status');
    console.log('Found websites:', websites.length);
    websites.forEach(website => {
      console.log(`Website ID: ${website._id}`);
      console.log(`Title: ${website.websiteTitle}`);
      console.log(`User ID: ${website.userId}`);
      console.log(`Specialty: ${website.specialty}`);
      console.log(`Active: ${website.isActive}`);
      console.log(`Status: ${website.status}`);
      console.log('---');
    });
    
    // Try to find websites for our test user
    const testUserEmail = 'test@example.com';
    console.log(`\n=== WEBSITES FOR ${testUserEmail} ===`);
    const testUser = await User.findOne({ 'personalInfo.professionalEmail': testUserEmail });
    if (testUser) {
      console.log(`Test user ID: ${testUser._id}`);
      const userWebsites = await Website.find({ userId: testUser._id });
      console.log(`Found ${userWebsites.length} websites for test user`);
      userWebsites.forEach(website => {
        console.log(`Website: ${website.websiteTitle} (${website._id})`);
      });
    } else {
      console.log('Test user not found');
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error debugging database:', error);
    process.exit(1);
  }
}

debugDatabase();