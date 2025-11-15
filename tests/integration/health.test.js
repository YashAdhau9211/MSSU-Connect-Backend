import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../app.js';
import { initializeConnections, closeAllConnections } from '../../src/config/index.js';

describe('Health Check Endpoints', () => {
  beforeAll(async () => {
    // Initialize database connections
    await initializeConnections();
  });

  afterAll(async () => {
    // Close all connections
    await closeAllConnections();
  });

  describe('GET /api/v1/health', () => {
    test('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body).toHaveProperty('message', 'API is running');
    });

    test('should respond quickly (< 100ms)', async () => {
      const startTime = Date.now();
      await request(app).get('/api/v1/health');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /api/v1/ready', () => {
    test('should return 200 when all systems are ready', async () => {
      const response = await request(app)
        .get('/api/v1/ready')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'ready');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('checks');
      expect(response.body.data.checks).toHaveProperty('database', true);
      expect(response.body.data.checks).toHaveProperty('redis', true);
      expect(response.body).toHaveProperty('message', 'All systems operational');
    });

    test('should check database connectivity', async () => {
      const response = await request(app).get('/api/v1/ready');

      expect(response.body.data.checks).toHaveProperty('database');
      expect(typeof response.body.data.checks.database).toBe('boolean');
    });

    test('should check redis connectivity', async () => {
      const response = await request(app).get('/api/v1/ready');

      expect(response.body.data.checks).toHaveProperty('redis');
      expect(typeof response.body.data.checks.redis).toBe('boolean');
    });
  });
});
