import * as userService from '../services/userService.js';
import * as mfaService from '../services/mfaService.js';

/**
 * List users with filtering and pagination
 * @route GET /api/v1/users
 */
export const listUsers = async (req, res) => {
  try {
    // Extract filters from query params
    const filters = {
      role: req.query.role,
      campus_id: req.query.campus_id,
      account_status: req.query.status,
      search: req.query.search
    };

    // Extract pagination from query params
    const pagination = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'desc'
    };

    // Get requesting user from auth middleware
    const requestingUser = req.user;

    // List users
    const result = await userService.listUsers(filters, pagination, requestingUser);

    return res.status(200).json({
      success: true,
      data: {
        users: result.users,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('List users error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while listing users'
      }
    });
  }
};

/**
 * Get user by ID
 * @route GET /api/v1/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required'
        }
      });
    }

    // Get requesting user from auth middleware
    const requestingUser = req.user;

    // Get user
    const user = await userService.getUserById(userId, requestingUser);

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);

    const statusCode = error.statusCode || 
                       (error.code === 'USER_NOT_FOUND' ? 404 :
                        error.code === 'FORBIDDEN' ? 403 : 500);

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while retrieving user'
      }
    });
  }
};

/**
 * Update user
 * @route PUT /api/v1/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required'
        }
      });
    }

    // Get updates from request body
    const updates = req.body;

    // Get admin ID from authenticated user
    const updatedBy = req.user?.id;

    if (!updatedBy) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Update user
    const user = await userService.updateUser(userId, updates, updatedBy);

    return res.status(200).json({
      success: true,
      data: { user },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);

    const statusCode = error.statusCode ||
                       (error.code === 'USER_NOT_FOUND' ? 404 :
                        error.code === 'PHONE_EXISTS' ? 409 :
                        error.code === 'FORBIDDEN' ? 403 : 500);

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while updating user'
      }
    });
  }
};

/**
 * Delete user (soft delete, requires MFA)
 * @route DELETE /api/v1/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { mfaCode, reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required'
        }
      });
    }

    // Validate MFA code
    if (!mfaCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'MFA code is required for user deletion'
        }
      });
    }

    // Get admin ID from authenticated user
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Verify MFA code
    const mfaVerification = await mfaService.verifyMFACode(adminId, mfaCode);

    if (!mfaVerification.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MFA_INVALID',
          message: `Invalid MFA code. ${mfaVerification.attemptsRemaining} attempts remaining`,
          attemptsRemaining: mfaVerification.attemptsRemaining
        }
      });
    }

    // Delete user
    const user = await userService.deleteUser(userId, adminId, reason);

    return res.status(200).json({
      success: true,
      data: { user },
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);

    const statusCode = error.statusCode ||
                       (error.code === 'USER_NOT_FOUND' ? 404 : 500);

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while deleting user'
      }
    });
  }
};

/**
 * Update user account status
 * @route PATCH /api/v1/users/:id/status
 */
export const updateStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { status, reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID is required'
        }
      });
    }

    // Validate status
    if (!status || !['active', 'inactive', 'locked'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valid status is required (active, inactive, or locked)'
        }
      });
    }

    // Get admin ID from authenticated user
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Update status based on requested status
    let user;
    if (status === 'active') {
      user = await userService.activateUser(userId, adminId);
    } else if (status === 'inactive') {
      user = await userService.deactivateUser(userId, adminId, reason);
    } else if (status === 'locked') {
      user = await userService.lockUser(userId, adminId, reason);
    }

    return res.status(200).json({
      success: true,
      data: { user },
      message: `User status updated to ${status}`
    });
  } catch (error) {
    console.error('Update status error:', error);

    const statusCode = error.statusCode ||
                       (error.code === 'USER_NOT_FOUND' ? 404 : 500);

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while updating user status'
      }
    });
  }
};

export default {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateStatus
};
