// Test database helper
// This file provides utilities for setting up and tearing down test database

import { sequelize } from '../../src/models/index.js';
import User from '../../src/models/User.js';
import Campus from '../../src/models/Campus.js';
import AuditLog from '../../src/models/AuditLog.js';

/**
 * Initialize test database
 * Creates tables and seeds initial data
 */
export const setupTestDb = async () => {
  try {
    // Sync database (create tables)
    await sequelize.sync({ force: true });
    
    // Seed test campuses
    await Campus.bulkCreate([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Test Campus 1',
        code: 'TC1',
        address: 'Test Address 1',
        contact_email: 'test1@example.com',
        contact_phone: '+919876543210',
        is_active: true
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Test Campus 2',
        code: 'TC2',
        address: 'Test Address 2',
        contact_email: 'test2@example.com',
        contact_phone: '+919876543211',
        is_active: true
      }
    ]);
    
    return true;
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

/**
 * Clean up test database
 * Drops all tables
 */
export const teardownTestDb = async () => {
  try {
    await sequelize.drop();
    await sequelize.close();
  } catch (error) {
    console.error('Error tearing down test database:', error);
  }
};

/**
 * Clear all data from tables (but keep structure)
 */
export const clearTestData = async () => {
  try {
    await AuditLog.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    // Don't clear campuses as they're needed for tests
  } catch (error) {
    console.error('Error clearing test data:', error);
  }
};

/**
 * Create a test user
 */
export const createTestUser = async (userData = {}) => {
  const defaultData = {
    email: 'test@example.com',
    phone: '+919876543210',
    password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456', // Pre-hashed password
    name: 'Test User',
    role: 'Student',
    campus_id: '11111111-1111-1111-1111-111111111111',
    account_status: 'active',
    failed_login_attempts: 0
  };
  
  return await User.create({ ...defaultData, ...userData });
};

/**
 * Create a test campus
 */
export const createTestCampus = async (campusData = {}) => {
  const defaultData = {
    name: 'Test Campus',
    code: 'TC',
    address: 'Test Address',
    contact_email: 'campus@example.com',
    contact_phone: '+919876543210',
    is_active: true
  };
  
  return await Campus.create({ ...defaultData, ...campusData });
};

export default {
  setupTestDb,
  teardownTestDb,
  clearTestData,
  createTestUser,
  createTestCampus
};
