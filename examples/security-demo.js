#!/usr/bin/env node
/* eslint-disable */

/**
 * Security Demo - Demonstrates SSRF protection in lean-browser
 */

import { validateURL, SSRFError } from '../src/security.js';

console.log('=== lean-browser Security Demo ===\n');

// Test 1: Valid public URLs
console.log('1. Testing valid public URLs:');
const publicUrls = ['https://example.com', 'https://github.com', 'http://8.8.8.8'];

for (const url of publicUrls) {
  try {
    validateURL(url);
    console.log(`   ✓ ${url} - ALLOWED`);
  } catch (err) {
    console.log(`   ✗ ${url} - BLOCKED: ${err.message}`);
  }
}

// Test 2: Private IPs (should be blocked)
console.log('\n2. Testing private IPs (should be blocked):');
const privateIPs = ['http://127.0.0.1', 'http://localhost', 'http://10.0.0.1', 'http://192.168.1.1'];

for (const url of privateIPs) {
  try {
    validateURL(url);
    console.log(`   ✗ ${url} - ALLOWED (unexpected!)`);
  } catch (err) {
    console.log(`   ✓ ${url} - BLOCKED: ${err.message}`);
  }
}

// Test 3: Metadata endpoints (should be blocked)
console.log('\n3. Testing cloud metadata endpoints (should be blocked):');
const metadataUrls = ['http://169.254.169.254/latest/meta-data', 'http://metadata.google.internal'];

for (const url of metadataUrls) {
  try {
    validateURL(url);
    console.log(`   ✗ ${url} - ALLOWED (unexpected!)`);
  } catch (err) {
    console.log(`   ✓ ${url} - BLOCKED: ${err.message}`);
  }
}

// Test 4: Invalid protocols (should be blocked)
console.log('\n4. Testing invalid protocols (should be blocked):');
const invalidProtocols = ['file:///etc/passwd', 'ftp://example.com'];

for (const url of invalidProtocols) {
  try {
    validateURL(url);
    console.log(`   ✗ ${url} - ALLOWED (unexpected!)`);
  } catch (err) {
    console.log(`   ✓ ${url} - BLOCKED: ${err.message}`);
  }
}

// Test 5: Whitelist functionality
console.log('\n5. Testing whitelist functionality:');
const whitelistTest = [
  { url: 'https://example.com', whitelist: ['example.com'], shouldPass: true },
  { url: 'https://github.com', whitelist: ['example.com'], shouldPass: false },
  { url: 'https://sub.example.com', whitelist: ['*.example.com'], shouldPass: true },
];

for (const test of whitelistTest) {
  try {
    validateURL(test.url, { whitelist: test.whitelist });
    console.log(`   ${test.shouldPass ? '✓' : '✗'} ${test.url} with whitelist [${test.whitelist}] - ALLOWED`);
  } catch (err) {
    console.log(`   ${test.shouldPass ? '✗' : '✓'} ${test.url} with whitelist [${test.whitelist}] - BLOCKED`);
  }
}

// Test 6: Blacklist functionality
console.log('\n6. Testing blacklist functionality:');
const blacklistTest = [
  { url: 'https://evil.com', blacklist: ['evil.com'], shouldPass: false },
  { url: 'https://example.com', blacklist: ['evil.com'], shouldPass: true },
  { url: 'https://sub.evil.com', blacklist: ['*.evil.com'], shouldPass: false },
];

for (const test of blacklistTest) {
  try {
    validateURL(test.url, { blacklist: test.blacklist });
    console.log(`   ${test.shouldPass ? '✓' : '✗'} ${test.url} with blacklist [${test.blacklist}] - ALLOWED`);
  } catch (err) {
    console.log(`   ${test.shouldPass ? '✗' : '✓'} ${test.url} with blacklist [${test.blacklist}] - BLOCKED`);
  }
}

console.log('\n=== Demo Complete ===');
console.log('\nEnvironment Variables:');
console.log(`  LEAN_BROWSER_URL_WHITELIST: ${process.env.LEAN_BROWSER_URL_WHITELIST || '(not set)'}`);
console.log(`  LEAN_BROWSER_URL_BLACKLIST: ${process.env.LEAN_BROWSER_URL_BLACKLIST || '(not set)'}`);
console.log(`  LEAN_BROWSER_SESSION_DIR: ${process.env.LEAN_BROWSER_SESSION_DIR || '/tmp/lean-browser-sessions'}`);
console.log(`  LEAN_BROWSER_MAX_SESSIONS: ${process.env.LEAN_BROWSER_MAX_SESSIONS || '10'}`);
