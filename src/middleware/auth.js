import { verifyToken } from '../services/tokenService.js';
import { isTokenBlacklisted } from '../services/blacklistService.js';
import { canAccessCampus } from '../services/rbacService.js';
import User from '../models/User.js';

/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 * Extracts JWT from Authorization header, verifies it, checks blacklist, and validates user
 * @returns {Function} Express middleware function
 */
export const authenticate = () => {
  return async (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authorization header is required'
          }
        });
      }

      // Check if it's a Bearer token
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid authorization format. Use: Bearer <token>'
          }
        });
      }

      // Extract the token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token is required'
          }
        });
      }

      // Verify token
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (error) {
        if (error.code === 'TOKEN_EXPIRED') {
          return res.status(401).json({
            success: false,
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Token has expired'
            }
          });
        } else if (error.code === 'TOKEN_INVALID') {
          return res.status(401).json({
            success: false,
            error: {
              code: 'TOKEN_INVALID',
              message: 'Invalid token'
            }
          });
        } else {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Token verification failed'
            }
          });
        }
      }

      // Check if token is blacklisted
      const isBlacklisted = await isTokenBlacklisted(token);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_REVOKED',
            message: 'Token has been revoked'
          }
        });
      }

      // Find user and verify they exist
      const user = await User.findOne({
        where: {
          id: decoded.user_id,
          deleted_at: null
        },
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Check if user account is active
      if (user.account_status !== 'active') {
        const statusMessages = {
          inactive: 'Account is inactive. Contact administrator',
          locked: 'Account is locked. Contact administrator'
        };

        return res.status(403).json({
          success: false,
          error: {
            code: user.account_status === 'locked' ? 'ACCOUNT_LOCKED' : 'ACCOUNT_INACTIVE',
            message: statusMessages[user.account_status] || 'Account is not active'
          }
        });
      }

      // Check if account is temporarily locked due to failed login attempts
      if (user.isLocked()) {
        const lockTimeRemaining = Math.ceil((user.locked_until - new Date()) / 1000 / 60);
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account temporarily locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes`
          }
        });
      }

      // Attach user object to request for downstream use
      req.user = user.toSafeObject();
      req.token = token;

      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication failed'
        }
      });
    }
  };
};

/**
 * Role-based authorization middleware - Checks if user has required role
 * @param {...string} allowedRoles - Roles that are allowed to access the endpoint
 * @returns {Function} Express middleware function
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to access this resource'
          }
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authorization check failed'
        }
      });
    }
  };
};

/**
 * Campus access middleware - Checks if user can access the requested campus
 * Extracts campus_id from request params or body and validates access
 * @returns {Function} Express middleware function
 */
export const requireCampusAccess = () => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      // Extract campus_id from params or body
      const campusId = req.params.campus_id || req.body.campus_id || req.query.campus_id;

      if (!campusId) {
        // If no campus_id is specified, allow the request to proceed
        // The service layer will handle campus filtering
        return next();
      }

      // Check if user can access this campus
      const hasAccess = await canAccessCampus(req.user.id, campusId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: resource belongs to different campus'
          }
        });
      }

      next();
    } catch (error) {
      console.error('Campus access middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Campus access check failed'
        }
      });
    }
  };
};

export default {
  authenticate,
  requireRole,
  requireCampusAccess
};
