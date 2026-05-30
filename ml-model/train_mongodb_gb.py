"""
train_mongodb_gb.py
Pipeline to pull matches directly from MongoDB, clean data, engineer
features, train a GradientBoosting classifier, predict IPL 2026 matches,
and store the predictions back directly into MongoDB.
"""

import os
import json
import pymongo
import pandas as pd
import numpy as np
from datetime import datetime

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
import matplotlib.pyplot as plt
import joblib

ROOT = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(ROOT, "backend", "data")
MODEL_DIR = os.path.join(ROOT, "ml-model")

# Standardise team mappings
TEAM_MAPPING = {
    "Delhi Daredevils": "Delhi Capitals",
    "Kings XI Punjab": "Punjab Kings",
    "Deccan Chargers": "Sunrisers Hyderabad",
    "Gujarat Lions": "Gujarat Titans",
    "Pune Warriors": "Rising Pune Supergiant",
    "Rising Pune Supergiants": "Rising Pune Supergiant",
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru"
}

def standardise_team(team_name):
    if not isinstance(team_name, str):
        return team_name
    # Handle known renames
    res = TEAM_MAPPING.get(team_name, team_name)
    # Simplify common short forms if any
    return res

def fetch_data():
    client = pymongo.MongoClient("mongodb://localhost:27017")
    db_hist = client.ipl_history
    
    docs_2008_2024 = list(db_hist["ipl_matches_2008_2024"].find({}))
    docs_2025 = list(db_hist["ipl_matches_2025"].find({}))
    
    df1 = pd.DataFrame(docs_2008_2024)
    df2 = pd.DataFrame(docs_2025)
    
    if 'team1' in df1.columns: df1.rename(columns={'winner': 'winningTeam', 'toss_winner': 'tossWinner'}, inplace=True)
    if 'Team 1' in df2.columns: df2.rename(columns={'Team 1': 'team1', 'Team 2': 'team2', 'winner': 'winningTeam', 'Venue': 'venue', 'Date & Time': 'date'}, inplace=True)
    
    # Fill missing tossWinner for 2025 if missing
    if 'tossWinner' not in df2.columns:
        df2['tossWinner'] = ""
        
    df = pd.concat([df1, df2], ignore_index=True)
    
    # Standardise names
    df['team1'] = df['team1'].apply(standardise_team)
    df['team2'] = df['team2'].apply(standardise_team)
    if 'winningTeam' in df.columns:
        df['winningTeam'] = df['winningTeam'].apply(standardise_team)
    elif 'winner' in df.columns:
        df['winningTeam'] = df['winner'].apply(standardise_team)
        
    if 'tossWinner' in df.columns:
        df['tossWinner'] = df['tossWinner'].apply(standardise_team)
        
    # Drop NoResults
    df = df.dropna(subset=['winningTeam'])
    df = df[df['winningTeam'] != "NoResults"]
    df = df[df['winningTeam'] != ""]
    
    # Parse dates and sort
    # Some dates might be strings like "2008-04-18" or Date objects
    df['date'] = df['date'].apply(lambda x: x[0] if isinstance(x, list) else x)
    df['date_parsed'] = pd.to_datetime(df['date'], errors='coerce')
    df = df.sort_values(by='date_parsed').reset_index(drop=True)
    return df

def feature_engineering(df):
    records = []
    
    # Store dynamic states
    team_matches = {}
    team_wins = {}
    venue_matches = {}
    venue_wins = {}
    h2h_matches = {}
    h2h_wins = {}
    
    for idx, row in df.iterrows():
        t1 = row['team1']
        t2 = row['team2']
        winner = row['winningTeam']
        venue = row.get('venue', 'Unknown')
        
        # Identify outcome relative to t1
        t1_won = 1 if winner == t1 else 0
        
        # Toss impact
        is_toss_winner_t1 = 1 if row.get('tossWinner') == t1 else (0 if row.get('tossWinner') == t2 else 0.5)
        
        # Recent Form
        t1_recent = team_wins.get(t1, [])[-5:]
        t2_recent = team_wins.get(t2, [])[-5:]
        t1_recent_form = sum(t1_recent)/len(t1_recent) if t1_recent else 0.5
        t2_recent_form = sum(t2_recent)/len(t2_recent) if t2_recent else 0.5
        
        # Venue Win Pct
        t1_venue_key = f"{t1}_{venue}"
        t2_venue_key = f"{t2}_{venue}"
        t1_venue_w = venue_wins.get(t1_venue_key, 0)
        t1_venue_m = venue_matches.get(t1_venue_key, 0)
        t2_venue_w = venue_wins.get(t2_venue_key, 0)
        t2_venue_m = venue_matches.get(t2_venue_key, 0)
        t1_venue_pct = t1_venue_w / t1_venue_m if t1_venue_m > 0 else 0.5
        t2_venue_pct = t2_venue_w / t2_venue_m if t2_venue_m > 0 else 0.5
        
        # H2H (sorted alphabetically to keep track)
        teams_sorted = sorted([t1, t2])
        h2h_key = f"{teams_sorted[0]}_vs_{teams_sorted[1]}"
        h2h_m = h2h_matches.get(h2h_key, 0)
        h2h_w = h2h_wins.get(f"{t1}_vs_{t2}", 0)  # Wins specifically for t1
        h2h_pct_t1 = h2h_w / h2h_m if h2h_m > 0 else 0.5
        
        records.append({
            'team1': t1,
            'team2': t2,
            'recent_form_t1': t1_recent_form,
            'recent_form_t2': t2_recent_form,
            'venue_pct_t1': t1_venue_pct,
            'venue_pct_t2': t2_venue_pct,
            'h2h_pct_t1': h2h_pct_t1,
            'toss_winner_is_t1': is_toss_winner_t1,
            'target_t1_win': t1_won
        })
        
        # Update states
        team_matches[t1] = team_matches.get(t1, 0) + 1
        team_matches[t2] = team_matches.get(t2, 0) + 1
        
        if not team_wins.get(t1): team_wins[t1] = []
        if not team_wins.get(t2): team_wins[t2] = []
            
        team_wins[t1].append(1 if winner == t1 else 0)
        team_wins[t2].append(1 if winner == t2 else 0)
        
        venue_matches[t1_venue_key] = venue_matches.get(t1_venue_key, 0) + 1
        venue_matches[t2_venue_key] = venue_matches.get(t2_venue_key, 0) + 1
        
        if winner == t1:
            venue_wins[t1_venue_key] = venue_wins.get(t1_venue_key, 0) + 1
            h2h_wins[f"{t1}_vs_{t2}"] = h2h_wins.get(f"{t1}_vs_{t2}", 0) + 1
        elif winner == t2:
            venue_wins[t2_venue_key] = venue_wins.get(t2_venue_key, 0) + 1
            h2h_wins[f"{t2}_vs_{t1}"] = h2h_wins.get(f"{t2}_vs_{t1}", 0) + 1
            
        h2h_matches[h2h_key] = h2h_matches.get(h2h_key, 0) + 1

    return pd.DataFrame(records), team_wins, venue_wins, venue_matches, h2h_wins, h2h_matches

def train_and_tune(features_df):
    X = features_df.drop(columns=['team1', 'team2', 'target_t1_win'])
    y = features_df['target_t1_win']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    gb = GradientBoostingClassifier(random_state=42)
    
    param_grid = {
        'n_estimators': [100, 200],
        'learning_rate': [0.05, 0.1],
        'max_depth': [3, 4]
    }
    
    grid = GridSearchCV(gb, param_grid, cv=5, scoring='accuracy', n_jobs=-1)
    grid.fit(X_train, y_train)
    
    best_model = grid.best_estimator_
    y_pred = best_model.predict(X_test)
    y_proba = best_model.predict_proba(X_test)[:, 1]
    
    print(f"Best Params: {grid.best_params_}")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"AUC: {roc_auc_score(y_test, y_proba):.4f}")
    
    # Feature Importance Plot
    importances = best_model.feature_importances_
    plt.figure(figsize=(10, 6))
    plt.barh(X.columns, importances)
    plt.title("GradientBoosting Feature Importances")
    plt.savefig(os.path.join(ROOT, "feature_importance.png"))
    
    joblib.dump(best_model, os.path.join(MODEL_DIR, "gb_model.pkl"))
    return best_model

def get_latest_stats(team_wins, venue_wins, venue_matches, h2h_wins, h2h_matches, t1, t2, venue):
    # Retrieve the state as of the end of historical matches
    t1_recent = team_wins.get(t1, [])[-5:]
    t2_recent = team_wins.get(t2, [])[-5:]
    t1_recent_form = sum(t1_recent)/len(t1_recent) if t1_recent else 0.5
    t2_recent_form = sum(t2_recent)/len(t2_recent) if t2_recent else 0.5
    
    t1_venue_key = f"{t1}_{venue}"
    t2_venue_key = f"{t2}_{venue}"
    t1_v_m = venue_matches.get(t1_venue_key, 0)
    t2_v_m = venue_matches.get(t2_venue_key, 0)
    t1_venue_pct = venue_wins.get(t1_venue_key, 0) / t1_v_m if t1_v_m > 0 else 0.5
    t2_venue_pct = venue_wins.get(t2_venue_key, 0) / t2_v_m if t2_v_m > 0 else 0.5
    
    teams_sorted = sorted([t1, t2])
    h2h_key = f"{teams_sorted[0]}_vs_{teams_sorted[1]}"
    h2h_m = h2h_matches.get(h2h_key, 0)
    h2h_pct_t1 = h2h_wins.get(f"{t1}_vs_{t2}", 0) / h2h_m if h2h_m > 0 else 0.5
    
    return {
        'recent_form_t1': t1_recent_form,
        'recent_form_t2': t2_recent_form,
        'venue_pct_t1': t1_venue_pct,
        'venue_pct_t2': t2_venue_pct,
        'h2h_pct_t1': h2h_pct_t1,
        'toss_winner_is_t1': 0.5  # Neutral toss for future matches
    }

def predict_2026(model, team_wins, venue_wins, venue_matches, h2h_wins, h2h_matches):
    with open(os.path.join(DATA_DIR, "ipl_2026_matches_schedule.json"), "r") as f:
        schedule = json.load(f)
    
    predictions = []
    
    CODE_MAP = {
        "MI": "Mumbai Indians", "CSK": "Chennai Super Kings",
        "KKR": "Kolkata Knight Riders", "RCB": "Royal Challengers Bengaluru",
        "DC": "Delhi Capitals", "RR": "Rajasthan Royals",
        "SRH": "Sunrisers Hyderabad", "PBKS": "Punjab Kings",
        "LSG": "Lucknow Super Giants", "GT": "Gujarat Titans"
    }
    
    for match in schedule:
        match_id = match['Match']
        matchup = match['Matchup']
        venue = match.get('Venue', 'Unknown')
        date = match.get('Date', '')
        day = match.get('Day', '')
        time_ist = match.get('Time_IST', '7:30 PM')
        is_playoff = match.get('Playoff', False)
        
        # Skip playoffs (teams unknown until league stage ends)
        if is_playoff:
            continue
        if any(kw in matchup for kw in ['Qualifier', 'Eliminator', 'Final', 'Winner', 'Loser']):
            continue
            
        parts = [p.strip() for p in matchup.split(' vs ')]
        if len(parts) != 2:
            continue
            
        t1_code, t2_code = parts
        t1 = CODE_MAP.get(t1_code, t1_code)
        t2 = CODE_MAP.get(t2_code, t2_code)
        
        feats = get_latest_stats(team_wins, venue_wins, venue_matches, h2h_wins, h2h_matches, t1, t2, venue)
        df_feats = pd.DataFrame([feats])
        proba_t1 = model.predict_proba(df_feats)[0][1]
        
        p1 = round(float(proba_t1) * 100, 2)
        p2 = round(float(1 - proba_t1) * 100, 2)
        conf = round(abs(proba_t1 - 0.5) * 200, 2)
        
        predictions.append({
            'match_id': match_id,
            'matchup': matchup,
            'date': date,
            'day': day,
            'time_ist': time_ist,
            'venue': venue,
            'team1': t1_code,
            'team2': t2_code,
            'predicted_winner': t1_code if proba_t1 >= 0.5 else t2_code,
            'win_probability': { t1_code: p1, t2_code: p2 },
            'confidence': conf,
            # Feature values for UI explainability
            'recent_form_t1': round(feats['recent_form_t1'], 4),
            'recent_form_t2': round(feats['recent_form_t2'], 4),
            'venue_pct_t1': round(feats['venue_pct_t1'], 4),
            'venue_pct_t2': round(feats['venue_pct_t2'], 4),
            'h2h_pct_t1': round(feats['h2h_pct_t1'], 4),
            'h2h_pct_t2': round(1 - feats['h2h_pct_t1'], 4),
            'toss_winner_is_t1': feats['toss_winner_is_t1'],
            'methodology': 'GradientBoosting (GridSearchCV)',
            'createdAt': datetime.utcnow().isoformat()
        })
        
    return predictions

def save_predictions(predictions):
    client = pymongo.MongoClient("mongodb://localhost:27017")
    db_pred = client.ipl_prediction
    collection = db_pred.match_predictions_2026
    
    # Clear existing
    collection.delete_many({})
    
    if predictions:
        collection.insert_many(predictions)
    print(f"Saved {len(predictions)} predictions to ipl_prediction.match_predictions_2026")

if __name__ == "__main__":
    print("Fetching History...")
    df = fetch_data()
    print(f"Loaded {len(df)} matches. Engineering features...")
    features_df, team_wins, venue_wins, venue_matches, h2h_wins, h2h_matches = feature_engineering(df)
    
    print("Training GradientBoosting...")
    best_model = train_and_tune(features_df)
    
    print("Predicting IPL 2026 Matches...")
    preds = predict_2026(best_model, team_wins, venue_wins, venue_matches, h2h_wins, h2h_matches)
    
    print("Saving to MongoDB...")
    save_predictions(preds)
    print("Pipeline Complete.")
