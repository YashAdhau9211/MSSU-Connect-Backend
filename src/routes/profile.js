import express from 'express';
import multer from 'multer';
import * as profileController from '../controllers/profileController.js';
import {
  authenticate,
  validateProfileUpdate,
  validatePasswordChange,
  generalRateLimiter,
  uploadRateLimiter
} from '../middleware/index.js';

const router = express.Router();

/**
 * Configure multer for profile picture upload
 * Store files in memory as buffers for processing
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only JPEG and PNG images
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG and PNG images are allowed.'), false);
    }
  }
});

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     summary: Get current user's profile
 *     description: Retrieve the authenticated user's profile information including all personal details.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
  profileController.getProfile
);

/**
 * @swagger
 * /api/v1/profile:
 *   put:
 *     summary: Update current user's profile
 *     description: |
 *       Update the authenticated user's profile information.
 *       Users can update their name, phone, and address.
 *       Email, role, and campus_id cannot be changed through this endpoint.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
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
 *                 example: 456 New Street, City
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
  '/',
  generalRateLimiter,
  authenticate(),
  validateProfileUpdate,
  profileController.updateProfile
);

/**
 * @swagger
 * /api/v1/profile/picture:
 *   post:
 *     summary: Upload profile picture
 *     description: |
 *       Upload a new profile picture for the authenticated user.
 *       The image will be automatically resized to 500x500 pixels.
 *       Maximum file size: 5MB. Allowed formats: JPEG, PNG.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - picture
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture file (JPEG or PNG, max 5MB)
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
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
 *                     profile_picture_url:
 *                       type: string
 *                       format: uri
 *                       example: https://s3.amazonaws.com/mssu-connect/profiles/user-id/1234567890.jpg
 *                 message:
 *                   type: string
 *                   example: Profile picture uploaded successfully
 *       400:
 *         description: Invalid file format or size
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidFormat:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Invalid file format. Only JPEG and PNG images are allowed
 *               fileTooLarge:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: File size exceeds 5MB limit
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/picture',
  uploadRateLimiter,
  authenticate(),
  upload.single('picture'),
  profileController.uploadProfilePicture
);

/**
 * @swagger
 * /api/v1/profile/password:
 *   put:
 *     summary: Change password
 *     description: |
 *       Change the password for the authenticated user.
 *       Requires the current password for verification.
 *       New password must meet strength requirements (min 8 characters, uppercase, lowercase, number).
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 example: OldPass123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewPass123
 *                 description: Must be at least 8 characters with uppercase, lowercase, and number
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: Password changed successfully
 *       400:
 *         description: Validation error or weak password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               weakPassword:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Password does not meet strength requirements
 *               incorrectPassword:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_CREDENTIALS
 *                     message: Current password is incorrect
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  '/password',
  generalRateLimiter,
  authenticate(),
  validatePasswordChange,
  profileController.changePassword
);

export default router;
