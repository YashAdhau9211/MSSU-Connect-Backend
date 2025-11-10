import { Sequelize } from 'sequelize';
import config from './env.js';

// Create Sequelize instance with connection pooling
// Support both DATABASE_URL (for Neon) and individual parameters
const sequelize = config.database.url
  ? new Sequelize(config.database.url, {
      dialect: config.database.dialect,
      dialectOptions: config.database.dialectOptions,
      pool: {
        min: config.database.pool.min,
        max: config.database.pool.max,
        acquire: config.database.pool.acquire,
        idle: config.database.pool.idle,
      },
      logging: config.database.logging,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    })
  : new Sequelize(
      config.database.name,
      config.database.user,
      config.database.password,
      {
        host: config.database.host,
        port: config.database.port,
        dialect: config.database.dialect,
        dialectOptions: config.database.dialectOptions,
        pool: {
          min: config.database.pool.min,
          max: config.database.pool.max,
          acquire: config.database.pool.acquire,
          idle: config.database.pool.idle,
        },
        logging: config.database.logging,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true,
        },
      }
    );

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL connection established successfully');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to PostgreSQL database:', error.message);
    return false;
  }
};

// Sync database models (use with caution in production)
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✓ Database synchronized successfully');
  } catch (error) {
    console.error('✗ Database synchronization failed:', error.message);
    throw error;
  }
};

// Close database connection
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✓ PostgreSQL connection closed');
  } catch (error) {
    console.error('✗ Error closing PostgreSQL connection:', error.message);
  }
};

export { sequelize, testConnection, syncDatabase, closeConnection };
export default sequelize;
