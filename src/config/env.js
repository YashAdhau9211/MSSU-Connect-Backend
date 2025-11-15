import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database Configuration
  database: {
    // Support both DATABASE_URL (for Neon) and individual parameters
    url: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'mssu_connect',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: process.env.DB_DIALECT || 'postgres',
    storage: process.env.DB_STORAGE || null, // For SQLite
    dialectOptions: process.env.DB_DIALECT === 'sqlite' ? {} : {
      ssl: process.env.DATABASE_URL ? {
        require: true,
        rejectUnauthorized: false, // Neon requires SSL
      } : false,
    },
    pool: process.env.DB_DIALECT === 'sqlite' ? undefined : {
      min: parseInt(process.env.DB_POOL_MIN || '10', 10),
      max: parseInt(process.env.DB_POOL_MAX || '100', 10),
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
  },

  // Encryption Configuration
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'change-this-32-byte-key-in-prod',
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc',
  },

  // SMS Gateway Configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    apiKey: process.env.SMS_API_KEY || '',
    apiSecret: process.env.SMS_API_SECRET || '',
    fromNumber: process.env.SMS_FROM_NUMBER || '',
  },

  // Email Service Configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'ses',
    from: process.env.EMAIL_FROM || 'noreply@mssu.ac.in',
    region: process.env.EMAIL_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // Storage Configuration
  storage: {
    bucket: process.env.S3_BUCKET || 'mssu-connect-uploads',
    region: process.env.S3_REGION || 'ap-south-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
    otpMaxRequests: parseInt(process.env.OTP_RATE_LIMIT_MAX || '3', 10),
  },

  // Security Configuration
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    accountLockDuration: parseInt(process.env.ACCOUNT_LOCK_DURATION || '1800000', 10), // 30 minutes
    maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS || '5', 10),
    passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || '3600000', 10), // 1 hour
    otpExpiry: parseInt(process.env.OTP_EXPIRY || '300000', 10), // 5 minutes
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
};

// Validate critical configuration
const validateConfig = () => {
  const errors = [];

  if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'your-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set in production');
    }
    if (config.encryption.key === 'change-this-32-byte-key-in-prod') {
      errors.push('ENCRYPTION_KEY must be set in production');
    }
    if (!config.database.password || config.database.password === 'postgres') {
      errors.push('DB_PASSWORD must be set in production');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid configuration');
  }
};

// Run validation
validateConfig();

export default config;
