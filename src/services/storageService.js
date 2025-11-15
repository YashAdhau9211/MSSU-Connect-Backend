import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import config from '../config/env.js';
import sharp from 'sharp';
import crypto from 'crypto';

/**
 * Initialize S3 Client
 */
const s3Client = new S3Client({
  region: config.storage.region,
  credentials: {
    accessKeyId: config.storage.accessKeyId,
    secretAccessKey: config.storage.secretAccessKey,
  },
});

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} S3 URL of uploaded file
 */
export const uploadFile = async (fileBuffer, key, contentType) => {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: config.storage.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read', // Make profile pictures publicly accessible
      },
    });

    await upload.done();

    // Construct S3 URL
    const url = `https://${config.storage.bucket}.s3.${config.storage.region}.amazonaws.com/${key}`;
    
    return url;
  } catch (error) {
    console.error('Error uploading file to S3:', error.message);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} key - S3 object key (path)
 * @returns {Promise<boolean>} Success status
 */
export const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
    });

    await s3Client.send(command);
    
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error.message);
    // Don't throw error for delete failures, just log
    return false;
  }
};

/**
 * Check if file exists in S3
 * @param {string} key - S3 object key (path)
 * @returns {Promise<boolean>} True if file exists
 */
export const fileExists = async (key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * Get S3 URL for a key
 * @param {string} key - S3 object key (path)
 * @returns {string} S3 URL
 */
export const getFileUrl = (key) => {
  return `https://${config.storage.bucket}.s3.${config.storage.region}.amazonaws.com/${key}`;
};

/**
 * Extract S3 key from URL
 * @param {string} url - S3 URL
 * @returns {string|null} S3 key or null if not a valid S3 URL
 */
export const extractKeyFromUrl = (url) => {
  try {
    if (!url) return null;
    
    // Match pattern: https://bucket.s3.region.amazonaws.com/key
    const regex = new RegExp(`https://${config.storage.bucket}\\.s3\\.${config.storage.region}\\.amazonaws\\.com/(.+)`);
    const match = url.match(regex);
    
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Process and upload profile picture
 * @param {Buffer} fileBuffer - Original image buffer
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<string>} S3 URL of uploaded profile picture
 */
export const uploadProfilePicture = async (fileBuffer, userId) => {
  try {
    // Resize image to 500x500 pixels using sharp
    const processedBuffer = await sharp(fileBuffer)
      .resize(500, 500, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer();

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const key = `profiles/${userId}/${timestamp}-${randomString}.jpg`;

    // Upload to S3
    const url = await uploadFile(processedBuffer, key, 'image/jpeg');

    return url;
  } catch (error) {
    console.error('Error processing and uploading profile picture:', error.message);
    throw new Error(`Failed to process profile picture: ${error.message}`);
  }
};

/**
 * Delete profile picture from S3
 * @param {string} profilePictureUrl - Current profile picture URL
 * @returns {Promise<boolean>} Success status
 */
export const deleteProfilePicture = async (profilePictureUrl) => {
  try {
    if (!profilePictureUrl) {
      return false;
    }

    const key = extractKeyFromUrl(profilePictureUrl);
    if (!key) {
      console.warn('Could not extract S3 key from URL:', profilePictureUrl);
      return false;
    }

    return await deleteFile(key);
  } catch (error) {
    console.error('Error deleting profile picture:', error.message);
    return false;
  }
};

export default {
  uploadFile,
  deleteFile,
  fileExists,
  getFileUrl,
  extractKeyFromUrl,
  uploadProfilePicture,
  deleteProfilePicture,
};
