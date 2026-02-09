import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldBlockRequest, shouldBlockResourceType, RESOURCE_TYPES } from '../../src/blocklists.js';

describe('shouldBlockRequest', () => {
  it('blocks Google Analytics', () => {
    assert.equal(shouldBlockRequest('https://www.google-analytics.com/collect'), true);
    assert.equal(shouldBlockRequest('https://google-analytics.com/ga.js'), true);
  });

  it('blocks Google Ads', () => {
    assert.equal(shouldBlockRequest('https://doubleclick.net/ads'), true);
    assert.equal(shouldBlockRequest('https://googlesyndication.com/pagead'), true);
    assert.equal(shouldBlockRequest('https://googleadservices.com/pagead'), true);
  });

  it('blocks Facebook tracking', () => {
    assert.equal(shouldBlockRequest('https://facebook.com/tr/?id=12345'), true);
    assert.equal(shouldBlockRequest('https://connect.facebook.net/en_US/fbevents.js'), true);
  });

  it('blocks common analytics services', () => {
    assert.equal(shouldBlockRequest('https://mixpanel.com/track'), true);
    assert.equal(shouldBlockRequest('https://segment.io/v1/track'), true);
    assert.equal(shouldBlockRequest('https://amplitude.com/api/2/httpapi'), true);
  });

  it('blocks ad networks', () => {
    assert.equal(shouldBlockRequest('https://adnxs.com/banner'), true);
    assert.equal(shouldBlockRequest('https://taboola.com/recommendations'), true);
    assert.equal(shouldBlockRequest('https://outbrain.com/widget'), true);
  });

  it('blocks tracking pixels using patterns', () => {
    assert.equal(shouldBlockRequest('https://example.com/pixel.gif'), true);
    assert.equal(shouldBlockRequest('https://example.com/track?user=123'), true);
    assert.equal(shouldBlockRequest('https://example.com/analytics/collect'), true);
  });

  it('does not block legitimate requests', () => {
    assert.equal(shouldBlockRequest('https://example.com'), false);
    assert.equal(shouldBlockRequest('https://github.com/user/repo'), false);
    assert.equal(shouldBlockRequest('https://cdn.example.com/app.js'), false);
  });

  it('handles case-insensitive matching', () => {
    assert.equal(shouldBlockRequest('https://GOOGLE-ANALYTICS.COM/collect'), true);
    assert.equal(shouldBlockRequest('https://DoubleClick.Net/ads'), true);
  });
});

describe('shouldBlockResourceType', () => {
  it('blocks images when specified', () => {
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.IMAGE, [RESOURCE_TYPES.IMAGE]), true);
  });

  it('blocks stylesheets when specified', () => {
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.STYLESHEET, [RESOURCE_TYPES.STYLESHEET]), true);
  });

  it('blocks fonts when specified', () => {
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.FONT, [RESOURCE_TYPES.FONT]), true);
  });

  it('blocks media when specified', () => {
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.MEDIA, [RESOURCE_TYPES.MEDIA]), true);
  });

  it('does not block when type not in blocklist', () => {
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.IMAGE, [RESOURCE_TYPES.FONT]), false);
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.SCRIPT, [RESOURCE_TYPES.IMAGE]), false);
  });

  it('blocks multiple resource types', () => {
    const blocked = [RESOURCE_TYPES.IMAGE, RESOURCE_TYPES.FONT, RESOURCE_TYPES.STYLESHEET];
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.IMAGE, blocked), true);
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.FONT, blocked), true);
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.STYLESHEET, blocked), true);
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.SCRIPT, blocked), false);
  });

  it('handles empty blocklist', () => {
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.IMAGE, []), false);
    assert.equal(shouldBlockResourceType(RESOURCE_TYPES.FONT, []), false);
  });
});
