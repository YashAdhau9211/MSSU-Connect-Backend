import { captureException, captureMessage } from '../config/sentry.js';
import logger from '../utils/logger.js';

/**
 * Middleware to capture and report errors to monitoring service
 * This should be placed after Sentry's error handler but before the final error handler
 */
export const errorMonitoring = (err, req, res, next) => {
  // Prepare context for error reporting
  const context = {
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      campus_id: req.user.campus_id
    } : null,
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: {
        'user-agent': req.get('user-agent'),
        'x-request-id': req.id
      },
      ip: req.ip || req.connection?.remoteAddress,
      body: req.sanitizedBody || {}
    },
    tags: {
      environment: process.env.NODE_ENV || 'development',
      statusCode: err.statusCode || 500,
      errorCode: err.code || 'UNKNOWN_ERROR'
    },
    extra: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  };

  // Determine severity level
  let level = 'error';
  if (err.statusCode >= 500) {
    level = 'error';
  } else if (err.statusCode >= 400) {
    level = 'warning';
  }
  context.level = level;

  // Capture exception in Sentry
  captureException(err, context);

  // Also log to application logger
  logger.error('Error captured by monitoring', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      code: err.code
    },
    ...context
  });

  // Pass to next error handler
  next(err);
};

/**
 * Middleware to monitor critical operations
 * Captures messages for important events that aren't errors
 */
export const monitorCriticalOperation = (operation, level = 'info') => {
  return (req, res, next) => {
    // Capture the operation start
    const context = {
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null,
      tags: {
        operation,
        environment: process.env.NODE_ENV || 'development'
      },
      extra: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    captureMessage(`Critical operation: ${operation}`, level, context);
    
    next();
  };
};

/**
 * Middleware to set up performance monitoring for routes
 */
export const performanceMonitoring = (req, res, next) => {
  // Record start time
  req.performanceStart = Date.now();
  
  // Override res.end to capture performance metrics
  const originalEnd = res.end;
  
  res.end = function (chunk, encoding) {
    // Calculate duration
    const duration = Date.now() - req.performanceStart;
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        requestId: req.id,
        userId: req.user?.id
      });
      
      // Capture in Sentry for production
      if (process.env.NODE_ENV === 'production') {
        captureMessage(`Slow request: ${req.method} ${req.path}`, 'warning', {
          tags: {
            duration,
            method: req.method,
            path: req.path
          },
          extra: {
            requestId: req.id,
            userId: req.user?.id
          }
        });
      }
    }
    
    // Restore and call original end
    res.end = originalEnd;
    res.end(chunk, encoding);
  };
  
  next();
};

/**
 * Middleware to monitor authentication failures
 */
export const monitorAuthFailures = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  res.json = function (data) {
    // Check if this is an authentication failure
    if (res.statusCode === 401 || res.statusCode === 403) {
      const context = {
        tags: {
          statusCode: res.statusCode,
          path: req.path,
          method: req.method
        },
        extra: {
          requestId: req.id,
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent')
        }
      };
      
      captureMessage('Authentication failure', 'warning', context);
      
      logger.warn('Authentication failure', {
        statusCode: res.statusCode,
        path: req.path,
        method: req.method,
        requestId: req.id,
        ip: req.ip
      });
    }
    
    // Restore and call original json
    res.json = originalJson;
    return res.json(data);
  };
  
  next();
};

export default {
  errorMonitoring,
  monitorCriticalOperation,
  performanceMonitoring,
  monitorAuthFailures
};
