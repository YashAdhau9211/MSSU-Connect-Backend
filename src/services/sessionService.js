import crypto from 'crypto';
import { redisHelpers } from '../config/redis.js';

const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Create a new session for a user
 * @param {string} userId - User ID (UUID)
 * @param {Object} deviceInfo - Device information { device_type, device_name, user_agent }
 * @param {string} ipAddress - IP address of the client
 * @returns {Promise<string>} Session ID
 */
export const createSession = async (userId, deviceInfo, ipAddress) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!deviceInfo || !deviceInfo.device_type) {
      throw new Error('Device information is required');
    }

    if (!ipAddress) {
      throw new Error('IP address is required');
    }

    // Generate a unique session ID
    const sessionId = crypto.randomBytes(32).toString('hex');

    // Prepare session data
    const sessionData = {
      userId,
      sessionId,
      device_type: deviceInfo.device_type || 'unknown',
      device_name: deviceInfo.device_name || 'Unknown Device',
      ip_address: ipAddress,
      user_agent: deviceInfo.user_agent || '',
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };

    // Store session in Redis with key pattern session:${userId}:${sessionId}
    const sessionKey = `session:${userId}:${sessionId}`;
    const stored = await redisHelpers.set(sessionKey, sessionData, SESSION_EXPIRY_SECONDS);

    if (!stored) {
      throw new Error('Failed to create session in Redis');
    }

    return sessionId;
  } catch (error) {
    console.error('Create session error:', error.message);
    throw error;
  }
};

/**
 * Get all active sessions for a user
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Array>} Array of session objects
 */
export const getActiveSessions = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get all session keys for this user
    const pattern = `session:${userId}:*`;
    const sessionKeys = await redisHelpers.keys(pattern);

    if (!sessionKeys || sessionKeys.length === 0) {
      return [];
    }

    // Fetch all session data
    const sessions = [];
    for (const key of sessionKeys) {
      const sessionData = await redisHelpers.get(key);
      if (sessionData) {
        // Add TTL information
        const ttl = await redisHelpers.ttl(key);
        sessionData.expiresIn = ttl;
        sessions.push(sessionData);
      }
    }

    // Sort by last_activity (most recent first)
    sessions.sort((a, b) => {
      return new Date(b.last_activity) - new Date(a.last_activity);
    });

    return sessions;
  } catch (error) {
    console.error('Get active sessions error:', error.message);
    throw error;
  }
};

/**
 * Get a specific session by session ID
 * @param {string} userId - User ID (UUID)
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} Session data or null if not found
 */
export const getSession = async (userId, sessionId) => {
  try {
    if (!userId || !sessionId) {
      throw new Error('User ID and session ID are required');
    }

    const sessionKey = `session:${userId}:${sessionId}`;
    const sessionData = await redisHelpers.get(sessionKey);

    if (sessionData) {
      // Add TTL information
      const ttl = await redisHelpers.ttl(sessionKey);
      sessionData.expiresIn = ttl;
    }

    return sessionData;
  } catch (error) {
    console.error('Get session error:', error.message);
    return null;
  }
};

/**
 * Revoke a specific session
 * @param {string} sessionId - Session ID to revoke
 * @param {string} userId - User ID (UUID) - optional but recommended for security
 * @returns {Promise<boolean>} Success status
 */
export const revokeSession = async (sessionId, userId = null) => {
  try {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    if (userId) {
      // If userId is provided, use specific key
      const sessionKey = `session:${userId}:${sessionId}`;
      return await redisHelpers.del(sessionKey);
    } else {
      // If userId is not provided, search for the session
      const pattern = `session:*:${sessionId}`;
      const sessionKeys = await redisHelpers.keys(pattern);
      
      if (sessionKeys.length === 0) {
        return false;
      }

      // Delete all matching sessions (should be only one)
      let deleted = false;
      for (const key of sessionKeys) {
        const result = await redisHelpers.del(key);
        if (result) deleted = true;
      }

      return deleted;
    }
  } catch (error) {
    console.error('Revoke session error:', error.message);
    return false;
  }
};

/**
 * Revoke all sessions for a user (logout from all devices)
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<number>} Number of sessions revoked
 */
export const revokeAllSessions = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get all session keys for this user
    const pattern = `session:${userId}:*`;
    const sessionKeys = await redisHelpers.keys(pattern);

    if (!sessionKeys || sessionKeys.length === 0) {
      return 0;
    }

    // Delete all sessions
    let revokedCount = 0;
    for (const key of sessionKeys) {
      const deleted = await redisHelpers.del(key);
      if (deleted) revokedCount++;
    }

    return revokedCount;
  } catch (error) {
    console.error('Revoke all sessions error:', error.message);
    throw error;
  }
};

/**
 * Update last activity timestamp for a session (refreshes TTL)
 * @param {string} userId - User ID (UUID)
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} Success status
 */
export const updateLastActivity = async (userId, sessionId) => {
  try {
    if (!userId || !sessionId) {
      throw new Error('User ID and session ID are required');
    }

    const sessionKey = `session:${userId}:${sessionId}`;
    const sessionData = await redisHelpers.get(sessionKey);

    if (!sessionData) {
      return false;
    }

    // Update last activity timestamp
    sessionData.last_activity = new Date().toISOString();

    // Store back with refreshed TTL
    const updated = await redisHelpers.set(sessionKey, sessionData, SESSION_EXPIRY_SECONDS);

    return updated;
  } catch (error) {
    console.error('Update last activity error:', error.message);
    return false;
  }
};

/**
 * Check if a session exists and is valid
 * @param {string} userId - User ID (UUID)
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} True if session exists and is valid
 */
export const isSessionValid = async (userId, sessionId) => {
  try {
    if (!userId || !sessionId) {
      return false;
    }

    const sessionKey = `session:${userId}:${sessionId}`;
    return await redisHelpers.exists(sessionKey);
  } catch (error) {
    console.error('Check session validity error:', error.message);
    return false;
  }
};

/**
 * Get session count for a user
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<number>} Number of active sessions
 */
export const getSessionCount = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const pattern = `session:${userId}:*`;
    const sessionKeys = await redisHelpers.keys(pattern);

    return sessionKeys ? sessionKeys.length : 0;
  } catch (error) {
    console.error('Get session count error:', error.message);
    return 0;
  }
};

/**
 * Clean up expired sessions (optional maintenance function)
 * Redis automatically removes expired keys, but this can be used for manual cleanup
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<number>} Number of sessions cleaned up
 */
export const cleanupExpiredSessions = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const pattern = `session:${userId}:*`;
    const sessionKeys = await redisHelpers.keys(pattern);

    if (!sessionKeys || sessionKeys.length === 0) {
      return 0;
    }

    let cleanedCount = 0;
    for (const key of sessionKeys) {
      const ttl = await redisHelpers.ttl(key);
      // If TTL is -2, key doesn't exist (already expired)
      // If TTL is -1, key exists but has no expiry (shouldn't happen)
      if (ttl === -2) {
        cleanedCount++;
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Cleanup expired sessions error:', error.message);
    return 0;
  }
};

export default {
  createSession,
  getActiveSessions,
  getSession,
  revokeSession,
  revokeAllSessions,
  updateLastActivity,
  isSessionValid,
  getSessionCount,
  cleanupExpiredSessions
};
