import os
from dotenv import load_dotenv

load_dotenv()

# ─── Deployment URL ────────────────────────────────────────────
BASE_URL = os.getenv("BASE_URL", "https://rhema5.github.io/trustroute-PDD/")

# ─── Test Credentials ──────────────────────────────────────────
AGENT_EMAIL    = os.getenv("AGENT_EMAIL",      "agent2@gmail.com")
AGENT_PASS     = os.getenv("AGENT_PASS",        "agent2")
ENTERPRISE_EMAIL = os.getenv("ENTERPRISE_EMAIL","enterprise1@gmail.com")
ENTERPRISE_PASS  = os.getenv("ENTERPRISE_PASS", "enterprise1")
CUSTOMER_EMAIL = os.getenv("CUSTOMER_EMAIL",   "customer1@gmail.com")
CUSTOMER_PASS  = os.getenv("CUSTOMER_PASS",     "customer1")

# ─── Browser Config ─────────────────────────────────────────────
HEADLESS        = os.getenv("HEADLESS", "true").lower() == "true"
IMPLICIT_WAIT   = int(os.getenv("IMPLICIT_WAIT", "10"))
EXPLICIT_WAIT   = int(os.getenv("EXPLICIT_WAIT", "20"))
PAGE_LOAD_WAIT  = int(os.getenv("PAGE_LOAD_WAIT", "30"))

# ─── Paths ──────────────────────────────────────────────────────
import pathlib
ROOT = pathlib.Path(__file__).parent.parent
SCREENSHOT_DIR  = ROOT / "automation" / "screenshots"
LOG_DIR         = ROOT / "automation" / "logs"
REPORT_DIR      = ROOT / "Test Results"

SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)
(REPORT_DIR / "Excel").mkdir(parents=True, exist_ok=True)
(REPORT_DIR / "HTML").mkdir(parents=True, exist_ok=True)
(REPORT_DIR / "JSON").mkdir(parents=True, exist_ok=True)
(REPORT_DIR / "Summary").mkdir(parents=True, exist_ok=True)
(REPORT_DIR / "Screenshots").mkdir(parents=True, exist_ok=True)
