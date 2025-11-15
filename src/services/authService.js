import User from '../models/User.js';
import { verifyPassword, hashPassword, validatePasswordStrength } from './passwordService.js';
import { generateTokens, verifyToken, generateAccessToken } from './tokenService.js';
import { createSession, revokeSession, revokeAllSessions } from './sessionService.js';
import { blacklistToken, calculateTokenExpiry, isTokenBlacklisted } from './blacklistService.js';
import { generateOTP, storeOTP, verifyOTP as verifyOTPCode, checkRateLimit } from './otpService.js';
import { generateResetToken, verifyResetToken, invalidateResetToken } from './resetTokenService.js';
import { createAuditLog } from './auditService.js';

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @param {Object} context - Request context { ipAddress, userAgent, deviceInfo }
 * @returns {Promise<Object>} { user, accessToken, refreshToken, sessionId }
 */
export const authenticateWithPassword = async (email, password, context = {}) => {
  try {
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Log failed login attempt
      await createAuditLog({
        action_type: 'failed_login',
        resource_type: 'user',
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { email, reason: 'user_not_found' }
      });

      const error = new Error('Invalid email or password');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Check if account is locked
    if (user.isLocked()) {
      const lockedUntil = user.locked_until;
      const now = new Date();
      const minutesRemaining = Math.ceil((lockedUntil - now) / 60000);

      // Log failed login attempt due to locked account
      await createAuditLog({
        user_id: user.id,
        action_type: 'failed_login',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { reason: 'account_locked', locked_until: lockedUntil }
      });

      const error = new Error(`Account temporarily locked due to multiple failed login attempts. Try again in ${minutesRemaining} minutes`);
      error.code = 'ACCOUNT_LOCKED';
      error.lockedUntil = lockedUntil;
      throw error;
    }

    // Check if account is active
    if (user.account_status !== 'active') {
      // Log failed login attempt due to inactive account
      await createAuditLog({
        user_id: user.id,
        action_type: 'failed_login',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { reason: 'account_inactive', status: user.account_status }
      });

      const error = new Error(`Account is ${user.account_status}. Contact administrator`);
      error.code = user.account_status === 'inactive' ? 'ACCOUNT_INACTIVE' : 'ACCOUNT_LOCKED';
      throw error;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Record failed login attempt
      await recordFailedLogin(user.id, context.ipAddress, context.userAgent);

      const error = new Error('Invalid email or password');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Successful authentication - update user record
    await user.update({
      last_login_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null
    });

    // Create session
    const deviceInfo = context.deviceInfo || {
      device_type: 'web',
      device_name: 'Unknown Device',
      user_agent: context.userAgent || ''
    };

    const sessionId = await createSession(
      user.id,
      deviceInfo,
      context.ipAddress || 'unknown'
    );

    // Generate JWT tokens
    const tokens = generateTokens({
      user_id: user.id,
      email: user.email,
      role: user.role,
      campus_id: user.campus_id,
      token_version: user.token_version
    });

    // Log successful login
    await createAuditLog({
      user_id: user.id,
      action_type: 'login',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: { method: 'password', session_id: sessionId }
    });

    // Return user without sensitive data
    const safeUser = user.toSafeObject();

    return {
      user: safeUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId
    };
  } catch (error) {
    console.error('Authentication error:', error.message);
    throw error;
  }
};

/**
 * Record a failed login attempt and lock account if threshold exceeded
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address of the request
 * @param {string} userAgent - User agent string
 * @returns {Promise<void>}
 */
export const recordFailedLogin = async (userId, ipAddress, userAgent) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return;
    }

    // Increment failed login attempts
    const newAttempts = user.failed_login_attempts + 1;

    // Check if we should lock the account (5 or more failed attempts)
    if (newAttempts >= 5) {
      // Lock account for 30 minutes
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);

      await user.update({
        failed_login_attempts: newAttempts,
        locked_until: lockedUntil,
        account_status: 'locked'
      });

      // Log account lockout
      await createAuditLog({
        user_id: userId,
        action_type: 'account_locked',
        resource_type: 'user',
        resource_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          reason: 'max_failed_attempts',
          failed_attempts: newAttempts,
          locked_until: lockedUntil
        }
      });
    } else {
      // Just increment the counter
      await user.update({
        failed_login_attempts: newAttempts
      });

      // Log failed login
      await createAuditLog({
        user_id: userId,
        action_type: 'failed_login',
        resource_type: 'user',
        resource_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        details: {
          reason: 'invalid_password',
          failed_attempts: newAttempts
        }
      });
    }
  } catch (error) {
    console.error('Record failed login error:', error.message);
    // Don't throw error to avoid breaking the login flow
  }
};

/**
 * Check if an account is locked and auto-unlock if time has passed
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { locked: boolean, lockedUntil: Date|null }
 */
export const checkAccountLockStatus = async (userId) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if account is locked
    if (!user.locked_until) {
      return { locked: false, lockedUntil: null };
    }

    const now = new Date();
    const lockedUntil = user.locked_until;

    // Check if lock has expired
    if (now >= lockedUntil) {
      // Auto-unlock the account
      await unlockAccount(userId);
      return { locked: false, lockedUntil: null };
    }

    return { locked: true, lockedUntil };
  } catch (error) {
    console.error('Check account lock status error:', error.message);
    throw error;
  }
};

/**
 * Lock a user account for a specified duration
 * @param {string} userId - User ID
 * @param {number} duration - Lock duration in milliseconds (default: 30 minutes)
 * @param {string} reason - Reason for locking
 * @param {string} adminId - Admin who locked the account (optional)
 * @returns {Promise<void>}
 */
export const lockAccount = async (userId, duration = 30 * 60 * 1000, reason = 'manual_lock', adminId = null) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const lockedUntil = new Date(Date.now() + duration);

    await user.update({
      account_status: 'locked',
      locked_until: lockedUntil
    });

    // Log account lockout
    await createAuditLog({
      user_id: userId,
      admin_id: adminId,
      action_type: 'account_locked',
      resource_type: 'user',
      resource_id: userId,
      details: {
        reason,
        locked_until: lockedUntil,
        duration_ms: duration
      }
    });
  } catch (error) {
    console.error('Lock account error:', error.message);
    throw error;
  }
};

/**
 * Unlock a user account
 * @param {string} userId - User ID
 * @param {string} adminId - Admin who unlocked the account (optional)
 * @returns {Promise<void>}
 */
export const unlockAccount = async (userId, adminId = null) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    await user.update({
      account_status: 'active',
      locked_until: null,
      failed_login_attempts: 0
    });

    // Log account unlock
    await createAuditLog({
      user_id: userId,
      admin_id: adminId,
      action_type: 'account_unlocked',
      resource_type: 'user',
      resource_id: userId,
      details: {
        reason: adminId ? 'manual_unlock' : 'auto_unlock'
      }
    });
  } catch (error) {
    console.error('Unlock account error:', error.message);
    throw error;
  }
};

/**
 * Request OTP for mobile login
 * @param {string} phone - Phone number (with country code, e.g., +919876543210)
 * @param {Object} context - Request context { ipAddress, userAgent }
 * @returns {Promise<Object>} { success: boolean, expiresAt: Date }
 */
export const requestOTP = async (phone, context = {}) => {
  try {
    if (!phone) {
      const error = new Error('Phone number is required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Validate phone format (Indian format: +91 followed by 10 digits)
    const phoneRegex = /^\+91[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      const error = new Error('Invalid phone number format. Expected format: +919876543210');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(phone);
    if (rateLimitCheck.limited) {
      const error = new Error(`OTP request rate limit exceeded. Please try again in ${Math.ceil(rateLimitCheck.retryAfter / 60)} minutes`);
      error.code = 'OTP_RATE_LIMIT';
      error.retryAfter = rateLimitCheck.retryAfter;
      throw error;
    }

    // Check if user exists with this phone number
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      // Log failed OTP request
      await createAuditLog({
        action_type: 'otp_request_failed',
        resource_type: 'user',
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { phone, reason: 'user_not_found' }
      });

      const error = new Error('No account found with this phone number');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Check if account is active
    if (user.account_status !== 'active') {
      await createAuditLog({
        user_id: user.id,
        action_type: 'otp_request_failed',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { phone, reason: 'account_inactive', status: user.account_status }
      });

      const error = new Error(`Account is ${user.account_status}. Contact administrator`);
      error.code = user.account_status === 'inactive' ? 'ACCOUNT_INACTIVE' : 'ACCOUNT_LOCKED';
      throw error;
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in Redis
    const result = await storeOTP(phone, otp);

    // TODO: Integrate with SMS gateway to send OTP
    // For now, log the OTP (in production, this should be removed)
    console.log(`OTP for ${phone}: ${otp}`);

    // Log OTP request
    await createAuditLog({
      user_id: user.id,
      action_type: 'otp_requested',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: { phone, expires_at: result.expiresAt }
    });

    return {
      success: true,
      expiresAt: result.expiresAt
    };
  } catch (error) {
    console.error('Request OTP error:', error.message);
    throw error;
  }
};

/**
 * Verify OTP and authenticate user
 * @param {string} phone - Phone number (with country code)
 * @param {string} otp - OTP code to verify
 * @param {Object} context - Request context { ipAddress, userAgent, deviceInfo }
 * @returns {Promise<Object>} { user, accessToken, refreshToken, sessionId }
 */
export const verifyOTP = async (phone, otp, context = {}) => {
  try {
    if (!phone || !otp) {
      const error = new Error('Phone number and OTP are required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Verify OTP
    const otpVerification = await verifyOTPCode(phone, otp);

    if (!otpVerification.valid) {
      // Log failed OTP verification
      await createAuditLog({
        action_type: 'otp_verification_failed',
        resource_type: 'user',
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: {
          phone,
          reason: 'invalid_otp',
          attempts_remaining: otpVerification.attemptsRemaining
        }
      });

      const error = new Error(`Invalid OTP. ${otpVerification.attemptsRemaining} attempts remaining`);
      error.code = 'OTP_INVALID';
      error.attemptsRemaining = otpVerification.attemptsRemaining;
      throw error;
    }

    // Find user by phone
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Check if account is locked
    if (user.isLocked()) {
      const lockedUntil = user.locked_until;
      const now = new Date();
      const minutesRemaining = Math.ceil((lockedUntil - now) / 60000);

      await createAuditLog({
        user_id: user.id,
        action_type: 'otp_login_failed',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { reason: 'account_locked', locked_until: lockedUntil }
      });

      const error = new Error(`Account temporarily locked. Try again in ${minutesRemaining} minutes`);
      error.code = 'ACCOUNT_LOCKED';
      error.lockedUntil = lockedUntil;
      throw error;
    }

    // Check if account is active
    if (user.account_status !== 'active') {
      await createAuditLog({
        user_id: user.id,
        action_type: 'otp_login_failed',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { reason: 'account_inactive', status: user.account_status }
      });

      const error = new Error(`Account is ${user.account_status}. Contact administrator`);
      error.code = user.account_status === 'inactive' ? 'ACCOUNT_INACTIVE' : 'ACCOUNT_LOCKED';
      throw error;
    }

    // Successful authentication - update user record
    await user.update({
      last_login_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null
    });

    // Create session
    const deviceInfo = context.deviceInfo || {
      device_type: 'mobile',
      device_name: 'Unknown Device',
      user_agent: context.userAgent || ''
    };

    const sessionId = await createSession(
      user.id,
      deviceInfo,
      context.ipAddress || 'unknown'
    );

    // Generate JWT tokens
    const tokens = generateTokens({
      user_id: user.id,
      email: user.email,
      role: user.role,
      campus_id: user.campus_id,
      token_version: user.token_version
    });

    // Log successful OTP login
    await createAuditLog({
      user_id: user.id,
      action_type: 'login',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: { method: 'otp', session_id: sessionId }
    });

    // Return user without sensitive data
    const safeUser = user.toSafeObject();

    return {
      user: safeUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId
    };
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    throw error;
  }
};

/**
 * Refresh access token using a valid refresh token
 * @param {string} refreshToken - Refresh token
 * @param {Object} context - Request context { ipAddress, userAgent }
 * @returns {Promise<Object>} { accessToken }
 */
export const refreshAccessToken = async (refreshToken, context = {}) => {
  try {
    if (!refreshToken) {
      const error = new Error('Refresh token is required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      const tokenError = new Error(error.message);
      tokenError.code = error.code || 'TOKEN_INVALID';
      throw tokenError;
    }

    // Check if token type is refresh
    if (decoded.type !== 'refresh') {
      const error = new Error('Invalid token type. Expected refresh token');
      error.code = 'TOKEN_INVALID';
      throw error;
    }

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      await createAuditLog({
        user_id: decoded.user_id,
        action_type: 'token_refresh_failed',
        resource_type: 'token',
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { reason: 'token_blacklisted' }
      });

      const error = new Error('Token has been revoked');
      error.code = 'TOKEN_INVALID';
      throw error;
    }

    // Extract userId from token payload
    const userId = decoded.user_id;

    // Verify user exists and is active
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    if (user.account_status !== 'active') {
      await createAuditLog({
        user_id: userId,
        action_type: 'token_refresh_failed',
        resource_type: 'token',
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { reason: 'account_inactive', status: user.account_status }
      });

      const error = new Error(`Account is ${user.account_status}. Contact administrator`);
      error.code = user.account_status === 'inactive' ? 'ACCOUNT_INACTIVE' : 'ACCOUNT_LOCKED';
      throw error;
    }

    // Check token_version matches (for logout-all functionality)
    if (decoded.token_version !== user.token_version) {
      await createAuditLog({
        user_id: userId,
        action_type: 'token_refresh_failed',
        resource_type: 'token',
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: {
          reason: 'token_version_mismatch',
          token_version: decoded.token_version,
          current_version: user.token_version
        }
      });

      const error = new Error('Token has been invalidated. Please login again');
      error.code = 'TOKEN_INVALID';
      throw error;
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      user_id: user.id,
      email: user.email,
      role: user.role,
      campus_id: user.campus_id
    });

    // Log token refresh
    await createAuditLog({
      user_id: userId,
      action_type: 'token_refreshed',
      resource_type: 'token',
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: { method: 'refresh_token' }
    });

    return {
      accessToken
    };
  } catch (error) {
    console.error('Refresh access token error:', error.message);
    throw error;
  }
};

/**
 * Logout user by blacklisting tokens and revoking session
 * @param {string} accessToken - Access token to blacklist
 * @param {string} refreshToken - Refresh token to blacklist
 * @param {string} sessionId - Session ID to revoke (optional)
 * @param {Object} context - Request context { ipAddress, userAgent }
 * @returns {Promise<Object>} { success: boolean }
 */
export const logout = async (accessToken, refreshToken, sessionId = null, context = {}) => {
  try {
    if (!accessToken || !refreshToken) {
      const error = new Error('Access token and refresh token are required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Calculate token expiry times
    const accessTokenExpiry = calculateTokenExpiry(accessToken);
    const refreshTokenExpiry = calculateTokenExpiry(refreshToken);

    // Blacklist both tokens
    const blacklistPromises = [];

    if (accessTokenExpiry > 0) {
      blacklistPromises.push(
        blacklistToken(accessToken, accessTokenExpiry, 'logout')
      );
    }

    if (refreshTokenExpiry > 0) {
      blacklistPromises.push(
        blacklistToken(refreshToken, refreshTokenExpiry, 'logout')
      );
    }

    await Promise.all(blacklistPromises);

    // Extract user ID from token for logging
    let userId = null;
    try {
      const decoded = verifyToken(accessToken);
      userId = decoded.user_id;

      // Revoke session if sessionId is provided
      if (sessionId) {
        await revokeSession(sessionId, userId);
      }
    } catch (error) {
      // Token might be expired, try to decode without verification
      const { decodeToken } = await import('./tokenService.js');
      const decoded = decodeToken(accessToken);
      if (decoded) {
        userId = decoded.user_id;
        if (sessionId) {
          await revokeSession(sessionId, userId);
        }
      }
    }

    // Log logout
    if (userId) {
      await createAuditLog({
        user_id: userId,
        action_type: 'logout',
        resource_type: 'user',
        resource_id: userId,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { method: 'single_session', session_id: sessionId }
      });
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Logout error:', error.message);
    throw error;
  }
};

/**
 * Logout user from all devices by incrementing token_version and revoking all sessions
 * @param {string} userId - User ID
 * @param {Object} context - Request context { ipAddress, userAgent }
 * @returns {Promise<Object>} { success: boolean, sessionsRevoked: number }
 */
export const logoutAll = async (userId, context = {}) => {
  try {
    if (!userId) {
      const error = new Error('User ID is required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Find user
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Increment token_version to invalidate all refresh tokens
    await user.update({
      token_version: user.token_version + 1
    });

    // Revoke all sessions
    const sessionsRevoked = await revokeAllSessions(userId);

    // Log logout from all devices
    await createAuditLog({
      user_id: userId,
      action_type: 'logout',
      resource_type: 'user',
      resource_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: {
        method: 'all_sessions',
        sessions_revoked: sessionsRevoked,
        new_token_version: user.token_version + 1
      }
    });

    return {
      success: true,
      sessionsRevoked
    };
  } catch (error) {
    console.error('Logout all error:', error.message);
    throw error;
  }
};

/**
 * Request password reset for a user
 * @param {string} email - User email address
 * @param {Object} context - Request context { ipAddress, userAgent }
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export const requestPasswordReset = async (email, context = {}) => {
  try {
    if (!email) {
      const error = new Error('Email is required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // For security, don't reveal if user exists or not
      // Log the failed attempt
      await createAuditLog({
        action_type: 'password_reset_requested',
        resource_type: 'user',
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { email, reason: 'user_not_found' }
      });

      // Return success message anyway to prevent email enumeration
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      };
    }

    // Check if account is active
    if (user.account_status !== 'active') {
      // Log the attempt
      await createAuditLog({
        user_id: user.id,
        action_type: 'password_reset_requested',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { email, reason: 'account_inactive', status: user.account_status }
      });

      // Return generic success message for security
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      };
    }

    // Generate reset token
    const { token, expiresAt } = await generateResetToken(user.id);

    // TODO: Send password reset email with reset link containing token
    // For now, log the token (in production, this should be removed)
    console.log(`Password reset token for ${email}: ${token}`);
    console.log(`Reset link: /reset-password?token=${token}`);

    // Create audit log entry
    await createAuditLog({
      user_id: user.id,
      action_type: 'password_reset_requested',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: { email, expires_at: expiresAt }
    });

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    };
  } catch (error) {
    console.error('Request password reset error:', error.message);
    throw error;
  }
};

/**
 * Reset password using a valid reset token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @param {Object} context - Request context { ipAddress, userAgent }
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export const resetPassword = async (token, newPassword, context = {}) => {
  try {
    if (!token || !newPassword) {
      const error = new Error('Reset token and new password are required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Verify reset token and extract userId
    let userId;
    try {
      userId = await verifyResetToken(token);
    } catch (error) {
      const resetError = new Error('Invalid or expired reset token');
      resetError.code = 'RESET_TOKEN_INVALID';
      throw resetError;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      const error = new Error('Password does not meet strength requirements');
      error.code = 'VALIDATION_ERROR';
      error.details = passwordValidation.errors;
      throw error;
    }

    // Find user
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user record with new password and increment token_version to logout all sessions
    await user.update({
      password_hash: hashedPassword,
      token_version: user.token_version + 1,
      failed_login_attempts: 0,
      locked_until: null
    });

    // Invalidate the reset token
    await invalidateResetToken(token);

    // Revoke all sessions (user will need to login again)
    await revokeAllSessions(userId);

    // Create audit log entry
    await createAuditLog({
      user_id: userId,
      action_type: 'password_reset',
      resource_type: 'user',
      resource_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: { method: 'reset_token' }
    });

    return {
      success: true,
      message: 'Password has been reset successfully. Please login with your new password'
    };
  } catch (error) {
    console.error('Reset password error:', error.message);
    throw error;
  }
};

/**
 * Change password for an authenticated user
 * @param {string} userId - User ID
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @param {Object} context - Request context { ipAddress, userAgent }
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export const changePassword = async (userId, oldPassword, newPassword, context = {}) => {
  try {
    if (!userId || !oldPassword || !newPassword) {
      const error = new Error('User ID, old password, and new password are required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Find user
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Verify old password is correct
    const isOldPasswordValid = await verifyPassword(oldPassword, user.password_hash);

    if (!isOldPasswordValid) {
      // Log failed password change attempt
      await createAuditLog({
        user_id: userId,
        action_type: 'password_change_failed',
        resource_type: 'user',
        resource_id: userId,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: { reason: 'invalid_old_password' }
      });

      const error = new Error('Current password is incorrect');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      const error = new Error('Password does not meet strength requirements');
      error.code = 'VALIDATION_ERROR';
      error.details = passwordValidation.errors;
      throw error;
    }

    // Check if new password is same as old password
    const isSamePassword = await verifyPassword(newPassword, user.password_hash);
    if (isSamePassword) {
      const error = new Error('New password must be different from current password');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user record with new password
    await user.update({
      password_hash: hashedPassword
    });

    // Create audit log entry
    await createAuditLog({
      user_id: userId,
      action_type: 'password_changed',
      resource_type: 'user',
      resource_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: { method: 'authenticated_change' }
    });

    return {
      success: true,
      message: 'Password has been changed successfully'
    };
  } catch (error) {
    console.error('Change password error:', error.message);
    throw error;
  }
};

export default {
  authenticateWithPassword,
  requestOTP,
  verifyOTP,
  refreshAccessToken,
  logout,
  logoutAll,
  recordFailedLogin,
  checkAccountLockStatus,
  lockAccount,
  unlockAccount,
  requestPasswordReset,
  resetPassword,
  changePassword
};
