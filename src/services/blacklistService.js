import { redisHelpers } from '../config/redis.js';
import { decodeToken } from './tokenService.js';
import crypto from 'crypto';

/**
 * Blacklist a JWT token by storing its JTI (JWT ID) in Redis
 * @param {string} token - JWT token to blacklist
 * @param {number} expiresIn - Remaining token lifetime in seconds
 * @param {string} reason - Optional reason for blacklisting
 * @returns {Promise<boolean>} Success status
 */
export const blacklistToken = async (token, expiresIn, reason = 'logout') => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }

    if (!expiresIn || expiresIn <= 0) {
      throw new Error('Valid expiry time is required');
    }

    // Decode token to extract payload
    const decoded = decodeToken(token);
    
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    // Generate JTI if not present in token (use hash of token as fallback)
    const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');

    // Store in Redis with key pattern blacklist:${jti}
    const blacklistKey = `blacklist:${jti}`;
    const blacklistData = {
      userId: decoded.user_id,
      blacklistedAt: new Date().toISOString(),
      reason,
      tokenType: decoded.type || 'access'
    };

    const stored = await redisHelpers.set(blacklistKey, blacklistData, expiresIn);

    if (!stored) {
      throw new Error('Failed to blacklist token in Redis');
    }

    return true;
  } catch (error) {
    console.error('Blacklist token error:', error.message);
    throw error;
  }
};

/**
 * Check if a JWT token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} True if token is blacklisted, false otherwise
 */
export const isTokenBlacklisted = async (token) => {
  try {
    if (!token) {
      return false;
    }

    // Decode token to extract JTI
    const decoded = decodeToken(token);
    
    if (!decoded) {
      return false;
    }

    // Generate JTI if not present in token (use hash of token as fallback)
    const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');

    const blacklistKey = `blacklist:${jti}`;
    const exists = await redisHelpers.exists(blacklistKey);

    return exists;
  } catch (error) {
    console.error('Check token blacklist error:', error.message);
    // In case of error, assume token is not blacklisted to avoid blocking valid users
    return false;
  }
};

/**
 * Get blacklist information for a token
 * @param {string} token - JWT token
 * @returns {Promise<Object|null>} Blacklist data or null if not blacklisted
 */
export const getBlacklistInfo = async (token) => {
  try {
    if (!token) {
      return null;
    }

    // Decode token to extract JTI
    const decoded = decodeToken(token);
    
    if (!decoded) {
      return null;
    }

    // Generate JTI if not present in token
    const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');

    const blacklistKey = `blacklist:${jti}`;
    const blacklistData = await redisHelpers.get(blacklistKey);

    return blacklistData;
  } catch (error) {
    console.error('Get blacklist info error:', error.message);
    return null;
  }
};

/**
 * Remove a token from the blacklist (useful for testing or admin operations)
 * @param {string} token - JWT token to remove from blacklist
 * @returns {Promise<boolean>} Success status
 */
export const removeFromBlacklist = async (token) => {
  try {
    if (!token) {
      throw new Error('Token is required');
    }

    // Decode token to extract JTI
    const decoded = decodeToken(token);
    
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    // Generate JTI if not present in token
    const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');

    const blacklistKey = `blacklist:${jti}`;
    return await redisHelpers.del(blacklistKey);
  } catch (error) {
    console.error('Remove from blacklist error:', error.message);
    return false;
  }
};

/**
 * Blacklist multiple tokens at once (useful for logout-all functionality)
 * @param {Array<Object>} tokens - Array of token objects with { token, expiresIn, reason }
 * @returns {Promise<Object>} { success: number, failed: number }
 */
export const blacklistMultipleTokens = async (tokens) => {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('Valid tokens array is required');
    }

    let success = 0;
    let failed = 0;

    for (const tokenObj of tokens) {
      try {
        await blacklistToken(tokenObj.token, tokenObj.expiresIn, tokenObj.reason || 'logout-all');
        success++;
      } catch (error) {
        console.error(`Failed to blacklist token: ${error.message}`);
        failed++;
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('Blacklist multiple tokens error:', error.message);
    throw error;
  }
};

/**
 * Calculate remaining token lifetime in seconds
 * @param {string} token - JWT token
 * @returns {number} Remaining seconds (0 if expired or invalid)
 */
export const calculateTokenExpiry = (token) => {
  try {
    if (!token) {
      return 0;
    }

    const decoded = decodeToken(token);
    
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;

    return Math.max(0, expiresIn);
  } catch (error) {
    console.error('Calculate token expiry error:', error.message);
    return 0;
  }
};

export default {
  blacklistToken,
  isTokenBlacklisted,
  getBlacklistInfo,
  removeFromBlacklist,
  blacklistMultipleTokens,
  calculateTokenExpiry
};
