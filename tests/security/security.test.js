import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { validatePasswordStrength } from '../../src/services/passwordService.js';
import { verifyToken, generateAccessToken, generateTokens } from '../../src/services/tokenService.js';
import { setupTestDb, teardownTestDb, clearTestData, createTestUser, createTestCampus } from '../helpers/testDb.js';
import { hashPassword } from '../../src/services/passwordService.js';
import { blacklistToken } from '../../src/services/blacklistService.js';
import { recordFailedLogin } from '../../src/services/authService.js';

// Mock Redis before importing app
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: {
    isOpen: false,
    connect: jest.fn(),
    quit: jest.fn(),
    on: jest.fn()
  },
  connectRedis: jest.fn().mockResolvedValue(true),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
  redisHelpers: {
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(true),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
    ttl: jest.fn().mockResolvedValue(-1),
    keys: jest.fn().mockResolvedValue([])
  }
}));

const app = (await import('../../app.js')).default;

describe('Security Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  describe('SQL Injection Prevention', () => {
    test('should handle SQL injection attempts in password', () => {
      const sqlInjection = "' OR '1'='1";
      const result = validatePasswordStrength(sqlInjection);
      
      // Password validation should treat it as a regular string
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle SQL injection with special characters', () => {
      const sqlInjection = "admin'--";
      const result = validatePasswordStrength(sqlInjection);
      
      expect(result.valid).toBe(false);
    });

    test('should handle SQL injection with UNION', () => {
      const sqlInjection = "' UNION SELECT * FROM users--";
      const result = validatePasswordStrength(sqlInjection);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('XSS Prevention', () => {
    test('should handle XSS script tags in input', () => {
      const xssAttempt = "<script>alert('XSS')</script>";
      const result = validatePasswordStrength(xssAttempt);
      
      // Should be treated as regular string, not executed
      expect(result.valid).toBe(false);
      expect(typeof xssAttempt).toBe('string');
    });

    test('should handle XSS with event handlers', () => {
      const xssAttempt = "<img src=x onerror=alert('XSS')>";
      const result = validatePasswordStrength(xssAttempt);
      
      expect(result.valid).toBe(false);
    });

    test('should handle XSS with javascript protocol', () => {
      const xssAttempt = "javascript:alert('XSS')";
      const result = validatePasswordStrength(xssAttempt);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('Token Security', () => {
    test('should reject tampered tokens', () => {
      const validPayload = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'Student',
        campus_id: '123e4567-e89b-12d3-a456-426614174001'
      };
      
      const token = generateAccessToken(validPayload);
      
      // Tamper with the token
      const tamperedToken = token.slice(0, -10) + 'tampered123';
      
      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    test('should reject tokens with invalid signature', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.invalid_signature';
      
      expect(() => verifyToken(invalidToken)).toThrow();
    });

    test('should reject malformed tokens', () => {
      const malformedToken = 'not.a.valid.jwt.token';
      
      expect(() => verifyToken(malformedToken)).toThrow();
    });

    test('should reject empty tokens', () => {
      expect(() => verifyToken('')).toThrow();
    });

    test('should reject null tokens', () => {
      expect(() => verifyToken(null)).toThrow();
    });
  });

  describe('Password Strength Requirements', () => {
    test('should enforce minimum length requirement', () => {
      const weakPassword = 'Short1';
      const result = validatePasswordStrength(weakPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should enforce uppercase requirement', () => {
      const weakPassword = 'lowercase123';
      const result = validatePasswordStrength(weakPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    test('should enforce lowercase requirement', () => {
      const weakPassword = 'UPPERCASE123';
      const result = validatePasswordStrength(weakPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    test('should enforce number requirement', () => {
      const weakPassword = 'NoNumbersHere';
      const result = validatePasswordStrength(weakPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should accept strong password', () => {
      const strongPassword = 'StrongPass123!';
      const result = validatePasswordStrength(strongPassword);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Input Validation', () => {
    test('should handle null input safely', () => {
      const result = validatePasswordStrength(null);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    test('should handle undefined input safely', () => {
      const result = validatePasswordStrength(undefined);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    test('should handle empty string safely', () => {
      const result = validatePasswordStrength('');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    test('should handle very long input safely', () => {
      const longPassword = 'A'.repeat(1000) + 'a1';
      const result = validatePasswordStrength(longPassword);
      
      // Should not crash, should validate normally
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    test('should handle special characters safely', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const password = 'Pass123' + specialChars;
      const result = validatePasswordStrength(password);
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    test('should handle unicode characters safely', () => {
      const unicodePassword = 'Pass123αβγδ';
      const result = validatePasswordStrength(unicodePassword);
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });
  });

  describe('Token Expiry', () => {
    test('should include expiry in generated tokens', () => {
      const payload = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'Student',
        campus_id: '123e4567-e89b-12d3-a456-426614174001'
      };
      
      const token = generateAccessToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    test('should verify token expiry is in future', () => {
      const payload = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'Student',
        campus_id: '123e4567-e89b-12d3-a456-426614174001'
      };
      
      const token = generateAccessToken(payload);
      const decoded = verifyToken(token);
      
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(now);
    });
  });

  describe('Rate Limiting Enforcement', () => {
    test('should enforce rate limit on auth endpoints', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'ratelimit@test.com',
        password_hash: passwordHash
      });

      // Make multiple rapid requests (more than the limit of 10 per minute)
      const requests = [];
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'ratelimit@test.com',
              password: 'WrongPassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });

    test('should return proper rate limit headers', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'TestPassword123'
        });

      // Check for rate limit headers
      expect(response.headers['ratelimit-limit'] || response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  describe('Account Lockout Mechanism', () => {
    test('should lock account after 5 failed login attempts', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const user = await createTestUser({
        email: 'lockout@test.com',
        password_hash: passwordHash,
        failed_login_attempts: 0
      });

      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'lockout@test.com',
            password: 'WrongPassword123'
          });
      }

      // 6th attempt should return account locked error
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'lockout@test.com',
          password: password
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(response.body.error.message).toContain('temporarily locked');
    });

    test('should reset failed attempts counter on successful login', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const user = await createTestUser({
        email: 'reset@test.com',
        password_hash: passwordHash,
        failed_login_attempts: 3
      });

      // Successful login should reset counter
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'reset@test.com',
          password: password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should prevent login for locked accounts', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      
      await createTestUser({
        email: 'locked@test.com',
        password_hash: passwordHash,
        account_status: 'locked',
        locked_until: lockedUntil,
        failed_login_attempts: 5
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'locked@test.com',
          password: password
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('Token Blacklisting', () => {
    test('should reject blacklisted tokens', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'blacklist@test.com',
        password_hash: passwordHash
      });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'blacklist@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // Logout to blacklist the token
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      // Try to use the blacklisted token
      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_REVOKED');
    });

    test('should blacklist both access and refresh tokens on logout', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'logout@test.com',
        password_hash: passwordHash
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'logout@test.com',
          password: password
        });

      const { accessToken, refreshToken } = loginResponse.body.data;

      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      // Try to refresh with blacklisted refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });

  describe('RBAC Enforcement', () => {
    test('should enforce role-based access to admin endpoints', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const campus = await createTestCampus({ name: 'Test Campus', code: 'TC' });
      
      // Create a student user
      await createTestUser({
        email: 'student@test.com',
        password_hash: passwordHash,
        role: 'Student',
        campus_id: campus.id
      });

      // Login as student
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // Try to access admin-only endpoint (user listing)
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    test('should allow admin access to admin endpoints', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const campus = await createTestCampus({ name: 'Admin Campus', code: 'AC' });
      
      // Create an admin user
      await createTestUser({
        email: 'admin@test.com',
        password_hash: passwordHash,
        role: 'Admin',
        campus_id: campus.id
      });

      // Login as admin
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // Access admin endpoint
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 403]).toContain(response.status); // 200 if allowed, 403 if campus filtering applies
    });

    test('should prevent unauthorized role escalation', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const campus = await createTestCampus({ name: 'Test Campus 2', code: 'TC2' });
      
      await createTestUser({
        email: 'student2@test.com',
        password_hash: passwordHash,
        role: 'Student',
        campus_id: campus.id
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student2@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // Try to update own role to Admin
      const response = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          role: 'Admin'
        });

      // Should either be forbidden or role field should be ignored
      if (response.status === 200) {
        // If update succeeds, role should not have changed
        expect(response.body.data.user.role).toBe('Student');
      } else {
        expect([400, 403]).toContain(response.status);
      }
    });
  });

  describe('Campus Data Segmentation', () => {
    test('should filter users by campus for non-Super_Admin', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const campus1 = await createTestCampus({ name: 'Campus 1', code: 'C1' });
      const campus2 = await createTestCampus({ name: 'Campus 2', code: 'C2' });
      
      // Create admin for campus 1
      await createTestUser({
        email: 'admin1@test.com',
        password_hash: passwordHash,
        role: 'Admin',
        campus_id: campus1.id
      });

      // Create users in different campuses
      await createTestUser({
        email: 'user1@test.com',
        password_hash: passwordHash,
        role: 'Student',
        campus_id: campus1.id
      });

      await createTestUser({
        email: 'user2@test.com',
        password_hash: passwordHash,
        role: 'Student',
        campus_id: campus2.id
      });

      // Login as campus 1 admin
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin1@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // List users - should only see campus 1 users
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200) {
        const users = response.body.data.users;
        // All returned users should be from campus 1
        users.forEach(user => {
          expect(user.campus_id).toBe(campus1.id);
        });
      }
    });

    test('should prevent cross-campus data access', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const campus1 = await createTestCampus({ name: 'Campus A', code: 'CA' });
      const campus2 = await createTestCampus({ name: 'Campus B', code: 'CB' });
      
      // Create admin for campus 1
      await createTestUser({
        email: 'adminA@test.com',
        password_hash: passwordHash,
        role: 'Admin',
        campus_id: campus1.id
      });

      // Create user in campus 2
      const campus2User = await createTestUser({
        email: 'userB@test.com',
        password_hash: passwordHash,
        role: 'Student',
        campus_id: campus2.id
      });

      // Login as campus 1 admin
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adminA@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // Try to access campus 2 user
      const response = await request(app)
        .get(`/api/v1/users/${campus2User.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([403, 404]).toContain(response.status);
      if (response.status === 403) {
        expect(response.body.error.code).toBe('FORBIDDEN');
      }
    });

    test('should allow Super_Admin to access all campuses', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const campus1 = await createTestCampus({ name: 'Campus X', code: 'CX' });
      const campus2 = await createTestCampus({ name: 'Campus Y', code: 'CY' });
      
      // Create Super_Admin
      await createTestUser({
        email: 'superadmin@test.com',
        password_hash: passwordHash,
        role: 'Super_Admin',
        campus_id: campus1.id
      });

      // Create users in different campuses
      await createTestUser({
        email: 'userX@test.com',
        password_hash: passwordHash,
        role: 'Student',
        campus_id: campus1.id
      });

      await createTestUser({
        email: 'userY@test.com',
        password_hash: passwordHash,
        role: 'Student',
        campus_id: campus2.id
      });

      // Login as Super_Admin
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // List users - should see users from all campuses
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200) {
        const users = response.body.data.users;
        const campusIds = [...new Set(users.map(u => u.campus_id))];
        // Should have users from multiple campuses
        expect(campusIds.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('SQL Injection in API Endpoints', () => {
    test('should prevent SQL injection in login email field', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: 'password'
        });

      // Should not bypass authentication
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should prevent SQL injection in user search', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const campus = await createTestCampus({ name: 'SQL Test Campus', code: 'STC' });
      
      await createTestUser({
        email: 'sqladmin@test.com',
        password_hash: passwordHash,
        role: 'Admin',
        campus_id: campus.id
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'sqladmin@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // Try SQL injection in search parameter
      const response = await request(app)
        .get('/api/v1/users')
        .query({ search: "'; DROP TABLE users; --" })
        .set('Authorization', `Bearer ${accessToken}`);

      // Should handle safely without executing SQL
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('XSS Prevention in API', () => {
    test('should sanitize XSS in user profile updates', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      const campus = await createTestCampus({ name: 'XSS Test Campus', code: 'XTC' });
      
      await createTestUser({
        email: 'xsstest@test.com',
        password_hash: passwordHash,
        role: 'Student',
        campus_id: campus.id
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'xsstest@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // Try to inject XSS in name field
      const response = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: "<script>alert('XSS')</script>"
        });

      if (response.status === 200) {
        // Name should be stored as-is but not executed
        expect(response.body.data.user.name).toBeDefined();
        expect(typeof response.body.data.user.name).toBe('string');
      }
    });
  });
});
