/**
 * TrustRoute — k6 Load Test
 * Target   : https://rhema5.github.io/trustroute-PDD/
 * Profile  : Baseline Load Test (100 VUs × 60s)
 *
 * Test Specifications:
 * - 100 Virtual Users (VUs)
 * - 1 Minute Continuous Run (60s)
 * - Thousands of HTTP requests handled (RPS target ~120 req/s)
 * - Response Time Benchmarks: Min (50ms), Avg (250ms), Max (1500ms)
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate    = new Rate("error_rate");
const p95Latency   = new Trend("p95_latency");
const successCount = new Counter("success_count");

export const options = {
  stages: [
    { duration: "10s", target: 50 },   // Ramp-up to 50 VUs
    { duration: "40s", target: 100 },  // Sustained peak load at 100 VUs
    { duration: "10s", target: 0 },    // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed:   ["rate<0.05"],   // ≤ 5% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || "https://rhema5.github.io/trustroute-PDD";

const PAGES = [
  { path: "/trustroute-PDD/",          label: "Landing Page (root)"   },
  { path: "/trustroute-PDD/index.html",label: "Landing Page (explicit)"},
];

export default function () {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const url  = `${BASE_URL.replace(/\/trustroute-PDD\/?$/, "")}${page.path}`;

  group(`📄 ${page.label}`, function () {
    const res = http.get(url, {
      headers: {
        "Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "k6-load-test/1.0 TrustRoute-QA (100 VUs)",
      },
      timeout: "10s",
    });

    const ok = check(res, {
      "status is 200/301":      (r) => r.status === 200 || r.status === 301 || r.status === 304,
      "response time < 5000ms": (r) => r.timings.duration < 5000,
    });

    errorRate.add(!ok);
    p95Latency.add(res.timings.duration);
    if (ok) successCount.add(1);
  });

  sleep(Math.random() * 0.8 + 0.2);
}

export function handleSummary(data) {
  return {
    "testing/reports/k6-summary.json": JSON.stringify(data, null, 2),
  };
}
