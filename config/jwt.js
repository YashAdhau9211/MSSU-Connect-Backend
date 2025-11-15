/**
 * JWT Configuration
 * 
 * This file provides JWT (JSON Web Token) configuration including:
 * - Token signing secrets
 * - Token expiry times
 * - Signing algorithms
 * - Token payload structure
 * 
 * Security Notes:
 * - JWT_SECRET should be a long, random string in production
 * - Secrets should be rotated every 90 days
 * - Use RS256 (asymmetric) for better security in distributed systems
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * JWT Configuration
 */
const jwtConfig = {
  // Secret key for signing tokens (HS256)
  // In production, use a strong random string (min 256 bits)
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',

  // Token expiry times
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Signing algorithm
  // HS256: HMAC with SHA-256 (symmetric)
  // RS256: RSA with SHA-256 (asymmetric, recommended for production)
  algorithm: process.env.JWT_ALGORITHM || 'HS256',

  // Token issuer (your application name)
  issuer: process.env.JWT_ISSUER || 'mssu-connect',

  // Token audience (who the token is intended for)
  audience: process.env.JWT_AUDIENCE || 'mssu-connect-api',

  // Clock tolerance for token validation (in seconds)
  // Allows for small time differences between servers
  clockTolerance: 10,
};

/**
 * JWT Payload Structure
 * Defines what data should be included in the token payload
 */
export const JWT_PAYLOAD_FIELDS = {
  // User identification
  USER_ID: 'user_id',
  EMAIL: 'email',
  ROLE: 'role',
  CAMPUS_ID: 'campus_id',
  
  // Token metadata
  TOKEN_VERSION: 'token_version',
  TOKEN_TYPE: 'token_type', // 'access' or 'refresh'
  
  // Standard JWT claims
  ISSUED_AT: 'iat',
  EXPIRES_AT: 'exp',
  ISSUER: 'iss',
  AUDIENCE: 'aud',
  JWT_ID: 'jti', // Unique token identifier for blacklisting
};

/**
 * Token Types
 */
export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

/**
 * Generate JWT sign options
 */
export const getSignOptions = (tokenType = TOKEN_TYPES.ACCESS) => {
  return {
    algorithm: jwtConfig.algorithm,
    expiresIn: tokenType === TOKEN_TYPES.ACCESS 
      ? jwtConfig.accessTokenExpiry 
      : jwtConfig.refreshTokenExpiry,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  };
};

/**
 * Generate JWT verify options
 */
export const getVerifyOptions = () => {
  return {
    algorithms: [jwtConfig.algorithm],
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    clockTolerance: jwtConfig.clockTolerance,
  };
};

/**
 * Build JWT payload
 */
export const buildTokenPayload = (user, tokenType = TOKEN_TYPES.ACCESS) => {
  return {
    [JWT_PAYLOAD_FIELDS.USER_ID]: user.id,
    [JWT_PAYLOAD_FIELDS.EMAIL]: user.email,
    [JWT_PAYLOAD_FIELDS.ROLE]: user.role,
    [JWT_PAYLOAD_FIELDS.CAMPUS_ID]: user.campus_id,
    [JWT_PAYLOAD_FIELDS.TOKEN_VERSION]: user.token_version || 0,
    [JWT_PAYLOAD_FIELDS.TOKEN_TYPE]: tokenType,
  };
};

/**
 * Validate JWT configuration
 * Ensures critical settings are properly configured
 */
export const validateJwtConfig = () => {
  const errors = [];

  // Check if secret is set in production
  if (process.env.NODE_ENV === 'production') {
    if (!jwtConfig.secret || jwtConfig.secret === 'your-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a strong random value in production');
    }

    if (jwtConfig.secret.length < 32) {
      errors.push('JWT_SECRET should be at least 32 characters long');
    }
  }

  // Validate algorithm
  const validAlgorithms = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'];
  if (!validAlgorithms.includes(jwtConfig.algorithm)) {
    errors.push(`JWT_ALGORITHM must be one of: ${validAlgorithms.join(', ')}`);
  }

  if (errors.length > 0) {
    console.error('JWT Configuration validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid JWT configuration');
  }
};

// Run validation
validateJwtConfig();

export default jwtConfig;
