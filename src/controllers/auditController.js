import * as auditService from '../services/auditService.js';

/**
 * Get audit logs with filtering and pagination (Super_Admin only)
 * @route GET /api/v1/audit-logs
 * @access Super_Admin only (enforced by requireRole middleware)
 */
export const getAuditLogs = async (req, res) => {
  try {
    // Extract filters from query params
    const filters = {
      user_id: req.query.user_id,
      admin_id: req.query.admin_id,
      action_type: req.query.action_type,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    // Extract pagination from query params
    const pagination = {
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };

    // Get audit logs
    const result = await auditService.getAuditLogs(filters, pagination);

    return res.status(200).json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred while retrieving audit logs'
      }
    });
  }
};

export default {
  getAuditLogs
};
