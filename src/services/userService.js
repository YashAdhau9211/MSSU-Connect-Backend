import User from '../models/User.js';
import Campus from '../models/Campus.js';
import { hashPassword } from './passwordService.js';
import { uploadProfilePicture as uploadToS3, deleteProfilePicture as deleteFromS3 } from './storageService.js';
import { createAuditLog } from './auditService.js';
import { Op } from 'sequelize';

/**
 * Create a new user
 * @param {Object} userData - User data to create
 * @param {string} createdBy - ID of the admin creating the user
 * @returns {Promise<Object>} Created user object (excluding password_hash)
 */
export const createUser = async (userData, createdBy) => {
  try {
    const { email, phone, password, name, role, campus_id, profile_picture_url, address } = userData;

    // Validate required fields
    if (!email || !phone || !password || !name || !role || !campus_id) {
      throw new Error('Missing required fields: email, phone, password, name, role, campus_id');
    }

    // Validate email uniqueness
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      const error = new Error('Email already exists');
      error.code = 'EMAIL_EXISTS';
      error.statusCode = 409;
      throw error;
    }

    // Validate phone uniqueness (need to check encrypted values)
    const existingUserByPhone = await User.findOne({ where: { phone } });
    if (existingUserByPhone) {
      const error = new Error('Phone number already exists');
      error.code = 'PHONE_EXISTS';
      error.statusCode = 409;
      throw error;
    }

    // Verify campus exists
    const campus = await Campus.findByPk(campus_id);
    if (!campus) {
      const error = new Error('Campus not found');
      error.code = 'CAMPUS_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user (phone and address will be encrypted by model setters)
    const user = await User.create({
      email,
      phone, // Will be encrypted by model setter
      password_hash,
      name,
      role,
      campus_id,
      profile_picture_url: profile_picture_url || null,
      address: address || null, // Will be encrypted by model setter if provided
      account_status: 'active',
      failed_login_attempts: 0,
    });

    // Create audit log entry
    await createAuditLog({
      user_id: user.id,
      admin_id: createdBy,
      action_type: 'user_created',
      resource_type: 'user',
      resource_id: user.id,
      details: {
        email: user.email,
        role: user.role,
        campus_id: user.campus_id,
      },
    });

    // Return user without password_hash
    return user.toSafeObject();
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw error;
  }
};

/**
 * Get user by ID with campus-based filtering
 * @param {string} userId - User ID to retrieve
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} User object (excluding password_hash)
 */
export const getUserById = async (userId, requestingUser) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Apply campus-based filtering for non-Super_Admin users
    if (requestingUser && requestingUser.role !== 'Super_Admin') {
      if (user.campus_id !== requestingUser.campus_id) {
        const error = new Error('Access denied: resource belongs to different campus');
        error.code = 'FORBIDDEN';
        error.statusCode = 403;
        throw error;
      }
    }

    // Return user without password_hash (phone and address are auto-decrypted by model getters)
    return user.toSafeObject();
  } catch (error) {
    console.error('Error getting user by ID:', error.message);
    throw error;
  }
};

/**
 * Get user by email
 * @param {string} email - Email to search for
 * @returns {Promise<Object>} User object (excluding password_hash)
 */
export const getUserByEmail = async (email) => {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    const user = await User.findOne({
      where: {
        email,
        deleted_at: null,
      },
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Return user without password_hash (phone and address are auto-decrypted by model getters)
    return user.toSafeObject();
  } catch (error) {
    console.error('Error getting user by email:', error.message);
    throw error;
  }
};

/**
 * Get user by phone number
 * @param {string} phone - Phone number to search for
 * @returns {Promise<Object>} User object (excluding password_hash)
 */
export const getUserByPhone = async (phone) => {
  try {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Since phone is encrypted, we need to find all users and check decrypted values
    // This is not optimal for large datasets, but necessary with field-level encryption
    const users = await User.findAll({
      where: {
        deleted_at: null,
      },
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    // Find user with matching phone (decrypted by model getter)
    const user = users.find(u => u.phone === phone);

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Return user without password_hash (phone and address are auto-decrypted by model getters)
    return user.toSafeObject();
  } catch (error) {
    console.error('Error getting user by phone:', error.message);
    throw error;
  }
};

/**
 * List users with filtering, pagination, and sorting
 * @param {Object} filters - Filter criteria { role, campus_id, account_status, search }
 * @param {Object} pagination - Pagination options { page, limit, sortBy, sortOrder }
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} { users, pagination: { page, limit, total, totalPages } }
 */
export const listUsers = async (filters = {}, pagination = {}, requestingUser) => {
  try {
    const {
      role,
      campus_id,
      account_status,
      search,
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = pagination;

    // Validate and constrain pagination
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit)));

    // Build where clause
    const whereClause = {
      deleted_at: null,
    };

    // Apply campus-based filtering for non-Super_Admin users
    if (requestingUser && requestingUser.role !== 'Super_Admin') {
      whereClause.campus_id = requestingUser.campus_id;
    } else if (campus_id) {
      // Super_Admin can filter by specific campus
      whereClause.campus_id = campus_id;
    }

    // Apply role filter
    if (role) {
      whereClause.role = role;
    }

    // Apply account status filter
    if (account_status) {
      whereClause.account_status = account_status;
    }

    // Apply search filter (name or email)
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Validate sortBy field
    const validSortFields = ['name', 'email', 'created_at', 'last_login_at'];
    const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validatedSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Calculate offset
    const offset = (validatedPage - 1) * validatedLimit;

    // Query users with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
      limit: validatedLimit,
      offset: offset,
      order: [[validatedSortBy, validatedSortOrder]],
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / validatedLimit);

    // Return users without password_hash
    const safeUsers = users.map(user => user.toSafeObject());

    return {
      users: safeUsers,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total: count,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error listing users:', error.message);
    throw error;
  }
};

/**
 * Update user (Admin/Super_Admin operation)
 * @param {string} userId - User ID to update
 * @param {Object} updates - Fields to update
 * @param {string} updatedBy - ID of the admin updating the user
 * @returns {Promise<Object>} Updated user object (excluding password_hash)
 */
export const updateUser = async (userId, updates, updatedBy) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Email changes require special authorization (not implemented in this task)
    if (updates.email && updates.email !== user.email) {
      const error = new Error('Email changes require special authorization');
      error.code = 'FORBIDDEN';
      error.statusCode = 403;
      throw error;
    }

    // Validate phone uniqueness if being updated
    if (updates.phone && updates.phone !== user.phone) {
      const existingUserByPhone = await User.findOne({
        where: {
          phone: updates.phone,
          id: { [Op.ne]: userId },
          deleted_at: null,
        },
      });

      if (existingUserByPhone) {
        const error = new Error('Phone number already exists');
        error.code = 'PHONE_EXISTS';
        error.statusCode = 409;
        throw error;
      }
    }

    // Prepare update data (phone and address will be encrypted by model setters)
    const updateData = {};
    const allowedFields = ['name', 'phone', 'address', 'profile_picture_url', 'role', 'campus_id', 'account_status'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Update user
    await user.update(updateData);

    // Create audit log entry
    await createAuditLog({
      user_id: userId,
      admin_id: updatedBy,
      action_type: 'user_updated',
      resource_type: 'user',
      resource_id: userId,
      details: {
        updated_fields: Object.keys(updateData),
      },
    });

    // Reload user with associations
    await user.reload({
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    // Return updated user without password_hash
    return user.toSafeObject();
  } catch (error) {
    console.error('Error updating user:', error.message);
    throw error;
  }
};

/**
 * Update user profile (self-service operation)
 * @param {string} userId - User ID to update
 * @param {Object} profileData - Profile fields to update { name, phone, address, profile_picture_url }
 * @returns {Promise<Object>} Updated user object (excluding password_hash)
 */
export const updateProfile = async (userId, profileData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Validate phone uniqueness if being updated
    if (profileData.phone && profileData.phone !== user.phone) {
      const existingUserByPhone = await User.findOne({
        where: {
          phone: profileData.phone,
          id: { [Op.ne]: userId },
          deleted_at: null,
        },
      });

      if (existingUserByPhone) {
        const error = new Error('Phone number already exists');
        error.code = 'PHONE_EXISTS';
        error.statusCode = 409;
        throw error;
      }
    }

    // Prepare update data (only allow specific fields for self-service)
    const updateData = {};
    const allowedFields = ['name', 'phone', 'address', 'profile_picture_url'];
    
    for (const field of allowedFields) {
      if (profileData[field] !== undefined) {
        updateData[field] = profileData[field];
      }
    }

    // Update user
    await user.update(updateData);

    // Reload user with associations
    await user.reload({
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    // Return updated user without password_hash
    return user.toSafeObject();
  } catch (error) {
    console.error('Error updating profile:', error.message);
    throw error;
  }
};

/**
 * Activate user account
 * @param {string} userId - User ID to activate
 * @param {string} adminId - ID of the admin performing the action
 * @returns {Promise<Object>} Updated user object (excluding password_hash)
 */
export const activateUser = async (userId, adminId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = user.account_status;

    // Update account status to active
    await user.update({
      account_status: 'active',
      locked_until: null,
      failed_login_attempts: 0,
    });

    // Create audit log entry
    await createAuditLog({
      user_id: userId,
      admin_id: adminId,
      action_type: 'status_changed',
      resource_type: 'user',
      resource_id: userId,
      details: {
        previous_status: previousStatus,
        new_status: 'active',
        action: 'activate',
      },
    });

    // Reload user with associations
    await user.reload({
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    // Return updated user without password_hash
    return user.toSafeObject();
  } catch (error) {
    console.error('Error activating user:', error.message);
    throw error;
  }
};

/**
 * Deactivate user account
 * @param {string} userId - User ID to deactivate
 * @param {string} adminId - ID of the admin performing the action
 * @param {string} reason - Reason for deactivation
 * @returns {Promise<Object>} Updated user object (excluding password_hash)
 */
export const deactivateUser = async (userId, adminId, reason) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = user.account_status;

    // Update account status to inactive
    await user.update({
      account_status: 'inactive',
    });

    // Create audit log entry
    await createAuditLog({
      user_id: userId,
      admin_id: adminId,
      action_type: 'status_changed',
      resource_type: 'user',
      resource_id: userId,
      details: {
        previous_status: previousStatus,
        new_status: 'inactive',
        action: 'deactivate',
        reason: reason || 'No reason provided',
      },
    });

    // Reload user with associations
    await user.reload({
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    // Return updated user without password_hash
    return user.toSafeObject();
  } catch (error) {
    console.error('Error deactivating user:', error.message);
    throw error;
  }
};

/**
 * Lock user account
 * @param {string} userId - User ID to lock
 * @param {string} adminId - ID of the admin performing the action
 * @param {string} reason - Reason for locking
 * @returns {Promise<Object>} Updated user object (excluding password_hash)
 */
export const lockUser = async (userId, adminId, reason) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = user.account_status;

    // Update account status to locked
    await user.update({
      account_status: 'locked',
    });

    // Create audit log entry
    await createAuditLog({
      user_id: userId,
      admin_id: adminId,
      action_type: 'status_changed',
      resource_type: 'user',
      resource_id: userId,
      details: {
        previous_status: previousStatus,
        new_status: 'locked',
        action: 'lock',
        reason: reason || 'No reason provided',
      },
    });

    // Reload user with associations
    await user.reload({
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    // Return updated user without password_hash
    return user.toSafeObject();
  } catch (error) {
    console.error('Error locking user:', error.message);
    throw error;
  }
};

/**
 * Delete user (soft delete)
 * @param {string} userId - User ID to delete
 * @param {string} adminId - ID of the admin performing the action
 * @param {string} reason - Reason for deletion
 * @returns {Promise<Object>} Deleted user object (excluding password_hash)
 */
export const deleteUser = async (userId, adminId, reason) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Soft delete: set deleted_at timestamp and update account_status to inactive
    await user.update({
      deleted_at: new Date(),
      account_status: 'inactive',
    });

    // Create audit log entry
    await createAuditLog({
      user_id: userId,
      admin_id: adminId,
      action_type: 'user_deleted',
      resource_type: 'user',
      resource_id: userId,
      details: {
        reason: reason || 'No reason provided',
        deleted_at: new Date(),
      },
    });

    // Reload user with associations
    await user.reload({
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    // Return deleted user without password_hash
    return user.toSafeObject();
  } catch (error) {
    console.error('Error deleting user:', error.message);
    throw error;
  }
};

/**
 * Upload profile picture for user
 * @param {string} userId - User ID
 * @param {Object} file - File object with buffer and metadata
 * @returns {Promise<Object>} Updated user object with new profile picture URL
 */
export const uploadProfilePicture = async (userId, file) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!file || !file.buffer) {
      throw new Error('File is required');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      const error = new Error('File size exceeds 5MB limit');
      error.code = 'FILE_TOO_LARGE';
      error.statusCode = 400;
      throw error;
    }

    // Validate file format (JPEG, PNG)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file format. Only JPEG and PNG are allowed');
      error.code = 'INVALID_FILE_FORMAT';
      error.statusCode = 400;
      throw error;
    }

    // Find user
    const user = await User.findOne({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Store old profile picture URL for deletion
    const oldProfilePictureUrl = user.profile_picture_url;

    // Upload new profile picture to S3 (will be resized to 500x500)
    const newProfilePictureUrl = await uploadToS3(file.buffer, userId);

    // Update user's profile_picture_url
    await user.update({
      profile_picture_url: newProfilePictureUrl,
    });

    // Delete old profile picture from S3 if it exists
    if (oldProfilePictureUrl) {
      await deleteFromS3(oldProfilePictureUrl);
    }

    // Reload user with associations
    await user.reload({
      include: [{
        model: Campus,
        as: 'campus',
        attributes: ['id', 'name', 'code'],
      }],
    });

    // Return updated user without password_hash
    return user.toSafeObject();
  } catch (error) {
    console.error('Error uploading profile picture:', error.message);
    throw error;
  }
};

export default {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  listUsers,
  updateUser,
  updateProfile,
  activateUser,
  deactivateUser,
  lockUser,
  deleteUser,
  uploadProfilePicture,
};
