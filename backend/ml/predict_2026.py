"""
predict_2026.py  –  IPL 2026 tournament winner prediction via round-robin sim.

Uses upgraded features: win-streak, stadium, toss-agnostic (tournament sim).
Methodology: VotingClassifier trained on 2008-2025; expected wins across all
             pairwise matchups give championship probability.
"""

import json
import os
from itertools import combinations
from typing import Any, Dict, List

import joblib
import pandas as pd

from match_features import (
    TeamStrength,
    form_factor_last5,
    get_squad_strength,
    get_squad_strength_raw,
    get_venue_features,
    h2h_features,
    load_championship_counts,
    load_consolidated_matches,
    load_h2h,
    load_player_stats_2026_strength,
)
from team_aggregates import load_team_aggregates


ROOT      = os.path.dirname(os.path.dirname(__file__))
MODEL_DIR = os.path.join(ROOT, "ml", "artifacts")


def load_meta():
    p = os.path.join(MODEL_DIR, "meta.json")
    if not os.path.exists(p):
        return None
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def load_model():
    p = os.path.join(MODEL_DIR, "ipl_match_model.joblib")
    if not os.path.exists(p):
        raise SystemExit("Model not found. Run: python backend/ml/train_ml_model.py")
    return joblib.load(p)


def predict_tournament_2026(model) -> Dict:
    teams = ["PBKS", "RR", "RCB", "SRH", "KKR", "LSG", "MI", "DC", "GT", "CSK"]

    all_matches_df = load_consolidated_matches()
    matches_list = all_matches_df[["season", "team1", "team2", "winner", "venue"]].to_dict("records")

    perf: Dict[str, Dict] = {}
    venue_stats: Dict[tuple, Dict[str, int]] = {}
    streak: Dict[str, int] = {}

    for team in teams:
        tm = [m for m in matches_list if m["team1"] == team or m["team2"] == team]
        if not tm:
            perf[team] = {"recentForm": 50, "allTimeWinRate": 50}
            continue
        all_wr  = sum(1 for m in tm if m["winner"] == team) / max(len(tm), 1)
        recent  = [m for m in tm if 2023 <= int(m["season"]) <= 2025]
        rec_wr  = (sum(1 for m in recent if m["winner"] == team) / max(len(recent), 1)) if recent else 0.5

        # Win streak from last 10 matches
        last10 = tm[-10:]
        s = 0
        for m in reversed(last10):
            if m["winner"] == team:
                s = (s + 1) if s >= 0 else 1
            else:
                if s > 0:
                    break
                s -= 1
        streak[team] = s
        perf[team] = {"recentForm": int(round(rec_wr * 100)), "allTimeWinRate": int(round(all_wr * 100))}

    for m in matches_list:
        v = m.get("venue")
        if not v:
            continue
        for t in (m["team1"], m["team2"]):
            if t not in teams:
                continue
            key = (t, v)
            bkt = venue_stats.setdefault(key, {"played": 0, "won": 0})
            bkt["played"] += 1
            if m["winner"] == t:
                bkt["won"] += 1

    venue_win_rate = {k: v["won"] / max(v["played"], 1) for k, v in venue_stats.items()}

    primary_venue: Dict[str, str] = {}
    for (team, venue), val in venue_stats.items():
        cur = primary_venue.get(team)
        if not cur or val["played"] > venue_stats.get((team, cur), {}).get("played", 0):
            primary_venue[team] = venue

    team_aggs    = load_team_aggregates(teams)
    
    def _strength_from_aggregates(ta: Dict[str, float]) -> Dict[str, float]:
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

    squad_feats  = {t: _strength_from_aggregates(team_aggs.get(t, {})) for t in teams}
    h2h          = load_h2h()
    champs       = load_championship_counts()
    s2026        = load_player_stats_2026_strength()
    
    future_idx = len(all_matches_df)
    squad_str  = {t: get_squad_strength(t) for t in teams}
    form5      = {t: form_factor_last5(t, future_idx, all_matches_df) for t in teams}

    # Pre-calculate team features
    team_features: Dict[str, Dict[str, Any]] = {}
    for t in teams:
        sa: TeamStrength = s2026.get(t, TeamStrength())
        fa = squad_feats.get(t, {})
        primary_v = primary_venue.get(t, "Unknown")
        v_wr = venue_win_rate.get((t, primary_v), 0.5)
        
        team_features[t] = {
            "all_time_win_rate":  perf.get(t, {}).get("allTimeWinRate", 50) / 100.0,
            "recent_form":        perf.get(t, {}).get("recentForm", 50) / 100.0,
            "win_streak":         float(streak.get(t, 0)),
            "bat_impact_mean":    fa.get("bat_impact_mean", 0.0),
            "bat_consistency_mean": fa.get("bat_consistency_mean", 0.0),
            "bat_sr_mean":        fa.get("bat_sr_mean", 0.0),
            "bowl_xeco_mean":     fa.get("bowl_xeco_mean", 0.0),
            "bowl_xw_mean":       fa.get("bowl_xw_mean", 0.0),
            "bowl_consistency_mean": fa.get("bowl_consistency_mean", 0.0),
            "role_batters_pct":   fa.get("role_batters_pct", 0.0),
            "role_bowlers_pct":   fa.get("role_bowlers_pct", 0.0),
            "role_all_rounders_pct": fa.get("role_all_rounders_pct", 0.0),
            "role_wicketkeepers_pct": fa.get("role_wicketkeepers_pct", 0.0),
            "squad_size":         fa.get("squad_size", 0.0),
            "venue_win_rate":     v_wr,
            "championships":      float(champs.get(t, 0)),
            "2026_bat_rpg":       float(sa.bat_rpg),
            "2026_bat_sr_avg":    float(sa.bat_sr_avg),
            "2026_bowl_wpm":      float(sa.bowl_wpm),
            "2026_bowl_econ_avg": float(sa.bowl_econ_avg),
            "squad_strength":     squad_str.get(t, 0.83),
            "form_factor5":       form5.get(t, 0.5),
            "primary_venue":      primary_v
        }

    exp_wins: Dict[str, float] = {t: 0.0 for t in teams}
    pair_probs: List[Dict] = []

    for a, b in combinations(teams, 2):
        h2h_p1, h2h_n = h2h_features(h2h, a, b)
        feat_a = team_features[a]
        feat_b = team_features[b]

        venue = feat_a["primary_venue"]
        vf = get_venue_features(venue)
        v1 = feat_a["venue_win_rate"]
        v2 = venue_win_rate.get((b, venue), 0.5)

        X = {
            "season": 2026,
            "team1":  a,  "team2":  b,
            "venue":  venue,
            "t1_all_time_win_rate":  feat_a["all_time_win_rate"],
            "t2_all_time_win_rate":  feat_b["all_time_win_rate"],
            "t1_recent_form":        feat_a["recent_form"],
            "t2_recent_form":        feat_b["recent_form"],
            "t1_win_streak":         feat_a["win_streak"],
            "t2_win_streak":         feat_b["win_streak"],
            "t1_bat_impact_mean":         feat_a["bat_impact_mean"],
            "t2_bat_impact_mean":         feat_b["bat_impact_mean"],
            "t1_bat_consistency_mean":    feat_a["bat_consistency_mean"],
            "t2_bat_consistency_mean":    feat_b["bat_consistency_mean"],
            "t1_bat_sr_mean":             feat_a["bat_sr_mean"],
            "t2_bat_sr_mean":             feat_b["bat_sr_mean"],
            "t1_bowl_xeco_mean":          feat_a["bowl_xeco_mean"],
            "t2_bowl_xeco_mean":          feat_b["bowl_xeco_mean"],
            "t1_bowl_xw_mean":            feat_a["bowl_xw_mean"],
            "t2_bowl_xw_mean":            feat_b["bowl_xw_mean"],
            "t1_bowl_consistency_mean":   feat_a["bowl_consistency_mean"],
            "t2_bowl_consistency_mean":   feat_b["bowl_consistency_mean"],
            "t1_role_batters_pct":        feat_a["role_batters_pct"],
            "t2_role_batters_pct":        feat_b["role_batters_pct"],
            "t1_role_bowlers_pct":        feat_a["role_bowlers_pct"],
            "t2_role_bowlers_pct":        feat_b["role_bowlers_pct"],
            "t1_role_all_rounders_pct":   feat_a["role_all_rounders_pct"],
            "t2_role_all_rounders_pct":   feat_b["role_all_rounders_pct"],
            "t1_role_wicketkeepers_pct":  feat_a["role_wicketkeepers_pct"],
            "t2_role_wicketkeepers_pct":  feat_b["role_wicketkeepers_pct"],
            "t1_squad_size":              feat_a["squad_size"],
            "t2_squad_size":              feat_b["squad_size"],
            "t1_venue_win_rate":   v1,  
            "t2_venue_win_rate":   v2,
            "venue_advantage":     v1 - v2,
            "venue_capacity":      vf["venue_capacity"],
            "venue_pitch_enc":     vf["venue_pitch_enc"],
            "venue_is_spin":       vf["venue_is_spin"],
            "venue_is_batting":    vf["venue_is_batting"],
            "h2h_p1":             float(h2h_p1),
            "h2h_sample":         float(h2h_n),
            "t1_championships":   feat_a["championships"],
            "t2_championships":   feat_b["championships"],
            "championship_adv":   feat_a["championships"] - feat_b["championships"],
            "t1_2026_bat_rpg":        feat_a["2026_bat_rpg"],
            "t2_2026_bat_rpg":        feat_b["2026_bat_rpg"],
            "t1_2026_bat_sr_avg":     feat_a["2026_bat_sr_avg"],
            "t2_2026_bat_sr_avg":     feat_b["2026_bat_sr_avg"],
            "t1_2026_bowl_wpm":       feat_a["2026_bowl_wpm"],
            "t2_2026_bowl_wpm":       feat_b["2026_bowl_wpm"],
            "t1_2026_bowl_econ_avg":  feat_a["2026_bowl_econ_avg"],
            "t2_2026_bowl_econ_avg":  feat_b["2026_bowl_econ_avg"],
            "t1_squad_strength":   feat_a["squad_strength"],
            "t2_squad_strength":   feat_b["squad_strength"],
            "squad_strength_diff": feat_a["squad_strength"] - feat_b["squad_strength"],
            "t1_form_factor5":     feat_a["form_factor5"],
            "t2_form_factor5":     feat_b["form_factor5"],
            "form_factor_diff":    feat_a["form_factor5"] - feat_b["form_factor5"],
            "toss_advantage": 0.0,
        }

        p_a = float(model.predict_proba(pd.DataFrame([X]))[0][1])
        p_b = 1.0 - p_a
        exp_wins[a] += p_a
        exp_wins[b] += p_b
        pair_probs.append({"team1": a, "team2": b, "p_team1": round(p_a, 4), "p_team2": round(p_b, 4)})

    total  = sum(exp_wins.values()) or 1.0
    ranked = sorted(
        [{"team": t, "expected_wins": exp_wins[t], "probability": (exp_wins[t] / total) * 100.0} for t in teams],
        key=lambda x: x["expected_wins"],
        reverse=True,
    )

    return {
        "predictions": [
            {
                "team":               r["team"],
                "expectedWins":       round(r["expected_wins"], 2),
                "probability":        f'{r["probability"]:.2f}',
                "recentForm":         perf.get(r["team"], {}).get("recentForm", 50),
                "allTimeWinRate":     perf.get(r["team"], {}).get("allTimeWinRate", 50),
                "winStreak":          streak.get(r["team"], 0),
                "championships":      champs.get(str(r["team"]), 0),
                "squadStrengthPts":   int(get_squad_strength_raw(str(r["team"]))),
                "formFactor5":        round(float(team_features[str(r["team"])]["form_factor5"]) * 100, 1),
            }
            for r in ranked
        ],
        "predictedWinner":    ranked[0]["team"],
        "predictedRunnerUp":  ranked[1]["team"],
        "methodology": "VotingClassifier(RF+GBM+LR) — round-robin expected wins across all team pairs; "
                       "features: H2H, form, win-streak, squad strength (2026), stadium pitch/capacity, championships",
        "pairwise":   pair_probs,
        "modelMeta":  load_meta(),
    }


def main():
    model = load_model()
    out   = predict_tournament_2026(model)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
