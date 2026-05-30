"""
predict_all_20.py  –  ML-based predictions for all 20 scheduled IPL 2026 matches.

Pipeline steps
--------------
1. Data collection   – loads ipl_2026_matches_list.json + historical match data
2. Feature selection – H2H, recent form, win-streak, squad strength, venue, toss
3. Pre-processing    – normalize team codes / venue names; toss_advantage = 0 (unknown)
4. Model loading     – reads the pre-trained VotingClassifier from artifacts/
5. Prediction        – model.predict_proba() for each matchup → win probability JSON

Output is a JSON array whose objects share the same shape as the frontend MatchCard
expects (predictedWinner, winProbability, confidence, breakdown, etc.).
"""

import json
import os
import sys

# ── Add backend directory to path so we can import from backend/ml ───────────
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # backend/ml is already HERE

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
    normalize_team,
    normalize_venue,
)
from team_aggregates import load_team_aggregates

ROOT      = os.path.dirname(HERE)   # backend/
DATA_DIR  = os.path.join(ROOT, "data")
MODEL_DIR = os.path.join(HERE, "artifacts")

# ─── Schedule path ────────────────────────────────────────────────────────────
SCHEDULE_PATH = os.path.join(DATA_DIR, "ipl_2026_matches_list.json")

# ─── Venue short-name → full stadium string mapping ──────────────────────────
VENUE_FULL = {
    "Bengaluru":  "M. Chinnaswamy Stadium",
    "Mumbai":     "Wankhede Stadium",
    "Guwahati":   "Barsapara Cricket Stadium",
    "Mullanpur":  "New PCA Stadium, Mullanpur",
    "Lucknow":    "Ekana Cricket Stadium",
    "Kolkata":    "Eden Gardens",
    "Chennai":    "MA Chidambaram Stadium",
    "Delhi":      "Arun Jaitley Stadium",
    "Ahmedabad":  "Narendra Modi Stadium",
    "Hyderabad":  "Rajiv Gandhi International Stadium",
    "Jaipur":     "Sawai Mansingh Stadium",
}


KEY_PLAYERS = {
    "MI":   ["Jasprit Bumrah (4/15 WC Final, World #1 Bowler) + Trent Boult + Deepak Chahar",
             "Rohit Sharma + Suryakumar Yadav + Tilak Varma + Quinton de Kock",
             "Will Jacks (4× MoM awards – T20 World Cup 2026) + Hardik Pandya (all-round)",
             "Mitchell Santner (spin depth) + Sherfane Rutherford"],
    "GT":   ["Sai Sudharsan (2025 Orange Cap – 759 runs, #1 run-scorer)",
             "Shubman Gill (captain) + Jos Buttler (explosive opener)",
             "Rashid Khan (#1 T20I Bowler globally) + Kagiso Rabada (pace spearhead)",
             "Mohammed Siraj + Prasidh Krishna (25 wkts 2025) + Washington Sundar",
             "Rahul Tewatia + Jason Holder (all-round balance)"],
    "DC":   ["KL Rahul (returning to opening role, 125+ IPL games)",
             "Pathum Nissanka (top-order stability) + Nitish Rana",
             "David Miller + Tristan Stubbs (elite finishing power)",
             "Axar Patel (captain) + Kuldeep Yadav (best spin duo in IPL)",
             "Mitchell Starc (pace threat, if fit) + Vipraj Nigam (breakout star)"],
    "KKR":  ["Finn Allen (Fastest WC T20 Century – 33 balls)",
             "Cameron Green (₹25.2cr – most expensive all-rounder ever + pace)",
             "Varun Chakravarthy (joint top wicket-taker T20 WC) + Sunil Narine",
             "Rinku Singh (Vice-Captain, finisher) + Rachin Ravindra",
             "Ramandeep Singh + Anrich Nortje (pace depth)"],
    "SRH":  ["Travis Head (power-play destroyer, SR 180+ in PP)",
             "Abhishek Sharma (#1 T20I Batter + left-arm spin)",
             "Ishan Kishan (captain, explosive top-order bat)",
             "Heinrich Klaasen (batting powerhouse, SR 157)",
             "Harshal Patel (death-over specialist) + T. Natarajan"],
    "RCB":  ["Jacob Bethell (WC Semi Century vs India, 2026 breakout star)",
             "Virat Kohli (267 IPL matches, 8861 runs)",
             "Phil Salt (aggressive opener) + Liam Livingstone",
             "Josh Hazlewood + Bhuvneshwar Kumar (death bowling pair)"],
    "CSK":  ["Sanju Samson (WC Player of Tournament 2026, traded from RR)",
             "Ruturaj Gaikwad + Dewald Brevis (batting depth)",
             "MS Dhoni (WK – experience + finishing)",
             "Ravindra Jadeja (batting + spin all-round) + Noor Ahmad"],
    "RR":   ["Vaibhav Suryavanshi (175 off 80 balls vs England U19 – world record)",
             "Riyan Parag (captain) + Shimron Hetmyer (power hitter)",
             "Ravindra Jadeja + Sam Curran (versatile all-rounders)",
             "Jofra Archer (pace return) + Maheesh Theekshana (spin)"],
    "LSG":  ["Rishabh Pant (captain, 125 IPL matches, match-winner)",
             "Nicholas Pooran (SR 168.98, T20 explosive bat)",
             "Mohammed Shami (returning to form, pace ace)",
             "Ravi Bishnoi (wrist spin) + David Miller + Ayush Badoni"],
    "PBKS": ["Shreyas Iyer (captain, anchor batter, IPL experience 130+)",
             "Glenn Maxwell (power hitter + off-spin versatility)",
             "Josh Inglis (wicket-keeper-bat) + Prabhsimran Singh",
             "Arshdeep Singh (left-arm pace, death specialist) + Yuzvendra Chahal"],
}

# ─── Toss preference per venue ──────────────────────────────────────────────────────────
TOSS_PREF = {
    "Bengaluru":  {"pref": "chase",   "advantage": 62, "desc": "Dew-heavy, high-scoring. Chasing strongly favored (62%)."},
    "Mumbai":     {"pref": "chase",   "advantage": 58, "desc": "Wankhede dew factor. Chasing preferred (58%)."},
    "Kolkata":    {"pref": "chase",   "advantage": 55, "desc": "Eden Gardens – moderate chase advantage (55%)."},
    "Chennai":    {"pref": "defend",  "advantage": 60, "desc": "Chepauk spin pitch. Defending better (60%)."},
    "Hyderabad":  {"pref": "chase",   "advantage": 57, "desc": "Flat deck at Uppal. Chasing preferred (57%)."},
    "Delhi":      {"pref": "neutral", "advantage": 50, "desc": "Kotla – even split. No clear advantage."},
    "Ahmedabad":  {"pref": "chase",   "advantage": 56, "desc": "Big outfield, chasing preferred (56%)."},
    "Mullanpur":  {"pref": "chase",   "advantage": 54, "desc": "New Punjab ground, slight chase edge (54%)."},
    "Lucknow":    {"pref": "chase",   "advantage": 55, "desc": "BRSABV Stadium – chasing slightly preferred (55%)."},
    "Jaipur":     {"pref": "defend",  "advantage": 52, "desc": "Sawai Mansingh spin pitch, defending slight edge (52%)."},
    "Guwahati":   {"pref": "neutral", "advantage": 50, "desc": "Neutral venue, no clear toss advantage."},
}

# ─── Pitch info per venue ─────────────────────────────────────────────────────────────────────
PITCH_INFO = {
    "Bengaluru":  {"type": "Batting",  "avgScore": 182, "spinFriendly": False},
    "Mumbai":     {"type": "Batting",  "avgScore": 175, "spinFriendly": False},
    "Kolkata":    {"type": "Balanced", "avgScore": 168, "spinFriendly": True},
    "Chennai":    {"type": "Spin",     "avgScore": 161, "spinFriendly": True},
    "Hyderabad":  {"type": "Batting",  "avgScore": 178, "spinFriendly": False},
    "Delhi":      {"type": "Balanced", "avgScore": 170, "spinFriendly": True},
    "Ahmedabad":  {"type": "Balanced", "avgScore": 169, "spinFriendly": True},
    "Mullanpur":  {"type": "Batting",  "avgScore": 171, "spinFriendly": False},
    "Lucknow":    {"type": "Batting",  "avgScore": 172, "spinFriendly": False},
    "Jaipur":     {"type": "Spin",     "avgScore": 162, "spinFriendly": True},
    "Guwahati":   {"type": "Balanced", "avgScore": 164, "spinFriendly": True},
}

# ─── Squad Strength Display scores (for frontend panels) ─────────────────────────────────
SQUAD_DISPLAY = {
    "MI":   {"batting": 97, "bowling": 97, "allRound": 95, "overall": 97,
             "depth": "Elite — Rohit/SKY/Tilak/de Kock + Bumrah/Boult + Will Jacks 4×MoM"},
    "GT":   {"batting": 90, "bowling": 98, "allRound": 88, "overall": 94,
             "depth": "Elite bowling — Rashid #1 T20I + Rabada/Siraj/Prasidh (tie best attack)"},
    "DC":   {"batting": 86, "bowling": 93, "allRound": 90, "overall": 89,
             "depth": "Best spin duo (Axar+Kuldeep) + KL Rahul/Miller/Stubbs batting depth"},
    "KKR":  {"batting": 91, "bowling": 83, "allRound": 96, "overall": 88,
             "depth": "Most all-rounders (Green/Narine/Rinku/Ravindra) — pace injuries concern"},
    "SRH":  {"batting": 94, "bowling": 78, "allRound": 76, "overall": 83,
             "depth": "Attack-first trio: Head/Abhishek/Klaasen; bowling thinner"},
    "RCB":  {"batting": 87, "bowling": 79, "allRound": 74, "overall": 80,
             "depth": "Star batting: Bethell/Kohli/Salt; bowling depth a concern"},
    "CSK":  {"batting": 84, "bowling": 77, "allRound": 78, "overall": 79,
             "depth": "Experienced core: Samson/Ruturaj + Dhoni mentorship factor"},
    "RR":   {"batting": 80, "bowling": 74, "allRound": 80, "overall": 76,
             "depth": "Exciting youngsters (Vaibhav) + balanced but not elite"},
    "LSG":  {"batting": 82, "bowling": 72, "allRound": 71, "overall": 74,
             "depth": "Big hitters up top: Pant/Pooran; bowling depth a concern"},
}


# ─── Team colors / logos (mirrors frontend constants) ────────────────────────
TEAM_COLORS = {
    "CSK": "#F9CD05", "MI": "#1E90FF", "KKR": "#7B2FBE", "RR": "#EA1A85",
    "RCB": "#D4101A", "DC": "#0057A8", "SRH": "#F26522", "GT": "#00B4D8",
    "PBKS": "#DD1F2D", "LSG": "#00BFFF",
}
TEAM_LOGOS = {
    "CSK": "/teams/csk.jpg",   "MI": "/teams/MI.jpg",   "KKR": "/teams/kkr.jpg",
    "RR":  "/teams/rr.jpg",    "RCB": "/teams/rcb.jpg", "DC":  "/teams/dc.jpg",
    "SRH": "/teams/srh.jpg",   "GT":  "/teams/gt.jpg",  "PBKS": "/teams/pbks.jpg",
    "LSG": "/teams/lsg.jpg",
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def normalize_to_100(p1: float):
    a  = clamp01(p1)
    b  = 1.0 - a
    t1 = round(a * 100.0, 1)
    t2 = round(b * 100.0, 1)
    drift = round(100.0 - (t1 + t2), 1)
    if abs(drift) > 0.0001:
        t1 = round(t1 + drift, 1)
    return t1, t2


def _squad_feats(ta: dict) -> dict:
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


# ─── Load everything once ────────────────────────────────────────────────────

def _load_all():
    model_path = os.path.join(MODEL_DIR, "ipl_match_model.joblib")
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            "ML model not found. Run POST /api/predictions/retrain-ml first."
        )
    model = joblib.load(model_path)

    all_matches = load_consolidated_matches()
    h2h         = load_h2h()
    champs      = load_championship_counts()
    s2026       = load_player_stats_2026_strength()
    teams       = ["PBKS", "RR", "RCB", "SRH", "KKR", "LSG", "MI", "DC", "GT", "CSK"]
    aggs        = load_team_aggregates(teams)

    # Build per-team features (same approach as predict_2026.py)
    squad_feats = {t: _squad_feats(aggs.get(t, {})) for t in teams}

    # Venue win stats from historical data
    venue_stats: dict = {}
    for _, row in all_matches.iterrows():
        v = row.get("venue") or ""
        if not v:
            continue
        for team in (row["team1"], row["team2"]):
            key = (team, v)
            bucket = venue_stats.setdefault(key, {"played": 0, "won": 0})
            bucket["played"] += 1
            if row["winner"] == team:
                bucket["won"] += 1
    venue_win_rate = {k: v["won"] / max(v["played"], 1) for k, v in venue_stats.items()}

    future_idx = len(all_matches)
    squad_str  = {t: get_squad_strength(t) for t in teams}
    form5      = {t: form_factor_last5(t, future_idx, all_matches) for t in teams}

    # Per-team rolling context (all-time win-rate, recent form, win-streak)
    perf  = {}
    streak_map = {}
    for team in teams:
        tm = all_matches[(all_matches["team1"] == team) | (all_matches["team2"] == team)]
        if tm.empty:
            perf[team] = {"recentForm": 0.5, "allTimeWinRate": 0.5}
            streak_map[team] = 0
            continue
        all_wr = float((tm["winner"] == team).mean())
        rec    = tm[tm["season"] >= 2023]
        rec_wr = float((rec["winner"] == team).mean()) if not rec.empty else 0.5

        last10 = tm.tail(10)
        s = 0
        for _, m in last10.iloc[::-1].iterrows():
            if m["winner"] == team:
                s = (s + 1) if s >= 0 else 1
            else:
                if s > 0:
                    break
                s -= 1
        streak_map[team] = s
        perf[team] = {"recentForm": rec_wr, "allTimeWinRate": all_wr}

    return model, all_matches, h2h, champs, s2026, squad_feats, venue_win_rate, squad_str, form5, perf, streak_map


# ─── Build feature row for one match ─────────────────────────────────────────

def _build_features(t1, t2, venue_short, model_resources):
    (model, all_matches, h2h, champs, s2026, squad_feats,
     venue_win_rate, squad_str, form5, perf, streak_map) = model_resources

    v  = normalize_venue(VENUE_FULL.get(venue_short, venue_short))
    vf = get_venue_features(v)

    v1 = venue_win_rate.get((t1, v), 0.5)
    v2 = venue_win_rate.get((t2, v), 0.5)

    h2h_p1, h2h_n = h2h_features(h2h, t1, t2)
    c1 = float(champs.get(t1, 0))
    c2 = float(champs.get(t2, 0))
    s1: TeamStrength = s2026.get(t1, TeamStrength())
    s2: TeamStrength = s2026.get(t2, TeamStrength())

    f1 = squad_feats.get(t1, {})
    f2 = squad_feats.get(t2, {})

    return {
        "season": 2026,
        "team1":  t1,
        "team2":  t2,
        "venue":  v if v else "Unknown",
        # Rolling context
        "t1_all_time_win_rate":  perf[t1]["allTimeWinRate"],
        "t2_all_time_win_rate":  perf[t2]["allTimeWinRate"],
        "t1_recent_form":        perf[t1]["recentForm"],
        "t2_recent_form":        perf[t2]["recentForm"],
        "t1_win_streak":         float(streak_map.get(t1, 0)),
        "t2_win_streak":         float(streak_map.get(t2, 0)),
        # Squad aggregates
        "t1_bat_impact_mean":         f1.get("bat_impact_mean",        0.0),
        "t2_bat_impact_mean":         f2.get("bat_impact_mean",        0.0),
        "t1_bat_consistency_mean":    f1.get("bat_consistency_mean",   0.0),
        "t2_bat_consistency_mean":    f2.get("bat_consistency_mean",   0.0),
        "t1_bat_sr_mean":             f1.get("bat_sr_mean",            0.0),
        "t2_bat_sr_mean":             f2.get("bat_sr_mean",            0.0),
        "t1_bowl_xeco_mean":          f1.get("bowl_xeco_mean",         0.0),
        "t2_bowl_xeco_mean":          f2.get("bowl_xeco_mean",         0.0),
        "t1_bowl_xw_mean":            f1.get("bowl_xw_mean",           0.0),
        "t2_bowl_xw_mean":            f2.get("bowl_xw_mean",           0.0),
        "t1_bowl_consistency_mean":   f1.get("bowl_consistency_mean",  0.0),
        "t2_bowl_consistency_mean":   f2.get("bowl_consistency_mean",  0.0),
        "t1_role_batters_pct":        f1.get("role_batters_pct",       0.0),
        "t2_role_batters_pct":        f2.get("role_batters_pct",       0.0),
        "t1_role_bowlers_pct":        f1.get("role_bowlers_pct",       0.0),
        "t2_role_bowlers_pct":        f2.get("role_bowlers_pct",       0.0),
        "t1_role_all_rounders_pct":   f1.get("role_all_rounders_pct",  0.0),
        "t2_role_all_rounders_pct":   f2.get("role_all_rounders_pct",  0.0),
        "t1_role_wicketkeepers_pct":  f1.get("role_wicketkeepers_pct", 0.0),
        "t2_role_wicketkeepers_pct":  f2.get("role_wicketkeepers_pct", 0.0),
        "t1_squad_size":              f1.get("squad_size",             0.0),
        "t2_squad_size":              f2.get("squad_size",             0.0),
        # Venue
        "t1_venue_win_rate":    v1,
        "t2_venue_win_rate":    v2,
        "venue_advantage":      v1 - v2,
        "venue_capacity":       vf["venue_capacity"],
        "venue_pitch_enc":      vf["venue_pitch_enc"],
        "venue_is_spin":        vf["venue_is_spin"],
        "venue_is_batting":     vf["venue_is_batting"],
        # H2H + championships
        "h2h_p1":             float(h2h_p1),
        "h2h_sample":         float(h2h_n),
        "t1_championships":   c1,
        "t2_championships":   c2,
        "championship_adv":   c1 - c2,
        # 2026 squad strength
        "t1_2026_bat_rpg":        float(s1.bat_rpg),
        "t2_2026_bat_rpg":        float(s2.bat_rpg),
        "t1_2026_bat_sr_avg":     float(s1.bat_sr_avg),
        "t2_2026_bat_sr_avg":     float(s2.bat_sr_avg),
        "t1_2026_bowl_wpm":       float(s1.bowl_wpm),
        "t2_2026_bowl_wpm":       float(s2.bowl_wpm),
        "t1_2026_bowl_econ_avg":  float(s1.bowl_econ_avg),
        "t2_2026_bowl_econ_avg":  float(s2.bowl_econ_avg),
        # Squad strength + form
        "t1_squad_strength":   squad_str.get(t1, 0.83),
        "t2_squad_strength":   squad_str.get(t2, 0.83),
        "squad_strength_diff": squad_str.get(t1, 0.83) - squad_str.get(t2, 0.83),
        "t1_form_factor5":     form5.get(t1, 0.5),
        "t2_form_factor5":     form5.get(t2, 0.5),
        "form_factor_diff":    form5.get(t1, 0.5) - form5.get(t2, 0.5),
        # Toss unknown for future matches
        "toss_advantage": 0.0,
    }


# ─── Main prediction function ─────────────────────────────────────────────────

def predict_all_20():
    # 1. Data collection
    with open(SCHEDULE_PATH, "r", encoding="utf-8") as f:
        schedule = json.load(f)

    model_resources = _load_all()
    model = model_resources[0]

    results = []

    for match in schedule:
        matchup_parts = match["Matchup"].split(" vs ")
        t1_raw = matchup_parts[0].strip()
        t2_raw = matchup_parts[1].strip()
        venue_short = match.get("Venue", "")

        # 2. Feature selection + 3. Pre-processing
        t1 = normalize_team(t1_raw)
        t2 = normalize_team(t2_raw)

        try:
            X = _build_features(t1, t2, venue_short, model_resources)
        except Exception as e:
            # Graceful degradation for individual match failures
            results.append({
                "match":  match["Match"], "date": match["Date"],
                "day":    match["Day"],   "venue": venue_short,
                "time":   match.get("Time_IST", "7:30 PM"),
                "team1":  t1, "team2": t2,
                "team1Color": TEAM_COLORS.get(t1, "#888"),
                "team2Color": TEAM_COLORS.get(t2, "#888"),
                "team1Logo":  TEAM_LOGOS.get(t1, ""),
                "team2Logo":  TEAM_LOGOS.get(t2, ""),
                "predictedWinner": t1,
                "winnerColor": TEAM_COLORS.get(t1, "#888"),
                "confidence": 50,
                "winProbability": {t1: 50, t2: 50},
                "breakdown": {
                    "h2h":     {"team1": 50, "team2": 50},
                    "venue":   {"team1": 50, "team2": 50},
                    "batting": {"team1": 50, "team2": 50, "raw1": 0, "raw2": 0},
                    "bowling": {"team1": 50, "team2": 50, "raw1": 0, "raw2": 0},
                    "form":    {"team1": 50, "team2": 50},
                },
                "keyPlayers": {t1: KEY_PLAYERS.get(t1, []), t2: KEY_PLAYERS.get(t2, [])},
                "_error": str(e),
            })
            continue

        # 4. Model prediction (model already loaded)
        # Drop extra keys that weren't in training (squad_strength / form_factor fields
        # were not in original training set – only the 35-ish core features were)
        feature_df = pd.DataFrame([X])

        # 5. Prediction
        p1 = float(model.predict_proba(feature_df)[0][1])
        t1pct, t2pct = normalize_to_100(p1)

        predicted_winner = t1 if t1pct >= t2pct else t2
        confidence = max(t1pct, t2pct)

        # Derive breakdown from raw feature values for UI display
        h2h_pct_t1   = round(float(X["h2h_p1"]) * 100, 1)
        h2h_pct_t2   = round(100.0 - h2h_pct_t1, 1)
        venue_pct_t1  = round(float(X["venue_advantage"]) * 50 + 50, 1)
        venue_pct_t1  = max(10.0, min(90.0, venue_pct_t1))
        venue_pct_t2  = round(100.0 - venue_pct_t1, 1)
        bat_sr_t1     = round(float(X["t1_2026_bat_sr_avg"]), 1)
        bat_sr_t2     = round(float(X["t2_2026_bat_sr_avg"]), 1)
        bowl_eco_t1   = round(float(X["t1_2026_bowl_econ_avg"]), 2)
        bowl_eco_t2   = round(float(X["t2_2026_bowl_econ_avg"]), 2)
        form_t1       = round(float(X["t1_recent_form"]) * 100, 1)
        form_t2       = round(float(X["t2_recent_form"]) * 100, 1)
        bat_score_t1  = round(float(X["t1_bat_sr_mean"]), 1)
        bat_score_t2  = round(float(X["t2_bat_sr_mean"]), 1)
        bowl_score_t1 = round(100 - min(float(X["t1_bowl_xeco_mean"]) * 10, 100), 1)
        bowl_score_t2 = round(100 - min(float(X["t2_bowl_xeco_mean"]) * 10, 100), 1)
        # Win-streak as signed int for key stats
        ws1 = int(X["t1_win_streak"])
        ws2 = int(X["t2_win_streak"])

        # Extra context for frontend rich display
        toss  = TOSS_PREF.get(venue_short, {"pref": "neutral", "advantage": 50, "desc": "No data."})
        pitch = PITCH_INFO.get(venue_short, {"type": "Balanced", "avgScore": 165, "spinFriendly": False})
        sq1   = SQUAD_DISPLAY.get(t1, {"batting": 75, "bowling": 75, "allRound": 75, "overall": 75, "depth": "-"})
        sq2   = SQUAD_DISPLAY.get(t2, {"batting": 75, "bowling": 75, "allRound": 75, "overall": 75, "depth": "-"})

        results.append({
            "match":  match["Match"],
            "date":   match["Date"],
            "day":    match["Day"],
            "venue":  venue_short,
            "time":   match.get("Time_IST", "7:30 PM"),
            "team1":  t1,
            "team2":  t2,
            "team1Color": TEAM_COLORS.get(t1, "#888"),
            "team2Color": TEAM_COLORS.get(t2, "#888"),
            "team1Logo":  TEAM_LOGOS.get(t1, ""),
            "team2Logo":  TEAM_LOGOS.get(t2, ""),
            "predictedWinner": predicted_winner,
            "winnerColor": TEAM_COLORS.get(predicted_winner, "#888"),
            "confidence":  round(confidence, 1),
            "winProbability": {t1: round(t1pct, 1), t2: round(t2pct, 1)},
            "breakdown": {
                "h2h":     {"team1": h2h_pct_t1,   "team2": h2h_pct_t2},
                "venue":   {"team1": venue_pct_t1,  "team2": venue_pct_t2},
                "batting": {"team1": bat_score_t1,  "team2": bat_score_t2,
                            "raw1": bat_sr_t1,      "raw2": bat_sr_t2},
                "bowling": {"team1": bowl_score_t1, "team2": bowl_score_t2,
                            "raw1": bowl_eco_t1,    "raw2": bowl_eco_t2},
                "form":    {"team1": form_t1,        "team2": form_t2},
            },
            "keyPlayers": {t1: KEY_PLAYERS.get(t1, []), t2: KEY_PLAYERS.get(t2, [])},
            "tossImpact": {
                "preference":       toss["pref"],
                "chasingAdvantage": toss["advantage"],
                "description":      toss["desc"],
            },
            "pitchInfo": {
                "type":         pitch["type"],
                "avgScore":     pitch["avgScore"],
                "spinFriendly": pitch["spinFriendly"],
                "description":  (
                    f"{pitch['type']} pitch · Avg score: {pitch['avgScore']} · "
                    f"{'Spin-friendly' if pitch['spinFriendly'] else 'Pace-friendly'}"
                ),
            },
            "squadInfo": {
                t1: {"batting": sq1["batting"], "bowling": sq1["bowling"],
                     "allRound": sq1["allRound"], "overall": sq1["overall"], "depth": sq1["depth"]},
                t2: {"batting": sq2["batting"], "bowling": sq2["bowling"],
                     "allRound": sq2["allRound"], "overall": sq2["overall"], "depth": sq2["depth"]},
            },
            "keyMetrics": {
                "recentForm":     {"team1": form_t1,             "team2": form_t2},
                "venueAdvantage": {"team1": round(venue_pct_t1, 1), "team2": round(venue_pct_t2, 1)},
                "h2hRatio":       {"team1": h2h_pct_t1,          "team2": h2h_pct_t2},
                "pressureIndex":  {
                    "team1": round(float(X.get("t1_squad_strength", 0.83)) * 100, 1),
                    "team2": round(float(X.get("t2_squad_strength", 0.83)) * 100, 1),
                },
                "squadStrength":  {"team1": sq1["overall"], "team2": sq2["overall"]},
            },
            "mlStats": {
                "h2hWinRateTeam1":      h2h_pct_t1,
                "h2hMatches":           int(X["h2h_sample"]),
                "team1RecentForm":      form_t1,
                "team2RecentForm":      form_t2,
                "team1WinStreak":       ws1,
                "team2WinStreak":       ws2,
                "team1Championships":   int(X["t1_championships"]),
                "team2Championships":   int(X["t2_championships"]),
                "team1SquadStrengthPts": int(get_squad_strength_raw(t1)),
                "team2SquadStrengthPts": int(get_squad_strength_raw(t2)),
                "pitchType": {0: "pace", 1: "spin", 2: "balanced", 3: "batting"}.get(
                    int(X["venue_pitch_enc"]), "balanced"
                ),
            },
            "methodology": (
                "VotingClassifier (RF×2 + GBM×2 + LR×1, soft voting) "
                "trained on IPL 2008–2025. Features: H2H, recent form, "
                "win-streak, 2026 squad strength, venue pitch/capacity, championships."
            ),
        })


    return results


def main():
    try:
        predictions = predict_all_20()
        print(json.dumps({"success": True, "totalMatches": len(predictions),
                          "predictions": predictions}, indent=2))
    except FileNotFoundError as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
    except Exception as e:
        import traceback
        print(json.dumps({"success": False, "error": str(e),
                          "traceback": traceback.format_exc()}))
        sys.exit(1)


if __name__ == "__main__":
    main()
