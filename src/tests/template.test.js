// src/tests/template.test.js - Template System Tests
import TemplateService from '../service/template.service.js';

// Test data for different specialties
const testData = {
    general: {
        websiteTitle: "Family Health Medical Center",
        tagline: "Comprehensive Healthcare for Life",
        specialty: "general-practice",
        heroSection: {
            headline: "Your Partner in Health and Wellness",
            subheadline: "Providing comprehensive medical care for patients of all ages",
            ctaText: "Schedule Appointment"
        },
        aboutSection: {
            title: "About Our Practice",
            content: "Our family medicine practice is dedicated to providing comprehensive healthcare services for patients of all ages.",
            highlights: [
                "Board-certified physicians",
                "Comprehensive preventive care",
                "Same-day appointments available"
            ]
        },
        services: [
            {
                name: "Annual Physical Exams",
                description: "Comprehensive health screenings and check-ups",
                icon: "stethoscope"
            },
            {
                name: "Preventive Care",
                description: "Vaccinations, screenings, and health maintenance",
                icon: "shield-alt"
            },
            {
                name: "Chronic Disease Management",
                description: "Ongoing care for diabetes, hypertension, and other conditions",
                icon: "pills"
            }
        ],
        contactInfo: {
            phone: "(555) 123-4567",
            email: "info@familyhealth.com",
            address: "123 Family Medicine Drive, Health City, HC 12345",
            hours: "Mon-Fri: 8:00 AM - 6:00 PM"
        },
        seoMeta: {
            title: "Family Health Medical Center - Comprehensive Healthcare",
            description: "Full-service family medicine practice providing comprehensive healthcare for all ages.",
            keywords: ["family medicine", "primary care", "healthcare", "medical center"]
        }
    },
    cardiology: {
        websiteTitle: "Heart Care Medical Center",
        tagline: "Your Heart Health is Our Priority",
        specialty: "cardiology",
        heroSection: {
            headline: "Expert Cardiac Care You Can Trust",
            subheadline: "Comprehensive cardiovascular services with advanced technology",
            ctaText: "Schedule Consultation"
        },
        aboutSection: {
            title: "About Our Cardiology Practice",
            content: "Our cardiology practice provides comprehensive heart care services with state-of-the-art technology.",
            highlights: [
                "Board-certified cardiologists",
                "Advanced cardiac imaging",
                "Minimally invasive procedures"
            ]
        },
        services: [
            {
                name: "Cardiac Consultation",
                description: "Complete cardiovascular evaluation and diagnosis",
                icon: "heartbeat"
            },
            {
                name: "ECG/EKG Testing",
                description: "Electrocardiogram testing for heart rhythm analysis",
                icon: "chart-line"
            },
            {
                name: "Stress Testing",
                description: "Exercise and pharmacologic stress testing",
                icon: "running"
            }
        ],
        contactInfo: {
            phone: "(555) 234-5678",
            email: "info@heartcare.com",
            address: "456 Cardiac Center Drive, Heart City, HC 23456",
            hours: "Mon-Fri: 8:00 AM - 6:00 PM"
        },
        seoMeta: {
            title: "Heart Care Medical Center - Expert Cardiology Services",
            description: "Leading cardiology practice offering comprehensive heart care services.",
            keywords: ["cardiology", "heart care", "cardiologist", "cardiac services"]
        }
    },
    pediatrics: {
        websiteTitle: "Little Ones Pediatrics",
        tagline: "Growing Healthy, Happy Children",
        specialty: "pediatrics",
        heroSection: {
            headline: "Compassionate Pediatric Care",
            subheadline: "Dedicated to keeping your children healthy and supporting their development",
            ctaText: "Schedule Visit"
        },
        aboutSection: {
            title: "About Our Pediatric Practice",
            content: "Our pediatric practice is committed to providing comprehensive healthcare for children from birth through adolescence.",
            highlights: [
                "Board-certified pediatricians",
                "Child-friendly environment",
                "Comprehensive developmental assessments"
            ]
        },
        services: [
            {
                name: "Well-Child Visits",
                description: "Regular check-ups and developmental screenings",
                icon: "child"
            },
            {
                name: "Vaccinations",
                description: "Complete immunization programs",
                icon: "syringe"
            },
            {
                name: "Sick Child Care",
                description: "Prompt treatment for childhood illnesses",
                icon: "thermometer"
            }
        ],
        contactInfo: {
            phone: "(555) 345-6789",
            email: "info@littleonespediatrics.com",
            address: "789 Children's Health Way, Kid City, KC 34567",
            hours: "Mon-Fri: 8:00 AM - 6:00 PM"
        },
        seoMeta: {
            title: "Little Ones Pediatrics - Expert Child Healthcare",
            description: "Compassionate pediatric care for children of all ages.",
            keywords: ["pediatrics", "child healthcare", "pediatrician", "children's health"]
        }
    }
};

// Test functions
async function testTemplateService() {
    console.log('\n=== Template Service Tests ===\n');
    
    // Test 1: Template mapping
    console.log('1. Testing template mapping...');
    const mappings = [
        { input: 'cardiology', expected: 'cardiology' },
        { input: 'heart', expected: 'cardiology' },
        { input: 'pediatrics', expected: 'pediatrics' },
        { input: 'children', expected: 'pediatrics' },
        { input: 'dentistry', expected: 'dentistry' },
        { input: 'unknown-specialty', expected: 'general-practice' }
    ];
    
    mappings.forEach(({ input, expected }) => {
        const result = TemplateService.mapSpecialtyToTemplate(input);
        console.log(`   ${input} -> ${result} ${result === expected ? '✓' : '✗'}`);
    });
    
    // Test 2: Template configuration
    console.log('\n2. Testing template configuration...');
    const config = TemplateService.getTemplateConfig('cardiology');
    console.log('   Cardiology config:', {
        templateName: config.templateName,
        primaryColor: config.colors.primary,
        features: Object.keys(config.features).length
    });
    
    // Test 3: Available templates
    console.log('\n3. Testing available templates...');
    const templates = TemplateService.getAvailableTemplates();
    console.log(`   Found ${templates.length} templates:`, templates.map(t => t.name));
    
    // Test 4: Template data validation
    console.log('\n4. Testing template data validation...');
    const validData = testData.general;
    const invalidData = { websiteTitle: 'AB' }; // Too short
    
    const validResult = TemplateService.validateTemplateData(validData);
    const invalidResult = TemplateService.validateTemplateData(invalidData);
    
    console.log(`   Valid data: ${validResult.isValid ? '✓' : '✗'}`);
    console.log(`   Invalid data: ${invalidResult.isValid ? '✗' : '✓'} (${invalidResult.errors.length} errors)`);
    
    // Test 5: Website generation
    console.log('\n5. Testing website generation...');
    
    for (const [specialty, data] of Object.entries(testData)) {
        try {
            const website = TemplateService.generateWebsite(data);
            const success = website.html && website.html.includes(data.websiteTitle);
            console.log(`   ${specialty}: ${success ? '✓' : '✗'} (${website.html ? website.html.length : 0} chars)`);
            
            if (success) {
                // Check if template contains expected elements
                const hasHeader = website.html.includes('<header');
                const hasFooter = website.html.includes('<footer');
                const hasServices = website.html.includes('services-section');
                const hasContact = website.html.includes('contact-section');
                
                console.log(`     Structure: Header(${hasHeader ? '✓' : '✗'}) Footer(${hasFooter ? '✓' : '✗'}) Services(${hasServices ? '✓' : '✗'}) Contact(${hasContact ? '✓' : '✗'})`);
            }
        } catch (error) {
            console.log(`   ${specialty}: ✗ (Error: ${error.message})`);
        }
    }
    
    // Test 6: Cache functionality
    console.log('\n6. Testing cache functionality...');
    const cacheStats = TemplateService.getCacheStats();
    console.log(`   Cached templates: ${cacheStats.cachedTemplates}`);
    console.log(`   Cache keys: ${cacheStats.cacheKeys.join(', ')}`);
    
    // Test 7: Preview generation
    console.log('\n7. Testing preview generation...');
    const previewData = TemplateService.generatePreviewData('dermatology');
    console.log(`   Preview data generated: ${previewData.websiteTitle ? '✓' : '✗'}`);
    
    console.log('\n=== Tests Complete ===\n');
}

// Run tests
testTemplateService().catch(console.error);

export { testTemplateService, testData };