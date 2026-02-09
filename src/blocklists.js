// Common ad, analytics, and tracker domains to block
export const AD_DOMAINS = [
  // Google Ads
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',

  // Facebook
  'facebook.com/tr',
  'facebook.net/tr',
  'connect.facebook.net',

  // Analytics
  'mixpanel.com',
  'segment.com',
  'segment.io',
  'amplitude.com',
  'hotjar.com',
  'fullstory.com',
  'mouseflow.com',
  'crazyegg.com',
  'kissmetrics.com',
  'heap.io',

  // Ad Networks
  'adnxs.com',
  'adsrvr.org',
  'advertising.com',
  'adroll.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'amazon-adsystem.com',
  'media.net',
  'advertising-api-eu.amazon.com',

  // Trackers
  'hotjar.io',
  'nr-data.net',
  'newrelic.com',
  'sentry.io',
  'bugsnag.com',
  'loggly.com',
  'sumologic.com',

  // Social trackers
  'twitter.com/i/adsct',
  'linkedin.com/px',
  'pinterest.com/ct',
  'reddit.com/api/v1/pixel',

  // Common tracking pixels
  'pixel.facebook.com',
  'bat.bing.com',
  't.co/i/adsct',
  'analytics.twitter.com',
];

export const TRACKER_PATTERNS = [
  /facebook\.com\/tr/,
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /doubleclick\.net/,
  /googlesyndication\.com/,
  /\/pixel/i,
  /\/track/i,
  /\/analytics/i,
  /\/beacon/i,
  /\/collect/i,
];

export function shouldBlockRequest(url) {
  const urlLower = url.toLowerCase();

  // Check domain blocklist
  for (const domain of AD_DOMAINS) {
    if (urlLower.includes(domain)) {
      return true;
    }
  }

  // Check pattern blocklist
  for (const pattern of TRACKER_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}

export const RESOURCE_TYPES = {
  IMAGE: 'image',
  STYLESHEET: 'stylesheet',
  FONT: 'font',
  MEDIA: 'media',
  SCRIPT: 'script',
};

export function shouldBlockResourceType(resourceType, blockedTypes = []) {
  return blockedTypes.includes(resourceType);
}
