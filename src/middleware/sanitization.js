/**
 * Input Sanitization Middleware
 * 
 * This middleware provides comprehensive input sanitization to prevent:
 * - NoSQL injection attacks
 * - XSS (Cross-Site Scripting) attacks
 * - SQL injection (additional layer beyond parameterized queries)
 * 
 * Applied globally to all routes to sanitize request body, query params, and URL params
 */

/**
 * XSS Sanitization Function
 * Removes potentially dangerous HTML/JavaScript from strings
 * 
 * @param {*} value - Value to sanitize
 * @returns {*} Sanitized value
 */
const sanitizeXSS = (value) => {
  if (typeof value === 'string') {
    // Remove HTML tags and dangerous characters
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers with quotes (onclick="alert(1)")
      .replace(/\son\w+\s*=\s*[^\s>]*/gi, '') // Remove event handlers without quotes (onclick=alert(1))
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, ''); // Remove object tags
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeXSS);
  }
  
  if (value !== null && typeof value === 'object') {
    const sanitized = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = sanitizeXSS(value[key]);
      }
    }
    return sanitized;
  }
  
  return value;
};

/**
 * Custom XSS Sanitization Middleware
 * Sanitizes request body, validates query params and URL params
 */
export const xssSanitization = (req, res, next) => {
  try {
    // Sanitize request body (mutable in Express 5)
    if (req.body) {
      req.body = sanitizeXSS(req.body);
    }
    
    // For query and params, validate instead of modifying (Express 5 makes them read-only)
    // Check for XSS patterns in query parameters
    if (req.query && typeof req.query === 'object') {
      const queryStr = JSON.stringify(req.query);
      const hasXSS = /<script|<iframe|javascript:|on\w+\s*=/i.test(queryStr);
      if (hasXSS) {
        console.warn(`[SECURITY] XSS attempt in query params - IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid content detected in query parameters.',
          },
        });
      }
    }
    
    // Check for XSS patterns in URL parameters
    if (req.params && typeof req.params === 'object') {
      const paramsStr = JSON.stringify(req.params);
      const hasXSS = /<script|<iframe|javascript:|on\w+\s*=/i.test(paramsStr);
      if (hasXSS) {
        console.warn(`[SECURITY] XSS attempt in URL params - IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid content detected in URL parameters.',
          },
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * NoSQL Injection Protection Middleware
 * Custom implementation to prevent MongoDB operator injection attacks
 * Removes $ and . from user input to prevent NoSQL injection
 * 
 * Note: Using custom implementation instead of express-mongo-sanitize
 * due to compatibility issues with Express 5
 */
const sanitizeNoSQL = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Only remove $ characters (MongoDB operators)
    // Don't remove dots as they're valid in emails, URLs, etc.
    // Dots in MongoDB keys are handled separately
    return obj.replace(/\$/g, '_');
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSQL);
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Sanitize key (remove $ and . from keys only, not values)
        const sanitizedKey = key.replace(/\$/g, '_').replace(/\./g, '_');
        // Sanitize value (only remove $ from values, keep dots)
        sanitized[sanitizedKey] = sanitizeNoSQL(obj[key]);
        
        // Log if sanitization occurred
        if (sanitizedKey !== key) {
          console.warn(`[SECURITY] NoSQL injection attempt detected - Key: ${key} sanitized to ${sanitizedKey}`);
        }
      }
    }
    return sanitized;
  }

  return obj;
};

export const noSqlSanitization = (req, res, next) => {
  try {
    // Sanitize request body (mutable in Express 5)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeNoSQL(req.body);
    }
    
    // For query and params, validate instead of modifying (Express 5 makes them read-only)
    // Check if query contains dangerous characters (only $ operator, dots are allowed)
    if (req.query && typeof req.query === 'object') {
      const hasInjection = JSON.stringify(req.query).match(/\$/);
      if (hasInjection) {
        console.warn(`[SECURITY] NoSQL injection attempt in query params - IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid characters detected in query parameters.',
          },
        });
      }
    }
    
    // Check if params contains dangerous characters (only $ operator, dots are allowed)
    if (req.params && typeof req.params === 'object') {
      const hasInjection = JSON.stringify(req.params).match(/\$/);
      if (hasInjection) {
        console.warn(`[SECURITY] NoSQL injection attempt in URL params - IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid characters detected in URL parameters.',
          },
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * SQL Injection Protection
 * Additional validation for common SQL injection patterns
 * Note: Primary protection is through parameterized queries in Sequelize
 * This is an additional defensive layer
 */
export const sqlInjectionProtection = (req, res, next) => {
  try {
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
      /(--|;|\/\*|\*\/|xp_|sp_)/gi,
      /('|(\\')|(;)|(--)|(\/\*))/gi,
    ];
    
    const checkForSqlInjection = (value) => {
      if (typeof value === 'string') {
        for (const pattern of sqlInjectionPatterns) {
          if (pattern.test(value)) {
            return true;
          }
        }
      }
      
      if (Array.isArray(value)) {
        return value.some(checkForSqlInjection);
      }
      
      if (value !== null && typeof value === 'object') {
        return Object.values(value).some(checkForSqlInjection);
      }
      
      return false;
    };
    
    // Check all input sources
    const hasSqlInjection = 
      checkForSqlInjection(req.body) ||
      checkForSqlInjection(req.query) ||
      checkForSqlInjection(req.params);
    
    if (hasSqlInjection) {
      console.warn(`[SECURITY] SQL injection attempt detected - IP: ${req.ip}, Path: ${req.path}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input detected. Please check your request and try again.',
        },
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Combined Sanitization Middleware
 * Applies all sanitization layers in the correct order
 * 
 * Order of execution:
 * 1. NoSQL injection protection (removes MongoDB operators)
 * 2. XSS sanitization (removes dangerous HTML/JS)
 * 3. SQL injection detection (validates against SQL patterns)
 */
export const applySanitization = [
  noSqlSanitization,
  xssSanitization,
  sqlInjectionProtection,
];

export default {
  xssSanitization,
  noSqlSanitization,
  sqlInjectionProtection,
  applySanitization,
};
