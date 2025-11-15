import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { setupTestDb, teardownTestDb, clearTestData, createTestUser } from '../helpers/testDb.js';
import { hashPassword } from '../../src/services/passwordService.js';

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
    ttl: jest.fn().mockResolvedValue(-1)
  }
}));

const app = (await import('../../app.js')).default;

describe('Authentication API Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await setupTestDb();
  });

  afterAll(async () => {
    // Cleanup
    await teardownTestDb();
  });

  beforeEach(async () => {
    // Clear data before each test
    await clearTestData();
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login with valid credentials', async () => {
      // Create test user with known password
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'student@test.com',
        password_hash: passwordHash,
        role: 'Student'
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@test.com',
          password: password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('student@test.com');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    test('should reject invalid credentials', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'student@test.com',
        password_hash: passwordHash
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@test.com',
          password: 'WrongPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'TestPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should reject inactive account', async () => {
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'inactive@test.com',
        password_hash: passwordHash,
        account_status: 'inactive'
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@test.com',
          password: password
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_INACTIVE');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    test('should refresh access token with valid refresh token', async () => {
      // First login to get tokens
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'student@test.com',
        password_hash: passwordHash
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@test.com',
          password: password
        });

      const { refreshToken } = loginResponse.body.data;

      // Refresh the token
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.accessToken).not.toBe(loginResponse.body.data.accessToken);
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid.token.here'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    test('should logout successfully', async () => {
      // First login
      const password = 'TestPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'student@test.com',
        password_hash: passwordHash
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@test.com',
          password: password
        });

      const { accessToken } = loginResponse.body.data;

      // Logout
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
