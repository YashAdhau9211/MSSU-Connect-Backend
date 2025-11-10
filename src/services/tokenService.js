import jwt from 'jsonwebtoken';
import config from '../config/env.js';

const JWT_SECRET = config.jwt.secret;
const JWT_ALGORITHM = config.jwt.algorithm || 'HS256';
const ACCESS_TOKEN_EXPIRY = config.jwt.accessExpiry || '1h';
const REFRESH_TOKEN_EXPIRY = config.jwt.refreshExpiry || '7d';

/**
 * Generate an access token (short-lived, 1 hour)
 * @param {Object} payload - Token payload containing user_id, email, role, campus_id
 * @returns {string} JWT access token
 */
export const generateAccessToken = (payload) => {
  try {
    if (!payload || !payload.user_id) {
      throw new Error('Invalid payload: user_id is required');
    }
    
    const tokenPayload = {
      user_id: payload.user_id,
      email: payload.email,
      role: payload.role,
      campus_id: payload.campus_id,
      type: 'access'
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      algorithm: JWT_ALGORITHM,
      expiresIn: ACCESS_TOKEN_EXPIRY
    });
    
    return token;
  } catch (error) {
    console.error('Access token generation error:', error.message);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate a refresh token (long-lived, 7 days)
 * @param {Object} payload - Token payload containing user_id, email, role, campus_id, token_version
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  try {
    if (!payload || !payload.user_id) {
      throw new Error('Invalid payload: user_id is required');
    }
    
    const tokenPayload = {
      user_id: payload.user_id,
      email: payload.email,
      role: payload.role,
      campus_id: payload.campus_id,
      token_version: payload.token_version || 0,
      type: 'refresh'
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      algorithm: JWT_ALGORITHM,
      expiresIn: REFRESH_TOKEN_EXPIRY
    });
    
    return token;
  } catch (error) {
    console.error('Refresh token generation error:', error.message);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export const verifyToken = (token) => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM]
    });
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const expiredError = new Error('Token has expired');
      expiredError.code = 'TOKEN_EXPIRED';
      throw expiredError;
    } else if (error.name === 'JsonWebTokenError') {
      const invalidError = new Error('Invalid token');
      invalidError.code = 'TOKEN_INVALID';
      throw invalidError;
    } else {
      console.error('Token verification error:', error.message);
      throw new Error('Failed to verify token');
    }
  }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} payload - Token payload containing user_id, email, role, campus_id, token_version
 * @returns {Object} { accessToken, refreshToken }
 */
export const generateTokens = (payload) => {
  try {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    return {
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('Token generation error:', error.message);
    throw new Error('Failed to generate tokens');
  }
};

/**
 * Decode a token without verification (useful for extracting payload from expired tokens)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  try {
    if (!token) {
      return null;
    }
    
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    console.error('Token decode error:', error.message);
    return null;
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateTokens,
  decodeToken
};
