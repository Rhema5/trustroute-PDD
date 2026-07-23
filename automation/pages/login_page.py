"""Page Object Model for the Login Page (/login)."""
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from .base_page import BasePage


class LoginPage(BasePage):
    # Locators
    EMAIL_INPUT      = (By.XPATH, "//input[@type='email']")
    PASSWORD_INPUT   = (By.XPATH, "//input[@type='password']")
    SIGN_IN_BTN      = (By.XPATH, "//button[contains(text(),'Sign') or contains(text(),'Login') or contains(text(),'Enter')]")
    ENTERPRISE_TAB   = (By.XPATH, "//button[.//div[contains(text(),'Enterprise')]] | //div[@id='owner']")
    AGENT_TAB        = (By.XPATH, "//button[.//div[contains(text(),'Agent')]] | //div[@id='agent']")
    FORGOT_PASS_LINK = (By.XPATH, "//a[contains(text(),'Forgot') or contains(text(),'forgot')]")
    ERROR_MSG        = (By.XPATH, "//*[contains(@class,'error') or contains(@class,'toast') or contains(@role,'alert')]")
    PAGE_HEADER      = (By.TAG_NAME, "h1")

    def load(self):
        self.navigate_to("/login")
        return self

    def select_enterprise_mode(self):
        try:
            self.find_clickable(*self.ENTERPRISE_TAB).click()
        except Exception:
            pass

    def select_agent_mode(self):
        try:
            self.find_clickable(*self.AGENT_TAB).click()
        except Exception:
            pass

    def enter_email(self, email: str):
        field = self.find(*self.EMAIL_INPUT)
        field.clear()
        field.send_keys(email)

    def enter_password(self, password: str):
        field = self.find(*self.PASSWORD_INPUT)
        field.clear()
        field.send_keys(password)

    def click_sign_in(self):
        self.find_clickable(*self.SIGN_IN_BTN).click()

    def login(self, email: str, password: str):
        self.enter_email(email)
        self.enter_password(password)
        self.click_sign_in()

    def error_message_visible(self) -> bool:
        import time; time.sleep(1)
        return self.is_element_present(*self.ERROR_MSG)

    def email_input_visible(self) -> bool:
        return self.is_element_present(*self.EMAIL_INPUT)

    def click_forgot_password(self):
        self.find_clickable(*self.FORGOT_PASS_LINK).click()
