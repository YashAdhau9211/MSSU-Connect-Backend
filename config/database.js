/**
 * Sequelize Configuration for Different Environments
 * 
 * This file provides environment-specific database configurations for Sequelize.
 * It supports both DATABASE_URL (for cloud providers like Neon) and individual parameters.
 * 
 * Environments: development, staging, production
 */

import dotenv from 'dotenv';
dotenv.config();

const baseConfig = {
  dialect: 'postgres',
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '10', 10),
    max: parseInt(process.env.DB_POOL_MAX || '100', 10),
    acquire: 30000, // Maximum time (ms) to acquire connection
    idle: 10000,    // Maximum time (ms) connection can be idle
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
};

const config = {
  development: {
    ...baseConfig,
    // Support both DATABASE_URL and individual parameters
    ...(process.env.DATABASE_URL
      ? {
          use_env_variable: 'DATABASE_URL',
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }
      : {
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'mssu_connect_dev',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
        }),
    logging: console.log, // Enable SQL logging in development
  },

  staging: {
    ...baseConfig,
    ...(process.env.DATABASE_URL
      ? {
          use_env_variable: 'DATABASE_URL',
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }
      : {
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME || 'mssu_connect_staging',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432', 10),
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }),
    logging: false, // Disable SQL logging in staging
  },

  production: {
    ...baseConfig,
    ...(process.env.DATABASE_URL
      ? {
          use_env_variable: 'DATABASE_URL',
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }
      : {
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME || 'mssu_connect_prod',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432', 10),
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }),
    logging: false, // Disable SQL logging in production
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '20', 10),
      max: parseInt(process.env.DB_POOL_MAX || '200', 10),
      acquire: 60000,
      idle: 10000,
    },
  },
};

// Export configuration for current environment
const environment = process.env.NODE_ENV || 'development';
export default config[environment];

// Export all configurations for migration tools
export { config };
