import config from './env.js';
import { sequelize, testConnection, syncDatabase, closeConnection } from './database.js';
import { redisClient, connectRedis, disconnectRedis, gracefulShutdown, redisHelpers } from './redis.js';

// Initialize all connections
const initializeConnections = async () => {
  console.log('Initializing database connections...');
  
  const dbConnected = await testConnection();
  const redisConnected = await connectRedis();

  if (!dbConnected) {
    throw new Error('Failed to connect to PostgreSQL database');
  }

  if (!redisConnected) {
    throw new Error('Failed to connect to Redis');
  }

  console.log('✓ All database connections initialized successfully');
  return { dbConnected, redisConnected };
};

// Close all connections
const closeAllConnections = async () => {
  console.log('Closing database connections...');
  await closeConnection();
  await gracefulShutdown();
  console.log('✓ All database connections closed');
};

export {
  config,
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection,
  redisClient,
  connectRedis,
  disconnectRedis,
  gracefulShutdown,
  redisHelpers,
  initializeConnections,
  closeAllConnections,
};

export default config;
