import crypto from 'crypto';
import { redisHelpers } from '../config/redis.js';
import config from '../config/env.js';

const MFA_EXPIRY_SECONDS = 300; // 5 minutes
const MAX_MFA_ATTEMPTS = 3;

/**
 * Generate a random 6-digit MFA code
 * @returns {string} 6-digit MFA code
 */
export const generateMFACode = () => {
  try {
    // Generate a random 6-digit number using crypto.randomInt for cryptographic security
    const code = crypto.randomInt(100000, 999999).toString();
    return code;
  } catch (error) {
    console.error('MFA code generation error:', error.message);
    throw new Error('Failed to generate MFA code');
  }
};

/**
 * Send MFA code to user via email or SMS
 * @param {string} userId - User ID
 * @param {string} method - Delivery method ('email' or 'sms')
 * @returns {Promise<Object>} { success: boolean, expiresAt: Date }
 */
export const sendMFACode = async (userId, method) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!method || !['email', 'sms'].includes(method)) {
      throw new Error('Invalid method. Must be "email" or "sms"');
    }

    // Generate MFA code
    const code = generateMFACode();

    // Store MFA code in Redis
    const mfaKey = `mfa:${userId}`;
    const mfaData = {
      code,
      method,
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    const stored = await redisHelpers.set(mfaKey, mfaData, MFA_EXPIRY_SECONDS);

    if (!stored) {
      throw new Error('Failed to store MFA code in Redis');
    }

    // TODO: Integrate with email/SMS service to send the code
    // For now, we'll log it (in production, this should be removed)
    if (config.nodeEnv === 'development') {
      console.log(`[DEV] MFA Code for user ${userId}: ${code} (via ${method})`);
    }

    // In production, call the appropriate service:
    // if (method === 'email') {
    //   await emailService.sendMFAEmail(userEmail, code);
    // } else if (method === 'sms') {
    //   await smsService.sendSMS(userPhone, `Your MFA code is: ${code}`);
    // }

    const expiresAt = new Date(Date.now() + (MFA_EXPIRY_SECONDS * 1000));

    return {
      success: true,
      expiresAt,
      method
    };
  } catch (error) {
    console.error('Send MFA code error:', error.message);
    throw error;
  }
};

/**
 * Verify MFA code against stored value
 * @param {string} userId - User ID
 * @param {string} code - MFA code to verify
 * @returns {Promise<Object>} { valid: boolean, attemptsRemaining: number }
 */
export const verifyMFACode = async (userId, code) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!code) {
      throw new Error('MFA code is required');
    }

    const mfaKey = `mfa:${userId}`;
    const mfaData = await redisHelpers.get(mfaKey);

    // Check if MFA code exists
    if (!mfaData) {
      const error = new Error('MFA code not found or expired');
      error.code = 'MFA_EXPIRED';
      return { valid: false, attemptsRemaining: 0 };
    }

    // Check if max attempts exceeded
    if (mfaData.attempts >= MAX_MFA_ATTEMPTS) {
      // Delete MFA code after max attempts
      await redisHelpers.del(mfaKey);
      const error = new Error('Maximum MFA verification attempts exceeded');
      error.code = 'MFA_MAX_ATTEMPTS';
      return { valid: false, attemptsRemaining: 0 };
    }

    // Verify MFA code
    if (mfaData.code === code) {
      // MFA code is valid, delete it from Redis
      await redisHelpers.del(mfaKey);
      return { 
        valid: true, 
        attemptsRemaining: MAX_MFA_ATTEMPTS - mfaData.attempts,
        method: mfaData.method
      };
    } else {
      // MFA code is invalid, increment attempts
      await incrementMFAAttempts(userId);
      const attemptsRemaining = MAX_MFA_ATTEMPTS - (mfaData.attempts + 1);
      
      return { 
        valid: false, 
        attemptsRemaining: Math.max(0, attemptsRemaining)
      };
    }
  } catch (error) {
    console.error('Verify MFA code error:', error.message);
    throw error;
  }
};

/**
 * Increment MFA verification attempts
 * @param {string} userId - User ID
 * @returns {Promise<number>} Updated attempt count
 */
export const incrementMFAAttempts = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const mfaKey = `mfa:${userId}`;
    const mfaData = await redisHelpers.get(mfaKey);

    if (!mfaData) {
      return 0;
    }

    // Increment attempts
    mfaData.attempts += 1;

    // Get remaining TTL to preserve expiry
    const ttl = await redisHelpers.ttl(mfaKey);
    
    if (ttl > 0) {
      // Update MFA data with incremented attempts, preserving TTL
      await redisHelpers.set(mfaKey, mfaData, ttl);
    }

    return mfaData.attempts;
  } catch (error) {
    console.error('Increment MFA attempts error:', error.message);
    throw error;
  }
};

/**
 * Delete MFA code for a user (useful for cleanup or testing)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteMFACode = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const mfaKey = `mfa:${userId}`;
    return await redisHelpers.del(mfaKey);
  } catch (error) {
    console.error('Delete MFA code error:', error.message);
    return false;
  }
};

/**
 * Check if MFA code exists for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { exists: boolean, expiresIn: number, attemptsRemaining: number }
 */
export const checkMFAStatus = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const mfaKey = `mfa:${userId}`;
    const mfaData = await redisHelpers.get(mfaKey);

    if (!mfaData) {
      return { 
        exists: false, 
        expiresIn: 0, 
        attemptsRemaining: 0 
      };
    }

    const ttl = await redisHelpers.ttl(mfaKey);
    const attemptsRemaining = MAX_MFA_ATTEMPTS - mfaData.attempts;

    return {
      exists: true,
      expiresIn: ttl,
      attemptsRemaining: Math.max(0, attemptsRemaining),
      method: mfaData.method
    };
  } catch (error) {
    console.error('Check MFA status error:', error.message);
    throw error;
  }
};

export default {
  generateMFACode,
  sendMFACode,
  verifyMFACode,
  incrementMFAAttempts,
  deleteMFACode,
  checkMFAStatus
};
