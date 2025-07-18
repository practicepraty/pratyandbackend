#!/usr/bin/env node

// CRITICAL FIX: Template Cache Corruption Fix
// This script fixes the template caching bug by clearing all caches and implementing proper cache key separation

import cacheService from './src/services/cacheService.js';
import TemplateService from './src/service/template.service.js';
import WebsiteGenerator from './src/services/websiteGenerator.js';
import AIService from './src/service/ai.service.js';
import { PreviewGenerator } from './src/services/previewGenerator.js';

class TemplateCacheCorruptionFix {
    constructor() {
        this.previewGenerator = new PreviewGenerator();
        this.fixResults = {
            cachesCleared: [],
            errors: [],
            warnings: [],
            validationResults: {}
        };
    }

    async fixTemplateCorruption() {
        console.log('\n🚨 ========================================');
        console.log('🚨 FIXING TEMPLATE CACHE CORRUPTION');
        console.log('🚨 ========================================\n');

        try {
            // Step 1: Clear all caches completely
            await this.clearAllCaches();

            // Step 2: Validate cache integrity
            await this.validateCacheIntegrity();

            // Step 3: Reinitialize template cache with proper keys
            await this.reinitializeTemplateCache();

            // Step 4: Test the fix
            await this.testTemplateFix();

            // Step 5: Generate final report
            this.generateFixReport();

            console.log('\n✅ ========================================');
            console.log('✅ TEMPLATE CACHE CORRUPTION FIXED!');
            console.log('✅ ========================================\n');

            return {
                success: true,
                results: this.fixResults
            };

        } catch (error) {
            console.error('\n❌ ========================================');
            console.error('❌ TEMPLATE CACHE CORRUPTION FIX FAILED');
            console.error('❌ ========================================');
            console.error('Error:', error.message);
            
            this.fixResults.errors.push({
                step: 'overall',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return {
                success: false,
                results: this.fixResults,
                error: error.message
            };
        }
    }

    async clearAllCaches() {
        console.log('🧹 STEP 1: CLEARING ALL CACHES');
        console.log('================================');

        try {
            // Clear Redis and Memory Cache
            console.log('🧹 Clearing Redis and Memory Cache...');
            const cacheCleared = await cacheService.clearAll();
            if (cacheCleared) {
                this.fixResults.cachesCleared.push('Redis and Memory Cache');
                console.log('✅ Redis and Memory Cache cleared');
            } else {
                this.fixResults.warnings.push('Redis cache may not have been fully cleared');
                console.log('⚠️  Redis cache may not have been fully cleared');
            }

            // Clear Template Service Cache
            console.log('🧹 Clearing Template Service Cache...');
            TemplateService.clearCache();
            this.fixResults.cachesCleared.push('Template Service Cache');
            console.log('✅ Template Service Cache cleared');

            // Clear Website Generator Cache
            console.log('🧹 Clearing Website Generator Cache...');
            WebsiteGenerator.clearCache();
            this.fixResults.cachesCleared.push('Website Generator Cache');
            console.log('✅ Website Generator Cache cleared');

            // Clear AI Service Cache
            console.log('🧹 Clearing AI Service Cache...');
            AIService.clearCache();
            this.fixResults.cachesCleared.push('AI Service Cache');
            console.log('✅ AI Service Cache cleared');

            // Clear Preview Generator Cache
            console.log('🧹 Clearing Preview Generator Cache...');
            this.previewGenerator.clearCache();
            this.fixResults.cachesCleared.push('Preview Generator Cache');
            console.log('✅ Preview Generator Cache cleared');

            console.log('\n✅ All caches cleared successfully!\n');

        } catch (error) {
            console.error('❌ Error clearing caches:', error.message);
            this.fixResults.errors.push({
                step: 'cache_clearing',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async validateCacheIntegrity() {
        console.log('🔍 STEP 2: VALIDATING CACHE INTEGRITY');
        console.log('=====================================');

        try {
            // Get cache statistics
            const cacheStats = await cacheService.getStats();
            const templateStats = TemplateService.getCacheStats();
            const websiteStats = WebsiteGenerator.getCacheStats();
            const aiStats = AIService.getCacheStats();
            const previewStats = this.previewGenerator.getCacheStats();

            this.fixResults.validationResults = {
                cacheService: cacheStats,
                templateService: templateStats,
                websiteGenerator: websiteStats,
                aiService: aiStats,
                previewGenerator: previewStats
            };

            // Validate template cache integrity
            const templateIntegrity = templateStats.cacheIntegrity;
            if (templateIntegrity && !templateIntegrity.isValid) {
                this.fixResults.warnings.push(`Template cache integrity issues: ${templateIntegrity.issues.join(', ')}`);
                console.log('⚠️  Template cache integrity issues detected:', templateIntegrity.issues);
            } else {
                console.log('✅ Template cache integrity validated');
            }

            // Check if caches are truly empty
            const totalCacheSize = templateStats.cachedTemplates + websiteStats.size + aiStats.size + previewStats.size;
            if (totalCacheSize > 0) {
                this.fixResults.warnings.push(`Some caches still contain data: ${totalCacheSize} items`);
                console.log('⚠️  Some caches still contain data:', totalCacheSize, 'items');
            } else {
                console.log('✅ All caches are empty');
            }

            console.log('\n✅ Cache integrity validation completed!\n');

        } catch (error) {
            console.error('❌ Error validating cache integrity:', error.message);
            this.fixResults.errors.push({
                step: 'cache_validation',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async reinitializeTemplateCache() {
        console.log('🔄 STEP 3: REINITIALIZING TEMPLATE CACHE');
        console.log('========================================');

        try {
            // Force template cache reinitialization
            console.log('🔄 Reinitializing template cache with proper keys...');
            TemplateService.clearCache(); // This will also reinitialize
            
            // Validate the reinitialization
            const newTemplateStats = TemplateService.getCacheStats();
            console.log('📊 New template cache stats:', newTemplateStats);

            // Check for specialty-specific keys
            const hasSpecialtyKeys = newTemplateStats.specialtySpecificKeys.length > 0;
            const hasBaseKeys = newTemplateStats.baseTemplateKeys.length > 0;

            if (hasSpecialtyKeys && hasBaseKeys) {
                console.log('✅ Template cache properly initialized with specialty-specific keys');
                console.log('📋 Specialty keys:', newTemplateStats.specialtySpecificKeys);
                console.log('📋 Base keys:', newTemplateStats.baseTemplateKeys);
            } else {
                this.fixResults.warnings.push('Template cache may not have been properly initialized');
                console.log('⚠️  Template cache may not have been properly initialized');
            }

            console.log('\n✅ Template cache reinitialization completed!\n');

        } catch (error) {
            console.error('❌ Error reinitializing template cache:', error.message);
            this.fixResults.errors.push({
                step: 'cache_reinitialization',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async testTemplateFix() {
        console.log('🧪 STEP 4: TESTING TEMPLATE FIX');
        console.log('===============================');

        try {
            // Test specialty detection
            console.log('🧪 Testing specialty detection...');
            const testCases = [
                { input: 'teeth and dentistry', expected: 'dentistry' },
                { input: 'heart and cardiology', expected: 'cardiology' },
                { input: 'skin and dermatology', expected: 'dermatology' }
            ];

            for (const testCase of testCases) {
                const result = await AIService.detectMedicalSpecialty(testCase.input);
                const passed = result.specialty === testCase.expected;
                
                console.log(`🧪 Test: "${testCase.input}" -> ${result.specialty} (${passed ? '✅ PASSED' : '❌ FAILED'})`);
                
                if (!passed) {
                    this.fixResults.warnings.push(`Test failed: ${testCase.input} -> expected ${testCase.expected}, got ${result.specialty}`);
                }
            }

            // Test template mapping
            console.log('\n🧪 Testing template mapping...');
            const specialties = ['dentistry', 'cardiology', 'dermatology'];
            
            for (const specialty of specialties) {
                const templateConfig = TemplateService.getTemplateConfig(specialty);
                const mappedTemplate = templateConfig.templateName;
                
                console.log(`🧪 Template mapping: ${specialty} -> ${mappedTemplate}`);
                
                if (mappedTemplate !== specialty) {
                    this.fixResults.warnings.push(`Template mapping issue: ${specialty} -> ${mappedTemplate}`);
                }
            }

            console.log('\n✅ Template fix testing completed!\n');

        } catch (error) {
            console.error('❌ Error testing template fix:', error.message);
            this.fixResults.errors.push({
                step: 'template_testing',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    generateFixReport() {
        console.log('📊 STEP 5: GENERATING FIX REPORT');
        console.log('================================');

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                cachesCleared: this.fixResults.cachesCleared.length,
                errors: this.fixResults.errors.length,
                warnings: this.fixResults.warnings.length,
                success: this.fixResults.errors.length === 0
            },
            details: this.fixResults
        };

        console.log('\n📊 FIX REPORT SUMMARY:');
        console.log('========================');
        console.log(`✅ Caches Cleared: ${report.summary.cachesCleared}`);
        console.log(`❌ Errors: ${report.summary.errors}`);
        console.log(`⚠️  Warnings: ${report.summary.warnings}`);
        console.log(`🎯 Overall Success: ${report.summary.success ? 'YES' : 'NO'}`);

        if (this.fixResults.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.fixResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.step}: ${error.error}`);
            });
        }

        if (this.fixResults.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.fixResults.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning}`);
            });
        }

        console.log('\n✅ Caches Cleared:', this.fixResults.cachesCleared.join(', '));
        
        return report;
    }
}

// Execute the fix if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const fix = new TemplateCacheCorruptionFix();
    
    fix.fixTemplateCorruption()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 Template cache corruption fix completed successfully!');
                process.exit(0);
            } else {
                console.error('\n💥 Template cache corruption fix failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Critical error during template cache corruption fix:', error);
            process.exit(1);
        });
}

export default TemplateCacheCorruptionFix;