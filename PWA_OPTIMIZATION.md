# PWA Optimization Recommendations

Based on a thorough audit of the codebase, the following areas are prioritized by impact.

---

## 1. Code Splitting & Lazy Loading

**Impact: High | Effort: Low**

All 12+ components are statically imported in `App.js`, producing a single monolithic JS bundle. Every user downloads code for views they may never visit.

**Recommendations:**
- Use `React.lazy()` + `Suspense` for view-level components (`TimelineView`, `MapView`, `BudgetView`, `ActionItems`)
- Lazy-load modal components (`ActivityModal`, `ShareModal`, `ExpenseModal`, `SettlementModal`) — they are only needed on user interaction
- Add a lightweight `<Suspense fallback={<Spinner />}>` wrapper so the shell renders immediately

```js
// Before
import MapView from './components/MapView';

// After
const MapView = React.lazy(() => import('./components/MapView'));
```

---

## 2. Runtime Caching Strategies in the Service Worker

**Impact: High | Effort: Medium**

`service-worker.js` only uses Workbox precaching. Dynamic assets (API responses, images from URLs, CDN assets) are never cached, so the app breaks or degrades on flaky networks.

**Recommendations:**

| Resource | Strategy | Rationale |
|----------|-----------|-----------|
| Google Maps JS SDK | `CacheFirst` (30d TTL) | Rarely changes, large payload |
| Nominatim geocode responses | `StaleWhileRevalidate` (7d TTL) | Addresses don't change often |
| Google Places API responses | `NetworkFirst` (1d TTL) | Business data changes more frequently |
| Firebase remote config | `NetworkFirst` | Need fresh auth/config |
| App icons & static images | `CacheFirst` (30d TTL) | Immutable assets |

Add these to `service-worker.js` using `workbox-strategies` and `workbox-routing`:

```js
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Google Maps SDK
registerRoute(
  ({ url }) => url.hostname === 'maps.googleapis.com',
  new CacheFirst({ cacheName: 'google-maps', plugins: [new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 })] })
);

// Nominatim geocoding
registerRoute(
  ({ url }) => url.hostname === 'nominatim.openstreetmap.org',
  new StaleWhileRevalidate({ cacheName: 'geocode-cache', plugins: [new ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60 })] })
);
```

---

## 3. Offline Write Queue

**Impact: High | Effort: High**

Users can view cached Firestore data offline (Firebase SDK handles this), but any writes (add activity, log expense) are silently lost or fail when the network is unavailable.

**Recommendations:**
- Enable Firestore offline writes via the SDK — it already queues them automatically when the persistent cache is initialized; verify the `persistentLocalCache` config is correct and that writes don't show errors to the user while queued
- Add a network status listener and an offline banner so users know their changes are queued, not lost
- For Nominatim/Google Places calls that fail offline, catch the error gracefully and disable the address-search UI rather than showing an uncaught error

```js
// Detect offline state
window.addEventListener('offline', () => setIsOffline(true));
window.addEventListener('online',  () => setIsOffline(false));
```

---

## 4. Offline Fallback UI & Network Indicators

**Impact: Medium | Effort: Low**

There is no indicator when the device is offline. Users have no feedback about whether the app is functional, degraded, or broken.

**Recommendations:**
- Add a small sticky banner ("You're offline — changes will sync when reconnected") using the `online`/`offline` window events
- Add a service worker navigation fallback (`offline.html`) for when a user navigates to a new route while offline and the page isn't precached
- Disable address-search and geocoding UI controls while offline rather than letting requests fail silently

---

## 5. Web Vitals Reporting

**Impact: Medium | Effort: Low**

`reportWebVitals.js` collects CLS, FID, FCP, LCP, and TTFB but only logs them to the console. This data is discarded in production and provides no actionable insight.

**Recommendations:**
- Send metrics to an analytics endpoint (Google Analytics 4, or a custom `/api/vitals` endpoint)
- At minimum, log to Firebase Analytics so you have a performance baseline before and after optimizations

```js
// reportWebVitals.js
export function reportWebVitals(onPerfEntry) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
}

// index.js — send to GA4
reportWebVitals(({ name, value, id }) => {
  window.gtag?.('event', name, { value: Math.round(name === 'CLS' ? value * 1000 : value), event_label: id, non_interaction: true });
});
```

---

## 6. CSS Architecture

**Impact: Medium | Effort: Medium**

`App.css` is 1,084 lines loaded as a single blocking stylesheet. All CSS — including styles for hidden modals and inactive views — blocks first paint.

**Recommendations:**
- Split CSS by component: co-locate `MapView.css`, `BudgetView.css`, etc. with their components and import them inside the component file — CRA will inline small files and chunk larger ones
- Extract critical above-the-fold styles (header, loading spinner, bottom nav) into a `<style>` tag in `index.html` to avoid render-blocking
- Consider using CSS Modules (already supported by CRA via `*.module.css`) for better tree-shaking and encapsulation

---

## 7. Firebase SDK Tree-Shaking

**Impact: Medium | Effort: Low**

The Firebase SDK is imported using the modular v9 API (`firebase/app`, `firebase/firestore`, etc.), which is correct. Verify that no legacy compat imports (`firebase/compat/*`) exist anywhere, as they would pull in the full SDK.

**Recommendations:**
- Run `npx source-map-explorer build/static/js/*.js` after a production build to identify if Firebase or Google Maps is contributing unexpectedly large chunks
- If `@vis.gl/react-google-maps` is not tree-shaken well, consider dynamically importing `MapView` (already recommended in item 1) to defer that cost entirely

---

## 8. Manifest & Icon Coverage

**Impact: Low | Effort: Low**

The manifest only specifies two icon sizes (192×192 and 512×512). Some platforms and browsers request additional sizes.

**Recommendations:**
- Add a 384×384 icon (some Android launchers use this)
- Add `"purpose": "any maskable"` to both icon entries, or split into separate `any` and `maskable` entries so adaptive icon support is explicit
- Add `shortcuts` to the manifest for quick-actions (e.g., "Add Activity", "View Budget") for Android home-screen long-press

```json
"shortcuts": [
  {
    "name": "Add Activity",
    "url": "/?action=add-activity",
    "icons": [{ "src": "icons/icon-96.png", "sizes": "96x96" }]
  }
]
```

---

## 9. Automated Lighthouse CI

**Impact: Medium | Effort: Low**

There is no automated performance auditing. Regressions (bundle size increase, missing service worker, broken manifest) would go undetected until users report issues.

**Recommendations:**
- Add `@lhci/cli` and a `.lighthouserc.json` with budget assertions
- Run Lighthouse CI in your CI/CD pipeline (GitHub Actions, etc.) on every PR
- Set minimum score gates: Performance ≥ 80, PWA ≥ 90, Accessibility ≥ 90

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:pwa": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }]
      }
    }
  }
}
```

---

## 10. Unused Assets

**Impact: Low | Effort: Low**

`public/logo192.png` and `public/logo512.png` are the CRA default placeholder images. They are not referenced anywhere in the app code but are served as static assets.

**Recommendations:**
- Delete `logo192.png` and `logo512.png` from `public/` — the app uses `icon-192.png` and `icon-512.png` from the `icons/` folder
- Verify `favicon.ico` is the custom branded icon (regenerated via `scripts/generateIcons.js`) and not the CRA default

---

## Summary Table

| # | Area | Impact | Effort | Status |
|---|------|--------|--------|--------|
| 1 | Code splitting (React.lazy) | High | Low | Not implemented |
| 2 | Runtime caching strategies | High | Medium | Not implemented |
| 3 | Offline write queue | High | High | Partial (Firestore only) |
| 4 | Offline fallback UI | Medium | Low | Not implemented |
| 5 | Web Vitals reporting | Medium | Low | Partial (console only) |
| 6 | CSS architecture | Medium | Medium | Not implemented |
| 7 | Firebase tree-shaking audit | Medium | Low | Unknown |
| 8 | Manifest & icon coverage | Low | Low | Partial |
| 9 | Lighthouse CI | Medium | Low | Not implemented |
| 10 | Remove unused assets | Low | Low | Not implemented |
