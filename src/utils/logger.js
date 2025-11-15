import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Custom format for console output (human-readable)
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Determine log level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'development') {
    return 'debug';
  } else if (env === 'staging') {
    return 'info';
  } else {
    return 'warn';
  }
};

// Create base logger configuration
const loggerConfig = {
  level: getLogLevel(),
  format: combine(
    errors({ stack: true }), // Log error stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: {
    service: 'mssu-connect-auth',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: []
};

// Console transport for development
if (process.env.NODE_ENV === 'development') {
  loggerConfig.transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    })
  );
}

// File transport for staging
if (process.env.NODE_ENV === 'staging') {
  loggerConfig.transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    })
  );
}

// CloudWatch transport for production
if (process.env.NODE_ENV === 'production' && process.env.AWS_CLOUDWATCH_GROUP) {
  const cloudwatchConfig = {
    logGroupName: process.env.AWS_CLOUDWATCH_GROUP,
    logStreamName: `${process.env.AWS_CLOUDWATCH_STREAM || 'auth-service'}-${new Date().toISOString().split('T')[0]}`,
    awsRegion: process.env.AWS_REGION || 'ap-south-1',
    messageFormatter: ({ level, message, ...meta }) => {
      return JSON.stringify({
        level,
        message,
        ...meta
      });
    }
  };

  // Add AWS credentials if provided
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    cloudwatchConfig.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    cloudwatchConfig.awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  }

  loggerConfig.transports.push(new WinstonCloudWatch(cloudwatchConfig));
  
  // Also add console for production (for container logs)
  loggerConfig.transports.push(
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
      )
    })
  );
}

// If no transports were added (shouldn't happen), add console as fallback
if (loggerConfig.transports.length === 0) {
  loggerConfig.transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      )
    })
  );
}

// Create the logger instance
const logger = winston.createLogger(loggerConfig);

/**
 * Log with request context
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
export const logWithContext = (level, message, meta = {}) => {
  logger.log(level, message, meta);
};

/**
 * Log authentication events
 * @param {string} event - Event type (login, logout, failed_login, etc.)
 * @param {Object} data - Event data
 */
export const logAuthEvent = (event, data = {}) => {
  logger.info(`Auth Event: ${event}`, {
    event,
    userId: data.userId,
    email: data.email,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    ...data
  });
};

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {Object} data - Event data
 */
export const logSecurityEvent = (event, data = {}) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    severity: 'high',
    ...data
  });
};

/**
 * Log API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
export const logRequest = (req, res, duration) => {
  const logData = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    requestId: req.id,
    userId: req.user?.id,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent')
  };

  if (res.statusCode >= 500) {
    logger.error('API Request Failed', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('API Request Error', logData);
  } else {
    logger.info('API Request', logData);
  }
};

/**
 * Log errors with full context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...context
  });
};

/**
 * Log database operations
 * @param {string} operation - Database operation type
 * @param {Object} data - Operation data
 */
export const logDatabaseOperation = (operation, data = {}) => {
  logger.debug(`Database Operation: ${operation}`, {
    operation,
    ...data
  });
};

/**
 * Log external service calls
 * @param {string} service - Service name (SMS, Email, S3, etc.)
 * @param {string} operation - Operation type
 * @param {Object} data - Operation data
 */
export const logExternalService = (service, operation, data = {}) => {
  logger.info(`External Service: ${service} - ${operation}`, {
    service,
    operation,
    ...data
  });
};

// Export the main logger instance
export default logger;
