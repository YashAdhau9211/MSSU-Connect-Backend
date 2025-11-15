import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry error monitoring
 * Should be called at the very beginning of the application
 */
export const initSentry = (app) => {
  // Only initialize Sentry if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error monitoring disabled.');
    return;
  }

  const environment = process.env.NODE_ENV || 'development';
  
  // Initialize Sentry
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment,
    
    // Set sample rate based on environment
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      
      // Enable profiling
      nodeProfilingIntegration(),
    ],
    
    // Release tracking
    release: process.env.SENTRY_RELEASE || 'mssu-connect-auth@1.0.0',
    
    // Server name
    serverName: process.env.SERVER_NAME || 'auth-service',
    
    // Before send hook to filter/modify events
    beforeSend(event, hint) {
      // Filter out specific errors if needed
      const error = hint.originalException;
      
      // Don't send validation errors to Sentry
      if (error && error.name === 'ValidationError') {
        return null;
      }
      
      // Don't send 404 errors
      if (event.exception?.values?.[0]?.type === 'NotFoundError') {
        return null;
      }
      
      return event;
    },
    
    // Before breadcrumb hook to filter/modify breadcrumbs
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out sensitive data from breadcrumbs
      if (breadcrumb.category === 'http') {
        // Remove sensitive headers
        if (breadcrumb.data?.headers) {
          delete breadcrumb.data.headers.authorization;
          delete breadcrumb.data.headers.cookie;
        }
        
        // Remove sensitive query parameters
        if (breadcrumb.data?.query_string) {
          breadcrumb.data.query_string = breadcrumb.data.query_string
            .replace(/token=[^&]*/g, 'token=[REDACTED]')
            .replace(/password=[^&]*/g, 'password=[REDACTED]');
        }
      }
      
      return breadcrumb;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      // Browser errors that shouldn't reach the backend
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      
      // Network errors
      'NetworkError',
      'Network request failed',
      
      // Common user errors
      'Invalid credentials',
      'Token expired',
      'Unauthorized',
    ],
  });

  console.log(`Sentry initialized for ${environment} environment`);
};

/**
 * Get Sentry request handler middleware
 * Should be used before any other middleware
 */
export const sentryRequestHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
};

/**
 * Get Sentry tracing middleware
 * Should be used after request handler but before routes
 */
export const sentryTracingHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
};

/**
 * Get Sentry error handler middleware
 * Should be used after all routes but before other error handlers
 */
export const sentryErrorHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      if (error.statusCode >= 500) {
        return true;
      }
      
      // Capture specific error types
      const criticalErrors = [
        'DatabaseError',
        'RedisError',
        'ExternalServiceError',
        'InternalError'
      ];
      
      return criticalErrors.includes(error.name);
    }
  });
};

/**
 * Manually capture an exception with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const captureException = (error, context = {}) => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope) => {
    // Add user context if available
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
        role: context.user.role,
        campus_id: context.user.campus_id
      });
    }
    
    // Add request context if available
    if (context.request) {
      scope.setContext('request', {
        method: context.request.method,
        url: context.request.url,
        headers: {
          'user-agent': context.request.headers['user-agent'],
          'x-request-id': context.request.headers['x-request-id']
        },
        ip: context.request.ip
      });
    }
    
    // Add custom tags
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    // Add extra context
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    // Set level
    if (context.level) {
      scope.setLevel(context.level);
    }
    
    // Capture the exception
    Sentry.captureException(error);
  });
};

/**
 * Manually capture a message with context
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (fatal, error, warning, info, debug)
 * @param {Object} context - Additional context
 */
export const captureMessage = (message, level = 'info', context = {}) => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope) => {
    // Add context similar to captureException
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
        role: context.user.role
      });
    }
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
};

/**
 * Create a transaction for performance monitoring
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @returns {Transaction} Sentry transaction
 */
export const startTransaction = (name, op = 'http.server') => {
  if (!process.env.SENTRY_DSN) {
    return null;
  }
  
  return Sentry.startTransaction({
    name,
    op
  });
};

/**
 * Flush Sentry events (useful for serverless or before shutdown)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export const flushSentry = async (timeout = 2000) => {
  if (!process.env.SENTRY_DSN) {
    return true;
  }
  
  return await Sentry.close(timeout);
};

export default {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  startTransaction,
  flushSentry
};
