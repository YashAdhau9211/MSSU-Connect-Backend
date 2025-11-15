import express from 'express';
import * as userController from '../controllers/userController.js';
import {
  authenticate,
  requireRole,
  requireCampusAccess,
  validateUserUpdate,
  validateStatusChange,
  validateUserDeletion,
  validateUserListQuery,
  validateUUIDParam,
  generalRateLimiter,
  sensitiveOperationRateLimiter
} from '../middleware/index.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List users with filtering and pagination
 *     description: |
 *       Retrieve a paginated list of users with optional filtering. 
 *       Admin users can only see users from their campus. 
 *       Super_Admin users can see users from all campuses.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Student, Teacher, Parent, Admin, Super_Admin]
 *         description: Filter by user role
 *       - in: query
 *         name: campus_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by campus ID (Super_Admin only)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, locked]
 *         description: Filter by account status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  generalRateLimiter,
  authenticate(),
  requireRole('Admin', 'Super_Admin'),
  validateUserListQuery,
  userController.listUsers
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: |
 *       Retrieve detailed information about a specific user.
 *       Admin users can only access users from their campus.
 *       Super_Admin users can access users from all campuses.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:id',
  generalRateLimiter,
  authenticate(),
  requireRole('Admin', 'Super_Admin'),
  validateUUIDParam('id'),
  requireCampusAccess(),
  userController.getUserById
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user information
 *     description: |
 *       Update user details. Admin users can only update users from their campus.
 *       Super_Admin users can update users from all campuses.
 *       Email changes require special authorization.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Updated
 *               phone:
 *                 type: string
 *                 pattern: '^\+91[0-9]{10}$'
 *                 example: '+919876543211'
 *               address:
 *                 type: string
 *                 example: 456 New Street
 *               role:
 *                 type: string
 *                 enum: [Student, Teacher, Parent, Admin, Super_Admin]
 *                 description: Requires Super_Admin role
 *               campus_id:
 *                 type: string
 *                 format: uuid
 *                 description: Requires Super_Admin role
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Phone number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: PHONE_EXISTS
 *                 message: Phone number already registered
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  '/:id',
  generalRateLimiter,
  authenticate(),
  requireRole('Admin', 'Super_Admin'),
  validateUUIDParam('id'),
  requireCampusAccess(),
  validateUserUpdate,
  userController.updateUser
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user (soft delete)
 *     description: |
 *       Soft delete a user account. Requires MFA verification.
 *       Admin users can only delete users from their campus.
 *       Super_Admin users can delete users from all campuses.
 *       The user account is marked as deleted but data is retained for audit purposes.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mfaCode
 *               - reason
 *             properties:
 *               mfaCode:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: '123456'
 *                 description: 6-digit MFA code sent to admin's email
 *               reason:
 *                 type: string
 *                 example: Graduation
 *                 description: Reason for deletion
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 *                   example: User deleted successfully
 *       400:
 *         description: Invalid MFA code or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: MFA_INVALID
 *                 message: Invalid MFA code
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  '/:id',
  sensitiveOperationRateLimiter,
  authenticate(),
  requireRole('Admin', 'Super_Admin'),
  validateUUIDParam('id'),
  requireCampusAccess(),
  validateUserDeletion,
  userController.deleteUser
);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Update user account status
 *     description: |
 *       Change user account status to active, inactive, or locked.
 *       Admin users can only update users from their campus.
 *       Super_Admin users can update users from all campuses.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, locked]
 *                 example: inactive
 *               reason:
 *                 type: string
 *                 example: Temporary suspension
 *                 description: Reason for status change (optional but recommended)
 *     responses:
 *       200:
 *         description: User status updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: User status updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  '/:id/status',
  sensitiveOperationRateLimiter,
  authenticate(),
  requireRole('Admin', 'Super_Admin'),
  validateUUIDParam('id'),
  requireCampusAccess(),
  validateStatusChange,
  userController.updateStatus
);

export default router;
