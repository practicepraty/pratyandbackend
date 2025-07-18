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
        title: "Heart Care Medical Center - Cardiology Services",
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
        title: "OrthoCare Specialists - Orthopedic Services",
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
        title: "SkinCare Dermatology - Skin Care Services",
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
        title: "Little Ones Pediatrics - Child Healthcare",
        description: "Compassionate pediatric care for children of all ages. Expert pediatricians providing comprehensive healthcare services.",
        keywords: ["pediatrics", "child healthcare", "pediatrician", "children's health", "vaccinations"]
      }
    }
  },

  gynecology: {
    name: "Gynecology Practice Template",
    specialty: "gynecology",
    template: {
      websiteTitle: "Women's Health Medical Center",
      tagline: "Comprehensive Women's Healthcare",
      heroSection: {
        headline: "Expert Women's Health Care",
        subheadline: "Providing comprehensive gynecological services with compassionate, personalized care",
        ctaText: "Schedule Appointment"
      },
      aboutSection: {
        title: "About Our Gynecology Practice",
        content: "Our gynecology practice is dedicated to providing comprehensive women's healthcare services. We focus on preventive care, reproductive health, and specialized treatments in a comfortable and confidential environment.",
        highlights: [
          "Board-certified gynecologists",
          "Comprehensive women's health services",
          "Advanced diagnostic capabilities",
          "Confidential and comfortable environment"
        ]
      },
      services: [
        {
          name: "Gynecological Exams",
          description: "Comprehensive women's health examinations",
          icon: "gynecology-icon"
        },
        {
          name: "Prenatal Care",
          description: "Complete pregnancy care and monitoring",
          icon: "prenatal-icon"
        },
        {
          name: "Family Planning",
          description: "Contraception and reproductive health counseling",
          icon: "family-planning-icon"
        },
        {
          name: "Menopause Management",
          description: "Support and treatment for menopausal symptoms",
          icon: "menopause-icon"
        },
        {
          name: "Reproductive Health",
          description: "Comprehensive reproductive health services",
          icon: "reproductive-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 345-6789",
        email: "info@womenshealthcenter.com",
        address: "456 Women's Health Plaza, Healthcare City, HC 34567",
        hours: "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 2:00 PM"
      },
      seoMeta: {
        title: "Women's Health Medical Center - Gynecology",
        description: "Expert gynecological care including women's health exams, prenatal care, and reproductive health services.",
        keywords: ["gynecology", "women's health", "prenatal care", "reproductive health", "gynecologist"]
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
        title: "Family Health Medical Center - Healthcare",
        description: "Full-service family medicine practice providing comprehensive healthcare for all ages. Expert physicians offering personalized medical care.",
        keywords: ["family medicine", "primary care", "healthcare", "medical center", "physician"]
      }
    }
  },

  // ADD MISSING TEMPLATES TO PREVENT WRONG MAPPINGS
  dentistry: {
    name: "Dentistry Practice Template",
    specialty: "dentistry",
    template: {
      websiteTitle: "Dental Care Excellence",
      tagline: "Healthy Smiles, Happy Lives",
      heroSection: {
        headline: "Expert Dental Care for the Whole Family",
        subheadline: "Comprehensive dental services in a comfortable, modern environment with personalized attention",
        ctaText: "Book Appointment"
      },
      aboutSection: {
        title: "About Our Dental Practice",
        content: "Our dental practice provides comprehensive oral healthcare services for patients of all ages. We combine advanced dental technology with gentle, compassionate care to ensure optimal oral health and beautiful smiles.",
        highlights: [
          "Board-certified dentists",
          "State-of-the-art dental technology",
          "Comprehensive family dental care",
          "Comfortable, modern facilities"
        ]
      },
      services: [
        {
          name: "Dental Cleanings",
          description: "Professional teeth cleaning and oral hygiene",
          icon: "cleaning-icon"
        },
        {
          name: "Fillings & Restorations",
          description: "Tooth-colored fillings and dental restorations",
          icon: "filling-icon"
        },
        {
          name: "Root Canal Therapy",
          description: "Advanced endodontic treatment",
          icon: "root-canal-icon"
        },
        {
          name: "Orthodontics",
          description: "Braces and teeth straightening solutions",
          icon: "braces-icon"
        },
        {
          name: "Oral Surgery",
          description: "Tooth extractions and oral surgical procedures",
          icon: "surgery-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 123-4567",
        email: "info@dentalcareexcellence.com",
        address: "456 Dental Plaza, Smile City, SC 12345",
        hours: "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 2:00 PM"
      },
      seoMeta: {
        title: "Dental Care Excellence - Comprehensive Dentistry",
        description: "Expert dental care for the whole family. Comprehensive dentistry services including cleanings, fillings, root canals, and orthodontics.",
        keywords: ["dentistry", "dental care", "dentist", "teeth cleaning", "oral health", "orthodontics"]
      }
    }
  },

  neurology: {
    name: "Neurology Practice Template",
    specialty: "neurology",
    template: {
      websiteTitle: "NeuroHealth Specialists",
      tagline: "Advanced Neurological Care",
      heroSection: {
        headline: "Expert Neurological Care You Can Trust",
        subheadline: "Comprehensive neurological services with advanced diagnostic technology and personalized treatment plans",
        ctaText: "Schedule Consultation"
      },
      aboutSection: {
        title: "About Our Neurology Practice",
        content: "Our neurology practice specializes in diagnosing and treating disorders of the brain, spinal cord, and nervous system. We provide comprehensive neurological care using the latest medical technology and evidence-based treatments.",
        highlights: [
          "Board-certified neurologists",
          "Advanced diagnostic capabilities",
          "Comprehensive neurological care",
          "State-of-the-art technology"
        ]
      },
      services: [
        {
          name: "Neurological Consultations",
          description: "Comprehensive neurological evaluations",
          icon: "consultation-icon"
        },
        {
          name: "Stroke Treatment",
          description: "Emergency and ongoing stroke care",
          icon: "stroke-icon"
        },
        {
          name: "Epilepsy Management",
          description: "Comprehensive seizure disorder treatment",
          icon: "epilepsy-icon"
        },
        {
          name: "Headache Treatment",
          description: "Migraine and headache management",
          icon: "headache-icon"
        },
        {
          name: "Movement Disorders",
          description: "Parkinson's and other movement disorder care",
          icon: "movement-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 789-0123",
        email: "info@neurohealthspecialists.com",
        address: "789 Neurology Center, Brain Health City, BH 78901",
        hours: "Mon-Fri: 8:00 AM - 5:00 PM"
      },
      seoMeta: {
        title: "NeuroHealth Specialists - Neurological Care",
        description: "Expert neurological care for brain, spine, and nervous system disorders. Comprehensive neurology services with advanced diagnostics.",
        keywords: ["neurology", "neurologist", "brain health", "stroke treatment", "epilepsy", "headache"]
      }
    }
  },

  psychiatry: {
    name: "Psychiatry Practice Template",
    specialty: "psychiatry",
    template: {
      websiteTitle: "Mental Health Partners",
      tagline: "Mental Health, Real Solutions",
      heroSection: {
        headline: "Comprehensive Mental Health Care",
        subheadline: "Professional psychiatric services and therapy in a supportive, confidential environment",
        ctaText: "Schedule Appointment"
      },
      aboutSection: {
        title: "About Our Mental Health Practice",
        content: "Our mental health practice provides comprehensive psychiatric care and therapy services. We believe in a holistic approach to mental wellness, combining medication management with therapeutic interventions.",
        highlights: [
          "Board-certified psychiatrists",
          "Licensed therapists and counselors",
          "Comprehensive mental health services",
          "Confidential, supportive environment"
        ]
      },
      services: [
        {
          name: "Psychiatric Evaluations",
          description: "Comprehensive mental health assessments",
          icon: "evaluation-icon"
        },
        {
          name: "Medication Management",
          description: "Psychiatric medication monitoring and adjustment",
          icon: "medication-icon"
        },
        {
          name: "Individual Therapy",
          description: "One-on-one counseling and therapy sessions",
          icon: "therapy-icon"
        },
        {
          name: "Group Therapy",
          description: "Therapeutic group sessions and support groups",
          icon: "group-icon"
        },
        {
          name: "Crisis Intervention",
          description: "Emergency mental health support",
          icon: "crisis-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 456-7890",
        email: "info@mentalhealthpartners.com",
        address: "321 Mental Health Drive, Wellness City, WC 32145",
        hours: "Mon-Fri: 9:00 AM - 6:00 PM, Sat: 10:00 AM - 2:00 PM"
      },
      seoMeta: {
        title: "Mental Health Partners - Psychiatric Care",
        description: "Comprehensive mental health services including psychiatric evaluations, therapy, and medication management in a supportive environment.",
        keywords: ["psychiatry", "mental health", "therapy", "counseling", "depression", "anxiety"]
      }
    }
  },

  oncology: {
    name: "Oncology Practice Template",
    specialty: "oncology",
    template: {
      websiteTitle: "Comprehensive Cancer Care",
      tagline: "Fighting Cancer Together",
      heroSection: {
        headline: "Advanced Cancer Treatment & Care",
        subheadline: "Comprehensive oncology services with cutting-edge treatments and compassionate support",
        ctaText: "Schedule Consultation"
      },
      aboutSection: {
        title: "About Our Oncology Practice",
        content: "Our oncology practice provides comprehensive cancer care with the latest treatment options and technologies. We offer personalized treatment plans and support services to help patients and families through their cancer journey.",
        highlights: [
          "Board-certified oncologists",
          "Advanced cancer treatments",
          "Comprehensive support services",
          "Multidisciplinary care team"
        ]
      },
      services: [
        {
          name: "Cancer Diagnosis",
          description: "Advanced diagnostic services and staging",
          icon: "diagnosis-icon"
        },
        {
          name: "Chemotherapy",
          description: "Systemic cancer treatment therapies",
          icon: "chemo-icon"
        },
        {
          name: "Radiation Therapy",
          description: "Targeted radiation treatments",
          icon: "radiation-icon"
        },
        {
          name: "Immunotherapy",
          description: "Cutting-edge immune system treatments",
          icon: "immuno-icon"
        },
        {
          name: "Palliative Care",
          description: "Supportive care and pain management",
          icon: "palliative-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 234-5678",
        email: "info@comprehensivecancercare.com",
        address: "567 Oncology Center, Hope City, HC 56789",
        hours: "Mon-Fri: 8:00 AM - 6:00 PM"
      },
      seoMeta: {
        title: "Comprehensive Cancer Care - Oncology Services",
        description: "Advanced cancer treatment and care with comprehensive oncology services, chemotherapy, radiation, and support services.",
        keywords: ["oncology", "cancer treatment", "chemotherapy", "radiation therapy", "cancer care"]
      }
    }
  },

  ophthalmology: {
    name: "Ophthalmology Practice Template",
    specialty: "ophthalmology",
    template: {
      websiteTitle: "Vision Care Specialists",
      tagline: "Clear Vision, Brighter Future",
      heroSection: {
        headline: "Expert Eye Care for All Ages",
        subheadline: "Comprehensive ophthalmology services from routine eye exams to advanced surgical treatments",
        ctaText: "Schedule Eye Exam"
      },
      aboutSection: {
        title: "About Our Eye Care Practice",
        content: "Our ophthalmology practice provides comprehensive eye care services for patients of all ages. We combine advanced diagnostic technology with surgical expertise to preserve and improve vision.",
        highlights: [
          "Board-certified ophthalmologists",
          "Advanced surgical capabilities",
          "Comprehensive eye care services",
          "State-of-the-art diagnostic equipment"
        ]
      },
      services: [
        {
          name: "Comprehensive Eye Exams",
          description: "Complete vision and eye health evaluations",
          icon: "exam-icon"
        },
        {
          name: "Cataract Surgery",
          description: "Advanced cataract removal and lens replacement",
          icon: "cataract-icon"
        },
        {
          name: "Glaucoma Treatment",
          description: "Diagnosis and management of glaucoma",
          icon: "glaucoma-icon"
        },
        {
          name: "Retinal Care",
          description: "Treatment of retinal conditions and diseases",
          icon: "retinal-icon"
        },
        {
          name: "LASIK Surgery",
          description: "Laser vision correction procedures",
          icon: "lasik-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 890-1234",
        email: "info@visioncarespecialists.com",
        address: "890 Vision Center, Eye Care City, EC 89012",
        hours: "Mon-Fri: 8:00 AM - 5:00 PM, Sat: 9:00 AM - 1:00 PM"
      },
      seoMeta: {
        title: "Vision Care Specialists - Eye Care Services",
        description: "Comprehensive eye care services including eye exams, cataract surgery, glaucoma treatment, and LASIK vision correction.",
        keywords: ["ophthalmology", "eye care", "vision", "cataract surgery", "glaucoma", "LASIK"]
      }
    }
  },

  urology: {
    name: "Urology Practice Template",
    specialty: "urology",
    template: {
      websiteTitle: "Advanced Urology Care",
      tagline: "Urological Health Solutions",
      heroSection: {
        headline: "Expert Urological Care",
        subheadline: "Comprehensive urology services with advanced treatments and minimally invasive procedures",
        ctaText: "Schedule Consultation"
      },
      aboutSection: {
        title: "About Our Urology Practice",
        content: "Our urology practice specializes in treating conditions of the urinary tract and male reproductive system. We provide comprehensive urological care using the latest medical technology and minimally invasive techniques.",
        highlights: [
          "Board-certified urologists",
          "Minimally invasive procedures",
          "Advanced diagnostic capabilities",
          "Comprehensive urological care"
        ]
      },
      services: [
        {
          name: "Urological Consultations",
          description: "Comprehensive urological evaluations",
          icon: "consultation-icon"
        },
        {
          name: "Kidney Stone Treatment",
          description: "Advanced kidney stone removal procedures",
          icon: "kidney-icon"
        },
        {
          name: "Prostate Care",
          description: "Prostate health and treatment services",
          icon: "prostate-icon"
        },
        {
          name: "Bladder Disorders",
          description: "Treatment of bladder conditions",
          icon: "bladder-icon"
        },
        {
          name: "Male Health",
          description: "Men's reproductive health services",
          icon: "male-health-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 345-6789",
        email: "info@advancedurology.com",
        address: "345 Urology Center, Health Plaza, HP 34567",
        hours: "Mon-Fri: 8:00 AM - 5:00 PM"
      },
      seoMeta: {
        title: "Advanced Urology Care - Urological Services",
        description: "Expert urological care including kidney stone treatment, prostate care, and bladder disorders with minimally invasive procedures.",
        keywords: ["urology", "urologist", "kidney stones", "prostate", "bladder", "male health"]
      }
    }
  },

  endocrinology: {
    name: "Endocrinology Practice Template",
    specialty: "endocrinology",
    template: {
      websiteTitle: "Hormone Health Center",
      tagline: "Hormone Health Experts",
      heroSection: {
        headline: "Expert Endocrine Care",
        subheadline: "Comprehensive hormone and metabolic health services with personalized treatment plans",
        ctaText: "Schedule Appointment"
      },
      aboutSection: {
        title: "About Our Endocrinology Practice",
        content: "Our endocrinology practice specializes in diagnosing and treating hormone-related conditions and metabolic disorders. We provide comprehensive endocrine care with a focus on diabetes management and hormone optimization.",
        highlights: [
          "Board-certified endocrinologists",
          "Comprehensive diabetes care",
          "Hormone replacement therapy",
          "Advanced metabolic testing"
        ]
      },
      services: [
        {
          name: "Diabetes Management",
          description: "Comprehensive diabetes care and education",
          icon: "diabetes-icon"
        },
        {
          name: "Thyroid Treatment",
          description: "Thyroid disorder diagnosis and treatment",
          icon: "thyroid-icon"
        },
        {
          name: "Hormone Therapy",
          description: "Hormone replacement and optimization",
          icon: "hormone-icon"
        },
        {
          name: "Metabolic Disorders",
          description: "Treatment of metabolic conditions",
          icon: "metabolic-icon"
        },
        {
          name: "Osteoporosis Care",
          description: "Bone health and osteoporosis treatment",
          icon: "bone-icon"
        }
      ],
      contactInfo: {
        phone: "(555) 678-9012",
        email: "info@hormonehealthcenter.com",
        address: "678 Endocrine Plaza, Hormone City, HC 67890",
        hours: "Mon-Fri: 8:00 AM - 5:00 PM"
      },
      seoMeta: {
        title: "Hormone Health Center - Endocrinology Services",
        description: "Expert endocrine care including diabetes management, thyroid treatment, and hormone therapy with comprehensive metabolic services.",
        keywords: ["endocrinology", "diabetes", "thyroid", "hormone therapy", "metabolic disorders"]
      }
    }
  }
};

// Function to get template by specialty
export const getTemplateBySpecialty = (specialty) => {
  const normalizedSpecialty = specialty.toLowerCase();
  
  console.log(`[Template Selection] Requested specialty: "${specialty}" (normalized: "${normalizedSpecialty}")`);
  console.log(`[Template Selection] Available templates: ${Object.keys(DEFAULT_TEMPLATES).join(', ')}`);
  
  // Direct match
  if (DEFAULT_TEMPLATES[normalizedSpecialty]) {
    console.log(`[Template Selection] ✓ Found direct match: ${normalizedSpecialty}`);
    return DEFAULT_TEMPLATES[normalizedSpecialty];
  }
  
  // Handle common variations
  const specialtyMappings = {
    'general-practice': 'general medicine',
    'family-medicine': 'general medicine',
    'primary-care': 'general medicine',
    'internal-medicine': 'general medicine',
    'family-practice': 'general medicine',
    'general-practitioner': 'general medicine',
    'emergency-medicine': 'general medicine', // Fallback until specific template created
    'plastic-surgery': 'general medicine', // Fallback until specific template created
    'gastroenterology': 'general medicine', // Fallback until specific template created
    'pulmonology': 'general medicine', // Fallback until specific template created
    'rheumatology': 'general medicine', // Fallback until specific template created
    'nephrology': 'general medicine', // Fallback until specific template created
    'radiology': 'general medicine', // Fallback until specific template created
    'pathology': 'general medicine', // Fallback until specific template created
    'anesthesiology': 'general medicine', // Fallback until specific template created
    'surgery': 'general medicine', // Fallback until specific template created
    'neurology': 'general medicine', // Fallback until specific template created
    'psychiatry': 'general medicine', // Fallback until specific template created
    'oncology': 'general medicine', // Fallback until specific template created
    'ophthalmology': 'general medicine', // Fallback until specific template created
    'urology': 'general medicine', // Fallback until specific template created
    'endocrinology': 'general medicine' // Fallback until specific template created
  };
  
  console.log(`[Template Selection] Checking mappings for: ${normalizedSpecialty}`);
  const mappedSpecialty = specialtyMappings[normalizedSpecialty];
  if (mappedSpecialty && DEFAULT_TEMPLATES[mappedSpecialty]) {
    console.log(`[Template Selection] ✓ Found mapped specialty: ${normalizedSpecialty} -> ${mappedSpecialty}`);
    return DEFAULT_TEMPLATES[mappedSpecialty];
  }
  
  // Final fallback
  console.log(`[Template Selection] ✗ No match found for "${normalizedSpecialty}", using fallback: general medicine`);
  console.log(`[Template Selection] Available mappings: ${Object.keys(specialtyMappings).join(', ')}`);
  return DEFAULT_TEMPLATES['general medicine'];
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


