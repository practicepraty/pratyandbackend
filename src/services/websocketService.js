// src/services/websocketService.js
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apierror.js';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.progressTrackers = new Map();
  }

  // Initialize WebSocket server
  initialize(server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' 
          ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']
          : process.env.CORS_ORIGIN?.split(',') || [],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware for WebSocket connections
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                     socket.handshake.query.token;
        
        if (!token) {
          console.log('WebSocket connection attempt without token');
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        socket.userId = decoded._id;
        socket.user = decoded;
        console.log(`WebSocket authenticated user: ${decoded._id}`);
        next();
      } catch (error) {
        console.log('WebSocket authentication failed:', error.message);
        next(new Error('Invalid authentication token'));
      }
    });

    // Handle client connections
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id} (User: ${socket.userId})`);
      
      // Store client connection
      this.connectedClients.set(socket.userId, {
        socketId: socket.id,
        socket: socket,
        connectedAt: new Date()
      });

      // Handle client disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id} (User: ${socket.userId})`);
        this.connectedClients.delete(socket.userId);
      });

      // Handle progress subscription
      socket.on('subscribe-progress', (data) => {
        const { requestId } = data;
        if (requestId) {
          socket.join(`progress-${requestId}`);
          console.log(`Client ${socket.id} subscribed to progress updates for request ${requestId}`);
        }
      });

      // Handle progress unsubscription
      socket.on('unsubscribe-progress', (data) => {
        const { requestId } = data;
        if (requestId) {
          socket.leave(`progress-${requestId}`);
          console.log(`Client ${socket.id} unsubscribed from progress updates for request ${requestId}`);
        }
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Connected to progress tracking service',
        timestamp: new Date().toISOString(),
        userId: socket.userId,
        socketId: socket.id
      });

      // Send welcome message with connection details
      socket.emit('welcome', {
        status: 'connected',
        message: 'WebSocket connection established successfully',
        features: ['progress-tracking', 'notifications', 'real-time-updates'],
        timestamp: new Date().toISOString()
      });
    });

    console.log('WebSocket service initialized');
  }

  // Create a new progress tracker for a request
  createProgressTracker(requestId, userId, totalSteps) {
    const tracker = {
      requestId,
      userId,
      totalSteps,
      currentStep: 0,
      progress: 0,
      status: 'initializing',
      steps: [],
      startTime: Date.now(),
      lastUpdate: Date.now(),
      metadata: {}
    };

    this.progressTrackers.set(requestId, tracker);
    return tracker;
  }

  // Update progress for a specific request
  updateProgress(requestId, stepData) {
    const tracker = this.progressTrackers.get(requestId);
    if (!tracker) {
      console.warn(`Progress tracker not found for request: ${requestId}`);
      return;
    }

    // Update tracker data
    tracker.currentStep = stepData.step || tracker.currentStep;
    tracker.progress = Math.min(100, Math.max(0, stepData.progress || tracker.progress));
    tracker.status = stepData.status || tracker.status;
    tracker.lastUpdate = Date.now();

    // Add step to history
    if (stepData.stepName) {
      tracker.steps.push({
        step: tracker.currentStep,
        name: stepData.stepName,
        status: stepData.status,
        message: stepData.message,
        timestamp: new Date().toISOString(),
        duration: stepData.duration || null
      });
    }

    // Update metadata
    if (stepData.metadata) {
      tracker.metadata = { ...tracker.metadata, ...stepData.metadata };
    }

    // Emit progress update to subscribed clients
    const progressData = {
      requestId,
      step: tracker.currentStep,
      totalSteps: tracker.totalSteps,
      progress: tracker.progress,
      status: tracker.status,
      message: stepData.message,
      stepName: stepData.stepName,
      timestamp: new Date().toISOString(),
      metadata: stepData.metadata || {},
      estimatedTimeRemaining: this.calculateETA(tracker)
    };

    // Send to specific user and request room
    this.io.to(`progress-${requestId}`).emit('progress-update', progressData);
    
    // Also send directly to user if they're connected
    const userConnection = this.connectedClients.get(tracker.userId);
    if (userConnection) {
      userConnection.socket.emit('progress-update', progressData);
    }

    console.log(`Progress update sent for request ${requestId}: ${tracker.progress}% - ${stepData.message}`);
  }

  // Calculate estimated time of arrival
  calculateETA(tracker) {
    if (tracker.progress <= 0) return null;
    
    const elapsed = Date.now() - tracker.startTime;
    const rate = tracker.progress / elapsed;
    const remaining = (100 - tracker.progress) / rate;
    
    return Math.round(remaining / 1000); // Return seconds
  }

  // Complete progress tracking
  completeProgress(requestId, result = {}) {
    const tracker = this.progressTrackers.get(requestId);
    if (!tracker) {
      console.warn(`Progress tracker not found for request: ${requestId}`);
      return;
    }

    tracker.progress = 100;
    tracker.status = 'completed';
    tracker.lastUpdate = Date.now();
    tracker.completedAt = Date.now();
    tracker.totalDuration = tracker.completedAt - tracker.startTime;

    // Send completion notification
    const completionData = {
      requestId,
      status: 'completed',
      progress: 100,
      message: 'Processing completed successfully',
      timestamp: new Date().toISOString(),
      totalDuration: tracker.totalDuration,
      result: result
    };

    this.io.to(`progress-${requestId}`).emit('progress-complete', completionData);
    
    const userConnection = this.connectedClients.get(tracker.userId);
    if (userConnection) {
      userConnection.socket.emit('progress-complete', completionData);
    }

    console.log(`Progress completed for request ${requestId} in ${tracker.totalDuration}ms`);
    
    // Clean up tracker after a delay
    setTimeout(() => {
      this.progressTrackers.delete(requestId);
    }, 300000); // 5 minutes
  }

  // Handle error in progress tracking
  errorProgress(requestId, error) {
    const tracker = this.progressTrackers.get(requestId);
    if (!tracker) {
      console.warn(`Progress tracker not found for request: ${requestId}`);
      return;
    }

    tracker.status = 'error';
    tracker.lastUpdate = Date.now();
    tracker.error = error.message || 'Unknown error occurred';

    // Send error notification
    const errorData = {
      requestId,
      status: 'error',
      progress: tracker.progress,
      message: error.message || 'An error occurred during processing',
      error: {
        code: error.code || 'PROCESSING_ERROR',
        message: error.message || 'Unknown error occurred'
      },
      timestamp: new Date().toISOString()
    };

    this.io.to(`progress-${requestId}`).emit('progress-error', errorData);
    
    const userConnection = this.connectedClients.get(tracker.userId);
    if (userConnection) {
      userConnection.socket.emit('progress-error', errorData);
    }

    console.log(`Progress error for request ${requestId}: ${error.message}`);
    
    // Clean up tracker after a delay
    setTimeout(() => {
      this.progressTrackers.delete(requestId);
    }, 60000); // 1 minute
  }

  // Get progress tracker info
  getProgressTracker(requestId) {
    return this.progressTrackers.get(requestId);
  }

  // Get all active progress trackers for a user
  getUserProgressTrackers(userId) {
    const userTrackers = [];
    for (const [requestId, tracker] of this.progressTrackers.entries()) {
      if (tracker.userId === userId) {
        userTrackers.push(tracker);
      }
    }
    return userTrackers;
  }

  // Send notification to specific user
  sendNotification(userId, notification) {
    const userConnection = this.connectedClients.get(userId);
    if (userConnection) {
      userConnection.socket.emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  // Broadcast notification to all connected clients
  broadcastNotification(notification) {
    this.io.emit('broadcast-notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      connectedClients: this.connectedClients.size,
      activeProgressTrackers: this.progressTrackers.size,
      connections: Array.from(this.connectedClients.values()).map(conn => ({
        userId: conn.socketId,
        connectedAt: conn.connectedAt
      }))
    };
  }

  // Clean up expired progress trackers
  cleanupExpiredTrackers() {
    const now = Date.now();
    const expiredTrackers = [];

    for (const [requestId, tracker] of this.progressTrackers.entries()) {
      // Remove trackers older than 1 hour
      if (now - tracker.startTime > 3600000) {
        expiredTrackers.push(requestId);
      }
    }

    expiredTrackers.forEach(requestId => {
      this.progressTrackers.delete(requestId);
    });

    if (expiredTrackers.length > 0) {
      console.log(`Cleaned up ${expiredTrackers.length} expired progress trackers`);
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Clean up expired trackers every 10 minutes
setInterval(() => {
  websocketService.cleanupExpiredTrackers();
}, 600000);

export default websocketService;