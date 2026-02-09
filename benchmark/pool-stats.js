import { fetchRenderedHtml } from '../src/browser.js';
import { getGlobalPool, resetGlobalPool } from '../src/browser-pool.js';

async function main() {
  const testUrl = 'https://example.com';
  const iterations = 20;

  console.log('='.repeat(60));
  console.log('Browser Pool Statistics Demo');
  console.log('='.repeat(60));

  await resetGlobalPool();
  const pool = getGlobalPool();

  console.log('\nInitial pool stats:');
  console.log(pool.getStats());

  console.log(`\nFetching ${testUrl} ${iterations} times with pool...\n`);

  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    await fetchRenderedHtml(testUrl, { usePool: true });
    process.stdout.write('.');
  }

  const end = Date.now();
  const total = end - start;
  const avg = total / iterations;

  console.log('\n\nFinal pool stats:');
  const stats = pool.getStats();
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Performance Summary');
  console.log('='.repeat(60));
  console.log(`Total time: ${total}ms`);
  console.log(`Average time per request: ${avg.toFixed(2)}ms`);
  console.log(`Requests/sec: ${(1000 / avg).toFixed(2)}`);
  console.log(`\nPool efficiency:`);
  console.log(`  Hit rate: ${stats.hitRate.toFixed(2)}%`);
  console.log(`  Pool utilization: ${stats.poolUtilization.toFixed(2)}%`);
  console.log(`  Browsers created: ${stats.browsersCreated}`);
  console.log(`  Browsers closed: ${stats.browsersClosed}`);
  console.log(`  Pool hits: ${stats.poolHits}`);
  console.log(`  Pool misses: ${stats.poolMisses}`);

  // Cleanup
  await resetGlobalPool();

  console.log('\n' + '='.repeat(60));
}

main()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
