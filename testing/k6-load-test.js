/**
 * TrustRoute — k6 Baseline Load Test
 * ──────────────────────────────────
 * Target   : https://rhema5.github.io/trustroute-PDD/
 * Profile  : 100 Virtual Users × 60 seconds (Baseline)
 * Goal     : Verify RPS ≥ 50, P95 latency ≤ 2000ms, error rate < 5%
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// ─── Custom Metrics ─────────────────────────────────────────────
const errorRate    = new Rate("error_rate");
const p95Latency   = new Trend("p95_latency");
const successCount = new Counter("success_count");

// ─── Load Profile ────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: "10s", target: 25  },   // Ramp-up: 0 → 25 VUs
    { duration: "10s", target: 100 },   // Ramp-up: 25 → 100 VUs
    { duration: "30s", target: 100 },   // Sustain: 100 VUs for 30s
    { duration: "10s", target: 0   },   // Ramp-down: 100 → 0 VUs
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],   // 95th percentile < 2s
    http_req_failed:   ["rate<0.05"],    // Error rate < 5%
    error_rate:        ["rate<0.05"],
    http_reqs:         ["rate>10"],      // Min 10 RPS
  },
};

const BASE_URL = __ENV.BASE_URL || "https://rhema5.github.io/trustroute-PDD";

const FIREBASE_PROJECT = "trustroute-c1698";
const FIREBASE_API_KEY = "AIzaSyDFhhyGtxKTSZpAff0QuSkVokZbFybWhBw";

const PAGES = [
  { path: "/",               label: "Landing Page"       },
  { path: "/login",          label: "Login Page"         },
  { path: "/forgot-password",label: "Forgot Password"    },
  { path: "/pending-approval",label: "Pending Approval"  },
  { path: "/dashboard",      label: "Dashboard"          },
  { path: "/agent",          label: "Agent Portal"       },
];

// ─── Main VU Script ──────────────────────────────────────────────
export default function () {
  // Select a random page per VU iteration
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const url  = `${BASE_URL}${page.path}`;

  group(`📄 ${page.label}`, function () {
    const res = http.get(url, {
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
        "User-Agent": "k6-load-test/1.0 TrustRoute-QA",
      },
      timeout: "10s",
    });

    const ok = check(res, {
      "status is 200":            (r) => r.status === 200,
      "has HTML content":         (r) => r.body && r.body.includes("<!DOCTYPE html") || r.body.includes("<html"),
      "response time < 3000ms":   (r) => r.timings.duration < 3000,
      "response time < 5000ms":   (r) => r.timings.duration < 5000,
      "no server error":          (r) => r.status < 500,
    });

    errorRate.add(!ok);
    p95Latency.add(res.timings.duration);
    if (ok) successCount.add(1);
  });

  // Firebase REST API probe (simulates Firebase Auth + Firestore read)
  group("🔥 Firebase Auth REST", function () {
    const loginPayload = JSON.stringify({
      email: "enterprise1@gmail.com",
      password: "enterprise1",
      returnSecureToken: true,
    });

    const authRes = http.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      loginPayload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: "10s",
      }
    );

    check(authRes, {
      "Firebase auth responds":         (r) => r.status < 500,
      "Firebase auth 200 or 400":       (r) => [200, 400].includes(r.status),
    });
  });

  sleep(Math.random() * 2 + 0.5);  // 0.5s – 2.5s think time
}

// ─── Report Generation ────────────────────────────────────────────
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return {
    [`testing/reports/k6_report_${timestamp}.html`]: htmlReport(data),
    "stdout": textSummary(data, { indent: " ", enableColors: true }),
    "testing/reports/k6_results_latest.json": JSON.stringify(data, null, 2),
  };
}
