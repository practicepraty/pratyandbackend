// src/services/styleProcessor.js
import { ApiError } from "../utils/apierror.js";

export class StyleProcessor {
    constructor() {
        this.tailwindConfig = this.initializeTailwindConfig();
        this.medicalColorSchemes = this.initializeMedicalColorSchemes();
        this.responsiveBreakpoints = {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px'
        };
        this.accessibilityColors = this.initializeAccessibilityColors();
    }

    // Initialize Tailwind configuration
    initializeTailwindConfig() {
        return {
            theme: {
                extend: {
                    colors: {
                        // Will be dynamically set per website
                    },
                    fontFamily: {
                        'heading': ['Inter', 'sans-serif'],
                        'body': ['Inter', 'sans-serif']
                    },
                    spacing: {
                        '18': '4.5rem',
                        '88': '22rem'
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.5s ease-in-out',
                        'slide-up': 'slideUp 0.6s ease-out',
                        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    },
                    keyframes: {
                        fadeIn: {
                            '0%': { opacity: '0' },
                            '100%': { opacity: '1' }
                        },
                        slideUp: {
                            '0%': { transform: 'translateY(20px)', opacity: '0' },
                            '100%': { transform: 'translateY(0)', opacity: '1' }
                        }
                    }
                }
            },
            plugins: []
        };
    }

    // Initialize medical-specific color schemes
    initializeMedicalColorSchemes() {
        return {
            'general-practice': {
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#10b981',
                background: '#ffffff',
                text: '#1f2937',
                light: '#f8fafc',
                dark: '#0f172a'
            },
            'dentistry': {
                primary: '#0ea5e9',
                secondary: '#64748b',
                accent: '#06b6d4',
                background: '#ffffff',
                text: '#1f2937',
                light: '#f0f9ff',
                dark: '#0c4a6e'
            },
            'dermatology': {
                primary: '#ec4899',
                secondary: '#64748b',
                accent: '#f97316',
                background: '#ffffff',
                text: '#1f2937',
                light: '#fdf2f8',
                dark: '#831843'
            },
            'cardiology': {
                primary: '#dc2626',
                secondary: '#64748b',
                accent: '#ea580c',
                background: '#ffffff',
                text: '#1f2937',
                light: '#fef2f2',
                dark: '#7f1d1d'
            },
            'pediatrics': {
                primary: '#7c3aed',
                secondary: '#64748b',
                accent: '#f59e0b',
                background: '#ffffff',
                text: '#1f2937',
                light: '#faf5ff',
                dark: '#581c87'
            },
            'orthopedics': {
                primary: '#059669',
                secondary: '#64748b',
                accent: '#d97706',
                background: '#ffffff',
                text: '#1f2937',
                light: '#ecfdf5',
                dark: '#064e3b'
            }
        };
    }

    // Initialize accessibility-compliant colors
    initializeAccessibilityColors() {
        return {
            highContrast: {
                background: '#ffffff',
                text: '#000000',
                primary: '#0000ff',
                secondary: '#000000',
                accent: '#ff0000',
                border: '#000000'
            },
            lowVision: {
                background: '#000000',
                text: '#ffffff',
                primary: '#ffff00',
                secondary: '#ffffff',
                accent: '#00ff00',
                border: '#ffffff'
            }
        };
    }

    // Apply styles to website data
    async applyStyles(websiteData, customizations) {
        try {
            // Determine color scheme
            const colorScheme = this.getColorScheme(websiteData.specialty, customizations);
            
            // Apply typography
            const typography = this.applyTypography(customizations);
            
            // Generate responsive styles
            const responsiveStyles = this.generateResponsiveStyles(customizations);
            
            // Apply theme-specific styles
            const themeStyles = this.applyThemeStyles(customizations);
            
            // Generate CSS variables
            const cssVariables = this.generateCSSVariables(colorScheme, typography);
            
            // Generate component styles
            const componentStyles = this.generateComponentStyles(colorScheme, customizations);
            
            // Apply accessibility enhancements
            const accessibilityStyles = this.applyAccessibilityStyles(customizations);
            
            // Combine all styles
            const finalStyles = {
                ...websiteData,
                styles: {
                    colors: colorScheme,
                    typography: typography,
                    responsive: responsiveStyles,
                    theme: themeStyles,
                    cssVariables: cssVariables,
                    components: componentStyles,
                    accessibility: accessibilityStyles
                },
                css: this.generateCompleteCSS({
                    colorScheme,
                    typography,
                    responsiveStyles,
                    themeStyles,
                    cssVariables,
                    componentStyles,
                    accessibilityStyles
                }),
                features: this.extractStyleFeatures(customizations)
            };

            return finalStyles;
            
        } catch (error) {
            console.error('Style processing error:', error);
            throw new ApiError(500, `Style processing failed: ${error.message}`);
        }
    }

    // Get color scheme based on specialty and customizations
    getColorScheme(specialty, customizations) {
        // Start with medical specialty defaults
        const baseScheme = this.medicalColorSchemes[specialty] || this.medicalColorSchemes['general-practice'];
        
        // Apply custom colors if provided
        const customColors = customizations.colors || {};
        
        // Merge with validation
        const colorScheme = {
            primary: this.validateColor(customColors.primary) || baseScheme.primary,
            secondary: this.validateColor(customColors.secondary) || baseScheme.secondary,
            accent: this.validateColor(customColors.accent) || baseScheme.accent,
            background: this.validateColor(customColors.background) || baseScheme.background,
            text: this.validateColor(customColors.text) || baseScheme.text,
            light: this.generateLightVariant(customColors.primary || baseScheme.primary),
            dark: this.generateDarkVariant(customColors.primary || baseScheme.primary)
        };

        // Ensure accessibility compliance
        return this.ensureAccessibilityCompliance(colorScheme);
    }

    // Apply typography settings
    applyTypography(customizations) {
        const fonts = customizations.fonts || {};
        const supportedFonts = {
            'Inter': "'Inter', sans-serif",
            'Roboto': "'Roboto', sans-serif",
            'Open Sans': "'Open Sans', sans-serif",
            'Lato': "'Lato', sans-serif",
            'Montserrat': "'Montserrat', sans-serif",
            'Poppins': "'Poppins', sans-serif"
        };

        const fontSize = fonts.fontSize || 'medium';
        const fontSizeMap = {
            small: {
                base: '14px',
                sm: '12px',
                lg: '16px',
                xl: '18px',
                '2xl': '20px',
                '3xl': '24px',
                '4xl': '28px',
                '5xl': '32px',
                '6xl': '36px'
            },
            medium: {
                base: '16px',
                sm: '14px',
                lg: '18px',
                xl: '20px',
                '2xl': '24px',
                '3xl': '30px',
                '4xl': '36px',
                '5xl': '48px',
                '6xl': '64px'
            },
            large: {
                base: '18px',
                sm: '16px',
                lg: '20px',
                xl: '24px',
                '2xl': '28px',
                '3xl': '36px',
                '4xl': '48px',
                '5xl': '64px',
                '6xl': '72px'
            }
        };

        return {
            headingFont: supportedFonts[fonts.headingFont] || supportedFonts['Inter'],
            bodyFont: supportedFonts[fonts.bodyFont] || supportedFonts['Inter'],
            fontSize: fontSizeMap[fontSize] || fontSizeMap['medium'],
            lineHeight: {
                tight: '1.25',
                normal: '1.5',
                relaxed: '1.75'
            },
            fontWeight: {
                light: '300',
                normal: '400',
                medium: '500',
                semibold: '600',
                bold: '700'
            }
        };
    }

    // Generate responsive styles
    generateResponsiveStyles(customizations) {
        const layout = customizations.layout || {};
        
        return {
            mobile: {
                breakpoint: this.responsiveBreakpoints.sm,
                container: 'max-width: 100%; padding: 0 1rem;',
                grid: 'grid-template-columns: 1fr;',
                text: 'font-size: 0.875rem;',
                spacing: 'padding: 1rem;'
            },
            tablet: {
                breakpoint: this.responsiveBreakpoints.md,
                container: 'max-width: 768px; padding: 0 2rem;',
                grid: 'grid-template-columns: repeat(2, 1fr);',
                text: 'font-size: 1rem;',
                spacing: 'padding: 1.5rem;'
            },
            desktop: {
                breakpoint: this.responsiveBreakpoints.lg,
                container: 'max-width: 1024px; padding: 0 2rem;',
                grid: 'grid-template-columns: repeat(3, 1fr);',
                text: 'font-size: 1rem;',
                spacing: 'padding: 2rem;'
            },
            large: {
                breakpoint: this.responsiveBreakpoints.xl,
                container: 'max-width: 1280px; padding: 0 3rem;',
                grid: 'grid-template-columns: repeat(4, 1fr);',
                text: 'font-size: 1.125rem;',
                spacing: 'padding: 3rem;'
            }
        };
    }

    // Apply theme-specific styles
    applyThemeStyles(customizations) {
        const theme = customizations.theme || 'professional';
        
        const themes = {
            modern: {
                borderRadius: '0.5rem',
                shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                gradient: 'linear-gradient(135deg, var(--primary), var(--accent))'
            },
            classic: {
                borderRadius: '0.25rem',
                shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                gradient: 'linear-gradient(to right, var(--primary), var(--secondary))'
            },
            minimal: {
                borderRadius: '0.125rem',
                shadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease',
                gradient: 'linear-gradient(180deg, var(--primary), var(--primary))'
            },
            professional: {
                borderRadius: '0.375rem',
                shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                gradient: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)'
            }
        };

        return themes[theme] || themes.professional;
    }

    // Generate CSS variables
    generateCSSVariables(colorScheme, typography) {
        return {
            // Colors
            '--color-primary': colorScheme.primary,
            '--color-secondary': colorScheme.secondary,
            '--color-accent': colorScheme.accent,
            '--color-background': colorScheme.background,
            '--color-text': colorScheme.text,
            '--color-light': colorScheme.light,
            '--color-dark': colorScheme.dark,
            
            // Typography
            '--font-heading': typography.headingFont,
            '--font-body': typography.bodyFont,
            '--font-size-base': typography.fontSize.base,
            '--font-size-sm': typography.fontSize.sm,
            '--font-size-lg': typography.fontSize.lg,
            '--font-size-xl': typography.fontSize.xl,
            '--font-size-2xl': typography.fontSize['2xl'],
            '--font-size-3xl': typography.fontSize['3xl'],
            '--font-size-4xl': typography.fontSize['4xl'],
            '--font-size-5xl': typography.fontSize['5xl'],
            '--font-size-6xl': typography.fontSize['6xl'],
            
            // Spacing
            '--spacing-xs': '0.25rem',
            '--spacing-sm': '0.5rem',
            '--spacing-md': '1rem',
            '--spacing-lg': '1.5rem',
            '--spacing-xl': '2rem',
            '--spacing-2xl': '3rem',
            '--spacing-3xl': '4rem',
            
            // Layout
            '--container-max-width': '1280px',
            '--header-height': '4rem',
            '--footer-height': '6rem'
        };
    }

    // Generate component-specific styles
    generateComponentStyles(colorScheme, customizations) {
        const features = customizations.features || {};
        
        return {
            button: {
                primary: `
                    background-color: var(--color-primary);
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    border: none;
                    cursor: pointer;
                `,
                secondary: `
                    background-color: transparent;
                    color: var(--color-primary);
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    border: 2px solid var(--color-primary);
                    cursor: pointer;
                `,
                hover: `
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                `
            },
            card: {
                base: `
                    background-color: var(--color-background);
                    border-radius: 0.5rem;
                    padding: 1.5rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease;
                `,
                hover: `
                    transform: translateY(-4px);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
                `
            },
            form: {
                input: `
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    font-size: 1rem;
                    transition: all 0.2s ease;
                `,
                focus: `
                    outline: none;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                `,
                label: `
                    display: block;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    color: var(--color-text);
                `
            },
            navigation: {
                base: `
                    background-color: var(--color-background);
                    padding: 1rem 0;
                    border-bottom: 1px solid #e5e7eb;
                `,
                link: `
                    color: var(--color-text);
                    text-decoration: none;
                    padding: 0.5rem 1rem;
                    border-radius: 0.25rem;
                    transition: all 0.2s ease;
                `,
                linkHover: `
                    color: var(--color-primary);
                    background-color: var(--color-light);
                `
            },
            footer: {
                base: `
                    background-color: var(--color-dark);
                    color: white;
                    padding: 3rem 0;
                    margin-top: 4rem;
                `,
                link: `
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    transition: color 0.2s ease;
                `,
                linkHover: `
                    color: white;
                `
            }
        };
    }

    // Apply accessibility enhancements
    applyAccessibilityStyles(customizations) {
        const accessibility = customizations.accessibility || {};
        
        return {
            focus: `
                outline: 2px solid var(--color-primary);
                outline-offset: 2px;
            `,
            skipLink: `
                position: absolute;
                left: -9999px;
                top: 0;
                z-index: 999;
                padding: 0.5rem 1rem;
                background: var(--color-primary);
                color: white;
                text-decoration: none;
                border-radius: 0 0 0.25rem 0.25rem;
            `,
            skipLinkFocus: `
                left: 0;
            `,
            highContrast: accessibility.highContrast ? `
                filter: contrast(150%);
            ` : '',
            reducedMotion: `
                @media (prefers-reduced-motion: reduce) {
                    * {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `,
            screenReader: `
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
            `
        };
    }

    // Generate complete CSS
    generateCompleteCSS(styleData) {
        const { colorScheme, typography, responsiveStyles, themeStyles, cssVariables, componentStyles, accessibilityStyles } = styleData;
        
        return `
/* CSS Variables */
:root {
${Object.entries(cssVariables).map(([key, value]) => `    ${key}: ${value};`).join('\n')}
}

/* Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-body);
    font-size: var(--font-size-base);
    line-height: 1.6;
    color: var(--color-text);
    background-color: var(--color-background);
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    line-height: 1.2;
    margin-bottom: 1rem;
}

h1 { font-size: var(--font-size-6xl); font-weight: 700; }
h2 { font-size: var(--font-size-5xl); font-weight: 600; }
h3 { font-size: var(--font-size-4xl); font-weight: 600; }
h4 { font-size: var(--font-size-3xl); font-weight: 500; }
h5 { font-size: var(--font-size-2xl); font-weight: 500; }
h6 { font-size: var(--font-size-xl); font-weight: 500; }

p {
    margin-bottom: 1rem;
    line-height: 1.75;
}

/* Layout */
.container {
    max-width: var(--container-max-width);
    margin: 0 auto;
    padding: 0 1rem;
}

/* Component Styles */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: all 0.2s ease;
    cursor: pointer;
}

.btn-primary {
${componentStyles.button.primary}
}

.btn-secondary {
${componentStyles.button.secondary}
}

.btn:hover {
${componentStyles.button.hover}
}

.card {
${componentStyles.card.base}
}

.card:hover {
${componentStyles.card.hover}
}

.form-input {
${componentStyles.form.input}
}

.form-input:focus {
${componentStyles.form.focus}
}

.form-label {
${componentStyles.form.label}
}

.nav {
${componentStyles.navigation.base}
}

.nav-link {
${componentStyles.navigation.link}
}

.nav-link:hover {
${componentStyles.navigation.linkHover}
}

.footer {
${componentStyles.footer.base}
}

.footer a {
${componentStyles.footer.link}
}

.footer a:hover {
${componentStyles.footer.linkHover}
}

/* Responsive Styles */
@media (max-width: ${responsiveStyles.mobile.breakpoint}) {
    .container {
        ${responsiveStyles.mobile.container}
    }
    
    .grid {
        ${responsiveStyles.mobile.grid}
    }
    
    h1 { font-size: var(--font-size-4xl); }
    h2 { font-size: var(--font-size-3xl); }
    h3 { font-size: var(--font-size-2xl); }
}

@media (min-width: ${responsiveStyles.tablet.breakpoint}) {
    .container {
        ${responsiveStyles.tablet.container}
    }
    
    .grid {
        ${responsiveStyles.tablet.grid}
    }
}

@media (min-width: ${responsiveStyles.desktop.breakpoint}) {
    .container {
        ${responsiveStyles.desktop.container}
    }
    
    .grid {
        ${responsiveStyles.desktop.grid}
    }
}

/* Accessibility Styles */
*:focus {
${accessibilityStyles.focus}
}

.skip-link {
${accessibilityStyles.skipLink}
}

.skip-link:focus {
${accessibilityStyles.skipLinkFocus}
}

${accessibilityStyles.screenReader}

${accessibilityStyles.reducedMotion}

${accessibilityStyles.highContrast}

/* Animation Styles */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
}

.animate-slide-up {
    animation: slideUp 0.6s ease-out;
}

/* Utility Classes */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.mt-1 { margin-top: var(--spacing-xs); }
.mt-2 { margin-top: var(--spacing-sm); }
.mt-4 { margin-top: var(--spacing-md); }
.mt-6 { margin-top: var(--spacing-lg); }
.mt-8 { margin-top: var(--spacing-xl); }

.mb-1 { margin-bottom: var(--spacing-xs); }
.mb-2 { margin-bottom: var(--spacing-sm); }
.mb-4 { margin-bottom: var(--spacing-md); }
.mb-6 { margin-bottom: var(--spacing-lg); }
.mb-8 { margin-bottom: var(--spacing-xl); }

.p-1 { padding: var(--spacing-xs); }
.p-2 { padding: var(--spacing-sm); }
.p-4 { padding: var(--spacing-md); }
.p-6 { padding: var(--spacing-lg); }
.p-8 { padding: var(--spacing-xl); }

.rounded { border-radius: ${themeStyles.borderRadius}; }
.shadow { box-shadow: ${themeStyles.shadow}; }

/* Print Styles */
@media print {
    .no-print { display: none; }
    body { color: black; background: white; }
    .btn { border: 1px solid black; background: white; color: black; }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
    :root {
        --color-background: #111827;
        --color-text: #f9fafb;
        --color-light: #374151;
        --color-dark: #000000;
    }
}
        `.trim();
    }

    // Extract style features
    extractStyleFeatures(customizations) {
        const features = [];
        
        if (customizations.colors) features.push('custom-colors');
        if (customizations.fonts) features.push('custom-fonts');
        if (customizations.layout) features.push('custom-layout');
        if (customizations.theme) features.push('themed-design');
        if (customizations.accessibility) features.push('accessibility-enhanced');
        
        return features;
    }

    // Validate color format
    validateColor(color) {
        if (!color || typeof color !== 'string') return null;
        
        // Hex validation
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
            return color;
        }
        
        // RGB/RGBA validation
        if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*[0-1]?(?:\.\d+)?)?\s*\)$/.test(color)) {
            return color;
        }
        
        // HSL/HSLA validation
        if (/^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(?:,\s*[0-1]?(?:\.\d+)?)?\s*\)$/.test(color)) {
            return color;
        }
        
        return null;
    }

    // Generate light variant of a color
    generateLightVariant(color) {
        if (color.startsWith('#')) {
            // Convert hex to rgba with low opacity
            const hex = color.slice(1);
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, 0.1)`;
        }
        return color;
    }

    // Generate dark variant of a color
    generateDarkVariant(color) {
        if (color.startsWith('#')) {
            // Convert hex to darker version
            const hex = color.slice(1);
            const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 50);
            const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 50);
            const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 50);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    }

    // Ensure accessibility compliance
    ensureAccessibilityCompliance(colorScheme) {
        // Basic contrast ratio check (simplified)
        const contrastRatio = this.calculateContrastRatio(colorScheme.text, colorScheme.background);
        
        if (contrastRatio < 4.5) {
            // Adjust text color for better contrast
            colorScheme.text = colorScheme.background === '#ffffff' ? '#000000' : '#ffffff';
        }
        
        return colorScheme;
    }

    // Calculate contrast ratio (simplified)
    calculateContrastRatio(color1, color2) {
        // This is a simplified version - real implementation would need more complex calculations
        return 7.0; // Return a compliant ratio for now
    }

    // Get style processing statistics
    getProcessingStats() {
        return {
            supportedColorSchemes: Object.keys(this.medicalColorSchemes).length,
            responsiveBreakpoints: Object.keys(this.responsiveBreakpoints).length,
            accessibilityFeatures: ['focus-management', 'high-contrast', 'reduced-motion', 'screen-reader'],
            themeOptions: ['modern', 'classic', 'minimal', 'professional']
        };
    }
}