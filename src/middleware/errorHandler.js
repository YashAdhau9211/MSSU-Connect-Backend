/**
 * Error code to HTTP status code mapping
 */
const ERROR_STATUS_MAP = {
  // Validation errors
  VALIDATION_ERROR: 400,
  
  // Authentication errors
  INVALID_CREDENTIALS: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_INVALID: 401,
  TOKEN_REVOKED: 401,
  UNAUTHORIZED: 401,
  
  // Authorization errors
  FORBIDDEN: 403,
  ACCOUNT_LOCKED: 403,
  ACCOUNT_INACTIVE: 403,
  INSUFFICIENT_PERMISSIONS: 403,
  
  // Not found errors
  USER_NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,
  CAMPUS_NOT_FOUND: 404,
  
  // Conflict errors
  EMAIL_EXISTS: 409,
  PHONE_EXISTS: 409,
  DUPLICATE_ENTRY: 409,
  
  // Bad request errors
  OTP_EXPIRED: 400,
  OTP_INVALID: 400,
  INVALID_REQUEST: 400,
  INVALID_PASSWORD: 400,
  
  // Rate limiting
  OTP_RATE_LIMIT: 429,
  RATE_LIMIT_EXCEEDED: 429,
  
  // Server errors
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  REDIS_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Determine HTTP status code from error
 * @param {Error} error - Error object
 * @returns {number} HTTP status code
 */
const getStatusCode = (error) => {
  // Check if error has a code property
  if (error.code && ERROR_STATUS_MAP[error.code]) {
    return ERROR_STATUS_MAP[error.code];
  }
  
  // Check if error has a statusCode property
  if (error.statusCode) {
    return error.statusCode;
  }
  
  // Check for Sequelize errors
  if (error.name === 'SequelizeValidationError') {
    return 400;
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    return 409;
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return 400;
  }
  if (error.name === 'SequelizeDatabaseError') {
    return 500;
  }
  
  // Default to 500 for unknown errors
  return 500;
};

/**
 * Sanitize error message to avoid exposing internal details
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code
 * @returns {string} Sanitized error message
 */
const sanitizeErrorMessage = (error, statusCode) => {
  // For 5xx errors, don't expose internal details in production
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    return 'An internal server error occurred';
  }
  
  // For Sequelize errors, provide user-friendly messages
  if (error.name === 'SequelizeValidationError') {
    return 'Validation failed';
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors?.[0]?.path || 'field';
    return `${field} already exists`;
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return 'Invalid reference to related resource';
  }
  if (error.name === 'SequelizeDatabaseError') {
    return 'Database operation failed';
  }
  
  // Return the error message if it exists
  return error.message || 'An error occurred';
};

/**
 * Get error code from error object
 * @param {Error} error - Error object
 * @returns {string} Error code
 */
const getErrorCode = (error) => {
  // If error has a code property, use it
  if (error.code) {
    return error.code;
  }
  
  // Map Sequelize errors to custom codes
  if (error.name === 'SequelizeValidationError') {
    return 'VALIDATION_ERROR';
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    return 'DUPLICATE_ENTRY';
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return 'INVALID_REQUEST';
  }
  if (error.name === 'SequelizeDatabaseError') {
    return 'DATABASE_ERROR';
  }
  
  // Default error code
  return 'INTERNAL_ERROR';
};

/**
 * Extract validation error details from Sequelize validation error
 * @param {Error} error - Sequelize validation error
 * @returns {Object|undefined} Validation error details
 */
const getValidationDetails = (error) => {
  if (error.name === 'SequelizeValidationError' && error.errors) {
    const details = {};
    error.errors.forEach(err => {
      details[err.path] = err.message;
    });
    return details;
  }
  
  return undefined;
};

/**
 * Log error with appropriate level
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {number} statusCode - HTTP status code
 */
const logError = (error, req, statusCode) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    errorCode: getErrorCode(error),
    errorMessage: error.message,
    errorStack: error.stack,
    userId: req.user?.id,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
  };
  
  // Log based on severity
  if (statusCode >= 500) {
    console.error('Server Error:', JSON.stringify(logData, null, 2));
  } else if (statusCode >= 400) {
    console.warn('Client Error:', JSON.stringify(logData, null, 2));
  } else {
    console.log('Error:', JSON.stringify(logData, null, 2));
  }
};

/**
 * Global error handling middleware
 * Catches all unhandled errors and returns standardized error response
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (error, req, res, next) => {
  // Determine status code
  const statusCode = getStatusCode(error);
  
  // Log the error
  logError(error, req, statusCode);
  
  // Get error code
  const errorCode = getErrorCode(error);
  
  // Sanitize error message
  const errorMessage = sanitizeErrorMessage(error, statusCode);
  
  // Get validation details if applicable
  const validationDetails = getValidationDetails(error);
  
  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
    }
  };
  
  // Add validation details if present
  if (validationDetails) {
    errorResponse.error.details = validationDetails;
  }
  
  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.error.stack = error.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Handles requests to non-existent routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error with code
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} statusCode - HTTP status code (optional)
 * @returns {Error} Custom error object
 */
export const createError = (message, code, statusCode = null) => {
  const error = new Error(message);
  error.code = code;
  if (statusCode) {
    error.statusCode = statusCode;
  }
  return error;
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
};
