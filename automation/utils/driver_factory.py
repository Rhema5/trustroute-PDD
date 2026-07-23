"""
WebDriver factory with headless Chrome configuration.
"""
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.config import HEADLESS, IMPLICIT_WAIT, PAGE_LOAD_WAIT


def create_driver() -> webdriver.Chrome:
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--log-level=3")

    try:
        # Try native Selenium 4 manager first (fastest and most reliable in CI)
        driver = webdriver.Chrome(options=options)
    except Exception:
        # Fallback to webdriver_manager
        try:
            from webdriver_manager.chrome import ChromeDriverManager
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)
        except Exception:
            # Ultimate fallback for Ubuntu GitHub runner chrome binary
            options.binary_location = "/usr/bin/google-chrome"
            driver = webdriver.Chrome(options=options)

    driver.implicitly_wait(IMPLICIT_WAIT)
    driver.set_page_load_timeout(PAGE_LOAD_WAIT)
    return driver
