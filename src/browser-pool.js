import { setInterval, clearInterval } from 'node:timers';
import { launchBrowser, closeBrowser } from './browser.js';

export class BrowserPool {
  constructor({
    maxSize = parseInt(process.env.LEAN_BROWSER_POOL_SIZE, 10) || 5,
    idleTimeoutMs = 5 * 60 * 1000, // 5 minutes
    healthCheckIntervalMs = 30 * 1000, // 30 seconds
    headless = true,
    userAgent = 'lean-browser/0.2 (+https://github.com/)',
  } = {}) {
    this.maxSize = maxSize;
    this.idleTimeoutMs = idleTimeoutMs;
    this.healthCheckIntervalMs = healthCheckIntervalMs;
    this.headless = headless;
    this.userAgent = userAgent;

    // Pool state
    this.available = []; // Available browser instances
    this.inUse = new Set(); // Currently in-use browser instances
    this.shuttingDown = false;

    // Statistics
    this.stats = {
      totalRequests: 0,
      poolHits: 0,
      poolMisses: 0,
      browsersCreated: 0,
      browsersClosed: 0,
      browsersCrashed: 0,
    };

    // Health check timer
    this.healthCheckTimer = null;
    this.startHealthCheck();
  }

  // Create a new browser instance with metadata
  async createBrowserInstance() {
    const instance = await launchBrowser({
      headless: this.headless,
      userAgent: this.userAgent,
    });

    const wrappedInstance = {
      ...instance,
      metadata: {
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        requestCount: 0,
        id: `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    this.stats.browsersCreated++;
    return wrappedInstance;
  }

  // Check if a browser instance is still healthy
  async isHealthy(instance) {
    try {
      // Check if browser is still connected
      if (!instance.browser?.isConnected()) {
        return false;
      }

      // Try a simple operation to verify health
      const contexts = instance.browser.contexts();
      if (contexts.length === 0) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // Health check routine that runs periodically
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckIntervalMs);

    // Don't prevent process from exiting
    if (this.healthCheckTimer.unref) {
      this.healthCheckTimer.unref();
    }
  }

  async performHealthCheck() {
    const now = Date.now();

    // Check available browsers for health and idle timeout
    for (let i = this.available.length - 1; i >= 0; i--) {
      const instance = this.available[i];
      const idleTime = now - instance.metadata.lastUsedAt;

      // Remove if idle too long
      if (idleTime > this.idleTimeoutMs) {
        this.available.splice(i, 1);
        await this.destroyInstance(instance, 'idle timeout');
        continue;
      }

      // Remove if unhealthy
      const healthy = await this.isHealthy(instance);
      if (!healthy) {
        this.available.splice(i, 1);
        await this.destroyInstance(instance, 'unhealthy');
        this.stats.browsersCrashed++;
      }
    }

    // Check in-use browsers for health
    for (const instance of this.inUse) {
      const healthy = await this.isHealthy(instance);
      if (!healthy) {
        this.inUse.delete(instance);
        this.stats.browsersCrashed++;
        // In-use browser crashed, will be detected when released
      }
    }
  }

  // Acquire a browser from the pool
  async acquire() {
    if (this.shuttingDown) {
      throw new Error('Browser pool is shutting down');
    }

    this.stats.totalRequests++;

    // Try to get an available browser
    if (this.available.length > 0) {
      const instance = this.available.pop();

      // Verify it's still healthy
      const healthy = await this.isHealthy(instance);
      if (!healthy) {
        await this.destroyInstance(instance, 'unhealthy on acquire');
        this.stats.browsersCrashed++;
        // Recursively try again
        return this.acquire();
      }

      instance.metadata.lastUsedAt = Date.now();
      instance.metadata.requestCount++;
      this.inUse.add(instance);
      this.stats.poolHits++;
      return instance;
    }

    // Create new browser if under max size
    if (this.inUse.size < this.maxSize) {
      const instance = await this.createBrowserInstance();
      instance.metadata.requestCount++;
      this.inUse.add(instance);
      this.stats.poolMisses++;
      return instance;
    }

    // Pool is full, wait a bit and retry (graceful degradation)
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.acquire();
  }

  // Release a browser back to the pool
  async release(instance) {
    if (!instance) {
      return;
    }

    // Remove from in-use set
    this.inUse.delete(instance);

    // Check if still healthy
    const healthy = await this.isHealthy(instance);
    if (!healthy) {
      await this.destroyInstance(instance, 'unhealthy on release');
      this.stats.browsersCrashed++;
      return;
    }

    // Update metadata
    instance.metadata.lastUsedAt = Date.now();

    // Close all pages except the context's default page
    try {
      const pages = instance.context.pages();
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close().catch(() => {});
      }

      // Navigate the main page to about:blank to clean state
      if (pages[0]) {
        await pages[0].goto('about:blank').catch(() => {});
      }
    } catch {
      // If cleanup fails, destroy the instance
      await this.destroyInstance(instance, 'cleanup failed');
      return;
    }

    // Add back to available pool if not shutting down
    if (!this.shuttingDown) {
      this.available.push(instance);
    } else {
      await this.destroyInstance(instance, 'pool shutting down');
    }
  }

  // Destroy a browser instance
  async destroyInstance(instance, _reason = 'unknown') {
    try {
      await closeBrowser(instance);
      this.stats.browsersClosed++;
    } catch {
      // Ignore errors during cleanup
    }
  }

  // Drain the pool (close all browsers)
  async drain() {
    this.shuttingDown = true;

    // Stop health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Close all available browsers
    const availablePromises = this.available.map((instance) => this.destroyInstance(instance, 'drain'));
    await Promise.all(availablePromises);
    this.available = [];

    // Close all in-use browsers (force close)
    const inUsePromises = Array.from(this.inUse).map((instance) => this.destroyInstance(instance, 'drain (in-use)'));
    await Promise.all(inUsePromises);
    this.inUse.clear();
  }

  // Get pool statistics
  getStats() {
    return {
      ...this.stats,
      availableCount: this.available.length,
      inUseCount: this.inUse.size,
      totalCount: this.available.length + this.inUse.size,
      maxSize: this.maxSize,
      poolUtilization: (this.inUse.size / this.maxSize) * 100,
      hitRate: this.stats.totalRequests > 0 ? (this.stats.poolHits / this.stats.totalRequests) * 100 : 0,
    };
  }
}

// Global singleton pool instance
let globalPool = null;

// Get or create the global pool
export function getGlobalPool() {
  if (!globalPool) {
    globalPool = new BrowserPool();
  }
  return globalPool;
}

// Set a custom global pool (for testing)
export function setGlobalPool(pool) {
  globalPool = pool;
}

// Reset the global pool
export async function resetGlobalPool() {
  if (globalPool) {
    await globalPool.drain();
    globalPool = null;
  }
}
