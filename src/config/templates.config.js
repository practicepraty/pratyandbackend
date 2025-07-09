// src/config/templates.config.js
export const DEFAULT_TEMPLATES = {
  cardiology: {
    name: "Cardiology Practice Template",
    specialty: "cardiology",
    template: {
      websiteTitle: "Heart Care Medical Center",
      tagline: "Your Heart Health is Our Priority",
      heroSection: {
        headline: "Expert Cardiac Care You Can Trust",
        subheadline: "Comprehensive cardiovascular services with advanced technology and compassionate care",
        ctaText: "Schedule Consultation"
      },
      aboutSection: {
        title: "About Our Cardiology Practice",
        content: "Our cardiology practice is dedicated to providing comprehensive heart care services with state-of-the-art technology and personalized treatment plans. Our experienced cardiologists specialize in diagnosing and treating various cardiovascular conditions, ensuring the best possible outcomes for our patients.",
        highlights: [
          "Board-certified cardiologists",
          "Advanced cardiac imaging",
          "Minimally invasive procedures",
          "Comprehensive heart health programs"
        ]
      },
      services: [
        {
          name: "Cardiac Consultation",
          description: "Complete cardiovascular evaluation and diagnosis",
          icon: "heart-icon"
        },
        {
          name: "ECG/EKG Testing",
          description: "Electrocardiogram testing for heart rhythm analysis",
          icon: "ecg-icon"
        },
        {
          name: "Stress Testing",
          description: "Exercise and pharmacologic stress testing",
          icon: "stress-test-icon"
        },
        {
          name: "Echocardiography",
          description: "Ultrasound imaging of the heart",
          icon: "echo-icon"
        },
        {
          name: "Heart Disease Prevention",
          description: "Preventive cardiology and risk assessment",
          icon: "prevention-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 123-4567",
        email: "info@heartcaremedical.com",
        address: "123 Cardiac Center Drive, Medical City, MC 12345",
        hours: "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 2:00 PM"
      },
      seoMeta: {
        title: "Heart Care Medical Center - Expert Cardiology Services",
        description: "Leading cardiology practice offering comprehensive heart care services. Expert cardiologists, advanced technology, and personalized treatment plans.",
        keywords: ["cardiology", "heart care", "cardiologist", "cardiac services", "heart health"]
      }
    }
  },

  orthopedics: {
    name: "Orthopedic Practice Template",
    specialty: "orthopedics",
    template: {
      websiteTitle: "OrthoCare Specialists",
      tagline: "Restoring Movement, Rebuilding Lives",
      heroSection: {
        headline: "Expert Orthopedic Care for Active Living",
        subheadline: "Specialized treatment for bones, joints, and muscles to get you back to doing what you love",
        ctaText: "Book Appointment"
      },
      aboutSection: {
        title: "About Our Orthopedic Practice",
        content: "Our orthopedic specialists are dedicated to helping patients overcome musculoskeletal challenges through advanced surgical and non-surgical treatments. We focus on personalized care plans that address each patient's unique needs and lifestyle goals.",
        highlights: [
          "Fellowship-trained orthopedic surgeons",
          "Minimally invasive surgical techniques",
          "Comprehensive rehabilitation programs",
          "Sports medicine expertise"
        ]
      },
      services: [
        {
          name: "Joint Replacement",
          description: "Hip, knee, and shoulder replacement procedures",
          icon: "joint-icon"
        },
        {
          name: "Sports Medicine",
          description: "Treatment for sports-related injuries and conditions",
          icon: "sports-icon"
        },
        {
          name: "Fracture Care",
          description: "Expert treatment for bone fractures and trauma",
          icon: "fracture-icon"
        },
        {
          name: "Spine Treatment",
          description: "Comprehensive spine care and surgery",
          icon: "spine-icon"
        },
        {
          name: "Arthritis Management",
          description: "Non-surgical and surgical arthritis treatments",
          icon: "arthritis-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 234-5678",
        email: "info@orthocarespecialists.com",
        address: "456 Orthopedic Plaza, Bone Health City, BH 23456",
        hours: "Mon-Fri: 7:00 AM - 7:00 PM, Sat: 8:00 AM - 4:00 PM"
      },
      seoMeta: {
        title: "OrthoCare Specialists - Expert Orthopedic Services",
        description: "Leading orthopedic practice specializing in joint replacement, sports medicine, and comprehensive bone and joint care.",
        keywords: ["orthopedics", "joint replacement", "sports medicine", "bone care", "orthopedic surgeon"]
      }
    }
  },

  dermatology: {
    name: "Dermatology Practice Template",
    specialty: "dermatology",
    template: {
      websiteTitle: "SkinCare Dermatology",
      tagline: "Healthy Skin, Confident You",
      heroSection: {
        headline: "Expert Dermatological Care for All Ages",
        subheadline: "Comprehensive skin care services from medical dermatology to cosmetic treatments",
        ctaText: "Schedule Consultation"
      },
      aboutSection: {
        title: "About Our Dermatology Practice",
        content: "Our dermatology practice offers comprehensive skin care services combining medical expertise with the latest technology. We provide personalized treatment plans for all dermatological conditions, from routine skin care to complex medical conditions.",
        highlights: [
          "Board-certified dermatologists",
          "Advanced skin cancer screening",
          "Cosmetic dermatology services",
          "Pediatric dermatology expertise"
        ]
      },
      services: [
        {
          name: "Skin Cancer Screening",
          description: "Early detection and treatment of skin cancers",
          icon: "screening-icon"
        },
        {
          name: "Acne Treatment",
          description: "Comprehensive acne management for all ages",
          icon: "acne-icon"
        },
        {
          name: "Cosmetic Dermatology",
          description: "Anti-aging treatments and aesthetic procedures",
          icon: "cosmetic-icon"
        },
        {
          name: "Psoriasis Care",
          description: "Advanced treatments for psoriasis and eczema",
          icon: "psoriasis-icon"
        },
        {
          name: "Mole Removal",
          description: "Safe and effective mole and lesion removal",
          icon: "mole-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 345-6789",
        email: "info@skincarederm.com",
        address: "789 Dermatology Center, Skin Health City, SH 34567",
        hours: "Mon-Fri: 8:00 AM - 5:00 PM, Sat: 9:00 AM - 1:00 PM"
      },
      seoMeta: {
        title: "SkinCare Dermatology - Expert Skin Care Services",
        description: "Professional dermatology practice offering medical and cosmetic skin care services. Expert dermatologists for all your skin health needs.",
        keywords: ["dermatology", "skin care", "dermatologist", "acne treatment", "skin cancer screening"]
      }
    }
  },

  pediatrics: {
    name: "Pediatric Practice Template",
    specialty: "pediatrics",
    template: {
      websiteTitle: "Little Ones Pediatrics",
      tagline: "Growing Healthy, Happy Children",
      heroSection: {
        headline: "Compassionate Pediatric Care",
        subheadline: "Dedicated to keeping your children healthy and supporting their development every step of the way",
        ctaText: "Schedule Visit"
      },
      aboutSection: {
        title: "About Our Pediatric Practice",
        content: "Our pediatric practice is committed to providing comprehensive healthcare for children from birth through adolescence. We create a welcoming environment where children feel comfortable and parents feel confident in their child's care.",
        highlights: [
          "Board-certified pediatricians",
          "Comprehensive developmental assessments",
          "Same-day sick appointments",
          "Adolescent medicine expertise"
        ]
      },
      services: [
        {
          name: "Well-Child Visits",
          description: "Regular check-ups and developmental screenings",
          icon: "checkup-icon"
        },
        {
          name: "Vaccinations",
          description: "Complete immunization programs",
          icon: "vaccine-icon"
        },
        {
          name: "Sick Child Care",
          description: "Prompt treatment for childhood illnesses",
          icon: "sick-care-icon"
        },
        {
          name: "Developmental Assessments",
          description: "Monitoring growth and development milestones",
          icon: "development-icon"
        },
        {
          name: "Adolescent Medicine",
          description: "Specialized care for teenagers",
          icon: "teen-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 456-7890",
        email: "info@littleonespediatrics.com",
        address: "321 Children's Health Way, Kid City, KC 45678",
        hours: "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 2:00 PM"
      },
      seoMeta: {
        title: "Little Ones Pediatrics - Expert Child Healthcare",
        description: "Compassionate pediatric care for children of all ages. Expert pediatricians providing comprehensive healthcare services.",
        keywords: ["pediatrics", "child healthcare", "pediatrician", "children's health", "vaccinations"]
      }
    }
  },

  'general medicine': {
    name: "General Medicine Practice Template",
    specialty: "general medicine",
    template: {
      websiteTitle: "Family Health Medical Center",
      tagline: "Comprehensive Healthcare for Life",
      heroSection: {
        headline: "Your Partner in Health and Wellness",
        subheadline: "Providing comprehensive medical care for patients of all ages with personalized attention",
        ctaText: "Schedule Appointment"
      },
      aboutSection: {
        title: "About Our Medical Practice",
        content: "Our family medicine practice is dedicated to providing comprehensive healthcare services for patients of all ages. We focus on preventive care, health maintenance, and the management of chronic conditions in a compassionate and professional environment.",
        highlights: [
          "Board-certified family physicians",
          "Comprehensive preventive care",
          "Chronic disease management",
          "Same-day appointments available"
        ]
      },
      services: [
        {
          name: "Annual Physical Exams",
          description: "Comprehensive health screenings and check-ups",
          icon: "physical-icon"
        },
        {
          name: "Preventive Care",
          description: "Vaccinations, screenings, and health maintenance",
          icon: "preventive-icon"
        },
        {
          name: "Chronic Disease Management",
          description: "Ongoing care for diabetes, hypertension, and other conditions",
          icon: "chronic-icon"
        },
        {
          name: "Urgent Care",
          description: "Same-day care for minor injuries and illnesses",
          icon: "urgent-icon"
        },
        {
          name: "Health Counseling",
          description: "Lifestyle counseling and health education",
          icon: "counseling-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 567-8901",
        email: "info@familyhealthmedical.com",
        address: "654 Family Medicine Drive, Health City, HC 56789",
        hours: "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 3:00 PM"
      },
      seoMeta: {
        title: "Family Health Medical Center - Comprehensive Healthcare",
        description: "Full-service family medicine practice providing comprehensive healthcare for all ages. Expert physicians offering personalized medical care.",
        keywords: ["family medicine", "primary care", "healthcare", "medical center", "physician"]
      }
    }
  }
};

// Function to get template by specialty
export const getTemplateBySpecialty = (specialty) => {
  const normalizedSpecialty = specialty.toLowerCase();
  return DEFAULT_TEMPLATES[normalizedSpecialty] || DEFAULT_TEMPLATES['general medicine'];
};

// Function to get all available specialties
export const getAvailableSpecialties = () => {
  return Object.keys(DEFAULT_TEMPLATES);
};

// Function to validate template structure
export const validateTemplateStructure = (template) => {
  const requiredFields = [
    'websiteTitle', 'tagline', 'heroSection', 'aboutSection', 
    'services', 'contactInfo', 'seoMeta'
  ];
  
  return requiredFields.every(field => template.hasOwnProperty(field));
};
