import { describe, test, expect } from '@jest/globals';
import { getPermissionsForRole, roleHasPermission } from '../../../src/services/rbacService.js';

describe('RBACService', () => {
  describe('getPermissionsForRole', () => {
    test('should return permissions for Student role', () => {
      const permissions = getPermissionsForRole('Student');
      
      expect(permissions).toBeDefined();
      expect(permissions.user).toContain('read_own');
      expect(permissions.profile).toContain('read_own');
      expect(permissions.profile).toContain('update_own');
    });

    test('should return permissions for Teacher role', () => {
      const permissions = getPermissionsForRole('Teacher');
      
      expect(permissions).toBeDefined();
      expect(permissions.user).toContain('read_own');
      expect(permissions.user).toContain('read_students');
      expect(permissions.student).toContain('read');
    });

    test('should return permissions for Parent role', () => {
      const permissions = getPermissionsForRole('Parent');
      
      expect(permissions).toBeDefined();
      expect(permissions.user).toContain('read_own');
      expect(permissions.user).toContain('read_children');
      expect(permissions.child).toContain('read');
    });

    test('should return permissions for Admin role', () => {
      const permissions = getPermissionsForRole('Admin');
      
      expect(permissions).toBeDefined();
      expect(permissions.user).toContain('read');
      expect(permissions.user).toContain('create');
      expect(permissions.user).toContain('update');
      expect(permissions.user).toContain('delete');
      expect(permissions.user).toContain('manage_status');
      expect(permissions.campus).toContain('manage_own');
    });

    test('should return permissions for Super_Admin role', () => {
      const permissions = getPermissionsForRole('Super_Admin');
      
      expect(permissions).toBeDefined();
      expect(permissions.user).toContain('read');
      expect(permissions.user).toContain('create');
      expect(permissions.user).toContain('update');
      expect(permissions.user).toContain('delete');
      expect(permissions.user).toContain('change_role');
      expect(permissions.user).toContain('change_campus');
      expect(permissions.campus).toContain('manage_all');
      expect(permissions.audit).toContain('read_all');
      expect(permissions.system).toContain('configure');
    });

    test('should throw error for invalid role', () => {
      expect(() => getPermissionsForRole('InvalidRole')).toThrow('Invalid role');
    });

    test('should throw error for null role', () => {
      expect(() => getPermissionsForRole(null)).toThrow('Role is required');
    });

    test('should throw error for undefined role', () => {
      expect(() => getPermissionsForRole(undefined)).toThrow('Role is required');
    });
  });

  describe('roleHasPermission', () => {
    test('should return true when role has permission', () => {
      const hasPermission = roleHasPermission('Admin', 'user', 'create');
      expect(hasPermission).toBe(true);
    });

    test('should return false when role does not have permission', () => {
      const hasPermission = roleHasPermission('Student', 'user', 'create');
      expect(hasPermission).toBe(false);
    });

    test('should return false for non-existent resource', () => {
      const hasPermission = roleHasPermission('Admin', 'nonexistent', 'read');
      expect(hasPermission).toBe(false);
    });

    test('should return false for invalid role', () => {
      const hasPermission = roleHasPermission('InvalidRole', 'user', 'read');
      expect(hasPermission).toBe(false);
    });

    test('should verify Student can read own profile', () => {
      const hasPermission = roleHasPermission('Student', 'profile', 'read_own');
      expect(hasPermission).toBe(true);
    });

    test('should verify Student cannot delete users', () => {
      const hasPermission = roleHasPermission('Student', 'user', 'delete');
      expect(hasPermission).toBe(false);
    });

    test('should verify Teacher can read students', () => {
      const hasPermission = roleHasPermission('Teacher', 'user', 'read_students');
      expect(hasPermission).toBe(true);
    });

    test('should verify Teacher cannot delete users', () => {
      const hasPermission = roleHasPermission('Teacher', 'user', 'delete');
      expect(hasPermission).toBe(false);
    });

    test('should verify Admin can manage users', () => {
      expect(roleHasPermission('Admin', 'user', 'create')).toBe(true);
      expect(roleHasPermission('Admin', 'user', 'update')).toBe(true);
      expect(roleHasPermission('Admin', 'user', 'delete')).toBe(true);
      expect(roleHasPermission('Admin', 'user', 'manage_status')).toBe(true);
    });

    test('should verify Admin cannot change user roles', () => {
      const hasPermission = roleHasPermission('Admin', 'user', 'change_role');
      expect(hasPermission).toBe(false);
    });

    test('should verify Super_Admin can change user roles', () => {
      const hasPermission = roleHasPermission('Super_Admin', 'user', 'change_role');
      expect(hasPermission).toBe(true);
    });

    test('should verify Super_Admin can manage all campuses', () => {
      const hasPermission = roleHasPermission('Super_Admin', 'campus', 'manage_all');
      expect(hasPermission).toBe(true);
    });

    test('should verify Super_Admin can read all audit logs', () => {
      const hasPermission = roleHasPermission('Super_Admin', 'audit', 'read_all');
      expect(hasPermission).toBe(true);
    });

    test('should verify Admin can only read own campus audit logs', () => {
      expect(roleHasPermission('Admin', 'audit', 'read_own_campus')).toBe(true);
      expect(roleHasPermission('Admin', 'audit', 'read_all')).toBe(false);
    });
  });
});
