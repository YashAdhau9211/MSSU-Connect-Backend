import { Sequelize } from 'sequelize';
import config from './env.js';

// Create Sequelize instance with connection pooling
// Support DATABASE_URL (for Neon), SQLite (for testing), and individual parameters
let sequelize;

if (config.database.dialect === 'sqlite') {
  // SQLite configuration for testing
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.database.storage || ':memory:',
    logging: config.database.logging,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  });
} else if (config.database.url) {
  // Neon or other DATABASE_URL
  sequelize = new Sequelize(config.database.url, {
    dialect: config.database.dialect,
    dialectOptions: config.database.dialectOptions,
    pool: config.database.pool,
    logging: config.database.logging,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  });
} else {
  // Individual parameters
  sequelize = new Sequelize(
    config.database.name,
    config.database.user,
    config.database.password,
    {
      host: config.database.host,
      port: config.database.port,
      dialect: config.database.dialect,
      dialectOptions: config.database.dialectOptions,
      pool: config.database.pool,
      logging: config.database.logging,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    }
  );
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✓ Database connection established successfully (${config.database.dialect})`);
    return true;
  } catch (error) {
    console.error(`✗ Unable to connect to database (${config.database.dialect}):`, error.message);
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
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('✗ Error closing database connection:', error.message);
  }
};

export { sequelize, testConnection, syncDatabase, closeConnection };
export default sequelize;
