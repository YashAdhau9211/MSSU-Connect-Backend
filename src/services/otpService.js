import crypto from 'crypto';
import { redisHelpers } from '../config/redis.js';
import config from '../config/env.js';

const OTP_EXPIRY_SECONDS = Math.floor(config.security.otpExpiry / 1000); // Convert ms to seconds (300s = 5 minutes)
const MAX_OTP_ATTEMPTS = 3;
const OTP_RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const MAX_OTP_REQUESTS_PER_HOUR = 3;

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
  try {
    // Generate a random 6-digit number using crypto.randomInt for cryptographic security
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
  } catch (error) {
    console.error('OTP generation error:', error.message);
    throw new Error('Failed to generate OTP');
  }
};

/**
 * Store OTP in Redis with expiry and attempt tracking
 * @param {string} phone - Phone number (with country code)
 * @param {string} otp - Generated OTP
 * @returns {Promise<Object>} { success: boolean, expiresAt: Date }
 */
export const storeOTP = async (phone, otp) => {
  try {
    if (!phone || !otp) {
      throw new Error('Phone number and OTP are required');
    }

    // Check rate limiting before storing new OTP
    const rateLimitKey = `otp:ratelimit:${phone}`;
    const requestCount = await redisHelpers.get(rateLimitKey);
    
    if (requestCount && parseInt(requestCount) >= MAX_OTP_REQUESTS_PER_HOUR) {
      const ttl = await redisHelpers.ttl(rateLimitKey);
      const error = new Error('OTP request rate limit exceeded. Please try again later.');
      error.code = 'OTP_RATE_LIMIT';
      error.retryAfter = ttl;
      throw error;
    }

    // Store OTP with metadata
    const otpKey = `otp:${phone}`;
    const otpData = {
      code: otp,
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    const stored = await redisHelpers.set(otpKey, otpData, OTP_EXPIRY_SECONDS);
    
    if (!stored) {
      throw new Error('Failed to store OTP in Redis');
    }

    // Increment rate limit counter
    const currentCount = await redisHelpers.incr(rateLimitKey);
    
    // Set expiry on rate limit key if it's the first request
    if (currentCount === 1) {
      await redisHelpers.expire(rateLimitKey, OTP_RATE_LIMIT_WINDOW);
    }

    const expiresAt = new Date(Date.now() + (OTP_EXPIRY_SECONDS * 1000));

    return {
      success: true,
      expiresAt
    };
  } catch (error) {
    console.error('Store OTP error:', error.message);
    throw error;
  }
};

/**
 * Verify OTP against stored value
 * @param {string} phone - Phone number (with country code)
 * @param {string} otp - OTP to verify
 * @returns {Promise<Object>} { valid: boolean, attemptsRemaining: number }
 */
export const verifyOTP = async (phone, otp) => {
  try {
    if (!phone || !otp) {
      throw new Error('Phone number and OTP are required');
    }

    const otpKey = `otp:${phone}`;
    const otpData = await redisHelpers.get(otpKey);

    // Check if OTP exists
    if (!otpData) {
      const error = new Error('OTP not found or expired');
      error.code = 'OTP_EXPIRED';
      return { valid: false, attemptsRemaining: 0 };
    }

    // Check if max attempts exceeded
    if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
      // Delete OTP after max attempts
      await redisHelpers.del(otpKey);
      const error = new Error('Maximum OTP verification attempts exceeded');
      error.code = 'OTP_MAX_ATTEMPTS';
      return { valid: false, attemptsRemaining: 0 };
    }

    // Verify OTP
    if (otpData.code === otp) {
      // OTP is valid, delete it from Redis
      await redisHelpers.del(otpKey);
      return { valid: true, attemptsRemaining: MAX_OTP_ATTEMPTS - otpData.attempts };
    } else {
      // OTP is invalid, increment attempts
      await incrementAttempts(phone);
      const attemptsRemaining = MAX_OTP_ATTEMPTS - (otpData.attempts + 1);
      
      return { 
        valid: false, 
        attemptsRemaining: Math.max(0, attemptsRemaining)
      };
    }
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    throw error;
  }
};

/**
 * Increment OTP verification attempts
 * @param {string} phone - Phone number (with country code)
 * @returns {Promise<number>} Updated attempt count
 */
export const incrementAttempts = async (phone) => {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    const otpKey = `otp:${phone}`;
    const otpData = await redisHelpers.get(otpKey);

    if (!otpData) {
      return 0;
    }

    // Increment attempts
    otpData.attempts += 1;

    // Get remaining TTL to preserve expiry
    const ttl = await redisHelpers.ttl(otpKey);
    
    if (ttl > 0) {
      // Update OTP data with incremented attempts, preserving TTL
      await redisHelpers.set(otpKey, otpData, ttl);
    }

    return otpData.attempts;
  } catch (error) {
    console.error('Increment attempts error:', error.message);
    throw error;
  }
};

/**
 * Check if phone number has exceeded rate limit
 * @param {string} phone - Phone number (with country code)
 * @returns {Promise<Object>} { limited: boolean, retryAfter: number }
 */
export const checkRateLimit = async (phone) => {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    const rateLimitKey = `otp:ratelimit:${phone}`;
    const requestCount = await redisHelpers.get(rateLimitKey);

    if (!requestCount) {
      return { limited: false, retryAfter: 0 };
    }

    const count = parseInt(requestCount);
    
    if (count >= MAX_OTP_REQUESTS_PER_HOUR) {
      const ttl = await redisHelpers.ttl(rateLimitKey);
      return { limited: true, retryAfter: ttl };
    }

    return { limited: false, retryAfter: 0 };
  } catch (error) {
    console.error('Check rate limit error:', error.message);
    throw error;
  }
};

/**
 * Delete OTP for a phone number (useful for cleanup or testing)
 * @param {string} phone - Phone number (with country code)
 * @returns {Promise<boolean>} Success status
 */
export const deleteOTP = async (phone) => {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    const otpKey = `otp:${phone}`;
    return await redisHelpers.del(otpKey);
  } catch (error) {
    console.error('Delete OTP error:', error.message);
    return false;
  }
};

export default {
  generateOTP,
  storeOTP,
  verifyOTP,
  incrementAttempts,
  checkRateLimit,
  deleteOTP
};
