import express from 'express';
import swaggerUi from 'swagger-ui-express';
import config from './src/config/env.js';
import apiRoutes, { applyGlobalMiddleware, applyErrorHandling } from './src/routes/index.js';
import swaggerSpec from './docs/swagger.js';

/**
 * Initialize Express Application
 * This file sets up the Express app with all middleware and routes
 * but does NOT start the server. This allows the app to be imported
 * for testing without starting the HTTP server.
 */

const app = express();

// Apply global middleware (CORS, body parsing, compression, logging, security)
applyGlobalMiddleware(app);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MSSU Connect - Authentication & User Management API',
    version: config.apiVersion,
    environment: config.nodeEnv,
    documentation: '/api-docs',
  });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MSSU Connect API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Mount API routes with /api/v1 prefix
app.use('/api/v1', apiRoutes);

// Apply error handling middleware (404 handler and global error handler)
applyErrorHandling(app);

export default app;
