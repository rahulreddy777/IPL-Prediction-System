"""
predict_match.py  –  upgraded single-match prediction with richer features.
"""

import json
import os
import sys
from typing import Any, Dict, Optional

import joblib
import pandas as pd

from match_features import (
    TeamStrength,
    form_factor_last5,
    get_squad_strength,
    get_squad_strength_raw,
    get_venue_features,
    get_home_team_for_venue,
    h2h_features,
    load_championship_counts,
    load_consolidated_matches,
    load_h2h,
    load_player_stats_2026_strength,
    normalize_team,
    normalize_venue,
)
from team_aggregates import load_team_aggregates


ROOT      = os.path.dirname(os.path.dirname(__file__))
MODEL_DIR = os.path.join(ROOT, "ml", "artifacts")


def load_model():
    p = os.path.join(MODEL_DIR, "ipl_match_model.joblib")
    if not os.path.exists(p):
        raise SystemExit("Model not found — retrain first: POST /api/predictions/retrain-ml")
    return joblib.load(p)


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def normalize_to_100(p1: float):
    a  = clamp01(p1)
    b  = 1.0 - a
    t1 = round(a * 100.0, 2)
    t2 = round(b * 100.0, 2)
    drift = round(100.0 - (t1 + t2), 2)
    if abs(drift) > 0.0001:
        t1 = round(t1 + drift, 2)
    return t1, t2


def build_features(team1: str, team2: str, venue: Optional[str], toss_winner: Optional[str] = None) -> Dict[str, Any]:
    t1 = normalize_team(team1)
    t2 = normalize_team(team2)
    v  = normalize_venue(venue) if venue else ""

    df       = load_consolidated_matches()
    teams_df = df[(df["team1"].isin([t1, t2])) | (df["team2"].isin([t1, t2]))]

    def overall_win_rate(team: str) -> float:
        tm = teams_df[(teams_df["team1"] == team) | (teams_df["team2"] == team)]
        return float((tm["winner"] == team).mean()) if not tm.empty else 0.5

    def recent_form(team: str) -> float:
        tm = teams_df[(teams_df["team1"] == team) | (teams_df["team2"] == team)]
        return float((tm.tail(20)["winner"] == team).mean()) if not tm.empty else 0.5

    def venue_rate(team: str) -> float:
        if not v:
            return 0.5
        tm = df[((df["team1"] == team) | (df["team2"] == team)) & (df["venue"].astype(str) == v)]
        return float((tm["winner"] == team).mean()) if not tm.empty else 0.5

    def win_streak(team: str) -> float:
        """Consecutive wins (+) or losses (-) from most recent form."""
        tm = teams_df[(teams_df["team1"] == team) | (teams_df["team2"] == team)]
        if tm.empty:
            return 0.0
        recent = tm.tail(10)
        streak = 0
        for _, row in recent.iloc[::-1].iterrows():
            if row["winner"] == team:
                if streak >= 0:
                    streak += 1
                else:
                    break
            else:
                if streak <= 0:
                    streak -= 1
                else:
                    break
        return float(streak)

    h2h    = load_h2h()
    h2h_p1, h2h_n = h2h_features(h2h, t1, t2)

    champs = load_championship_counts()
    c1, c2 = float(champs.get(t1, 0)), float(champs.get(t2, 0))

    strength = load_player_stats_2026_strength()
    s1: TeamStrength = strength.get(t1, TeamStrength())
    s2: TeamStrength = strength.get(t2, TeamStrength())

    vf = get_venue_features(v)
    v1 = venue_rate(t1);  v2 = venue_rate(t2)

    teams = ["PBKS", "RR", "RCB", "SRH", "KKR", "LSG", "MI", "DC", "GT", "CSK"]
    aggs  = load_team_aggregates(teams)

    def _squad(ta: Dict[str, float]) -> Dict[str, float]:
        return {
            "bat_impact_mean":        float(ta.get("t_bat_rpg_mean", 0.0) * (ta.get("t_bat_sr_mean", 0.0) / 100.0)),
            "bat_consistency_mean":   float(ta.get("t_bat_rpg_mean", 0.0)),
            "bat_sr_mean":            float(ta.get("t_bat_sr_mean", 0.0)),
            "bowl_xeco_mean":         float(ta.get("t_bowl_econ_mean", 0.0)),
            "bowl_xw_mean":           float(ta.get("t_bowl_wpm_mean", 0.0)),
            "bowl_consistency_mean":  float(ta.get("t_bowl_wpm_mean", 0.0)),
            "role_batters_pct":       float(ta.get("role_batters_pct", 0.0)),
            "role_bowlers_pct":       float(ta.get("role_bowlers_pct", 0.0)),
            "role_all_rounders_pct":  float(ta.get("role_all_rounders_pct", 0.0)),
            "role_wicketkeepers_pct": float(ta.get("role_wicketkeepers_pct", 0.0)),
            "squad_size":             float(ta.get("squad_size", 0.0)),
        }

    f1 = _squad(aggs.get(t1, {}));  f2 = _squad(aggs.get(t2, {}))

    tw = normalize_team(toss_winner) if toss_winner else ""
    toss_adv = 1.0 if tw == t1 else (-1.0 if tw == t2 else 0.0)

    future_idx = len(df)
    ss1 = get_squad_strength(t1)
    ss2 = get_squad_strength(t2)
    ff1 = form_factor_last5(t1, future_idx, df)
    ff2 = form_factor_last5(t2, future_idx, df)

    return {
        "season": 2026,
        "team1":  t1,
        "team2":  t2,
        "venue":  v if v else "Unknown",
        "t1_all_time_win_rate":  overall_win_rate(t1),
        "t2_all_time_win_rate":  overall_win_rate(t2),
        "t1_recent_form":        recent_form(t1),
        "t2_recent_form":        recent_form(t2),
        "t1_win_streak":         win_streak(t1),
        "t2_win_streak":         win_streak(t2),
        "t1_bat_impact_mean":         f1["bat_impact_mean"],
        "t2_bat_impact_mean":         f2["bat_impact_mean"],
        "t1_bat_consistency_mean":    f1["bat_consistency_mean"],
        "t2_bat_consistency_mean":    f2["bat_consistency_mean"],
        "t1_bat_sr_mean":             f1["bat_sr_mean"],
        "t2_bat_sr_mean":             f2["bat_sr_mean"],
        "t1_bowl_xeco_mean":          f1["bowl_xeco_mean"],
        "t2_bowl_xeco_mean":          f2["bowl_xeco_mean"],
        "t1_bowl_xw_mean":            f1["bowl_xw_mean"],
        "t2_bowl_xw_mean":            f2["bowl_xw_mean"],
        "t1_bowl_consistency_mean":   f1["bowl_consistency_mean"],
        "t2_bowl_consistency_mean":   f2["bowl_consistency_mean"],
        "t1_role_batters_pct":        f1["role_batters_pct"],
        "t2_role_batters_pct":        f2["role_batters_pct"],
        "t1_role_bowlers_pct":        f1["role_bowlers_pct"],
        "t2_role_bowlers_pct":        f2["role_bowlers_pct"],
        "t1_role_all_rounders_pct":   f1["role_all_rounders_pct"],
        "t2_role_all_rounders_pct":   f2["role_all_rounders_pct"],
        "t1_role_wicketkeepers_pct":  f1["role_wicketkeepers_pct"],
        "t2_role_wicketkeepers_pct":  f2["role_wicketkeepers_pct"],
        "t1_squad_size":              f1["squad_size"],
        "t2_squad_size":              f2["squad_size"],
        "t1_venue_win_rate":    v1,
        "t2_venue_win_rate":    v2,
        "venue_advantage":      v1 - v2,
        "venue_capacity":       vf["venue_capacity"],
        "venue_pitch_enc":      vf["venue_pitch_enc"],
        "venue_is_spin":        vf["venue_is_spin"],
        "venue_is_batting":     vf["venue_is_batting"],
        "h2h_p1":             float(h2h_p1),
        "h2h_sample":         float(h2h_n),
        "t1_championships":   c1,
        "t2_championships":   c2,
        "championship_adv":   c1 - c2,
        "t1_2026_bat_rpg":        float(s1.bat_rpg),
        "t2_2026_bat_rpg":        float(s2.bat_rpg),
        "t1_2026_bat_sr_avg":     float(s1.bat_sr_avg),
        "t2_2026_bat_sr_avg":     float(s2.bat_sr_avg),
        "t1_2026_bowl_wpm":       float(s1.bowl_wpm),
        "t2_2026_bowl_wpm":       float(s2.bowl_wpm),
        "t1_2026_bowl_econ_avg":  float(s1.bowl_econ_avg),
        "t2_2026_bowl_econ_avg":  float(s2.bowl_econ_avg),
        "t1_squad_strength":   ss1,
        "t2_squad_strength":   ss2,
        "squad_strength_diff": ss1 - ss2,
        "t1_form_factor5":     ff1,
        "t2_form_factor5":     ff2,
        "form_factor_diff":    ff1 - ff2,
        "toss_advantage":     toss_adv,
    }


def main():
    payload: Dict[str, Any] = {}
    if len(sys.argv) > 1 and sys.argv[1].strip():
        payload = json.loads(sys.argv[1])
    else:
        raw = sys.stdin.read().strip()
        payload = json.loads(raw) if raw else {}

    team1  = payload.get("team1")
    team2  = payload.get("team2")
    venue  = payload.get("venue")
    toss_w = payload.get("toss_winner")

    if not team1 or not team2:
        raise SystemExit("team1 and team2 are required")

    model = load_model()
    X     = build_features(team1, team2, venue, toss_w)
    p1    = float(model.predict_proba(pd.DataFrame([X]))[0][1])
    t1pct, t2pct = normalize_to_100(p1)

    out = {
        "team1":      team1,
        "team2":      team2,
        "team1Code":  X["team1"],
        "team2Code":  X["team2"],
        "venue":      venue or None,
        "prediction": team1 if t1pct >= t2pct else team2,
        "win_probability": {team1: f"{t1pct:.2f}", team2: f"{t2pct:.2f}"},
        "factors": {
            "h2h_win_rate_team1": round(float(X["h2h_p1"]) * 100, 1),
            "h2h_matches":        int(X["h2h_sample"]),
            "team1_recent_form":  round(float(X["t1_recent_form"]) * 100, 1),
            "team2_recent_form":  round(float(X["t2_recent_form"]) * 100, 1),
            "team1_win_streak":   int(X["t1_win_streak"]),
            "team2_win_streak":   int(X["t2_win_streak"]),
            "team1_championships": int(X["t1_championships"]),
            "team2_championships": int(X["t2_championships"]),
            "team1_squad_strength_pts": int(get_squad_strength_raw(str(X["team1"]))),
            "team2_squad_strength_pts": int(get_squad_strength_raw(str(X["team2"]))),
            "team1_form_factor5": round(float(X["t1_form_factor5"]) * 100, 1),
            "team2_form_factor5": round(float(X["t2_form_factor5"]) * 100, 1),
            "pitch_type":         {0: "pace", 1: "spin", 2: "balanced", 3: "batting"}.get(int(X["venue_pitch_enc"]), "unknown"),
        },
        "methodology": "VotingClassifier(RF+GBM+LR) trained on IPL 2008–2025 with H2H/squad/stadium/win-streak features",
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
