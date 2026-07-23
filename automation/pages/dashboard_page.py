"""Page Object Models for Dashboard and Agent pages."""
from selenium.webdriver.common.by import By
from .base_page import BasePage


class DashboardPage(BasePage):
    NAV_DASHBOARD    = (By.XPATH, "//a[contains(@href,'dashboard') or contains(text(),'Dashboard')]")
    NAV_DELIVERIES   = (By.XPATH, "//a[contains(@href,'new') or contains(text(),'New Delivery')]")
    NAV_ANALYTICS    = (By.XPATH, "//a[contains(@href,'analytics') or contains(text(),'Analytics')]")
    NAV_AGENTS       = (By.XPATH, "//a[contains(@href,'agents') or contains(text(),'Agents')]")
    NAV_PAYMENTS     = (By.XPATH, "//a[contains(@href,'payments') or contains(text(),'Payments')]")
    NAV_PENDING      = (By.XPATH, "//a[contains(@href,'pending') or contains(text(),'Pending')]")
    NAV_OFFLINE      = (By.XPATH, "//a[contains(@href,'offline') or contains(text(),'Offline')]")
    NAV_SETTINGS     = (By.XPATH, "//a[contains(@href,'settings') or contains(text(),'Settings')]")
    STAT_CARDS       = (By.XPATH, "//*[contains(@class,'card') or contains(@class,'glass')]//div[contains(@class,'text-')]")
    PAGE_HEADING     = (By.TAG_NAME, "h1")
    LOGOUT_BTN       = (By.XPATH, "//button[contains(text(),'Logout') or contains(text(),'Sign out')]")

    def load(self):
        self.navigate_to("/dashboard")
        return self

    def is_loaded(self) -> bool:
        import time; time.sleep(2)
        return "dashboard" in self.get_url()

    def nav_to_analytics(self):
        self.find_clickable(*self.NAV_ANALYTICS).click()

    def nav_to_new_delivery(self):
        self.find_clickable(*self.NAV_DELIVERIES).click()

    def nav_to_agents(self):
        self.find_clickable(*self.NAV_AGENTS).click()

    def nav_to_payments(self):
        self.find_clickable(*self.NAV_PAYMENTS).click()

    def stat_cards_visible(self) -> bool:
        return self.is_element_present(*self.STAT_CARDS)


class AgentPage(BasePage):
    NAV_DELIVERIES   = (By.XPATH, "//a[contains(@href,'deliveries')]")
    NAV_SCAN         = (By.XPATH, "//a[contains(@href,'scan')]")
    NAV_CERTIFICATE  = (By.XPATH, "//a[contains(@href,'certificate')]")
    NAV_SYNC         = (By.XPATH, "//a[contains(@href,'sync')]")
    NAV_PROFILE      = (By.XPATH, "//a[contains(@href,'profile')]")
    GREETING         = (By.XPATH, "//*[contains(text(),'Welcome') or contains(text(),'Agent')]")

    def load(self):
        self.navigate_to("/agent")
        return self

    def is_loaded(self) -> bool:
        import time; time.sleep(2)
        return "agent" in self.get_url()

    def nav_to_deliveries(self):
        self.find_clickable(*self.NAV_DELIVERIES).click()

    def nav_to_scan(self):
        self.find_clickable(*self.NAV_SCAN).click()

    def nav_to_profile(self):
        self.find_clickable(*self.NAV_PROFILE).click()


class PaymentPage(BasePage):
    AMOUNT_DISPLAY   = (By.XPATH, "//*[contains(text(),'₹') or contains(text(),'Total Due')]")
    PAY_BUTTON       = (By.XPATH, "//button[contains(text(),'Razorpay') or contains(text(),'Pay')]")
    INVOICE_HEADER   = (By.XPATH, "//*[contains(text(),'Billing Invoice') or contains(text(),'Invoice')]")

    def load(self, delivery_id: str):
        self.navigate_to(f"/payment/{delivery_id}")
        return self

    def pay_button_visible(self) -> bool:
        return self.is_element_present(*self.PAY_BUTTON)

    def amount_displayed(self) -> bool:
        return self.is_element_present(*self.AMOUNT_DISPLAY)

    def invoice_visible(self) -> bool:
        return self.is_element_present(*self.INVOICE_HEADER)
