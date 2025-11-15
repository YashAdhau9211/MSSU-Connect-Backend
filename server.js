import app from './app.js';
import config from './src/config/env.js';
import { initializeConnections, closeAllConnections } from './src/config/index.js';
import { initSentry, flushSentry } from './src/config/sentry.js';
import logger from './src/utils/logger.js';

/**
 * Server Startup File
 * This file imports the Express app from app.js and starts the HTTP server.
 * It handles:
 * - Database connection initialization (PostgreSQL via Sequelize)
 * - Redis connection initialization
 * - HTTP server startup
 * - Graceful shutdown handling (SIGTERM, SIGINT)
 * - Server startup logging
 */

// Initialize server
const startServer = async () => {
  try {
    console.log('Starting MSSU Connect Backend Server...');
    console.log('='.repeat(50));
    
    // Initialize Sentry error monitoring (must be first)
    initSentry(app);
    
    // Initialize database connections (PostgreSQL and Redis)
    await initializeConnections();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log('✓ Database connections established');
      console.log('='.repeat(50));
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔗 API Version: ${config.apiVersion}`);
      console.log(`🌐 URL: http://localhost:${config.port}`);
      console.log(`📚 API Documentation: http://localhost:${config.port}/api/v1`);
      console.log(`💚 Health Check: http://localhost:${config.port}/api/v1/health`);
      console.log('='.repeat(50));
      console.log('✓ Server started successfully');
      
      // Log startup with Winston
      logger.info('Server started successfully', {
        port: config.port,
        environment: config.nodeEnv,
        apiVersion: config.apiVersion
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      logger.info(`Graceful shutdown initiated`, { signal });
      
      server.close(async () => {
        console.log('HTTP server closed');
        logger.info('HTTP server closed');
        
        // Flush Sentry events before closing
        await flushSentry();
        logger.info('Sentry events flushed');
        
        await closeAllConnections();
        console.log('✓ Graceful shutdown completed');
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('='.repeat(50));
    console.error('❌ Failed to start server');
    console.error('Error:', error.message);
    console.error('='.repeat(50));
    
    // Log error with Winston and Sentry
    logger.error('Failed to start server', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    // Flush Sentry events
    await flushSentry();
    
    // Close any open connections before exiting
    await closeAllConnections().catch(err => {
      console.error('Error closing connections:', err.message);
      logger.error('Error closing connections', { error: err.message });
    });
    
    process.exit(1);
  }
};

// Start the server
startServer();
