import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { setupTestDb, teardownTestDb, clearTestData, createTestUser, createTestCampus } from '../helpers/testDb.js';
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
    ttl: jest.fn().mockResolvedValue(-1),
    keys: jest.fn().mockResolvedValue([])
  }
}));

const app = (await import('../../app.js')).default;

describe('End-to-End Integration Tests', () => {
  let campusNM, campusTH;
  let superAdminToken, adminToken, studentToken;
  let superAdminUser, adminUser, studentUser;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestData();
    
    // Create test campuses
    campusNM = await createTestCampus({
      name: 'Navi Mumbai',
      code: 'NM',
      address: 'Navi Mumbai Address'
    });
    
    campusTH = await createTestCampus({
      name: 'Thane',
      code: 'TH',
      address: 'Thane Address'
    });
  });

  describe('Complete User Registration Flow', () => {
    test('should complete full user registration workflow', async () => {
      // Step 1: Create Super Admin
      const superAdminPassword = 'SuperAdmin123';
      const superAdminHash = await hashPassword(superAdminPassword);
      
      superAdminUser = await createTestUser({
        email: 'superadmin@mssu.edu',
        password_hash: superAdminHash,
        name: 'Super Admin',
        role: 'Super_Admin',
        campus_id: campusNM.id,
        account_status: 'active'
      });

      // Step 2: Super Admin logs in
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'superadmin@mssu.edu',
          password: superAdminPassword
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      superAdminToken = loginResponse.body.data.accessToken;

      // Step 3: Super Admin creates a new Admin user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'admin@mssu.edu',
          password: 'AdminPass123',
          name: 'Campus Admin',
          phone: '+919876543210',
          role: 'Admin',
          campus_id: campusNM.id
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe('admin@mssu.edu');
      expect(registerResponse.body.data.user.role).toBe('Admin');

      // Step 4: New Admin logs in
      const adminLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@mssu.edu',
          password: 'AdminPass123'
        });

      expect(adminLoginResponse.status).toBe(200);
      adminToken = adminLoginResponse.body.data.accessToken;

      // Step 5: Admin creates a Student
      const studentRegisterResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'student@mssu.edu',
          password: 'StudentPass123',
          name: 'Test Student',
          phone: '+919876543211',
          role: 'Student',
          campus_id: campusNM.id
        });

      expect(studentRegisterResponse.status).toBe(201);
      expect(studentRegisterResponse.body.data.user.role).toBe('Student');
    });

    test('should prevent duplicate email registration', async () => {
      const password = 'TestPass123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'existing@mssu.edu',
        password_hash: passwordHash,
        role: 'Super_Admin',
        campus_id: campusNM.id
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'existing@mssu.edu',
          password: password
        });

      const token = loginResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'existing@mssu.edu',
          password: 'NewPass123',
          name: 'Duplicate User',
          phone: '+919876543212',
          role: 'Student',
          campus_id: campusNM.id
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('Complete Authentication Flows', () => {
    beforeEach(async () => {
      // Create test users for authentication tests
      const studentPassword = 'StudentPass123';
      const studentHash = await hashPassword(studentPassword);
      
      studentUser = await createTestUser({
        email: 'student@mssu.edu',
        password_hash: studentHash,
        name: 'Test Student',
        phone: '+919876543210',
        role: 'Student',
        campus_id: campusNM.id,
        account_status: 'active'
      });
    });

    test('should complete password authentication flow', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@mssu.edu',
          password: 'StudentPass123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data).toHaveProperty('refreshToken');
      
      const { accessToken, refreshToken } = loginResponse.body.data;

      // Access protected resource
      const profileResponse = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.user.email).toBe('student@mssu.edu');

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data).toHaveProperty('accessToken');

      // Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);
    });

    test('should handle OTP authentication flow', async () => {
      // Request OTP
      const otpRequestResponse = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({
          phone: '+919876543210'
        });

      expect(otpRequestResponse.status).toBe(200);
      expect(otpRequestResponse.body.success).toBe(true);

      // Note: In real scenario, OTP would be sent via SMS
      // For testing, we would need to mock the OTP verification
    });

    test('should enforce account lockout after failed attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'student@mssu.edu',
            password: 'WrongPassword123'
          });
      }

      // Next attempt should be locked
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@mssu.edu',
          password: 'StudentPass123'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('Complete Password Reset Flow', () => {
    beforeEach(async () => {
      const password = 'OldPassword123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'resetuser@mssu.edu',
        password_hash: passwordHash,
        name: 'Reset User',
        role: 'Student',
        campus_id: campusNM.id
      });
    });

    test('should complete password reset workflow', async () => {
      // Step 1: Request password reset
      const forgotResponse = await request(app)
        .post('/api/v1/auth/password/forgot')
        .send({
          email: 'resetuser@mssu.edu'
        });

      expect(forgotResponse.status).toBe(200);
      expect(forgotResponse.body.success).toBe(true);

      // Note: In real scenario, reset token would be sent via email
      // For complete E2E, we would need to extract token from email mock
    });

    test('should allow authenticated user to change password', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'resetuser@mssu.edu',
          password: 'OldPassword123'
        });

      const token = loginResponse.body.data.accessToken;

      // Change password
      const changeResponse = await request(app)
        .put('/api/v1/profile/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'OldPassword123',
          newPassword: 'NewPassword123'
        });

      expect(changeResponse.status).toBe(200);

      // Verify new password works
      const newLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'resetuser@mssu.edu',
          password: 'NewPassword123'
        });

      expect(newLoginResponse.status).toBe(200);
    });
  });

  describe('User Management Workflows', () => {
    beforeEach(async () => {
      // Create admin user
      const adminPassword = 'AdminPass123';
      const adminHash = await hashPassword(adminPassword);
      
      adminUser = await createTestUser({
        email: 'admin@mssu.edu',
        password_hash: adminHash,
        name: 'Campus Admin',
        role: 'Admin',
        campus_id: campusNM.id
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@mssu.edu',
          password: adminPassword
        });

      adminToken = loginResponse.body.data.accessToken;
    });

    test('should complete user CRUD workflow', async () => {
      // Create user
      const createResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newstudent@mssu.edu',
          password: 'StudentPass123',
          name: 'New Student',
          phone: '+919876543220',
          role: 'Student',
          campus_id: campusNM.id
        });

      expect(createResponse.status).toBe(201);
      const userId = createResponse.body.data.user.id;

      // Read user
      const getResponse = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.user.email).toBe('newstudent@mssu.edu');

      // Update user
      const updateResponse = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Student Name'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.user.name).toBe('Updated Student Name');

      // List users
      const listResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.users.length).toBeGreaterThan(0);
    });

    test('should manage user account status', async () => {
      // Create user
      const createResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'statustest@mssu.edu',
          password: 'TestPass123',
          name: 'Status Test User',
          phone: '+919876543221',
          role: 'Student',
          campus_id: campusNM.id
        });

      const userId = createResponse.body.data.user.id;

      // Deactivate user
      const deactivateResponse = await request(app)
        .patch(`/api/v1/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
          reason: 'Testing deactivation'
        });

      expect(deactivateResponse.status).toBe(200);

      // Verify user cannot login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'statustest@mssu.edu',
          password: 'TestPass123'
        });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.body.error.code).toBe('ACCOUNT_INACTIVE');

      // Reactivate user
      const activateResponse = await request(app)
        .patch(`/api/v1/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'active',
          reason: 'Testing reactivation'
        });

      expect(activateResponse.status).toBe(200);

      // Verify user can login again
      const newLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'statustest@mssu.edu',
          password: 'TestPass123'
        });

      expect(newLoginResponse.status).toBe(200);
    });
  });

  describe('RBAC Enforcement Across All Endpoints', () => {
    let studentToken, teacherToken, adminToken, superAdminToken;
    let studentUser, teacherUser, adminUser, superAdminUser;

    beforeEach(async () => {
      // Create users with different roles
      const password = 'TestPass123';
      const passwordHash = await hashPassword(password);

      studentUser = await createTestUser({
        email: 'student@mssu.edu',
        password_hash: passwordHash,
        name: 'Student User',
        role: 'Student',
        campus_id: campusNM.id
      });

      teacherUser = await createTestUser({
        email: 'teacher@mssu.edu',
        password_hash: passwordHash,
        name: 'Teacher User',
        role: 'Teacher',
        campus_id: campusNM.id
      });

      adminUser = await createTestUser({
        email: 'admin@mssu.edu',
        password_hash: passwordHash,
        name: 'Admin User',
        role: 'Admin',
        campus_id: campusNM.id
      });

      superAdminUser = await createTestUser({
        email: 'superadmin@mssu.edu',
        password_hash: passwordHash,
        name: 'Super Admin User',
        role: 'Super_Admin',
        campus_id: campusNM.id
      });

      // Login all users
      const studentLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@mssu.edu', password });
      studentToken = studentLogin.body.data.accessToken;

      const teacherLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'teacher@mssu.edu', password });
      teacherToken = teacherLogin.body.data.accessToken;

      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@mssu.edu', password });
      adminToken = adminLogin.body.data.accessToken;

      const superAdminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@mssu.edu', password });
      superAdminToken = superAdminLogin.body.data.accessToken;
    });

    test('should enforce role-based access to user registration', async () => {
      // Student cannot register users
      const studentResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'newuser@mssu.edu',
          password: 'Pass123',
          name: 'New User',
          phone: '+919876543222',
          role: 'Student',
          campus_id: campusNM.id
        });

      expect(studentResponse.status).toBe(403);

      // Teacher cannot register users
      const teacherResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          email: 'newuser@mssu.edu',
          password: 'Pass123',
          name: 'New User',
          phone: '+919876543222',
          role: 'Student',
          campus_id: campusNM.id
        });

      expect(teacherResponse.status).toBe(403);

      // Admin can register users
      const adminResponse = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@mssu.edu',
          password: 'Pass123',
          name: 'New User',
          phone: '+919876543222',
          role: 'Student',
          campus_id: campusNM.id
        });

      expect(adminResponse.status).toBe(201);
    });

    test('should enforce role-based access to user listing', async () => {
      // Student cannot list users
      const studentResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentResponse.status).toBe(403);

      // Admin can list users
      const adminResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(200);
    });

    test('should allow users to access their own profile', async () => {
      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('student@mssu.edu');
    });

    test('should enforce role-based access to audit logs', async () => {
      // Student cannot access audit logs
      const studentResponse = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentResponse.status).toBe(403);

      // Admin cannot access audit logs
      const adminResponse = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(403);

      // Super Admin can access audit logs
      const superAdminResponse = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(superAdminResponse.status).toBe(200);
    });
  });

  describe('Multi-Campus Data Segmentation', () => {
    let adminNMToken, adminTHToken, superAdminToken;
    let studentNM, studentTH;

    beforeEach(async () => {
      const password = 'TestPass123';
      const passwordHash = await hashPassword(password);

      // Create admins for different campuses
      const adminNM = await createTestUser({
        email: 'admin.nm@mssu.edu',
        password_hash: passwordHash,
        name: 'NM Admin',
        role: 'Admin',
        campus_id: campusNM.id
      });

      const adminTH = await createTestUser({
        email: 'admin.th@mssu.edu',
        password_hash: passwordHash,
        name: 'TH Admin',
        role: 'Admin',
        campus_id: campusTH.id
      });

      const superAdmin = await createTestUser({
        email: 'superadmin@mssu.edu',
        password_hash: passwordHash,
        name: 'Super Admin',
        role: 'Super_Admin',
        campus_id: campusNM.id
      });

      // Create students in different campuses
      studentNM = await createTestUser({
        email: 'student.nm@mssu.edu',
        password_hash: passwordHash,
        name: 'NM Student',
        role: 'Student',
        campus_id: campusNM.id
      });

      studentTH = await createTestUser({
        email: 'student.th@mssu.edu',
        password_hash: passwordHash,
        name: 'TH Student',
        role: 'Student',
        campus_id: campusTH.id
      });

      // Login admins
      const nmLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin.nm@mssu.edu', password });
      adminNMToken = nmLogin.body.data.accessToken;

      const thLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin.th@mssu.edu', password });
      adminTHToken = thLogin.body.data.accessToken;

      const superLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@mssu.edu', password });
      superAdminToken = superLogin.body.data.accessToken;
    });

    test('should restrict admin to their own campus users', async () => {
      // NM Admin lists users - should only see NM campus users
      const nmResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminNMToken}`);

      expect(nmResponse.status).toBe(200);
      const nmUsers = nmResponse.body.data.users;
      
      // All users should be from NM campus
      nmUsers.forEach(user => {
        expect(user.campus_id).toBe(campusNM.id);
      });

      // TH Admin lists users - should only see TH campus users
      const thResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminTHToken}`);

      expect(thResponse.status).toBe(200);
      const thUsers = thResponse.body.data.users;
      
      // All users should be from TH campus
      thUsers.forEach(user => {
        expect(user.campus_id).toBe(campusTH.id);
      });
    });

    test('should prevent admin from accessing other campus users', async () => {
      // NM Admin tries to access TH student
      const response = await request(app)
        .get(`/api/v1/users/${studentTH.id}`)
        .set('Authorization', `Bearer ${adminNMToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    test('should allow Super Admin to access all campuses', async () => {
      // Super Admin can access NM student
      const nmResponse = await request(app)
        .get(`/api/v1/users/${studentNM.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(nmResponse.status).toBe(200);

      // Super Admin can access TH student
      const thResponse = await request(app)
        .get(`/api/v1/users/${studentTH.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(thResponse.status).toBe(200);

      // Super Admin can list all users
      const listResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(listResponse.status).toBe(200);
      const allUsers = listResponse.body.data.users;
      
      // Should have users from both campuses
      const campusIds = [...new Set(allUsers.map(u => u.campus_id))];
      expect(campusIds.length).toBeGreaterThan(1);
    });

    test('should enforce campus filtering in user creation', async () => {
      // NM Admin tries to create user in TH campus
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminNMToken}`)
        .send({
          email: 'newstudent@mssu.edu',
          password: 'Pass123',
          name: 'New Student',
          phone: '+919876543230',
          role: 'Student',
          campus_id: campusTH.id
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Session Management', () => {
    let userToken, userId;

    beforeEach(async () => {
      const password = 'TestPass123';
      const passwordHash = await hashPassword(password);
      
      const user = await createTestUser({
        email: 'sessionuser@mssu.edu',
        password_hash: passwordHash,
        name: 'Session User',
        role: 'Student',
        campus_id: campusNM.id
      });

      userId = user.id;

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'sessionuser@mssu.edu',
          password: password
        });

      userToken = loginResponse.body.data.accessToken;
    });

    test('should list active sessions', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('sessions');
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
    });

    test('should logout from all devices', async () => {
      // Logout from all devices
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(logoutResponse.status).toBe(200);

      // Token should no longer work
      const profileResponse = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(profileResponse.status).toBe(401);
    });
  });

  describe('Profile Management', () => {
    let userToken;

    beforeEach(async () => {
      const password = 'TestPass123';
      const passwordHash = await hashPassword(password);
      
      await createTestUser({
        email: 'profileuser@mssu.edu',
        password_hash: passwordHash,
        name: 'Profile User',
        role: 'Student',
        campus_id: campusNM.id
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'profileuser@mssu.edu',
          password: password
        });

      userToken = loginResponse.body.data.accessToken;
    });

    test('should get and update profile', async () => {
      // Get profile
      const getResponse = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.user.name).toBe('Profile User');

      // Update profile
      const updateResponse = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Profile User',
          address: '123 Test Street'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.user.name).toBe('Updated Profile User');

      // Verify update
      const verifyResponse = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(verifyResponse.body.data.user.name).toBe('Updated Profile User');
    });
  });
});
