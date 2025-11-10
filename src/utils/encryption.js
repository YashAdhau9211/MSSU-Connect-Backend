import crypto from 'crypto';
import config from '../config/env.js';

const ALGORITHM = config.encryption.algorithm;
const ENCRYPTION_KEY = Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32), 'utf-8');
const IV_LENGTH = 16;

/**
 * Encrypt plain text using AES-256-CBC
 * @param {string} plainText - Text to encrypt
 * @returns {string} Encrypted text in format: iv:encryptedData
 */
export const encrypt = (plainText) => {
  try {
    if (!plainText) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt cipher text using AES-256-CBC
 * @param {string} cipherText - Encrypted text in format: iv:encryptedData
 * @returns {string} Decrypted plain text
 */
export const decrypt = (cipherText) => {
  try {
    if (!cipherText) return null;
    
    const parts = cipherText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid cipher text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data');
  }
};

export default { encrypt, decrypt };
