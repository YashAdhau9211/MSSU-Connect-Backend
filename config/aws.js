/**
 * AWS Services Configuration
 * 
 * This file provides configuration for AWS services used in the application:
 * - S3 (Simple Storage Service) for file storage (profile pictures)
 * - SES (Simple Email Service) for sending emails
 * 
 * Environment-specific configurations for development, staging, and production
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * AWS S3 Configuration
 * Used for storing user profile pictures and other file uploads
 */
export const s3Config = {
  // AWS Credentials
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // S3 Bucket Configuration
  bucket: process.env.S3_BUCKET || 'mssu-connect-uploads',
  region: process.env.S3_REGION || 'ap-south-1',

  // File Upload Settings
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
  allowedExtensions: ['.jpg', '.jpeg', '.png'],

  // S3 Object Settings
  acl: 'public-read', // Profile pictures are publicly accessible
  serverSideEncryption: 'AES256',

  // URL Settings
  urlExpiry: 3600, // Signed URL expiry in seconds (1 hour)
  
  // Folder structure
  folders: {
    profilePictures: 'profiles',
    documents: 'documents',
    temp: 'temp',
  },
};

/**
 * AWS SES Configuration
 * Used for sending transactional emails (password reset, MFA codes, etc.)
 */
export const sesConfig = {
  // AWS Credentials
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // SES Configuration
  region: process.env.EMAIL_REGION || 'ap-south-1',
  
  // Email Settings
  from: process.env.EMAIL_FROM || 'noreply@mssu.ac.in',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@mssu.ac.in',

  // Email Templates
  templates: {
    passwordReset: 'password-reset',
    mfaCode: 'mfa-code',
    welcomeEmail: 'welcome',
    accountLocked: 'account-locked',
  },

  // Rate Limiting
  maxSendRate: 14, // Maximum emails per second (SES default for new accounts)
  
  // Retry Configuration
  maxRetries: 3,
  retryDelay: 1000, // Initial retry delay in ms
};

/**
 * Environment-specific AWS configurations
 */
const awsConfig = {
  development: {
    s3: {
      ...s3Config,
      // Use local bucket or mock in development
      bucket: process.env.S3_BUCKET || 'mssu-connect-dev',
    },
    ses: {
      ...sesConfig,
      // Use SES sandbox in development
      from: process.env.EMAIL_FROM || 'dev@mssu.ac.in',
    },
  },

  staging: {
    s3: {
      ...s3Config,
      bucket: process.env.S3_BUCKET || 'mssu-connect-staging',
    },
    ses: {
      ...sesConfig,
      from: process.env.EMAIL_FROM || 'staging@mssu.ac.in',
    },
  },

  production: {
    s3: {
      ...s3Config,
      bucket: process.env.S3_BUCKET || 'mssu-connect-prod',
      // Stricter settings for production
      serverSideEncryption: 'aws:kms', // Use KMS for better security
    },
    ses: {
      ...sesConfig,
      from: process.env.EMAIL_FROM || 'noreply@mssu.ac.in',
    },
  },
};

/**
 * Helper function to build S3 object key
 */
export const buildS3Key = (folder, userId, filename) => {
  const timestamp = Date.now();
  const extension = filename.substring(filename.lastIndexOf('.'));
  return `${folder}/${userId}/${timestamp}${extension}`;
};

/**
 * Helper function to get S3 object URL
 */
export const getS3Url = (key) => {
  const environment = process.env.NODE_ENV || 'development';
  const config = awsConfig[environment].s3;
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
};

/**
 * Validate AWS configuration
 */
export const validateAwsConfig = () => {
  const errors = [];
  const environment = process.env.NODE_ENV || 'development';

  // Skip validation in development if credentials are not set
  if (environment === 'development') {
    return;
  }

  // Check S3 credentials
  if (!s3Config.credentials.accessKeyId || !s3Config.credentials.secretAccessKey) {
    errors.push('AWS S3 credentials (S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY) must be set');
  }

  // Check SES credentials
  if (!sesConfig.credentials.accessKeyId || !sesConfig.credentials.secretAccessKey) {
    errors.push('AWS SES credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) must be set');
  }

  // Check bucket name
  if (!s3Config.bucket) {
    errors.push('S3_BUCKET must be set');
  }

  // Check email from address
  if (!sesConfig.from) {
    errors.push('EMAIL_FROM must be set');
  }

  if (errors.length > 0) {
    console.warn('AWS Configuration validation warnings:');
    errors.forEach(error => console.warn(`  - ${error}`));
    
    if (environment === 'production') {
      throw new Error('Invalid AWS configuration in production');
    }
  }
};

// Run validation
validateAwsConfig();

// Export configuration for current environment
const environment = process.env.NODE_ENV || 'development';
export default awsConfig[environment];

// Export all configurations
export { awsConfig };
