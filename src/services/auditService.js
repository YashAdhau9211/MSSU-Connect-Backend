import AuditLog from '../models/AuditLog.js';
import { Op } from 'sequelize';

/**
 * Create an audit log entry
 * @param {Object} logData - Audit log data
 * @param {string} logData.user_id - User ID (optional)
 * @param {string} logData.admin_id - Admin ID (optional)
 * @param {string} logData.action_type - Action type (required)
 * @param {string} logData.resource_type - Resource type (optional)
 * @param {string} logData.resource_id - Resource ID (optional)
 * @param {string} logData.ip_address - IP address (optional)
 * @param {string} logData.user_agent - User agent string (optional)
 * @param {Object} logData.details - Additional details as JSON (optional)
 * @returns {Promise<Object>} Created audit log entry
 */
export const createAuditLog = async (logData) => {
  try {
    // Validate required fields
    if (!logData.action_type) {
      throw new Error('action_type is required for audit log');
    }

    // Create audit log entry
    const auditLog = await AuditLog.create({
      user_id: logData.user_id || null,
      admin_id: logData.admin_id || null,
      action_type: logData.action_type,
      resource_type: logData.resource_type || null,
      resource_id: logData.resource_id || null,
      ip_address: logData.ip_address || null,
      user_agent: logData.user_agent || null,
      details: logData.details || null,
    });

    return auditLog;
  } catch (error) {
    // Log error but don't throw to avoid breaking main operations
    console.error('Create audit log error:', error.message);
    // Return null to indicate failure without breaking the calling function
    return null;
  }
};

/**
 * Get audit logs with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {string} filters.user_id - Filter by user ID (optional)
 * @param {string} filters.admin_id - Filter by admin ID (optional)
 * @param {string} filters.action_type - Filter by action type (optional)
 * @param {Date} filters.start_date - Filter by start date (optional)
 * @param {Date} filters.end_date - Filter by end date (optional)
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.page - Page number (default: 1)
 * @param {number} pagination.limit - Items per page (default: 50)
 * @returns {Promise<Object>} { logs, total, page, totalPages, limit }
 */
export const getAuditLogs = async (filters = {}, pagination = {}) => {
  try {
    // Set default pagination values
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 50));
    const offset = (page - 1) * limit;

    // Build where clause based on filters
    const where = {};

    if (filters.user_id) {
      where.user_id = filters.user_id;
    }

    if (filters.admin_id) {
      where.admin_id = filters.admin_id;
    }

    if (filters.action_type) {
      where.action_type = filters.action_type;
    }

    // Date range filtering
    if (filters.start_date || filters.end_date) {
      where.created_at = {};

      if (filters.start_date) {
        where.created_at[Op.gte] = new Date(filters.start_date);
      }

      if (filters.end_date) {
        where.created_at[Op.lte] = new Date(filters.end_date);
      }
    }

    // Query audit logs with pagination
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']], // Most recent first
      attributes: [
        'id',
        'user_id',
        'admin_id',
        'action_type',
        'resource_type',
        'resource_id',
        'ip_address',
        'user_agent',
        'details',
        'created_at'
      ]
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    return {
      logs: rows,
      total: count,
      page,
      totalPages,
      limit
    };
  } catch (error) {
    console.error('Get audit logs error:', error.message);
    throw error;
  }
};

export default {
  createAuditLog,
  getAuditLogs
};
