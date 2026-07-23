"""Base Page Object — all pages inherit from this."""
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.config import EXPLICIT_WAIT, BASE_URL


class BasePage:
    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.wait = WebDriverWait(driver, EXPLICIT_WAIT)

    def navigate_to(self, path: str = ""):
        url = BASE_URL.rstrip("/") + ("/" + path.lstrip("/") if path else "")
        self.driver.get(url)

    def find(self, by: By, value: str):
        return self.wait.until(EC.presence_of_element_located((by, value)))

    def find_clickable(self, by: By, value: str):
        return self.wait.until(EC.element_to_be_clickable((by, value)))

    def get_title(self) -> str:
        return self.driver.title

    def get_url(self) -> str:
        return self.driver.current_url

    def is_element_present(self, by: By, value: str) -> bool:
        try:
            self.driver.find_element(by, value)
            return True
        except Exception:
            return False

    def get_text(self, by: By, value: str) -> str:
        try:
            return self.find(by, value).text
        except Exception:
            return ""

    def refresh(self):
        self.driver.refresh()
