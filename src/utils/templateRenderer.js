// src/utils/templateRenderer.js
import { ApiError } from "./apierror.js";

export class TemplateRenderer {
    constructor() {
        this.cache = new Map();
        this.compiledTemplates = new Map();
    }

    // Render template with data
    render(template, data) {
        if (!template || typeof template !== 'string') {
            throw new ApiError(400, 'Template is required and must be a string');
        }

        if (!data || typeof data !== 'object') {
            throw new ApiError(400, 'Data is required and must be an object');
        }

        try {
            // Check if template is already compiled
            const cacheKey = this.generateCacheKey(template);
            let compiledTemplate = this.compiledTemplates.get(cacheKey);

            if (!compiledTemplate) {
                compiledTemplate = this.compileTemplate(template);
                this.compiledTemplates.set(cacheKey, compiledTemplate);
            }

            // Render the compiled template with data
            return this.executeTemplate(compiledTemplate, data);

        } catch (error) {
            console.error('Template rendering error:', error);
            throw new ApiError(500, `Template rendering failed: ${error.message}`);
        }
    }

    // Compile template to executable function
    compileTemplate(template) {
        // Handle variable substitution {{variable}}
        let compiled = template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
            const cleanVar = variable.trim();
            return `' + this.getValue(data, '${cleanVar}') + '`;
        });

        // Handle conditional blocks {{#if condition}}...{{/if}}
        compiled = compiled.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            const cleanCondition = condition.trim();
            return `' + (this.getValue(data, '${cleanCondition}') ? '${content.replace(/'/g, "\\'")}' : '') + '`;
        });

        // Handle loops {{#each array}}...{{/each}}
        compiled = compiled.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayPath, content) => {
            const cleanPath = arrayPath.trim();
            return `' + this.renderLoop(data, '${cleanPath}', '${content.replace(/'/g, "\\'")}') + '`;
        });

        // Handle partials {{> partial}}
        compiled = compiled.replace(/\{\{>\s*([^}]+)\}\}/g, (match, partialName) => {
            const cleanPartial = partialName.trim();
            return `' + this.renderPartial('${cleanPartial}', data) + '`;
        });

        // Create executable function
        const functionBody = `return '${compiled}';`;
        
        return {
            execute: new Function('data', functionBody),
            original: template
        };
    }

    // Execute compiled template
    executeTemplate(compiledTemplate, data) {
        try {
            return compiledTemplate.execute.call(this, data);
        } catch (error) {
            console.error('Template execution error:', error);
            throw new ApiError(500, `Template execution failed: ${error.message}`);
        }
    }

    // Get nested value from object using dot notation
    getValue(obj, path) {
        if (!path) return '';
        
        try {
            return path.split('.').reduce((current, key) => {
                if (current === null || current === undefined) return '';
                return current[key];
            }, obj) || '';
        } catch (error) {
            return '';
        }
    }

    // Render loop content
    renderLoop(data, arrayPath, content) {
        try {
            const array = this.getValue(data, arrayPath);
            
            if (!Array.isArray(array)) {
                return '';
            }

            return array.map((item, index) => {
                const loopData = {
                    ...data,
                    ...item,
                    this: item,
                    index: index,
                    first: index === 0,
                    last: index === array.length - 1
                };

                return this.render(content, loopData);
            }).join('');
        } catch (error) {
            console.error('Loop rendering error:', error);
            return '';
        }
    }

    // Render partial template
    renderPartial(partialName, data) {
        try {
            // In a real implementation, this would load the partial from a file or cache
            // For now, return empty string
            return '';
        } catch (error) {
            console.error('Partial rendering error:', error);
            return '';
        }
    }

    // Generate cache key for template
    generateCacheKey(template) {
        return Buffer.from(template).toString('base64').slice(0, 32);
    }

    // Helper methods for template functions
    helpers = {
        // Format date
        formatDate: (date, format = 'short') => {
            if (!date) return '';
            
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            
            switch (format) {
                case 'short':
                    return d.toLocaleDateString();
                case 'long':
                    return d.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                case 'iso':
                    return d.toISOString();
                default:
                    return d.toLocaleDateString();
            }
        },

        // Format phone number
        formatPhone: (phone) => {
            if (!phone) return '';
            
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.length === 10) {
                return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
            }
            return phone;
        },

        // Truncate text
        truncate: (text, length = 100) => {
            if (!text || typeof text !== 'string') return '';
            
            if (text.length <= length) return text;
            return text.slice(0, length) + '...';
        },

        // Capitalize first letter
        capitalize: (text) => {
            if (!text || typeof text !== 'string') return '';
            return text.charAt(0).toUpperCase() + text.slice(1);
        },

        // Convert to slug
        slugify: (text) => {
            if (!text || typeof text !== 'string') return '';
            
            return text
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
        },

        // Pluralize word
        pluralize: (count, singular, plural = null) => {
            if (count === 1) return singular;
            return plural || (singular + 's');
        },

        // Format currency
        formatCurrency: (amount, currency = 'USD') => {
            if (typeof amount !== 'number') return '';
            
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(amount);
        },

        // Generate excerpt
        excerpt: (text, length = 150) => {
            if (!text || typeof text !== 'string') return '';
            
            if (text.length <= length) return text;
            
            const truncated = text.slice(0, length);
            const lastSpace = truncated.lastIndexOf(' ');
            
            return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
        }
    };

    // Register helper function
    registerHelper(name, fn) {
        if (typeof fn !== 'function') {
            throw new ApiError(400, 'Helper must be a function');
        }
        
        this.helpers[name] = fn;
    }

    // Get helper function
    getHelper(name) {
        return this.helpers[name];
    }

    // Clear template cache
    clearCache() {
        this.cache.clear();
        this.compiledTemplates.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cacheSize: this.cache.size,
            compiledTemplatesSize: this.compiledTemplates.size,
            helpers: Object.keys(this.helpers).length
        };
    }
}

// Export singleton instance
export default new TemplateRenderer();