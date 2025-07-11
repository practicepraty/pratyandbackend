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

// Enhanced startup with proper error handling
const startApplication = async () => {
  try {
    logger.info('Starting application...');
    
    // Connect to MongoDB first
    await connectDB();
    logger.info('MongoDB connection established');
    
    // Start the server with all security features
    await startServer();
    logger.info('Application started successfully');
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    
    // Graceful shutdown on startup failure
    process.exit(1);
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

