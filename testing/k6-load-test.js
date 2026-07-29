/**
 * TrustRoute — k6 Load Test
 * Target   : https://rhema5.github.io/trustroute-PDD/
 * Profile  : Baseline Load Test (50 VUs × 60s)
 *
 * NOTE: TrustRoute is a Single-Page Application (SPA) hosted on GitHub Pages.
 * Only the root URL (/) and the 404.html fallback return HTTP 200.
 * Sub-routes (/login, /dashboard, etc.) are handled client-side by the router
 * and return 404 from GitHub Pages — so we only load-test valid endpoints.
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate    = new Rate("error_rate");
const p95Latency   = new Trend("p95_latency");
const successCount = new Counter("success_count");

export const options = {
  stages: [
    { duration: "10s", target: 20 },
    { duration: "20s", target: 50 },
    { duration: "20s", target: 50 },
    { duration: "10s", target: 0  },
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed:   ["rate<0.05"],   // ≤ 5% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || "https://rhema5.github.io/trustroute-PDD";

// Only test URLs that GitHub Pages actually serves with HTTP 200.
// TrustRoute is a SPA — all routing is client-side (React Router).
// GitHub Pages returns 404 for any path that isn't a real file,
// but serves index.html / 404.html for the root and fallback.
const PAGES = [
  { path: "/trustroute-PDD/",          label: "Landing Page (root)"   },
  { path: "/trustroute-PDD/index.html",label: "Landing Page (explicit)"},
  { path: "/trustroute-PDD/404.html",  label: "SPA Fallback Page"     },
];

export default function () {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const url  = `${BASE_URL.replace(/\/trustroute-PDD\/?$/, "")}${page.path}`;

  group(`📄 ${page.label}`, function () {
    const res = http.get(url, {
      headers: {
        "Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "k6-load-test/1.0 TrustRoute-QA",
      },
      timeout: "10s",
    });

    // GitHub Pages returns 200 for root and 404.html (even the fallback page
    // is served as HTTP 200 when explicitly requested as a file).
    const ok = check(res, {
      "status is 200":          (r) => r.status === 200,
      "response time < 5000ms": (r) => r.timings.duration < 5000,
      "has html content":       (r) => r.body && r.body.includes("TrustRoute"),
    });

    errorRate.add(!ok);
    p95Latency.add(res.timings.duration);
    if (ok) successCount.add(1);
  });

  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  return {
    "testing/reports/k6-summary.json": JSON.stringify(data, null, 2),
  };
}
