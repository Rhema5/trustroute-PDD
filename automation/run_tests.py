"""
TrustRoute — Master Test Runner
Executes all 400+ Selenium test cases and collects results.
"""
import sys, os, json, time, importlib
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config.config import BASE_URL
from utils.driver_factory import create_driver
from utils.logger import get_logger
from utils.screenshot import take_screenshot

logger = get_logger("TrustRoute.Runner")

# ─── Import all test modules ─────────────────────────────────────
from tests.test_landing       import get_tests as landing_tests
from tests.test_login         import get_tests as login_tests
from tests.test_navigation    import get_tests as nav_tests
from tests.test_ui_validation import get_tests as ui_tests
from tests.test_auth          import get_tests as auth_tests
from tests.test_dashboard     import get_tests as dashboard_tests
from tests.test_agent         import get_tests as agent_tests
from tests.test_payment       import get_tests as payment_tests
from tests.test_forms         import get_tests as form_tests
from tests.test_performance   import get_tests as perf_tests


def run_test(driver, test: dict) -> dict:
    """Execute a single test and return result."""
    result = {
        "test_id":        test["test_id"],
        "module":         test["module"],
        "test_name":      test["test_name"],
        "priority":       test.get("priority", "Medium"),
        "category":       test.get("category", "General"),
        "status":         "PASS",
        "execution_time": 0.0,
        "failure_reason": "",
        "screenshot":     "",
    }
    start = time.time()
    try:
        test["test_fn"](driver)
        result["status"] = "PASS"
        logger.info(f"✅ PASS | {test['test_id']} — {test['test_name']}")
    except Exception as e:
        result["status"] = "FAIL"
        result["failure_reason"] = str(e)[:200]
        result["screenshot"] = take_screenshot(driver, test["test_id"], test["test_name"])
        logger.error(f"❌ FAIL | {test['test_id']} — {test['test_name']} | {str(e)[:100]}")
    finally:
        result["execution_time"] = round(time.time() - start, 2)
    return result


def main():
    logger.info(f"🚀 TrustRoute E2E Test Suite — BASE_URL: {BASE_URL}")

    all_tests = (
        landing_tests()   +
        login_tests()     +
        nav_tests()       +
        ui_tests()        +
        auth_tests()      +
        dashboard_tests() +
        agent_tests()     +
        payment_tests()   +
        form_tests()      +
        perf_tests()
    )

    logger.info(f"📋 Total test cases loaded: {len(all_tests)}")

    results = []
    driver = create_driver()
    try:
        for i, test in enumerate(all_tests, 1):
            logger.info(f"[{i}/{len(all_tests)}] Running: {test['test_id']}")
            result = run_test(driver, test)
            results.append(result)
    finally:
        driver.quit()

    # ─── Summary ──────────────────────────────────────────────
    passed  = sum(1 for r in results if r["status"] == "PASS")
    failed  = sum(1 for r in results if r["status"] == "FAIL")
    skipped = sum(1 for r in results if r["status"] == "SKIP")
    total   = len(results)
    avg_time = round(sum(r["execution_time"] for r in results) / total, 2) if total else 0
    pass_pct = round((passed / total) * 100, 1) if total else 0

    summary = {
        "execution_date":     datetime.now().isoformat(),
        "base_url":           BASE_URL,
        "total":              total,
        "passed":             passed,
        "failed":             failed,
        "skipped":            skipped,
        "pass_percentage":    pass_pct,
        "avg_execution_time": avg_time,
        "results":            results,
    }

    # ─── Save JSON ─────────────────────────────────────────────
    json_path = Path("Test Results/JSON/execution-results.json")
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    logger.info(f"💾 JSON results saved: {json_path}")

    logger.info("=" * 60)
    logger.info(f"📊 RESULTS: {passed}/{total} PASSED ({pass_pct}%)")
    logger.info(f"⏱️  Average: {avg_time}s | Avg/RPS ≈ {round(1/avg_time,1) if avg_time else 0} tests/sec")
    logger.info("=" * 60)

    # Exit with code 1 if >5% critical tests fail
    if pass_pct < 95:
        logger.warning(f"⚠️  Pass rate {pass_pct}% is below 95% threshold!")
        sys.exit(1)

if __name__ == "__main__":
    main()
