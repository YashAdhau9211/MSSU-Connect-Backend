import { describe, test, expect, beforeAll } from '@jest/globals';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  generateTokens,
  decodeToken 
} from '../../../src/services/tokenService.js';

describe('TokenService', () => {
  const mockPayload = {
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'Student',
    campus_id: '123e4567-e89b-12d3-a456-426614174001',
    token_version: 0
  };

  describe('generateAccessToken', () => {
    test('should generate valid access token', () => {
      const token = generateAccessToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should include required fields in token payload', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = decodeToken(token);
      
      expect(decoded.user_id).toBe(mockPayload.user_id);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.campus_id).toBe(mockPayload.campus_id);
      expect(decoded.type).toBe('access');
    });

    test('should include expiration time', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = decodeToken(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    test('should throw error for missing user_id', () => {
      const invalidPayload = { email: 'test@example.com' };
      expect(() => generateAccessToken(invalidPayload)).toThrow();
    });

    test('should throw error for null payload', () => {
      expect(() => generateAccessToken(null)).toThrow();
    });

    test('should throw error for undefined payload', () => {
      expect(() => generateAccessToken(undefined)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should include token_version in payload', () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = decodeToken(token);
      
      expect(decoded.token_version).toBe(mockPayload.token_version);
      expect(decoded.type).toBe('refresh');
    });

    test('should default token_version to 0 if not provided', () => {
      const payloadWithoutVersion = { ...mockPayload };
      delete payloadWithoutVersion.token_version;
      
      const token = generateRefreshToken(payloadWithoutVersion);
      const decoded = decodeToken(token);
      
      expect(decoded.token_version).toBe(0);
    });

    test('should throw error for missing user_id', () => {
      const invalidPayload = { email: 'test@example.com' };
      expect(() => generateRefreshToken(invalidPayload)).toThrow();
    });
  });

  describe('verifyToken', () => {
    test('should verify valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.user_id).toBe(mockPayload.user_id);
      expect(decoded.email).toBe(mockPayload.email);
    });

    test('should verify valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.user_id).toBe(mockPayload.user_id);
      expect(decoded.token_version).toBe(mockPayload.token_version);
    });

    test('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    test('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow();
    });

    test('should throw error for null token', () => {
      expect(() => verifyToken(null)).toThrow();
    });

    test('should throw TOKEN_INVALID error code for malformed token', () => {
      try {
        verifyToken('invalid.token.here');
      } catch (error) {
        expect(error.code).toBe('TOKEN_INVALID');
      }
    });
  });

  describe('generateTokens', () => {
    test('should generate both access and refresh tokens', () => {
      const tokens = generateTokens(mockPayload);
      
      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    test('should generate different tokens', () => {
      const tokens = generateTokens(mockPayload);
      
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    test('should generate verifiable tokens', () => {
      const tokens = generateTokens(mockPayload);
      
      const decodedAccess = verifyToken(tokens.accessToken);
      const decodedRefresh = verifyToken(tokens.refreshToken);
      
      expect(decodedAccess.user_id).toBe(mockPayload.user_id);
      expect(decodedRefresh.user_id).toBe(mockPayload.user_id);
    });

    test('should throw error for invalid payload', () => {
      expect(() => generateTokens({})).toThrow();
    });
  });

  describe('decodeToken', () => {
    test('should decode valid token without verification', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.user_id).toBe(mockPayload.user_id);
      expect(decoded.email).toBe(mockPayload.email);
    });

    test('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token');
      expect(decoded).toBeNull();
    });

    test('should return null for empty token', () => {
      const decoded = decodeToken('');
      expect(decoded).toBeNull();
    });

    test('should return null for null token', () => {
      const decoded = decodeToken(null);
      expect(decoded).toBeNull();
    });
  });
});
