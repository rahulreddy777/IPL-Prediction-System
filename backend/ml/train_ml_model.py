"""
train_ml_model.py  –  upgraded IPL match prediction training.

Model: VotingClassifier (RandomForest + GradientBoosting + LogisticRegression)
Data:  head-to-head, IPL matches 2008-2025, player_stats_2026, stadiums, winners
"""

import json
import os
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from match_features import (
    VALID_CODES,
    TeamStrength,
    build_online_context,
    get_venue_features,
    h2h_features,
    load_championship_counts,
    load_consolidated_matches,
    load_h2h,
    load_player_stats_2026_strength,
)
from team_aggregates import load_team_aggregates


ROOT      = os.path.dirname(os.path.dirname(__file__))
DATA_DIR  = os.path.join(ROOT, "data")
MODEL_DIR = os.path.join(ROOT, "ml", "artifacts")
os.makedirs(MODEL_DIR, exist_ok=True)


# ── Squad feature helpers ─────────────────────────────────────────────────────
def _strength_from_aggregates(team_agg: Dict[str, float]) -> Dict[str, float]:
    return {
        "bat_impact_mean":        float(team_agg.get("t_bat_rpg_mean", 0.0) * (team_agg.get("t_bat_sr_mean", 0.0) / 100.0)),
        "bat_consistency_mean":   float(team_agg.get("t_bat_rpg_mean", 0.0)),
        "bat_sr_mean":            float(team_agg.get("t_bat_sr_mean", 0.0)),
        "bowl_xeco_mean":         float(team_agg.get("t_bowl_econ_mean", 0.0)),
        "bowl_xw_mean":           float(team_agg.get("t_bowl_wpm_mean", 0.0)),
        "bowl_consistency_mean":  float(team_agg.get("t_bowl_wpm_mean", 0.0)),
        "role_batters_pct":       float(team_agg.get("role_batters_pct", 0.0)),
        "role_bowlers_pct":       float(team_agg.get("role_bowlers_pct", 0.0)),
        "role_all_rounders_pct":  float(team_agg.get("role_all_rounders_pct", 0.0)),
        "role_wicketkeepers_pct": float(team_agg.get("role_wicketkeepers_pct", 0.0)),
        "squad_size":             float(team_agg.get("squad_size", 0.0)),
    }


def load_matches() -> pd.DataFrame:
    return load_consolidated_matches()


# ── Feature row builder ───────────────────────────────────────────────────────
def build_training_rows(matches: pd.DataFrame, teams: List[str]) -> pd.DataFrame:
    online         = build_online_context(matches, recent_window=20)
    team_aggs      = load_team_aggregates(teams)
    squad_feats    = {t: _strength_from_aggregates(team_aggs.get(t, {})) for t in teams}
    h2h            = load_h2h()
    champion_counts = load_championship_counts()
    strength_2026  = load_player_stats_2026_strength()

    out_rows: List[Dict] = []
    for idx, r in matches.iterrows():
        t1 = r["team1"];  t2 = r["team2"];  w = r["winner"]
        if t1 not in teams or t2 not in teams:
            continue

        o  = online.get(idx) or {}
        f1 = squad_feats.get(t1, {});  f2 = squad_feats.get(t2, {})
        venue = r.get("venue") or ""
        vf    = get_venue_features(venue)

        v1 = float(o.get("t1_venue_win_rate", 0.5))
        v2 = float(o.get("t2_venue_win_rate", 0.5))
        h2h_p1, h2h_n = h2h_features(h2h, t1, t2)
        c1 = float(champion_counts.get(t1, 0))
        c2 = float(champion_counts.get(t2, 0))
        s1: TeamStrength = strength_2026.get(t1, TeamStrength())
        s2: TeamStrength = strength_2026.get(t2, TeamStrength())

        toss_w = str(r.get("toss_winner") or "")
        toss_adv = 1.0 if toss_w == t1 else (-1.0 if toss_w == t2 else 0.0)

        out_rows.append({
            # identifiers (categorical – will be one-hot encoded)
            "season":  int(r["season"]),
            "team1":   t1,
            "team2":   t2,
            "venue":   venue if venue else "Unknown",
            # rolling context
            "t1_all_time_win_rate":  float(o.get("t1_all_time_win_rate", 0.5)),
            "t2_all_time_win_rate":  float(o.get("t2_all_time_win_rate", 0.5)),
            "t1_recent_form":        float(o.get("t1_recent_form", 0.5)),
            "t2_recent_form":        float(o.get("t2_recent_form", 0.5)),
            "t1_win_streak":         float(o.get("t1_win_streak", 0.0)),
            "t2_win_streak":         float(o.get("t2_win_streak", 0.0)),
            # squad aggregates
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
            # venue
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
            # toss
            "toss_advantage": toss_adv,
            # label
            "y_team1_wins": 1 if w == t1 else 0,
        })

    return pd.DataFrame(out_rows)


# ── Model training ────────────────────────────────────────────────────────────
def train_model(df: pd.DataFrame) -> Tuple[Pipeline, Dict]:
    y = df["y_team1_wins"].astype(int)
    X = df.drop(columns=["y_team1_wins"])

    cat_cols = ["team1", "team2", "venue"]
    num_cols = [c for c in X.columns if c not in cat_cols]

    pre = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
            ("num", "passthrough", num_cols),
        ]
    )

    # ── Ensemble: RandomForest + GradientBoosting + LogisticRegression ────────
    rf  = RandomForestClassifier(n_estimators=300, max_depth=8,  min_samples_leaf=3,
                                  random_state=42, n_jobs=-1)
    gb  = GradientBoostingClassifier(n_estimators=200, max_depth=4, learning_rate=0.08,
                                      subsample=0.8,  random_state=42)
    lr  = LogisticRegression(C=0.5, max_iter=500, random_state=42)

    clf = VotingClassifier(
        estimators=[("rf", rf), ("gb", gb), ("lr", lr)],
        voting="soft",
        weights=[2, 2, 1],   # RF+GB weighted more
    )
    pipe = Pipeline([("pre", pre), ("clf", clf)])

    # ── Train/test split ──────────────────────────────────────────────────────
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)
    pipe.fit(X_tr, y_tr)

    proba = pipe.predict_proba(X_te)[:, 1]
    preds = pipe.predict(X_te)

    auc  = float(roc_auc_score(y_te, proba))
    acc  = float(accuracy_score(y_te, preds))
    report = classification_report(y_te, preds, target_names=["team2_wins", "team1_wins"], output_dict=True)

    # ── 5-Fold Cross-Validation AUC ───────────────────────────────────────────
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_aucs = cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)

    metrics = {
        "auc":             auc,
        "accuracy":        acc,
        "cv_auc_mean":     float(cv_aucs.mean()),
        "cv_auc_std":      float(cv_aucs.std()),
        "classification_report": report,
    }
    return pipe, metrics


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    teams   = ["PBKS", "RR", "RCB", "SRH", "KKR", "LSG", "MI", "DC", "GT", "CSK"]
    matches = load_matches()
    df      = build_training_rows(matches, teams)

    if df.empty:
        raise SystemExit("No training rows built. Check match JSON files in backend/data.")

    print(f"Training on {len(df)} rows, {df.columns.tolist().count('y_team1_wins')} label cols …")
    model, metrics = train_model(df)

    model_path = os.path.join(MODEL_DIR, "ipl_match_model.joblib")
    joblib.dump(model, model_path)

    meta = {
        "auc":          metrics["auc"],
        "cv_auc_mean":  metrics["cv_auc_mean"],
        "cv_auc_std":   metrics["cv_auc_std"],
        "accuracy":     metrics["accuracy"],
        "rows":         int(df.shape[0]),
        "features":     [c for c in df.columns if c != "y_team1_wins"],
        "teams":        teams,
        "model":        "VotingClassifier(RF×2 + GBM×2 + LR×1, soft voting)",
        "data_sources": ["ipl_matches_2008_2024", "ipl_matches_2025", "head_to_head",
                         "player_stats_2026", "stadiums", "winners"],
        "notes":        "Trained on 2008–2025 with H2H/winners/player_stats_2026/stadium features + win-streak + toss",
    }
    with open(os.path.join(MODEL_DIR, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(json.dumps({"ok": True, "model_path": model_path, "meta": meta}, indent=2))


if __name__ == "__main__":
    main()
