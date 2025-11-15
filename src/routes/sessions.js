import express from 'express';
import * as sessionController from '../controllers/sessionController.js';
import {
  authenticate,
  generalRateLimiter
} from '../middleware/index.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/sessions:
 *   get:
 *     summary: Get all active sessions
 *     description: |
 *       Retrieve all active sessions for the authenticated user.
 *       Shows device information, IP addresses, and last activity for each session.
 *       The current session is marked with is_current flag.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved successfully
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
 *                     sessions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Session'
 *             example:
 *               success: true
 *               data:
 *                 sessions:
 *                   - id: session-uuid-1
 *                     device_type: mobile
 *                     device_name: iPhone 13
 *                     ip_address: 192.168.1.1
 *                     last_activity: '2024-01-15T10:30:00Z'
 *                     created_at: '2024-01-15T08:00:00Z'
 *                     is_current: true
 *                   - id: session-uuid-2
 *                     device_type: web
 *                     device_name: Chrome on Windows
 *                     ip_address: 192.168.1.2
 *                     last_activity: '2024-01-14T15:20:00Z'
 *                     created_at: '2024-01-14T14:00:00Z'
 *                     is_current: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  generalRateLimiter,
  authenticate(),
  sessionController.getActiveSessions
);

/**
 * @swagger
 * /api/v1/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     description: |
 *       Revoke (logout) a specific session by its ID.
 *       This will invalidate the tokens associated with that session.
 *       Users can revoke any of their own sessions except the current one.
 *       To logout from the current session, use the /auth/logout endpoint.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Session revoked successfully
 *       400:
 *         description: Cannot revoke current session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Cannot revoke current session. Use /auth/logout instead
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: RESOURCE_NOT_FOUND
 *                 message: Session not found
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  '/:id',
  generalRateLimiter,
  authenticate(),
  sessionController.revokeSession
);

export default router;
