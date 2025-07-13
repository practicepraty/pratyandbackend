import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { startServer } from './server.js';
import winston from 'winston';

dotenv.config({
    path: './.env'
})

// Create logger for this module
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Enhanced startup with proper error handling and fallback
const startApplication = async () => {
  try {
    logger.info('Starting application...');
    
    // Try to connect to MongoDB
    let mongoConnected = false;
    try {
      await connectDB();
      logger.info('MongoDB connection established');
      mongoConnected = true;
    } catch (mongoError) {
      logger.error('MongoDB connection failed:', mongoError.message);
      logger.warn('Continuing without MongoDB - some features may be limited');
      logger.warn('Please check:');
      logger.warn('1. MongoDB Atlas IP whitelist (add your current IP)');
      logger.warn('2. Database credentials in .env file');
      logger.warn('3. Network connectivity');
      
      // Set a flag for the rest of the application to know MongoDB is unavailable
      process.env.MONGODB_AVAILABLE = 'false';
    }
    
    // Start the server regardless of MongoDB status
    await startServer();
    
    if (mongoConnected) {
      logger.info('Application started successfully with full database functionality');
    } else {
      logger.info('Application started successfully in limited mode (no database)');
    }
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    
    // Only exit if server startup fails, not MongoDB
    if (error.message.includes('server') || error.message.includes('port')) {
      logger.error('Critical server error - shutting down');
      process.exit(1);
    } else {
      logger.warn('Non-critical error during startup, continuing...');
    }
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
startApplication();

