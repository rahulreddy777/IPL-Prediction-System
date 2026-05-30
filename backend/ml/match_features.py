"""
match_features.py  –  upgraded feature engineering for IPL prediction.

Key additions over the previous version:
  • load_stadiums()          – reads stadiums.json (capacity, pitch_type, home_team)
  • get_venue_features()    – returns stadium-level features for a venue name
  • win_streak features     – number of consecutive wins/losses before a match
  • Fix: player_stats_2026  – handles both 'wkts' and 'wickets', 'sr' and 'strike_rate'
"""

import json
import os
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Deque, Dict, Iterable, List, Optional, Tuple

import pandas as pd


ROOT = os.path.dirname(os.path.dirname(__file__))  # backend/
DATA_DIR = os.path.join(ROOT, "data")

MATCHES_2008_2024_PATH = os.path.join(DATA_DIR, "ipl matches 2008 to 2024..json")
MATCHES_2025_PATH      = os.path.join(DATA_DIR, "ipl matches 2025.json.json")
H2H_PATH               = os.path.join(DATA_DIR, "head to head in .json")
WINNERS_PATH           = os.path.join(DATA_DIR, "winners.json")
PLAYER_STATS_2026_PATH = os.path.join(DATA_DIR, "player_stats_2026.json")
STADIUMS_PATH          = os.path.join(DATA_DIR, "stadiums.json")


# ── Team alias mapping ─────────────────────────────────────────────────────────
TEAM_ALIASES: Dict[str, str] = {
    "Chennai Super Kings":          "CSK",
    "Mumbai Indians":               "MI",
    "Royal Challengers Bengaluru":  "RCB",
    "Royal Challengers Bangalore":  "RCB",
    "Rajasthan Royals":             "RR",
    "Sunrisers Hyderabad":          "SRH",
    "Deccan Chargers":              "SRH",
    "Kolkata Knight Riders":        "KKR",
    "Lucknow Super Giants":         "LSG",
    "Gujarat Titans":               "GT",
    "Delhi Capitals":               "DC",
    "Delhi Daredevils":             "DC",
    "Punjab Kings":                 "PBKS",
    "Kings XI Punjab":              "PBKS",
    "Rising Pune Supergiant":       "RPS",
    "Rising Pune Supergiants":      "RPS",
    "Gujarat Lions":                "GL",
}

VALID_CODES = {"CSK", "MI", "RCB", "RR", "SRH", "KKR", "LSG", "GT", "DC", "PBKS", "RPS", "GL"}

# Squad strength points for IPL 2026 (updated with 2026 auction + recent form data)
# User-specified ranking (data-driven from squad analysis):
# MI #1 (most balanced), GT #2 (strongest bowling + top order),
# DC #3 (tactical reset ₹124.75Cr – KL Rahul, Axar+Kuldeep elite spin, Miller, Stubbs, Starc)
# KKR #4 (all-rounder specialists – Cameron Green ₹25.2cr)
SQUAD_STRENGTH_2026: Dict[str, float] = {
    "MI":   395.0,   # #1 — Rohit, SKY, Tilak, de Kock | Bumrah, Boult | Will Jacks 4×MoM T20WC | Hardik all-round
    "GT":   385.0,   # #2 — Gill, Sai Sudharsan (759 runs OC), Buttler | Rashid #1 T20I, Rabada, Siraj, Prasidh
    "DC":   375.0,   # #3 — KL Rahul, Nissanka, Miller, Stubbs | Axar+Kuldeep best spin duo | Starc (if fit)
    "KKR":  368.0,   # #4 — Cameron Green ₹25.2cr, Finn Allen, Rinku (VC), R.Ravindra | Varun+Narine mystery spin
    "SRH":  355.0,   # #5 — Travis Head, Abhishek (#1 T20I bat), Klaasen, Ishan Kishan (capt) | Harshal
    "RCB":  340.0,   # #6 — Bethell (WC semi century), Kohli 8861 runs, Salt | Hazlewood, Bhuvi
    "CSK":  335.0,   # #7 — Sanju Samson (WC POT), Ruturaj, Dewald Brevis | Dhoni WK experience
    "RR":   315.0,   # #8 — Vaibhav Suryavanshi, Jadeja, Curran | Riyan Parag (capt)
    "LSG":  305.0,   # #9 — Pant (capt), Pooran SR 168, Shami return | Ravi Bishnoi
    "PBKS": 295.0,   # #10 — Shreyas Iyer (capt anchor), Maxwell | Arshdeep Singh
}
# Normalise to 0-1 for model consumption
_SS_MAX = max(SQUAD_STRENGTH_2026.values())  # 361.0

# Pitch type numeric encoding  (higher = more batting-friendly)
PITCH_TYPE_ENC = {"pace": 0, "spin": 1, "balanced": 2, "batting": 3}


# ── Helpers ────────────────────────────────────────────────────────────────────
def _read_json(path: str) -> Any:
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_season_to_year(season: Any) -> Optional[int]:
    if season is None:
        return None
    s = str(season).strip()
    if "/" in s and len(s) >= 7:
        parts = s.split("/")
        try:
            left  = int(parts[0])
            right2 = int(parts[1][-2:])
            return int(f"{str(left)[:2]}{right2:02d}")
        except Exception:
            pass
    try:
        return int(float(s))
    except Exception:
        return None


def normalize_team(name_or_code: Any) -> str:
    raw = str(name_or_code or "").strip()
    if not raw:
        return ""
    upper = raw.upper()
    if upper in VALID_CODES:
        return upper
    if raw in TEAM_ALIASES:
        return TEAM_ALIASES[raw]
    low = raw.lower()
    for k, v in TEAM_ALIASES.items():
        if k.lower() == low:
            return v
    return raw


def normalize_player_name(name: str) -> str:
    """Lowercase, remove dots, remove dashes, strip whitespace."""
    if not name:
        return ""
    return (
        str(name)
        .replace(".", "")
        .replace("-", " ")
        .replace("\u00a0", " ")
        .strip()
        .lower()
    )



def normalize_venue(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, list):
        return ", ".join([str(x) for x in v if x])
    return str(v).strip()


def parse_date(d: Any) -> Optional[datetime]:
    if not d:
        return None
    s = str(d).strip()
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


# ── Stadium features ───────────────────────────────────────────────────────────
_STADIUMS_CACHE: Optional[List[Dict]] = None


def load_stadiums() -> List[Dict]:
    global _STADIUMS_CACHE
    if _STADIUMS_CACHE is not None:
        return _STADIUMS_CACHE
    if not os.path.exists(STADIUMS_PATH):
        _STADIUMS_CACHE = []
        return _STADIUMS_CACHE
    raw = _read_json(STADIUMS_PATH)
    _STADIUMS_CACHE = raw if isinstance(raw, list) else []
    return _STADIUMS_CACHE


def get_venue_features(venue_name: str) -> Dict[str, float]:
    """
    Return numeric features for a venue:
      venue_capacity       – normalised 0-1 (max 132k, Narendra Modi)
      venue_pitch_enc      – 0=pace, 1=spin, 2=balanced, 3=batting
      venue_is_spin        – 1 if spin-friendly
      venue_is_batting     – 1 if batting-friendly
    """
    stadiums = load_stadiums()
    if not venue_name:
        return _default_venue_features()
    vl = venue_name.lower()
    for s in stadiums:
        if s.get("name", "").lower() in vl or vl in s.get("name", "").lower():
            cap  = float(s.get("capacity") or 35000)
            ptype = str(s.get("pitch_type") or "balanced").lower()
            enc  = float(PITCH_TYPE_ENC.get(ptype, 2))
            return {
                "venue_capacity":   min(cap / 132000.0, 1.0),
                "venue_pitch_enc":  enc,
                "venue_is_spin":    float(ptype == "spin"),
                "venue_is_batting": float(ptype == "batting"),
            }
    return _default_venue_features()


def _default_venue_features() -> Dict[str, float]:
    return {"venue_capacity": 0.3, "venue_pitch_enc": 2.0, "venue_is_spin": 0.0, "venue_is_batting": 0.0}


def get_home_team_for_venue(venue_name: str) -> Optional[str]:
    """Return the home_team code for a venue, or None."""
    stadiums = load_stadiums()
    if not venue_name:
        return None
    vl = venue_name.lower()
    for s in stadiums:
        if s.get("name", "").lower() in vl or vl in s.get("name", "").lower():
            ht = s.get("home_team")
            return normalize_team(ht) if ht else None
    return None


# ── Match loading ──────────────────────────────────────────────────────────────
def load_consolidated_matches() -> pd.DataFrame:
    rows: List[Dict[str, Any]] = []

    if os.path.exists(MATCHES_2008_2024_PATH):
        d = _read_json(MATCHES_2008_2024_PATH)
        if isinstance(d, list):
            for m in d:
                season = parse_season_to_year(m.get("season") or m.get("Season"))
                team1  = normalize_team(m.get("team1")  or m.get("Team1"))
                team2  = normalize_team(m.get("team2")  or m.get("Team2"))
                winner = normalize_team(m.get("winner") or m.get("WinningTeam") or m.get("Winning Team"))
                venue  = normalize_venue(m.get("venue") or m.get("Venue") or m.get("Stadium"))
                date   = m.get("date") or m.get("Date")
                toss_w = normalize_team(m.get("toss_winner") or m.get("TossWinner") or "")
                rows.append({"season": season, "team1": team1, "team2": team2,
                             "winner": winner, "venue": venue, "date": date, "toss_winner": toss_w})

    if os.path.exists(MATCHES_2025_PATH):
        d = _read_json(MATCHES_2025_PATH)
        if isinstance(d, list):
            for m in d:
                team1  = normalize_team(m.get("Team 1")   or m.get("Team1") or m.get("team1"))
                team2  = normalize_team(m.get("Team 2")   or m.get("Team2") or m.get("team2"))
                winner = normalize_team(m.get("winner")   or m.get("Winning Team") or m.get("WinningTeam"))
                venue  = normalize_venue(m.get("Venue")   or m.get("venue") or m.get("Stadium"))
                toss_w = normalize_team(m.get("toss_winner") or m.get("TossWinner") or "")
                rows.append({"season": 2025, "team1": team1, "team2": team2,
                             "winner": winner, "venue": venue, "date": None, "toss_winner": toss_w})

    df = pd.DataFrame(rows)
    df = df.dropna(subset=["season", "team1", "team2", "winner"])
    df["season"]      = df["season"].astype(int)
    df["team1"]       = df["team1"].astype(str)
    df["team2"]       = df["team2"].astype(str)
    df["winner"]      = df["winner"].astype(str)
    df["venue"]       = df["venue"].fillna("").astype(str)
    df["toss_winner"] = df.get("toss_winner", pd.Series([""] * len(df))).fillna("").astype(str)
    df["date_dt"]     = df["date"].apply(parse_date)

    df["_sort_key"] = df["date_dt"].apply(
        lambda x: x.timestamp() if (x is not None and not pd.isna(x)) else float("nan")
    )
    df = df.sort_values(by=["season", "_sort_key"], na_position="last").reset_index(drop=True)
    df = df.drop(columns=["_sort_key"])
    return df


# ── H2H ───────────────────────────────────────────────────────────────────────
def load_h2h() -> Dict[str, Dict[str, Tuple[float, int]]]:
    if not os.path.exists(H2H_PATH):
        return {}
    raw = _read_json(H2H_PATH)
    out: Dict[str, Dict[str, Tuple[float, int]]] = {}
    if not isinstance(raw, dict):
        return out
    for team, rows in raw.items():
        t = normalize_team(team)
        if not isinstance(rows, list):
            continue
        for r in rows:
            opp   = normalize_team(r.get("opponent"))
            wins  = r.get("wins")
            losses = r.get("losses")
            try:
                w, l = int(wins), int(losses)
            except Exception:
                continue
            total = w + l
            if total <= 0:
                continue
            out.setdefault(t, {})[opp] = (w / total, total)
    return out


# ── Championship counts ────────────────────────────────────────────────────────
def load_championship_counts() -> Dict[str, int]:
    counts: Dict[str, int] = defaultdict(int)
    if not os.path.exists(WINNERS_PATH):
        return dict(counts)
    raw = _read_json(WINNERS_PATH)
    if not isinstance(raw, list):
        return dict(counts)
    for r in raw:
        w = normalize_team(r.get("Winner"))
        if w:
            counts[w] += 1
    return dict(counts)


# ── Player-stats 2026 strength ─────────────────────────────────────────────────
@dataclass
class TeamStrength:
    bat_rpg:       float = 0.0
    bat_sr_avg:    float = 0.0
    bowl_wpm:      float = 0.0
    bowl_econ_avg: float = 0.0


def load_player_stats_2026_strength() -> Dict[str, TeamStrength]:
    if not os.path.exists(PLAYER_STATS_2026_PATH):
        return {}
    raw = _read_json(PLAYER_STATS_2026_PATH)
    if not isinstance(raw, dict):
        return {}

    out: Dict[str, TeamStrength] = {}
    for team_key, players in raw.items():
        code = normalize_team(team_key.upper())
        if not isinstance(players, dict):
            continue

        total_runs = total_m_bat = sr_sum = 0.0
        sr_n = 0
        total_wkts = total_m_bowl = econ_sum = 0.0
        econ_n = 0

        for _, st in players.items():
            if not isinstance(st, dict):
                continue
            m    = float(st.get("matches") or 0.0)
            runs = float(st.get("runs")    or 0.0)
            # accept both 'wkts' and 'wickets'
            wkts = float(st.get("wkts") or st.get("wickets") or 0.0)
            # accept both 'sr' and 'strike_rate'
            sr   = st.get("sr") or st.get("strike_rate")
            econ = st.get("econ") or st.get("economy")

            if m > 0 and runs > 0:
                total_runs   += runs
                total_m_bat  += m
            if sr is not None:
                try:
                    sr_sum += float(sr); sr_n += 1
                except Exception:
                    pass
            if m > 0 and wkts > 0:
                total_wkts  += wkts
                total_m_bowl += m
            if econ is not None:
                try:
                    econ_sum += float(econ); econ_n += 1
                except Exception:
                    pass

        out[code] = TeamStrength(
            bat_rpg       = total_runs / total_m_bat   if total_m_bat   else 0.0,
            bat_sr_avg    = sr_sum / sr_n               if sr_n          else 0.0,
            bowl_wpm      = total_wkts / total_m_bowl  if total_m_bowl  else 0.0,
            bowl_econ_avg = econ_sum / econ_n           if econ_n        else 0.0,
        )
    return out


# ── Online (leakage-safe) rolling context ─────────────────────────────────────
def build_online_context(matches: pd.DataFrame, recent_window: int = 20) -> Dict[int, Dict[str, float]]:
    """
    Rolling features computed chronologically so no future data leaks.
    New in this version: win_streak (consecutive wins / losses as signed int)
    """
    recent_q:      Dict[str, Deque[int]]      = defaultdict(lambda: deque(maxlen=recent_window))
    total_played:  Dict[str, int]             = defaultdict(int)
    total_won:     Dict[str, int]             = defaultdict(int)
    venue_played:  Dict[Tuple[str, str], int] = defaultdict(int)
    venue_won:     Dict[Tuple[str, str], int] = defaultdict(int)
    streak:        Dict[str, int]             = defaultdict(int)   # positive=wins, negative=losses

    feats: Dict[int, Dict[str, float]] = {}

    for i, r in matches.iterrows():
        t1, t2, w = r["team1"], r["team2"], r["winner"]
        venue = r.get("venue") or ""

        def recent_rate(team: str) -> float:
            q = recent_q.get(team)
            return sum(q) / max(len(q), 1) if q else 0.5

        def all_time_rate(team: str) -> float:
            p = total_played.get(team, 0)
            return total_won.get(team, 0) / p if p > 0 else 0.5

        def venue_rate(team: str) -> float:
            if not venue:
                return 0.5
            key = (team, venue)
            p = venue_played.get(key, 0)
            return venue_won.get(key, 0) / p if p > 0 else 0.5

        feats[i] = {
            "t1_recent_form":       recent_rate(t1),
            "t2_recent_form":       recent_rate(t2),
            "t1_all_time_win_rate": all_time_rate(t1),
            "t2_all_time_win_rate": all_time_rate(t2),
            "t1_venue_win_rate":    venue_rate(t1),
            "t2_venue_win_rate":    venue_rate(t2),
            "t1_win_streak":        float(streak.get(t1, 0)),
            "t2_win_streak":        float(streak.get(t2, 0)),
        }

        # Update rolling stats (AFTER recording features)
        for team in (t1, t2):
            total_played[team] += 1
        if w == t1:
            total_won[t1] += 1
            recent_q[t1].append(1); recent_q[t2].append(0)
            streak[t1] = (streak[t1] + 1) if streak.get(t1, 0) >= 0 else 1
            streak[t2] = (streak[t2] - 1) if streak.get(t2, 0) <= 0 else -1
        elif w == t2:
            total_won[t2] += 1
            recent_q[t1].append(0); recent_q[t2].append(1)
            streak[t2] = (streak[t2] + 1) if streak.get(t2, 0) >= 0 else 1
            streak[t1] = (streak[t1] - 1) if streak.get(t1, 0) <= 0 else -1
        else:
            recent_q[t1].append(0); recent_q[t2].append(0)

        if venue:
            for team in (t1, t2):
                key = (team, venue)
                venue_played[key] += 1
                if w == team:
                    venue_won[key] += 1

    return feats


# ── H2H helper ────────────────────────────────────────────────────────────────
def h2h_features(h2h: Dict[str, Dict[str, Tuple[float, int]]], t1: str, t2: str) -> Tuple[float, int]:
    row = h2h.get(t1, {}).get(t2)
    if row:
        return float(row[0]), int(row[1])
    rev = h2h.get(t2, {}).get(t1)
    if rev:
        return float(1.0 - float(rev[0])), int(rev[1])
    return 0.5, 0


# ── Squad strength helpers ────────────────────────────────────────────────────
def get_squad_strength(team_code: str) -> float:
    """Return normalised 0-1 squad strength for a team (2026 edition)."""
    return SQUAD_STRENGTH_2026.get(team_code, 300.0) / _SS_MAX


def get_squad_strength_raw(team_code: str) -> float:
    """Return raw squad strength points for a team (2026 edition)."""
    return SQUAD_STRENGTH_2026.get(team_code, 300.0)


# ── Form-factor (weighted last-5) ─────────────────────────────────────────────
# Weights: oldest→newest  [1, 1, 2, 2, 3]  (sum=9)
_FORM5_WEIGHTS = [1, 1, 2, 2, 3]


def form_factor_last5(team: str, match_idx: int, matches_df: pd.DataFrame) -> float:
    """
    Weighted win-rate over the last ≤5 matches played by `team` BEFORE `match_idx`.
    Returns a float in [0, 1]; defaults to 0.5 when no history is available.
    """
    past = matches_df.loc[
        :match_idx - 1 if match_idx > 0 else 0,
        ["team1", "team2", "winner"]
    ]
    past = past[(past["team1"] == team) | (past["team2"] == team)].tail(5)
    if past.empty:
        return 0.5
    outcomes = [1.0 if row["winner"] == team else 0.0 for _, row in past.iterrows()]
    # Align weights to the number of available matches (take the last len(outcomes) weights)
    weights = _FORM5_WEIGHTS[-len(outcomes):]
    weighted_sum = sum(w * o for w, o in zip(weights, outcomes))
    total_weight = sum(weights)
    return weighted_sum / total_weight if total_weight else 0.5
