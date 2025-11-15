// Mock Redis client for testing
class MockRedisClient {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    const data = this.store.get(key);
    if (!data) return null;
    
    // Check if TTL expired
    const ttl = this.ttls.get(key);
    if (ttl && ttl < Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    
    return data;
  }

  async set(key, value, expirySeconds) {
    this.store.set(key, value);
    if (expirySeconds) {
      this.ttls.set(key, Date.now() + (expirySeconds * 1000));
    }
    return true;
  }

  async del(key) {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.ttls.delete(key);
    return existed;
  }

  async incr(key) {
    const current = this.store.get(key) || 0;
    const newValue = parseInt(current) + 1;
    this.store.set(key, newValue.toString());
    return newValue;
  }

  async expire(key, seconds) {
    if (this.store.has(key)) {
      this.ttls.set(key, Date.now() + (seconds * 1000));
      return true;
    }
    return false;
  }

  async ttl(key) {
    const expiry = this.ttls.get(key);
    if (!expiry) return -1;
    
    const remaining = Math.floor((expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async flushAll() {
    this.store.clear();
    this.ttls.clear();
  }

  // Helper for testing
  clear() {
    this.store.clear();
    this.ttls.clear();
  }
}

export const mockRedisHelpers = {
  client: new MockRedisClient(),
  
  async get(key) {
    return this.client.get(key);
  },
  
  async set(key, value, expirySeconds) {
    return this.client.set(key, value, expirySeconds);
  },
  
  async del(key) {
    return this.client.del(key);
  },
  
  async incr(key) {
    return this.client.incr(key);
  },
  
  async expire(key, seconds) {
    return this.client.expire(key, seconds);
  },
  
  async ttl(key) {
    return this.client.ttl(key);
  },
  
  clear() {
    this.client.clear();
  }
};

export default mockRedisHelpers;
