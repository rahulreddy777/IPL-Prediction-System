import json
import os
from typing import Any, Dict, List

import numpy as np

from match_features import normalize_team


ROOT = os.path.dirname(os.path.dirname(__file__))  # backend/
DATA_DIR = os.path.join(ROOT, "data")

PLAYER_STATS_2026_PATH = os.path.join(DATA_DIR, "player_stats_2026.json")
SQUAD_2026_PATH = os.path.join(DATA_DIR, "ipl_2026_master_squad.json")


def _read_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _mean(xs: List[float]) -> float:
    return float(np.mean(xs)) if xs else 0.0


def load_team_aggregates(teams: List[str]) -> Dict[str, Dict[str, float]]:
    """
    Build per-team aggregate numeric features for 2026 squads using:
      - `backend/data/player_stats_2026.json` (player performance totals)
      - `backend/data/ipl_2026_master_squad.json` (role distribution)

    Output keys are stable and consumed by training + prediction scripts.
    """
    teams_norm = [normalize_team(t) for t in teams]

    raw_stats = _read_json(PLAYER_STATS_2026_PATH) if os.path.exists(PLAYER_STATS_2026_PATH) else {}
    raw_squad = _read_json(SQUAD_2026_PATH) if os.path.exists(SQUAD_2026_PATH) else []

    stats_by_team: Dict[str, Dict[str, Dict[str, Any]]] = {}
    if isinstance(raw_stats, dict):
        for k, v in raw_stats.items():
            code = normalize_team(k)
            if code:
                stats_by_team[code] = v if isinstance(v, dict) else {}

    role_counts: Dict[str, Dict[str, int]] = {t: {"Batter": 0, "Bowler": 0, "All-rounder": 0, "Wicketkeeper": 0, "Total": 0} for t in teams_norm}
    if isinstance(raw_squad, list):
        for p in raw_squad:
            if not isinstance(p, dict):
                continue
            team = normalize_team(p.get("Team"))
            if team not in role_counts:
                continue
            role = str(p.get("Role") or "").strip()
            role_counts[team]["Total"] += 1
            if role in role_counts[team]:
                role_counts[team][role] += 1

    feats: Dict[str, Dict[str, float]] = {}
    for team in teams_norm:
        players = stats_by_team.get(team, {})

        bat_rpg: List[float] = []
        bat_sr: List[float] = []
        bowl_wpm: List[float] = []
        bowl_econ: List[float] = []

        if isinstance(players, dict):
            for _, st in players.items():
                if not isinstance(st, dict):
                    continue
                m = float(st.get("matches") or 0.0)
                runs = float(st.get("runs") or 0.0)
                wkts = float(st.get("wkts") or 0.0)
                sr = st.get("sr")
                econ = st.get("econ")

                if m > 0 and runs > 0:
                    bat_rpg.append(runs / m)
                if sr is not None:
                    try:
                        bat_sr.append(float(sr))
                    except Exception:
                        pass
                if m > 0 and wkts > 0:
                    bowl_wpm.append(wkts / m)
                if econ is not None:
                    try:
                        bowl_econ.append(float(econ))
                    except Exception:
                        pass

        rc = role_counts.get(team, {})
        total = float(rc.get("Total") or 0) or 1.0

        feats[team] = {
            "t_bat_rpg_mean": _mean(bat_rpg),
            "t_bat_sr_mean": _mean(bat_sr),
            "t_bowl_wpm_mean": _mean(bowl_wpm),
            "t_bowl_econ_mean": _mean(bowl_econ),
            "role_batters_pct": float(rc.get("Batter", 0)) / total,
            "role_bowlers_pct": float(rc.get("Bowler", 0)) / total,
            "role_all_rounders_pct": float(rc.get("All-rounder", 0)) / total,
            "role_wicketkeepers_pct": float(rc.get("Wicketkeeper", 0)) / total,
            "squad_size": float(rc.get("Total", 0)),
        }

    return feats

