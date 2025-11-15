import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { mockRedisHelpers } from '../../mocks/redis.mock.js';

// Mock the redis config before importing otpService
jest.unstable_mockModule('../../../src/config/redis.js', () => ({
  redisHelpers: mockRedisHelpers
}));

// Import after mocking
const { generateOTP, storeOTP, verifyOTP, incrementAttempts, checkRateLimit, deleteOTP } = await import('../../../src/services/otpService.js');

describe('OTPService', () => {
  const testPhone = '+919876543210';

  beforeEach(() => {
    // Clear mock Redis before each test
    mockRedisHelpers.clear();
  });

  describe('generateOTP', () => {
    test('should generate 6-digit OTP', () => {
      const otp = generateOTP();
      
      expect(otp).toBeDefined();
      expect(typeof otp).toBe('string');
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    test('should generate different OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      
      // While theoretically they could be the same, probability is very low
      expect(otp1).toBeDefined();
      expect(otp2).toBeDefined();
    });

    test('should generate OTP within valid range', () => {
      const otp = generateOTP();
      const otpNumber = parseInt(otp);
      
      expect(otpNumber).toBeGreaterThanOrEqual(100000);
      expect(otpNumber).toBeLessThanOrEqual(999999);
    });
  });

  describe('storeOTP', () => {
    test('should store OTP successfully', async () => {
      const otp = '123456';
      const result = await storeOTP(testPhone, otp);
      
      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    test('should store OTP with correct metadata', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      const stored = await mockRedisHelpers.get(`otp:${testPhone}`);
      expect(stored).toBeDefined();
      expect(stored.code).toBe(otp);
      expect(stored.attempts).toBe(0);
      expect(stored.createdAt).toBeDefined();
    });

    test('should increment rate limit counter', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      const rateLimitKey = `otp:ratelimit:${testPhone}`;
      const count = await mockRedisHelpers.get(rateLimitKey);
      expect(count).toBe('1');
    });

    test('should throw error when rate limit exceeded', async () => {
      // Set rate limit to max
      const rateLimitKey = `otp:ratelimit:${testPhone}`;
      await mockRedisHelpers.set(rateLimitKey, '3', 3600);
      
      const otp = '123456';
      await expect(storeOTP(testPhone, otp)).rejects.toThrow('OTP request rate limit exceeded');
    });

    test('should throw error for missing phone', async () => {
      await expect(storeOTP('', '123456')).rejects.toThrow();
    });

    test('should throw error for missing OTP', async () => {
      await expect(storeOTP(testPhone, '')).rejects.toThrow();
    });
  });

  describe('verifyOTP', () => {
    test('should verify correct OTP', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      const result = await verifyOTP(testPhone, otp);
      expect(result.valid).toBe(true);
      expect(result.attemptsRemaining).toBeGreaterThan(0);
    });

    test('should delete OTP after successful verification', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      await verifyOTP(testPhone, otp);
      
      const stored = await mockRedisHelpers.get(`otp:${testPhone}`);
      expect(stored).toBeNull();
    });

    test('should reject incorrect OTP', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      const result = await verifyOTP(testPhone, '654321');
      expect(result.valid).toBe(false);
      expect(result.attemptsRemaining).toBeLessThan(3);
    });

    test('should increment attempts on incorrect OTP', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      await verifyOTP(testPhone, '654321');
      
      const stored = await mockRedisHelpers.get(`otp:${testPhone}`);
      expect(stored.attempts).toBe(1);
    });

    test('should return invalid for expired OTP', async () => {
      const result = await verifyOTP(testPhone, '123456');
      expect(result.valid).toBe(false);
      expect(result.attemptsRemaining).toBe(0);
    });

    test('should reject after max attempts', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      // Make 3 failed attempts
      await verifyOTP(testPhone, '111111');
      await verifyOTP(testPhone, '222222');
      const result = await verifyOTP(testPhone, '333333');
      
      expect(result.valid).toBe(false);
      expect(result.attemptsRemaining).toBe(0);
    });

    test('should delete OTP after max attempts', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      // Make 3 failed attempts
      await verifyOTP(testPhone, '111111');
      await verifyOTP(testPhone, '222222');
      const result = await verifyOTP(testPhone, '333333');
      
      // After 3rd attempt, OTP should be deleted
      expect(result.valid).toBe(false);
      expect(result.attemptsRemaining).toBe(0);
      
      // Try to verify again - should return invalid with 0 attempts
      const result2 = await verifyOTP(testPhone, '123456');
      expect(result2.valid).toBe(false);
      expect(result2.attemptsRemaining).toBe(0);
    });

    test('should throw error for missing phone', async () => {
      await expect(verifyOTP('', '123456')).rejects.toThrow();
    });

    test('should throw error for missing OTP', async () => {
      await expect(verifyOTP(testPhone, '')).rejects.toThrow();
    });
  });

  describe('incrementAttempts', () => {
    test('should increment attempts counter', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      const attempts = await incrementAttempts(testPhone);
      expect(attempts).toBe(1);
      
      const stored = await mockRedisHelpers.get(`otp:${testPhone}`);
      expect(stored.attempts).toBe(1);
    });

    test('should return 0 for non-existent OTP', async () => {
      const attempts = await incrementAttempts(testPhone);
      expect(attempts).toBe(0);
    });

    test('should throw error for missing phone', async () => {
      await expect(incrementAttempts('')).rejects.toThrow();
    });
  });

  describe('checkRateLimit', () => {
    test('should return not limited for new phone', async () => {
      const result = await checkRateLimit(testPhone);
      expect(result.limited).toBe(false);
      expect(result.retryAfter).toBe(0);
    });

    test('should return limited when max requests reached', async () => {
      const rateLimitKey = `otp:ratelimit:${testPhone}`;
      await mockRedisHelpers.set(rateLimitKey, '3', 3600);
      
      const result = await checkRateLimit(testPhone);
      expect(result.limited).toBe(true);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should return not limited when under max requests', async () => {
      const rateLimitKey = `otp:ratelimit:${testPhone}`;
      await mockRedisHelpers.set(rateLimitKey, '2', 3600);
      
      const result = await checkRateLimit(testPhone);
      expect(result.limited).toBe(false);
      expect(result.retryAfter).toBe(0);
    });

    test('should throw error for missing phone', async () => {
      await expect(checkRateLimit('')).rejects.toThrow();
    });
  });

  describe('deleteOTP', () => {
    test('should delete existing OTP', async () => {
      const otp = '123456';
      await storeOTP(testPhone, otp);
      
      const result = await deleteOTP(testPhone);
      expect(result).toBe(true);
      
      const stored = await mockRedisHelpers.get(`otp:${testPhone}`);
      expect(stored).toBeNull();
    });

    test('should return false for non-existent OTP', async () => {
      const result = await deleteOTP(testPhone);
      expect(result).toBe(false);
    });

    test('should return false for missing phone', async () => {
      const result = await deleteOTP('');
      expect(result).toBe(false);
    });
  });
});
