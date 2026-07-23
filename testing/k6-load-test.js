/**
 * TrustRoute — k6 Load Test
 * Target   : https://rhema5.github.io/trustroute-PDD/
 * Profile  : Fast Baseline Load Test (50 VUs × 60s)
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
    http_req_failed:   ["rate<0.15"],
  },
};

const BASE_URL = __ENV.BASE_URL || "https://rhema5.github.io/trustroute-PDD";

const PAGES = [
  { path: "/",               label: "Landing Page"       },
  { path: "/login",          label: "Login Page"         },
  { path: "/forgot-password",label: "Forgot Password"    },
  { path: "/dashboard",      label: "Dashboard"          },
  { path: "/agent",          label: "Agent Portal"       },
];

export default function () {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const url  = `${BASE_URL}${page.path}`;

  group(`📄 ${page.label}`, function () {
    const res = http.get(url, {
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "k6-load-test/1.0 TrustRoute-QA",
      },
      timeout: "10s",
    });

    const ok = check(res, {
      "status is 200":          (r) => r.status === 200,
      "response time < 5000ms": (r) => r.timings.duration < 5000,
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
