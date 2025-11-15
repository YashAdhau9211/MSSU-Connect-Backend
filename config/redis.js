/**
 * Redis Connection Configuration
 * 
 * This file provides Redis connection configuration for different environments.
 * It includes connection settings, retry strategies, and environment-specific options.
 * 
 * Environments: development, staging, production
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * Retry strategy for Redis connection
 * Implements exponential backoff with a maximum delay
 */
const retryStrategy = (times) => {
  const delay = Math.min(times * 50, 2000);
  return delay;
};

/**
 * Base Redis configuration
 */
const baseConfig = {
  socket: {
    reconnectStrategy: retryStrategy,
  },
  // Disable offline queue to fail fast if Redis is unavailable
  enableOfflineQueue: false,
};

/**
 * Environment-specific Redis configurations
 */
const config = {
  development: {
    ...baseConfig,
    socket: {
      ...baseConfig.socket,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '0', 10),
    // Enable offline queue in development for better DX
    enableOfflineQueue: true,
  },

  staging: {
    ...baseConfig,
    socket: {
      ...baseConfig.socket,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      // Enable TLS for staging if required
      tls: process.env.REDIS_TLS === 'true',
    },
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DB || '0', 10),
  },

  production: {
    ...baseConfig,
    socket: {
      ...baseConfig.socket,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      // Enable TLS for production
      tls: process.env.REDIS_TLS !== 'false',
      // Connection timeout
      connectTimeout: 10000,
    },
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DB || '0', 10),
    // Stricter settings for production
    enableOfflineQueue: false,
  },
};

/**
 * Redis key prefixes for different data types
 * Helps organize Redis keys and avoid collisions
 */
export const REDIS_KEY_PREFIXES = {
  OTP: 'otp',
  OTP_RATE_LIMIT: 'otp:ratelimit',
  PASSWORD_RESET: 'reset',
  TOKEN_BLACKLIST: 'blacklist',
  SESSION: 'session',
  MFA: 'mfa',
  RATE_LIMIT: 'ratelimit',
};

/**
 * Redis TTL values (in seconds)
 */
export const REDIS_TTL = {
  OTP: parseInt(process.env.OTP_EXPIRY || '300000', 10) / 1000, // 5 minutes
  PASSWORD_RESET: parseInt(process.env.PASSWORD_RESET_EXPIRY || '3600000', 10) / 1000, // 1 hour
  SESSION: 7 * 24 * 60 * 60, // 7 days
  MFA: 5 * 60, // 5 minutes
  OTP_RATE_LIMIT: 60 * 60, // 1 hour
};

/**
 * Helper function to build Redis keys with prefixes
 */
export const buildRedisKey = (prefix, identifier) => {
  return `${prefix}:${identifier}`;
};

// Export configuration for current environment
const environment = process.env.NODE_ENV || 'development';
export default config[environment];

// Export all configurations
export { config, retryStrategy };
