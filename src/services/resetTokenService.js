import crypto from 'crypto';
import { redisHelpers } from '../config/redis.js';
import config from '../config/env.js';

const RESET_TOKEN_EXPIRY_SECONDS = Math.floor(config.security.passwordResetExpiry / 1000); // Convert ms to seconds (3600s = 1 hour)

/**
 * Generate a unique password reset token for a user
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object>} { token: string, expiresAt: Date }
 */
export const generateResetToken = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Invalidate any existing reset tokens for this user
    await invalidateUserTokens(userId);

    // Generate a cryptographically secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Store token in Redis with user ID as value
    const tokenKey = `reset:${token}`;
    const tokenData = {
      userId,
      createdAt: new Date().toISOString()
    };

    const stored = await redisHelpers.set(tokenKey, tokenData, RESET_TOKEN_EXPIRY_SECONDS);

    if (!stored) {
      throw new Error('Failed to store reset token in Redis');
    }

    // Store a reverse mapping (userId -> token) to enable invalidation of previous tokens
    const userTokenKey = `reset:user:${userId}`;
    await redisHelpers.set(userTokenKey, token, RESET_TOKEN_EXPIRY_SECONDS);

    const expiresAt = new Date(Date.now() + (RESET_TOKEN_EXPIRY_SECONDS * 1000));

    return {
      token,
      expiresAt
    };
  } catch (error) {
    console.error('Generate reset token error:', error.message);
    throw error;
  }
};

/**
 * Verify a password reset token and return the associated user ID
 * @param {string} token - Reset token to verify
 * @returns {Promise<string>} User ID associated with the token
 * @throws {Error} If token is invalid or expired
 */
export const verifyResetToken = async (token) => {
  try {
    if (!token) {
      throw new Error('Reset token is required');
    }

    const tokenKey = `reset:${token}`;
    const tokenData = await redisHelpers.get(tokenKey);

    if (!tokenData) {
      const error = new Error('Invalid or expired reset token');
      error.code = 'RESET_TOKEN_INVALID';
      throw error;
    }

    return tokenData.userId;
  } catch (error) {
    console.error('Verify reset token error:', error.message);
    throw error;
  }
};

/**
 * Invalidate a specific reset token (after use or on request)
 * @param {string} token - Reset token to invalidate
 * @returns {Promise<boolean>} Success status
 */
export const invalidateResetToken = async (token) => {
  try {
    if (!token) {
      throw new Error('Reset token is required');
    }

    // Get token data to find user ID
    const tokenKey = `reset:${token}`;
    const tokenData = await redisHelpers.get(tokenKey);

    // Delete the token
    await redisHelpers.del(tokenKey);

    // Delete the user's token mapping if it exists
    if (tokenData && tokenData.userId) {
      const userTokenKey = `reset:user:${tokenData.userId}`;
      await redisHelpers.del(userTokenKey);
    }

    return true;
  } catch (error) {
    console.error('Invalidate reset token error:', error.message);
    return false;
  }
};

/**
 * Invalidate all reset tokens for a specific user
 * This ensures only one active reset token per user
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<boolean>} Success status
 */
export const invalidateUserTokens = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get the user's current token
    const userTokenKey = `reset:user:${userId}`;
    const currentToken = await redisHelpers.get(userTokenKey);

    if (currentToken) {
      // Delete the token itself
      const tokenKey = `reset:${currentToken}`;
      await redisHelpers.del(tokenKey);
      
      // Delete the user's token mapping
      await redisHelpers.del(userTokenKey);
    }

    return true;
  } catch (error) {
    console.error('Invalidate user tokens error:', error.message);
    return false;
  }
};

/**
 * Check if a reset token exists and is valid
 * @param {string} token - Reset token to check
 * @returns {Promise<boolean>} True if token exists and is valid
 */
export const isTokenValid = async (token) => {
  try {
    if (!token) {
      return false;
    }

    const tokenKey = `reset:${token}`;
    return await redisHelpers.exists(tokenKey);
  } catch (error) {
    console.error('Check token validity error:', error.message);
    return false;
  }
};

/**
 * Get remaining TTL for a reset token
 * @param {string} token - Reset token
 * @returns {Promise<number>} Remaining seconds (-1 if expired/not found, -2 if no expiry)
 */
export const getTokenTTL = async (token) => {
  try {
    if (!token) {
      return -1;
    }

    const tokenKey = `reset:${token}`;
    return await redisHelpers.ttl(tokenKey);
  } catch (error) {
    console.error('Get token TTL error:', error.message);
    return -1;
  }
};

export default {
  generateResetToken,
  verifyResetToken,
  invalidateResetToken,
  invalidateUserTokens,
  isTokenValid,
  getTokenTTL
};
