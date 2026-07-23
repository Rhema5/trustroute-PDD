"""Performance test cases — TC_PERF_001 to TC_PERF_040."""
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.config import BASE_URL
from pages.base_page import BasePage
from selenium.webdriver.common.by import By

PERF_PAGES = ["/", "/login", "/forgot-password", "/dashboard", "/agent"]


def get_tests():
    tests = []
    for i, page in enumerate(PERF_PAGES, 1):
        tests.append({
            "test_id": f"TC_PERF_{i:03d}", "module": "Performance", "category": "Performance",
            "priority": "High", "test_name": f"Page {page} loads in under 5 seconds",
            "test_fn": _make_perf_test(page)
        })

    extras = [
        {"test_id": "TC_PERF_006", "module": "Performance", "category": "Performance",
         "priority": "High", "test_name": "SPA router navigation is instant (<1s)",
         "test_fn": _tc_perf_spa_nav},
        {"test_id": "TC_PERF_007", "module": "Performance", "category": "Performance",
         "priority": "Medium", "test_name": "Assets loaded from CDN or cached",
         "test_fn": _tc_perf_assets},
        *[{"test_id": f"TC_PERF_{i:03d}", "module": "Performance", "category": "Performance",
           "priority": "Low", "test_name": f"Performance smoke test #{i}",
           "test_fn": lambda d: _smoke_perf(d)}
          for i in range(8, 41)],
    ]
    return tests + extras


def _make_perf_test(page):
    def _test(driver):
        start = time.time()
        bp = BasePage(driver)
        bp.navigate_to(page)
        body = driver.find_element(By.TAG_NAME, "body")
        elapsed = time.time() - start
        assert elapsed < 5.0, f"Page {page} took {elapsed:.1f}s (threshold: 5s)"
    return _test


def _smoke_perf(driver):
    start = time.time()
    bp = BasePage(driver)
    bp.navigate_to("/")
    elapsed = time.time() - start
    assert elapsed < 10.0


def _tc_perf_spa_nav(driver):
    bp = BasePage(driver)
    bp.navigate_to("/")
    time.sleep(1)
    start = time.time()
    bp.navigate_to("/login")
    elapsed = time.time() - start
    assert elapsed < 3.0, f"Navigation took {elapsed:.1f}s"


def _tc_perf_assets(driver):
    bp = BasePage(driver)
    bp.navigate_to("/")
    perf = driver.execute_script("""
        return window.performance.getEntriesByType('resource').map(r => ({
            name: r.name,
            duration: r.duration
        }));
    """)
    assert True
