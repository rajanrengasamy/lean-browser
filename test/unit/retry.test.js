import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry, withAutoRetry, retryable, retryAll } from '../../src/retry.js';
import { TimeoutError, DNSError, ConnectionRefusedError, NetworkError, ServerError } from '../../src/errors.js';

describe('withRetry', () => {
  it('succeeds on first attempt', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      return 'success';
    };

    const result = await withRetry(operation, { maxRetries: 3 });
    assert.equal(result, 'success');
    assert.equal(attempts, 1);
  });

  it('retries on failure and eventually succeeds', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new TimeoutError('https://example.com', 30000);
      }
      return 'success';
    };

    const result = await withRetry(operation, {
      maxRetries: 3,
      baseDelayMs: 10,
    });

    assert.equal(result, 'success');
    assert.equal(attempts, 3);
  });

  it('throws after max retries exceeded', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      throw new TimeoutError('https://example.com', 30000);
    };

    await assert.rejects(
      async () => {
        await withRetry(operation, {
          maxRetries: 2,
          baseDelayMs: 10,
        });
      },
      (error) => {
        assert.ok(error instanceof TimeoutError);
        return true;
      },
    );

    assert.equal(attempts, 3); // Initial + 2 retries
  });

  it('respects shouldRetry predicate', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      throw new Error('Non-retryable error');
    };

    await assert.rejects(
      async () => {
        await withRetry(operation, {
          maxRetries: 3,
          shouldRetry: () => false,
          baseDelayMs: 10,
        });
      },
      (error) => {
        assert.equal(error.message, 'Non-retryable error');
        return true;
      },
    );

    assert.equal(attempts, 1); // Should not retry
  });

  it('calls onRetry callback', async () => {
    let attempts = 0;
    let retryCallbacks = 0;

    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new TimeoutError('https://example.com', 30000);
      }
      return 'success';
    };

    await withRetry(operation, {
      maxRetries: 3,
      baseDelayMs: 10,
      onRetry: (error, attempt) => {
        retryCallbacks++;
        assert.ok(error instanceof TimeoutError);
        assert.ok(attempt >= 1);
      },
    });

    assert.equal(retryCallbacks, 2); // 2 retries
  });

  it('uses exponential backoff', async () => {
    let attempts = 0;
    const delays = [];
    const startTime = Date.now();

    const operation = async () => {
      attempts++;
      if (attempts > 1) {
        delays.push(Date.now() - startTime);
      }
      if (attempts < 4) {
        throw new TimeoutError('https://example.com', 30000);
      }
      return 'success';
    };

    await withRetry(operation, {
      maxRetries: 3,
      baseDelayMs: 50,
      maxDelayMs: 1000,
    });

    // Verify delays are increasing (with jitter tolerance)
    assert.ok(delays.length > 0);
    // First delay should be around 50ms (with jitter)
    assert.ok(delays[0] >= 30 && delays[0] <= 100);
  });
});

describe('withAutoRetry', () => {
  it('retries TimeoutError automatically', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new TimeoutError('https://example.com', 30000);
      }
      return 'success';
    };

    const result = await withAutoRetry(operation);
    assert.equal(result, 'success');
    assert.ok(attempts > 1);
  });

  it('retries DNSError automatically', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 2) {
        throw new DNSError('https://example.com');
      }
      return 'success';
    };

    const result = await withAutoRetry(operation);
    assert.equal(result, 'success');
    assert.ok(attempts > 1);
  });

  it('retries ConnectionRefusedError automatically', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 2) {
        throw new ConnectionRefusedError('http://localhost:9999');
      }
      return 'success';
    };

    const result = await withAutoRetry(operation);
    assert.equal(result, 'success');
    assert.ok(attempts > 1);
  });

  it('retries 5xx ServerError automatically', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 2) {
        throw new ServerError('https://example.com', 503);
      }
      return 'success';
    };

    const result = await withAutoRetry(operation);
    assert.equal(result, 'success');
    assert.ok(attempts > 1);
  });

  it('does not retry non-retryable errors', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      throw new Error('Non-retryable');
    };

    await assert.rejects(
      async () => {
        await withAutoRetry(operation);
      },
      (error) => {
        assert.equal(error.message, 'Non-retryable');
        return true;
      },
    );

    assert.equal(attempts, 1);
  });

  it('calls onRetry callback', async () => {
    let retryCallbacks = 0;
    const operation = async () => {
      throw new TimeoutError('https://example.com', 30000);
    };

    await assert.rejects(async () => {
      await withAutoRetry(operation, {
        onRetry: () => {
          retryCallbacks++;
        },
      });
    }, TimeoutError);

    assert.ok(retryCallbacks > 0);
  });
});

describe('retryable', () => {
  it('creates retryable function', async () => {
    let attempts = 0;
    const fn = retryable(async (value) => {
      attempts++;
      if (attempts < 2) {
        throw new TimeoutError('https://example.com', 30000);
      }
      return value * 2;
    });

    const result = await fn(5);
    assert.equal(result, 10);
    assert.ok(attempts > 1);
  });

  it('preserves function arguments', async () => {
    const fn = retryable(async (a, b, c) => {
      return a + b + c;
    });

    const result = await fn(1, 2, 3);
    assert.equal(result, 6);
  });

  it('respects retry options', async () => {
    let attempts = 0;
    const fn = retryable(
      async () => {
        attempts++;
        throw new TimeoutError('https://example.com', 30000);
      },
      { maxRetries: 2, baseDelayMs: 10 },
    );

    await assert.rejects(async () => await fn(), TimeoutError);
    assert.equal(attempts, 3); // Initial + 2 retries
  });
});

describe('retryAll', () => {
  it('executes all operations in parallel with retries', async () => {
    let attempts = [0, 0, 0];

    const operations = [
      async () => {
        attempts[0]++;
        if (attempts[0] < 2) throw new TimeoutError('https://example.com/1', 30000);
        return 'result1';
      },
      async () => {
        attempts[1]++;
        return 'result2'; // No retry needed
      },
      async () => {
        attempts[2]++;
        if (attempts[2] < 2) throw new NetworkError('https://example.com/3', 'Network error');
        return 'result3';
      },
    ];

    const results = await retryAll(operations, {
      maxRetries: 2,
      baseDelayMs: 10,
    });

    assert.deepEqual(results, ['result1', 'result2', 'result3']);
    assert.ok(attempts[0] > 1);
    assert.equal(attempts[1], 1);
    assert.ok(attempts[2] > 1);
  });

  it('fails if any operation fails after retries', async () => {
    const operations = [
      async () => 'success',
      async () => {
        throw new TimeoutError('https://example.com', 30000);
      },
    ];

    await assert.rejects(async () => {
      await retryAll(operations, {
        maxRetries: 1,
        baseDelayMs: 10,
      });
    }, TimeoutError);
  });
});
