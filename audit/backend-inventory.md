# TrustRoute — Backend & Infrastructure Inventory

**Prepared by:** Automated Security Audit Toolchain  
**Date:** July 2026  
**Classification:** Internal — Confidential  
**Project:** TrustRoute Logistics Platform

---

## 1. Executive Summary

TrustRoute is a **Firebase-first SPA** with no traditional server-side backend. All business logic, data storage, and authentication are delegated to Google Firebase services. The Android mobile app is a **Capacitor wrapper** around the web bundle.

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend Framework | React 19 + TanStack Router | 19.0.0 |
| Build Tool | Vite + TanStack Start | Latest |
| Database | Firebase Firestore | v9 SDK |
| Authentication | Firebase Auth | v9 SDK |
| File Storage | Firebase Storage | v9 SDK |
| Mobile | Capacitor Android | 7.x |
| Payment | Razorpay | JS SDK v1 |
| Hosting | GitHub Pages (Static SPA) | — |
| State Management | Zustand | Latest |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────┐
│           GitHub Pages (CDN)                │
│  https://rhema5.github.io/trustroute-PDD/  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  React 19 SPA (Vite bundle)         │   │
│  │  TanStack Router + Zustand          │   │
│  └──────────────┬──────────────────────┘   │
└─────────────────┼───────────────────────────┘
                  │ HTTPS
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
Firebase      Firebase       Razorpay
Firestore     Auth           Payment
(Realtime     (Email/Pass    (Test Keys)
 NoSQL DB)    Google OAuth)
    │
    ▼
Firebase
Storage
(Delivery
 Photos)
    │
Android Capacitor App
(wraps dist/client/)
```

---

## 3. Firebase Project Details

- **Project ID:** `trustroute-c1698`
- **Database URL:** `https://trustroute-c1698-default-rtdb.firebaseio.com`
- **Auth Domain:** `trustroute-c1698.firebaseapp.com`
- **Storage Bucket:** `trustroute-c1698.firebasestorage.app`
- **API Key (public):** `AIzaSyDFhhyGtxKTSZpAff0QuSkVokZbFybWhBw`
- **App ID:** `1:612268243801:web:28625485ccbd97d26dea48`
- **Measurement ID:** `G-H1M6T96VQB`

> ⚠️ Firebase API keys for client-side use are **intentionally public** — they identify the project, not grant admin access. Security is enforced via Firestore Rules + Auth.

---

## 4. Firestore Collections

| Collection | Purpose | Access |
|-----------|---------|--------|
| `users` | User profiles, roles (owner/agent/pending) | Auth-gated |
| `deliveries` | Delivery records with status tracking | Role-based |
| `notifications` | Real-time alerts | Auth-gated |
| `enterprises` | Enterprise metadata | Owner-only |

---

## 5. User Roles

| Role | Description |
|------|-------------|
| `owner` | Enterprise admin — full CRUD on deliveries, manage agents |
| `agent` | Delivery agent — can view/update assigned deliveries |
| `pending` | Newly registered user awaiting owner approval |

---

## 6. Authentication Methods

- **Email/Password:** Primary method via Firebase Auth
- **Session Persistence:** IndexedDB (explicit, not localStorage)
- **Mobile:** `@capacitor-firebase/authentication` with same Firebase backend

---

## 7. Payment Processing

- **Provider:** Razorpay (Indian payment gateway)
- **Mode:** Client-side checkout via Razorpay JS SDK
- **Currency:** INR (₹)
- **Test Key ID:** `rzp_test_TGsFUD44ioTAmN`
- **Payment Flow:** Firestore triggers payment status updates → UI reacts

---

## 8. Environment Variables

| Variable | Location | Notes |
|----------|----------|-------|
| `VITE_RAZORPAY_KEY_ID` | `.env` / GitHub Secrets | Public test key |
| `VITE_RAZORPAY_KEY_SECRET` | `.env` | **Should be server-side only** |
| `VITE_BASE_URL` | CI/CD environment | `/trustroute-PDD/` for Pages |

---

## 9. Dependencies Summary

- **Frontend:** 45+ npm packages (see `frontend/package.json`)
- **Key dependencies:** Firebase 10.x, React 19, TanStack Router, Zustand, Razorpay SDK
- **Mobile:** Capacitor 7 + Capacitor Firebase plugins

---

## 10. Infrastructure Security Posture

| Area | Status | Notes |
|------|--------|-------|
| HTTPS everywhere | ✅ | Firebase + GitHub Pages enforce HTTPS |
| Firestore Rules | ⚠️ | See security-review.md |
| Firebase App Check | ⚠️ | Commented out in firebase.ts |
| CSP Headers | ❌ | GitHub Pages doesn't support custom headers |
| Secret management | ⚠️ | Razorpay key_secret in .env |
| Mobile binary security | ⚠️ | Capacitor app contains web bundle |
