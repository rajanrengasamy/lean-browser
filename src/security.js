import { URL } from 'node:url';

export class SSRFError extends Error {
  constructor(message, { url, reason } = {}) {
    super(message);
    this.name = 'SSRFError';
    this.url = url;
    this.reason = reason;
  }
}

// Private IP ranges (CIDR notation)
const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255', name: '10.0.0.0/8' },
  { start: '172.16.0.0', end: '172.31.255.255', name: '172.16.0.0/12' },
  { start: '192.168.0.0', end: '192.168.255.255', name: '192.168.0.0/16' },
  { start: '127.0.0.0', end: '127.255.255.255', name: '127.0.0.0/8' },
  { start: '169.254.0.0', end: '169.254.255.255', name: '169.254.0.0/16' }, // Link-local
  { start: '0.0.0.0', end: '0.255.255.255', name: '0.0.0.0/8' }, // Current network
];

// Cloud metadata endpoints
const METADATA_HOSTNAMES = ['169.254.169.254', 'metadata.google.internal', 'metadata', 'instance-data'];

// Convert IP address string to number for comparison
function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// Check if IP is in private range
function isPrivateIP(ip) {
  // Normalize IPv6 address (remove brackets if present)
  const normalizedIp = ip.replace(/^\[|\]$/g, '');

  // Handle IPv6 localhost
  if (normalizedIp === '::1' || normalizedIp === '::ffff:127.0.0.1') {
    return true;
  }

  // Handle IPv4-mapped IPv6
  let ipToCheck = normalizedIp;
  if (normalizedIp.startsWith('::ffff:')) {
    ipToCheck = normalizedIp.substring(7);
  }

  // Only check IPv4 addresses
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipToCheck)) {
    // For IPv6, block local addresses
    const lowerIp = normalizedIp.toLowerCase();
    if (lowerIp.startsWith('fe80:') || lowerIp.startsWith('fc00:') || lowerIp.startsWith('fd00:')) {
      return true;
    }
    return false;
  }

  const ipNum = ipToNumber(ipToCheck);

  for (const range of PRIVATE_IP_RANGES) {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);
    if (ipNum >= startNum && ipNum <= endNum) {
      return true;
    }
  }

  return false;
}

// Check if hostname is a metadata endpoint
function isMetadataEndpoint(hostname) {
  const lower = hostname.toLowerCase();
  return METADATA_HOSTNAMES.some((blocked) => lower === blocked || lower.endsWith(`.${blocked}`));
}

// Load whitelist/blacklist from environment
function getWhitelist() {
  const env = process.env.LEAN_BROWSER_URL_WHITELIST;
  if (!env) return null;
  return env.split(',').map((s) => s.trim().toLowerCase());
}

function getBlacklist() {
  const env = process.env.LEAN_BROWSER_URL_BLACKLIST;
  if (!env) return [];
  return env.split(',').map((s) => s.trim().toLowerCase());
}

// Check if hostname matches pattern (supports wildcards)
function matchesPattern(hostname, pattern) {
  const lower = hostname.toLowerCase();
  const patternLower = pattern.toLowerCase();

  // Exact match
  if (lower === patternLower) return true;

  // Wildcard match (*.example.com)
  if (patternLower.startsWith('*.')) {
    const domain = patternLower.substring(2);
    return lower.endsWith(`.${domain}`) || lower === domain;
  }

  return false;
}

/**
 * Validate a URL for SSRF protection
 * @param {string} urlString - The URL to validate
 * @param {object} options - Validation options
 * @param {boolean} options.allowPrivateIPs - Allow private IP addresses (default: false)
 * @param {boolean} options.allowMetadata - Allow metadata endpoints (default: false)
 * @param {boolean} options.allowData - Allow data: URLs (default: false)
 * @param {string[]} options.whitelist - Additional whitelist patterns (overrides env)
 * @param {string[]} options.blacklist - Additional blacklist patterns (overrides env)
 * @throws {SSRFError} If URL is not allowed
 * @returns {URL} Parsed URL object if valid
 */
export function validateURL(urlString, options = {}) {
  const {
    allowPrivateIPs = false,
    allowMetadata = false,
    allowData = false,
    whitelist = getWhitelist(),
    blacklist = getBlacklist(),
  } = options;

  // Parse URL
  let url;
  try {
    url = new URL(urlString);
  } catch (err) {
    throw new SSRFError(`Invalid URL: ${err.message}`, { url: urlString, reason: 'invalid_url' });
  }

  // Block file:// protocol
  if (url.protocol === 'file:') {
    throw new SSRFError('file:// protocol is not allowed', { url: urlString, reason: 'blocked_protocol' });
  }

  // Allow data: URLs only when explicitly enabled.
  if (url.protocol === 'data:') {
    if (!allowData) {
      throw new SSRFError('Protocol data: is not allowed (only http/https)', {
        url: urlString,
        reason: 'blocked_protocol',
      });
    }
    return url;
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new SSRFError(`Protocol ${url.protocol} is not allowed (only http/https)`, {
      url: urlString,
      reason: 'blocked_protocol',
    });
  }

  const hostname = url.hostname;

  // Check for localhost hostname
  if (hostname.toLowerCase() === 'localhost') {
    if (!allowPrivateIPs) {
      throw new SSRFError('localhost is not allowed', { url: urlString, reason: 'private_ip' });
    }
  }

  // Check whitelist first (if enabled, only whitelisted URLs are allowed)
  if (whitelist) {
    const isWhitelisted = whitelist.some((pattern) => matchesPattern(hostname, pattern));
    if (!isWhitelisted) {
      throw new SSRFError(`URL not in whitelist: ${hostname}`, { url: urlString, reason: 'not_whitelisted' });
    }
    // If whitelisted, allow it regardless of other checks
    return url;
  }

  // Check blacklist
  const isBlacklisted = blacklist.some((pattern) => matchesPattern(hostname, pattern));
  if (isBlacklisted) {
    throw new SSRFError(`URL is blacklisted: ${hostname}`, { url: urlString, reason: 'blacklisted' });
  }

  // Check metadata endpoints
  if (!allowMetadata && isMetadataEndpoint(hostname)) {
    throw new SSRFError(`Cloud metadata endpoints are not allowed: ${hostname}`, {
      url: urlString,
      reason: 'metadata_endpoint',
    });
  }

  // Check private IPs
  if (!allowPrivateIPs && isPrivateIP(hostname)) {
    throw new SSRFError(`Private IP addresses are not allowed: ${hostname}`, {
      url: urlString,
      reason: 'private_ip',
    });
  }

  return url;
}

/**
 * Validate multiple URLs
 * @param {string[]} urls - Array of URLs to validate
 * @param {object} options - Validation options (same as validateURL)
 * @returns {URL[]} Array of validated URL objects
 */
export function validateURLs(urls, options = {}) {
  return urls.map((url) => validateURL(url, options));
}
