import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 * Checks for validation errors and returns formatted error response
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = {};
    errors.array().forEach(error => {
      formattedErrors[error.path] = error.msg;
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formattedErrors
      }
    });
  }
  
  next();
};

/**
 * Validation schema for user registration
 */
export const validateRegistration = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail({ gmail_remove_dots: false }),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+91[6-9]\d{9}$/).withMessage('Invalid Indian phone number format. Use: +91XXXXXXXXXX'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['Student', 'Teacher', 'Parent', 'Admin', 'Super_Admin']).withMessage('Invalid role'),
  
  body('campus_id')
    .notEmpty().withMessage('Campus ID is required')
    .isUUID().withMessage('Invalid campus ID format'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
  
  handleValidationErrors
];

/**
 * Validation schema for login with email/password
 */
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail({ gmail_remove_dots: false }),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Validation schema for OTP request
 */
export const validateOTPRequest = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+91[6-9]\d{9}$/).withMessage('Invalid Indian phone number format. Use: +91XXXXXXXXXX'),
  
  handleValidationErrors
];

/**
 * Validation schema for OTP verification
 */
export const validateOTPVerification = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+91[6-9]\d{9}$/).withMessage('Invalid Indian phone number format. Use: +91XXXXXXXXXX'),
  
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
  
  handleValidationErrors
];

/**
 * Validation schema for token refresh
 */
export const validateTokenRefresh = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required'),
  
  handleValidationErrors
];

/**
 * Validation schema for password reset request
 */
export const validatePasswordResetRequest = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail({ gmail_remove_dots: false }),
  
  handleValidationErrors
];

/**
 * Validation schema for password reset completion
 */
export const validatePasswordReset = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  
  handleValidationErrors
];

/**
 * Validation schema for password change
 */
export const validatePasswordChange = [
  body('oldPassword')
    .notEmpty().withMessage('Old password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  
  handleValidationErrors
];

/**
 * Validation schema for profile update
 */
export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^\+91[6-9]\d{9}$/).withMessage('Invalid Indian phone number format. Use: +91XXXXXXXXXX'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
  
  handleValidationErrors
];

/**
 * Validation schema for user update (admin)
 */
export const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^\+91[6-9]\d{9}$/).withMessage('Invalid Indian phone number format. Use: +91XXXXXXXXXX'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
  
  body('role')
    .optional()
    .isIn(['Student', 'Teacher', 'Parent', 'Admin', 'Super_Admin']).withMessage('Invalid role'),
  
  body('campus_id')
    .optional()
    .isUUID().withMessage('Invalid campus ID format'),
  
  handleValidationErrors
];

/**
 * Validation schema for user status change
 */
export const validateStatusChange = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['active', 'inactive', 'locked']).withMessage('Invalid status. Must be: active, inactive, or locked'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),
  
  handleValidationErrors
];

/**
 * Validation schema for user deletion
 */
export const validateUserDeletion = [
  body('mfaCode')
    .notEmpty().withMessage('MFA code is required')
    .isLength({ min: 6, max: 6 }).withMessage('MFA code must be 6 digits')
    .isNumeric().withMessage('MFA code must contain only numbers'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),
  
  handleValidationErrors
];

/**
 * Validation schema for user listing query parameters
 */
export const validateUserListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('role')
    .optional()
    .isIn(['Student', 'Teacher', 'Parent', 'Admin', 'Super_Admin']).withMessage('Invalid role'),
  
  query('campus_id')
    .optional()
    .isUUID().withMessage('Invalid campus ID format'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'locked']).withMessage('Invalid status'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Search query must not exceed 255 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'email', 'created_at', 'last_login_at']).withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

/**
 * Validation schema for audit log query parameters
 */
export const validateAuditLogQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('user_id')
    .optional()
    .isUUID().withMessage('Invalid user ID format'),
  
  query('admin_id')
    .optional()
    .isUUID().withMessage('Invalid admin ID format'),
  
  query('action_type')
    .optional()
    .trim(),
  
  query('start_date')
    .optional()
    .isISO8601().withMessage('Invalid start date format. Use ISO 8601 format'),
  
  query('end_date')
    .optional()
    .isISO8601().withMessage('Invalid end date format. Use ISO 8601 format'),
  
  handleValidationErrors
];

/**
 * Validation schema for UUID parameters
 */
export const validateUUIDParam = (paramName = 'id') => [
  param(paramName)
    .isUUID().withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

/**
 * Validation schema for MFA code request
 */
export const validateMFARequest = [
  body('method')
    .notEmpty().withMessage('MFA method is required')
    .isIn(['email', 'sms']).withMessage('Invalid MFA method. Must be: email or sms'),
  
  handleValidationErrors
];

/**
 * Validation schema for MFA code verification
 */
export const validateMFAVerification = [
  body('code')
    .notEmpty().withMessage('MFA code is required')
    .isLength({ min: 6, max: 6 }).withMessage('MFA code must be 6 digits')
    .isNumeric().withMessage('MFA code must contain only numbers'),
  
  handleValidationErrors
];

export default {
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
};
