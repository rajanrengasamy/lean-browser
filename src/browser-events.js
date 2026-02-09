import { writeFile } from 'node:fs/promises';
import { getLogger } from './logger.js';

export class BrowserEventLogger {
  constructor(page, options = {}) {
    this.page = page;
    this.logger = options.logger ?? getLogger();
    this.debugMode = options.debugMode ?? false;
    this.requests = [];
    this.responses = [];
    this.consoleMessages = [];
    this.errors = [];
    this.harEnabled = options.saveHar ?? false;
    this.saveHtml = options.saveHtml ?? false;
  }

  attach() {
    if (!this.debugMode) return;

    this.logger.debug('Attaching browser event listeners');

    // Log requests
    this.page.on('request', (request) => {
      const req = {
        timestamp: new Date().toISOString(),
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        headers: request.headers(),
      };
      this.requests.push(req);
      this.logger.trace('Request', { url: req.url, method: req.method, type: req.resourceType });
    });

    // Log responses
    this.page.on('response', (response) => {
      const resp = {
        timestamp: new Date().toISOString(),
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
      };
      this.responses.push(resp);
      this.logger.trace('Response', { url: resp.url, status: resp.status });
    });

    // Log console messages
    this.page.on('console', (msg) => {
      const consoleMsg = {
        timestamp: new Date().toISOString(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
      };
      this.consoleMessages.push(consoleMsg);
      this.logger.debug(`Browser console [${msg.type()}]`, { text: msg.text() });
    });

    // Log page errors
    this.page.on('pageerror', (error) => {
      const err = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
      };
      this.errors.push(err);
      this.logger.error('Browser page error', { message: error.message });
    });

    // Log request failures
    this.page.on('requestfailed', (request) => {
      const failure = {
        timestamp: new Date().toISOString(),
        url: request.url(),
        failure: request.failure()?.errorText,
      };
      this.errors.push(failure);
      this.logger.warn('Request failed', { url: request.url(), error: failure.failure });
    });
  }

  async saveHarFile(filename) {
    if (!this.harEnabled) return;

    this.logger.debug('Saving HAR file', { filename });

    const har = {
      log: {
        version: '1.2',
        creator: {
          name: 'lean-browser',
          version: '0.2.0',
        },
        pages: [
          {
            startedDateTime: this.requests[0]?.timestamp ?? new Date().toISOString(),
            id: 'page_1',
            title: await this.page.title().catch(() => ''),
            pageTimings: {},
          },
        ],
        entries: this.requests.map((req) => {
          const resp = this.responses.find((r) => r.url === req.url);
          return {
            startedDateTime: req.timestamp,
            time: 0,
            request: {
              method: req.method,
              url: req.url,
              httpVersion: 'HTTP/1.1',
              headers: Object.entries(req.headers).map(([name, value]) => ({ name, value })),
              queryString: [],
              cookies: [],
              headersSize: -1,
              bodySize: -1,
            },
            response: resp
              ? {
                  status: resp.status,
                  statusText: resp.statusText,
                  httpVersion: 'HTTP/1.1',
                  headers: Object.entries(resp.headers).map(([name, value]) => ({ name, value })),
                  cookies: [],
                  content: {
                    size: -1,
                    mimeType: resp.headers['content-type'] ?? '',
                  },
                  redirectURL: '',
                  headersSize: -1,
                  bodySize: -1,
                }
              : {
                  status: 0,
                  statusText: '',
                  httpVersion: 'HTTP/1.1',
                  headers: [],
                  cookies: [],
                  content: { size: 0, mimeType: '' },
                  redirectURL: '',
                  headersSize: -1,
                  bodySize: -1,
                },
            cache: {},
            timings: {
              send: 0,
              wait: 0,
              receive: 0,
            },
          };
        }),
      },
    };

    try {
      await writeFile(filename, JSON.stringify(har, null, 2));
      this.logger.success('HAR file saved', { filename });
    } catch (err) {
      this.logger.error('Failed to save HAR file', { filename, error: err });
    }
  }

  async saveHtmlFile(filename) {
    if (!this.saveHtml) return;

    this.logger.debug('Saving HTML file', { filename });

    try {
      const html = await this.page.content();
      await writeFile(filename, html);
      this.logger.success('HTML file saved', { filename });
    } catch (err) {
      this.logger.error('Failed to save HTML file', { filename, error: err });
    }
  }

  async captureScreenshot(filename) {
    this.logger.debug('Capturing screenshot', { filename });

    try {
      await this.page.screenshot({ path: filename, fullPage: false });
      this.logger.success('Screenshot saved', { filename });
      return filename;
    } catch (err) {
      this.logger.error('Failed to capture screenshot', { filename, error: err });
      return null;
    }
  }

  getLastRequests(count = 10) {
    return this.requests.slice(-count);
  }

  getConsoleErrors() {
    return this.consoleMessages.filter((m) => m.type === 'error' || m.type === 'warning');
  }

  getSummary() {
    return {
      requests: this.requests.length,
      responses: this.responses.length,
      consoleMessages: this.consoleMessages.length,
      errors: this.errors.length,
      lastRequests: this.getLastRequests(10),
      consoleErrors: this.getConsoleErrors(),
    };
  }
}
