#!/usr/bin/env node
/* eslint-disable */
/**
 * Complete login automation workflow example
 *
 * This example demonstrates:
 * - Navigating to a login page
 * - Extracting interactive elements
 * - Filling login credentials
 * - Handling multi-step authentication
 * - Taking screenshots for verification
 */

import { launchBrowser, navigateAndWait, closeBrowser } from '../src/browser.js';
import { extractAllFromHtml, buildElementMap } from '../src/extractor.js';
import { ActionExecutor, parseActionSpec } from '../src/actions.js';
import fs from 'node:fs';

// Configuration
const LOGIN_URL = 'https://github.com/login'; // Example login page
const HEADLESS = false; // Set to true for production
const SCREENSHOTS = true;

async function loginWorkflow() {
  console.log('🚀 Starting login workflow...\n');

  // Step 1: Launch browser
  console.log('📱 Launching browser...');
  const { browser, context, page } = await launchBrowser({ headless: HEADLESS });

  try {
    // Step 2: Navigate to login page
    console.log(`🌐 Navigating to ${LOGIN_URL}...`);
    const { finalUrl, title, status } = await navigateAndWait(page, LOGIN_URL);

    console.log(`✅ Loaded: ${title}`);
    console.log(`   URL: ${finalUrl}`);
    console.log(`   Status: ${status}\n`);

    // Step 3: Extract interactive elements
    console.log('🔍 Extracting interactive elements...');
    const html = await page.content();
    const { article, elements } = extractAllFromHtml(html, finalUrl);

    console.log(`   Found ${elements.length} interactive elements:\n`);

    // Display first 10 elements
    elements.slice(0, 10).forEach((el) => {
      const label = el.label || el.name || el.href || '(no label)';
      console.log(`   ${el.id}: [${el.tag}${el.type ? ':' + el.type : ''}] ${label}`);
    });
    console.log('');

    // Step 4: Build element map for actions
    const elementMap = buildElementMap(elements);

    // Step 5: Identify login elements (simplified - in real app, use smarter detection)
    const usernameElement = elements.find((el) => el.type === 'text' || el.name === 'login');
    const passwordElement = elements.find((el) => el.type === 'password');
    const submitElement = elements.find((el) => (el.tag === 'input' && el.type === 'submit') || el.tag === 'button');

    if (!usernameElement || !passwordElement || !submitElement) {
      console.error('❌ Could not find login form elements');
      console.log('   Please inspect the page and update element detection logic');
      return;
    }

    console.log('🎯 Identified login elements:');
    console.log(`   Username: ${usernameElement.id} (${usernameElement.label})`);
    console.log(`   Password: ${passwordElement.id} (${passwordElement.label})`);
    console.log(`   Submit: ${submitElement.id} (${submitElement.label})\n`);

    // Step 6: Prepare actions
    // NOTE: Replace with actual credentials or use environment variables
    const username = process.env.TEST_USERNAME || 'demo-user';
    const password = process.env.TEST_PASSWORD || 'demo-pass';

    const actionSpec = [
      `type:${usernameElement.id}:${username}`,
      'wait:500',
      `type:${passwordElement.id}:${password}:slow`, // Use slow typing for password
      'wait:500',
    ].join(',');

    console.log('⚡ Executing login actions...');
    const executor = new ActionExecutor(page, elementMap, {
      defaultTimeoutMs: 15000,
    });

    const actions = parseActionSpec(actionSpec);
    const results = await executor.executeAll(actions);

    results.forEach((result, i) => {
      const status = result.ok ? '✅' : '❌';
      console.log(`   ${status} Action ${i + 1}: ${result.type}`);
    });
    console.log('');

    // Step 7: Take screenshot before submitting
    if (SCREENSHOTS) {
      const screenshotPath = 'login-filled.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }

    // Step 8: Optional - Submit the form (commented out for safety)
    console.log('\n⚠️  Login form is filled but NOT submitted (for safety)');
    console.log('   To submit, uncomment the following code:\n');
    console.log(`   // await executor.execute(parseActionSpec('click:${submitElement.id}')[0]);`);
    console.log(`   // await page.waitForLoadState('networkidle', { timeout: 10000 });`);
    console.log(`   // console.log('Final URL:', page.url());`);

    // Uncomment to actually submit:
    // await executor.execute(parseActionSpec(`click:${submitElement.id}`)[0]);
    // await page.waitForLoadState('networkidle', { timeout: 10000 });
    // const postLoginUrl = page.url();
    // console.log(`✅ Login submitted. Redirected to: ${postLoginUrl}`);

    // Wait a bit to see the result
    console.log('\n⏳ Waiting 5 seconds before closing...');
    await page.waitForTimeout(5000);
  } catch (err) {
    console.error('\n❌ Error during login workflow:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  } finally {
    // Step 9: Cleanup
    console.log('\n🧹 Cleaning up...');
    await closeBrowser({ browser, context, page });
    console.log('✅ Done!\n');
  }
}

// Advanced: Multi-step authentication (2FA example)
async function loginWith2FA() {
  console.log('🔐 Starting 2FA login workflow...\n');

  const { browser, context, page } = await launchBrowser({ headless: HEADLESS });

  try {
    // Step 1: Regular login
    await navigateAndWait(page, LOGIN_URL);
    let html = await page.content();
    let { elements } = extractAllFromHtml(html, page.url());
    let elementMap = buildElementMap(elements);

    const executor = new ActionExecutor(page, elementMap);

    // Fill credentials (simplified)
    await executor.executeAll(parseActionSpec('type:e1:username,type:e2:password,click:e3'));

    // Wait for 2FA page
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Step 2: Check if 2FA is required
    html = await page.content();
    ({ elements } = extractAllFromHtml(html, page.url()));

    const has2FA = elements.some((el) => {
      const label = (el.label || '').toLowerCase();
      return label.includes('code') || label.includes('authentication') || label.includes('verification');
    });

    if (has2FA) {
      console.log('🔑 2FA detected. Waiting for code input...');
      elementMap = buildElementMap(elements);

      // Find 2FA code input
      const codeElement = elements.find((el) => {
        const label = (el.label || '').toLowerCase();
        return label.includes('code') || label.includes('token');
      });

      if (codeElement) {
        console.log(`   Found 2FA input: ${codeElement.id} (${codeElement.label})`);

        // In real app, get code from authenticator app or SMS
        const twoFactorCode = '123456'; // Placeholder

        await executor.execute(parseActionSpec(`type:${codeElement.id}:${twoFactorCode}`)[0]);
        console.log('✅ 2FA code entered');
      }
    }

    console.log('✅ Login workflow completed (2FA)');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Run the workflow
if (import.meta.url === `file://${process.argv[1]}`) {
  loginWorkflow().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

  // Uncomment to test 2FA flow:
  // loginWith2FA().catch(err => {
  //   console.error('Fatal error:', err);
  //   process.exit(1);
  // });
}

export { loginWorkflow, loginWith2FA };
