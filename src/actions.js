import { validateURL } from './security.js';

export class ActionError extends Error {
  constructor(message, { action, cause } = {}) {
    super(message);
    this.name = 'ActionError';
    this.action = action;
    if (cause) this.cause = cause;
  }
}

export class ElementNotFoundError extends ActionError {
  constructor(elementId, detail) {
    super(`Element "${elementId}" not found${detail ? ` (${detail})` : ''}`);
    this.name = 'ElementNotFoundError';
    this.elementId = elementId;
  }
}

export class ActionTimeoutError extends ActionError {
  constructor(action, timeoutMs) {
    super(`Action timed out after ${timeoutMs}ms: ${action?.type ?? 'unknown'}`);
    this.name = 'ActionTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class ValidationError extends ActionError {
  constructor(message, action) {
    super(message);
    this.name = 'ValidationError';
    if (action) this.action = action;
  }
}

function parseOneAction(spec) {
  const colonIdx = spec.indexOf(':');
  if (colonIdx === -1) {
    throw new ValidationError(`Invalid action spec (missing ":"): "${spec}"`);
  }

  const type = spec.slice(0, colonIdx).toLowerCase();
  const rest = spec.slice(colonIdx + 1);

  switch (type) {
    case 'click':
    case 'submit':
      if (!rest.trim()) throw new ValidationError(`${type} requires an element ID: "${spec}"`);
      return { type, elementId: rest.trim() };

    case 'type': {
      const firstColon = rest.indexOf(':');
      if (firstColon === -1) {
        throw new ValidationError(`type action requires element and value: "${spec}"`);
      }
      const elementId = rest.slice(0, firstColon).trim();
      let value = rest.slice(firstColon + 1);
      let slow = false;

      if (value.endsWith(':slow')) {
        slow = true;
        value = value.slice(0, -5);
      }

      return { type: 'type', elementId, value, slow };
    }

    case 'select': {
      const firstColon = rest.indexOf(':');
      if (firstColon === -1) {
        throw new ValidationError(`select action requires element and value: "${spec}"`);
      }
      const elementId = rest.slice(0, firstColon).trim();
      const value = rest.slice(firstColon + 1);
      return { type: 'select', elementId, value };
    }

    case 'wait': {
      const ms = parseInt(rest, 10);
      if (!Number.isFinite(ms) || ms < 0) {
        throw new ValidationError(`wait requires valid milliseconds: "${spec}"`);
      }
      return { type: 'wait', ms: Math.min(ms, 30000) };
    }

    case 'navigate':
      if (!rest.trim()) throw new ValidationError(`navigate requires a URL: "${spec}"`);
      // Validate URL for SSRF protection
      try {
        validateURL(rest.trim());
      } catch (err) {
        throw new ValidationError(`Invalid URL for navigate: ${err.message}`, { type: 'navigate', url: rest.trim() });
      }
      return { type: 'navigate', url: rest.trim() };

    case 'scroll': {
      const pixels = parseInt(rest, 10);
      if (!Number.isFinite(pixels)) {
        throw new ValidationError(`scroll requires valid pixel value: "${spec}"`);
      }
      return { type: 'scroll', pixels };
    }

    default:
      throw new ValidationError(`Unknown action type: "${type}"`);
  }
}

export function parseActionSpec(specString) {
  if (!specString || typeof specString !== 'string') return [];

  const actions = [];
  const parts = specString.split(/,(?=\s*(?:click|submit|type|select|wait|navigate|scroll):)/i);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    actions.push(parseOneAction(trimmed));
  }

  return actions;
}

export function validateAction(action, elementMap) {
  const needsElement = ['click', 'submit', 'type', 'select'];

  if (needsElement.includes(action.type)) {
    if (!action.elementId) {
      throw new ValidationError(`${action.type} action requires an element ID`, action);
    }
    if (!elementMap[action.elementId]) {
      const available = Object.keys(elementMap);
      const hint =
        available.length > 0 ? ` Available: ${available.slice(0, 10).join(', ')}` : ' No elements found on page.';
      throw new ElementNotFoundError(action.elementId, hint.trim());
    }
  }
}

export class ActionExecutor {
  constructor(page, elementMap, { defaultTimeoutMs = 10000 } = {}) {
    this.page = page;
    this.elementMap = elementMap;
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.results = [];
  }

  resolveSelector(elementId) {
    const selector = this.elementMap[elementId];
    if (!selector) {
      throw new ElementNotFoundError(elementId, 'not in element map');
    }
    return selector;
  }

  async executeAll(actions) {
    for (const action of actions) {
      const result = await this.execute(action);
      this.results.push(result);
    }
    return this.results;
  }

  async execute(action) {
    try {
      switch (action.type) {
        case 'click':
          return await this.click(action);
        case 'type':
          return await this.typeText(action);
        case 'select':
          return await this.select(action);
        case 'submit':
          return await this.submit(action);
        case 'wait':
          return await this.wait(action);
        case 'navigate':
          return await this.navigate(action);
        case 'scroll':
          return await this.scroll(action);
        default:
          throw new ValidationError(`Unknown action type: ${action.type}`);
      }
    } catch (err) {
      if (err instanceof ActionError) throw err;
      throw new ActionError(`Action failed: ${err.message}`, { action, cause: err });
    }
  }

  async click({ elementId }) {
    const selector = this.resolveSelector(elementId);
    await this.page.click(selector, { timeout: this.defaultTimeoutMs });
    return { type: 'click', elementId, selector, ok: true };
  }

  async typeText({ elementId, value, slow }) {
    const selector = this.resolveSelector(elementId);
    await this.page.click(selector, { timeout: this.defaultTimeoutMs });

    if (slow) {
      await this.page.type(selector, value, { delay: 80 });
    } else {
      await this.page.fill(selector, value, { timeout: this.defaultTimeoutMs });
    }
    return { type: 'type', elementId, selector, ok: true };
  }

  async select({ elementId, value }) {
    const selector = this.resolveSelector(elementId);
    await this.page.selectOption(selector, value, { timeout: this.defaultTimeoutMs });
    return { type: 'select', elementId, selector, ok: true };
  }

  async submit({ elementId }) {
    const selector = this.resolveSelector(elementId);

    const formExists = await this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el?.closest('form') != null;
    }, selector);

    if (formExists) {
      await this.page.evaluate((sel) => {
        const el = document.querySelector(sel);
        el.closest('form')?.requestSubmit();
      }, selector);
    } else {
      await this.page.click(selector, { timeout: this.defaultTimeoutMs });
    }

    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    return { type: 'submit', elementId, selector, ok: true };
  }

  async wait({ ms }) {
    await this.page.waitForTimeout(ms);
    return { type: 'wait', ms, ok: true };
  }

  async navigate({ url }) {
    // Validate URL for SSRF protection
    validateURL(url);

    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeoutMs * 3 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    return { type: 'navigate', url, finalUrl: this.page.url(), ok: true };
  }

  async scroll({ pixels }) {
    await this.page.evaluate((px) => window.scrollBy(0, px), pixels);
    await this.page.waitForTimeout(300);
    return { type: 'scroll', pixels, ok: true };
  }
}
