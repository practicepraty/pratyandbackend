import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import winston from 'winston';

// Create logger for database operations
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

const connectDB = async () => {
    try {
        // Validate MongoDB URI
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        // MongoDB connection options for better reliability
        const options = {
            serverSelectionTimeoutMS: 5000, // 5 seconds timeout
            socketTimeoutMS: 45000, // 45 seconds socket timeout
            maxPoolSize: 10, // Maintain up to 10 socket connections
        };

        // Connect to MongoDB
        logger.info('Attempting to connect to MongoDB...');
        
        // Ensure proper URI format without double slashes
        const baseUri = process.env.MONGODB_URI.replace(/\/$/, ''); // Remove trailing slash if present
        const fullUri = `${baseUri}/${DB_NAME}`;
        
        logger.info(`Connecting to: ${fullUri}`);
        const connectionInstance = await mongoose.connect(fullUri, options);
        
        logger.info(`MongoDB connected successfully!`);
        logger.info(`Database Host: ${connectionInstance.connection.host}`);
        logger.info(`Database Name: ${connectionInstance.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('connected', () => {
            logger.info('MongoDB connected');
        });
        
        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });
        
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });
        
        // Handle application termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                logger.info('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (error) {
                logger.error('Error closing MongoDB connection:', error);
                process.exit(1);
            }
        });
        
        return connectionInstance;
        
    } catch (error) {
        logger.error("MongoDB connection failed:", error);
        
        // Provide specific error messages
        if (error.message.includes('ECONNREFUSED')) {
            logger.error('MongoDB server is not running or not accessible');
            logger.error('Please ensure MongoDB is installed and running on the specified host');
        } else if (error.message.includes('authentication failed')) {
            logger.error('MongoDB authentication failed - check credentials');
        } else if (error.message.includes('MONGODB_URI')) {
            logger.error('MongoDB URI is not configured in environment variables');
        }
        
        throw error; // Re-throw to be handled by the caller
    }
}

export default connectDB
