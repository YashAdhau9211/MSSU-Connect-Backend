import * as authService from '../services/authService.js';
import * as userService from '../services/userService.js';

/**
 * Register a new user (Admin/Super_Admin only)
 * @route POST /api/v1/auth/register
 */
export const register = async (req, res) => {
  try {
    const { email, password, name, phone, role, campus_id, profile_picture_url, address } = req.body;

    // Validate required fields
    if (!email || !password || !name || !phone || !role || !campus_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: email, password, name, phone, role, campus_id'
        }
      });
    }

    // Get the admin ID from authenticated user
    const createdBy = req.user ? req.user.id : null;

    // Create user
    const user = await userService.createUser(
      { email, password, name, phone, role, campus_id, profile_picture_url, address },
      createdBy
    );

    return res.status(201).json({
      success: true,
      data: { user },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Register error:', error);

    const statusCode = error.statusCode || (error.code === 'EMAIL_EXISTS' || error.code === 'PHONE_EXISTS' ? 409 : 500);
    
    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred during registration'
      }
    });
  }
};

/**
 * Login with email and password
 * @route POST /api/v1/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate credentials
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        }
      });
    }

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      deviceInfo: {
        device_type: req.body.device_type || 'web',
        device_name: req.body.device_name || 'Unknown Device',
        user_agent: req.get('user-agent')
      }
    };

    // Authenticate user
    const result = await authService.authenticateWithPassword(email, password, context);

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);

    const statusCode = error.code === 'INVALID_CREDENTIALS' ? 401 :
                       error.code === 'ACCOUNT_LOCKED' || error.code === 'ACCOUNT_INACTIVE' ? 403 :
                       500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred during login',
        ...(error.lockedUntil && { lockedUntil: error.lockedUntil })
      }
    });
  }
};

/**
 * Request OTP for mobile login
 * @route POST /api/v1/auth/otp/request
 */
export const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number is required'
        }
      });
    }

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Request OTP
    const result = await authService.requestOTP(phone, context);

    return res.status(200).json({
      success: true,
      data: {
        expiresAt: result.expiresAt
      },
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Request OTP error:', error);

    const statusCode = error.code === 'VALIDATION_ERROR' ? 400 :
                       error.code === 'USER_NOT_FOUND' ? 404 :
                       error.code === 'ACCOUNT_INACTIVE' || error.code === 'ACCOUNT_LOCKED' ? 403 :
                       error.code === 'OTP_RATE_LIMIT' ? 429 :
                       500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while requesting OTP',
        ...(error.retryAfter && { retryAfter: error.retryAfter })
      }
    });
  }
};

/**
 * Verify OTP and login
 * @route POST /api/v1/auth/otp/verify
 */
export const loginWithOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Validate phone and OTP
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number and OTP are required'
        }
      });
    }

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      deviceInfo: {
        device_type: req.body.device_type || 'mobile',
        device_name: req.body.device_name || 'Unknown Device',
        user_agent: req.get('user-agent')
      }
    };

    // Verify OTP and authenticate
    const result = await authService.verifyOTP(phone, otp, context);

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login with OTP error:', error);

    const statusCode = error.code === 'VALIDATION_ERROR' ? 400 :
                       error.code === 'OTP_INVALID' ? 401 :
                       error.code === 'USER_NOT_FOUND' ? 404 :
                       error.code === 'ACCOUNT_LOCKED' || error.code === 'ACCOUNT_INACTIVE' ? 403 :
                       500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred during OTP verification',
        ...(error.attemptsRemaining !== undefined && { attemptsRemaining: error.attemptsRemaining }),
        ...(error.lockedUntil && { lockedUntil: error.lockedUntil })
      }
    });
  }
};

/**
 * Refresh access token
 * @route POST /api/v1/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    // Validate refresh token
    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      });
    }

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Refresh access token
    const result = await authService.refreshAccessToken(token, context);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh token error:', error);

    const statusCode = error.code === 'VALIDATION_ERROR' ? 400 :
                       error.code === 'TOKEN_EXPIRED' || error.code === 'TOKEN_INVALID' ? 401 :
                       error.code === 'USER_NOT_FOUND' ? 404 :
                       error.code === 'ACCOUNT_INACTIVE' || error.code === 'ACCOUNT_LOCKED' ? 403 :
                       500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while refreshing token'
      }
    });
  }
};

/**
 * Logout current session
 * @route POST /api/v1/auth/logout
 */
export const logout = async (req, res) => {
  try {
    // Extract tokens from request
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    const { refreshToken: token } = req.body;

    if (!accessToken || !token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Access token and refresh token are required'
        }
      });
    }

    // Extract session ID if available
    const sessionId = req.body.sessionId || null;

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Logout
    await authService.logout(accessToken, token, sessionId, context);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred during logout'
      }
    });
  }
};

/**
 * Logout from all devices
 * @route POST /api/v1/auth/logout-all
 */
export const logoutAll = async (req, res) => {
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

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Logout from all devices
    const result = await authService.logoutAll(userId, context);

    return res.status(200).json({
      success: true,
      data: {
        sessionsRevoked: result.sessionsRevoked
      },
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Logout all error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred during logout'
      }
    });
  }
};

/**
 * Request password reset
 * @route POST /api/v1/auth/password/forgot
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required'
        }
      });
    }

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Request password reset
    const result = await authService.requestPasswordReset(email, context);

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while processing password reset request'
      }
    });
  }
};

/**
 * Reset password with token
 * @route POST /api/v1/auth/password/reset
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate token and new password
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reset token and new password are required'
        }
      });
    }

    // Extract request context
    const context = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Reset password
    const result = await authService.resetPassword(token, newPassword, context);

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Reset password error:', error);

    const statusCode = error.code === 'VALIDATION_ERROR' ? 400 :
                       error.code === 'RESET_TOKEN_INVALID' ? 400 :
                       error.code === 'USER_NOT_FOUND' ? 404 :
                       500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while resetting password',
        ...(error.details && { details: error.details })
      }
    });
  }
};

/**
 * Change password for authenticated user
 * @route PUT /api/v1/auth/password/change
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
  register,
  login,
  requestOTP,
  loginWithOTP,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  changePassword
};
