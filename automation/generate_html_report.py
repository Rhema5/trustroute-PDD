"""
TrustRoute — HTML Report Generator
Generates a premium dark-themed HTML test report.
"""
import json, os
from datetime import datetime
from pathlib import Path

try:
    from jinja2 import Template
except ImportError:
    os.system("pip install jinja2")
    from jinja2 import Template

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TrustRoute — Automation Test Report</title>
<style>
  :root {
    --bg: #0d1117; --surface: #161b22; --surface2: #21262d;
    --border: #30363d; --accent: #58a6ff; --green: #3fb950;
    --red: #f85149; --yellow: #d29922; --text: #e6edf3;
    --muted: #8b949e;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; }
  .header { background: linear-gradient(135deg, #0d1117, #1a1a2e, #0f3460);
    padding: 40px; text-align: center; border-bottom: 1px solid var(--border); }
  .header h1 { font-size: 2.4rem; font-weight: 700; color: var(--accent); margin-bottom: 8px; }
  .header p { color: var(--muted); font-size: 0.9rem; }
  .kpis { display: flex; gap: 16px; padding: 24px 40px; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 160px; background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 20px; text-align: center; }
  .kpi .val { font-size: 2rem; font-weight: 700; margin-bottom: 4px; }
  .kpi .lbl { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi.green .val { color: var(--green); }
  .kpi.red .val   { color: var(--red); }
  .kpi.blue .val  { color: var(--accent); }
  .kpi.yellow .val { color: var(--yellow); }
  .section { padding: 24px 40px; }
  .section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px;
    padding-bottom: 8px; border-bottom: 1px solid var(--border); color: var(--accent); }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { background: var(--surface2); padding: 12px 16px; text-align: left;
    border-bottom: 1px solid var(--border); color: var(--muted);
    font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:hover td { background: var(--surface2); }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 0.75rem; font-weight: 600; }
  .badge.pass  { background: #1f4a27; color: var(--green); }
  .badge.fail  { background: #4a1f1f; color: var(--red); }
  .badge.skip  { background: #4a3a1f; color: var(--yellow); }
  .priority.critical { color: #ff4d4d; font-weight: 700; }
  .priority.high     { color: var(--red); }
  .priority.medium   { color: var(--yellow); }
  .priority.low      { color: var(--muted); }
  .filter-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .filter-btn { padding: 6px 18px; border: 1px solid var(--border); border-radius: 100px;
    background: var(--surface); color: var(--text); cursor: pointer; font-size: 0.82rem;
    transition: all 0.2s; }
  .filter-btn:hover, .filter-btn.active { background: var(--accent); border-color: var(--accent); color: #000; }
  .progress-bar { height: 8px; background: var(--surface2); border-radius: 100px; overflow: hidden;
    margin-top: 8px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--green), var(--accent));
    border-radius: 100px; transition: width 1s ease; }
  .footer { padding: 24px 40px; text-align: center; color: var(--muted); font-size: 0.8rem;
    border-top: 1px solid var(--border); }
  @media (max-width: 768px) {
    .header h1 { font-size: 1.6rem; }
    .kpis { padding: 16px; }
    .section { padding: 16px; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>🚀 TrustRoute Automation Test Report</h1>
  <p>Selenium WebDriver E2E Suite &nbsp;|&nbsp; {{ exec_date }} &nbsp;|&nbsp; Target: {{ base_url }}</p>
</div>

<div class="kpis">
  <div class="kpi blue">
    <div class="val">{{ total }}</div>
    <div class="lbl">Total Tests</div>
  </div>
  <div class="kpi green">
    <div class="val">{{ passed }}</div>
    <div class="lbl">Passed</div>
    <div class="progress-bar"><div class="progress-fill" style="width:{{ pass_pct }}%"></div></div>
  </div>
  <div class="kpi red">
    <div class="val">{{ failed }}</div>
    <div class="lbl">Failed</div>
  </div>
  <div class="kpi {{ 'green' if pass_pct >= 95 else 'yellow' if pass_pct >= 80 else 'red' }}">
    <div class="val">{{ pass_pct }}%</div>
    <div class="lbl">Pass Rate</div>
  </div>
  <div class="kpi blue">
    <div class="val">{{ avg_time }}s</div>
    <div class="lbl">Avg Time</div>
  </div>
</div>

<div class="section">
  <div class="section-title">📋 Test Results</div>
  <div class="filter-bar">
    <button class="filter-btn active" onclick="filterTable('all',this)">All ({{ total }})</button>
    <button class="filter-btn" onclick="filterTable('PASS',this)">✅ Passed ({{ passed }})</button>
    <button class="filter-btn" onclick="filterTable('FAIL',this)">❌ Failed ({{ failed }})</button>
  </div>
  <table id="results-table">
    <thead>
      <tr>
        <th>Test ID</th><th>Module</th><th>Category</th><th>Priority</th>
        <th>Test Name</th><th>Status</th><th>Time (s)</th><th>Failure Reason</th>
      </tr>
    </thead>
    <tbody>
    {% for r in results %}
      <tr data-status="{{ r.status }}">
        <td style="font-family:monospace;font-size:0.8rem;color:var(--accent)">{{ r.test_id }}</td>
        <td>{{ r.module }}</td>
        <td>{{ r.category }}</td>
        <td><span class="priority {{ r.priority.lower() }}">{{ r.priority }}</span></td>
        <td>{{ r.test_name }}</td>
        <td><span class="badge {{ r.status.lower() }}">{{ r.status }}</span></td>
        <td style="text-align:center">{{ r.execution_time }}</td>
        <td style="color:var(--muted);font-size:0.78rem">{{ r.failure_reason[:60] if r.failure_reason else '—' }}</td>
      </tr>
    {% endfor %}
    </tbody>
  </table>
</div>

<div class="footer">
  Generated by TrustRoute Automation Framework &nbsp;|&nbsp; GitHub Actions CI &nbsp;|&nbsp; {{ exec_date }}
</div>

<script>
function filterTable(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#results-table tbody tr').forEach(row => {
    row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
  });
}
</script>
</body>
</html>
"""


SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent


def load_results():
    json_path = REPO_ROOT / "Test Results" / "JSON" / "execution-results.json"
    if json_path.exists():
        with open(json_path, encoding="utf-8") as f:
            return json.load(f)
    import sys
    sys.path.insert(0, str(SCRIPT_DIR))
    from generate_excel_report import _generate_sample_results
    return _generate_sample_results()


def main():
    print("[INFO] Generating HTML Test Report...")
    data = load_results()
    tpl = Template(HTML_TEMPLATE)
    html = tpl.render(
        exec_date   = data["execution_date"][:19].replace("T", " "),
        base_url    = data["base_url"],
        total       = data["total"],
        passed      = data["passed"],
        failed      = data["failed"],
        pass_pct    = data["pass_percentage"],
        avg_time    = data["avg_execution_time"],
        results     = data["results"],
    )

    out_dir = REPO_ROOT / "Test Results" / "HTML"
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = out_dir / f"TrustRoute_Report_{ts}.html"
    latest_path = out_dir / "TrustRoute_Report_LATEST.html"

    for p in [out_path, latest_path]:
        with open(p, "w", encoding="utf-8") as f:
            f.write(html)

    print(f"[OK] HTML report saved: {out_path}")
    print(f"[OK] Latest copy:       {latest_path}")


if __name__ == "__main__":
    main()
