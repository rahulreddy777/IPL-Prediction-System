/**
 * Advanced ML Prediction Service for IPL 2026
 * Provides data-driven match predictions using ensemble ML model
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ML_DIR = path.join(__dirname, '..', 'ml');

// Team rankings and squad strengths (from 2026 analysis)
const TEAM_RANKINGS = {
  MI: 1, GT: 2, DC: 3, KKR: 4, SRH: 5,
  RCB: 6, CSK: 7, RR: 8, LSG: 9, PBKS: 10
};

const SQUAD_SCORES = {
  MI: 97, GT: 94, DC: 89, KKR: 88, SRH: 83,
  RCB: 80, CSK: 79, RR: 76, LSG: 74, PBKS: 71
};

// Venue mappings
const VENUE_HOME_TEAM = {
  Bengaluru: 'RCB', Mumbai: 'MI', Kolkata: 'KKR',
  Chennai: 'CSK', Hyderabad: 'SRH', Delhi: 'DC',
  Ahmedabad: 'GT', Mullanpur: 'PBKS', Lucknow: 'LSG',
  Guwahati: null
};

// Head-to-head data (win rates from 2008-2025)
const H2H_DATA = {
  CSK: { MI: 0.46, RCB: 0.60, KKR: 0.63, DC: 0.63, PBKS: 0.53, RR: 0.52, SRH: 0.73, GT: 0.43, LSG: 0.20 },
  MI: { CSK: 0.54, RCB: 0.58, KKR: 0.69, DC: 0.56, PBKS: 0.57, RR: 0.54, SRH: 0.55, GT: 0.29, LSG: 0.25 },
  RCB: { CSK: 0.40, MI: 0.42, KKR: 0.41, DC: 0.60, PBKS: 0.51, RR: 0.50, SRH: 0.42, LSG: 0.60, GT: 0.40 },
  KKR: { CSK: 0.37, MI: 0.31, RCB: 0.59, DC: 0.55, PBKS: 0.68, RR: 0.50, SRH: 0.67, LSG: 0.25, GT: 0.25 },
  DC: { CSK: 0.37, MI: 0.44, RCB: 0.40, KKR: 0.45, PBKS: 0.50, RR: 0.46, SRH: 0.48, LSG: 0.40, GT: 0.25 },
  PBKS: { CSK: 0.47, MI: 0.43, RCB: 0.49, KKR: 0.32, DC: 0.50, RR: 0.44, SRH: 0.30, LSG: 0.40, GT: 0.50 },
  RR: { CSK: 0.48, MI: 0.46, RCB: 0.50, KKR: 0.50, DC: 0.54, PBKS: 0.56, SRH: 0.45, LSG: 0.50, GT: 0.20 },
  SRH: { CSK: 0.27, MI: 0.45, RCB: 0.58, KKR: 0.33, DC: 0.52, PBKS: 0.70, RR: 0.55, LSG: 0.25, GT: 0.25 },
  GT: { CSK: 0.57, MI: 0.71, RCB: 0.60, KKR: 0.75, DC: 0.75, PBKS: 0.50, RR: 0.80, SRH: 0.75, LSG: 0.67 },
  LSG: { CSK: 0.80, MI: 0.75, RCB: 0.40, KKR: 0.75, DC: 0.60, PBKS: 0.60, RR: 0.50, SRH: 0.75, GT: 0.33 }
};

/**
 * Get ML-based prediction from Python model
 */
async function getMLPrediction(team1, team2, venue, matchData = {}) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(ML_DIR, 'ipl_2026_predictor.py');
    
    const payload = JSON.stringify({
      team1,
      team2,
      venue,
      match_id: matchData.match_id || 0,
      date: matchData.date || ''
    });
    
    const py = spawn('python', [scriptPath, payload], {
      cwd: path.join(ML_DIR, '..'),
      timeout: 30000
    });
    
    let stdout = '';
    let stderr = '';
    
    py.stdout.on('data', (d) => (stdout += d.toString()));
    py.stderr.on('data', (d) => (stderr += d.toString()));
    
    py.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Invalid JSON from ML model: ${e.message}`));
        }
      } else {
        reject(new Error(`ML model failed: ${stderr || stdout}`));
      }
    });
    
    py.on('error', (err) => {
      reject(new Error(`Failed to run ML model: ${err.message}`));
    });
  });
}

/**
 * JavaScript fallback prediction (rule-based)
 */
function getRuleBasedPrediction(team1, team2, venue, matchData = {}) {
  const weights = {
    squadStrength: 0.25,
    headToHead: 0.20,
    venueAdvantage: 0.15,
    recentForm: 0.15,
    keyPlayers: 0.15,
    tossImpact: 0.10
  };
  
  // Squad strength scores
  const t1Squad = SQUAD_SCORES[team1] / 100;
  const t2Squad = SQUAD_SCORES[team2] / 100;
  
  // H2H win rates
  const t1H2H = H2H_DATA[team1]?.[team2] || 0.5;
  const t2H2H = 1 - t1H2H;
  
  // Venue advantage
  const homeTeam = VENUE_HOME_TEAM[venue];
  const t1Venue = homeTeam === team1 ? 0.60 : (homeTeam === null ? 0.50 : 0.40);
  const t2Venue = homeTeam === team2 ? 0.60 : (homeTeam === null ? 0.50 : 0.40);
  
  // Recent form (based on ranking)
  const t1Rank = TEAM_RANKINGS[team1] || 5;
  const t2Rank = TEAM_RANKINGS[team2] || 5;
  const t1Form = Math.max(0.4, 1.0 - (t1Rank - 1) * 0.06);
  const t2Form = Math.max(0.4, 1.0 - (t2Rank - 1) * 0.06);
  
  // Key players form (correlated with squad strength)
  const t1Players = t1Squad * 0.9;
  const t2Players = t2Squad * 0.9;
  
  // Calculate weighted scores
  const t1Score = (
    t1Squad * weights.squadStrength +
    t1H2H * weights.headToHead +
    t1Venue * weights.venueAdvantage +
    t1Form * weights.recentForm +
    t1Players * weights.keyPlayers +
    (t1Rank < t2Rank ? 0.05 : -0.05) * weights.tossImpact
  );
  
  const t2Score = (
    t2Squad * weights.squadStrength +
    t2H2H * weights.headToHead +
    t2Venue * weights.venueAdvantage +
    t2Form * weights.recentForm +
    t2Players * weights.keyPlayers +
    (t2Rank < t1Rank ? 0.05 : -0.05) * weights.tossImpact
  );
  
  // Normalize to probabilities
  const total = t1Score + t2Score;
  let t1Prob = (t1Score / total) * 100;
  let t2Prob = (t2Score / total) * 100;
  
  // Ensure realistic probabilities (35-65% range)
  const maxProb = Math.max(t1Prob, t2Prob);
  if (maxProb > 65) {
    const factor = 65 / maxProb;
    t1Prob = 35 + (t1Prob - 35) * factor;
    t2Prob = 35 + (t2Prob - 35) * factor;
  }
  
  // Recalculate to ensure they sum to 100
  const sum = t1Prob + t2Prob;
  t1Prob = (t1Prob / sum) * 100;
  t2Prob = (t2Prob / sum) * 100;
  
  const predictedWinner = t1Prob >= t2Prob ? team1 : team2;
  const confidence = Math.abs(t1Prob - 50) * 2;
  
  return {
    team1,
    team2,
    venue,
    predicted_winner: predictedWinner,
    win_probability: {
      [team1]: parseFloat(t1Prob.toFixed(2)),
      [team2]: parseFloat(t2Prob.toFixed(2))
    },
    confidence_score: parseFloat(confidence.toFixed(2)),
    factors: {
      team1_squad_strength: Math.round(t1Squad * 100),
      team2_squad_strength: Math.round(t2Squad * 100),
      team1_h2h_win_rate: Math.round(t1H2H * 100),
      team2_h2h_win_rate: Math.round(t2H2H * 100),
      team1_venue_advantage: Math.round(t1Venue * 100),
      team2_venue_advantage: Math.round(t2Venue * 100),
      team1_recent_form: Math.round(t1Form * 100),
      team2_recent_form: Math.round(t2Form * 100),
      venue: venue,
      venue_home_team: homeTeam || 'Neutral'
    },
    methodology: 'Rule-Based Ensemble (Fallback)',
    source: 'javascript-fallback'
  };
}

/**
 * Get prediction for a single match
 */
async function predictMatch(team1, team2, venue, matchData = {}) {
  try {
    // Try ML model first
    const mlResult = await getMLPrediction(team1, team2, venue, matchData);
    if (mlResult && mlResult.predicted_winner) {
      return { ...mlResult, source: 'ml-model' };
    }
  } catch (err) {
    console.log('ML model failed, using fallback:', err.message);
  }
  
  // Fallback to rule-based
  return getRuleBasedPrediction(team1, team2, venue, matchData);
}

/**
 * Get all match predictions for IPL 2026
 */
async function predictAllMatches() {
  try {
    // Try Python ML model first
    const scriptPath = path.join(ML_DIR, 'ipl_2026_predictor.py');
    
    return new Promise((resolve, reject) => {
      const py = spawn('python', [scriptPath], {
        cwd: path.join(ML_DIR, '..'),
        timeout: 60000
      });
      
      let stdout = '';
      let stderr = '';
      
      py.stdout.on('data', (d) => (stdout += d.toString()));
      py.stderr.on('data', (d) => (stderr += d.toString()));
      
      py.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            // Fall through to JS implementation
            resolve(getJSAllPredictions());
          }
        } else {
          resolve(getJSAllPredictions());
        }
      });
      
      py.on('error', () => {
        resolve(getJSAllPredictions());
      });
    });
  } catch (err) {
    return getJSAllPredictions();
  }
}

/**
 * JavaScript implementation for all predictions
 */
function getJSAllPredictions() {
  const schedulePath = path.join(DATA_DIR, 'ipl_2026_matches_schedule.json');
  
  let schedule = [];
  try {
    schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  } catch (e) {
    console.error('Failed to load schedule:', e);
    return { success: false, error: 'Failed to load schedule' };
  }
  
  const predictions = [];
  
  for (const match of schedule) {
    if (match.Playoff) continue;
    const matchup = match.Matchup || '';
    const [team1, team2] = matchup.split(' vs ');
    const venue = match.Venue || '';
    
    if (team1 && team2) {
      const prediction = getRuleBasedPrediction(team1, team2, venue, {
        match_id: match.Match,
        date: match.Date
      });
      predictions.push(prediction);
    }
  }
  
  return {
    success: true,
    total_matches: predictions.length,
    predictions,
    model_info: {
      type: 'Ensemble Weighted ML',
      version: '2026.1',
      weights: {
        squad_strength: 0.25,
        head_to_head: 0.20,
        venue_advantage: 0.15,
        recent_form: 0.15,
        key_players: 0.15,
        toss_impact: 0.10
      },
      source: 'javascript-implementation'
    }
  };
}

/**
 * Get detailed analysis for a team
 */
function getTeamAnalysis(teamCode) {
  const analysisPath = path.join(DATA_DIR, 'team_analysis_2026.json');
  
  try {
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    const teamData = analysis.team_rankings_2026?.[teamCode];
    
    if (!teamData) {
      return { error: 'Team not found' };
    }
    
    return {
      team: teamCode,
      ...teamData,
      squad_score: SQUAD_SCORES[teamCode],
      h2h_stats: H2H_DATA[teamCode] || {}
    };
  } catch (e) {
    return { error: 'Failed to load analysis' };
  }
}

/**
 * Get match factors breakdown
 */
function getMatchFactors(team1, team2, venue) {
  const prediction = getRuleBasedPrediction(team1, team2, venue);
  
  return {
    team1: {
      code: team1,
      name: getTeamName(team1),
      squad_strength: prediction.factors.team1_squad_strength,
      h2h_win_rate: prediction.factors.team1_h2h_win_rate,
      venue_advantage: prediction.factors.team1_venue_advantage,
      recent_form: prediction.factors.team1_recent_form
    },
    team2: {
      code: team2,
      name: getTeamName(team2),
      squad_strength: prediction.factors.team2_squad_strength,
      h2h_win_rate: prediction.factors.team2_h2h_win_rate,
      venue_advantage: prediction.factors.team2_venue_advantage,
      recent_form: prediction.factors.team2_recent_form
    },
    venue: {
      name: venue,
      home_team: VENUE_HOME_TEAM[venue] || 'Neutral',
      impact: VENUE_HOME_TEAM[venue] ? 'Moderate home advantage (10-20%)' : 'Neutral venue - even playing field'
    },
    weights: {
      squad_strength: '25% - Overall team quality and depth',
      head_to_head: '20% - Historical performance against opponent',
      venue_advantage: '15% - Home/away/neutral venue impact',
      recent_form: '15% - Current team momentum',
      key_players: '15% - Impact player performances',
      toss_impact: '10% - Toss and chasing/defending factors'
    }
  };
}

function getTeamName(code) {
  const names = {
    MI: 'Mumbai Indians', GT: 'Gujarat Titans', DC: 'Delhi Capitals',
    KKR: 'Kolkata Knight Riders', SRH: 'Sunrisers Hyderabad',
    RCB: 'Royal Challengers Bengaluru', CSK: 'Chennai Super Kings',
    RR: 'Rajasthan Royals', LSG: 'Lucknow Super Giants', PBKS: 'Punjab Kings'
  };
  return names[code] || code;
}

module.exports = {
  predictMatch,
  predictAllMatches,
  getTeamAnalysis,
  getMatchFactors,
  getRuleBasedPrediction,
  SQUAD_SCORES,
  H2H_DATA,
  VENUE_HOME_TEAM
};
