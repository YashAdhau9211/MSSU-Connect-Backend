import express from 'express';
import * as auditController from '../controllers/auditController.js';
import {
  authenticate,
  requireRole,
  validateAuditLogQuery,
  generalRateLimiter
} from '../middleware/index.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: Get audit logs with filtering and pagination
 *     description: |
 *       Retrieve audit logs for security and compliance monitoring.
 *       Only accessible by Super_Admin users.
 *       Supports filtering by user, action type, and date range.
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of items per page (max 100, default 50)
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: admin_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by admin ID (who performed the action)
 *       - in: query
 *         name: action_type
 *         schema:
 *           type: string
 *           enum: [login, logout, failed_login, user_created, user_updated, user_deleted, role_changed, status_changed, password_reset, mfa_verified]
 *         description: Filter by action type
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date (ISO 8601 format)
 *         example: '2024-01-01T00:00:00Z'
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date (ISO 8601 format)
 *         example: '2024-01-31T23:59:59Z'
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *             example:
 *               success: true
 *               data:
 *                 logs:
 *                   - id: log-uuid-1
 *                     user_id: user-uuid-1
 *                     admin_id: null
 *                     action_type: login
 *                     resource_type: session
 *                     resource_id: session-uuid-1
 *                     ip_address: 192.168.1.1
 *                     user_agent: Mozilla/5.0...
 *                     details:
 *                       device_type: mobile
 *                       device_name: iPhone 13
 *                     created_at: '2024-01-15T10:30:00Z'
 *                   - id: log-uuid-2
 *                     user_id: user-uuid-2
 *                     admin_id: admin-uuid-1
 *                     action_type: user_created
 *                     resource_type: user
 *                     resource_id: user-uuid-2
 *                     ip_address: 192.168.1.2
 *                     user_agent: Mozilla/5.0...
 *                     details:
 *                       role: Student
 *                       campus_id: campus-uuid-1
 *                     created_at: '2024-01-15T09:15:00Z'
 *                 pagination:
 *                   page: 1
 *                   limit: 50
 *                   total: 500
 *                   totalPages: 10
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions (Super_Admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: FORBIDDEN
 *                 message: Insufficient permissions. Super_Admin role required
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  generalRateLimiter,
  authenticate(),
  requireRole('Super_Admin'),
  validateAuditLogQuery,
  auditController.getAuditLogs
);

export default router;
