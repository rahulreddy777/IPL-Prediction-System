import argparse
import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
 
import numpy as np
 
 
ROOT = os.path.dirname(os.path.dirname(__file__))  # backend/
DATA_DIR = os.path.join(ROOT, "data")
 
SQUAD_PATH = os.path.join(DATA_DIR, "ipl_2026_master_squad.json")
BATTER_STATS_PATH = os.path.join(DATA_DIR, "current_players_stats_2026.json")
BOWLER_STATS_PATH = os.path.join(DATA_DIR, "all_time_bowlers_parsed.json")
ALIAS_PATH = os.path.join(DATA_DIR, "name_aliases.json")
 
 
def _read_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
 
 
def _normalize_name(name: str) -> str:
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
 
 
def _build_alias_set(player_name: str, alias_map) -> List[str]:
    base = (player_name or "").strip()
    aliases = {base}
 
    mapped = alias_map.get(base)
    if isinstance(mapped, list):
        aliases.update(mapped)
    elif isinstance(mapped, str):
        aliases.add(mapped)
 
    parts = base.split()
    if len(parts) >= 2:
        aliases.add(f"{parts[0][0]} {parts[-1]}")
 
    return list({_normalize_name(a) for a in aliases if a})
 
 
@dataclass(frozen=True)
class PlayerMatch:
    team: str
    name: str
    role: str
    batter_stats: Optional[Dict]
    bowler_stats: Optional[Dict]
 
 
def load_alias_map() -> Dict[str, object]:
    if not os.path.exists(ALIAS_PATH):
        return {}
    raw = _read_json(ALIAS_PATH)
    return raw if isinstance(raw, dict) else {}
 
 
def index_batters(batter_stats) -> Dict[str, Dict]:
    """
    Supports both list format (current_players_stats_2026.json: [{"player": ..., "batting": {}, ...}])
    and older flat dict format.
    """
    idx: Dict[str, Dict] = {}
    if isinstance(batter_stats, list):
        # current_players_stats_2026.json format
        for row in batter_stats:
            # Each player entry has 'player' + nested 'batting' / 'bowling' dicts
            key = _normalize_name(row.get("player") or row.get("batter"))
            if key:
                # Flatten nested batting stats into the row for easy access
                batting = row.get("batting") or {}
                flat = dict(row)
                flat.update(batting)
                idx[key] = flat
    elif isinstance(batter_stats, dict):
        for k, v in batter_stats.items():
            key = _normalize_name(k)
            if key:
                idx[key] = v
    return idx
 
 
def index_bowlers(bowler_stats) -> Dict[str, Dict]:
    """
    Supports all_time_bowlers_parsed.json format: [{"player": ..., "wkts": ..., "economy": ...}]
    Keys by 'player' field.
    """
    idx: Dict[str, Dict] = {}
    if isinstance(bowler_stats, list):
        for row in bowler_stats:
            # all_time_bowlers_parsed.json uses 'player' key
            key = _normalize_name(row.get("player") or row.get("bowler"))
            if key:
                idx[key] = row
    elif isinstance(bowler_stats, dict):
        for k, v in bowler_stats.items():
            key = _normalize_name(k)
            if key:
                idx[key] = v
    return idx
 
 
def match_players(teams: Optional[List[str]] = None) -> List[PlayerMatch]:
    if not os.path.exists(SQUAD_PATH):
        raise SystemExit(f"Missing squad file: {SQUAD_PATH}")
    if not os.path.exists(BATTER_STATS_PATH):
        raise SystemExit(f"Missing batter stats file: {BATTER_STATS_PATH}")
    if not os.path.exists(BOWLER_STATS_PATH):
        raise SystemExit(f"Missing bowler stats file: {BOWLER_STATS_PATH}")
 
    alias_map = load_alias_map()
    squad = _read_json(SQUAD_PATH)
    bat_raw = _read_json(BATTER_STATS_PATH)
    bowl_raw = _read_json(BOWLER_STATS_PATH)
 
    bat_idx = index_batters(bat_raw)
    bowl_idx = index_bowlers(bowl_raw)
 
    # Fallback indices for abbreviated-name datasets (e.g. "RG Sharma", "JJ Bumrah").
    def build_last_name_index(idx: Dict[str, Dict], key_field: str) -> Dict[str, List[Tuple[str, Dict]]]:
        out: Dict[str, List[Tuple[str, Dict]]] = {}
        for k, row in idx.items():
            raw_name = str(row.get(key_field) or "")
            parts = [p for p in _normalize_name(raw_name).split() if p]
            if not parts:
                continue
            last = parts[-1]
            out.setdefault(last, []).append((k, row))
        return out
 
    bat_last = build_last_name_index(bat_idx, "batter")
    bowl_last = build_last_name_index(bowl_idx, "bowler")
 
    def fallback_by_last_name(player_name: str, last_index: Dict[str, List[Tuple[str, Dict]]]) -> Optional[Dict]:
        parts = [p for p in _normalize_name(player_name).split() if p]
        if len(parts) < 2:
            return None
        first_initial = parts[0][0]
        last = parts[-1]
        cands = last_index.get(last) or []
        if not cands:
            return None
 
        # Prefer unique candidate where the abbreviation starts with same first initial.
        filtered = [(k, row) for (k, row) in cands if k and k[0] == first_initial]
        if len(filtered) == 1:
            return filtered[0][1]
 
        # If still ambiguous, pick the one with the closest "initials+last" shape.
        # Example: "Jasprit Bumrah" -> "JJ Bumrah" in stats.
        if filtered:
            # More initials before last name means more specific; take max initials count.
            def initials_len(k: str) -> int:
                toks = k.split()
                return max(len(toks[0]), 0) if toks else 0
 
            filtered.sort(key=lambda kr: initials_len(kr[0]), reverse=True)
            top = filtered[0]
            # Only accept if the top is strictly better than runner-up.
            if len(filtered) == 1 or initials_len(filtered[0][0]) > initials_len(filtered[1][0]):
                return top[1]
 
        return None
 
    out: List[PlayerMatch] = []
    for p in squad:
        team = p.get("Team")
        if teams and team not in teams:
            continue
 
        name = p.get("Player") or ""
        role = p.get("Role") or ""
 
        batter_stats = None
        bowler_stats = None
 
        for alias in _build_alias_set(name, alias_map):
            if batter_stats is None and alias in bat_idx:
                batter_stats = bat_idx[alias]
            if bowler_stats is None and alias in bowl_idx:
                bowler_stats = bowl_idx[alias]
            if batter_stats is not None and bowler_stats is not None:
                break
 
        # Fallback matching for abbreviated datasets (e.g. "RG Sharma", "TA Boult", "JJ Bumrah").
        if batter_stats is None:
            batter_stats = fallback_by_last_name(name, bat_last)
        if bowler_stats is None:
            bowler_stats = fallback_by_last_name(name, bowl_last)
 
        out.append(PlayerMatch(team=str(team), name=str(name), role=str(role), batter_stats=batter_stats, bowler_stats=bowler_stats))
 
    return out
 
 
def _safe_float(v, default: float = 0.0) -> float:
    try:
        if v is None:
            return default
        return float(v)
    except Exception:
        return default
 
 
def _minmax(values: Dict[str, float], higher_is_better: bool = True) -> Dict[str, float]:
    if not values:
        return {}
    xs = list(values.values())
    lo = float(min(xs))
    hi = float(max(xs))
    if abs(hi - lo) < 1e-12:
        return {k: 0.5 for k in values}
 
    if higher_is_better:
        return {k: (v - lo) / (hi - lo) for k, v in values.items()}
    return {k: (hi - v) / (hi - lo) for k, v in values.items()}
 
 
def compute_team_strength(players: List[PlayerMatch]) -> Dict[str, Dict]:
    teams = sorted({p.team for p in players})
 
    # Aggregate means from only the current squad's matched stats.
    per_team: Dict[str, Dict[str, list]] = {
        t: {
            "bat_impact": [],
            "bat_consistency": [],
            "bat_sr": [],
            "bowl_xw": [],
            "bowl_xeco": [],
            "bowl_consistency": [],
            "players": 0,
            "bat_matched": 0,
            "bowl_matched": 0,
        }
        for t in teams
    }
 
    for p in players:
        bucket = per_team[p.team]
        bucket["players"] += 1
 
        if p.batter_stats:
            bucket["bat_matched"] += 1
            # Derived bat_impact = runs * (strike_rate / 100) — proxy for impact
            runs = _safe_float(p.batter_stats.get("runs"))
            sr   = _safe_float(p.batter_stats.get("strike_rate"))
            avg  = _safe_float(p.batter_stats.get("average") or p.batter_stats.get("batting_average"))
            bucket["bat_impact"].append(runs * (sr / 100.0) if sr > 0 else 0.0)
            bucket["bat_consistency"].append(avg)
            bucket["bat_sr"].append(sr)
 
        if p.bowler_stats:
            bucket["bowl_matched"] += 1
            wkts     = _safe_float(p.bowler_stats.get("wkts") or p.bowler_stats.get("wickets"))
            economy  = _safe_float(p.bowler_stats.get("economy") or p.bowler_stats.get("eco"))
            bowl_avg = _safe_float(p.bowler_stats.get("bowling_average"))
            bucket["bowl_xw"].append(wkts)
            bucket["bowl_xeco"].append(economy)
            bucket["bowl_consistency"].append(bowl_avg if bowl_avg > 0 else 0.0)
 
    def mean(xs: list) -> float:
        return float(np.mean(xs)) if xs else 0.0
 
    team_raw = {}
    for t, b in per_team.items():
        players_n = max(int(b["players"]), 1)
        team_raw[t] = {
            "players": int(b["players"]),
            "batMatched": int(b["bat_matched"]),
            "bowlMatched": int(b["bowl_matched"]),
            "batMatchPct": round((b["bat_matched"] / players_n) * 100.0, 1),
            "bowlMatchPct": round((b["bowl_matched"] / players_n) * 100.0, 1),
            "batImpactMean": mean(b["bat_impact"]),
            "batConsistencyMean": mean(b["bat_consistency"]),
            "batStrikeRateMean": mean(b["bat_sr"]),
            "bowlXWMean": mean(b["bowl_xw"]),
            "bowlXEcoMean": mean(b["bowl_xeco"]),
            "bowlConsistencyMean": mean(b["bowl_consistency"]),
        }
 
    # Normalize across teams so we can combine metrics cleanly.
    bat_impact_n = _minmax({t: v["batImpactMean"] for t, v in team_raw.items()}, higher_is_better=True)
    bat_cons_n = _minmax({t: v["batConsistencyMean"] for t, v in team_raw.items()}, higher_is_better=True)
    bat_sr_n = _minmax({t: v["batStrikeRateMean"] for t, v in team_raw.items()}, higher_is_better=True)
 
    bowl_xw_n = _minmax({t: v["bowlXWMean"] for t, v in team_raw.items()}, higher_is_better=True)
    bowl_xeco_n = _minmax({t: v["bowlXEcoMean"] for t, v in team_raw.items()}, higher_is_better=False)  # lower is better
    bowl_cons_n = _minmax({t: v["bowlConsistencyMean"] for t, v in team_raw.items()}, higher_is_better=True)
 
    # Coverage penalty: if we can’t match stats for many current players, reduce confidence/score slightly.
    coverage_n = _minmax(
        {t: (0.5 * team_raw[t]["batMatchPct"] + 0.5 * team_raw[t]["bowlMatchPct"]) for t in teams},
        higher_is_better=True,
    )
 
    out = {}
    for t in teams:
        bat = 0.45 * bat_impact_n[t] + 0.35 * bat_cons_n[t] + 0.20 * bat_sr_n[t]
        bowl = 0.50 * bowl_xw_n[t] + 0.30 * bowl_xeco_n[t] + 0.20 * bowl_cons_n[t]
 
        # Overall: batting slightly more important in T20, but keep bowling close.
        base = 0.56 * bat + 0.44 * bowl
        # Mild penalty for low data coverage.
        score = base * (0.92 + 0.08 * coverage_n[t])
 
        out[t] = {
            **team_raw[t],
            "batScore": round(float(bat), 4),
            "bowlScore": round(float(bowl), 4),
            "coverageScore": round(float(coverage_n[t]), 4),
            "teamScore": round(float(score), 4),
        }
 
    return out
 
 
def build_player_report(players: List[PlayerMatch]) -> Dict[str, List[Dict]]:
    by_team: Dict[str, List[Dict]] = {}
    for p in players:
        row = {
            "player": p.name,
            "role": p.role,
            "bat": None,
            "bowl": None,
        }
        if p.batter_stats:
            row["bat"] = {
                "player_key":       p.batter_stats.get("player"),
                "matches":          p.batter_stats.get("matches"),
                "runs":             p.batter_stats.get("runs"),
                "strike_rate":      p.batter_stats.get("strike_rate"),
                "average":          p.batter_stats.get("average") or p.batter_stats.get("batting_average"),
            }
        if p.bowler_stats:
            row["bowl"] = {
                "player_key":       p.bowler_stats.get("player"),
                "matches":          p.bowler_stats.get("matches"),
                "wickets":          p.bowler_stats.get("wkts") or p.bowler_stats.get("wickets"),
                "economy":          p.bowler_stats.get("economy"),
                "bowling_average":  p.bowler_stats.get("bowling_average"),
            }
 
        by_team.setdefault(p.team, []).append(row)
 
    # stable ordering
    for t in by_team:
        by_team[t] = sorted(by_team[t], key=lambda r: (r["player"] or "").lower())
    return by_team
 
 
def main():
    parser = argparse.ArgumentParser(description="IPL 2026 prediction from current squad player stats only (no historical team form).")
    parser.add_argument("--teams", nargs="*", default=None, help="Optional list of team short codes to include (e.g. MI LSG RCB).")
    parser.add_argument("--include-players", action="store_true", help="Include per-player matched stats in output JSON.")
    args = parser.parse_args()
 
    players = match_players(teams=args.teams)
    team_strength = compute_team_strength(players)
    ranked = sorted(
        [{"team": t, **vals} for t, vals in team_strength.items()],
        key=lambda x: x["teamScore"],
        reverse=True,
    )
 
    out = {
        "methodology": "Current-squad-only aggregates from player batting (impact/consistency/SR) and bowling (xW/xECO/consistency). No historical recent-form or all-time team win rates.",
        "teamsRanked": [{"team": r["team"], "teamScore": r["teamScore"], "batScore": r["batScore"], "bowlScore": r["bowlScore"], "batMatchPct": r["batMatchPct"], "bowlMatchPct": r["bowlMatchPct"]} for r in ranked],
        "predictedWinner": ranked[0]["team"] if ranked else None,
        "predictedRunnerUp": ranked[1]["team"] if len(ranked) > 1 else None,
        "teamDetails": team_strength,
    }
 
    if args.include_players:
        out["players"] = build_player_report(players)
 
    print(json.dumps(out, indent=2))
 
 
if __name__ == "__main__":
    main()
