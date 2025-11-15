/**
 * Middleware Index
 * Central export point for all middleware modules
 */

// Authentication and Authorization
export {
  authenticate,
  requireRole,
  requireCampusAccess
} from './auth.js';

// Request Validation
export {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateOTPRequest,
  validateOTPVerification,
  validateTokenRefresh,
  validatePasswordResetRequest,
  validatePasswordReset,
  validatePasswordChange,
  validateProfileUpdate,
  validateUserUpdate,
  validateStatusChange,
  validateUserDeletion,
  validateUserListQuery,
  validateAuditLogQuery,
  validateUUIDParam,
  validateMFARequest,
  validateMFAVerification
} from './validation.js';

// Rate Limiting
export {
  authRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
  generalRateLimiter,
  sensitiveOperationRateLimiter,
  uploadRateLimiter,
  customRateLimiter
} from './rateLimit.js';

// Error Handling
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError
} from './errorHandler.js';

// Request Logging
export {
  requestLogger,
  requestBodyLogger,
  addRequestId,
  requestLoggingMiddleware
} from './requestLogger.js';

// Error Monitoring
export {
  errorMonitoring,
  monitorCriticalOperation,
  performanceMonitoring,
  monitorAuthFailures
} from './errorMonitoring.js';

// Import all for default export
import * as authMiddleware from './auth.js';
import * as validationMiddleware from './validation.js';
import * as rateLimitMiddleware from './rateLimit.js';
import * as errorMiddleware from './errorHandler.js';
import * as requestLoggerMiddleware from './requestLogger.js';
import * as errorMonitoringMiddleware from './errorMonitoring.js';

// Default export with all middleware grouped
export default {
  ...authMiddleware,
  ...validationMiddleware,
  ...rateLimitMiddleware,
  ...errorMiddleware,
  ...requestLoggerMiddleware,
  ...errorMonitoringMiddleware
};
