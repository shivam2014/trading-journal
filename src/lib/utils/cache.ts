/**
 * Simple in-memory cache implementation with TTL support
 */

interface CacheItem<T> {
  value: T;
  expires: number | null; // Timestamp when the item expires, null for no expiration
}

class Cache {
  private storage: Map<string, CacheItem<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Initialize cleanup interval if in browser environment
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Clean up every minute
    }
  }

  /**
   * Set a value in the cache with an optional TTL
   * @param key The cache key
   * @param value The value to store
   * @param ttl Time to live in milliseconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expires = ttl ? Date.now() + ttl : null;
    this.storage.set(key, { value, expires });
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const item = this.storage.get(key);
    
    // If item doesn't exist or is expired
    if (!item || (item.expires !== null && item.expires < Date.now())) {
      if (item) this.storage.delete(key); // Remove expired item
      return undefined;
    }
    
    return item.value as T;
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param key The cache key
   * @returns Boolean indicating if the key exists and is valid
   */
  has(key: string): boolean {
    const item = this.storage.get(key);
    if (!item) return false;
    if (item.expires !== null && item.expires < Date.now()) {
      this.storage.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key from the cache
   * @param key The cache key
   */
  delete(key: string): void {
    this.storage.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Remove all expired items from the cache
   */
  cleanup(): void {
    const now = Date.now();
    this.storage.forEach((item, key) => {
      if (item.expires !== null && item.expires < now) {
        this.storage.delete(key);
      }
    });
  }

  /**
   * Get stats about the cache
   */
  getStats(): { size: number; expired: number } {
    let expired = 0;
    const now = Date.now();
    
    this.storage.forEach((item) => {
      if (item.expires !== null && item.expires < now) {
        expired++;
      }
    });
    
    return {
      size: this.storage.size,
      expired,
    };
  }

  /**
   * Destroy the cache and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }
}

// Create a singleton cache instance
export const cache = new Cache();

// Handle cleanup when module is unloaded (in development with hot reloading)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cache.destroy();
  });
}