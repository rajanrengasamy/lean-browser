import { describe, it, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPool, getGlobalPool, setGlobalPool, resetGlobalPool } from '../../src/browser-pool.js';

describe('BrowserPool', () => {
  let pool;

  beforeEach(() => {
    pool = new BrowserPool({
      maxSize: 3,
      idleTimeoutMs: 2000,
      healthCheckIntervalMs: 500,
    });
  });

  afterEach(async () => {
    if (pool) {
      await pool.drain();
    }
  });

  describe('constructor', () => {
    it('creates pool with default config', () => {
      const defaultPool = new BrowserPool();
      assert.equal(defaultPool.maxSize, 5);
      assert.equal(defaultPool.idleTimeoutMs, 5 * 60 * 1000);
      assert.equal(defaultPool.healthCheckIntervalMs, 30 * 1000);
      defaultPool.drain();
    });

    it('respects LEAN_BROWSER_POOL_SIZE env var', () => {
      process.env.LEAN_BROWSER_POOL_SIZE = '10';
      const envPool = new BrowserPool();
      assert.equal(envPool.maxSize, 10);
      delete process.env.LEAN_BROWSER_POOL_SIZE;
      envPool.drain();
    });

    it('creates pool with custom config', () => {
      assert.equal(pool.maxSize, 3);
      assert.equal(pool.idleTimeoutMs, 2000);
      assert.equal(pool.healthCheckIntervalMs, 500);
    });
  });

  describe('acquire and release', () => {
    it('acquires a browser from empty pool', async () => {
      const instance = await pool.acquire();
      assert.ok(instance);
      assert.ok(instance.browser);
      assert.ok(instance.context);
      assert.ok(instance.page);
      assert.ok(instance.metadata);
      assert.equal(pool.inUse.size, 1);
      assert.equal(pool.available.length, 0);
      await pool.release(instance);
    });

    it('releases browser back to pool', async () => {
      const instance = await pool.acquire();
      await pool.release(instance);
      assert.equal(pool.inUse.size, 0);
      assert.equal(pool.available.length, 1);
    });

    it('reuses released browser', async () => {
      const instance1 = await pool.acquire();
      const id1 = instance1.metadata.id;
      await pool.release(instance1);

      const instance2 = await pool.acquire();
      const id2 = instance2.metadata.id;
      assert.equal(id1, id2);
      await pool.release(instance2);
    });

    it('creates new browsers up to maxSize', async () => {
      const instances = [];
      for (let i = 0; i < pool.maxSize; i++) {
        instances.push(await pool.acquire());
      }

      assert.equal(pool.inUse.size, pool.maxSize);
      assert.equal(pool.available.length, 0);

      for (const instance of instances) {
        await pool.release(instance);
      }
    });

    it('updates metadata on acquire', async () => {
      const instance = await pool.acquire();
      const firstUsedAt = instance.metadata.lastUsedAt;
      const firstRequestCount = instance.metadata.requestCount;

      await pool.release(instance);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const instance2 = await pool.acquire();
      assert.ok(instance2.metadata.lastUsedAt >= firstUsedAt);
      assert.equal(instance2.metadata.requestCount, firstRequestCount + 1);

      await pool.release(instance2);
    });

    it('handles null instance gracefully', async () => {
      await pool.release(null);
      assert.equal(pool.available.length, 0);
    });
  });

  describe('statistics', () => {
    it('tracks pool hits and misses', async () => {
      const instance1 = await pool.acquire();
      assert.equal(pool.stats.poolMisses, 1);
      assert.equal(pool.stats.poolHits, 0);

      await pool.release(instance1);

      const instance2 = await pool.acquire();
      assert.equal(pool.stats.poolMisses, 1);
      assert.equal(pool.stats.poolHits, 1);

      await pool.release(instance2);
    });

    it('tracks total requests', async () => {
      const instance1 = await pool.acquire();
      await pool.release(instance1);

      const instance2 = await pool.acquire();
      await pool.release(instance2);

      assert.equal(pool.stats.totalRequests, 2);
    });

    it('tracks browsers created and closed', async () => {
      await pool.acquire();
      assert.equal(pool.stats.browsersCreated, 1);
      assert.equal(pool.stats.browsersClosed, 0);

      await pool.drain();
      assert.equal(pool.stats.browsersClosed, 1);
    });

    it('returns comprehensive stats', async () => {
      const instance = await pool.acquire();
      const stats = pool.getStats();

      assert.ok(stats.totalRequests > 0);
      assert.equal(stats.availableCount, 0);
      assert.equal(stats.inUseCount, 1);
      assert.equal(stats.totalCount, 1);
      assert.equal(stats.maxSize, pool.maxSize);
      assert.ok(Number.isFinite(stats.poolUtilization));
      assert.ok(Number.isFinite(stats.hitRate));

      await pool.release(instance);
    });

    it('calculates hit rate correctly', async () => {
      const instance1 = await pool.acquire();
      await pool.release(instance1);

      const instance2 = await pool.acquire();
      await pool.release(instance2);

      const stats = pool.getStats();
      assert.equal(stats.hitRate, 50);
    });
  });

  describe('health checks', () => {
    it('removes idle browsers after timeout', async () => {
      const instance = await pool.acquire();
      await pool.release(instance);

      assert.equal(pool.available.length, 1);

      // Wait for idle timeout
      await new Promise((resolve) => setTimeout(resolve, 2500));

      assert.equal(pool.available.length, 0);
    });

    it('validates browser health on acquire', async () => {
      const instance = await pool.acquire();
      await pool.release(instance);

      // Manually close the browser to simulate crash
      await instance.browser.close();

      // Next acquire should detect unhealthy browser and create new one
      const instance2 = await pool.acquire();
      assert.ok(instance2);
      assert.notEqual(instance2.metadata.id, instance.metadata.id);

      await pool.release(instance2);
    });

    it('removes unhealthy browsers on release', async () => {
      const instance = await pool.acquire();

      // Close browser to simulate crash
      await instance.browser.close();

      await pool.release(instance);

      // Should not be in available pool
      assert.equal(pool.available.length, 0);
      assert.ok(pool.stats.browsersCrashed > 0);
    });
  });

  describe('drain', () => {
    it('closes all available browsers', async () => {
      const instances = [];
      for (let i = 0; i < 3; i++) {
        const instance = await pool.acquire();
        instances.push(instance);
      }

      for (const instance of instances) {
        await pool.release(instance);
      }

      assert.equal(pool.available.length, 3);

      await pool.drain();

      assert.equal(pool.available.length, 0);
      assert.equal(pool.inUse.size, 0);
    });

    it('closes in-use browsers', async () => {
      await pool.acquire();
      assert.equal(pool.inUse.size, 1);

      await pool.drain();

      assert.equal(pool.inUse.size, 0);
      assert.equal(pool.available.length, 0);
    });

    it('stops health check timer', async () => {
      assert.ok(pool.healthCheckTimer);

      await pool.drain();

      assert.equal(pool.healthCheckTimer, null);
    });

    it('prevents new acquisitions after drain', async () => {
      await pool.drain();

      await assert.rejects(async () => {
        await pool.acquire();
      }, /shutting down/);
    });
  });

  describe('browser cleanup', () => {
    it('closes extra pages on release', async () => {
      const instance = await pool.acquire();

      // Create extra page
      const extraPage = await instance.context.newPage();
      await extraPage.goto('https://example.com');

      assert.equal(instance.context.pages().length, 2);

      await pool.release(instance);

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reacquire and check
      const instance2 = await pool.acquire();
      assert.equal(instance2.context.pages().length, 1);

      await pool.release(instance2);
    });

    it('navigates main page to about:blank on release', async () => {
      const instance = await pool.acquire();

      await instance.page.goto('https://example.com');
      await pool.release(instance);

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      const instance2 = await pool.acquire();
      const url = instance2.page.url();
      assert.equal(url, 'about:blank');

      await pool.release(instance2);
    });
  });

  describe('concurrency', () => {
    it('handles concurrent acquisitions', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(pool.acquire());
      }

      const instances = await Promise.all(promises);
      assert.equal(instances.length, 5);

      for (const instance of instances) {
        await pool.release(instance);
      }
    });

    it('waits when pool is full', async () => {
      const instances = [];

      // Fill the pool
      for (let i = 0; i < pool.maxSize; i++) {
        instances.push(await pool.acquire());
      }

      // Try to acquire one more (should wait)
      const acquirePromise = pool.acquire();

      // Release one
      await pool.release(instances[0]);

      // Now the waiting acquire should complete
      const instance = await acquirePromise;
      assert.ok(instance);

      // Cleanup
      await pool.release(instance);
      for (let i = 1; i < instances.length; i++) {
        await pool.release(instances[i]);
      }
    });
  });
});

describe('Global pool functions', () => {
  after(async () => {
    await resetGlobalPool();
  });

  it('getGlobalPool creates singleton', () => {
    const pool1 = getGlobalPool();
    const pool2 = getGlobalPool();
    assert.equal(pool1, pool2);
  });

  it('setGlobalPool replaces global pool', () => {
    const customPool = new BrowserPool({ maxSize: 10 });
    setGlobalPool(customPool);

    const pool = getGlobalPool();
    assert.equal(pool, customPool);
    assert.equal(pool.maxSize, 10);
  });

  it('resetGlobalPool drains and clears pool', async () => {
    const pool = getGlobalPool();
    const instance = await pool.acquire();
    await pool.release(instance);

    await resetGlobalPool();

    const newPool = getGlobalPool();
    assert.notEqual(pool, newPool);
  });
});
