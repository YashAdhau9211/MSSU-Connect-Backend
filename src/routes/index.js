import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';

// Import route modules
import authRoutes from './auth.js';
import userRoutes from './users.js';
import profileRoutes from './profile.js';
import sessionRoutes from './sessions.js';
import auditRoutes from './audit.js';

// Import error handling middleware
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

// Import logging and monitoring middleware
import { requestLoggingMiddleware } from '../middleware/requestLogger.js';
import { 
  errorMonitoring, 
  performanceMonitoring, 
  monitorAuthFailures 
} from '../middleware/errorMonitoring.js';

// Import Sentry configuration
import { 
  sentryRequestHandler, 
  sentryTracingHandler, 
  sentryErrorHandler 
} from '../config/sentry.js';

// Import sanitization middleware
import { applySanitization } from '../middleware/sanitization.js';

const router = express.Router();

/**
 * Configure CORS (Cross-Origin Resource Sharing)
 * 
 * Security considerations:
 * - Whitelist specific origins from environment variables
 * - Enable credentials for cookie-based authentication
 * - Restrict allowed HTTP methods to only what's needed
 * - Limit allowed headers to prevent header injection
 * - Set appropriate preflight cache duration
 */
const corsOptions = {
  /**
   * Origin validation function
   * Checks if the requesting origin is in the whitelist
   */
  origin: (origin, callback) => {
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173']; // Default for development
    
    // In development, allow requests with no origin (like mobile apps, Postman, curl)
    // In production, this should be more restrictive
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (allowedOrigins.includes('*')) {
      // Allow all origins only if explicitly configured (not recommended for production)
      console.warn('[SECURITY] CORS is configured to allow all origins. This is not recommended for production.');
      callback(null, true);
    } else {
      // Reject requests from non-whitelisted origins
      console.warn(`[SECURITY] CORS blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    }
  },
  
  /**
   * Enable credentials (cookies, authorization headers, TLS client certificates)
   * Required for cookie-based authentication and sessions
   */
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  
  /**
   * Allowed HTTP methods
   * Restrict to only the methods used by the API
   */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  /**
   * Allowed request headers
   * Whitelist only necessary headers to prevent header injection attacks
   */
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  
  /**
   * Exposed response headers
   * Headers that the browser is allowed to access
   */
  exposedHeaders: [
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'X-Request-Id',
  ],
  
  /**
   * Preflight cache duration (in seconds)
   * How long the browser can cache the preflight response
   * 24 hours = 86400 seconds
   */
  maxAge: 86400,
  
  /**
   * Pass the CORS preflight response to the next handler
   * Set to false to handle OPTIONS requests automatically
   */
  preflightContinue: false,
  
  /**
   * Provides a status code to use for successful OPTIONS requests
   */
  optionsSuccessStatus: 204,
};

/**
 * Apply global middleware
 */
export const applyGlobalMiddleware = (app) => {
  // Sentry request handler - MUST be first
  app.use(sentryRequestHandler());
  
  // Sentry tracing handler - MUST be after request handler
  app.use(sentryTracingHandler());
  
  // Security headers with helmet
  app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Swagger UI
        upgradeInsecureRequests: [],
      },
    },
    // HTTP Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    // X-Frame-Options
    frameguard: {
      action: 'deny',
    },
    // X-Content-Type-Options
    noSniff: true,
    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false,
    },
    // X-Download-Options
    ieNoOpen: true,
    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
    // Referrer-Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // X-XSS-Protection (legacy, but still useful for older browsers)
    xssFilter: true,
  }));
  
  // Remove X-Powered-By header (additional layer)
  app.disable('x-powered-by');
  
  // CORS
  app.use(cors(corsOptions));
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Input sanitization (NoSQL injection, XSS, SQL injection protection)
  // Applied after body parsing to sanitize all incoming data
  app.use(applySanitization);
  
  // Response compression
  app.use(compression());
  
  // Request logging with Morgan (basic HTTP logging)
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }
  
  // Custom request logging middleware (structured logging with Winston)
  app.use(requestLoggingMiddleware);
  
  // Performance monitoring
  app.use(performanceMonitoring);
  
  // Authentication failure monitoring
  app.use(monitorAuthFailures);
};

/**
 * Mount API routes with /api/v1 prefix
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/sessions', sessionRoutes);
router.use('/audit-logs', auditRoutes);

/**
 * Health check endpoint
 * Basic health check that returns 200 if the service is running
 * Does not check dependencies (database, Redis) for fast response
 * @route GET /api/v1/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.API_VERSION || 'v1',
    },
    message: 'API is running'
  });
});

/**
 * Readiness check endpoint
 * Comprehensive check that verifies all dependencies are ready
 * Checks database and Redis connectivity
 * @route GET /api/v1/ready
 */
router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
  };
  
  let isReady = true;
  
  try {
    // Check database connection
    const { sequelize } = await import('../config/database.js');
    await sequelize.authenticate();
    checks.database = true;
  } catch (error) {
    console.error('Database readiness check failed:', error.message);
    checks.database = false;
    isReady = false;
  }
  
  try {
    // Check Redis connection
    const { redisClient } = await import('../config/redis.js');
    if (redisClient.isOpen) {
      await redisClient.ping();
      checks.redis = true;
    } else {
      checks.redis = false;
      isReady = false;
    }
  } catch (error) {
    console.error('Redis readiness check failed:', error.message);
    checks.redis = false;
    isReady = false;
  }
  
  const statusCode = isReady ? 200 : 503;
  
  res.status(statusCode).json({
    success: isReady,
    data: {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.API_VERSION || 'v1',
      checks,
    },
    message: isReady ? 'All systems operational' : 'Some systems are not ready'
  });
});

/**
 * API info endpoint
 * @route GET /api/v1
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'MSSU-Connect Authentication & User Management API',
      version: process.env.API_VERSION || 'v1',
      description: 'RESTful API for authentication, user management, and RBAC',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        profile: '/api/v1/profile',
        sessions: '/api/v1/sessions',
        auditLogs: '/api/v1/audit-logs',
      },
      documentation: '/api-docs', // Swagger documentation (to be implemented)
    }
  });
});

/**
 * Apply error handling middleware
 * Must be applied after all routes
 */
export const applyErrorHandling = (app) => {
  // 404 handler for undefined routes
  app.use(notFoundHandler);
  
  // Sentry error handler - MUST be before other error handlers
  app.use(sentryErrorHandler());
  
  // Error monitoring middleware
  app.use(errorMonitoring);
  
  // Global error handler - MUST be last
  app.use(errorHandler);
};

export default router;
