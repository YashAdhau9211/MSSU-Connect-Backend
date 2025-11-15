import { v4 as uuidv4 } from 'uuid';
import { logRequest } from '../utils/logger.js';

/**
 * Middleware to log all incoming HTTP requests
 * Adds request ID for tracing and logs request/response details
 */
export const requestLogger = (req, res, next) => {
  // Generate unique request ID for tracing
  req.id = uuidv4();
  
  // Capture request start time
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override res.end to capture response details
  res.end = function (chunk, encoding) {
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Restore original end function
    res.end = originalEnd;
    
    // Call original end function
    res.end(chunk, encoding);
    
    // Log the request after response is sent
    logRequest(req, res, duration);
  };
  
  next();
};

/**
 * Middleware to log request body for POST/PUT requests
 * Excludes sensitive fields like passwords, tokens, etc.
 */
export const requestBodyLogger = (req, res, next) => {
  // Only log for POST, PUT, PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    // Clone the body to avoid modifying original
    const bodyToLog = { ...req.body };
    
    // List of sensitive fields to exclude from logs
    const sensitiveFields = [
      'password',
      'oldPassword',
      'newPassword',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'otp',
      'mfaCode',
      'resetToken',
      'secret',
      'apiKey',
      'api_key'
    ];
    
    // Remove sensitive fields
    sensitiveFields.forEach(field => {
      if (bodyToLog[field]) {
        bodyToLog[field] = '[REDACTED]';
      }
    });
    
    // Attach sanitized body to request for logging
    req.sanitizedBody = bodyToLog;
  }
  
  next();
};

/**
 * Middleware to add request ID to response headers
 * Useful for debugging and tracing requests
 */
export const addRequestId = (req, res, next) => {
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Combined request logging middleware
 * Includes request ID generation, body logging, and request/response logging
 */
export const requestLoggingMiddleware = [
  requestLogger,
  addRequestId,
  requestBodyLogger
];

export default requestLoggingMiddleware;
