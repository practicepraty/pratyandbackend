// src/service/ai.service.js (Enhanced Version)
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockClient } from "../config/aws.js";
import { ApiError } from "../utils/apierror.js";
import { DEFAULT_TEMPLATES, getTemplateBySpecialty } from "../config/templates.config.js";
import crypto from 'crypto';

class AIService {
    constructor() {
        this.client = createBedrockClient();
        this.modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";
        this.specialtyKeywords = this.initializeSpecialtyKeywords();
        this.contentTemplates = this.initializeContentTemplates();
        this.contentQualityThresholds = this.initializeQualityThresholds();
        this.generationCache = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // Initialize medical specialty keywords for better detection
    initializeSpecialtyKeywords() {
        return {
            'general-practice': ['general medicine', 'family medicine', 'primary care', 'internal medicine', 'family practice', 'general practitioner', 'gp', 'family doctor', 'primary physician', 'comprehensive care', 'preventive care', 'wellness', 'health maintenance', 'annual checkup', 'physical exam', 'routine care', 'all ages', 'family health'],
            cardiology: ['cardiology', 'heart', 'cardiac', 'cardiovascular', 'chest pain', 'ecg', 'ekg', 'blood pressure', 'arrhythmia', 'coronary', 'hypertension', 'pacemaker', 'stent', 'heart attack', 'heart failure', 'angina', 'cholesterol', 'bypass', 'angioplasty', 'cardiologist', 'heart disease', 'heart rhythm', 'heart murmur'],
            orthopedics: ['orthopedics', 'bone', 'joint', 'fracture', 'spine', 'knee', 'hip', 'shoulder', 'arthritis', 'sports injury', 'ligament', 'tendon', 'cartilage', 'osteoporosis', 'orthopedic', 'orthopaedic', 'orthopaedics', 'musculoskeletal', 'back pain', 'joint replacement', 'spinal', 'broken bone', 'torn ligament', 'sports medicine', 'physical therapy'],
            dermatology: ['dermatology', 'skin', 'acne', 'rash', 'mole', 'eczema', 'psoriasis', 'dermatitis', 'melanoma', 'wrinkles', 'botox', 'laser', 'biopsy', 'dermatologist', 'skin cancer', 'cosmetic dermatology', 'skin care', 'facial', 'sun damage', 'aging', 'pigmentation', 'hair loss', 'nail problems'],
            pediatrics: ['pediatrics', 'child', 'children', 'infant', 'baby', 'vaccination', 'pediatric', 'paediatric', 'growth', 'development', 'adolescent', 'immunization', 'newborn', 'pediatrician', 'paediatrician', 'kids', 'toddler', 'teen', 'teenager', 'child health', 'birth', 'neonatal', 'infant care'],
            gynecology: ['gynecology', 'women', 'pregnancy', 'menstrual', 'reproductive', 'prenatal', 'obstetric', 'gynecological', 'gynaecological', 'gynaecology', 'fertility', 'contraception', 'menopause', 'gynecologist', 'gynaecologist', 'obstetrics', 'womens health', 'pap smear', 'mammography', 'prenatal care', 'childbirth', 'maternal', 'ovarian', 'uterine', 'cervical'],
            neurology: ['brain', 'nerve', 'neurological', 'seizure', 'migraine', 'stroke', 'paralysis', 'memory', 'alzheimer', 'parkinson', 'epilepsy', 'neurologist', 'headache', 'concussion', 'multiple sclerosis', 'ms', 'spinal cord', 'nervous system', 'dementia', 'tremor', 'neuropathy'],
            psychiatry: ['mental health', 'depression', 'anxiety', 'therapy', 'psychological', 'bipolar', 'adhd', 'counseling', 'psychiatric', 'medication', 'psychiatrist', 'psychologist', 'behavioral', 'mood', 'stress', 'panic', 'ptsd', 'schizophrenia', 'addiction', 'substance abuse', 'counselling'],
            oncology: ['cancer', 'tumor', 'tumour', 'chemotherapy', 'radiation', 'oncology', 'malignant', 'metastasis', 'biopsy', 'lymphoma', 'leukemia', 'leukaemia', 'oncologist', 'carcinoma', 'sarcoma', 'benign', 'chemotherapy', 'radiotherapy', 'immunotherapy', 'cancer treatment'],
            ophthalmology: ['eye', 'vision', 'glaucoma', 'cataract', 'retina', 'ophthalmology', 'visual', 'glasses', 'contact lenses', 'surgery', 'ophthalmologist', 'eye care', 'eye exam', 'cornea', 'macular', 'diabetic retinopathy', 'eye surgery', 'laser eye surgery', 'lasik', 'sight'],
            dentistry: ['dental', 'teeth', 'oral', 'cavity', 'gum', 'root canal', 'orthodontic', 'periodontal', 'implant', 'crown', 'braces', 'dentist', 'tooth', 'oral health', 'dental care', 'filling', 'extraction', 'whitening', 'orthodontist', 'periodontist', 'endodontist', 'oral surgeon', 'dental hygiene'],
            urology: ['kidney', 'bladder', 'prostate', 'urinary', 'stones', 'incontinence', 'erectile', 'testosterone', 'vasectomy', 'urologist', 'kidney stones', 'uti', 'urinary tract', 'benign prostatic hyperplasia', 'bph', 'urologic', 'urological', 'renal', 'genital', 'male health'],
            endocrinology: ['diabetes', 'thyroid', 'hormone', 'insulin', 'metabolism', 'endocrine', 'glucose', 'adrenal', 'pituitary', 'endocrinologist', 'diabetic', 'blood sugar', 'thyroid disorder', 'hormone replacement', 'metabolic', 'hyperthyroidism', 'hypothyroidism', 'endocrinology'],
            radiology: ['x-ray', 'mri', 'ct scan', 'ultrasound', 'imaging', 'radiologist', 'scan', 'mammogram', 'nuclear medicine', 'pet scan', 'angiogram', 'fluoroscopy', 'diagnostic imaging', 'interventional radiology', 'medical imaging'],
            pathology: ['pathology', 'pathologist', 'biopsy', 'autopsy', 'laboratory', 'lab', 'blood test', 'tissue', 'diagnosis', 'microscopic', 'cytology', 'histology', 'forensic', 'clinical pathology', 'anatomic pathology'],
            'emergency-medicine': ['emergency', 'emergency room', 'er', 'trauma', 'urgent care', 'emergency medicine', 'emergency physician', 'acute care', 'critical care', 'emergency department', 'emergency treatment', 'ambulance', 'first aid', 'life support'],
            surgery: ['surgery', 'surgeon', 'surgical', 'operation', 'procedure', 'operating room', 'anesthesia', 'anaesthesia', 'general surgery', 'minimally invasive', 'laparoscopic', 'robotic surgery', 'outpatient surgery', 'day surgery'],
            anesthesiology: ['anesthesia', 'anaesthesia', 'anesthesiologist', 'anaesthesiologist', 'pain management', 'sedation', 'regional anesthesia', 'spinal', 'epidural', 'general anesthesia', 'local anesthesia', 'conscious sedation'],
            'plastic-surgery': ['plastic surgery', 'cosmetic surgery', 'reconstructive surgery', 'plastic surgeon', 'aesthetic', 'breast augmentation', 'rhinoplasty', 'facelift', 'liposuction', 'tummy tuck', 'botox', 'facial reconstruction'],
            gastroenterology: ['gastroenterology', 'gastroenterologist', 'digestive', 'stomach', 'intestine', 'colon', 'liver', 'pancreas', 'endoscopy', 'colonoscopy', 'ibd', 'crohns', 'ulcerative colitis', 'acid reflux', 'gerd', 'hepatitis'],
            pulmonology: ['pulmonology', 'pulmonologist', 'lung', 'respiratory', 'breathing', 'asthma', 'copd', 'pneumonia', 'bronchitis', 'pulmonary', 'chest', 'oxygen', 'ventilator', 'sleep apnea', 'tuberculosis'],
            rheumatology: ['rheumatology', 'rheumatologist', 'arthritis', 'rheumatoid', 'lupus', 'fibromyalgia', 'autoimmune', 'joint pain', 'inflammation', 'connective tissue', 'osteoarthritis', 'gout', 'vasculitis'],
            nephrology: ['nephrology', 'nephrologist', 'kidney', 'renal', 'dialysis', 'kidney disease', 'chronic kidney disease', 'ckd', 'kidney failure', 'transplant', 'hypertension', 'proteinuria', 'electrolyte']
        };
    }

    // Initialize content templates for different specialties
    initializeContentTemplates() {
        return {
            cardiology: {
                tagline: "Your Heart Health is Our Priority",
                services: ["Cardiac Consultation", "ECG/EKG Testing", "Stress Testing", "Heart Disease Prevention", "Blood Pressure Management", "Cardiac Catheterization"],
                about: "comprehensive cardiac care with state-of-the-art technology and personalized treatment plans",
                keywords: ["cardiology", "heart care", "cardiac services", "cardiovascular health", "heart specialist"]
            },
            orthopedics: {
                tagline: "Restoring Movement, Rebuilding Lives",
                services: ["Joint Replacement", "Sports Medicine", "Fracture Care", "Spine Treatment", "Arthritis Management", "Physical Therapy"],
                about: "specialized orthopedic care focusing on bone, joint, and musculoskeletal health",
                keywords: ["orthopedics", "bone care", "joint replacement", "sports medicine", "spine treatment"]
            },
            dermatology: {
                tagline: "Healthy Skin, Confident You",
                services: ["Skin Cancer Screening", "Acne Treatment", "Cosmetic Dermatology", "Psoriasis Care", "Mole Removal", "Laser Treatments"],
                about: "expert dermatological care for all your skin, hair, and nail concerns",
                keywords: ["dermatology", "skin care", "acne treatment", "skin cancer screening", "cosmetic dermatology"]
            },
            pediatrics: {
                tagline: "Growing Healthy, Happy Children",
                services: ["Well-Child Visits", "Vaccinations", "Growth Monitoring", "Developmental Assessments", "Sick Child Care", "Adolescent Medicine"],
                about: "compassionate pediatric care supporting your child's health and development",
                keywords: ["pediatrics", "child healthcare", "vaccinations", "pediatrician", "children's health"]
            },
            'general-practice': {
                tagline: "Comprehensive Healthcare for Life",
                services: ["Annual Check-ups", "Preventive Care", "Chronic Disease Management", "Health Screenings", "Wellness Programs", "Urgent Care"],
                about: "personalized healthcare services for patients of all ages and medical needs",
                keywords: ["family medicine", "primary care", "healthcare", "medical center", "physician"]
            },
            gynecology: {
                tagline: "Women's Health, Our Priority",
                services: ["Gynecological Exams", "Prenatal Care", "Family Planning", "Menopause Management", "Reproductive Health", "Preventive Screenings"],
                about: "comprehensive women's healthcare services with compassionate, personalized care",
                keywords: ["gynecology", "women's health", "obstetrics", "reproductive health", "prenatal care"]
            },
            neurology: {
                tagline: "Advanced Neurological Care",
                services: ["Neurological Consultations", "Stroke Treatment", "Epilepsy Management", "Headache Treatment", "Memory Disorders", "Movement Disorders"],
                about: "specialized neurological care for disorders of the brain, spine, and nervous system",
                keywords: ["neurology", "neurological care", "brain health", "stroke treatment", "epilepsy"]
            },
            psychiatry: {
                tagline: "Mental Health, Real Solutions",
                services: ["Psychiatric Evaluations", "Therapy Sessions", "Medication Management", "Anxiety Treatment", "Depression Care", "Behavioral Health"],
                about: "comprehensive mental health services with evidence-based treatment approaches",
                keywords: ["psychiatry", "mental health", "therapy", "depression", "anxiety"]
            },
            oncology: {
                tagline: "Fighting Cancer Together",
                services: ["Cancer Diagnosis", "Chemotherapy", "Radiation Therapy", "Immunotherapy", "Palliative Care", "Cancer Screening"],
                about: "comprehensive cancer care with cutting-edge treatments and compassionate support",
                keywords: ["oncology", "cancer treatment", "chemotherapy", "radiation therapy", "tumor care"]
            },
            ophthalmology: {
                tagline: "Clear Vision, Brighter Future",
                services: ["Eye Exams", "Cataract Surgery", "Glaucoma Treatment", "Retinal Care", "LASIK Surgery", "Pediatric Ophthalmology"],
                about: "comprehensive eye care services from routine exams to advanced surgical treatments",
                keywords: ["ophthalmology", "eye care", "vision", "eye surgery", "cataract"]
            },
            dentistry: {
                tagline: "Healthy Smiles, Happy Lives",
                services: ["Dental Cleanings", "Fillings", "Root Canals", "Crowns", "Orthodontics", "Oral Surgery"],
                about: "complete dental care services for the whole family in a comfortable environment",
                keywords: ["dentistry", "dental care", "oral health", "teeth cleaning", "orthodontics"]
            },
            urology: {
                tagline: "Urological Health Solutions",
                services: ["Urological Consultations", "Kidney Stone Treatment", "Prostate Care", "Bladder Disorders", "Male Health", "Minimally Invasive Surgery"],
                about: "comprehensive urological care with advanced diagnostic and treatment options",
                keywords: ["urology", "urological care", "kidney", "prostate", "bladder"]
            },
            endocrinology: {
                tagline: "Hormone Health Experts",
                services: ["Diabetes Management", "Thyroid Treatment", "Hormone Therapy", "Metabolic Disorders", "Osteoporosis Care", "Endocrine Surgery"],
                about: "specialized endocrine care for hormone-related conditions and metabolic disorders",
                keywords: ["endocrinology", "diabetes", "thyroid", "hormone therapy", "metabolic"]
            }
        };
    }

    // Initialize quality thresholds for content validation
    initializeQualityThresholds() {
        return {
            minTitleLength: 10,
            maxTitleLength: 55,
            minDescriptionLength: 50,
            maxDescriptionLength: 500,
            minServicesCount: 3,
            maxServicesCount: 10,
            minKeywordsCount: 3,
            maxKeywordsCount: 15
        };
    }

    // Test AI connectivity with enhanced error handling
    async testConnection() {
        try {
            const testPrompt = "Respond with exactly: 'AI connection successful'";
            const response = await this.generateContent(testPrompt);
            return {
                success: true,
                response: response.trim(),
                modelId: this.modelId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("AI Connection Test Failed:", error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Generate content using Bedrock with retry logic and specialty-specific caching
    async generateContent(prompt, retryCount = 0, specialty = null) {
        try {
            // CRITICAL FIX: Check cache first with specialty-specific key
            const cacheKey = this.generateCacheKey(prompt, specialty);
            console.log(`[AI Service] 🔍 Checking cache for key: ${cacheKey}`);
            
            if (this.generationCache.has(cacheKey)) {
                console.log(`[AI Service] ✅ Cache hit for: ${cacheKey}`);
                return this.generationCache.get(cacheKey);
            }
            
            console.log(`[AI Service] 🔄 Cache miss, generating content for specialty: ${specialty || 'unknown'}`);

            const payload = {
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 3000,
                temperature: 0.7,
                top_p: 0.9,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            };

            const command = new InvokeModelCommand({
                modelId: this.modelId,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify(payload)
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            
            const generatedText = responseBody.content[0].text;
            
            // CRITICAL FIX: Cache the result with validation
            console.log(`[AI Service] 💾 Caching result for key: ${cacheKey}`);
            this.generationCache.set(cacheKey, generatedText);
            
            return generatedText;
        } catch (error) {
            console.error("Content generation error:", error);
            
            // Retry logic
            if (retryCount < this.maxRetries) {
                await this.delay(this.retryDelay * (retryCount + 1));
                return this.generateContent(prompt, retryCount + 1);
            }
            
            throw new ApiError(500, `Failed to generate content after ${this.maxRetries} retries: ${error.message}`);
        }
    }

    // BULLETPROOF specialty detection with simple, clear logic
    async detectMedicalSpecialty(transcription) {
        try {
            const lowerTranscription = transcription.toLowerCase();
            
            console.log(`[Specialty Detection] 🔍 Input: "${transcription}"`);
            
            // STEP 1: Check for exact specialty names (HIGHEST PRIORITY)
            const exactMatches = {
                'dentistry': ['dentistry', 'dental'],
                'cardiology': ['cardiology', 'cardiac'],
                'dermatology': ['dermatology'],
                'gynecology': ['gynecology', 'gynaecology'],
                'pediatrics': ['pediatrics', 'paediatrics'],
                'orthopedics': ['orthopedics', 'orthopaedics'],
                'neurology': ['neurology'],
                'psychiatry': ['psychiatry'],
                'oncology': ['oncology'],
                'ophthalmology': ['ophthalmology'],
                'urology': ['urology'],
                'endocrinology': ['endocrinology']
            };
            
            for (const [specialty, terms] of Object.entries(exactMatches)) {
                for (const term of terms) {
                    const regex = new RegExp(`\\b${term}\\b`, 'gi');
                    if (regex.test(lowerTranscription)) {
                        console.log(`[Specialty Detection] ✅ EXACT MATCH: Found "${term}" -> ${specialty}`);
                        return {
                            specialty: specialty,
                            confidence: 0.99,
                            method: 'exact-match-bulletproof',
                            reasoning: `Exact specialty name "${term}" found in input`,
                            matchedTerm: term
                        };
                    }
                }
            }
            
            // STEP 2: Check for strong specialty indicators (SECOND PRIORITY)
            const strongIndicators = {
                'dentistry': ['teeth', 'tooth', 'oral', 'dentist', 'dental care'],
                'cardiology': ['heart', 'cardiac', 'cardiovascular', 'cardiologist'],
                'dermatology': ['skin', 'dermatologist', 'acne', 'eczema', 'psoriasis'],
                'gynecology': ['women', 'gynecologist', 'pregnancy', 'reproductive'],
                'pediatrics': ['children', 'pediatrician', 'child', 'kids', 'infant'],
                'orthopedics': ['bone', 'joint', 'fracture', 'spine', 'arthritis'],
                'neurology': ['brain', 'neurologist', 'seizure', 'migraine', 'stroke'],
                'psychiatry': ['mental health', 'depression', 'anxiety', 'psychiatrist'],
                'oncology': ['cancer', 'tumor', 'oncologist', 'chemotherapy'],
                'ophthalmology': ['eye', 'vision', 'ophthalmologist', 'cataract'],
                'urology': ['kidney', 'bladder', 'urologist', 'prostate'],
                'endocrinology': ['diabetes', 'thyroid', 'hormone', 'endocrinologist']
            };
            
            for (const [specialty, indicators] of Object.entries(strongIndicators)) {
                const foundIndicators = indicators.filter(indicator => {
                    const regex = new RegExp(`\\b${indicator.replace(/\s+/g, '\\s+')}\\b`, 'gi');
                    return regex.test(lowerTranscription);
                });
                
                if (foundIndicators.length > 0) {
                    console.log(`[Specialty Detection] ✅ STRONG INDICATOR: Found "${foundIndicators.join(', ')}" -> ${specialty}`);
                    return {
                        specialty: specialty,
                        confidence: 0.9,
                        method: 'strong-indicator-bulletproof',
                        reasoning: `Strong specialty indicators found: ${foundIndicators.join(', ')}`,
                        matchedIndicators: foundIndicators
                    };
                }
            }
            
            // STEP 3: Use keyword detection system as backup
            console.log(`[Specialty Detection] 🔍 No direct matches, using keyword detection...`);
            const keywordResults = this.detectSpecialtyByKeywords(lowerTranscription);
            console.log(`[Specialty Detection] 📊 Keyword results: ${keywordResults.specialty} (confidence: ${keywordResults.confidence})`);
            
            // If keyword detection has high confidence, use it
            if (keywordResults.confidence > 0.7) {
                const validatedSpecialty = this.validateSpecialty(keywordResults.specialty);
                console.log(`[Specialty Detection] ✅ HIGH CONFIDENCE KEYWORD: ${validatedSpecialty}`);
                return {
                    specialty: validatedSpecialty,
                    confidence: keywordResults.confidence,
                    method: 'keyword-high-confidence',
                    reasoning: 'High confidence keyword detection'
                };
            }
            
            // STEP 4: Final fallback
            console.log(`[Specialty Detection] ⚠️ No clear match found, using general practice fallback`);
            return {
                specialty: 'general-practice',
                confidence: 0.7,
                method: 'fallback-default',
                reasoning: 'No clear specialty indicators found, defaulting to general practice'
            };
            
        } catch (error) {
            console.error("[Specialty Detection] ❌ Error:", error);
            return {
                specialty: 'general-practice',
                confidence: 0.5,
                method: 'error-fallback',
                reasoning: 'Error in detection, using safe fallback',
                error: error.message
            };
        }
    }

    // Validate detected specialty against supported specialties
    validateSpecialty(specialty) {
        console.log(`[Specialty Validation] Validating: "${specialty}"`);
        
        if (!specialty) {
            console.log(`[Specialty Validation] Empty specialty, using default: general-practice`);
            return 'general-practice';
        }
        
        const normalizedSpecialty = specialty.toLowerCase().trim();
        const supportedSpecialties = Object.keys(this.specialtyKeywords);
        
        // Direct match
        if (supportedSpecialties.includes(normalizedSpecialty)) {
            console.log(`[Specialty Validation] Direct match found: ${normalizedSpecialty}`);
            return normalizedSpecialty;
        }
        
        // Check for common variations
        const specialtyMappings = {
            'general medicine': 'general-practice',
            'family medicine': 'general-practice',
            'primary care': 'general-practice',
            'internal medicine': 'general-practice',
            'family practice': 'general-practice',
            'gp': 'general-practice',
            'gynaecology': 'gynecology',
            'paediatrics': 'pediatrics',
            'paediatric': 'pediatrics',
            'orthopaedics': 'orthopedics',
            'orthopaedic': 'orthopedics',
            'anaesthesia': 'anesthesiology',
            'anaesthesiology': 'anesthesiology'
        };
        
        const mappedSpecialty = specialtyMappings[normalizedSpecialty];
        if (mappedSpecialty && supportedSpecialties.includes(mappedSpecialty)) {
            console.log(`[Specialty Validation] Mapped specialty: ${normalizedSpecialty} -> ${mappedSpecialty}`);
            return mappedSpecialty;
        }
        
        // If not found, use general-practice as fallback
        console.log(`[Specialty Validation] No match found for "${specialty}", using default: general-practice`);
        return 'general-practice';
    }

    // ENHANCED keyword-based specialty detection with BULLETPROOF scoring
    detectSpecialtyByKeywords(transcription) {
        let maxScore = 0;
        let detectedSpecialty = 'general-practice';
        const specialtyScores = {};
        const detectionDetails = {};
        let hasExactSpecialtyMatch = false;
        let exactMatchSpecialty = '';

        console.log(`[Enhanced Keyword Detection] Analyzing: "${transcription}"`);

        for (const [specialty, keywords] of Object.entries(this.specialtyKeywords)) {
            let score = 0;
            let matchedKeywords = 0;
            let hasExactMatch = false;
            let strongMatches = [];
            let exactMatches = [];
            
            keywords.forEach(keyword => {
                const keywordLower = keyword.toLowerCase();
                const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
                const matches = transcription.match(regex);
                
                if (matches) {
                    const matchCount = matches.length;
                    const keywordWeight = this.getKeywordWeight(keyword, specialty);
                    const matchScore = matchCount * keywordWeight;
                    
                    score += matchScore;
                    matchedKeywords++;
                    
                    // Track different types of matches
                    if (keyword === specialty || keyword === specialty.replace('-', ' ')) {
                        hasExactMatch = true;
                        hasExactSpecialtyMatch = true;
                        exactMatchSpecialty = specialty;
                        exactMatches.push(keyword);
                        score += 10000; // MASSIVE boost for exact specialty name
                    } else if (keywordLower.length > 6 && keywordWeight > 8) {
                        strongMatches.push(keyword);
                        score += 500; // Strong boost for important long keywords
                    }
                    
                    console.log(`[Keyword Match] ${specialty}: "${keyword}" (${matchCount}x, weight: ${keywordWeight}, score: +${matchScore})`);
                }
            });

            // BULLETPROOF scoring adjustments
            if (hasExactMatch) {
                score += 50000; // Even more massive boost for exact specialty name
                console.log(`[Keyword Detection] 🎯 EXACT SPECIALTY NAME MATCH: ${specialty} (score boosted by 50000)`);
            }
            
            // Bonus for multiple strong matches
            if (strongMatches.length > 1) {
                const bonus = strongMatches.length * 200;
                score += bonus;
                console.log(`[Keyword Detection] Multiple strong matches bonus for ${specialty}: +${bonus}`);
            }

            // Length and density normalization (but preserve exact matches)
            let normalizedScore;
            if (hasExactMatch) {
                normalizedScore = score; // Don't normalize exact matches
            } else {
                normalizedScore = (score / Math.sqrt(transcription.length)) * 100 + (matchedKeywords / keywords.length) * 50;
            }
            
            specialtyScores[specialty] = normalizedScore;
            detectionDetails[specialty] = {
                rawScore: score,
                normalizedScore: normalizedScore,
                matchedKeywords: matchedKeywords,
                totalKeywords: keywords.length,
                hasExactMatch: hasExactMatch,
                strongMatches: strongMatches,
                exactMatches: exactMatches
            };

            if (normalizedScore > maxScore) {
                maxScore = normalizedScore;
                detectedSpecialty = specialty;
            }
        }

        // Calculate confidence with BULLETPROOF rules
        let confidence;
        if (hasExactSpecialtyMatch) {
            confidence = 0.99; // Nearly perfect confidence for exact matches
            detectedSpecialty = exactMatchSpecialty;
            console.log(`[Keyword Detection] 🚀 BULLETPROOF EXACT MATCH: ${exactMatchSpecialty} (confidence: 0.99)`);
        } else {
            // Progressive confidence based on score
            if (maxScore > 1000) confidence = 0.95;
            else if (maxScore > 500) confidence = 0.85;
            else if (maxScore > 200) confidence = 0.75;
            else if (maxScore > 100) confidence = 0.65;
            else if (maxScore > 50) confidence = 0.55;
            else if (maxScore > 20) confidence = 0.45;
            else confidence = Math.min(maxScore / 50, 0.4);
        }

        // Log comprehensive results
        const topSpecialties = Object.entries(specialtyScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        console.log(`[Keyword Detection] 📊 TOP 5 SPECIALTIES:`, topSpecialties);
        console.log(`[Keyword Detection] 🎯 SELECTED: ${detectedSpecialty} (confidence: ${confidence})`);
        console.log(`[Keyword Detection] 📋 DETAILS:`, detectionDetails[detectedSpecialty]);

        return {
            specialty: detectedSpecialty,
            confidence: confidence,
            scores: specialtyScores,
            exactMatch: hasExactSpecialtyMatch,
            details: detectionDetails[detectedSpecialty],
            allDetails: detectionDetails
        };
    }

    // Get keyword weight based on importance and specialty
    getKeywordWeight(keyword, specialty) {
        const keywordLower = keyword.toLowerCase();
        
        // Exact specialty names get maximum weight
        if (keywordLower === specialty || keywordLower === specialty.replace('-', ' ')) {
            return 20;
        }
        
        // High-priority specific terms
        const highPriorityTerms = {
            'dentistry': ['dentistry', 'dentist', 'dental', 'orthodontics', 'endodontist', 'periodontist'],
            'cardiology': ['cardiology', 'cardiologist', 'cardiovascular', 'cardiac'],
            'dermatology': ['dermatology', 'dermatologist', 'dermatological'],
            'gynecology': ['gynecology', 'gynecologist', 'obstetrics', 'gynecological'],
            'pediatrics': ['pediatrics', 'pediatrician', 'pediatric'],
            'orthopedics': ['orthopedics', 'orthopedic', 'orthopaedics']
        };
        
        if (highPriorityTerms[specialty]?.includes(keywordLower)) {
            return 15;
        }
        
        // Medium priority medical terms (longer, more specific)
        if (keywordLower.length > 8) {
            return 10;
        } else if (keywordLower.length > 6) {
            return 8;
        } else if (keywordLower.length > 4) {
            return 6;
        } else {
            return 3; // Short generic terms get low weight
        }
    }

    // ENHANCED AI-based specialty detection with strict validation
    async detectSpecialtyByAI(transcription) {
        try {
            console.log(`[AI Detection] Starting AI analysis for: "${transcription}"`);
            
            const prompt = `
            You are a medical specialty classification expert. Analyze this medical practice description and identify the PRIMARY medical specialty.

            CRITICAL INSTRUCTIONS:
            1. Only classify based on EXPLICIT medical terms and services mentioned
            2. Do NOT infer specialties from vague descriptions
            3. If multiple specialties are mentioned, pick the PRIMARY one
            4. Be CONSERVATIVE - when in doubt, use "general-practice"
            5. Use ONLY the exact specialty names from the list below

            Description: "${transcription}"

            VALID SPECIALTIES (use exact names):
            - general-practice (family medicine, primary care, internal medicine)
            - cardiology (heart, cardiac, cardiovascular)
            - orthopedics (bone, joint, spine, fracture)
            - dermatology (skin, acne, rash, dermatologist)
            - pediatrics (children, child, infant, baby, pediatrician)
            - gynecology (women, pregnancy, reproductive, gynecologist)
            - dentistry (dental, teeth, oral, dentist)
            - neurology (brain, nerve, neurological, neurologist)
            - psychiatry (mental health, depression, anxiety, psychiatrist)
            - oncology (cancer, tumor, oncologist)
            - ophthalmology (eye, vision, ophthalmologist)
            - urology (kidney, bladder, urologist)
            - endocrinology (diabetes, thyroid, hormone, endocrinologist)

            EXAMPLES:
            - "teeth cleaning and dental care" → dentistry (explicit dental terms)
            - "heart specialist and cardiac care" → cardiology (explicit cardiac terms)
            - "skin treatment and dermatology" → dermatology (explicit skin terms)
            - "children's health and pediatrics" → pediatrics (explicit child terms)
            - "general medical practice" → general-practice (non-specific)

            RESPOND IN STRICT JSON FORMAT:
            {
                "specialty": "exact_specialty_name",
                "confidence": 0.8,
                "reasoning": "brief explanation of why this specialty was chosen",
                "keywords_found": ["keyword1", "keyword2"],
                "certainty": "high|medium|low"
            }

            CONFIDENCE RULES:
            - 0.9-1.0: Explicit specialty name mentioned (e.g., "dermatology", "cardiology")
            - 0.7-0.9: Multiple clear specialty keywords (e.g., "teeth", "dental", "oral")
            - 0.5-0.7: Some specialty indicators present
            - 0.3-0.5: Vague or unclear specialty indicators
            - 0.1-0.3: No clear specialty indicators, general practice likely
            `;

            const response = await this.generateContent(prompt);
            console.log(`[AI Detection] Raw AI response: ${response}`);
            
            try {
                const parsed = JSON.parse(response.trim());
                
                // Validate and normalize the AI response
                const validatedSpecialty = this.validateSpecialty(parsed.specialty);
                const normalizedConfidence = this.normalizeAIConfidence(parsed.confidence, parsed.certainty);
                
                const result = {
                    specialty: validatedSpecialty,
                    confidence: normalizedConfidence,
                    reasoning: parsed.reasoning || 'AI analysis',
                    keywordsFound: parsed.keywords_found || [],
                    certainty: parsed.certainty || 'medium',
                    aiRawResponse: parsed
                };
                
                console.log(`[AI Detection] ✅ Parsed result: ${JSON.stringify(result)}`);
                return result;
                
            } catch (parseError) {
                console.warn(`[AI Detection] ⚠️ JSON parse failed, using text parsing fallback`);
                
                // Enhanced fallback text parsing
                const specialtyMatch = response.match(/specialty["\s]*:\s*["']?([^"',\n]+)/i);
                const confidenceMatch = response.match(/confidence["\s]*:\s*([0-9.]+)/i);
                
                let detectedSpecialty = 'general-practice';
                let detectedConfidence = 0.4;
                
                if (specialtyMatch) {
                    detectedSpecialty = this.validateSpecialty(specialtyMatch[1].toLowerCase().trim());
                }
                
                if (confidenceMatch) {
                    detectedConfidence = Math.max(0.1, Math.min(1.0, parseFloat(confidenceMatch[1])));
                }
                
                const fallbackResult = {
                    specialty: detectedSpecialty,
                    confidence: detectedConfidence,
                    reasoning: 'Parsed from text response (JSON parse failed)',
                    keywordsFound: [],
                    certainty: 'low',
                    parseError: true
                };
                
                console.log(`[AI Detection] 🔧 Fallback result: ${JSON.stringify(fallbackResult)}`);
                return fallbackResult;
            }
        } catch (error) {
            console.error(`[AI Detection] ❌ Error in AI detection:`, error);
            
            const errorResult = {
                specialty: 'general-practice',
                confidence: 0.3,
                reasoning: 'Error fallback - AI detection failed',
                keywordsFound: [],
                certainty: 'low',
                error: error.message
            };
            
            console.log(`[AI Detection] 🚨 Error result: ${JSON.stringify(errorResult)}`);
            return errorResult;
        }
    }

    // Normalize AI confidence based on certainty level
    normalizeAIConfidence(rawConfidence, certainty) {
        let confidence = Math.max(0.1, Math.min(1.0, parseFloat(rawConfidence) || 0.5));
        
        // Adjust confidence based on certainty level
        switch (certainty?.toLowerCase()) {
            case 'high':
                confidence = Math.max(confidence, 0.8);
                break;
            case 'medium':
                confidence = Math.max(0.4, Math.min(0.8, confidence));
                break;
            case 'low':
                confidence = Math.min(0.6, confidence);
                break;
        }
        
        return Math.round(confidence * 100) / 100; // Round to 2 decimal places
    }

    // Generate comprehensive website content with enhanced logic
    async generateWebsiteContent(transcription, specialty) {
        try {
            const specialtyLower = typeof specialty === 'string' ? specialty.toLowerCase() : specialty.specialty.toLowerCase();
            console.log(`[Content Generation] Using specialty: ${specialtyLower}`);
            
            const template = this.contentTemplates[specialtyLower] || this.contentTemplates['general-practice'];
            const defaultTemplate = getTemplateBySpecialty(specialtyLower);
            
            console.log(`[Content Generation] Template found: ${template ? 'Yes' : 'No'}`);
            console.log(`[Content Generation] Default template: ${defaultTemplate ? 'Yes' : 'No'}`);

            // CRITICAL FIX: Create completely unique prompt for each specialty
            const uniqueId = crypto.randomUUID();
            const timestamp = Date.now();
            const prompt = `
            ===== SPECIALTY-SPECIFIC CONTENT GENERATION =====
            TARGET_SPECIALTY: ${specialtyLower}
            UNIQUE_REQUEST_ID: ${uniqueId}
            GENERATION_TIMESTAMP: ${timestamp}
            TRANSCRIPTION_HASH: ${crypto.createHash('md5').update(transcription).digest('hex')}
            
            Create professional medical website content EXCLUSIVELY for a ${specialtyLower} practice.
            
            STRICT REQUIREMENTS:
            - Content must be 100% specific to ${specialtyLower}
            - Must NOT contain any references to other medical specialties
            - Must use ${specialtyLower}-specific terminology and services
            - Must be unique and not generic medical content
            
            Practice Description: "${transcription}"
            
            Generate comprehensive, professional content following this structure:
            
            {
                "websiteTitle": "Professional practice name (creative but professional)",
                "tagline": "Compelling tagline specific to ${specialtyLower}",
                "heroSection": {
                    "headline": "Primary headline that captures attention (max 200 chars)",
                    "subheadline": "Supporting text that builds trust and explains value (max 300 chars)",
                    "ctaText": "Action-oriented button text (max 50 chars)"
                },
                "aboutSection": {
                    "title": "About section heading",
                    "content": "Professional 2-3 paragraph about section that builds credibility",
                    "highlights": ["3-4 key practice highlights/differentiators"]
                },
                "services": [
                    {
                        "name": "Service Name",
                        "description": "Detailed service description",
                        "icon": "relevant-icon-name"
                    }
                ],
                "contactInfo": {
                    "phone": "Professional phone format",
                    "email": "Professional email address",
                    "address": "Complete professional address",
                    "hours": "Professional operating hours"
                },
                "seoMeta": {
                    "title": "SEO-optimized title (under 55 chars)",
                    "description": "SEO description (under 160 chars)",
                    "keywords": ["relevant", "seo", "keywords"]
                },
                "qualityScore": 0.85,
                "contentFeatures": ["feature1", "feature2", "feature3"]
            }

            Requirements:
            - Content must be professional and medically appropriate
            - Include 4-6 relevant services for ${specialtyLower}
            - Use compelling, trust-building language
            - Ensure all content is unique and engaging
            - Include location-appropriate contact information
            - SEO-optimize all meta content
            - CRITICAL: Respect character limits - headline max 200 chars, subheadline max 300 chars, ctaText max 50 chars
            
            Base the content on the practice description provided, but enhance it professionally.
            `;

            const response = await this.generateContent(prompt, 0, specialtyLower);
            
            try {
                const parsedContent = JSON.parse(response);
                return this.validateAndEnhanceContent(parsedContent, specialtyLower, template, defaultTemplate);
            } catch (parseError) {
                console.warn("JSON parsing failed, using advanced fallback");
                return this.generateAdvancedFallbackContent(transcription, specialtyLower, template, defaultTemplate);
            }
        } catch (error) {
            console.error("Website content generation error:", error);
            throw new ApiError(500, `Failed to generate website content: ${error.message}`);
        }
    }

    // Validate and enhance AI-generated content with quality checks
    validateAndEnhanceContent(content, specialty, template, defaultTemplate) {
        const thresholds = this.contentQualityThresholds;
        
        // Validate and enhance each section
        const enhancedContent = {
            websiteTitle: this.validateAndEnhanceTitle(content.websiteTitle, specialty, defaultTemplate),
            tagline: content.tagline || template.tagline,
            heroSection: this.validateAndEnhanceHeroSection(content.heroSection, specialty),
            aboutSection: this.validateAndEnhanceAboutSection(content.aboutSection, specialty, template),
            services: this.validateAndEnhanceServices(content.services, specialty, template),
            contactInfo: this.validateAndEnhanceContactInfo(content.contactInfo, specialty),
            seoMeta: this.validateAndEnhanceSeoMeta(content.seoMeta, specialty, template),
            generatedAt: new Date().toISOString(),
            specialty: specialty,
            qualityScore: this.calculateQualityScore(content),
            contentFeatures: this.extractContentFeatures(content),
            validationPassed: true
        };

        return enhancedContent;
    }

    // Validate and enhance title
    validateAndEnhanceTitle(title, specialty, defaultTemplate) {
        if (!title || title.length < this.contentQualityThresholds.minTitleLength) {
            return defaultTemplate.template.websiteTitle || `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Medical Center`;
        }
        
        if (title.length > this.contentQualityThresholds.maxTitleLength) {
            return title.substring(0, this.contentQualityThresholds.maxTitleLength - 3) + '...';
        }
        
        return title;
    }

    // Validate and enhance hero section
    validateAndEnhanceHeroSection(heroSection, specialty) {
        let subheadline = heroSection?.subheadline || "Professional medical services with personalized care and attention";
        
        // Truncate subheadline to 300 characters to match schema validation
        if (subheadline.length > 300) {
            subheadline = subheadline.substring(0, 297) + '...';
        }
        
        return {
            headline: heroSection?.headline || `Expert ${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Care`,
            subheadline: subheadline,
            ctaText: heroSection?.ctaText || "Schedule Appointment"
        };
    }

    // Validate and enhance about section
    validateAndEnhanceAboutSection(aboutSection, specialty, template) {
        return {
            title: aboutSection?.title || "About Our Practice",
            content: aboutSection?.content || `We provide ${template.about} with experienced medical professionals dedicated to your health and wellbeing.`,
            highlights: aboutSection?.highlights || ["Experienced Medical Team", "State-of-the-Art Technology", "Patient-Centered Care"]
        };
    }

    // Validate and enhance services
    validateAndEnhanceServices(services, specialty, template) {
        if (!services || services.length < this.contentQualityThresholds.minServicesCount) {
            return template.services.map(service => ({
                name: service,
                description: `Professional ${service.toLowerCase()} services tailored to your needs`,
                icon: "medical-icon"
            }));
        }

        return services.slice(0, this.contentQualityThresholds.maxServicesCount).map(service => ({
            name: service.name || "Medical Service",
            description: service.description || "Professional medical service",
            icon: service.icon || "medical-icon"
        }));
    }

    // Validate and enhance contact info
    validateAndEnhanceContactInfo(contactInfo, specialty) {
        return {
            phone: contactInfo?.phone || "(555) 123-4567",
            email: contactInfo?.email || `info@${specialty.replace(/\s+/g, '')}practice.com`,
            address: contactInfo?.address || "123 Medical Center Drive, Healthcare City, HC 12345",
            hours: contactInfo?.hours || "Monday-Friday: 9:00 AM - 5:00 PM"
        };
    }

    // Validate and enhance SEO meta
    validateAndEnhanceSeoMeta(seoMeta, specialty, template) {
        return {
            title: seoMeta?.title || `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Specialist - Expert Medical Care`,
            description: seoMeta?.description || `Professional ${specialty} services with experienced specialists and personalized care.`,
            keywords: seoMeta?.keywords || template.keywords || [specialty, "medical", "healthcare", "treatment", "specialist"]
        };
    }

    // Calculate content quality score
    calculateQualityScore(content) {
        let score = 0;
        let maxScore = 0;

        // Title quality (20%)
        maxScore += 20;
        if (content.websiteTitle && content.websiteTitle.length >= 10) score += 20;

        // Services quality (30%)
        maxScore += 30;
        if (content.services && content.services.length >= 4) score += 30;
        else if (content.services && content.services.length >= 3) score += 20;

        // About section quality (20%)
        maxScore += 20;
        if (content.aboutSection && content.aboutSection.content && content.aboutSection.content.length >= 100) score += 20;

        // SEO quality (15%)
        maxScore += 15;
        if (content.seoMeta && content.seoMeta.title && content.seoMeta.description) score += 15;

        // Contact info quality (15%)
        maxScore += 15;
        if (content.contactInfo && content.contactInfo.phone && content.contactInfo.email) score += 15;

        return Math.round((score / maxScore) * 100) / 100;
    }

    // Extract content features
    extractContentFeatures(content) {
        const features = [];
        
        if (content.services && content.services.length > 5) features.push("comprehensive-services");
        if (content.aboutSection && content.aboutSection.highlights && content.aboutSection.highlights.length > 3) features.push("detailed-highlights");
        if (content.seoMeta && content.seoMeta.keywords && content.seoMeta.keywords.length > 5) features.push("seo-optimized");
        if (content.heroSection && content.heroSection.headline && content.heroSection.subheadline) features.push("compelling-hero");
        
        return features;
    }

    // Generate advanced fallback content when AI fails
    generateAdvancedFallbackContent(transcription, specialty, template, defaultTemplate) {
        console.log(`[Fallback Content] Generating fallback for specialty: ${specialty}`);
        
        const practiceTypes = {
            cardiology: "Cardiology",
            orthopedics: "Orthopedic", 
            dermatology: "Dermatology",
            pediatrics: "Pediatric",
            'general-practice': "Family Medicine",
            gynecology: "Women's Health",
            neurology: "Neurology",
            psychiatry: "Mental Health",
            oncology: "Cancer Care",
            ophthalmology: "Eye Care",
            dentistry: "Dental",
            urology: "Urology",
            endocrinology: "Endocrine"
        };

        const practiceType = practiceTypes[specialty] || "Medical";
        console.log(`[Fallback Content] Practice type: ${practiceType}`);

        return {
            websiteTitle: `${practiceType} Medical Center`,
            tagline: template.tagline,
            heroSection: {
                headline: `Expert ${practiceType} Care`,
                subheadline: "Providing comprehensive medical services with personalized attention and advanced technology",
                ctaText: "Schedule Consultation"
            },
            aboutSection: {
                title: "About Our Practice",
                content: `Our ${practiceType.toLowerCase()} practice is dedicated to providing exceptional medical care with a focus on patient comfort and treatment excellence. We combine years of experience with the latest medical technologies to ensure the best possible outcomes for our patients.`,
                highlights: ["Experienced Medical Team", "Advanced Medical Technology", "Patient-Centered Approach", "Comprehensive Care"]
            },
            services: template.services.map(service => ({
                name: service,
                description: `Professional ${service.toLowerCase()} services delivered with expertise and care`,
                icon: "medical-icon"
            })),
            contactInfo: {
                phone: "(555) 123-4567",
                email: `info@${specialty.replace(/\s+/g, '')}medical.com`,
                address: "123 Medical Plaza, Healthcare City, HC 12345",
                hours: "Monday-Friday: 8:00 AM - 6:00 PM"
            },
            seoMeta: {
                title: `${practiceType} Medical Center - Expert Healthcare Services`,
                description: `Professional ${specialty} medical services with experienced specialists and comprehensive care options.`,
                keywords: template.keywords
            },
            generatedAt: new Date().toISOString(),
            specialty: specialty,
            qualityScore: 0.75,
            contentFeatures: ["professional-fallback", "template-based"],
            fallbackUsed: true,
            validationPassed: true
        };
    }

    // Generate content variations for A/B testing
    async generateContentVariations(transcription, specialty, variationCount = 2) {
        const variations = [];
        const specialtyInfo = typeof specialty === 'string' ? { specialty: specialty } : specialty;
        
        for (let i = 0; i < variationCount; i++) {
            try {
                // Add variation-specific instructions
                const variationPrompt = `
                Generate variation ${i + 1} of professional medical website content.
                Make this variation unique with different tone and approach:
                
                ${i === 0 ? 'Focus on trust and experience' : ''}
                ${i === 1 ? 'Focus on technology and innovation' : ''}
                ${i === 2 ? 'Focus on patient care and comfort' : ''}
                ${i === 3 ? 'Focus on comprehensive services' : ''}
                
                Practice: "${transcription}"
                Specialty: ${specialtyInfo.specialty}
                `;

                const content = await this.generateWebsiteContent(variationPrompt, specialtyInfo.specialty);
                
                variations.push({
                    id: `variation_${i + 1}`,
                    content: content,
                    focus: this.getVariationFocus(i),
                    createdAt: new Date().toISOString(),
                    qualityScore: content.qualityScore || 0.8
                });
            } catch (error) {
                console.error(`Failed to generate variation ${i + 1}:`, error);
                // Add fallback variation
                variations.push({
                    id: `variation_${i + 1}`,
                    content: this.generateAdvancedFallbackContent(transcription, specialtyInfo.specialty, 
                        this.contentTemplates[specialtyInfo.specialty], getTemplateBySpecialty(specialtyInfo.specialty)),
                    focus: 'fallback',
                    createdAt: new Date().toISOString(),
                    qualityScore: 0.7,
                    fallbackUsed: true
                });
            }
        }

        return variations;
    }

    // Get variation focus
    getVariationFocus(index) {
        const focuses = ['trust-experience', 'technology-innovation', 'patient-care', 'comprehensive-services'];
        return focuses[index] || 'general';
    }

    // Regenerate specific section
    async regenerateSection(transcription, specialty, sectionName) {
        try {
            const prompt = `
            Regenerate the ${sectionName} section for a ${specialty} medical practice.
            
            Practice Description: "${transcription}"
            Section: ${sectionName}
            
            Generate only the ${sectionName} content in JSON format:
            ${this.getSectionPrompt(sectionName)}
            
            Make it professional, engaging, and relevant to ${specialty}.
            `;

            const response = await this.generateContent(prompt);
            
            try {
                return JSON.parse(response);
            } catch (parseError) {
                return this.generateSectionFallback(sectionName, specialty);
            }
        } catch (error) {
            console.error(`Section regeneration error for ${sectionName}:`, error);
            return this.generateSectionFallback(sectionName, specialty);
        }
    }

    // Get section-specific prompt
    getSectionPrompt(sectionName) {
        const prompts = {
            heroSection: `{
                "headline": "Compelling main headline",
                "subheadline": "Supporting headline that builds trust",
                "ctaText": "Action button text"
            }`,
            aboutSection: `{
                "title": "About section title",
                "content": "Professional about content (2-3 paragraphs)",
                "highlights": ["highlight1", "highlight2", "highlight3"]
            }`,
            services: `[
                {
                    "name": "Service Name",
                    "description": "Service description",
                    "icon": "icon-name"
                }
            ]`
        };
        
        return prompts[sectionName] || '{}';
    }

    // Generate section fallback
    generateSectionFallback(sectionName, specialty) {
        const fallbacks = {
            heroSection: {
                headline: `Expert ${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Care`,
                subheadline: "Professional medical services with personalized attention",
                ctaText: "Schedule Appointment"
            },
            aboutSection: {
                title: "About Our Practice",
                content: `Our ${specialty} practice provides comprehensive medical care with a focus on patient wellbeing and treatment excellence.`,
                highlights: ["Experienced Team", "Advanced Technology", "Patient-Centered Care"]
            },
            services: [
                {
                    name: "Consultation",
                    description: "Comprehensive medical consultation",
                    icon: "consultation-icon"
                }
            ]
        };
        
        return fallbacks[sectionName] || {};
    }

    // Utility methods with enhanced cache keys
    generateCacheKey(prompt, specialty = null) {
        // CRITICAL FIX: Include specialty in cache key to ensure complete uniqueness
        const specialtyPrefix = specialty ? `${specialty}_` : '';
        const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 32);
        const cacheKey = `ai_cache_${specialtyPrefix}${hash}`;
        console.log(`[AI Service] 🔑 Generated cache key: ${cacheKey} for specialty: ${specialty || 'none'}, prompt length: ${prompt.length}`);
        return cacheKey;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clear cache completely
    clearCache() {
        console.log('[AI Service] 🧹 Clearing AI generation cache');
        this.generationCache.clear();
        
        // CRITICAL FIX: Force garbage collection
        if (global.gc) {
            global.gc();
        }
        
        console.log('[AI Service] ✅ AI generation cache cleared');
    }

    // Clear cache for specific specialty
    clearSpecialtyCache(specialty) {
        console.log(`[AI Service] 🧹 Clearing cache for specialty: ${specialty}`);
        const keysToDelete = [];
        
        for (const key of this.generationCache.keys()) {
            if (key.includes(`ai_cache_${specialty}_`)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.generationCache.delete(key);
        });
        
        console.log(`[AI Service] ✅ Cleared ${keysToDelete.length} cache entries for specialty: ${specialty}`);
        return keysToDelete.length;
    }

    // Get cache keys for specific specialty
    getSpecialtyCacheKeys(specialty) {
        const specialtyKeys = [];
        
        for (const key of this.generationCache.keys()) {
            if (key.includes(`ai_cache_${specialty}_`)) {
                specialtyKeys.push(key);
            }
        }
        
        return specialtyKeys;
    }

    // Get cache statistics with detailed breakdown
    getCacheStats() {
        const entries = [...this.generationCache.entries()];
        const specialtyBreakdown = {};
        
        // Analyze cache by specialty
        entries.forEach(([key, value]) => {
            const match = key.match(/^ai_cache_([a-zA-Z-]+)_/);
            const specialty = match ? match[1] : 'unknown';
            
            if (!specialtyBreakdown[specialty]) {
                specialtyBreakdown[specialty] = { count: 0, totalSize: 0 };
            }
            
            specialtyBreakdown[specialty].count++;
            specialtyBreakdown[specialty].totalSize += value.length;
        });
        
        return {
            size: this.generationCache.size,
            memoryUsage: JSON.stringify(entries).length,
            cacheKeys: entries.map(([key]) => key),
            avgValueSize: entries.length > 0 ? entries.reduce((sum, [key, value]) => sum + value.length, 0) / entries.length : 0,
            specialtyBreakdown: specialtyBreakdown
        };
    }

    // 🧪 TEST FUNCTION: Test specialty detection with critical cases
    async testSpecialtyDetection() {
        console.log('\n🧪 ================================');
        console.log('🧪 TESTING SPECIALTY DETECTION FIXES');
        console.log('🧪 ================================\n');

        const testCases = [
            // CRITICAL TEST CASES that were failing
            {
                input: "teeth and dentistry",
                expectedSpecialty: "dentistry",
                description: "Critical: teeth and dentistry should map to dentistry"
            },
            {
                input: "heart and cardiology",
                expectedSpecialty: "cardiology", 
                description: "Critical: heart and cardiology should map to cardiology"
            },
            {
                input: "skin and dermatology",
                expectedSpecialty: "dermatology",
                description: "Critical: skin and dermatology should map to dermatology"
            },
            {
                input: "women and gynecology",
                expectedSpecialty: "gynecology",
                description: "Critical: women and gynecology should map to gynecology"
            },
            {
                input: "children and pediatrics",
                expectedSpecialty: "pediatrics",
                description: "Critical: children and pediatrics should map to pediatrics"
            },
            
            // EXACT SPECIALTY NAME TESTS
            {
                input: "Our dentistry practice provides comprehensive oral care",
                expectedSpecialty: "dentistry",
                description: "Exact specialty name: dentistry"
            },
            {
                input: "Cardiology services for heart health",
                expectedSpecialty: "cardiology",
                description: "Exact specialty name: cardiology"
            },
            {
                input: "Dermatology clinic for skin conditions",
                expectedSpecialty: "dermatology",
                description: "Exact specialty name: dermatology"
            },
            
            // STRONG KEYWORD TESTS
            {
                input: "dental cleaning and teeth whitening services",
                expectedSpecialty: "dentistry",
                description: "Strong dental keywords"
            },
            {
                input: "cardiac surgery and heart treatments",
                expectedSpecialty: "cardiology",
                description: "Strong cardiac keywords"
            },
            {
                input: "skin cancer screening and acne treatment",
                expectedSpecialty: "dermatology",
                description: "Strong dermatology keywords"
            },
            
            // EDGE CASES
            {
                input: "general medical practice",
                expectedSpecialty: "general-practice",
                description: "General practice fallback"
            },
            {
                input: "comprehensive healthcare services",
                expectedSpecialty: "general-practice",
                description: "Vague description should fallback to general"
            }
        ];

        const results = {
            passed: 0,
            failed: 0,
            total: testCases.length,
            details: []
        };

        for (const testCase of testCases) {
            try {
                console.log(`\n🔍 Testing: "${testCase.input}"`);
                console.log(`📝 Expected: ${testCase.expectedSpecialty}`);
                console.log(`📋 Description: ${testCase.description}`);
                
                const result = await this.detectMedicalSpecialty(testCase.input);
                
                const passed = result.specialty === testCase.expectedSpecialty;
                const status = passed ? '✅ PASSED' : '❌ FAILED';
                
                console.log(`📊 Actual: ${result.specialty} (confidence: ${result.confidence}, method: ${result.method})`);
                console.log(`🎯 Result: ${status}`);
                
                if (passed) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.details.push({
                        input: testCase.input,
                        expected: testCase.expectedSpecialty,
                        actual: result.specialty,
                        confidence: result.confidence,
                        method: result.method,
                        description: testCase.description
                    });
                }
                
                console.log('─'.repeat(60));
            } catch (error) {
                console.error(`❌ ERROR testing "${testCase.input}":`, error.message);
                results.failed++;
                results.details.push({
                    input: testCase.input,
                    expected: testCase.expectedSpecialty,
                    actual: 'ERROR',
                    error: error.message,
                    description: testCase.description
                });
            }
        }

        // Print summary
        console.log('\n📊 ================================');
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('📊 ================================');
        console.log(`✅ Passed: ${results.passed}/${results.total}`);
        console.log(`❌ Failed: ${results.failed}/${results.total}`);
        console.log(`📈 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
        
        if (results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            results.details.forEach((detail, index) => {
                console.log(`${index + 1}. ${detail.description}`);
                console.log(`   Input: "${detail.input}"`);
                console.log(`   Expected: ${detail.expected}, Got: ${detail.actual}`);
                if (detail.error) {
                    console.log(`   Error: ${detail.error}`);
                }
                console.log('');
            });
        }
        
        console.log('📊 ================================\n');
        
        return results;
    }

    // 🧪 TEST FUNCTION: Test keyword detection specifically
    testKeywordDetection() {
        console.log('\n🧪 ================================');
        console.log('🧪 TESTING KEYWORD DETECTION');
        console.log('🧪 ================================\n');

        const keywordTests = [
            { input: "teeth and dentistry", expected: "dentistry" },
            { input: "heart and cardiology", expected: "cardiology" },
            { input: "skin and dermatology", expected: "dermatology" },
            { input: "women health gynecology", expected: "gynecology" },
            { input: "children pediatrics care", expected: "pediatrics" },
            { input: "dental hygiene and oral health", expected: "dentistry" },
            { input: "cardiac care and heart health", expected: "cardiology" },
            { input: "skin conditions and acne", expected: "dermatology" }
        ];

        const results = { passed: 0, failed: 0, total: keywordTests.length };

        keywordTests.forEach(test => {
            const result = this.detectSpecialtyByKeywords(test.input.toLowerCase());
            const passed = result.specialty === test.expected;
            
            console.log(`Input: "${test.input}"`);
            console.log(`Expected: ${test.expected}, Got: ${result.specialty}`);
            console.log(`Confidence: ${result.confidence}`);
            console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
            console.log('─'.repeat(50));
            
            if (passed) results.passed++;
            else results.failed++;
        });

        console.log(`\n📊 Keyword Detection Results: ${results.passed}/${results.total} passed`);
        console.log('🧪 ================================\n');
        
        return results;
    }

    // 🧪 UTILITY: Quick test for specific input
    async quickTest(input) {
        console.log(`\n🚀 Quick Test for: "${input}"`);
        console.log('═'.repeat(60));
        
        const result = await this.detectMedicalSpecialty(input);
        
        console.log(`📊 Result: ${result.specialty}`);
        console.log(`🎯 Confidence: ${result.confidence}`);
        console.log(`🔧 Method: ${result.method}`);
        console.log(`💭 Reasoning: ${result.reasoning || 'No reasoning provided'}`);
        console.log('═'.repeat(60));
        
        return result;
    }
}

export default new AIService();