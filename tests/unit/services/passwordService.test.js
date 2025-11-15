import { describe, test, expect, beforeAll } from '@jest/globals';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../../src/services/passwordService.js';

describe('PasswordService', () => {
  describe('hashPassword', () => {
    test('should hash a valid password', async () => {
      const plainPassword = 'TestPassword123';
      const hashedPassword = await hashPassword(plainPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    test('should generate different hashes for same password', async () => {
      const plainPassword = 'TestPassword123';
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);
      
      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    });

    test('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    test('should throw error for null password', async () => {
      await expect(hashPassword(null)).rejects.toThrow();
    });

    test('should throw error for undefined password', async () => {
      await expect(hashPassword(undefined)).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      const plainPassword = 'TestPassword123';
      const hashedPassword = await hashPassword(plainPassword);
      
      const isValid = await verifyPassword(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const plainPassword = 'TestPassword123';
      const wrongPassword = 'WrongPassword456';
      const hashedPassword = await hashPassword(plainPassword);
      
      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    test('should return false for empty password', async () => {
      const hashedPassword = await hashPassword('TestPassword123');
      const isValid = await verifyPassword('', hashedPassword);
      expect(isValid).toBe(false);
    });

    test('should return false for null password', async () => {
      const hashedPassword = await hashPassword('TestPassword123');
      const isValid = await verifyPassword(null, hashedPassword);
      expect(isValid).toBe(false);
    });

    test('should return false for empty hash', async () => {
      const isValid = await verifyPassword('TestPassword123', '');
      expect(isValid).toBe(false);
    });

    test('should return false for invalid hash format', async () => {
      const isValid = await verifyPassword('TestPassword123', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    test('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1A');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    test('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    test('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumbersHere');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should return multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    test('should reject empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    test('should reject null password', () => {
      const result = validatePasswordStrength(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    test('should accept password with special characters', () => {
      const result = validatePasswordStrength('Strong@Pass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
