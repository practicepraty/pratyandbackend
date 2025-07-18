import mongoose from 'mongoose';
import { Website } from './src/models/website.models.js';
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

// Create a test website
async function createTestWebsite() {
  try {
    await connectDB();
    
    const testWebsite = new Website({
      websiteTitle: "Dr. Test Doctor - Family Medicine",
      tagline: "Trusted partners for your family's lifelong health",
      specialty: "general medicine",
      userId: "68777ad8ebd8b4acbdbb98de", // User ID from our test user
      
      heroSection: {
        headline: "Personalized Care for Every Stage of Life",
        subheadline: "At Comprehensive Family Care, we provide attentive, compassionate medical services tailored to your unique needs.",
        ctaText: "Schedule Your Appointment"
      },
      
      aboutSection: {
        title: "About Our Practice",
        content: "Led by Dr. Test Doctor, our dedicated team has over a decade of experience in family medicine and preventive care. We are committed to building long-lasting partnerships with our patients, providing comprehensive services in a warm, welcoming environment."
      },
      
      services: [
        {
          name: "Routine Check-ups",
          description: "Regular physical exams and screenings to monitor your overall health and identify potential issues early.",
          icon: "stethoscope"
        },
        {
          name: "Chronic Disease Management",
          description: "Personalized treatment plans and ongoing support for conditions like diabetes, heart disease, and asthma.",
          icon: "heart"
        },
        {
          name: "Immunizations",
          description: "Recommended vaccinations for all ages, including annual flu shots and travel immunizations.",
          icon: "syringe"
        }
      ],
      
      contactInfo: {
        phone: "(123) 456-7890",
        email: "info@comprehensivefamilycare.com",
        address: "123 Main St, Test City, CA 12345",
        hours: "Monday - Friday: 8AM - 6PM, Saturday: 9AM - 1PM"
      },
      
      seoMeta: {
        title: "Comprehensive Family Care | General Practice in Test City",
        description: "Comprehensive Family Care provides personalized medical services for all ages. Visit our experienced team for routine check-ups, chronic care, and more.",
        keywords: ["family medicine", "general practice", "preventive care", "Test City", "chronic disease management"]
      },
      
      originalTranscription: "Hello, I am Dr. Test Doctor. I am a general practitioner with 10 years of experience. I specialize in family medicine and preventive care. My practice is located at 123 Main St, Test City, CA. I offer comprehensive medical services including routine checkups, vaccinations, and chronic disease management. You can contact me at test@example.com or call 1234567890 to schedule an appointment.",
      
      generationMetadata: {
        aiModel: "anthropic.claude-3-sonnet-20240229-v1:0",
        processingTime: 12423,
        fallbackUsed: false,
        confidenceScore: 1.0,
        regenerationCount: 0
      },
      
      generatedHtml: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dr. Test Doctor - Family Medicine</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 0; text-align: center; }
        .hero h1 { font-size: 2.5em; margin-bottom: 20px; }
        .hero p { font-size: 1.2em; margin-bottom: 30px; }
        .btn { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; }
        .section { padding: 60px 0; }
        .about { background: #f8f9fa; }
        .services { background: white; }
        .service-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 40px; }
        .service-card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .contact { background: #343a40; color: white; }
        .contact-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; margin-top: 40px; }
    </style>
</head>
<body>
    <section class="hero">
        <div class="container">
            <h1>Personalized Care for Every Stage of Life</h1>
            <p>At Comprehensive Family Care, we provide attentive, compassionate medical services tailored to your unique needs.</p>
            <a href="#contact" class="btn">Schedule Your Appointment</a>
        </div>
    </section>
    
    <section class="section about">
        <div class="container">
            <h2>About Our Practice</h2>
            <p>Led by Dr. Test Doctor, our dedicated team has over a decade of experience in family medicine and preventive care. We are committed to building long-lasting partnerships with our patients, providing comprehensive services in a warm, welcoming environment.</p>
        </div>
    </section>
    
    <section class="section services">
        <div class="container">
            <h2>Our Services</h2>
            <div class="service-grid">
                <div class="service-card">
                    <h3>Routine Check-ups</h3>
                    <p>Regular physical exams and screenings to monitor your overall health and identify potential issues early.</p>
                </div>
                <div class="service-card">
                    <h3>Chronic Disease Management</h3>
                    <p>Personalized treatment plans and ongoing support for conditions like diabetes, heart disease, and asthma.</p>
                </div>
                <div class="service-card">
                    <h3>Immunizations</h3>
                    <p>Recommended vaccinations for all ages, including annual flu shots and travel immunizations.</p>
                </div>
            </div>
        </div>
    </section>
    
    <section class="section contact" id="contact">
        <div class="container">
            <h2>Contact Us</h2>
            <div class="contact-info">
                <div>
                    <h3>Phone</h3>
                    <p>(123) 456-7890</p>
                </div>
                <div>
                    <h3>Email</h3>
                    <p>info@comprehensivefamilycare.com</p>
                </div>
                <div>
                    <h3>Address</h3>
                    <p>123 Main St, Test City, CA 12345</p>
                </div>
                <div>
                    <h3>Hours</h3>
                    <p>Monday - Friday: 8AM - 6PM<br>Saturday: 9AM - 1PM</p>
                </div>
            </div>
        </div>
    </section>
</body>
</html>`,
      
      status: 'published',
      qualityScore: 0.9,
      contentFeatures: ['comprehensive-services', 'detailed-highlights', 'compelling-hero'],
      isActive: true
    });
    
    const savedWebsite = await testWebsite.save();
    console.log('Test website created successfully!');
    console.log('Website ID:', savedWebsite._id.toString());
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error creating test website:', error);
    process.exit(1);
  }
}

createTestWebsite();