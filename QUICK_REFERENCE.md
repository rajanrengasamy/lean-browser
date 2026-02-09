# Lean Browser - Quick Reference Guide

## New Features Quick Reference

### Screenshots

```bash
# Basic
lean-browser screenshot https://example.com

# Full page
lean-browser screenshot https://example.com --full-page

# Custom size
lean-browser screenshot https://example.com --viewport 1920x1080 --output screenshot.png
```

### Ad Blocking

```bash
# Block ads and trackers
lean-browser https://news.site.com --block-ads

# Block images
lean-browser https://heavy.site.com --block-resources image

# Block multiple types
lean-browser https://site.com --block-resources image,font,stylesheet
```

### Cookie Persistence

```bash
# Save cookies
lean-browser https://example.com --cookies cookies.json

# Reuse cookies
lean-browser https://example.com/dashboard --cookies cookies.json
```

### Viewport & Device Emulation

```bash
# Custom viewport
lean-browser https://example.com --viewport 1920x1080

# Mobile
lean-browser https://example.com --mobile

# Specific device
lean-browser https://example.com --device "iPhone 13"
```

### Custom Headers

```bash
# Single header
lean-browser https://example.com --headers '{"Accept-Language":"fr-FR"}'

# Multiple headers
lean-browser https://example.com --headers '{"Accept-Language":"fr-FR","Referer":"https://google.com"}'
```

### Combining Features

```bash
# Everything together
lean-browser https://site.com \
  --viewport 1920x1080 \
  --block-ads \
  --block-resources image,font \
  --cookies session.json \
  --headers '{"Accept-Language":"en-US"}' \
  --tokens 1000 \
  --mode interactive
```

## Programmatic API

```javascript
import { fetchRenderedHtml, takeScreenshot } from 'lean-browser/src/browser.js';

// Fetch with all options
const result = await fetchRenderedHtml('https://example.com', {
  viewport: '1920x1080',
  device: 'iPhone 13',
  mobile: true,
  cookiesFile: 'cookies.json',
  blockAds: true,
  blockResources: ['image', 'font'],
  extraHeaders: {
    'Accept-Language': 'fr-FR',
    Referer: 'https://google.com',
  },
  timeoutMs: 45000,
  headless: true,
});

console.log(result.html);
console.log(`Blocked ${result.blockedCount} requests`);

// Screenshot
const screenshot = await takeScreenshot('https://example.com', {
  fullPage: true,
  viewport: '1920x1080',
  blockAds: true,
});

console.log(screenshot.screenshot); // base64 PNG
```

## Available Devices

**Mobile:**

- iPhone 13
- iPhone 13 Pro
- iPhone 14
- Pixel 5
- Galaxy S9+

**Tablet:**

- iPad Pro
- iPad (gen 7)
- Galaxy Tab S4

## Blocked Services

**Ads:**

- Google Ads (doubleclick.net, googlesyndication.com)
- Amazon Ads
- Ad Networks (Taboola, Outbrain, Criteo)

**Analytics:**

- Google Analytics
- Mixpanel
- Segment
- Amplitude
- Hotjar

**Trackers:**

- Facebook Pixel
- Twitter Analytics
- LinkedIn Pixel

**Resources:**

- `image` - Images
- `font` - Web fonts
- `stylesheet` - CSS files
- `media` - Audio/video

## Performance Tips

1. **Fastest loads**: `--block-ads --block-resources image,font,stylesheet`
2. **Balanced**: `--block-ads`
3. **Mobile testing**: `--mobile --block-ads`
4. **Desktop testing**: `--viewport 1920x1080`
5. **Screenshots**: Use `--block-ads` for cleaner images

## Common Use Cases

### 1. Research/Reading

```bash
lean-browser https://article.com --block-ads --tokens 2000
```

### 2. Web Scraping

```bash
lean-browser https://site.com --block-resources image,font --mode json
```

### 3. Mobile Testing

```bash
lean-browser screenshot https://site.com --mobile --output mobile.png
```

### 4. Authenticated Sessions

```bash
# Login
lean-browser https://site.com/login --cookies session.json

# Use session
lean-browser https://site.com/dashboard --cookies session.json
```

### 5. Localized Content

```bash
lean-browser https://site.com --headers '{"Accept-Language":"ja-JP"}'
```

## Troubleshooting

### Issue: Too many resources blocked

**Solution**: Don't use `--block-resources` or be more selective

### Issue: Page doesn't load correctly

**Solution**: Disable `--block-ads` - site may require analytics

### Issue: Cookies not persisting

**Solution**: Use full path: `/tmp/cookies.json` not `cookies.json`

### Issue: Screenshot too small

**Solution**: Use `--full-page` or larger `--viewport`

### Issue: Headers not working

**Solution**: Ensure JSON is properly quoted: `'{"key":"value"}'`

## Test Your Setup

```bash
# Basic test
lean-browser https://example.com

# Screenshot test
lean-browser screenshot https://example.com --output /tmp/test.png

# Ad blocking test
lean-browser https://news.ycombinator.com --block-ads

# All features test
lean-browser https://example.com \
  --viewport 1920x1080 \
  --block-ads \
  --cookies /tmp/test-cookies.json \
  --tokens 500
```
