const { createClient } = require('redis');

class RedisClient {
  constructor() {
    // Create Redis client (v2.8.0)
    this.client = createClient();

    // Handle errors
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  // Check if the Redis client is alive
  isAlive() {
    return this.client.ready;
  }

  // Get value by key (callback-based in Redis v2.8.0)
  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          console.error(`Error fetching key "${key}":`, err);
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  // Set value by key with expiration (v2.8.0 callback style)
  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err) => {
        if (err) {
          console.error(`Error setting key "${key}":`, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Delete value by key (callback-based)
  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          console.error(`Error deleting key "${key}":`, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Export a RedisClient instance
const redisClient = new RedisClient();

module.exports = redisClient;
