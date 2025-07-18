// Simple test server to verify basic functionality
import express from 'express';
import loggingService from './src/services/loggingService.js';

const app = express();
app.use(express.json());

// Simple health endpoint
app.get('/health', (req, res) => {
    console.log('✅ Health endpoint accessed');
    loggingService.logAppEvent('info', 'Health endpoint accessed');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Simple website generation endpoint
app.post('/api/v1/website-generation/generate', (req, res) => {
    console.log('🎉 Website generation endpoint accessed');
    console.log('Request body:', req.body);
    
    loggingService.logWebsiteGenerationSuccess(
        'Simple test website generation',
        {
            specialty: req.body.specialty,
            contentLength: req.body.transcribedContent?.length || 0,
            timestamp: new Date().toISOString()
        }
    );
    
    res.json({
        success: true,
        message: 'Website generation test successful',
        data: {
            specialty: req.body.specialty,
            timestamp: new Date().toISOString()
        }
    });
});

const PORT = 8002;
app.listen(PORT, () => {
    console.log(`🚀 Simple test server running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Website generation: http://localhost:${PORT}/api/v1/website-generation/generate`);
});