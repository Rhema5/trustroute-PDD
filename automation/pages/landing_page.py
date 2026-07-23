"""Page Object Model for the Landing Page (/)."""
from selenium.webdriver.common.by import By
from .base_page import BasePage


class LandingPage(BasePage):
    # Locators
    NAV_SIGN_IN_BTN  = (By.XPATH, "//a[contains(text(),'Sign in')]")
    LAUNCH_BTN       = (By.XPATH, "//button[contains(text(),'Launch console')]")
    PLATFORM_LINK    = (By.XPATH, "//a[@href='#features']")
    HERO_H1          = (By.TAG_NAME, "h1")
    LOGO             = (By.XPATH, "//header//img | //header//*[contains(@class,'logo') or contains(@class,'Logo')]")
    FEATURE_CARDS    = (By.XPATH, "//section[@id='features']//*[contains(@class,'rounded')]")

    # Role modal locators
    MODAL_BACKDROP   = (By.XPATH, "//div[contains(@class,'fixed') and contains(@class,'inset-0')]")
    ENTERPRISE_BTN   = (By.XPATH, "//button[.//div[contains(text(),'Enterprise Mode')]]")
    AGENT_BTN        = (By.XPATH, "//button[.//div[contains(text(),'Agent Mode')]]")
    CANCEL_BTN       = (By.XPATH, "//button[contains(text(),'Cancel')]")

    def load(self):
        self.navigate_to("/")
        return self

    def page_title_contains(self, text: str) -> bool:
        return text.lower() in self.get_title().lower()

    def hero_text_visible(self) -> bool:
        try:
            h1 = self.find(*self.HERO_H1)
            return h1 is not None and len(h1.text) > 0
        except Exception:
            return False

    def click_sign_in(self):
        self.find_clickable(*self.NAV_SIGN_IN_BTN).click()

    def click_launch_console(self):
        self.find_clickable(*self.LAUNCH_BTN).click()

    def role_modal_visible(self) -> bool:
        return self.is_element_present(*self.MODAL_BACKDROP)

    def select_enterprise_role(self):
        self.find_clickable(*self.ENTERPRISE_BTN).click()

    def select_agent_role(self):
        self.find_clickable(*self.AGENT_BTN).click()

    def close_modal(self):
        self.find_clickable(*self.CANCEL_BTN).click()

    def platform_link_visible(self) -> bool:
        return self.is_element_present(*self.PLATFORM_LINK)
