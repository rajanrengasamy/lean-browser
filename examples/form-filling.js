#!/usr/bin/env node
/**
 * Form filling and submission example
 *
 * This example demonstrates:
 * - Detecting different form field types
 * - Filling text inputs, textareas, selects
 * - Handling checkboxes and radio buttons
 * - Form validation
 * - Submitting forms
 */

import { launchBrowser, navigateAndWait, closeBrowser } from '../src/browser.js';
import { extractAllFromHtml, buildElementMap } from '../src/extractor.js';
import { ActionExecutor, parseActionSpec } from '../src/actions.js';

// Example: Fill a contact form
async function fillContactForm() {
  console.log('📝 Filling contact form example\n');

  const { browser, context, page } = await launchBrowser({ headless: false });

  try {
    // Navigate to a page with a form (using httpbin.org for demo)
    const url = 'https://httpbin.org/forms/post';
    console.log(`🌐 Navigating to ${url}...`);
    await navigateAndWait(page, url);

    // Extract interactive elements
    const html = await page.content();
    const { elements } = extractAllFromHtml(html, page.url());
    const elementMap = buildElementMap(elements);

    console.log(`✅ Found ${elements.length} interactive elements\n`);

    // Display all form elements
    console.log('📋 Form fields:');
    elements.forEach((el) => {
      if (el.tag === 'input' || el.tag === 'textarea' || el.tag === 'select') {
        console.log(`   ${el.id}: [${el.tag}:${el.type || 'text'}] ${el.label || el.name}`);
      }
    });
    console.log('');

    // Prepare form data
    const formData = {
      custname: 'John Doe',
      custtel: '555-1234',
      custemail: 'john.doe@example.com',
      size: 'large',
      topping: 'cheese',
      delivery: '11:00',
      comments: 'Please ring the doorbell twice. Thank you!',
    };

    console.log('⚡ Filling form fields...');

    // Build actions for each field
    const actions = [];

    // Find and fill each field
    for (const [fieldName, value] of Object.entries(formData)) {
      const element = elements.find((el) => el.name === fieldName);

      if (element) {
        if (element.tag === 'select') {
          actions.push(`select:${element.id}:${value}`);
        } else if (element.type === 'radio') {
          // For radio buttons, find the one with matching value
          const radioOption = elements.find(
            (el) => el.name === fieldName && (el.selector || '').includes(`value="${value}"`),
          );
          if (radioOption) {
            actions.push(`click:${radioOption.id}`);
          }
        } else {
          // Default: type into field
          actions.push(`type:${element.id}:${value}`);
        }

        console.log(`   ✅ ${fieldName}: ${value}`);
      } else {
        console.log(`   ⚠️  ${fieldName}: field not found`);
      }
    }

    // Execute all actions
    const executor = new ActionExecutor(page, elementMap);
    await executor.executeAll(parseActionSpec(actions.join(',')));

    console.log('\n✅ Form filled successfully!');

    // Take screenshot
    await page.screenshot({ path: 'form-filled.png', fullPage: true });
    console.log('📸 Screenshot saved: form-filled.png');

    // Wait to see the result
    console.log('\n⏳ Waiting 5 seconds...');
    await page.waitForTimeout(5000);

    // Submit form (commented out for safety)
    console.log('\n⚠️  Form is filled but NOT submitted');
    console.log('   To submit, uncomment the submit action');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Fill a multi-step form
async function fillMultiStepForm() {
  console.log('📝 Multi-step form example\n');

  const { browser, context, page } = await launchBrowser({ headless: false });

  try {
    // Example URL (replace with actual multi-step form)
    const url = 'https://example.com/signup';

    await navigateAndWait(page, url);

    // Step 1: Personal information
    console.log('📋 Step 1: Personal information');
    let html = await page.content();
    let { elements } = extractAllFromHtml(html, page.url());
    let elementMap = buildElementMap(elements);
    let executor = new ActionExecutor(page, elementMap);

    await executor.executeAll(parseActionSpec('type:e1:John,type:e2:Doe,type:e3:john@example.com,click:e4'));

    // Wait for next step
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Step 2: Address information
    console.log('📋 Step 2: Address');
    html = await page.content();
    ({ elements } = extractAllFromHtml(html, page.url()));
    elementMap = buildElementMap(elements);
    executor = new ActionExecutor(page, elementMap);

    await executor.executeAll(parseActionSpec('type:e1:123 Main St,type:e2:San Francisco,select:e3:CA,click:e4'));

    // Wait for next step
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Step 3: Review and submit
    console.log('📋 Step 3: Review');
    console.log('✅ Multi-step form completed!');

    await page.waitForTimeout(3000);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Form with validation
async function fillFormWithValidation() {
  console.log('📝 Form validation example\n');

  const { browser, context, page } = await launchBrowser({ headless: false });

  try {
    const url = 'https://httpbin.org/forms/post';
    await navigateAndWait(page, url);

    const html = await page.content();
    const { elements } = extractAllFromHtml(html, page.url());
    const elementMap = buildElementMap(elements);
    const executor = new ActionExecutor(page, elementMap);

    // Try to submit with invalid data first
    console.log('⚠️  Attempting to submit with invalid email...');

    const invalidActions = parseActionSpec('type:e1:John Doe,type:e2:invalid-email');
    await executor.executeAll(invalidActions);

    // Try to submit
    const submitButton = elements.find((el) => el.tag === 'button' && el.type === 'submit');
    if (submitButton) {
      await executor.execute(parseActionSpec(`click:${submitButton.id}`)[0]);
    }

    // Check for validation errors
    await page.waitForTimeout(1000);

    const hasValidationError = await page.evaluate(() => {
      const emailInput = document.querySelector('input[name="custemail"]');
      return emailInput && !emailInput.checkValidity();
    });

    if (hasValidationError) {
      console.log('❌ Validation failed (expected)');

      // Now fix the email
      console.log('✅ Fixing email...');
      const emailElement = elements.find((el) => el.name === 'custemail');
      if (emailElement) {
        await executor.executeAll(parseActionSpec(`type:${emailElement.id}:john@example.com`));
        console.log('✅ Valid email entered');
      }
    }

    await page.waitForTimeout(3000);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Dynamic form (fields appear based on selections)
async function fillDynamicForm() {
  console.log('📝 Dynamic form example\n');

  const { browser, context, page } = await launchBrowser({ headless: false });

  try {
    // Example: Form where selecting one option reveals more fields
    const url = 'https://example.com/dynamic-form';
    await navigateAndWait(page, url);

    console.log('📋 Initial form state');
    let html = await page.content();
    let { elements } = extractAllFromHtml(html, page.url());
    console.log(`   Found ${elements.length} elements`);

    // Fill initial field that triggers more fields
    const elementMap = buildElementMap(elements);
    const executor = new ActionExecutor(page, elementMap);

    // Select option that reveals more fields
    const selectElement = elements.find((el) => el.tag === 'select');
    if (selectElement) {
      await executor.execute(parseActionSpec(`select:${selectElement.id}:option2`)[0]);

      // Wait for new fields to appear
      await page.waitForTimeout(1000);

      // Re-extract elements
      html = await page.content();
      ({ elements } = extractAllFromHtml(html, page.url()));
      console.log(`📋 After selection: ${elements.length} elements`);

      // Fill newly revealed fields
      const newElementMap = buildElementMap(elements);
      const newExecutor = new ActionExecutor(page, newElementMap);

      await newExecutor.executeAll(parseActionSpec('type:e5:Additional Info,click:e6'));
      console.log('✅ Dynamic form completed');
    }

    await page.waitForTimeout(3000);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Helper: Auto-detect and fill form intelligently
async function autoFillForm(page, formData) {
  const html = await page.content();
  const { elements } = extractAllFromHtml(html, page.url());
  const elementMap = buildElementMap(elements);
  const executor = new ActionExecutor(page, elementMap);

  const actions = [];

  // Smart field detection based on common patterns
  for (const element of elements) {
    if (!element.name && !element.label) continue;

    const fieldKey = (element.name || element.label || '').toLowerCase();
    let value = null;

    // Match field to data
    if (fieldKey.includes('name') && !fieldKey.includes('user')) {
      value = formData.name || formData.fullName;
    } else if (fieldKey.includes('email') || fieldKey.includes('e-mail')) {
      value = formData.email;
    } else if (fieldKey.includes('phone') || fieldKey.includes('tel')) {
      value = formData.phone;
    } else if (fieldKey.includes('address')) {
      value = formData.address;
    } else if (fieldKey.includes('city')) {
      value = formData.city;
    } else if (fieldKey.includes('zip') || fieldKey.includes('postal')) {
      value = formData.zipCode;
    } else if (fieldKey.includes('message') || fieldKey.includes('comment')) {
      value = formData.message;
    }

    if (value) {
      if (element.tag === 'select') {
        actions.push(`select:${element.id}:${value}`);
      } else {
        actions.push(`type:${element.id}:${value}`);
      }

      console.log(`   Auto-filled ${element.name || element.label}: ${value}`);
    }
  }

  if (actions.length > 0) {
    await executor.executeAll(parseActionSpec(actions.join(',')));
    console.log(`\n✅ Auto-filled ${actions.length} fields`);
  }
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  const example = process.argv[2] || 'contact';

  switch (example) {
    case 'contact':
      fillContactForm().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'multistep':
      fillMultiStepForm().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'validation':
      fillFormWithValidation().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'dynamic':
      fillDynamicForm().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    default:
      console.log('Usage: node form-filling.js [contact|multistep|validation|dynamic]');
      process.exit(1);
  }
}

export { fillContactForm, fillMultiStepForm, fillFormWithValidation, fillDynamicForm, autoFillForm };
