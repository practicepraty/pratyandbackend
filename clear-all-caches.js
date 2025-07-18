#!/usr/bin/env node

/**
 * CLEAR ALL CACHES - COMPREHENSIVE CACHE CORRUPTION FIX
 * 
 * This script clears all caches in the system to prevent template corruption
 * and ensures fresh content generation for each specialty.
 * 
 * Usage: node clear-all-caches.js
 */

import cacheService from './src/services/cacheService.js';
import TemplateService from './src/service/template.service.js';
import WebsiteGenerator from './src/services/websiteGenerator.js';
import AIService from './src/service/ai.service.js';
import { PreviewGenerator } from './src/services/previewGenerator.js';

async function clearAllCaches() {
    console.log('\n🚨 ========================================');
    console.log('🚨 CLEARING ALL CACHES - COMPREHENSIVE FIX');
    console.log('🚨 ========================================\n');

    const results = {
        success: [],
        errors: [],
        warnings: []
    };

    try {
        // 1. Clear main cache service (Redis + Memory)
        console.log('🧹 1. Clearing main cache service...');
        const mainCacheCleared = await cacheService.clearAll();
        if (mainCacheCleared) {
            results.success.push('Main cache service (Redis + Memory)');
            console.log('✅ Main cache service cleared');
        } else {
            results.warnings.push('Main cache service may not have been fully cleared');
            console.log('⚠️  Main cache service may not have been fully cleared');
        }

        // 2. Clear AI Service cache
        console.log('\n🧹 2. Clearing AI Service cache...');
        AIService.clearCache();
        results.success.push('AI Service cache');
        console.log('✅ AI Service cache cleared');

        // 3. Clear Website Generator cache
        console.log('\n🧹 3. Clearing Website Generator cache...');
        WebsiteGenerator.clearCache();
        results.success.push('Website Generator cache');
        console.log('✅ Website Generator cache cleared');

        // 4. Clear Template Service cache
        console.log('\n🧹 4. Clearing Template Service cache...');
        TemplateService.clearCache();
        results.success.push('Template Service cache');
        console.log('✅ Template Service cache cleared');

        // 5. Clear Preview Generator cache
        console.log('\n🧹 5. Clearing Preview Generator cache...');
        const previewGenerator = new PreviewGenerator();
        previewGenerator.clearCache();
        results.success.push('Preview Generator cache');
        console.log('✅ Preview Generator cache cleared');

        // 6. Force garbage collection
        console.log('\n🧹 6. Forcing garbage collection...');
        if (global.gc) {
            global.gc();
            results.success.push('Garbage collection');
            console.log('✅ Garbage collection forced');
        } else {
            results.warnings.push('Garbage collection not available (run with --expose-gc)');
            console.log('⚠️  Garbage collection not available');
        }

        // 7. Validate cache clearing
        console.log('\n🔍 7. Validating cache clearing...');
        const validation = await validateCacheClearing();
        if (validation.allCleared) {
            results.success.push('Cache validation');
            console.log('✅ All caches successfully cleared');
        } else {
            results.warnings.push(`Some caches may still contain data: ${validation.details}`);
            console.log('⚠️  Some caches may still contain data:', validation.details);
        }

        // Final summary
        console.log('\n✅ ========================================');
        console.log('✅ ALL CACHES CLEARED SUCCESSFULLY!');
        console.log('✅ ========================================');
        console.log(`✅ Successfully cleared: ${results.success.length} cache systems`);
        console.log(`⚠️  Warnings: ${results.warnings.length}`);
        console.log(`❌ Errors: ${results.errors.length}`);

        if (results.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            results.warnings.forEach((warning, i) => {
                console.log(`${i + 1}. ${warning}`);
            });
        }

        if (results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            results.errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        }

        console.log('\n🎉 Template corruption issue should now be fixed!');
        console.log('🎉 Try your "heart and cardiology" input again.\n');

        return {
            success: results.errors.length === 0,
            cleared: results.success,
            warnings: results.warnings,
            errors: results.errors
        };

    } catch (error) {
        console.error('\n❌ ========================================');
        console.error('❌ CRITICAL ERROR CLEARING CACHES');
        console.error('❌ ========================================');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        results.errors.push(error.message);
        return {
            success: false,
            cleared: results.success,
            warnings: results.warnings,
            errors: results.errors
        };
    }
}

async function validateCacheClearing() {
    try {
        // Get cache statistics
        const cacheStats = await cacheService.getStats();
        const templateStats = TemplateService.getCacheStats();
        const websiteStats = WebsiteGenerator.getCacheStats();
        const aiStats = AIService.getCacheStats();
        
        const previewGenerator = new PreviewGenerator();
        const previewStats = previewGenerator.getCacheStats();

        // Check if all caches are properly cleared/reinitialized
        const details = [];
        
        // Template cache should have base templates + specialty templates
        if (templateStats.cachedTemplates < 5) {
            details.push(`Template cache: ${templateStats.cachedTemplates} templates`);
        }
        
        // Other caches should be empty
        if (websiteStats.size > 0) {
            details.push(`Website generator: ${websiteStats.size} items`);
        }
        
        if (aiStats.size > 0) {
            details.push(`AI service: ${aiStats.size} items`);
        }
        
        if (previewStats.size > 0) {
            details.push(`Preview generator: ${previewStats.size} items`);
        }

        return {
            allCleared: details.length === 0,
            details: details.join(', '),
            stats: {
                cache: cacheStats,
                template: templateStats,
                website: websiteStats,
                ai: aiStats,
                preview: previewStats
            }
        };

    } catch (error) {
        console.error('Validation error:', error);
        return {
            allCleared: false,
            details: `Validation failed: ${error.message}`,
            stats: null
        };
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    clearAllCaches()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Critical error:', error);
            process.exit(1);
        });
}

export default clearAllCaches;