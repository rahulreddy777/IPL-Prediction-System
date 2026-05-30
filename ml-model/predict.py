"""
predict.py  –  match & tournament prediction wrapper.

Examples:
  python predict.py tournament
  python predict.py match CSK MI "MA Chidambaram Stadium"
  python predict.py match RCB KKR "Eden Gardens" MI   # with toss winner
"""

import json
import os
import sys
from typing import Any, Dict, Optional


def _add_backend_ml_to_path() -> None:
    here       = os.path.dirname(os.path.abspath(__file__))
    backend_ml = os.path.abspath(os.path.join(here, "..", "backend", "ml"))
    if backend_ml not in sys.path:
        sys.path.insert(0, backend_ml)


def _predict_match(team1: str, team2: str, venue: Optional[str], toss_winner: Optional[str]) -> Dict[str, Any]:
    _add_backend_ml_to_path()
    import pandas as pd
    from predict_match import build_features, load_model, normalize_to_100  # type: ignore

    model = load_model()
    X     = build_features(team1, team2, venue, toss_winner)
    p1    = float(model.predict_proba(pd.DataFrame([X]))[0][1])
    t1pct, t2pct = normalize_to_100(p1)
    return {
        "team1":      team1,
        "team2":      team2,
        "prediction": team1 if t1pct >= t2pct else team2,
        "win_probability": {team1: f"{t1pct:.2f}", team2: f"{t2pct:.2f}"},
        "factors": {
            "h2h_win_rate_team1": round(float(X["h2h_p1"]) * 100, 1),
            "h2h_matches":        int(X["h2h_sample"]),
            "team1_recent_form":  round(float(X["t1_recent_form"]) * 100, 1),
            "team2_recent_form":  round(float(X["t2_recent_form"]) * 100, 1),
            "team1_win_streak":   int(X["t1_win_streak"]),
            "team2_win_streak":   int(X["t2_win_streak"]),
            "pitch_type": {0: "pace", 1: "spin", 2: "balanced", 3: "batting"}.get(int(X["venue_pitch_enc"]), "?"),
        },
        "debug": {"team1Code": X["team1"], "team2Code": X["team2"], "venue": X["venue"]},
    }


def _predict_tournament() -> Dict[str, Any]:
    _add_backend_ml_to_path()
    from predict_2026 import load_model, predict_tournament_2026  # type: ignore

    model = load_model()
    return predict_tournament_2026(model)


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: predict.py (tournament | match TEAM1 TEAM2 [VENUE] [TOSS_WINNER])")

    mode = sys.argv[1].strip().lower()

    if mode in ("tournament", "tournament2026", "winner"):
        print(json.dumps(_predict_tournament(), indent=2))
        return

    if mode in ("match", "game"):
        if len(sys.argv) < 4:
            raise SystemExit("Usage: predict.py match TEAM1 TEAM2 [VENUE] [TOSS_WINNER]")
        team1       = sys.argv[2]
        team2       = sys.argv[3]
        venue       = sys.argv[4] if len(sys.argv) >= 5 else None
        toss_winner = sys.argv[5] if len(sys.argv) >= 6 else None
        print(json.dumps(_predict_match(team1, team2, venue, toss_winner), indent=2))
        return

    raise SystemExit(f"Unknown mode: {mode}")


if __name__ == "__main__":
    main()
