import * as userService from '../services/userService.js';
import * as authService from '../services/authService.js';

/**
 * Get current user's profile
 * @route GET /api/v1/profile
 */
export const getProfile = async (req, res) => {
  try {
    // Extract userId from authenticated user
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Get user profile (no campus filtering needed for own profile)
    const user = await userService.getUserById(userId, req.user);

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);

    const statusCode = error.statusCode ||
                       (error.code === 'USER_NOT_FOUND' ? 404 : 500);

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while retrieving profile'
      }
    });
  }
};

/**
 * Update current user's profile
 * @route PUT /api/v1/profile
 */
export const updateProfile = async (req, res) => {
  try {
    // Extract userId from authenticated user
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Get profile data from request body
    const profileData = req.body;

    // Update profile
    const user = await userService.updateProfile(userId, profileData);

    return res.status(200).json({
      success: true,
      data: { user },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);

    const statusCode = error.statusCode ||
                       (error.code === 'USER_NOT_FOUND' ? 404 :
                        error.code === 'PHONE_EXISTS' ? 409 : 500);

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while updating profile'
      }
    });
  }
};

/**
 * Upload profile picture
 * @route POST /api/v1/profile/picture
 */
export const uploadProfilePicture = async (req, res) => {
  try {
    // Extract userId from authenticated user
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Profile picture file is required'
        }
      });
    }

    // Prepare file object with buffer and metadata
    const file = {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    };

    // Upload profile picture
    const user = await userService.uploadProfilePicture(userId, file);

    return res.status(200).json({
      success: true,
      data: {
        profile_picture_url: user.profile_picture_url
      },
      message: 'Profile picture uploaded successfully'
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);

    const statusCode = error.statusCode ||
                       (error.code === 'USER_NOT_FOUND' ? 404 :
                        error.code === 'FILE_TOO_LARGE' || error.code === 'INVALID_FILE_FORMAT' ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while uploading profile picture'
      }
    });
  }
};

/**
 * Change password for current user
 * @route PUT /api/v1/profile/password
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate passwords
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Old password and new password are required'
        }
      });
    }

    // Extract userId from authenticated user
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Change password
    const result = await authService.changePassword(userId, oldPassword, newPassword, context);

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Change password error:', error);

    const statusCode = error.code === 'VALIDATION_ERROR' ? 400 :
                       error.code === 'INVALID_CREDENTIALS' ? 401 :
                       error.code === 'USER_NOT_FOUND' ? 404 :
                       500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while changing password',
        ...(error.details && { details: error.details })
      }
    });
  }
};

export default {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  changePassword
};
