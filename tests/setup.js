// Test setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'; // 32 bytes for AES-256

// Use in-memory SQLite for testing to avoid needing a real database
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

// Use test Redis database
process.env.REDIS_DB = '15'; // Use a separate Redis DB for testing
