/**
 * Configuration Index
 * 
 * Central export point for all configuration modules.
 * This file aggregates all configuration settings and provides
 * a single import point for the application.
 */

import databaseConfig, { config as dbConfigs } from './database.js';
import redisConfig, { 
  config as redisConfigs, 
  REDIS_KEY_PREFIXES, 
  REDIS_TTL, 
  buildRedisKey,
  retryStrategy 
} from './redis.js';
import jwtConfig, { 
  JWT_PAYLOAD_FIELDS, 
  TOKEN_TYPES, 
  getSignOptions, 
  getVerifyOptions, 
  buildTokenPayload,
  validateJwtConfig 
} from './jwt.js';
import awsConfig, { 
  awsConfig as awsConfigs,
  s3Config, 
  sesConfig, 
  buildS3Key, 
  getS3Url,
  validateAwsConfig 
} from './aws.js';

/**
 * Aggregated configuration object
 * Contains all configuration settings for the application
 */
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  database: databaseConfig,

  // Redis
  redis: redisConfig,

  // JWT
  jwt: jwtConfig,

  // AWS Services
  aws: awsConfig,
  s3: s3Config,
  ses: sesConfig,

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

/**
 * Validate all configurations
 * Run this on application startup to catch configuration errors early
 */
export const validateAllConfigs = () => {
  console.log('Validating application configuration...');
  
  try {
    validateJwtConfig();
    validateAwsConfig();
    console.log('✓ All configurations validated successfully');
    return true;
  } catch (error) {
    console.error('✗ Configuration validation failed:', error.message);
    return false;
  }
};

/**
 * Print configuration summary (without sensitive data)
 * Useful for debugging and verifying configuration
 */
export const printConfigSummary = () => {
  console.log('\n=== Configuration Summary ===');
  console.log(`Environment: ${config.env}`);
  console.log(`Port: ${config.port}`);
  console.log(`API Version: ${config.apiVersion}`);
  console.log(`Database: ${databaseConfig.dialect || 'postgres'}`);
  console.log(`Redis: ${redisConfig.socket?.host || 'localhost'}:${redisConfig.socket?.port || 6379}`);
  console.log(`JWT Algorithm: ${jwtConfig.algorithm}`);
  console.log(`S3 Bucket: ${s3Config.bucket}`);
  console.log(`S3 Region: ${s3Config.region}`);
  console.log(`Email From: ${sesConfig.from}`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
  console.log('============================\n');
};

// Export individual configurations
export {
  // Database
  databaseConfig,
  dbConfigs,

  // Redis
  redisConfig,
  redisConfigs,
  REDIS_KEY_PREFIXES,
  REDIS_TTL,
  buildRedisKey,
  retryStrategy,

  // JWT
  jwtConfig,
  JWT_PAYLOAD_FIELDS,
  TOKEN_TYPES,
  getSignOptions,
  getVerifyOptions,
  buildTokenPayload,
  validateJwtConfig,

  // AWS
  awsConfig,
  awsConfigs,
  s3Config,
  sesConfig,
  buildS3Key,
  getS3Url,
  validateAwsConfig,
};

// Export aggregated config as default
export default config;
