import os
from datetime import datetime
from pathlib import Path
from selenium.webdriver.remote.webdriver import WebDriver

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def take_screenshot(driver: WebDriver, test_id: str, label: str = "") -> str:
    """Capture screenshot and return file path."""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_label = label.replace(" ", "_").replace("/", "-")[:40]
    filename = f"{test_id}_{safe_label}_{ts}.png"
    filepath = SCREENSHOT_DIR / filename
    try:
        driver.save_screenshot(str(filepath))
        return str(filepath)
    except Exception as e:
        print(f"[SCREENSHOT ERROR] {e}")
        return ""
