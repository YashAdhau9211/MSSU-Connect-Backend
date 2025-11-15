import User from '../models/User.js';
import Campus from '../models/Campus.js';

/**
 * Permission matrix defining what each role can do
 * Structure: { role: { resource: [actions] } }
 */
const PERMISSION_MATRIX = {
  Student: {
    user: ['read_own'],
    profile: ['read_own', 'update_own'],
    session: ['read_own', 'delete_own'],
  },
  Teacher: {
    user: ['read_own', 'read_students'],
    profile: ['read_own', 'update_own'],
    session: ['read_own', 'delete_own'],
    student: ['read'], // Can view students in their classes
  },
  Parent: {
    user: ['read_own', 'read_children'],
    profile: ['read_own', 'update_own'],
    session: ['read_own', 'delete_own'],
    child: ['read'], // Can view their children's data
  },
  Admin: {
    user: ['read', 'create', 'update', 'delete', 'manage_status'],
    profile: ['read', 'update'],
    session: ['read', 'delete'],
    campus: ['read', 'manage_own'],
    audit: ['read_own_campus'],
  },
  Super_Admin: {
    user: ['read', 'create', 'update', 'delete', 'manage_status', 'change_role', 'change_campus'],
    profile: ['read', 'update'],
    session: ['read', 'delete'],
    campus: ['read', 'create', 'update', 'manage_all'],
    audit: ['read', 'read_all'],
    system: ['configure', 'manage'],
  },
};

/**
 * Get permissions for a specific role
 * @param {string} role - User role (Student, Teacher, Parent, Admin, Super_Admin)
 * @returns {Object} Permission object mapping resources to allowed actions
 */
export const getPermissionsForRole = (role) => {
  if (!role) {
    throw new Error('Role is required');
  }

  const permissions = PERMISSION_MATRIX[role];
  
  if (!permissions) {
    throw new Error(`Invalid role: ${role}`);
  }

  return permissions;
};

/**
 * Check if a role has permission to perform an action on a resource
 * @param {string} role - User role
 * @param {string} resource - Resource type (user, profile, session, etc.)
 * @param {string} action - Action to perform (read, create, update, delete, etc.)
 * @returns {boolean} True if role has permission, false otherwise
 */
export const roleHasPermission = (role, resource, action) => {
  try {
    const permissions = getPermissionsForRole(role);
    
    if (!permissions[resource]) {
      return false;
    }

    return permissions[resource].includes(action);
  } catch (error) {
    console.error('Error checking role permission:', error.message);
    return false;
  }
};

/**
 * Check if a user can access a specific campus
 * @param {string} userId - User ID to check
 * @param {string} campusId - Campus ID to access
 * @returns {Promise<boolean>} True if user can access campus, false otherwise
 */
export const canAccessCampus = async (userId, campusId) => {
  try {
    if (!userId || !campusId) {
      throw new Error('User ID and Campus ID are required');
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      return false;
    }

    // Super_Admin can access all campuses
    if (user.role === 'Super_Admin') {
      return true;
    }

    // Other roles can only access their own campus
    return user.campus_id === campusId;
  } catch (error) {
    console.error('Error checking campus access:', error.message);
    return false;
  }
};

/**
 * Check if a user can access a specific resource
 * @param {string} userId - User ID to check
 * @param {string} resourceId - Resource ID to access
 * @param {string} resourceType - Type of resource (user, course, etc.)
 * @returns {Promise<boolean>} True if user can access resource, false otherwise
 */
export const canAccessResource = async (userId, resourceId, resourceType) => {
  try {
    if (!userId || !resourceId || !resourceType) {
      throw new Error('User ID, Resource ID, and Resource Type are required');
    }

    // Find requesting user
    const requestingUser = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!requestingUser) {
      return false;
    }

    // Super_Admin can access all resources
    if (requestingUser.role === 'Super_Admin') {
      return true;
    }

    // Handle different resource types
    switch (resourceType) {
      case 'user': {
        // Find the target user resource
        const targetUser = await User.findOne({
          where: {
            id: resourceId,
            deleted_at: null,
          },
        });

        if (!targetUser) {
          return false;
        }

        // Check if resource belongs to user's campus
        return targetUser.campus_id === requestingUser.campus_id;
      }

      case 'campus': {
        // Check if user can access this campus
        return await canAccessCampus(userId, resourceId);
      }

      // Add more resource types as needed (courses, classes, etc.)
      default: {
        // For unknown resource types, default to campus-based access
        // This assumes the resource has a campus_id field
        console.warn(`Unknown resource type: ${resourceType}. Defaulting to deny access.`);
        return false;
      }
    }
  } catch (error) {
    console.error('Error checking resource access:', error.message);
    return false;
  }
};

/**
 * Check if a user has permission to perform an action on a resource
 * @param {string} userId - User ID to check
 * @param {string} resource - Resource type (user, profile, session, etc.)
 * @param {string} action - Action to perform (read, create, update, delete, etc.)
 * @returns {Promise<boolean>} True if user has permission, false otherwise
 */
export const hasPermission = async (userId, resource, action) => {
  try {
    if (!userId || !resource || !action) {
      throw new Error('User ID, resource, and action are required');
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      return false;
    }

    // Check if user's account is active
    if (user.account_status !== 'active') {
      return false;
    }

    // Get permissions for user's role
    const permissions = getPermissionsForRole(user.role);

    // Check if role has permission for this resource
    if (!permissions[resource]) {
      return false;
    }

    // Check if role has permission for this action
    return permissions[resource].includes(action);
  } catch (error) {
    console.error('Error checking user permission:', error.message);
    return false;
  }
};

/**
 * Get user's role
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} User's role or null if not found
 */
export const getUserRole = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
      attributes: ['role'],
    });

    return user ? user.role : null;
  } catch (error) {
    console.error('Error getting user role:', error.message);
    return null;
  }
};

export default {
  getPermissionsForRole,
  roleHasPermission,
  canAccessCampus,
  canAccessResource,
  hasPermission,
  getUserRole,
};
