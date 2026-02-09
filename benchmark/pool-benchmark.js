import { fetchRenderedHtml } from '../src/browser.js';
import { resetGlobalPool } from '../src/browser-pool.js';

async function benchmark(name, fn, iterations = 10) {
  console.log(`\nRunning benchmark: ${name}`);
  console.log(`Iterations: ${iterations}`);

  const times = [];
  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = Date.now();
    await fn();
    const iterEnd = Date.now();
    times.push(iterEnd - iterStart);
    process.stdout.write('.');
  }

  const end = Date.now();
  const total = end - start;
  const avg = total / iterations;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

  console.log('\n');
  console.log(`Total time: ${total}ms`);
  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`Median: ${median}ms`);
  console.log(`Min: ${min}ms`);
  console.log(`Max: ${max}ms`);
  console.log(`Requests/sec: ${(1000 / avg).toFixed(2)}`);

  return { total, avg, min, max, median, times };
}

async function main() {
  const testUrl = 'https://example.com';
  const iterations = 10;

  console.log('='.repeat(60));
  console.log('Browser Pool Performance Benchmark');
  console.log('='.repeat(60));

  // Benchmark without pool
  await resetGlobalPool();
  const withoutPool = await benchmark(
    'WITHOUT Pool (each request launches new browser)',
    async () => {
      await fetchRenderedHtml(testUrl, { usePool: false });
    },
    iterations,
  );

  // Benchmark with pool
  await resetGlobalPool();
  const withPool = await benchmark(
    'WITH Pool (browsers are reused)',
    async () => {
      await fetchRenderedHtml(testUrl, { usePool: true });
    },
    iterations,
  );

  // Calculate improvement
  console.log('\n' + '='.repeat(60));
  console.log('Performance Comparison');
  console.log('='.repeat(60));

  const avgImprovement = ((withoutPool.avg - withPool.avg) / withoutPool.avg) * 100;
  const totalImprovement = ((withoutPool.total - withPool.total) / withoutPool.total) * 100;
  const speedup = withoutPool.avg / withPool.avg;

  console.log(`\nAverage time without pool: ${withoutPool.avg.toFixed(2)}ms`);
  console.log(`Average time with pool: ${withPool.avg.toFixed(2)}ms`);
  console.log(`\nImprovement: ${avgImprovement.toFixed(2)}%`);
  console.log(`Speedup: ${speedup.toFixed(2)}x faster`);
  console.log(`\nTotal time without pool: ${withoutPool.total}ms`);
  console.log(`Total time with pool: ${withPool.total}ms`);
  console.log(`Total improvement: ${totalImprovement.toFixed(2)}%`);

  console.log(`\nRequests/sec without pool: ${(1000 / withoutPool.avg).toFixed(2)}`);
  console.log(`Requests/sec with pool: ${(1000 / withPool.avg).toFixed(2)}`);

  // Cleanup
  await resetGlobalPool();

  console.log('\n' + '='.repeat(60));
}

main()
  .then(() => {
    console.log('\nBenchmark complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
