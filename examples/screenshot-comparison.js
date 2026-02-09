#!/usr/bin/env node
/* eslint-disable */
/**
 * Screenshot comparison and visual testing example
 *
 * This example demonstrates:
 * - Taking screenshots of pages
 * - Capturing specific elements
 * - Before/after comparisons
 * - Visual regression testing
 * - Responsive design testing
 */

import { launchBrowser, navigateAndWait, closeBrowser } from '../src/browser.js';
import { ActionExecutor, parseActionSpec } from '../src/actions.js';
import { extractAllFromHtml, buildElementMap } from '../src/extractor.js';
import fs from 'node:fs';
import path from 'node:path';

// Example: Basic screenshot capture
async function capturePageScreenshot(url, outputPath = 'screenshot.png') {
  console.log(`📸 Capturing screenshot of ${url}\n`);

  const { browser, context, page } = await launchBrowser({ headless: true });

  try {
    await navigateAndWait(page, url);

    // Full page screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: true,
    });

    console.log(`✅ Screenshot saved: ${outputPath}`);

    // Get screenshot info
    const stats = fs.statSync(outputPath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);

    return outputPath;
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Before/after screenshot comparison
async function captureBeforeAfter(url, actions, outputDir = './screenshots') {
  console.log(`📸 Before/After screenshot comparison\n`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const { browser, context, page } = await launchBrowser({ headless: false });

  try {
    await navigateAndWait(page, url);

    // Capture BEFORE screenshot
    const beforePath = path.join(outputDir, 'before.png');
    await page.screenshot({ path: beforePath, fullPage: true });
    console.log(`✅ Before screenshot: ${beforePath}`);

    // Execute actions
    if (actions) {
      console.log('\n⚡ Executing actions...');
      const html = await page.content();
      const { elements } = extractAllFromHtml(html, page.url());
      const elementMap = buildElementMap(elements);
      const executor = new ActionExecutor(page, elementMap);

      const parsedActions = parseActionSpec(actions);
      await executor.executeAll(parsedActions);

      console.log(`   ✅ Executed ${parsedActions.length} actions`);
    }

    // Wait a bit for changes to take effect
    await page.waitForTimeout(1000);

    // Capture AFTER screenshot
    const afterPath = path.join(outputDir, 'after.png');
    await page.screenshot({ path: afterPath, fullPage: true });
    console.log(`✅ After screenshot: ${afterPath}`);

    // Calculate sizes
    const beforeSize = fs.statSync(beforePath).size;
    const afterSize = fs.statSync(afterPath).size;

    console.log('\n📊 Comparison:');
    console.log(`   Before: ${(beforeSize / 1024).toFixed(2)} KB`);
    console.log(`   After:  ${(afterSize / 1024).toFixed(2)} KB`);
    console.log(`   Diff:   ${((afterSize - beforeSize) / 1024).toFixed(2)} KB`);

    return { beforePath, afterPath };
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Capture element screenshot
async function captureElement(url, selector, outputPath = 'element.png') {
  console.log(`📸 Capturing element screenshot\n`);

  const { browser, context, page } = await launchBrowser({ headless: true });

  try {
    await navigateAndWait(page, url);

    // Find element
    const element = await page.$(selector);

    if (!element) {
      console.error(`❌ Element not found: ${selector}`);
      return;
    }

    // Capture element screenshot
    await element.screenshot({ path: outputPath });

    console.log(`✅ Element screenshot saved: ${outputPath}`);
    console.log(`   Selector: ${selector}`);

    // Get element info
    const box = await element.boundingBox();
    console.log(`   Size: ${box.width}x${box.height}px`);

    return outputPath;
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Responsive design testing (multiple viewports)
async function captureResponsive(url, outputDir = './screenshots/responsive') {
  console.log(`📱 Responsive design testing\n`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const viewports = [
    { name: 'mobile', width: 375, height: 667 }, // iPhone SE
    { name: 'tablet', width: 768, height: 1024 }, // iPad
    { name: 'desktop', width: 1920, height: 1080 }, // Full HD
    { name: 'desktop-4k', width: 3840, height: 2160 }, // 4K
  ];

  const { browser } = await launchBrowser({ headless: true });

  try {
    for (const viewport of viewports) {
      console.log(`📐 Capturing ${viewport.name} (${viewport.width}x${viewport.height})...`);

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      await navigateAndWait(page, url);

      const outputPath = path.join(outputDir, `${viewport.name}.png`);
      await page.screenshot({ path: outputPath, fullPage: true });

      console.log(`   ✅ ${outputPath}`);

      await context.close();
    }

    console.log(`\n✅ Captured ${viewports.length} viewport variations`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}

// Example: Capture screenshots at different scroll positions
async function captureScrollPositions(url, positions = [0, 0.25, 0.5, 0.75, 1.0], outputDir = './screenshots/scroll') {
  console.log(`📜 Capturing scroll position screenshots\n`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const { browser, context, page } = await launchBrowser({ headless: true });

  try {
    await navigateAndWait(page, url);

    // Get page height
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    console.log(`   Page height: ${pageHeight}px`);
    console.log(`   Viewport: ${viewportHeight}px\n`);

    for (const position of positions) {
      const scrollY = Math.floor((pageHeight - viewportHeight) * position);

      console.log(`📍 Position ${(position * 100).toFixed(0)}% (${scrollY}px)...`);

      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(500); // Let images load

      const outputPath = path.join(outputDir, `scroll-${(position * 100).toFixed(0)}.png`);
      await page.screenshot({ path: outputPath });

      console.log(`   ✅ ${outputPath}`);
    }

    console.log(`\n✅ Captured ${positions.length} scroll positions`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Visual regression testing
async function visualRegressionTest(url, baselineDir = './screenshots/baseline', testDir = './screenshots/test') {
  console.log(`🧪 Visual regression testing\n`);

  // Create directories
  [baselineDir, testDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const { browser, context, page } = await launchBrowser({ headless: true });

  try {
    await navigateAndWait(page, url);

    const testName = new URL(url).hostname.replace(/\./g, '-');
    const baselinePath = path.join(baselineDir, `${testName}.png`);
    const testPath = path.join(testDir, `${testName}.png`);

    // Capture test screenshot
    await page.screenshot({ path: testPath, fullPage: true });
    console.log(`✅ Test screenshot: ${testPath}`);

    // Check if baseline exists
    if (fs.existsSync(baselinePath)) {
      console.log(`✅ Baseline found: ${baselinePath}`);

      const baselineSize = fs.statSync(baselinePath).size;
      const testSize = fs.statSync(testPath).size;
      const sizeDiff = Math.abs(testSize - baselineSize);
      const diffPercent = ((sizeDiff / baselineSize) * 100).toFixed(2);

      console.log('\n📊 Comparison:');
      console.log(`   Baseline: ${(baselineSize / 1024).toFixed(2)} KB`);
      console.log(`   Test:     ${(testSize / 1024).toFixed(2)} KB`);
      console.log(`   Diff:     ${diffPercent}%`);

      if (diffPercent > 5) {
        console.log('\n⚠️  WARNING: Significant visual change detected!');
        console.log('   Review screenshots manually or use visual diff tool');
      } else {
        console.log('\n✅ Visual regression test passed');
      }
    } else {
      // No baseline, create it
      fs.copyFileSync(testPath, baselinePath);
      console.log(`\n📋 Created baseline: ${baselinePath}`);
      console.log('   Run this test again to compare against baseline');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Capture with different themes (dark/light mode)
async function captureThemes(url, outputDir = './screenshots/themes') {
  console.log(`🎨 Capturing theme variations\n`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const { browser } = await launchBrowser({ headless: true });

  try {
    // Light theme
    console.log('☀️  Capturing light theme...');
    const lightContext = await browser.newContext({
      colorScheme: 'light',
    });
    const lightPage = await lightContext.newPage();
    await navigateAndWait(lightPage, url);
    await lightPage.screenshot({
      path: path.join(outputDir, 'light.png'),
      fullPage: true,
    });
    await lightContext.close();
    console.log('   ✅ Light theme captured');

    // Dark theme
    console.log('🌙 Capturing dark theme...');
    const darkContext = await browser.newContext({
      colorScheme: 'dark',
    });
    const darkPage = await darkContext.newPage();
    await navigateAndWait(darkPage, url);
    await darkPage.screenshot({
      path: path.join(outputDir, 'dark.png'),
      fullPage: true,
    });
    await darkContext.close();
    console.log('   ✅ Dark theme captured');

    console.log('\n✅ Theme variations captured');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  const example = process.argv[2] || 'basic';
  const url = process.argv[3] || 'https://example.com';

  switch (example) {
    case 'basic':
      capturePageScreenshot(url).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'beforeafter':
      const actions = process.argv[4] || 'scroll:500';
      captureBeforeAfter(url, actions).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'element':
      const selector = process.argv[4] || 'h1';
      captureElement(url, selector).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'responsive':
      captureResponsive(url).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'scroll':
      captureScrollPositions(url).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'regression':
      visualRegressionTest(url).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'themes':
      captureThemes(url).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    default:
      console.log('Usage: node screenshot-comparison.js [example] [url] [options]');
      console.log('\nExamples:');
      console.log('  node screenshot-comparison.js basic https://example.com');
      console.log('  node screenshot-comparison.js beforeafter https://example.com "click:e1"');
      console.log('  node screenshot-comparison.js element https://example.com "h1"');
      console.log('  node screenshot-comparison.js responsive https://example.com');
      console.log('  node screenshot-comparison.js scroll https://example.com');
      console.log('  node screenshot-comparison.js regression https://example.com');
      console.log('  node screenshot-comparison.js themes https://example.com');
      process.exit(1);
  }
}

export {
  capturePageScreenshot,
  captureBeforeAfter,
  captureElement,
  captureResponsive,
  captureScrollPositions,
  visualRegressionTest,
  captureThemes,
};
