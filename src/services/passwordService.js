import bcrypt from 'bcrypt';
import config from '../config/env.js';

const SALT_ROUNDS = config.security.bcryptSaltRounds || 10;

/**
 * Hash a plain text password using bcrypt
 * @param {string} plainPassword - Plain text password to hash
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (plainPassword) => {
  try {
    if (!plainPassword) {
      throw new Error('Password is required');
    }
    
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    console.error('Password hashing error:', error.message);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify a plain text password against a hashed password
 * @param {string} plainPassword - Plain text password to verify
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
export const verifyPassword = async (plainPassword, hashedPassword) => {
  try {
    if (!plainPassword || !hashedPassword) {
      return false;
    }
    
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Password verification error:', error.message);
    return false;
  }
};

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * 
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }
  
  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  hashPassword,
  verifyPassword,
  validatePasswordStrength
};
