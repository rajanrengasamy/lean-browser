/**
 * Custom error classes for lean-browser with error codes and helpful messages.
 */

export const ErrorCodes = {
  E_TIMEOUT: 'E_TIMEOUT',
  E_ANTIBOT: 'E_ANTIBOT',
  E_NETWORK: 'E_NETWORK',
  E_DNS: 'E_DNS',
  E_CONNECTION_REFUSED: 'E_CONNECTION_REFUSED',
  E_SERVER_ERROR: 'E_SERVER_ERROR',
  E_BROWSER_CRASH: 'E_BROWSER_CRASH',
  E_EXTRACTION_FAILED: 'E_EXTRACTION_FAILED',
  E_INVALID_URL: 'E_INVALID_URL',
  E_UNKNOWN: 'E_UNKNOWN',
};

export class BrowserError extends Error {
  constructor(message, { code, url, statusCode, cause, suggestion } = {}) {
    super(message);
    this.name = 'BrowserError';
    this.code = code || ErrorCodes.E_UNKNOWN;
    this.url = url;
    this.statusCode = statusCode;
    this.suggestion = suggestion;
    if (cause) this.cause = cause;
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      url: this.url,
      statusCode: this.statusCode,
      suggestion: this.suggestion,
    };
  }
}

export class TimeoutError extends BrowserError {
  constructor(url, timeoutMs, cause) {
    const message = `Navigation timeout after ${timeoutMs}ms for ${url}`;
    const suggestion = `Try increasing timeout with --timeout ${timeoutMs * 2}`;
    super(message, {
      code: ErrorCodes.E_TIMEOUT,
      url,
      cause,
      suggestion,
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class NetworkError extends BrowserError {
  constructor(url, message, cause) {
    const suggestion = 'Check your internet connection and try again';
    super(`Network error for ${url}: ${message}`, {
      code: ErrorCodes.E_NETWORK,
      url,
      cause,
      suggestion,
    });
    this.name = 'NetworkError';
  }
}

export class DNSError extends BrowserError {
  constructor(url, cause) {
    const suggestion = 'Check the domain name and your DNS settings';
    super(`DNS resolution failed for ${url}`, {
      code: ErrorCodes.E_DNS,
      url,
      cause,
      suggestion,
    });
    this.name = 'DNSError';
  }
}

export class ConnectionRefusedError extends BrowserError {
  constructor(url, cause) {
    const suggestion = 'The server may be down or the port may be incorrect';
    super(`Connection refused for ${url}`, {
      code: ErrorCodes.E_CONNECTION_REFUSED,
      url,
      cause,
      suggestion,
    });
    this.name = 'ConnectionRefusedError';
  }
}

export class ServerError extends BrowserError {
  constructor(url, statusCode, cause) {
    const suggestion = statusCode >= 500 ? 'The server is experiencing issues. Try again later.' : null;
    super(`Server error ${statusCode} for ${url}`, {
      code: ErrorCodes.E_SERVER_ERROR,
      url,
      statusCode,
      cause,
      suggestion,
    });
    this.name = 'ServerError';
  }
}

export class AntiBotError extends BrowserError {
  constructor(url, detectionType, statusCode) {
    const suggestions = {
      cloudflare: 'Cloudflare challenge detected. This site requires browser verification.',
      recaptcha: 'reCAPTCHA detected. This site requires human verification.',
      forbidden: 'Access forbidden (403). The site may be blocking automated requests.',
    };
    const message = `Anti-bot protection detected on ${url} (${detectionType})`;
    super(message, {
      code: ErrorCodes.E_ANTIBOT,
      url,
      statusCode,
      suggestion: suggestions[detectionType] || 'The site is blocking automated access',
    });
    this.name = 'AntiBotError';
    this.detectionType = detectionType;
  }
}

export class BrowserCrashError extends BrowserError {
  constructor(url, cause) {
    const suggestion = 'Browser process crashed. This may be a system resource issue.';
    super(`Browser crashed while loading ${url}`, {
      code: ErrorCodes.E_BROWSER_CRASH,
      url,
      cause,
      suggestion,
    });
    this.name = 'BrowserCrashError';
  }
}

export class ExtractionError extends BrowserError {
  constructor(url, message, cause) {
    const suggestion = 'The page structure may be unusual. Check the HTML content.';
    super(`Content extraction failed for ${url}: ${message}`, {
      code: ErrorCodes.E_EXTRACTION_FAILED,
      url,
      cause,
      suggestion,
    });
    this.name = 'ExtractionError';
  }
}

/**
 * Detect anti-bot protection from page content and status.
 * @param {string} html - Page HTML content
 * @param {number} status - HTTP status code
 * @param {string} url - Page URL
 * @returns {AntiBotError|null} - AntiBotError if detected, null otherwise
 */
export function detectAntiBot(html, status, url) {
  if (!html || typeof html !== 'string') return null;

  const lowerHtml = html.toLowerCase();

  // Cloudflare detection - check for specific Cloudflare indicators
  const cloudflareIndicators = [
    'cf-browser-verification',
    'challenge-running',
    'cf-challenge-running',
    '__cf_chl_jschl_tk__',
    'cf-challenge',
  ];

  const hasCloudflareIndicator = cloudflareIndicators.some((indicator) => lowerHtml.includes(indicator));

  const cloudflareTextIndicators = ['checking your browser', 'just a moment', 'ddos protection by cloudflare'];

  const hasCloudflareText =
    lowerHtml.includes('cloudflare') && cloudflareTextIndicators.some((text) => lowerHtml.includes(text));

  if (hasCloudflareIndicator || hasCloudflareText) {
    return new AntiBotError(url, 'cloudflare', status);
  }

  // reCAPTCHA detection
  if (lowerHtml.includes('recaptcha') || lowerHtml.includes('g-recaptcha')) {
    return new AntiBotError(url, 'recaptcha', status);
  }

  // 403 Forbidden - common anti-bot response (only if no other detection)
  if (status === 403) {
    return new AntiBotError(url, 'forbidden', status);
  }

  return null;
}

/**
 * Classify Playwright error into appropriate error type.
 * @param {Error} error - Original error
 * @param {string} url - URL being accessed
 * @param {number} timeoutMs - Timeout value used
 * @returns {BrowserError} - Classified error
 */
export function classifyError(error, url, timeoutMs) {
  const message = error?.message || String(error);

  // Timeout errors
  if (message.includes('timeout') || message.includes('Timeout')) {
    return new TimeoutError(url, timeoutMs, error);
  }

  // DNS resolution failures
  if (message.includes('net::ERR_NAME_NOT_RESOLVED') || message.includes('getaddrinfo ENOTFOUND')) {
    return new DNSError(url, error);
  }

  // Connection refused
  if (message.includes('net::ERR_CONNECTION_REFUSED') || message.includes('ECONNREFUSED')) {
    return new ConnectionRefusedError(url, error);
  }

  // Network errors
  if (
    message.includes('net::ERR_') ||
    message.includes('Network') ||
    message.includes('ENETUNREACH') ||
    message.includes('EHOSTUNREACH')
  ) {
    return new NetworkError(url, message, error);
  }

  // Browser crash
  if (message.includes('Target closed') || message.includes('Browser closed')) {
    return new BrowserCrashError(url, error);
  }

  // Default to generic browser error
  return new BrowserError(`Failed to load ${url}: ${message}`, {
    code: ErrorCodes.E_UNKNOWN,
    url,
    cause: error,
  });
}
