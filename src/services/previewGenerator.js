// src/services/previewGenerator.js
import { ApiError } from "../utils/apierror.js";

export class PreviewGenerator {
    constructor() {
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        this.previewCache = new Map();
        this.responsiveBreakpoints = {
            mobile: '640px',
            tablet: '768px',
            desktop: '1024px',
            large: '1280px'
        };
    }

    // Generate complete HTML preview
    async generatePreview(websiteData, customizations = {}) {
        try {
            // Generate responsive HTML
            const html = await this.generateResponsiveHTML(websiteData, customizations);
            
            // Generate CSS with Tailwind and custom styles
            const css = await this.generateCSS(websiteData, customizations);
            
            // Generate inline styles for email-safe version
            const inlineStyles = this.generateInlineStyles(customizations);
            
            // Generate metadata
            const metadata = this.generateMetadata(websiteData, customizations);
            
            // Generate preview assets
            const assets = this.generateAssets(websiteData, customizations);
            
            return {
                html: html,
                css: css,
                inlineStyles: inlineStyles,
                metadata: metadata,
                assets: assets,
                responsive: {
                    mobile: this.generateMobilePreview(html, css),
                    tablet: this.generateTabletPreview(html, css),
                    desktop: this.generateDesktopPreview(html, css)
                },
                performance: this.analyzePerformance(html, css),
                accessibility: this.analyzeAccessibility(html, css)
            };
            
        } catch (error) {
            console.error('Preview generation error:', error);
            throw new ApiError(500, `Failed to generate preview: ${error.message}`);
        }
    }

    // Generate responsive HTML structure
    async generateResponsiveHTML(websiteData, customizations) {
        const seoMeta = websiteData.seoMeta || {};
        const colors = customizations.colors || {};
        const fonts = customizations.fonts || {};
        const features = customizations.features || {};

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${seoMeta.title || websiteData.websiteTitle || 'Medical Practice'}</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="${seoMeta.description || 'Professional medical services'}">
    <meta name="keywords" content="${(seoMeta.keywords || []).join(', ')}">
    <meta name="author" content="${websiteData.websiteTitle || 'Medical Practice'}">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${seoMeta.title || websiteData.websiteTitle}">
    <meta property="og:description" content="${seoMeta.description || 'Professional medical services'}">
    <meta property="og:url" content="${this.baseUrl}">
    <meta property="og:image" content="${websiteData.ogImage || '/images/default-og-image.jpg'}">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${seoMeta.title || websiteData.websiteTitle}">
    <meta name="twitter:description" content="${seoMeta.description || 'Professional medical services'}">
    <meta name="twitter:image" content="${websiteData.ogImage || '/images/default-og-image.jpg'}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=${fonts.headingFont || 'Inter'}:wght@400;500;600;700&family=${fonts.bodyFont || 'Inter'}:wght@400;500;600&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '${colors.primary || '#2563eb'}',
                        secondary: '${colors.secondary || '#64748b'}',
                        accent: '${colors.accent || '#10b981'}',
                        background: '${colors.background || '#ffffff'}',
                        text: '${colors.text || '#1f2937'}'
                    },
                    fontFamily: {
                        'heading': ['${fonts.headingFont || 'Inter'}', 'sans-serif'],
                        'body': ['${fonts.bodyFont || 'Inter'}', 'sans-serif']
                    }
                }
            }
        }
    </script>
    
    <!-- Custom Styles -->
    <style id="custom-styles">
        /* Custom CSS will be injected here */
    </style>
    
    <!-- Schema.org Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "MedicalOrganization",
        "name": "${websiteData.websiteTitle || 'Medical Practice'}",
        "description": "${seoMeta.description || 'Professional medical services'}",
        "url": "${this.baseUrl}",
        "telephone": "${websiteData.contactInfo?.phone || ''}",
        "email": "${websiteData.contactInfo?.email || ''}",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "${websiteData.contactInfo?.address || ''}"
        },
        "medicalSpecialty": "${websiteData.specialty || 'General Practice'}",
        "logo": "${websiteData.logo || '/images/logo.png'}",
        "image": "${websiteData.ogImage || '/images/default-og-image.jpg'}",
        "sameAs": [
            "${websiteData.contactInfo?.socialMedia?.facebook || ''}",
            "${websiteData.contactInfo?.socialMedia?.twitter || ''}",
            "${websiteData.contactInfo?.socialMedia?.linkedin || ''}"
        ]
    }
    </script>
</head>
<body class="font-body text-text bg-background">
    
    <!-- Header -->
    <header class="bg-white shadow-sm ${customizations.layout?.headerStyle === 'fixed' ? 'fixed top-0 left-0 right-0 z-50' : ''}">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center">
                    ${websiteData.logo ? `<img src="${websiteData.logo}" alt="${websiteData.websiteTitle}" class="h-10 w-auto">` : ''}
                    <h1 class="ml-3 text-2xl font-heading font-bold text-primary">${websiteData.websiteTitle || 'Medical Practice'}</h1>
                </div>
                
                <nav class="hidden md:flex space-x-8">
                    <a href="#home" class="text-text hover:text-primary transition-colors">Home</a>
                    <a href="#about" class="text-text hover:text-primary transition-colors">About</a>
                    <a href="#services" class="text-text hover:text-primary transition-colors">Services</a>
                    <a href="#contact" class="text-text hover:text-primary transition-colors">Contact</a>
                </nav>
                
                <div class="flex items-center space-x-4">
                    <a href="tel:${websiteData.contactInfo?.phone || ''}" class="text-primary font-medium">
                        ${websiteData.contactInfo?.phone || '(555) 123-4567'}
                    </a>
                    <button class="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                        ${websiteData.heroSection?.ctaText || 'Schedule Appointment'}
                    </button>
                </div>
                
                <!-- Mobile menu button -->
                <button class="md:hidden" id="mobile-menu-button">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
        </div>
        
        <!-- Mobile menu -->
        <div class="md:hidden hidden" id="mobile-menu">
            <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
                <a href="#home" class="block px-3 py-2 text-text hover:text-primary">Home</a>
                <a href="#about" class="block px-3 py-2 text-text hover:text-primary">About</a>
                <a href="#services" class="block px-3 py-2 text-text hover:text-primary">Services</a>
                <a href="#contact" class="block px-3 py-2 text-text hover:text-primary">Contact</a>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section id="home" class="relative bg-gradient-to-r from-primary/10 to-accent/10 py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <h2 class="text-4xl md:text-6xl font-heading font-bold text-text mb-6">
                    ${websiteData.heroSection?.headline || 'Expert Medical Care'}
                </h2>
                <p class="text-xl md:text-2xl text-secondary mb-8 max-w-3xl mx-auto">
                    ${websiteData.heroSection?.subheadline || 'Professional medical services with personalized care'}
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <button class="bg-primary text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors">
                        ${websiteData.heroSection?.ctaText || 'Schedule Appointment'}
                    </button>
                    <button class="border-2 border-primary text-primary px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/10 transition-colors">
                        Learn More
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section id="about" class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto text-center">
                <h3 class="text-3xl md:text-4xl font-heading font-bold text-text mb-6">
                    ${websiteData.aboutSection?.title || 'About Our Practice'}
                </h3>
                <p class="text-lg text-secondary mb-8 leading-relaxed">
                    ${websiteData.aboutSection?.content || 'We provide comprehensive medical care with a focus on patient comfort and treatment excellence.'}
                </p>
                
                ${websiteData.aboutSection?.highlights ? `
                <div class="grid md:grid-cols-3 gap-6 mt-12">
                    ${websiteData.aboutSection.highlights.map(highlight => `
                        <div class="text-center p-6 rounded-lg bg-background border border-gray-200">
                            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h4 class="font-heading font-semibold text-text mb-2">${highlight}</h4>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="py-20 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <h3 class="text-3xl md:text-4xl font-heading font-bold text-text mb-6">
                    Our Services
                </h3>
                <p class="text-lg text-secondary max-w-3xl mx-auto">
                    We offer a comprehensive range of medical services to meet all your healthcare needs.
                </p>
            </div>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${websiteData.services ? websiteData.services.map(service => `
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h4 class="text-xl font-heading font-semibold text-text mb-3">${service.name}</h4>
                        <p class="text-secondary leading-relaxed">${service.description}</p>
                    </div>
                `).join('') : ''}
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto">
                <div class="text-center mb-12">
                    <h3 class="text-3xl md:text-4xl font-heading font-bold text-text mb-6">
                        Contact Us
                    </h3>
                    <p class="text-lg text-secondary">
                        Ready to schedule your appointment? Get in touch with us today.
                    </p>
                </div>
                
                <div class="grid md:grid-cols-2 gap-12">
                    <div class="space-y-6">
                        <div class="flex items-start space-x-4">
                            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                </svg>
                            </div>
                            <div>
                                <h4 class="font-heading font-semibold text-text mb-1">Phone</h4>
                                <p class="text-secondary">${websiteData.contactInfo?.phone || '(555) 123-4567'}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-start space-x-4">
                            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <div>
                                <h4 class="font-heading font-semibold text-text mb-1">Email</h4>
                                <p class="text-secondary">${websiteData.contactInfo?.email || 'info@medicalcenter.com'}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-start space-x-4">
                            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <h4 class="font-heading font-semibold text-text mb-1">Address</h4>
                                <p class="text-secondary">${websiteData.contactInfo?.address || '123 Medical Plaza, Healthcare City, HC 12345'}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-start space-x-4">
                            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <h4 class="font-heading font-semibold text-text mb-1">Hours</h4>
                                <p class="text-secondary">${websiteData.contactInfo?.hours || 'Monday-Friday: 8:00 AM - 6:00 PM'}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${features.appointmentBooking ? `
                    <div class="bg-gray-50 rounded-lg p-6">
                        <h4 class="text-xl font-heading font-semibold text-text mb-4">Schedule an Appointment</h4>
                        <form class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-text mb-2">Name</label>
                                <input type="text" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-text mb-2">Email</label>
                                <input type="email" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-text mb-2">Phone</label>
                                <input type="tel" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-text mb-2">Message</label>
                                <textarea rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
                            </div>
                            <button type="submit" class="w-full bg-primary text-white py-3 rounded-md hover:bg-primary/90 transition-colors">
                                Schedule Appointment
                            </button>
                        </form>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid md:grid-cols-4 gap-8">
                <div>
                    <h4 class="font-heading font-semibold text-white mb-4">${websiteData.websiteTitle || 'Medical Practice'}</h4>
                    <p class="text-gray-400 leading-relaxed">
                        ${websiteData.tagline || 'Professional medical care you can trust'}
                    </p>
                </div>
                
                <div>
                    <h4 class="font-heading font-semibold text-white mb-4">Services</h4>
                    <ul class="space-y-2 text-gray-400">
                        ${websiteData.services ? websiteData.services.slice(0, 4).map(service => `
                            <li><a href="#" class="hover:text-white transition-colors">${service.name}</a></li>
                        `).join('') : ''}
                    </ul>
                </div>
                
                <div>
                    <h4 class="font-heading font-semibold text-white mb-4">Contact</h4>
                    <ul class="space-y-2 text-gray-400">
                        <li>${websiteData.contactInfo?.phone || '(555) 123-4567'}</li>
                        <li>${websiteData.contactInfo?.email || 'info@medicalcenter.com'}</li>
                        <li>${websiteData.contactInfo?.address || '123 Medical Plaza'}</li>
                    </ul>
                </div>
                
                <div>
                    <h4 class="font-heading font-semibold text-white mb-4">Follow Us</h4>
                    <div class="flex space-x-4">
                        ${websiteData.contactInfo?.socialMedia?.facebook ? `
                            <a href="${websiteData.contactInfo.socialMedia.facebook}" class="text-gray-400 hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                        ` : ''}
                        ${websiteData.contactInfo?.socialMedia?.twitter ? `
                            <a href="${websiteData.contactInfo.socialMedia.twitter}" class="text-gray-400 hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                </svg>
                            </a>
                        ` : ''}
                        ${websiteData.contactInfo?.socialMedia?.linkedin ? `
                            <a href="${websiteData.contactInfo.socialMedia.linkedin}" class="text-gray-400 hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; ${new Date().getFullYear()} ${websiteData.websiteTitle || 'Medical Practice'}. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <!-- JavaScript -->
    <script>
        // Mobile menu toggle
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Form submission (if appointment booking is enabled)
        ${features.appointmentBooking ? `
        document.querySelector('form').addEventListener('submit', function(e) {
            e.preventDefault();
            // Handle form submission here
            alert('Thank you for your appointment request. We will contact you shortly.');
        });
        ` : ''}
    </script>
</body>
</html>
        `.trim();

        return html;
    }

    // Generate CSS styles
    async generateCSS(websiteData, customizations) {
        const colors = customizations.colors || {};
        const fonts = customizations.fonts || {};
        const layout = customizations.layout || {};

        const css = `
/* Custom CSS for ${websiteData.websiteTitle || 'Medical Practice'} */

/* CSS Variables */
:root {
    --color-primary: ${colors.primary || '#2563eb'};
    --color-secondary: ${colors.secondary || '#64748b'};
    --color-accent: ${colors.accent || '#10b981'};
    --color-background: ${colors.background || '#ffffff'};
    --color-text: ${colors.text || '#1f2937'};
    
    --font-heading: '${fonts.headingFont || 'Inter'}', sans-serif;
    --font-body: '${fonts.bodyFont || 'Inter'}', sans-serif;
    
    --header-height: ${layout.headerStyle === 'fixed' ? '80px' : 'auto'};
}

/* Base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-body);
    color: var(--color-text);
    background-color: var(--color-background);
    line-height: 1.6;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    font-weight: 600;
    line-height: 1.2;
}

/* Header styles */
${layout.headerStyle === 'fixed' ? `
body {
    padding-top: var(--header-height);
}
` : ''}

${layout.headerStyle === 'transparent' ? `
header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
}
` : ''}

/* Button styles */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
}

.btn-primary {
    background-color: var(--color-primary);
    color: white;
}

.btn-primary:hover {
    background-color: color-mix(in srgb, var(--color-primary) 90%, black);
}

.btn-secondary {
    background-color: transparent;
    color: var(--color-primary);
    border: 2px solid var(--color-primary);
}

.btn-secondary:hover {
    background-color: var(--color-primary);
    color: white;
}

/* Animation styles */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out;
}

/* Responsive utilities */
@media (max-width: 768px) {
    .hero h2 {
        font-size: 2.5rem;
    }
    
    .hero p {
        font-size: 1.125rem;
    }
    
    .section-padding {
        padding: 3rem 0;
    }
}

/* Accessibility improvements */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* Focus styles */
*:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}

/* Print styles */
@media print {
    .no-print {
        display: none;
    }
    
    body {
        color: black;
        background: white;
    }
    
    a {
        color: black;
        text-decoration: none;
    }
    
    .btn {
        border: 1px solid black;
        background: white;
        color: black;
    }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    :root {
        --color-background: #111827;
        --color-text: #f9fafb;
    }
    
    .dark-mode-toggle {
        display: block;
    }
}

/* High contrast mode */
@media (prefers-contrast: high) {
    :root {
        --color-primary: #000000;
        --color-secondary: #000000;
        --color-accent: #000000;
        --color-background: #ffffff;
        --color-text: #000000;
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
        `.trim();

        return css;
    }

    // Generate inline styles for email compatibility
    generateInlineStyles(customizations) {
        const colors = customizations.colors || {};
        
        return {
            body: `font-family: Arial, sans-serif; color: ${colors.text || '#1f2937'}; background-color: ${colors.background || '#ffffff'}; margin: 0; padding: 0;`,
            header: `background-color: ${colors.background || '#ffffff'}; padding: 1rem; border-bottom: 1px solid #e5e7eb;`,
            hero: `background: linear-gradient(135deg, ${colors.primary || '#2563eb'}20, ${colors.accent || '#10b981'}20); padding: 3rem 1rem; text-align: center;`,
            section: `padding: 2rem 1rem; max-width: 1200px; margin: 0 auto;`,
            button: `background-color: ${colors.primary || '#2563eb'}; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 0.5rem; display: inline-block; font-weight: 500;`,
            footer: `background-color: #111827; color: white; padding: 2rem 1rem; text-align: center;`
        };
    }

    // Generate metadata
    generateMetadata(websiteData, customizations) {
        return {
            title: websiteData.seoMeta?.title || websiteData.websiteTitle || 'Medical Practice',
            description: websiteData.seoMeta?.description || 'Professional medical services',
            keywords: websiteData.seoMeta?.keywords || [],
            author: websiteData.websiteTitle || 'Medical Practice',
            viewport: 'width=device-width, initial-scale=1.0',
            charset: 'UTF-8',
            language: 'en',
            robots: 'index, follow',
            generator: 'AI Website Builder',
            theme: customizations.theme || 'professional',
            colorScheme: customizations.colors || {},
            fonts: customizations.fonts || {},
            performance: {
                critical: true,
                preload: ['fonts', 'css'],
                defer: ['javascript', 'analytics']
            }
        };
    }

    // Generate assets list
    generateAssets(websiteData, customizations) {
        return {
            stylesheets: [
                'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
                'https://cdn.tailwindcss.com'
            ],
            scripts: [
                'https://cdn.tailwindcss.com'
            ],
            images: [
                websiteData.logo || '/images/logo.png',
                websiteData.ogImage || '/images/default-og-image.jpg',
                '/favicon.ico'
            ],
            fonts: [
                customizations.fonts?.headingFont || 'Inter',
                customizations.fonts?.bodyFont || 'Inter'
            ],
            icons: [
                'medical-icon',
                'phone-icon',
                'email-icon',
                'location-icon',
                'time-icon'
            ]
        };
    }

    // Generate mobile preview
    generateMobilePreview(html, css) {
        return {
            viewport: 'width=375px, height=667px',
            breakpoint: 'mobile',
            html: html,
            css: css + `
                @media (max-width: 640px) {
                    .container { padding: 0 1rem; }
                    .hero h2 { font-size: 2rem; }
                    .hero p { font-size: 1rem; }
                    .grid { grid-template-columns: 1fr; }
                }
            `
        };
    }

    // Generate tablet preview
    generateTabletPreview(html, css) {
        return {
            viewport: 'width=768px, height=1024px',
            breakpoint: 'tablet',
            html: html,
            css: css + `
                @media (min-width: 641px) and (max-width: 1023px) {
                    .container { padding: 0 2rem; }
                    .grid { grid-template-columns: repeat(2, 1fr); }
                }
            `
        };
    }

    // Generate desktop preview
    generateDesktopPreview(html, css) {
        return {
            viewport: 'width=1200px, height=800px',
            breakpoint: 'desktop',
            html: html,
            css: css + `
                @media (min-width: 1024px) {
                    .container { padding: 0 3rem; }
                    .grid { grid-template-columns: repeat(3, 1fr); }
                }
            `
        };
    }

    // Analyze performance
    analyzePerformance(html, css) {
        const htmlSize = Buffer.byteLength(html, 'utf8');
        const cssSize = Buffer.byteLength(css, 'utf8');
        const totalSize = htmlSize + cssSize;

        return {
            htmlSize: htmlSize,
            cssSize: cssSize,
            totalSize: totalSize,
            estimatedLoadTime: Math.round(totalSize / 1000), // rough estimate in ms
            optimization: {
                minified: false,
                gzipped: false,
                inlined: true,
                lazyLoading: false
            },
            score: this.calculatePerformanceScore(htmlSize, cssSize),
            recommendations: this.generatePerformanceRecommendations(htmlSize, cssSize)
        };
    }

    // Analyze accessibility
    analyzeAccessibility(html, css) {
        const checks = {
            altText: /alt="[^"]*"/.test(html),
            headingStructure: /<h[1-6]/.test(html),
            focusManagement: /focus:/.test(css),
            colorContrast: true, // Would need actual contrast calculation
            semanticHtml: /<(main|section|article|aside|nav|header|footer)/.test(html),
            ariaLabels: /aria-/.test(html)
        };

        const score = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;

        return {
            score: score,
            checks: checks,
            recommendations: this.generateAccessibilityRecommendations(checks)
        };
    }

    // Calculate performance score
    calculatePerformanceScore(htmlSize, cssSize) {
        const totalSize = htmlSize + cssSize;
        if (totalSize < 50000) return 100;
        if (totalSize < 100000) return 90;
        if (totalSize < 200000) return 80;
        if (totalSize < 500000) return 70;
        return 60;
    }

    // Generate performance recommendations
    generatePerformanceRecommendations(htmlSize, cssSize) {
        const recommendations = [];
        
        if (htmlSize > 100000) {
            recommendations.push('Consider minifying HTML to reduce file size');
        }
        
        if (cssSize > 50000) {
            recommendations.push('Consider removing unused CSS classes');
        }
        
        if (htmlSize + cssSize > 200000) {
            recommendations.push('Consider implementing code splitting');
        }
        
        return recommendations;
    }

    // Generate accessibility recommendations
    generateAccessibilityRecommendations(checks) {
        const recommendations = [];
        
        if (!checks.altText) {
            recommendations.push('Add alt text to all images');
        }
        
        if (!checks.headingStructure) {
            recommendations.push('Ensure proper heading hierarchy');
        }
        
        if (!checks.focusManagement) {
            recommendations.push('Improve focus management for keyboard navigation');
        }
        
        if (!checks.ariaLabels) {
            recommendations.push('Add ARIA labels for better screen reader support');
        }
        
        return recommendations;
    }

    // Clear preview cache completely
    clearCache() {
        console.log('[Preview Generator] 🧹 Clearing preview cache');
        this.previewCache.clear();
        
        // CRITICAL FIX: Force garbage collection
        if (global.gc) {
            global.gc();
        }
        
        console.log('[Preview Generator] ✅ Preview cache cleared');
    }

    // Get cache statistics with detailed breakdown
    getCacheStats() {
        const entries = [...this.previewCache.entries()];
        
        return {
            size: this.previewCache.size,
            memoryUsage: JSON.stringify(entries).length,
            cacheKeys: entries.map(([key]) => key),
            avgValueSize: entries.length > 0 ? entries.reduce((sum, [key, value]) => sum + JSON.stringify(value).length, 0) / entries.length : 0
        };
    }
}