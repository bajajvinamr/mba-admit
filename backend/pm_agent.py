import os
import requests
import time
import json
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# Configuration
API_URL = "http://localhost:8000"

LLM = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    temperature=0.3,
    max_tokens=4000,
    google_api_key=os.environ.get("GOOGLE_API_KEY", "")
)

print("\n🚀 Starting Chief of Staff PM Agent...")
print("==================================================")
report_data = {
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "endpoints_tested": [],
    "bugs_found": [],
    "performance_metrics": {}
}

# 1. ── System Testing Phase ────────────────────────────────────────────────
print("\n📡 Phase 1: Aggressive Endpoint Testing")

# Test 1: Fetch Schools
print("  - Testing GET /api/schools...")
start = time.time()
try:
    res = requests.get(f"{API_URL}/api/schools")
    dur = time.time() - start
    if res.status_code == 200 and len(res.json()) > 0:
        report_data["endpoints_tested"].append("GET /api/schools: 🟢 OK")
        report_data["performance_metrics"]["fetch_schools_ms"] = int(dur * 1000)
    else:
        report_data["bugs_found"].append("GET /api/schools returned invalid payload or empty list.")
except Exception as e:
    report_data["bugs_found"].append(f"GET /api/schools FAILED: {str(e)}")

# Test 2: Calculate Odds (Advanced Criteria)
print("  - Testing POST /api/calculate_odds (Advanced Profile)...")
start = time.time()
try:
    payload = {
        "gmat": 740, "gpa": 3.8, "undergrad_tier": "top_10", 
        "industry": "finance", "leadership_roles": "manager",
        "intl_experience": True, "community_service": False
    }
    res = requests.post(f"{API_URL}/api/calculate_odds", json=payload)
    dur = time.time() - start
    if res.status_code == 200 and len(res.json()) > 0:
        report_data["endpoints_tested"].append("POST /api/calculate_odds: 🟢 OK")
        report_data["performance_metrics"]["calculate_odds_ms"] = int(dur * 1000)
    else:
        report_data["bugs_found"].append(f"POST /api/calculate_odds failed: {res.text}")
except Exception as e:
    report_data["bugs_found"].append(f"POST /api/calculate_odds FAILED: {str(e)}")

# Test 3: Start Application Session
print("  - Testing POST /api/start_session...")
start = time.time()
session_id = f"test_{int(time.time())}"
try:
    payload = {
        "session_id": session_id,
        "school_id": "hbs",
        "name": "Test User",
        "gmat": 750,
        "gpa": 3.9,
        "industry_background": "consulting"
    }
    res = requests.post(f"{API_URL}/api/start_session", json=payload)
    dur = time.time() - start
    if res.status_code == 200 and "status_message" in res.json():
        report_data["endpoints_tested"].append("POST /api/start_session: 🟢 OK")
        report_data["performance_metrics"]["start_session_ms"] = int(dur * 1000)
    else:
        report_data["bugs_found"].append(f"POST /api/start_session failed: {res.text}")
except Exception as e:
    report_data["bugs_found"].append(f"POST /api/start_session FAILED: {str(e)}")

# Test 4: Chat Interaction
print("  - Testing POST /api/chat...")
start = time.time()
try:
    payload = {
        "session_id": session_id,
        "message": "Hi, I'm ready to discuss my career goals."
    }
    res = requests.post(f"{API_URL}/api/chat", json=payload)
    dur = time.time() - start
    if res.status_code == 200 and "status_message" in res.json():
        report_data["endpoints_tested"].append("POST /api/chat: 🟢 OK")
        report_data["performance_metrics"]["chat_response_ms"] = int(dur * 1000)
    else:
        report_data["bugs_found"].append(f"POST /api/chat failed: {res.text}")
except Exception as e:
    report_data["bugs_found"].append(f"POST /api/chat FAILED: {str(e)}")

# 2. ── Growth Strategy Generation ──────────────────────────────────────────
print("\n🧠 Phase 2: Generating PM Growth Strategy via Claude 3.5 Sonnet...")

print("\n🧠 Phase 2: Generating PM Growth Strategy (Deterministic Template)...")

# Analyze telemetry for the executive summary
total_tests = len(report_data["endpoints_tested"]) + len(report_data["bugs_found"])
success_rate = (len(report_data["endpoints_tested"]) / total_tests) * 100 if total_tests > 0 else 0
health_status = "🟢 HEALTHY" if success_rate == 100 else "🟡 DEGRADED" if success_rate > 50 else "🔴 CRITICAL"

perf = report_data.get("performance_metrics", {})
avg_latency_ms = sum(perf.values()) / len(perf) if perf else 0

report_content = f"""# Chief of Staff — Product & Growth Strategy Report
*Generated on {report_data["timestamp"]}*

## 1. Executive Summary: Core Systems Health
**System Status:** {health_status} ({success_rate:.0f}% Pass Rate)
**Average Latency:** {avg_latency_ms:.0f}ms

### Telemetry Log
"""
for endpoint in report_data["endpoints_tested"]:
    report_content += f"- {endpoint}\n"
for bug in report_data["bugs_found"]:
    report_content += f"- ❌ {bug}\n"

report_content += """
---

## 2. Product Growth Strategy ($0 to $1M ARR)
To scale within the MBA consulting niche, we must position the product as a low-friction "wedge" that traditional consultants cannot compete against due to their high human-cost structure.

*   **Phase 1: Volume via Free Tooling:** The existing 'Odds Calculator' and 'Readiness Assessment' should be aggressively marketed on GMAT Club and Reddit (`r/MBA`). By not gating these features behind a login, we lower the top-of-funnel friction.
*   **Phase 2: The ₹1,000 Consult Call Core Loop:** The primary conversion lever is the ₹1,000 Consult Call (with a 100% refund guarantee). This builds immense trust and converts users into the higher-margin ₹2,499 per school or ₹6,999 M7 bundles.
*   **Phase 3: Community & Social Proof:** Implement a 'Decision Tracker' where users can anonymously log their admits/dings. Because our backend inherently calculates their odds, we can aggregate this into a massive, live "Admissions Database" which acts as a powerful SEO moat.

## 3. Viral Loops & Organic Acquisition
1.  **"Share Your Odds" Mechanic:** After a user receives their profile assessment (e.g., "Prime MBA Candidate"), add a one-click to share their anonymized diagnostic card on LinkedIn/X.
2.  **Refer-a-Friend Bounty:** Offer current users 1 free school essay review if they refer a friend who books the ₹1,000 consult call.
3.  **Content-Led SEO:** Programmatically generate SEO pages for long-tail queries like *"What are my chances for HBS with a 710 GMAT and Tech background?"* using our existing database of 1,195 schools.

## 4. Horizontal Expansion (Life Beyond MBAs)
Once the platform achieves product-market fit in the MBA space, the architecture is designed to map perfectly to other high-stakes admissions arenas.

1.  **Law Schools (J.D.):** The LSAT and GPA math is incredibly similar to GMAT/GPA. The essay structuring ("Personal Statement") is also highly formulaic.
2.  **Medical Schools (M.D.):** MCAT scoring and the complex primary/secondary application processes are ripe for AI orchestration.
3.  **Undergrad (Ivy League):** The largest Total Addressable Market (TAM). This requires shifting the brand positioning away from "Chief of Staff" to something universally appealing to stressed parents and teenagers.
"""

artifact_path = "/Users/vinamr/.gemini/antigravity/brain/94eb78c7-6980-4285-81ba-b82ed4b87417/PM_Report.md"
    
with open(artifact_path, "w") as f:
    f.write(report_content)

print(f"\n✅ PM Report generated and saved to: {artifact_path}")

print("==================================================")
print("Agent Execution Complete.")
