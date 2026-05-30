"""
test_api.py  –  comprehensive smoke tests for all prediction API endpoints.

Usage:
  1) Start backend:  npm start  (in backend/)
  2) Run:  python ml-model/test_api.py [http://localhost:5000]
"""

import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000").rstrip("/")

PASS = "✅  PASS"
FAIL = "❌  FAIL"

results = []


def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req  = Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get_json(url: str) -> dict:
    req = Request(url, headers={"Accept": "application/json"}, method="GET")
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_test(label: str, fn):
    try:
        result = fn()
        ok     = result is not None
        status = PASS if ok else FAIL
        print(f"{status}  {label}")
        results.append((label, ok, None))
        return result
    except (HTTPError, URLError, Exception) as e:
        print(f"{FAIL}  {label}  →  {e}")
        results.append((label, False, str(e)))
        return None


# ── Test 1: Tournament 2026 ────────────────────────────────────────────────────
print("\n=== IPL 2026 Prediction API Tests ===\n")

tour = run_test(
    "GET /api/predictions/tournament2026",
    lambda: _get_json(f"{BASE}/api/predictions/tournament2026"),
)
if tour:
    winner = tour.get("predictedWinner")
    runner = tour.get("predictedRunnerUp")
    probs  = tour.get("predictions", [])
    print(f"     🏆 Winner: {winner}  |  Runner-up: {runner}")
    print(f"     Top 3: {[p['team'] for p in probs[:3]]}")

# ── Test 2-7: Match Predictions ────────────────────────────────────────────────
MATCH_TESTS = [
    ("CSK",  "MI",   "MA Chidambaram Stadium"),
    ("RCB",  "KKR",  "Eden Gardens"),
    ("GT",   "RR",   "Narendra Modi Stadium"),
    ("DC",   "SRH",  "Arun Jaitley Stadium"),
    ("PBKS", "LSG",  None),
    ("MI",   "RCB",  "Wankhede Stadium"),
]

for a, b, venue in MATCH_TESTS:
    payload = {"team1": a, "team2": b}
    if venue:
        payload["venue"] = venue
    result = run_test(
        f"POST /api/predictions  [{a} vs {b}]",
        lambda p=payload: _post_json(f"{BASE}/api/predictions", p),
    )
    if result:
        pred = result.get("prediction") or result.get("predictedWinner")
        prob = result.get("win_probability") or {}
        print(f"     → Predicted winner: {pred}  |  Probs: {prob}")

# ── Test 8: Retrain ────────────────────────────────────────────────────────────
run_test(
    "POST /api/predictions/retrain-ml",
    lambda: _post_json(f"{BASE}/api/predictions/retrain-ml", {}),
)

# ── Summary ────────────────────────────────────────────────────────────────────
total   = len(results)
passed  = sum(1 for _, ok, _ in results if ok)
print(f"\n{'='*45}")
print(f"  Results: {passed}/{total} passed")
if passed < total:
    print("\n  Failed tests:")
    for label, ok, err in results:
        if not ok:
            print(f"    • {label}: {err}")
print("=" * 45)
sys.exit(0 if passed == total else 1)
