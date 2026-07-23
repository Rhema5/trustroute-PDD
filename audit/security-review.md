# TrustRoute — Security Review Report

**Classification:** Internal — Confidential  
**Date:** July 2026  
**Scope:** Firebase SPA, Firestore Rules, Client-Side Code, Secrets, Dependencies

---

## Security Score: 72/100 ⚠️

| Category | Score | Rating |
|----------|-------|--------|
| Authentication | 85/100 | 🟢 Good |
| Authorization (Firestore Rules) | 75/100 | 🟡 Moderate |
| Input Validation | 70/100 | 🟡 Moderate |
| Secrets Management | 55/100 | 🔴 Needs Work |
| Client-Side Security | 65/100 | 🟡 Moderate |
| Dependency Security | 80/100 | 🟢 Good |
| Mobile Security | 60/100 | 🔴 Needs Work |
| Infrastructure | 70/100 | 🟡 Moderate |

---

## Critical Findings

### 🔴 SEC-001 — Razorpay Key Secret Exposed in Client-Side .env

**Severity:** CRITICAL  
**Location:** `frontend/.env` — `VITE_RAZORPAY_KEY_SECRET`  
**Description:** The Razorpay `key_secret` is being bundled into the client-side application via Vite's `VITE_*` environment variable mechanism. This exposes the secret in the browser's JavaScript bundle.

**Impact:** An attacker can extract the secret from the minified bundle and sign payment requests, potentially issuing fake payment confirmations.

**Remediation:**
```
1. Move key_secret to a server-side Firebase Cloud Function
2. Use VITE_RAZORPAY_KEY_ID only (public key is safe)
3. Validate all Razorpay payment IDs server-side before marking paid
```

---

### 🔴 SEC-002 — Firebase App Check Disabled

**Severity:** HIGH  
**Location:** `frontend/src/lib/firebase.ts` — App Check code commented out  
**Description:** Firebase App Check is commented out, meaning any request with a valid Firebase project configuration can access Firestore and Storage.

**Impact:** Bots, scrapers, or unauthorized apps can read/write to your Firebase project.

**Remediation:**
```typescript
// Enable App Check with ReCaptchaV3
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});
```

---

### 🟡 SEC-003 — Firestore Rule: `resource.data.role == 'pending'` in List Query

**Severity:** MEDIUM  
**Location:** `backend/firestore.rules` — Line 29  
**Description:** Any authenticated user can list users where `role == 'pending'`. This exposes the pending registration queue to all signed-in users.

**Impact:** Information disclosure — agents can see list of pending registrations.

**Remediation:**
```javascript
// Remove the 'pending' list condition or restrict to owner only:
allow list: if isSignedIn() && (
  getUserRole(request.auth.uid) == 'owner' ||
  resource.data.enterpriseId == request.auth.uid
  // Remove: resource.data.role == 'pending'
);
```

---

### 🟡 SEC-004 — No Content Security Policy (CSP) Headers

**Severity:** MEDIUM  
**Location:** GitHub Pages hosting configuration  
**Description:** No CSP headers are set. GitHub Pages doesn't support custom HTTP headers.

**Impact:** Increases XSS attack surface.

**Remediation:** Migrate to Firebase Hosting or Cloudflare Pages which support custom headers, then add:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' *.googleapis.com *.razorpay.com; connect-src *.firebase.com *.firebaseio.com *.googleapis.com *.razorpay.com
```

---

### 🟡 SEC-005 — Firebase API Key in Source Code

**Severity:** LOW-MEDIUM  
**Location:** `frontend/src/lib/firebase.ts` — hardcoded config  
**Description:** Firebase client credentials are hardcoded in source code (visible on GitHub).

**Note:** Firebase client keys are **designed to be public** — they identify the project, not grant admin access. Security relies on Firestore rules. However, restricting the API key to specific HTTP referrers in Firebase Console adds defense-in-depth.

**Remediation:**
- In Firebase Console → APIs & Services → Credentials: restrict the API key to `https://rhema5.github.io/trustroute-PDD/*`

---

### 🟡 SEC-006 — Capacitor Android WebView Security

**Severity:** MEDIUM  
**Location:** `mobile-app/`  
**Description:** Capacitor apps wrap web content in a WebView. The production bundle includes all source maps, which expose internal code structure.

**Remediation:**
```json
// vite.config.ts — disable source maps for production:
build: {
  sourcemap: false
}
```

---

## Medium Findings

| ID | Title | Severity |
|----|-------|----------|
| SEC-007 | No rate limiting on Firebase Auth login attempts | Medium |
| SEC-008 | Delivery IDs are predictable sequential-style strings | Low |
| SEC-009 | No CSRF protection (SPA mitigates most cases) | Low |
| SEC-010 | Storage rules not reviewed in audit scope | Medium |
| SEC-011 | Analytics measurementId exposed (acceptable) | Info |
| SEC-012 | Missing `X-Frame-Options` header | Low |
| SEC-013 | No audit logging for owner actions | Medium |
| SEC-014 | Agent role can read all deliveries via enterpriseId query | Low |
| SEC-015 | Payment status updated client-side, not server-validated | High |

---

## Positive Findings (Security Strengths)

- ✅ Firebase Auth IndexedDB persistence (not localStorage)
- ✅ Firestore rules prevent role escalation
- ✅ Role-based access control enforced at DB layer
- ✅ HTTPS enforced by both GitHub Pages and Firebase
- ✅ Email/password auth — no OAuth token leakage
- ✅ Zustand state is not persisted to localStorage
- ✅ No eval() or document.write() usage detected
- ✅ React 19 built-in XSS protection (JSX escaping)
- ✅ Razorpay HTTPS-only checkout flow
- ✅ Mobile app uses Capacitor (not Cordova) — modern security model

---

## Firestore Rules Analysis

```
Overall Rules Security: 75/100
```

| Rule | Finding | Risk |
|------|---------|------|
| users — get | ✅ Restricts to own profile or owner | Low |
| users — list | ⚠️ Exposes pending user list | Medium |
| users — create | ✅ Only own UID | Low |
| users — update | ✅ Role escalation prevented | Low |
| users — delete | ✅ Owner-only | Low |
| deliveries — read | ✅ Enterprise/agent scoped | Low |
| deliveries — write | 🔍 Need to verify agent update scope | Medium |
