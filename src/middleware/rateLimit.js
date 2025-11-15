import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

/**
 * Standard error response for rate limit exceeded
 */
const rateLimitHandler = (req, res) => {
  return res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  });
};

/**
 * Create a rate limiter with Redis store if available, otherwise use memory store
 * @param {Object} options - Rate limit configuration
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options) => {
  const config = {
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests',
    handler: rateLimitHandler,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
  };

  // Try to use Redis store if client is connected, otherwise fall back to memory store
  try {
    if (redisClient && redisClient.isOpen) {
      config.store = new RedisStore({
        // @ts-expect-error - Known issue with the library's type definitions
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: options.prefix || 'rl:',
      });
    } else {
      // Use default memory store (not recommended for production with multiple instances)
      console.warn(`[RATE LIMIT] Redis not connected, using memory store for ${options.prefix || 'rate limiter'}`);
    }
  } catch (error) {
    console.warn(`[RATE LIMIT] Failed to create Redis store, using memory store: ${error.message}`);
  }

  return rateLimit(config);
};

/**
 * Rate limiter for authentication endpoints
 * Limit: 10 requests per minute per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  prefix: 'rl:auth:',
  message: 'Too many authentication attempts. Please try again in a minute.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for OTP request endpoints
 * Limit: 3 requests per hour per IP
 */
export const otpRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  prefix: 'rl:otp:',
  message: 'Too many OTP requests. Please try again in an hour.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for password reset endpoints
 * Limit: 3 requests per hour per IP
 */
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  prefix: 'rl:reset:',
  message: 'Too many password reset requests. Please try again in an hour.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for general API endpoints
 * Limit: 100 requests per minute per IP
 */
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  prefix: 'rl:api:',
  message: 'Too many requests. Please try again in a minute.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for sensitive operations (user deletion, role changes, etc.)
 * Limit: 5 requests per hour per IP
 */
export const sensitiveOperationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  prefix: 'rl:sensitive:',
  message: 'Too many sensitive operation requests. Please try again in an hour.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for file upload endpoints
 * Limit: 10 requests per hour per IP
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  prefix: 'rl:upload:',
  message: 'Too many upload requests. Please try again in an hour.',
  skipSuccessfulRequests: false,
});

/**
 * Custom rate limiter factory for specific use cases
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum number of requests
 * @param {string} prefix - Redis key prefix
 * @returns {Function} Express middleware
 */
export const customRateLimiter = (windowMs, max, prefix = 'rl:custom:') => {
  return createRateLimiter({
    windowMs,
    max,
    prefix,
  });
};

export default {
  authRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
  generalRateLimiter,
  sensitiveOperationRateLimiter,
  uploadRateLimiter,
  customRateLimiter,
};
