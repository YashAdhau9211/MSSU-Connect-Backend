import { createClient } from 'redis';
import config from './env.js';

// Create Redis client
const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    reconnectStrategy: config.redis.retryStrategy,
  },
  password: config.redis.password,
  database: config.redis.db,
});

// Error handling
redisClient.on('error', (err) => {
  console.error('✗ Redis Client Error:', err.message);
});

// Connection event
redisClient.on('connect', () => {
  console.log('⟳ Connecting to Redis...');
});

// Ready event
redisClient.on('ready', () => {
  console.log('✓ Redis connection established successfully');
});

// Reconnecting event
redisClient.on('reconnecting', () => {
  console.log('⟳ Reconnecting to Redis...');
});

// End event
redisClient.on('end', () => {
  console.log('✓ Redis connection closed');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return true;
  } catch (error) {
    console.error('✗ Failed to connect to Redis:', error.message);
    return false;
  }
};

// Disconnect from Redis
const disconnectRedis = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    console.error('✗ Error disconnecting from Redis:', error.message);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('✓ Redis connection closed gracefully');
    }
  } catch (error) {
    console.error('✗ Error during Redis graceful shutdown:', error.message);
    // Force close if graceful shutdown fails
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  }
};

// Helper functions for common Redis operations
const redisHelpers = {
  // Set key with optional expiry (in seconds)
  async set(key, value, expirySeconds = null) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (expirySeconds) {
        await redisClient.setEx(key, expirySeconds, stringValue);
      } else {
        await redisClient.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error.message);
      return false;
    }
  },

  // Get key value
  async get(key) {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      
      // Try to parse as JSON, return as string if parsing fails
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  },

  // Delete key
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error.message);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error.message);
      return false;
    }
  },

  // Set expiry on existing key
  async expire(key, seconds) {
    try {
      await redisClient.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error.message);
      return false;
    }
  },

  // Get TTL of key
  async ttl(key) {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error.message);
      return -1;
    }
  },

  // Increment value
  async incr(key) {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error.message);
      return null;
    }
  },

  // Get all keys matching pattern
  async keys(pattern) {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error.message);
      return [];
    }
  },
};

export { redisClient, connectRedis, disconnectRedis, gracefulShutdown, redisHelpers };
export default redisClient;
