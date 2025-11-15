import * as sessionService from '../services/sessionService.js';

/**
 * Get all active sessions for current user
 * @route GET /api/v1/sessions
 */
export const getActiveSessions = async (req, res) => {
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

    // Get active sessions
    const sessions = await sessionService.getActiveSessions(userId);

    // Format sessions for response
    const formattedSessions = sessions.map(session => ({
      id: session.sessionId,
      device_type: session.device_type,
      device_name: session.device_name,
      ip_address: session.ip_address,
      last_activity: session.last_activity,
      created_at: session.created_at,
      is_current: false // This could be enhanced to detect current session
    }));

    return res.status(200).json({
      success: true,
      data: {
        sessions: formattedSessions
      }
    });
  } catch (error) {
    console.error('Get active sessions error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while retrieving sessions'
      }
    });
  }
};

/**
 * Revoke a specific session
 * @route DELETE /api/v1/sessions/:id
 */
export const revokeSession = async (req, res) => {
  try {
    const sessionId = req.params.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Session ID is required'
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

    // Revoke session
    const revoked = await sessionService.revokeSession(sessionId, userId);

    if (!revoked) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found or already revoked'
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while revoking session'
      }
    });
  }
};

export default {
  getActiveSessions,
  revokeSession
};
