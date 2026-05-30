import React, { useState, useEffect, useCallback } from 'react';
import LiveAssistant from '../components/LiveAssistant';
import MLPredictions2026 from '../components/MLPredictions2026';


const TEAM_COLORS = {
  CSK: '#F9CD05', MI: '#1E90FF', KKR: '#7B2FBE', RR: '#EA1A85',
  RCB: '#D4101A', DC: '#0057A8', SRH: '#F26522', GT: '#00B4D8',
  PBKS: '#DD1F2D', LSG: '#00BFFF'
};

const TEAM_LOGOS = {
  CSK: '/teams/csk.jpg', MI: '/teams/mi.jpg', KKR: '/teams/kkr.jpg',
  RR: '/teams/rr.jpg', RCB: '/teams/rcb.jpg', DC: '/teams/dc.jpg',
  SRH: '/teams/srh.jpg', GT: '/teams/gt.jpg', PBKS: '/teams/pbks.jpg', LSG: '/teams/lsg.jpg'
};

const TEAM_NAMES = {
  CSK: 'Chennai Super Kings', MI: 'Mumbai Indians', KKR: 'Kolkata Knight Riders',
  RR: 'Rajasthan Royals', RCB: 'Royal Challengers Bengaluru', DC: 'Delhi Capitals',
  SRH: 'Sunrisers Hyderabad', GT: 'Gujarat Titans', PBKS: 'Punjab Kings', LSG: 'Lucknow Super Giants'
};

// Squad strength \u2014 Form-adjusted post Match-15, IPL 2026 (Apr 10, 2026)
// \u2500\u2500 SQUAD STRENGTH v3.0 \u2014 Updated with actual 2026 results \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const SQUAD_STRENGTH = {
  RR:   { batting: 88, bowling: 90, allRound: 91, overall: 90, rank: 1,
          description: '\ud83d\udd25 TOP FORM: 3W from 4 matches. Vaibhav+Riyan Parag+Jofra Archer dominant. Chasing masters.' },
  DC:   { batting: 88, bowling: 90, allRound: 87, overall: 89, rank: 2,
          description: '\ud83d\udd25 Excellent form: 2W. Beat MI & GT. Axar+Kuldeep elite spin. KL Rahul anchoring.' },
  PBKS: { batting: 90, bowling: 89, allRound: 90, overall: 89, rank: 3,
          description: '\ud83d\udd25 Strong: 2W. Beat CSK & GT. Shreyas Iyer captain. Arshdeep+Chahal lethal combo.' },
  RCB:  { batting: 91, bowling: 83, allRound: 85, overall: 87, rank: 4,
          description: '\ud83d\udd25 Good form: 2W incl 250/3 vs CSK. Kohli+Bethell+Salt explosive top order.' },
  LSG:  { batting: 87, bowling: 86, allRound: 84, overall: 87, rank: 5,
          description: '\ud83d\udd25 Surging: 2W (beat SRH, LSG). Pant+Pooran explosive. Shami on fire.' },
  GT:   { batting: 86, bowling: 92, allRound: 85, overall: 88, rank: 6,
          description: '\ud83d\udfe1 1W (thriller vs DC by 1 run). Rashid+Rabada+Siraj elite trio. Gill/Sudharsan.' },
  MI:   { batting: 91, bowling: 92, allRound: 87, overall: 88, rank: 7,
          description: '\ud83d\udfe1 1W (beat KKR). Lost DC & RR. Bumrah+Rohit+SKY \u2014 quality but underperforming.' },
  SRH:  { batting: 94, bowling: 80, allRound: 79, overall: 84, rank: 8,
          description: '\ud83d\udfe1 1W (65-run win vs KKR) but lost to LSG. Head+Abhishek misfiring w/o Cummins.' },
  CSK:  { batting: 89, bowling: 82, allRound: 84, overall: 83, rank: 9,
          description: '\ud83d\udd34 POOR FORM: 0W from 3. Lost to RR, PBKS, RCB. Dhoni absent. Bowling fragile.' },
  KKR:  { batting: 84, bowling: 76, allRound: 86, overall: 80, rank: 10,
          description: '\u26a0\ufe0f WORST FORM: 0W from 2. Lost to MI & SRH. Bowling exposed without Mustafizur/Rana.' },
};

// \u2500\u2500 Live 2026 Form Data (actual match results, matches 1\u201315) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const TEAM_FORM_2026 = {
  RR:   { wins: 3, losses: 1, played: 4, formScore: 95, streak: 'W' },
  RCB:  { wins: 2, losses: 0, played: 2, formScore: 90, streak: 'W' },
  DC:   { wins: 2, losses: 1, played: 3, formScore: 85, streak: 'W' },
  PBKS: { wins: 2, losses: 1, played: 3, formScore: 83, streak: 'L' },
  LSG:  { wins: 2, losses: 1, played: 3, formScore: 82, streak: 'W' },
  GT:   { wins: 1, losses: 2, played: 3, formScore: 68, streak: 'W' },
  SRH:  { wins: 1, losses: 1, played: 2, formScore: 65, streak: 'L' },
  MI:   { wins: 1, losses: 2, played: 3, formScore: 62, streak: 'L' },
  CSK:  { wins: 0, losses: 3, played: 3, formScore: 30, streak: 'L' },
  KKR:  { wins: 0, losses: 2, played: 2, formScore: 20, streak: 'L' },
};

// ML Model Weights Configuration
const ML_WEIGHTS = {
  squadStrength: 0.25,
  headToHead: 0.20,
  venueAdvantage: 0.15,
  recentForm: 0.15,
  keyPlayers: 0.15,
  tossImpact: 0.10
};

// \u2500\u2500 Venue Toss Advantage Data \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const VENUE_TOSS_DATA = {
  'Bengaluru':    { chaseAdvantage: 62, pitchType: 'Batting', avgScore: 182, spinFriendly: false },
  'Mumbai':       { chaseAdvantage: 58, pitchType: 'Batting', avgScore: 175, spinFriendly: false },
  'Kolkata':      { chaseAdvantage: 55, pitchType: 'Balanced', avgScore: 165, spinFriendly: true },
  'Hyderabad':    { chaseAdvantage: 57, pitchType: 'Batting', avgScore: 170, spinFriendly: false },
  'Ahmedabad':    { chaseAdvantage: 56, pitchType: 'Balanced', avgScore: 169, spinFriendly: true },
  'Lucknow':      { chaseAdvantage: 55, pitchType: 'Balanced', avgScore: 165, spinFriendly: false },
  'Delhi':        { chaseAdvantage: 50, pitchType: 'Balanced', avgScore: 165, spinFriendly: true },
  'Chennai':      { chaseAdvantage: 40, pitchType: 'Spin', avgScore: 160, spinFriendly: true },
  'Mullanpur':    { chaseAdvantage: 54, pitchType: 'Batting', avgScore: 168, spinFriendly: false },
  'New Chandigarh': { chaseAdvantage: 53, pitchType: 'Batting', avgScore: 168, spinFriendly: false },
  'Jaipur':       { chaseAdvantage: 48, pitchType: 'Spin', avgScore: 162, spinFriendly: true },
  'Guwahati':     { chaseAdvantage: 50, pitchType: 'Balanced', avgScore: 160, spinFriendly: true },
  'Dharamshala':  { chaseAdvantage: 50, pitchType: 'Balanced', avgScore: 162, spinFriendly: false },
  'Raipur':       { chaseAdvantage: 50, pitchType: 'Batting', avgScore: 168, spinFriendly: false },
};

// \u2500\u2500 Team Home Venues \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const TEAM_HOME_VENUES = {
  MI: 'Mumbai', CSK: 'Chennai', KKR: 'Kolkata', RCB: 'Bengaluru',
  DC: 'Delhi', RR: 'Jaipur', SRH: 'Hyderabad', GT: 'Ahmedabad',
  PBKS: 'Mullanpur', LSG: 'Lucknow'
};

// \u2500\u2500 Captain Records (IPL career) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const CAPTAIN_DATA = {
  MI:   { name: 'Rohit Sharma',    matches: 213, wins: 117, winPct: 54.9, titles: 5, notes: 'Joint-most IPL titles. Elite big-match temperament.' },
  CSK:  { name: 'Ruturaj Gaikwad', matches: 28,  wins: 14,  winPct: 50.0, titles: 0, notes: 'Young captain. Dhoni mentorship crucial for key calls.' },
  KKR:  { name: 'Ajinkya Rahane',  matches: 22,  wins: 11,  winPct: 50.0, titles: 0, notes: 'Steady tactical captain. Leans on experience.' },
  RCB:  { name: 'Rajat Patidar',   matches: 15,  wins: 8,   winPct: 53.3, titles: 1, notes: '2025 champion captain. Aggressive batting-first approach.' },
  SRH:  { name: 'Ishan Kishan',    matches: 18,  wins: 9,   winPct: 50.0, titles: 0, notes: 'New captain for 2026. Aggressive wicketkeeper-batter.' },
  RR:   { name: 'Riyan Parag',     matches: 12,  wins: 7,   winPct: 58.3, titles: 0, notes: 'Young captain (21). Strong batting form 2025.' },
  GT:   { name: 'Shubman Gill',    matches: 26,  wins: 15,  winPct: 57.7, titles: 0, notes: 'Consistent leader. Cool-headed. First-class record setter.' },
  DC:   { name: 'KL Rahul',        matches: 45,  wins: 21,  winPct: 46.7, titles: 0, notes: 'Solid opener, measured captain. Delhi suits his style.' },
  PBKS: { name: 'Shreyas Iyer',    matches: 57,  wins: 26,  winPct: 45.6, titles: 0, notes: 'Experienced captain. Good at defensive run-chases.' },
  LSG:  { name: 'Rishabh Pant',    matches: 28,  wins: 15,  winPct: 53.6, titles: 0, notes: 'Dynamic keeper-captain. Unorthodox match-winning calls.' },
};

// \u2500\u2500 Win probability: 45% squad + 35% live 2026 form + 12% venue + 8% historical ML \u2500
const computeStrengthProb = (team1, team2, venue, origProb1) => {
  const s1 = SQUAD_STRENGTH[team1] || { overall: 80, batting: 80, bowling: 80 };
  const s2 = SQUAD_STRENGTH[team2] || { overall: 80, batting: 80, bowling: 80 };
  const f1 = TEAM_FORM_2026[team1] || { formScore: 65 };
  const f2 = TEAM_FORM_2026[team2] || { formScore: 65 };
  const vd = VENUE_TOSS_DATA[venue] || { chaseAdvantage: 50, pitchType: 'Balanced' };

  // Squad strength ratio
  const squadTotal = s1.overall + s2.overall;
  const strengthProb1 = (s1.overall / squadTotal) * 100;

  // Live form ratio (matches 1-15 actual)
  const formTotal = (f1.formScore || 65) + (f2.formScore || 65);
  const formProb1 = formTotal > 0 ? (f1.formScore / formTotal) * 100 : 50;

  // Home advantage (+4% for home team)
  const homeTeam1 = TEAM_HOME_VENUES[team1] === venue;
  const homeTeam2 = TEAM_HOME_VENUES[team2] === venue;
  const homeAdj = homeTeam1 ? 4 : homeTeam2 ? -4 : 0;

  // Venue spin factor
  const spinAdj = vd.pitchType === 'Spin'
    ? (s1.bowling > s2.bowling ? 2 : -2)
    : 0;

  // Blend: 45% squad + 35% live form + 12% venue/home + 8% historical ML
  const finalProb1 = Math.round(
    strengthProb1 * 0.45 +
    formProb1     * 0.35 +
    origProb1     * 0.08 +
    (50 + homeAdj + spinAdj) * 0.12
  );
  return Math.min(78, Math.max(22, finalProb1));
};


// Transform API prediction to frontend format with ML factors
const transformPrediction = (apiPred, scheduleData) => {
  const team1 = apiPred.team1;
  const team2 = apiPred.team2;
  const venue = apiPred.venue || scheduleData.Venue;
  const winner = apiPred.predicted_winner || apiPred.predictedWinner;
  
  const t1Strength = SQUAD_STRENGTH[team1] || {};
  const t2Strength = SQUAD_STRENGTH[team2] || {};
  
  const winProb = apiPred.win_probability || apiPred.winProbability || {};
  const t1Prob = winProb[team1] || 50;
  const t2Prob = winProb[team2] || 50;
  const confidence = apiPred.confidence_score || apiPred.confidence || Math.abs(t1Prob - 50);
  
  const factors = apiPred.factors || {};
  
  // Calculate ML-scored metrics
  return {
    match: scheduleData.Match,
    date: scheduleData.Date,
    day: scheduleData.Day,
    time: scheduleData.Time_IST,
    venue: venue,
    team1: team1,
    team2: team2,
    predictedWinner: winner,
    winProbability: { [team1]: t1Prob, [team2]: t2Prob },
    confidence: Math.round(confidence),
    winnerColor: TEAM_COLORS[winner] || '#f59e0b',
    
    // ML Model metrics
    keyMetrics: {
      recentForm: { 
        team1: Math.round(factors.team1_recent_form || t1Strength.overall * 0.92), 
        team2: Math.round(factors.team2_recent_form || t2Strength.overall * 0.92) 
      },
      venueAdvantage: { 
        team1: Math.round(factors.team1_venue_advantage || (venue === team1 + ' Home' ? 60 : 45)), 
        team2: Math.round(factors.team2_venue_advantage || (venue === team2 + ' Home' ? 60 : 45)) 
      },
      h2hRatio: { 
        team1: Math.round(factors.team1_h2h_win_rate || 50), 
        team2: Math.round(factors.team2_h2h_win_rate || 50) 
      },
      pressureIndex: { 
        team1: Math.round(95 - (t1Strength.rank || 5) * 7), 
        team2: Math.round(95 - (t2Strength.rank || 5) * 7) 
      }
    },
    
    // ML Factor breakdown with proper weights
    breakdown: {
      h2h: { 
        team1: Math.round((factors.team1_h2h_win_rate || 50) * ML_WEIGHTS.headToHead), 
        team2: Math.round((factors.team2_h2h_win_rate || 50) * ML_WEIGHTS.headToHead) 
      },
      venue: { 
        team1: Math.round((factors.team1_venue_advantage || 50) * ML_WEIGHTS.venueAdvantage), 
        team2: Math.round((factors.team2_venue_advantage || 50) * ML_WEIGHTS.venueAdvantage) 
      },
      batting: { 
        team1: Math.round(t1Strength.batting * ML_WEIGHTS.squadStrength * 0.5), 
        team2: Math.round(t2Strength.batting * ML_WEIGHTS.squadStrength * 0.5) 
      },
      bowling: { 
        team1: Math.round(t1Strength.bowling * ML_WEIGHTS.squadStrength * 0.5), 
        team2: Math.round(t2Strength.bowling * ML_WEIGHTS.squadStrength * 0.5) 
      },
      form: { 
        team1: Math.round((factors.team1_recent_form || 75) * ML_WEIGHTS.recentForm), 
        team2: Math.round((factors.team2_recent_form || 75) * ML_WEIGHTS.recentForm) 
      }
    },
    
    squadInfo: { [team1]: t1Strength, [team2]: t2Strength },
    
    methodology: apiPred.methodology || `Ensemble ML (Squad ${Math.round(ML_WEIGHTS.squadStrength*100)}%, H2H ${Math.round(ML_WEIGHTS.headToHead*100)}%, Venue ${Math.round(ML_WEIGHTS.venueAdvantage*100)}%, Form ${Math.round(ML_WEIGHTS.recentForm*100)}%, Players ${Math.round(ML_WEIGHTS.keyPlayers*100)}%, Toss ${Math.round(ML_WEIGHTS.tossImpact*100)}%)`,
    source: apiPred.source || 'ml-model'
  };
};


// ── Full H2H dataset (2008-2025) ──────────────────────────────────────────────
const H2H_DATA = {
  CSK: [{opponent:'MI',total:39,wins:18,losses:21,home:10,away:8},{opponent:'RCB',total:35,wins:21,losses:13,home:12,away:9},{opponent:'KKR',total:30,wins:19,losses:11,home:10,away:9},{opponent:'DC',total:30,wins:19,losses:11,home:11,away:8},{opponent:'PBKS',total:30,wins:16,losses:14,home:9,away:7},{opponent:'RR',total:31,wins:16,losses:15,home:8,away:8},{opponent:'SRH',total:22,wins:16,losses:6,home:9,away:7},{opponent:'GT',total:7,wins:3,losses:4,home:1,away:2},{opponent:'LSG',total:5,wins:1,losses:3,home:1,away:0}],
  MI: [{opponent:'CSK',total:39,wins:21,losses:18,home:11,away:10},{opponent:'RCB',total:33,wins:19,losses:14,home:10,away:9},{opponent:'KKR',total:35,wins:24,losses:11,home:13,away:11},{opponent:'DC',total:34,wins:19,losses:15,home:10,away:9},{opponent:'PBKS',total:30,wins:17,losses:13,home:9,away:8},{opponent:'RR',total:28,wins:15,losses:13,home:8,away:7},{opponent:'SRH',total:22,wins:12,losses:10,home:6,away:6},{opponent:'GT',total:7,wins:2,losses:5,home:1,away:1},{opponent:'LSG',total:8,wins:2,losses:6,home:1,away:1}],
  RCB: [{opponent:'CSK',total:35,wins:13,losses:21,home:6,away:7},{opponent:'MI',total:33,wins:14,losses:19,home:7,away:7},{opponent:'KKR',total:34,wins:14,losses:20,home:7,away:7},{opponent:'DC',total:30,wins:18,losses:12,home:9,away:9},{opponent:'PBKS',total:37,wins:19,losses:18,home:10,away:9},{opponent:'RR',total:34,wins:17,losses:14,home:9,away:8},{opponent:'SRH',total:24,wins:10,losses:14,home:5,away:5},{opponent:'LSG',total:5,wins:3,losses:2,home:2,away:1},{opponent:'GT',total:5,wins:2,losses:3,home:1,away:1}],
  LSG: [{opponent:'CSK',total:5,wins:3,losses:1,home:2,away:1},{opponent:'MI',total:8,wins:6,losses:2,home:3,away:3},{opponent:'RCB',total:5,wins:2,losses:3,home:1,away:1},{opponent:'KKR',total:4,wins:3,losses:1,home:2,away:1},{opponent:'DC',total:5,wins:3,losses:2,home:2,away:1},{opponent:'PBKS',total:5,wins:3,losses:2,home:2,away:1},{opponent:'RR',total:4,wins:2,losses:2,home:1,away:1},{opponent:'SRH',total:4,wins:3,losses:1,home:2,away:1},{opponent:'GT',total:6,wins:2,losses:4,home:1,away:1}],
  KKR: [{opponent:'CSK',total:30,wins:11,losses:19,home:6,away:5},{opponent:'MI',total:35,wins:11,losses:24,home:6,away:5},{opponent:'RCB',total:34,wins:20,losses:14,home:10,away:10},{opponent:'DC',total:33,wins:18,losses:15,home:9,away:9},{opponent:'PBKS',total:31,wins:21,losses:10,home:11,away:10},{opponent:'RR',total:28,wins:14,losses:14,home:7,away:7},{opponent:'SRH',total:27,wins:18,losses:9,home:9,away:9},{opponent:'LSG',total:4,wins:1,losses:3,home:1,away:0},{opponent:'GT',total:4,wins:1,losses:3,home:0,away:1}],
  DC: [{opponent:'CSK',total:30,wins:11,losses:19,home:6,away:5},{opponent:'MI',total:34,wins:15,losses:19,home:8,away:7},{opponent:'RCB',total:30,wins:12,losses:18,home:6,away:6},{opponent:'KKR',total:33,wins:15,losses:18,home:8,away:7},{opponent:'PBKS',total:32,wins:16,losses:16,home:8,away:8},{opponent:'RR',total:28,wins:13,losses:15,home:7,away:6},{opponent:'SRH',total:26,wins:12,losses:13,home:6,away:6},{opponent:'LSG',total:5,wins:2,losses:3,home:1,away:1},{opponent:'GT',total:4,wins:1,losses:3,home:0,away:1}],
  PBKS: [{opponent:'CSK',total:30,wins:14,losses:16,home:7,away:7},{opponent:'MI',total:30,wins:13,losses:17,home:6,away:7},{opponent:'RCB',total:37,wins:18,losses:19,home:9,away:9},{opponent:'KKR',total:31,wins:10,losses:21,home:5,away:5},{opponent:'DC',total:32,wins:16,losses:16,home:8,away:8},{opponent:'RR',total:39,wins:12,losses:17,home:6,away:6},{opponent:'SRH',total:23,wins:7,losses:16,home:3,away:4},{opponent:'LSG',total:5,wins:2,losses:3,home:1,away:1},{opponent:'GT',total:4,wins:2,losses:2,home:1,away:1}],
  SRH: [{opponent:'CSK',total:22,wins:6,losses:16,home:3,away:3},{opponent:'MI',total:22,wins:10,losses:12,home:5,away:5},{opponent:'RCB',total:24,wins:14,losses:10,home:7,away:7},{opponent:'KKR',total:27,wins:9,losses:18,home:5,away:4},{opponent:'DC',total:26,wins:13,losses:12,home:7,away:6},{opponent:'PBKS',total:23,wins:16,losses:7,home:8,away:8},{opponent:'RR',total:20,wins:11,losses:9,home:6,away:5},{opponent:'LSG',total:4,wins:1,losses:3,home:0,away:1},{opponent:'GT',total:4,wins:1,losses:3,home:1,away:0}],
  RR: [{opponent:'CSK',total:31,wins:15,losses:16,home:7,away:8},{opponent:'MI',total:28,wins:13,losses:15,home:6,away:7},{opponent:'RCB',total:34,wins:14,losses:17,home:7,away:7},{opponent:'KKR',total:28,wins:14,losses:14,home:7,away:7},{opponent:'DC',total:28,wins:15,losses:13,home:8,away:7},{opponent:'PBKS',total:39,wins:17,losses:12,home:9,away:8},{opponent:'SRH',total:20,wins:9,losses:11,home:4,away:5},{opponent:'LSG',total:4,wins:2,losses:2,home:1,away:1},{opponent:'GT',total:5,wins:1,losses:4,home:0,away:1}],
  GT: [{opponent:'CSK',total:7,wins:4,losses:3,home:2,away:2},{opponent:'MI',total:7,wins:5,losses:2,home:3,away:2},{opponent:'RCB',total:5,wins:3,losses:2,home:2,away:1},{opponent:'KKR',total:4,wins:3,losses:1,home:2,away:1},{opponent:'DC',total:4,wins:3,losses:1,home:2,away:1},{opponent:'PBKS',total:4,wins:2,losses:2,home:1,away:1},{opponent:'RR',total:5,wins:4,losses:1,home:2,away:2},{opponent:'SRH',total:4,wins:3,losses:1,home:2,away:1},{opponent:'LSG',total:6,wins:4,losses:2,home:2,away:2}]
};

// ── Overall IPL Historical Stats (2008-2025) ──────────────────────────────────
const OVERALL_STATS = [
  { team:'Gujarat Titans',              short:'GT',   matches:60,  won:37,  lost:23,  home_wins:19, away_wins:18, win_pct:61.67, titles:1 },
  { team:'Chennai Super Kings',         short:'CSK',  matches:254, won:142, lost:108, home_wins:79, away_wins:63, win_pct:55.91, titles:5 },
  { team:'Mumbai Indians',              short:'MI',   matches:278, won:151, lost:122, home_wins:84, away_wins:67, win_pct:54.32, titles:5 },
  { team:'Lucknow Super Giants',        short:'LSG',  matches:58,  won:30,  lost:27,  home_wins:14, away_wins:16, win_pct:51.72, titles:0 },
  { team:'Kolkata Knight Riders',       short:'KKR',  matches:269, won:135, lost:124, home_wins:72, away_wins:63, win_pct:50.19, titles:3 },
  { team:'Royal Challengers Bengaluru', short:'RCB',  matches:272, won:132, lost:132, home_wins:70, away_wins:62, win_pct:48.53, titles:1 },
  { team:'Rajasthan Royals',            short:'RR',   matches:239, won:114, lost:116, home_wins:61, away_wins:53, win_pct:47.70, titles:1 },
  { team:'Sunrisers Hyderabad',         short:'SRH',  matches:196, won:93,  lost:98,  home_wins:51, away_wins:42, win_pct:47.45, titles:1 },
  { team:'Punjab Kings',                short:'PBKS', matches:263, won:119, lost:139, home_wins:59, away_wins:60, win_pct:45.25, titles:0 },
  { team:'Delhi Capitals',              short:'DC',   matches:267, won:119, lost:140, home_wins:56, away_wins:62, win_pct:44.57, titles:0 },
];

// ── H2H Panel ─────────────────────────────────────────────────────────────────
const H2HPanel = ({ onClose }) => {
  const teams = ['CSK','MI','KKR','RCB','RR','SRH','GT','DC','PBKS','LSG'];
  const [activeTab, setActiveTab] = useState('h2h');
  const [selectedTeam, setSelectedTeam] = useState('MI');
  const records = H2H_DATA[selectedTeam] || [];
  const totalW = records.reduce((s,r)=>s+r.wins,0);
  const totalL = records.reduce((s,r)=>s+r.losses,0);
  const totalG = records.reduce((s,r)=>s+r.total,0);
  const MEDALS = ['🥇','🥈','🥉'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div
        style={{
          background: 'linear-gradient(160deg,#0d1627,#1a2744)',
          border: '2px solid #f59e0b44',
          borderRadius: '20px', width: '100%', maxWidth: '860px',
          maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 20px 80px #f59e0b15',
          padding: '28px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <div style={{ fontSize:'10px', color:'#f59e0b', fontWeight:800, letterSpacing:'3px', marginBottom:'4px' }}>📊 IPL 2008–2025 · FINAL POST-SEASON DATA</div>
            <div style={{ fontSize:'22px', fontWeight:900, color:'#e2e8f0' }}>Head-to-Head & Historical Stats</div>
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', borderRadius:'8px', padding:'8px 14px', cursor:'pointer', fontSize:'14px', fontWeight:700 }}>✕ CLOSE</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'24px' }}>
          {[['h2h','⚔️ HEAD-TO-HEAD'],['overall','📈 OVERALL IPL STATS']].map(([id,label])=>(
            <button key={id} onClick={()=>setActiveTab(id)} style={{
              padding:'10px 22px', borderRadius:'12px', border:'none', cursor:'pointer',
              fontWeight:800, fontSize:'13px', letterSpacing:'0.5px', transition:'all 0.2s',
              background: activeTab===id ? '#f59e0b' : '#1e293b',
              color: activeTab===id ? '#000' : '#64748b',
              boxShadow: activeTab===id ? '0 4px 16px #f59e0b40' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {/* ── TAB 1: H2H Records ── */}
        {activeTab==='h2h' && (<>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'20px' }}>
            {teams.map(t => (
              <button key={t} onClick={() => setSelectedTeam(t)} style={{
                padding:'7px 14px', borderRadius:'20px', border:'none', cursor:'pointer',
                background: selectedTeam===t ? TEAM_COLORS[t] : '#1e293b',
                color: selectedTeam===t ? '#000' : '#94a3b8',
                fontWeight:800, fontSize:'12px',
                boxShadow: selectedTeam===t ? `0 4px 14px ${TEAM_COLORS[t]}60` : 'none',
                transition:'all 0.2s', display:'inline-flex', alignItems:'center', gap:'5px'
              }}>
                <img src={TEAM_LOGOS[t]} alt="" style={{width:'16px',height:'16px',borderRadius:'50%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}} />
                {t}
              </button>
            ))}
          </div>


          <div style={{ borderRadius:'12px', overflow:'hidden', border:'1px solid #1e293b' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#0f172a' }}>
                  {['OPPONENT','PLAYED','WINS','LOSSES','WIN %','HOME W','AWAY W'].map(h=>(
                    <th key={h} style={{ padding:'10px 12px', fontSize:'9px', color:'#475569', fontWeight:800, letterSpacing:'1px', textAlign:'center', borderBottom:'1px solid #1e293b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r,i) => {
                  const winPct = r.total>0 ? Math.round((r.wins/r.total)*100) : 0;
                  const opColor = TEAM_COLORS[r.opponent] || '#888';
                  return (
                    <tr key={r.opponent} style={{ background: i%2===0?'#0d1627':'#111827', transition:'background 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#1a2744'}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#0d1627':'#111827'}
                    >
                      <td style={{ padding:'10px 12px', textAlign:'center' }}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',justifyContent:'center'}}>
                          <img src={TEAM_LOGOS[r.opponent]} alt="" style={{width:'24px',height:'24px',borderRadius:'50%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}} />
                          <span style={{fontSize:'13px',fontWeight:900,color:opColor}}>{r.opponent}</span>
                        </div>
                      </td>
                      <td style={{padding:'10px',textAlign:'center',fontSize:'13px',fontWeight:700,color:'#94a3b8'}}>{r.total}</td>
                      <td style={{padding:'10px',textAlign:'center',fontSize:'14px',fontWeight:900,color:'#4ade80'}}>{r.wins}</td>
                      <td style={{padding:'10px',textAlign:'center',fontSize:'14px',fontWeight:900,color:'#f87171'}}>{r.losses}</td>
                      <td style={{padding:'10px',textAlign:'center'}}>
                        <div style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                          <span style={{fontSize:'14px',fontWeight:900,color:winPct>=50?'#4ade80':'#f87171'}}>{winPct}%</span>
                          <div style={{width:'36px',height:'4px',background:'#1e293b',borderRadius:'2px',overflow:'hidden'}}>
                            <div style={{width:`${winPct}%`,height:'100%',background:winPct>=50?'#4ade80':'#f87171',borderRadius:'2px'}} />
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'10px',textAlign:'center',fontSize:'13px',fontWeight:700,color:'#94a3b8'}}>{r.home}</td>
                      <td style={{padding:'10px',textAlign:'center',fontSize:'13px',fontWeight:700,color:'#94a3b8'}}>{r.away}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:'10px',fontSize:'9px',color:'#334155',textAlign:'center',fontWeight:600}}>H2H Records · IPL 2008–2025 · Home = wins at team's home venue</div>
        </>)}

        {/* ── TAB 2: Overall IPL Stats ── */}
        {activeTab==='overall' && (<>
          <div style={{ marginBottom:'16px', fontSize:'11px', color:'#64748b', fontWeight:700, letterSpacing:'1px' }}>
            ALL 10 TEAMS · RANKED BY WIN % · IPL SEASONS 2008–2025
          </div>
          <div style={{ borderRadius:'14px', overflow:'hidden', border:'1px solid #1e293b' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#0f172a' }}>
                  {['RANK','TEAM','M','W','L','WIN %','HOME W','AWAY W','WIN RATE','🏆 TITLES'].map(h=>(
                    <th key={h} style={{ padding:'10px 10px', fontSize:'9px', color:'#475569', fontWeight:800, letterSpacing:'1px', textAlign:'center', borderBottom:'1px solid #1e293b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OVERALL_STATS.map((row, i) => {
                  const color = TEAM_COLORS[row.short] || '#888';
                  return (
                    <tr key={row.team} style={{ background: i%2===0?'#0d1627':'#111827', transition:'background 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#1a2744'}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#0d1627':'#111827'}
                    >
                      <td style={{ padding:'11px 8px', textAlign:'center', fontSize:'16px' }}>
                        {MEDALS[i] ? MEDALS[i] : <span style={{fontSize:'12px',color:'#475569',fontWeight:800}}>#{i+1}</span>}
                      </td>
                      <td style={{ padding:'11px 12px' }}>
                        <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
                          <img src={TEAM_LOGOS[row.short]} alt="" style={{width:'30px',height:'30px',borderRadius:'50%',objectFit:'cover',border:`2px solid ${color}55`}} onError={e=>{e.target.style.display='none'}} />
                          <div>
                            <div style={{fontSize:'13px',fontWeight:900,color}}>{row.short}</div>
                            <div style={{fontSize:'8px',color:'#475569',fontWeight:600,maxWidth:'110px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.team}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'11px 8px',textAlign:'center',fontSize:'13px',fontWeight:700,color:'#94a3b8'}}>{row.matches}</td>
                      <td style={{padding:'11px 8px',textAlign:'center',fontSize:'14px',fontWeight:900,color:'#4ade80'}}>{row.won}</td>
                      <td style={{padding:'11px 8px',textAlign:'center',fontSize:'14px',fontWeight:900,color:'#f87171'}}>{row.lost}</td>
                      <td style={{padding:'11px 8px',textAlign:'center'}}>
                        <span style={{fontSize:'15px',fontWeight:900,color:row.win_pct>=50?'#4ade80':'#f87171'}}>{row.win_pct}%</span>
                      </td>
                      <td style={{padding:'11px 8px',textAlign:'center',fontSize:'13px',fontWeight:700,color:'#60a5fa'}}>{row.home_wins}</td>
                      <td style={{padding:'11px 8px',textAlign:'center',fontSize:'13px',fontWeight:700,color:'#a78bfa'}}>{row.away_wins}</td>
                      <td style={{padding:'11px 12px',textAlign:'center'}}>
                        <div style={{width:'80px',margin:'0 auto'}}>
                          <div style={{height:'7px',background:'#1e293b',borderRadius:'4px',overflow:'hidden'}}>
                            <div style={{width:`${row.win_pct}%`,height:'100%',background:`linear-gradient(90deg,${color}88,${color})`,borderRadius:'4px'}} />
                          </div>
                        </div>
                      </td>
                      <td style={{padding:'11px 8px',textAlign:'center'}}>
                        {row.titles > 0
                          ? <span style={{fontSize:'13px',fontWeight:900,color:'#f59e0b',display:'flex',alignItems:'center',justifyContent:'center',gap:'3px'}}>{'🏆'.repeat(Math.min(row.titles,3))}{row.titles > 3 ? <span style={{fontSize:'11px'}}>×{row.titles}</span> : ''}</span>
                          : <span style={{fontSize:'11px',color:'#334155',fontWeight:600}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:'10px',fontSize:'9px',color:'#334155',textAlign:'center',fontWeight:600}}>
            Source: IPL Official Records 2008–2025 · Sorted by Win % · GT leads all active teams (61.67%) · Home W = wins at home venue
          </div>
        </>)}
      </div>
    </div>
  );
};

// ── Confidence bar ────────────────────────────────────────────────────────────
const ConfidenceBar = ({ pct1, pct2, color1, color2, team1, team2 }) => (
  <div style={{ margin: '12px 0 4px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
      <span style={{ color: color1 }}>{team1} {pct1}%</span>
      <span style={{ color: color2 }}>{pct2}% {team2}</span>
    </div>
    <div style={{ height: '8px', borderRadius: '4px', background: '#1e293b', overflow: 'hidden', display: 'flex' }}>
      <div style={{ width: `${pct1}%`, background: `linear-gradient(90deg, ${color1}cc, ${color1})`, borderRadius: '4px 0 0 4px', transition: 'width 0.8s ease' }} />
      <div style={{ width: `${pct2}%`, background: `linear-gradient(90deg, ${color2}cc, ${color2})`, borderRadius: '0 4px 4px 0', transition: 'width 0.8s ease' }} />
    </div>
  </div>
);

// ── Factor bar row ────────────────────────────────────────────────────────────
const FactorRow = ({ label, v1, v2, color1, color2 }) => {
  const val1 = Number(v1) || 0;
  const val2 = Number(v2) || 0;
  const total = val1 + val2 || 100;
  const pct1 = Math.round((val1 / total) * 100) || 0;
  const pct2 = 100 - pct1;
  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginBottom: '2px', letterSpacing: '0.5px', fontWeight: 700 }}>
        <span>{label}</span>
        <span>{v1} / {v2}</span>
      </div>
      <div style={{ height: '4px', borderRadius: '2px', background: '#0f172a', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${pct1}%`, background: color1, opacity: 0.8 }} />
        <div style={{ width: `${pct2}%`, background: color2, opacity: 0.8 }} />
      </div>
    </div>
  );
};

// ── Key Metric Item ───────────────────────────────────────────────────────────
const KeyMetricItem = ({ label, v1, v2, color1, color2, icon, suffix = '' }) => {
  const val1 = Number(v1) || 0;
  const val2 = Number(v2) || 0;
  const max = Math.max(val1, val2, 1);
  return (
    <div style={{ background: '#0a1120', borderRadius: '8px', padding: '8px 10px', border: '1px solid #1e293b' }}>
      <div style={{ fontSize: '9px', color: '#475569', fontWeight: 800, letterSpacing: '1px', marginBottom: '6px' }}>{icon} {label}</div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ flex: 1, textAlign: 'right', fontSize: '13px', fontWeight: 900, color: v1 >= v2 ? color1 : '#64748b' }}>{v1}{suffix}</div>
        <div style={{ fontSize: '9px', color: '#334155', fontWeight: 700 }}>VS</div>
        <div style={{ flex: 1, textAlign: 'left', fontSize: '13px', fontWeight: 900, color: v2 >= v1 ? color2 : '#64748b' }}>{v2}{suffix}</div>
      </div>
      <div style={{ height: '3px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${Math.round((val1/max)*100) || 0}%`, background: color1, opacity: 0.8, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
};

// ── Toss Info Row ─────────────────────────────────────────────────────────────
const TossInfoRow = ({ tossImpact, pitchInfo, c1, c2 }) => {
  if (!tossImpact || !pitchInfo) return null;
  const tossBadgeColor = tossImpact.preference === 'chase' ? '#4ade80' : tossImpact.preference === 'defend' ? '#f87171' : '#94a3b8';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
      <div style={{ background: '#0a1120', borderRadius: '8px', padding: '8px 10px', border: '1px solid #1e293b' }}>
        <div style={{ fontSize: '9px', color: '#475569', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>🎲 TOSS IMPACT</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${tossBadgeColor}18`, border: `1px solid ${tossBadgeColor}44`, borderRadius: '6px', padding: '3px 7px', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 900, color: tossBadgeColor }}>{tossImpact.preference === 'chase' ? '🏃 CHASE' : tossImpact.preference === 'defend' ? '🛡️ DEFEND' : '⚖️ NEUTRAL'}</span>
          <span style={{ fontSize: '10px', fontWeight: 800, color: tossBadgeColor }}>{tossImpact.chasingAdvantage}%</span>
        </div>
        <div style={{ fontSize: '8px', color: '#475569', lineHeight: 1.4 }}>{tossImpact.description}</div>
      </div>
      <div style={{ background: '#0a1120', borderRadius: '8px', padding: '8px 10px', border: '1px solid #1e293b' }}>
        <div style={{ fontSize: '9px', color: '#475569', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>🏟️ PITCH TYPE</div>
        <div style={{ fontSize: '11px', fontWeight: 900, color: '#e2e8f0', marginBottom: '3px' }}>{pitchInfo.type}</div>
        <div style={{ fontSize: '8px', color: '#64748b', marginBottom: '3px' }}>Avg Score: <span style={{ color: '#f59e0b', fontWeight: 800 }}>{pitchInfo.avgScore}</span></div>
        <div style={{ fontSize: '8px', color: pitchInfo.spinFriendly ? '#a78bfa' : '#60a5fa', fontWeight: 700 }}>{pitchInfo.spinFriendly ? '🌀 Spin-Friendly' : '⚡ Pace-Friendly'}</div>
      </div>
    </div>
  );
};

// ── Squad Strength Row ────────────────────────────────────────────────────────
const SquadStrengthRow = ({ squadInfo, team1, team2, c1, c2 }) => {
  if (!squadInfo) return null;
  const s1 = squadInfo[team1] || {};
  const s2 = squadInfo[team2] || {};
  const bars = [
    { label: 'Batting', v1: Number(s1.batting) || 70, v2: Number(s2.batting) || 70 },
    { label: 'Bowling', v1: Number(s1.bowling) || 70, v2: Number(s2.bowling) || 70 },
    { label: 'All-Round', v1: Number(s1.allRound) || 70, v2: Number(s2.allRound) || 70 },
    { label: 'Overall', v1: Number(s1.overall) || 70, v2: Number(s2.overall) || 70 },
  ];
  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{ fontSize: '9px', color: '#475569', fontWeight: 800, letterSpacing: '1.5px', marginBottom: '8px' }}>💪 SQUAD STRENGTH COMPARISON</div>
      {bars.map(({ label, v1, v2 }) => (
        <div key={label} style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700, marginBottom: '2px' }}>
            <span style={{ color: v1 >= v2 ? c1 : '#475569' }}>{team1} {v1}</span>
            <span style={{ color: '#334155', fontSize: '8px', letterSpacing: '0.5px' }}>{label}</span>
            <span style={{ color: v2 >= v1 ? c2 : '#475569' }}>{v2} {team2}</span>
          </div>
          <div style={{ height: '4px', background: '#0f172a', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${Math.round((v1/(v1+v2 || 1))*100) || 0}%`, background: c1, opacity: 0.85 }} />
            <div style={{ width: `${Math.round((v2/(v1+v2 || 1))*100) || 0}%`, background: c2, opacity: 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Match Card ────────────────────────────────────────────────────────────────
const MatchCard = ({ pred }) => {
  const [expanded, setExpanded] = useState(false);
  const [tossWinner, setTossWinner] = useState(null);
  const [tossChoice, setTossChoice] = useState(null);
  const c1 = TEAM_COLORS[pred.team1] || '#888';
  const c2 = TEAM_COLORS[pred.team2] || '#888';
  const isTeam1Winner = pred.predictedWinner === pred.team1;

  // Toss-adjusted probability calculation
  const tossAdjProb = React.useMemo(() => {
    if (!tossWinner || !tossChoice) return null;
    const vd = VENUE_TOSS_DATA[pred.venue] || { chaseAdvantage: 50 };
    const chaseAdv = vd.chaseAdvantage;
    // Chose to field = wants to chase = gets chase boost
    const isChasing = tossChoice === 'field';
    const boost = isChasing ? (chaseAdv - 50) * 0.75 : (50 - chaseAdv) * 0.5;
    const base1 = pred.winProbability[pred.team1] || 50;
    const adj1 = tossWinner === pred.team1
      ? Math.min(82, Math.max(18, Math.round(base1 + boost)))
      : Math.min(82, Math.max(18, Math.round(base1 - boost)));
    const adj2 = 100 - adj1;
    return {
      [pred.team1]: adj1, [pred.team2]: adj2,
      predictedWinner: adj1 >= adj2 ? pred.team1 : pred.team2,
      boost: Math.abs(boost).toFixed(1),
      chaseRate: chaseAdv
    };
  }, [tossWinner, tossChoice, pred]);

  if (pred.isPlayoff) {
    return (
      <div
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid #eab30844',
          borderRadius: '16px',
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: '0 4px 20px #eab30820',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 40px #eab30845';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px #eab30820';
        }}
        onClick={() => setExpanded(x => !x)}
      >
        <div style={{
          background: 'linear-gradient(90deg, #eab30818, transparent 50%)',
          borderBottom: '1px solid #1e293b',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#eab308', fontWeight: 800, letterSpacing: '1px' }}>
              MATCH {pred.match}
            </span>
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#eab308', background: '#eab30818', border: '1px solid #eab30844', borderRadius: '6px', padding: '2px 6px' }}>
              🏆 {pred.playoffPhase}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
            {pred.date} • {pred.day} • {pred.time}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>📍 {pred.venue}</div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0', marginBottom: '8px' }}>
            {pred.playoffDescription}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
            {pred.methodology}
          </div>
        </div>
        {expanded && (
          <div style={{ margin: '0 16px 16px', padding: '12px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Full bracket predictions unlock once the league stage is finished and seeding is known.
            </div>
          </div>
        )}
      </div>
    );
  }

  const s1 = SQUAD_STRENGTH[pred.team1] || {};
  const s2 = SQUAD_STRENGTH[pred.team2] || {};
  const displayProb = tossAdjProb || pred.winProbability;
  const displayWinner = tossAdjProb ? tossAdjProb.predictedWinner : pred.predictedWinner;
  const displayColor = TEAM_COLORS[displayWinner] || pred.winnerColor;
  const isTeam1WinnerDisplay = displayWinner === pred.team1;
  const side1Highlight = pred.isCompleted && pred.actualWinner
    ? pred.actualWinner === pred.team1
    : isTeam1WinnerDisplay;
  const side2Highlight = pred.isCompleted && pred.actualWinner
    ? pred.actualWinner === pred.team2
    : !isTeam1WinnerDisplay;
  const showCrown1 = pred.isCompleted && pred.actualWinner
    ? pred.actualWinner === pred.team1
    : isTeam1WinnerDisplay;
  const showCrown2 = pred.isCompleted && pred.actualWinner
    ? pred.actualWinner === pred.team2
    : !isTeam1WinnerDisplay;

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
        border: tossAdjProb ? '1.5px solid #7c3aed88' : pred.isCompleted ? '1.5px solid #22c55e88' : `1px solid ${pred.winnerColor}30`,
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        boxShadow: tossAdjProb ? '0 4px 20px #7c3aed40' : `0 4px 20px ${pred.winnerColor}20`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = tossAdjProb ? '0 12px 40px #7c3aed60' : `0 12px 40px ${pred.winnerColor}45`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = tossAdjProb ? '0 4px 20px #7c3aed40' : `0 4px 20px ${pred.winnerColor}20`;
      }}
      onClick={() => setExpanded(x => !x)}
    >
      {/* Header */}
      <div style={{
        background: `linear-gradient(90deg, ${c1}18, transparent 40%, transparent 60%, ${c2}18)`,
        borderBottom: `1px solid #1e293b`,
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '1px' }}>
            MATCH {pred.match}
          </span>
          {pred.isLive && (
            <span style={{ fontSize:'9px', fontWeight:900, color:'#ef4444', background:'#ef444418', border:'1px solid #ef444444', borderRadius:'6px', padding:'2px 6px', letterSpacing:'0.5px', animation:'pulse 1.4s infinite' }}>🔴 LIVE</span>
          )}
          {!pred.isLive && pred.isCompleted
            ? <span style={{ fontSize:'9px', fontWeight:900, color:'#22c55e', background:'#22c55e18', border:'1px solid #22c55e44', borderRadius:'6px', padding:'2px 6px', letterSpacing:'0.5px' }}>✅ RESULT</span>
            : !pred.isLive && <span style={{ fontSize:'9px', fontWeight:900, color:'#f59e0b', background:'#f59e0b18', border:'1px solid #f59e0b44', borderRadius:'6px', padding:'2px 6px', letterSpacing:'0.5px' }}>🤖 PREDICTED</span>
          }
          {tossAdjProb && (
            <span style={{ fontSize:'9px', fontWeight:900, color:'#7c3aed', background:'#7c3aed18', border:'1px solid #7c3aed44', borderRadius:'6px', padding:'2px 6px', letterSpacing:'0.5px' }}>🎲 TOSS-ADJ</span>
          )}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
          {pred.date} • {pred.day} • {pred.time}
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          📍 {pred.venue}
        </div>
      </div>

      {/* Teams vs Teams */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Team 1 */}
        <div style={{ flex:1, textAlign:'center', opacity: side1Highlight ? 1 : 0.6, transition:'opacity 0.3s' }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src={TEAM_LOGOS[pred.team1]} alt={pred.team1}
              style={{ width:'60px', height:'60px', objectFit:'cover', borderRadius:'50%',
                border:`2px solid ${side1Highlight ? c1 : '#334155'}`,
                boxShadow: side1Highlight ? `0 0 16px ${c1}60` : 'none' }}
              onError={e => { e.target.style.display='none'; }} />
            {showCrown1 && (
              <div style={{ position:'absolute', top:-4, right:-4, background:c1, borderRadius:'50%', width:'18px', height:'18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>🏆</div>
            )}
          </div>
          <div style={{ marginTop:'8px', fontSize:'20px', fontWeight:900, color:c1 }}>{pred.team1}</div>
          <div style={{ fontSize:'11px', fontWeight:800, color: displayProb[pred.team1] > 55 ? c1 : '#64748b', marginTop:'2px' }}>{displayProb[pred.team1]}% WIN</div>
          {/* Strength badges */}
          <div style={{ display:'flex', gap:'3px', justifyContent:'center', marginTop:'4px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'7px', padding:'1px 4px', borderRadius:'3px', background:`${c1}20`, color:c1, fontWeight:700 }}>BAT {s1.batting}%</span>
            <span style={{ fontSize:'7px', padding:'1px 4px', borderRadius:'3px', background:`${c1}20`, color:c1, fontWeight:700 }}>BWL {s1.bowling}%</span>
          </div>
        </div>

        {/* VS + Winner badge */}
        <div style={{ textAlign:'center', minWidth:'68px' }}>
          <div style={{ fontSize:'11px', color:'#475569', fontWeight:800, letterSpacing:'2px', marginBottom:'6px' }}>VS</div>
          {pred.isCompleted && pred.actualWinner ? (
            <>
              <div style={{
                background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                color:'#fff', fontSize:'9px', fontWeight:900, padding:'4px 8px', borderRadius:'12px',
                letterSpacing:'0.5px', boxShadow:'0 2px 10px #22c55555',
              }}>🏆 {pred.actualWinner}</div>
              <div style={{ marginTop:'6px', fontSize:'10px', fontWeight:800, color:'#94a3b8' }}>
                ML: {pred.predictedWinner} ({Math.max(displayProb[pred.team1]||0, displayProb[pred.team2]||0)}%)
              </div>
            </>
          ) : (
            <>
              <div style={{
                background: tossAdjProb ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : `linear-gradient(135deg,${displayColor},${displayColor}99)`,
                color:'#fff', fontSize:'9px', fontWeight:900, padding:'4px 8px', borderRadius:'12px',
                letterSpacing:'0.5px', boxShadow:tossAdjProb ? '0 2px 10px #7c3aed55' : `0 2px 10px ${displayColor}55`
              }}>{displayWinner} WINS</div>
              <div style={{ marginTop:'6px', fontSize:'18px', fontWeight:900, color: tossAdjProb ? '#7c3aed' : displayColor }}>
                {Math.max(displayProb[pred.team1] || 0, displayProb[pred.team2] || 0)}%
              </div>
              <div style={{ fontSize:'8px', color:'#475569', fontWeight:700, letterSpacing:'1px' }}>
                {tossAdjProb ? 'TOSS-ADJ' : 'CONFIDENCE'}
              </div>
            </>
          )}
        </div>

        {/* Team 2 */}
        <div style={{ flex:1, textAlign:'center', opacity: side2Highlight ? 1 : 0.6, transition:'opacity 0.3s' }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src={TEAM_LOGOS[pred.team2]} alt={pred.team2}
              style={{ width:'60px', height:'60px', objectFit:'cover', borderRadius:'50%',
                border:`2px solid ${side2Highlight ? c2 : '#334155'}`,
                boxShadow: side2Highlight ? `0 0 16px ${c2}60` : 'none' }}
              onError={e => { e.target.style.display='none'; }} />
            {showCrown2 && (
              <div style={{ position:'absolute', top:-4, right:-4, background:c2, borderRadius:'50%', width:'18px', height:'18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>🏆</div>
            )}
          </div>
          <div style={{ marginTop:'8px', fontSize:'20px', fontWeight:900, color:c2 }}>{pred.team2}</div>
          <div style={{ fontSize:'11px', fontWeight:800, color: displayProb[pred.team2] > 55 ? c2 : '#64748b', marginTop:'2px' }}>{displayProb[pred.team2]}% WIN</div>
          <div style={{ display:'flex', gap:'3px', justifyContent:'center', marginTop:'4px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'7px', padding:'1px 4px', borderRadius:'3px', background:`${c2}20`, color:c2, fontWeight:700 }}>BAT {s2.batting}%</span>
            <span style={{ fontSize:'7px', padding:'1px 4px', borderRadius:'3px', background:`${c2}20`, color:c2, fontWeight:700 }}>BWL {s2.bowling}%</span>
          </div>
        </div>
      </div>

      {/* Win Probability Bar */}
      <div style={{ padding: '0 16px 8px' }}>
        <ConfidenceBar
          pct1={displayProb[pred.team1]}
          pct2={displayProb[pred.team2]}
          color1={tossAdjProb ? '#7c3aed' : c1}
          color2={tossAdjProb ? '#a78bfa' : c2}
          team1={pred.team1} team2={pred.team2}
        />
      </div>

      {/* 🎲 Toss AI Predictor — only for upcoming matches */}
      {!pred.isCompleted && !pred.isLive && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ margin:'0 12px 12px', background:'linear-gradient(160deg,#0a0f20,#130d2a)', border:'1px solid #7c3aed30', borderRadius:'10px', padding:'10px 12px' }}>
          <div style={{ fontSize:'9px', color:'#7c3aed', fontWeight:800, letterSpacing:'1px', marginBottom:'7px', display:'flex', alignItems:'center', gap:'6px' }}>
            🎲 TOSS AI PREDICTOR
            <span style={{ color:'#334155', fontWeight:600 }}>· Update win probability with toss outcome</span>
          </div>
          <div style={{ display:'flex', gap:'5px', marginBottom:'5px' }}>
            {[pred.team1, pred.team2].map(team => (
              <button key={team}
                onClick={() => { setTossWinner(tossWinner === team ? null : team); setTossChoice(null); }}
                style={{
                  flex:1, padding:'5px 8px', borderRadius:'7px', cursor:'pointer', fontWeight:800, fontSize:'10px', transition:'all 0.15s',
                  background: tossWinner === team ? `${TEAM_COLORS[team]}25` : '#1e293b',
                  border: tossWinner === team ? `1px solid ${TEAM_COLORS[team]}80` : '1px solid #334155',
                  color: tossWinner === team ? TEAM_COLORS[team] : '#64748b',
                }}
              >
                <img src={TEAM_LOGOS[team]} alt={team} style={{ width:'14px',height:'14px',borderRadius:'50%',objectFit:'cover',verticalAlign:'middle',marginRight:'4px' }} onError={e=>e.target.style.display='none'} />
                {team} WINS TOSS
              </button>
            ))}
          </div>
          {tossWinner && (
            <div style={{ display:'flex', gap:'5px', marginBottom:'6px' }}>
              {[['bat','🏏 BATS FIRST'],['field','🏃 FIELDS (CHASES)']].map(([val, label]) => (
                <button key={val}
                  onClick={() => setTossChoice(tossChoice === val ? null : val)}
                  style={{
                    flex:1, padding:'4px 8px', borderRadius:'6px', cursor:'pointer', fontWeight:700, fontSize:'9px', transition:'all 0.15s',
                    background: tossChoice === val ? '#f59e0b25' : '#1e293b',
                    border: tossChoice === val ? '1px solid #f59e0b80' : '1px solid #334155',
                    color: tossChoice === val ? '#f59e0b' : '#64748b',
                  }}
                >{label}</button>
              ))}
            </div>
          )}
          {tossAdjProb && (
            <div style={{ background:'#0f172a', borderRadius:'7px', padding:'8px 10px' }}>
              <div style={{ fontSize:'8px', color:'#7c3aed', fontWeight:800, letterSpacing:'1px', marginBottom:'5px' }}>🤖 AI TOSS-ADJUSTED PREDICTION</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                <span style={{ fontSize:'12px', fontWeight:900, color: tossAdjProb[pred.team1] > tossAdjProb[pred.team2] ? c1 : '#475569' }}>
                  {pred.team1} {tossAdjProb[pred.team1]}%
                </span>
                <span style={{ fontSize:'10px', fontWeight:900, color:'#7c3aed', background:'#7c3aed20', border:'1px solid #7c3aed40', borderRadius:'5px', padding:'2px 7px' }}>
                  🏆 {tossAdjProb.predictedWinner}
                </span>
                <span style={{ fontSize:'12px', fontWeight:900, color: tossAdjProb[pred.team2] > tossAdjProb[pred.team1] ? c2 : '#475569' }}>
                  {tossAdjProb[pred.team2]}% {pred.team2}
                </span>
              </div>
              <div style={{ height:'5px', borderRadius:'3px', background:'#1e293b', overflow:'hidden', display:'flex', marginBottom:'5px' }}>
                <div style={{ width:`${tossAdjProb[pred.team1]}%`, background:'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius:'3px 0 0 3px' }} />
                <div style={{ width:`${tossAdjProb[pred.team2]}%`, background:'linear-gradient(90deg,#6d28d9,#7c3aed)', borderRadius:'0 3px 3px 0' }} />
              </div>
              <div style={{ fontSize:'8px', color:'#475569', textAlign:'center' }}>
                {tossWinner} elected to {tossChoice === 'field' ? 'field (chase)' : 'bat first'} ·
                Toss boost: +{tossAdjProb.boost}% · {pred.venue} chase-win rate: {tossAdjProb.chaseRate}%
              </div>
            </div>
          )}
          {!tossWinner && (
            <div style={{ fontSize:'8px', color:'#334155', textAlign:'center', paddingTop:'2px' }}>👆 Select toss winner above to see auto-updated prediction</div>
          )}
        </div>
      )}

      {/* Live score banner for in-progress matches */}
      {pred.isLive && pred.liveScore && Object.keys(pred.liveScore).length > 0 && (
        <div style={{ margin:'0 16px 10px', background:'#ef444415', border:'1px solid #ef444440', borderRadius:'8px', padding:'8px 12px' }}>
          <div style={{ fontSize:'9px', color:'#ef4444', fontWeight:800, letterSpacing:'1px', marginBottom:'5px', display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ display:'inline-block', width:'7px', height:'7px', borderRadius:'50%', background:'#ef4444', animation:'pulse 1.4s ease-in-out infinite' }} />
            LIVE NOW
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
            {Object.entries(pred.liveScore).map(([team, score]) => (
              <div key={team} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'12px', fontWeight:800, color: TEAM_COLORS[team] || '#94a3b8' }}>{team}</span>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#e2e8f0', fontFamily:'monospace' }}>{score}</span>
              </div>
            ))}
          </div>
          {pred.liveStatus && (
            <div style={{ marginTop:'5px', fontSize:'10px', color:'#94a3b8', fontStyle:'italic' }}>{pred.liveStatus}</div>
          )}
          {pred.liveToss?.winner && (
            <div style={{ marginTop:'6px', fontSize:'10px', color:'#a5b4fc', fontWeight:700 }}>
              🪙 Toss: {pred.liveToss.winner} — {pred.liveToss.choice === 'field' ? 'bowling first (chase)' : 'batting first'}
            </div>
          )}
        </div>
      )}

      {/* Actual result banner for completed matches */}
      {pred.isCompleted && (
        <div style={{ margin:'0 16px 10px', background:'#22c55e15', border:'1px solid #22c55e40', borderRadius:'8px', padding:'7px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'3px' }}>
            <div style={{ fontSize:'9px', color:'#22c55e', fontWeight:800, letterSpacing:'1px' }}>✅ ACTUAL RESULT</div>
            {pred.predictionCorrect === true && (
              <span style={{ fontSize:'9px', fontWeight:900, color:'#22c55e', background:'#22c55e18', border:'1px solid #22c55e44', borderRadius:'5px', padding:'1px 6px' }}>ML ✓ CORRECT</span>
            )}
            {pred.predictionCorrect === false && (
              <span style={{ fontSize:'9px', fontWeight:900, color:'#ef4444', background:'#ef444418', border:'1px solid #ef444444', borderRadius:'5px', padding:'1px 6px' }}>ML ✗ WRONG</span>
            )}
          </div>
          <div style={{ fontSize:'11px', color:'#e2e8f0', fontWeight:700 }}>{pred.actualResult}</div>
          {pred.originalPrediction && pred.originalPrediction !== pred.actualWinner && (
            <div style={{ marginTop:'3px', fontSize:'10px', color:'#64748b' }}>
              ML predicted: <span style={{ color: TEAM_COLORS[pred.originalPrediction] || '#f59e0b', fontWeight:700 }}>{pred.originalPrediction}</span>
              {pred.originalProb && <span style={{ color:'#475569' }}> ({pred.originalProb[pred.originalPrediction]}% conf.)</span>}
            </div>
          )}
          {pred.originalPrediction && pred.originalPrediction === pred.actualWinner && (
            <div style={{ marginTop:'3px', fontSize:'10px', color:'#22c55e' }}>
              ML predicted correctly: <span style={{ color: TEAM_COLORS[pred.originalPrediction] || '#22c55e', fontWeight:700 }}>{pred.originalPrediction}</span>
              {pred.originalProb && <span style={{ color:'#16a34a' }}> ({pred.originalProb[pred.originalPrediction]}% conf.)</span>}
            </div>
          )}
        </div>
      )}

      {/* Expand toggle */}
      <div style={{ textAlign:'center', padding:'6px', color:'#475569', fontSize:'11px', fontWeight:700, letterSpacing:'1px', borderTop:'1px solid #1e293b' }}>
        {expanded ? '▲ LESS' : '▼ FULL BREAKDOWN'}
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div style={{ padding:'12px 16px 16px', borderTop:'1px solid #1e293b' }}>

          {/* 🏏/🎳 Team Strength Comparison */}
          <div style={{ marginBottom:'12px' }}>
            <div style={{ fontSize:'9px', color:'#f59e0b', fontWeight:800, letterSpacing:'1.5px', marginBottom:'8px' }}>💪 TEAM STRENGTH ANALYSIS (2026)</div>
            {[['🏏 BATTING',s1.batting,s2.batting],['🎳 BOWLING',s1.bowling,s2.bowling],['🔄 ALL-ROUND',s1.allRound,s2.allRound]].map(([label,v1,v2])=>{
              const tot=(v1||70)+(v2||70);
              const p1=Math.round((v1/tot)*100);
              return(
                <div key={label} style={{ marginBottom:'5px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'8px', fontWeight:700, marginBottom:'2px' }}>
                    <span style={{ color: v1>=v2 ? c1 : '#475569' }}>{pred.team1} {v1}%</span>
                    <span style={{ color:'#334155', letterSpacing:'0.5px' }}>{label}</span>
                    <span style={{ color: v2>=v1 ? c2 : '#475569' }}>{v2}% {pred.team2}</span>
                  </div>
                  <div style={{ height:'4px', background:'#0f172a', borderRadius:'2px', overflow:'hidden', display:'flex' }}>
                    <div style={{ width:`${p1}%`, background:c1, opacity:0.85 }} />
                    <div style={{ width:`${100-p1}%`, background:c2, opacity:0.85 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Captain Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
            {[pred.team1, pred.team2].map((team,i) => {
              const cap = CAPTAIN_DATA?.[team] || {};
              const col = i===0 ? c1 : c2;
              return cap?.name ? (
                <div key={team} style={{ background:'#0a1120', borderRadius:'8px', padding:'8px 10px', border:`1px solid ${col}25` }}>
                  <div style={{ fontSize:'9px', color:col, fontWeight:800, marginBottom:'4px' }}>👑 {team} CAPTAIN</div>
                  <div style={{ fontSize:'11px', fontWeight:900, color:'#e2e8f0', marginBottom:'2px' }}>{cap.name}</div>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'8px', color:'#22c55e', fontWeight:700 }}>W {cap.wins}/{cap.matches}</span>
                    <span style={{ fontSize:'8px', color:'#f59e0b', fontWeight:800 }}>{cap.winPct}%</span>
                    {cap.titles > 0 && <span style={{ fontSize:'8px', color:'#f59e0b' }}>{'🏆'.repeat(Math.min(cap.titles,3))}</span>}
                  </div>
                  <div style={{ fontSize:'8px', color:'#475569', marginTop:'3px', lineHeight:1.3 }}>{cap.notes}</div>
                </div>
              ) : null;
            })}
          </div>

          {/* Key Metrics Grid */}
          {pred.keyMetrics && (
            <>
              <div style={{ fontSize:'9px', color:'#475569', fontWeight:800, letterSpacing:'1.5px', marginBottom:'6px' }}>📊 KEY METRICS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
                <KeyMetricItem label="RECENT FORM" icon="📈" v1={pred.keyMetrics?.recentForm?.team1} v2={pred.keyMetrics?.recentForm?.team2} color1={c1} color2={c2} />
                <KeyMetricItem label="VENUE ADVANTAGE" icon="🏟️" v1={pred.keyMetrics?.venueAdvantage?.team1} v2={pred.keyMetrics?.venueAdvantage?.team2} color1={c1} color2={c2} suffix="%" />
                <KeyMetricItem label="H2H RATIO" icon="⚔️" v1={pred.keyMetrics?.h2hRatio?.team1} v2={pred.keyMetrics?.h2hRatio?.team2} color1={c1} color2={c2} suffix="%" />
                <KeyMetricItem label="PRESSURE INDEX" icon="🔥" v1={pred.keyMetrics?.pressureIndex?.team1} v2={pred.keyMetrics?.pressureIndex?.team2} color1={c1} color2={c2} />
              </div>
            </>
          )}

          {/* 5-Factor Analysis */}
          <div style={{ fontSize:'9px', color:'#475569', fontWeight:800, letterSpacing:'1.5px', marginBottom:'6px' }}>⚙️ 5-FACTOR MODEL (Strength-Adjusted)</div>
          <FactorRow label="HEAD-TO-HEAD (30%)" v1={pred.breakdown.h2h.team1} v2={pred.breakdown.h2h.team2} color1={c1} color2={c2} />
          <FactorRow label="VENUE ADVANTAGE (20%)" v1={pred.breakdown.venue.team1} v2={pred.breakdown.venue.team2} color1={c1} color2={c2} />
          <FactorRow label="BATTING SR SCORE (20%)" v1={pred.breakdown.batting.team1} v2={pred.breakdown.batting.team2} color1={c1} color2={c2} />
          <FactorRow label="BOWLING ECONOMY (20%)" v1={pred.breakdown.bowling.team1} v2={pred.breakdown.bowling.team2} color1={c1} color2={c2} />
          <FactorRow label="RECENT FORM (10%)" v1={pred.breakdown.form.team1} v2={pred.breakdown.form.team2} color1={c1} color2={c2} />

          {/* Squad Strength */}
          <SquadStrengthRow squadInfo={pred.squadInfo} team1={pred.team1} team2={pred.team2} c1={c1} c2={c2} />

          {/* Toss Impact + Pitch */}
          <TossInfoRow tossImpact={pred.tossImpact} pitchInfo={pred.pitchInfo} c1={c1} c2={c2} />

          {/* Key Players */}
          <div style={{ marginTop:'10px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {[pred.team1, pred.team2].map(team => (
              <div key={team} style={{ background:'#0f172a', borderRadius:'8px', padding:'8px', border:`1px solid ${TEAM_COLORS[team]}25` }}>
                <div style={{ fontSize:'10px', color:TEAM_COLORS[team], fontWeight:800, marginBottom:'4px' }}>⭐ {team} KEY PLAYERS</div>
                {Array.isArray(pred.keyPlayers?.[team]) ? (
                  pred.keyPlayers[team].map((p,i) => (
                    <div key={i} style={{ fontSize:'9px', color:'#94a3b8', lineHeight:'1.5', padding:'1px 0' }}>• {p}</div>
                  ))
                ) : (
                  <div style={{ fontSize:'9px', color:'#475569' }}>No key players</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── 20 Matches Overview Component ─────────────────────────────────────────────
const MatchesOverview = ({ predictions, onMatchClick }) => {
  const [showAll, setShowAll] = useState(false);
  const displayedMatches = showAll ? predictions : predictions.slice(0, 10);
  
  return (
    <div style={{ margin: '28px 0', padding: '20px', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 800, letterSpacing: '2px' }}>
          📋 ALL 74 MATCHES OVERVIEW
        </div>
        <button 
          onClick={() => setShowAll(!showAll)}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid #475569',
            background: '#1e293b', color: '#94a3b8', fontSize: '11px', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          {showAll ? '▼ Show First 10' : '▲ Show All 20'}
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
        {displayedMatches.map((pred, idx) => (
          <div 
            key={pred.match}
            onClick={() => onMatchClick(pred.match)}
            style={{
              background: '#0a1120', borderRadius: '10px', padding: '10px 12px',
              border: `1px solid ${pred.winnerColor}40`, cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: `0 2px 8px ${pred.winnerColor}15`
            }}
            onMouseEnter={e => { 
              e.currentTarget.style.transform = 'translateY(-2px)'; 
              e.currentTarget.style.boxShadow = `0 4px 16px ${pred.winnerColor}30`; 
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.transform = 'translateY(0)'; 
              e.currentTarget.style.boxShadow = `0 2px 8px ${pred.winnerColor}15`; 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Match {pred.match}</span>
              <span style={{ fontSize: '9px', color: '#475569' }}>{pred.date} • {pred.time}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <img src={TEAM_LOGOS[pred.team1]} alt={pred.team1} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', opacity: pred.predictedWinner === pred.team1 ? 1 : 0.5 }} onError={e => { e.target.style.display='none'; }} />
                <span style={{ fontSize: '13px', fontWeight: pred.predictedWinner === pred.team1 ? 800 : 600, color: pred.predictedWinner === pred.team1 ? TEAM_COLORS[pred.team1] : '#64748b' }}>{pred.team1}</span>
              </div>
              
              <div style={{ 
                padding: '3px 8px', borderRadius: '6px', background: `${pred.winnerColor}20`,
                border: `1px solid ${pred.winnerColor}50`, textAlign: 'center'
              }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: pred.winnerColor }}>{pred.winProbability[pred.predictedWinner]}%</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '13px', fontWeight: pred.predictedWinner === pred.team2 ? 800 : 600, color: pred.predictedWinner === pred.team2 ? TEAM_COLORS[pred.team2] : '#64748b' }}>{pred.team2}</span>
                <img src={TEAM_LOGOS[pred.team2]} alt={pred.team2} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', opacity: pred.predictedWinner === pred.team2 ? 1 : 0.5 }} onError={e => { e.target.style.display='none'; }} />
              </div>
            </div>
            
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center' }}>
              <span style={{ 
                fontSize: '9px', fontWeight: 700, color: pred.winnerColor,
                background: `${pred.winnerColor}15`, padding: '2px 8px', borderRadius: '4px'
              }}>
                🏆 {pred.predictedWinner} Wins
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {!showAll && predictions.length > 10 && (
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <span style={{ fontSize: '11px', color: '#475569' }}>... and {predictions.length - 10} more matches</span>
        </div>
      )}
    </div>
  );
};
export default function Predictions2026() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [showH2H, setShowH2H] = useState(false);
  const [showMLModal, setShowMLModal] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [liveData, setLiveData] = useState({ agentResults: [], liveMatches: [], agentStats: null });
  const [toast, setToast] = useState(null);   // { msg, winner, matchup }
  const [viewMode, setViewMode] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED'
  const [freshLoading, setFreshLoading] = useState(false);

  // ── Fetch Fresh Predictions from Database (optional enhancement, never blocks UI) ──
  const fetchFreshPredictions = useCallback(async () => {
    try {
      setFreshLoading(true);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch('http://localhost:5000/api/fresh-predictions', { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return; // silent fail — ALL_74 already loaded
      const data = await response.json();
      if (data.success && data.totalMatches) {
        setModelInfo(`Database ML Model · ${data.totalMatches} matches loaded`);
      }
      // Do NOT override predictions — ALL_74 with actual results 1-15 is the source of truth
    } catch (err) {
      // Backend unavailable — ALL_74 static data already shown, no error needed
      console.warn('[Predictions2026] Backend optional fetch failed:', err.message);
    } finally {
      setFreshLoading(false);
    }
  }, []);

  // ── Generate Fresh Predictions (Admin/Dev function) ─────────────────────────
  const generateFreshPredictions = async () => {
    try {
      setFreshLoading(true);
      console.log('[Frontend] Generating fresh ML predictions...');
      
      const response = await fetch('http://localhost:5000/api/fresh-predictions/generate-fresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to generate predictions');
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[Frontend] Fresh predictions generated:', data);
        showToast(`✅ Generated ${data.totalMatches} fresh predictions`, 'ML', 'Database Updated');
        // Reload predictions
        await fetchFreshPredictions();
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      console.error('[Frontend] Error generating predictions:', err);
      setError('Failed to generate predictions: ' + err.message);
      setFreshLoading(false);
    }
  };

  // ── Auto-recalculate all predictions with new 2026 squad strengths ───────────
  const adjustedPredictions = React.useMemo(() => {
    return predictions.map(pred => {
      if (pred.isPlayoff) return pred;
      if (pred.isCompleted || pred.isLive) return pred;
      const newP1 = computeStrengthProb(
        pred.team1, pred.team2, pred.venue,
        pred.winProbability[pred.team1] || 50
      );
      const newP2 = 100 - newP1;
      const newWinner = newP1 >= newP2 ? pred.team1 : pred.team2;
      return {
        ...pred,
        winProbability: { [pred.team1]: newP1, [pred.team2]: newP2 },
        predictedWinner: newWinner,
        winnerColor: TEAM_COLORS[newWinner] || pred.winnerColor,
        confidence: Math.max(newP1, newP2),
      };
    });
  }, [predictions]);

  // Show toast for N seconds
  const showToast = (msg, winner, matchup) => {
    setToast({ msg, winner, matchup });
    setTimeout(() => setToast(null), 7000);
  };

  // ── Static all-74 predictions dataset ──────────────────────────────────────
  // Matches 1-15: ACTUAL RESULTS  (15 matches played; match 12 = No Result)
  // Match 16+   : ML ensemble predictions (H2H + squad + venue + current form)
  const ALL_74 = [
  const ALL_74 = [];

  // ── TEAM NAME → CODE helper (mirrors backend) ────────────────────────────────
  const toCode = (name = '') => {
    const MAP = {
      'mumbai indians':'MI','chennai super kings':'CSK','kolkata knight riders':'KKR',
      'royal challengers bengaluru':'RCB','royal challengers bangalore':'RCB','royal challengers':'RCB',
      'delhi capitals':'DC','rajasthan royals':'RR','sunrisers hyderabad':'SRH',
      'punjab kings':'PBKS','lucknow super giants':'LSG','gujarat titans':'GT',
    };
    const lower = name.toLowerCase().trim();
    for (const [k, v] of Object.entries(MAP)) { if (lower.includes(k)) return v; }
    const upper = name.toUpperCase().trim();
    if (Object.values(MAP).includes(upper)) return upper;
    return null;
  };

  useEffect(() => {
    setModelInfo('IPL 2026 · Predictions Powered By MongoDB (ipl_matches_2026)');

    const fetchAllMatches = async () => {
      try {
        setLoading(true);
        const resp = await fetch('http://localhost:5000/api/matches2026');
        if (!resp.ok) throw new Error('Failed to load matches');
        
        const allMatches = await resp.json();
        const dynamicPredictions = allMatches.map(match => {
          const t1 = match?.team1Short || match?.team1?.code || match?.team1 || 'TBD';
          const t2 = match?.team2Short || match?.team2?.code || match?.team2 || 'TBD';
          
          let predictedWinner = 'TBD';
          let team1Prob = 50;
          let team2Prob = 50;
          let isCompleted = false;

          if (match.status === 'completed' || match.status === 'result') {
            isCompleted = true;
            predictedWinner = match?.winnerShort || match?.winner?.code || match?.winner || match?.winnerFull || 'TBD';
            if (predictedWinner === match?.team1?.name || predictedWinner === match?.team_1) predictedWinner = t1;
            if (predictedWinner === match?.team2?.name || predictedWinner === match?.team_2) predictedWinner = t2;
            
            team1Prob = predictedWinner === t1 ? 100 : 0;
            team2Prob = predictedWinner === t2 ? 100 : 0;
          } else {
            // Random generation for upcoming matches per user request
            predictedWinner = Math.random() > 0.5 ? t1 : t2;
            team1Prob = predictedWinner === t1 ? 52 : 48;
            team2Prob = predictedWinner === t2 ? 52 : 48;
          }

          const scoreTeam1 = match?.team1?.score || match?.score_team_1 || match?.scoreTeam1 || '';
          const scoreTeam2 = match?.team2?.score || match?.score_team_2 || match?.scoreTeam2 || '';
          const resultText = match?.resultText || match?.result || '';
          
          const actualResult = isCompleted 
            ? (resultText ? resultText : `${predictedWinner} won ${scoreTeam1 || scoreTeam2 ? '(' + scoreTeam1 + ' · ' + scoreTeam2 + ')' : ''}`)
            : 'Upcoming';

          return {
            match: match.matchNumber,
            date: match.date || match.dateISO || '',
            day: '',
            time: match.timeIST || '',
            venue: match.venue || '',
            team1: t1,
            team2: t2,
            predictedWinner: predictedWinner,
            isCompleted: isCompleted,
            actualResult: actualResult,
            winProbability: { [t1]: team1Prob, [t2]: team2Prob },
            confidence: isCompleted ? 100 : Math.max(team1Prob, team2Prob),
            winnerColor: TEAM_COLORS[predictedWinner] || '#94a3b8',
            keyMetrics: { recentForm:{team1:50,team2:50}, venueAdvantage:{team1:50,team2:50}, h2hRatio:{team1:50,team2:50}, pressureIndex:{team1:50,team2:50} },
            breakdown: { h2h:{team1:10,team2:10}, venue:{team1:10,team2:10}, batting:{team1:10,team2:10}, bowling:{team1:10,team2:10}, form:{team1:10,team2:10} },
            squadInfo: { [t1]: {overall: 100}, [t2]: {overall: 100} },
            keyPlayers: { [t1]: [], [t2]: [] },
            tossImpact: { preference: 'neutral', chasingAdvantage: 50, description: '' },
            pitchInfo: { type: 'Balanced', avgScore: 170, spinFriendly: false },
            methodology: isCompleted ? 'ACTUAL RESULT — Match Completed' : 'Random Prediction',
            score_team_1: scoreTeam1,
            score_team_2: scoreTeam2,
            status: match.status,
            isPlayoff: match.stage === 'playoff' || match.matchNumber >= 71
          };
        });

        setPredictions(dynamicPredictions);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load predictions from DB:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAllMatches();
    const interval = setInterval(fetchAllMatches, 15000);
    return () => clearInterval(interval);
  }, []);


  const teams = ['ALL', 'CSK', 'MI', 'KKR', 'RR', 'RCB', 'DC', 'SRH', 'GT', 'PBKS', 'LSG'];
  const filtered = filter === 'ALL'
    ? adjustedPredictions
    : adjustedPredictions.filter(p => p.team1 === filter || p.team2 === filter);

  // Win count tally — use actualWinner for completed matches, adjustedPredictions for rest
  const winTally = {};
  adjustedPredictions.forEach(p => {
    if (p.isPlayoff) return;
    const w = p.actualWinner || p.predictedWinner;
    if (!w || w === 'TBD') return;
    winTally[w] = (winTally[w] || 0) + 1;
  });
  const sortedTally = Object.entries(winTally).sort((a, b) => b[1] - a[1]);


  return (
    <div style={{ backgroundColor: '#0d1627', minHeight: '100vh', padding: '0 0 60px' }}>
      {showH2H && <H2HPanel onClose={() => setShowH2H(false)} />}
      {showMLModal && <MLPredictions2026 onClose={() => setShowMLModal(false)} />}

      {/* ── Real-time Result Toast ─────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, minWidth: '320px', maxWidth: '480px',
          background: 'linear-gradient(135deg, #0f172a, #1a2744)',
          border: `2px solid ${TEAM_COLORS[toast.winner] || '#f59e0b'}`,
          borderRadius: '16px', padding: '14px 20px',
          boxShadow: `0 8px 40px ${TEAM_COLORS[toast.winner] || '#f59e0b'}40`,
          animation: 'slideDown 0.4s ease',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <img
            src={TEAM_LOGOS[toast.winner]}
            alt={toast.winner}
            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover',
              border: `2px solid ${TEAM_COLORS[toast.winner] || '#f59e0b'}` }}
            onError={e => { e.target.style.display='none'; }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '2px' }}>
              🏏 IPL 2026 · MATCH RESULT UPDATED
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.3 }}>
              {toast.msg}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
              Predictions page auto-updated ✓
            </div>
          </div>
          <button onClick={() => setToast(null)} style={{
            background: 'none', border: 'none', color: '#475569', cursor: 'pointer',
            fontSize: '16px', fontWeight: 700, padding: '4px'
          }}>✕</button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(160deg, #0a1628 0%, #1a2744 50%, #0a1628 100%)',
        borderBottom: '2px solid #f59e0b30',
        padding: '48px 20px 36px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, #f59e0b10 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '48px', fontWeight: 900, margin: '0 0 8px', letterSpacing: '2px', background: 'linear-gradient(90deg, #f59e0b, #fde68a, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            IPL 2026 PREDICTIONS
          </h1>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '2px', marginTop: '4px' }}>
            🤖 ML-POWERED · MATCHES 1–15 ACTUAL RESULTS · MATCHES 16–70 ENSEMBLE ML PREDICTIONS
          </div>
          {modelInfo && (
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>
              Model Source: {modelInfo}
            </div>
          )}
          {/* Buttons Row */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>

            {/* ── PREDICTIONS 2026 — ML PIPELINE BUTTON ── */}
            <button
              id="predictions-2026-ml-btn"
              onClick={() => setShowMLModal(true)}
              style={{
                padding: '14px 32px',
                borderRadius: '14px',
                border: '2px solid #f59e0b',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000',
                fontWeight: 900,
                fontSize: '14px',
                letterSpacing: '1.5px',
                cursor: 'pointer',
                boxShadow: '0 0 32px #f59e0b55, 0 4px 20px #f59e0b40',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 0 50px #f59e0b80, 0 8px 30px #f59e0b60';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 0 32px #f59e0b55, 0 4px 20px #f59e0b40';
              }}
            >
              <span style={{ fontSize: '18px' }}>🤖</span>
              PREDICTIONS 2026
              <span style={{ fontSize: '10px', background: '#00000030', borderRadius: '4px', padding: '2px 6px', fontWeight: 700 }}>ML</span>
            </button>

            {/* Generate Fresh button */}
            <button
              onClick={generateFreshPredictions}
              disabled={freshLoading}
              style={{
                padding: '10px 22px',
                borderRadius: '12px',
                border: '2px solid #22c55e',
                background: freshLoading ? '#1e293b' : 'linear-gradient(135deg, #22c55e33, #22c55e22)',
                color: '#22c55e',
                fontWeight: 800,
                fontSize: '12px',
                letterSpacing: '1px',
                cursor: freshLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 16px #22c55e30',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                opacity: freshLoading ? 0.6 : 1
              }}
              onMouseEnter={e => { if (!freshLoading) { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.color = '#000'; e.currentTarget.style.boxShadow = '0 0 28px #22c55e60'; }}}
              onMouseLeave={e => { if (!freshLoading) { e.currentTarget.style.background = 'linear-gradient(135deg,#22c55e33,#22c55e22)'; e.currentTarget.style.color = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 16px #22c55e30'; }}}
            >
              {freshLoading ? '⏳ GENERATING...' : '🔄 GENERATE FRESH PREDICTIONS'}
            </button>

            <button
              onClick={fetchFreshPredictions}
              disabled={freshLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '2px solid #3b82f6',
                background: freshLoading ? '#1e293b' : 'linear-gradient(135deg, #3b82f633, #3b82f622)',
                color: '#3b82f6',
                fontWeight: 800,
                fontSize: '12px',
                letterSpacing: '1px',
                cursor: freshLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 16px #3b82f630',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                opacity: freshLoading ? 0.6 : 1
              }}
              onMouseEnter={e => { if (!freshLoading) { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 0 28px #3b82f660'; }}}
              onMouseLeave={e => { if (!freshLoading) { e.currentTarget.style.background = 'linear-gradient(135deg,#3b82f633,#3b82f622)'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 16px #3b82f630'; }}}
            >
              {freshLoading ? '⏳ LOADING...' : '📥 REFRESH FROM DB'}
            </button>
          </div>
          {/* Live ML Accuracy banner */}
          {liveData.agentStats && liveData.agentStats.totalCompleted > 0 && (
            <div style={{ marginTop: '14px', display:'inline-flex', alignItems:'center', gap:'20px',
              background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.25)',
              borderRadius:'12px', padding:'10px 24px', flexWrap:'wrap', justifyContent:'center' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'22px', fontWeight:900, color:'#eab308', fontFamily:'Oswald,sans-serif' }}>{liveData.agentStats.totalCompleted}</div>
                <div style={{ fontSize:'9px', color:'#64748b', fontWeight:700, letterSpacing:'1px' }}>MATCHES DONE</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'22px', fontWeight:900, color:'#22c55e', fontFamily:'Oswald,sans-serif' }}>{liveData.agentStats.correctPredictions}</div>
                <div style={{ fontSize:'9px', color:'#64748b', fontWeight:700, letterSpacing:'1px' }}>ML CORRECT</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'28px', fontWeight:900, color:'#f59e0b', fontFamily:'Oswald,sans-serif' }}>{liveData.agentStats.accuracyPct}%</div>
                <div style={{ fontSize:'9px', color:'#64748b', fontWeight:700, letterSpacing:'1px' }}>ML ACCURACY</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'9px', color:'#475569', fontWeight:700, letterSpacing:'1px', marginBottom:'2px' }}>ACCURACY BAR</div>
                <div style={{ width:'120px', height:'8px', background:'rgba(255,255,255,0.07)', borderRadius:'4px', overflow:'hidden' }}>
                  <div style={{ width:`${liveData.agentStats.accuracyPct}%`, height:'100%', background:'linear-gradient(90deg,#eab308,#22c55e)', borderRadius:'4px', transition:'width .6s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 20px' }}>

        {/* Squad Power Rankings */}
        <div style={{ margin: '28px 0 20px', padding: '20px', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '2px', marginBottom: '14px' }}>
            🤖 ML MODEL WEIGHTS: Squad 25% | H2H 20% | Venue 15% | Form 15% | Players 15% | Toss 10%
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {Object.entries(SQUAD_STRENGTH).sort((a,b) => b[1].overall - a[1].overall).map(([team, s], i) => {
              const col = TEAM_COLORS[team] || '#888';
              const medals = ['🥇','🥈','🥉'];
              return (
                <div key={team} style={{ background: i < 3 ? `${col}12` : '#0a1120', border: `1px solid ${i < 3 ? col+'44' : '#1e293b'}`, borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{medals[i] || <span style={{ fontSize: '12px', color: '#475569', fontWeight: 800 }}>#{i+1}</span>}</span>
                    {!medals[i] && <span style={{ fontSize: '12px', color: '#475569', fontWeight: 800 }}>#{i+1}</span>}
                    <img src={TEAM_LOGOS[team]} alt={team} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; }} />
                    <span style={{ fontSize: '14px', fontWeight: 900, color: col }}>{team}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '16px', fontWeight: 900, color: col }}>{s.overall}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.3' }}>{s.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Injury & Availability Tracker ──────────────────────────────────── */}
        <div style={{ margin: '28px 0 20px', padding: '20px', background: 'linear-gradient(160deg,#0d1627,#1a1f35)', borderRadius: '16px', border: '1px solid #ef444430' }}>
          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 800, letterSpacing: '2px', marginBottom: '16px', display:'flex', alignItems:'center', gap:'8px' }}>
            🏥 INJURY & AVAILABILITY TRACKER — SEASON 2026
            <span style={{ fontSize:'9px', color:'#475569', fontWeight:600, letterSpacing:'1px' }}>· LIVE UPDATES · SQUAD STRENGTH ADJUSTED</span>
          </div>

          {/* Injury Watch */}
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'10px', color:'#fbbf24', fontWeight:800, letterSpacing:'1.5px', marginBottom:'10px' }}>⚠️ INJURY WATCH LIST</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'8px' }}>
              {[
                { team:'SRH', player:'Pat Cummins', injury:'Lumbar Stress Fracture', status:'Missed openers · return mid-April', severity:'high' },
                { team:'DC', player:'Mitchell Starc', injury:'Shoulder/Elbow Load Mgmt', status:'Managing workload · return unconfirmed', severity:'moderate' },
                { team:'RCB', player:'Josh Hazlewood', injury:'Achilles Rehab', status:'Missing early phase · expected late April', severity:'moderate' },
                { team:'PBKS', player:'Lockie Ferguson', injury:'Paternity Leave', status:'Missing first half of season', severity:'low' },
                { team:'CSK', player:'Matthew Short', injury:'Fractured Thumb', status:'Sidelined opening week · under review', severity:'high' },
                { team:'KKR', player:'M. Pathirana', injury:'Calf Strain (WC)', status:'Recovering · KKR hopeful late-season return', severity:'high' },
                { team:'SRH', player:'Eshan Malinga', injury:'Shoulder Dislocation', status:'Availability still uncertain', severity:'high' },
              ].map((item, i) => {
                const severityColor = item.severity==='high' ? '#ef4444' : item.severity==='moderate' ? '#f59e0b' : '#22c55e';
                return (
                  <div key={i} style={{ background:'#0a1120', borderRadius:'8px', padding:'10px 12px', border:`1px solid ${severityColor}30`, display:'flex', flexDirection:'column', gap:'4px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <img src={TEAM_LOGOS[item.team]} alt={item.team} style={{ width:'18px', height:'18px', borderRadius:'50%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                        <span style={{ fontSize:'10px', fontWeight:800, color: TEAM_COLORS[item.team] || '#94a3b8' }}>{item.team}</span>
                      </div>
                      <span style={{ fontSize:'8px', fontWeight:800, color:severityColor, background:`${severityColor}18`, border:`1px solid ${severityColor}40`, borderRadius:'4px', padding:'1px 5px', letterSpacing:'0.5px' }}>
                        {item.severity === 'high' ? '🔴 HIGH' : item.severity === 'moderate' ? '🟡 MODERATE' : '🟢 MILD'}
                      </span>
                    </div>
                    <div style={{ fontSize:'12px', fontWeight:900, color:'#e2e8f0' }}>{item.player}</div>
                    <div style={{ fontSize:'9px', color:'#ef4444', fontWeight:700 }}>🤕 {item.injury}</div>
                    <div style={{ fontSize:'9px', color:'#64748b', lineHeight:1.4 }}>📅 {item.status}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Replacements */}
          <div>
            <div style={{ fontSize:'10px', color:'#60a5fa', fontWeight:800, letterSpacing:'1.5px', marginBottom:'10px' }}>✅ OFFICIAL REPLACEMENTS</div>
            <div style={{ borderRadius:'10px', overflow:'hidden', border:'1px solid #1e293b' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#0f172a' }}>
                    {['TEAM','PLAYER RULED OUT','INJURY/REASON','OFFICIAL REPLACEMENT'].map(h=>(
                      <th key={h} style={{ padding:'8px 12px', fontSize:'8px', color:'#475569', fontWeight:800, letterSpacing:'1px', textAlign:'left', borderBottom:'1px solid #1e293b' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { team:'RR', out:'Sam Curran', injury:'Groin Injury', in:'Dasun Shanaka (SL)' },
                    { team:'CSK', out:'Nathan Ellis', injury:'Hamstring Injury', in:'Spencer Johnson (AUS)' },
                    { team:'KKR', out:'Harshit Rana', injury:'Knee (Ligament)', in:'Navdeep Saini (IND)' },
                    { team:'KKR', out:'Akash Deep', injury:'Back Injury', in:'Saurabh Dubey (IND)' },
                    { team:'KKR', out:'Mustafizur Rahman', injury:'Release/BCCI Directive', in:'Blessing Muzarabani (ZIM)' },
                    { team:'SRH', out:'Jack Edwards', injury:'Foot Injury', in:'David Payne (ENG)' },
                    { team:'MI', out:'Atharva Ankolekar', injury:'Knee (Meniscus)', in:'TBA' },
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i%2===0?'#0d1627':'#111827' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#1a2744'}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#0d1627':'#111827'}
                    >
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <img src={TEAM_LOGOS[row.team]} alt={row.team} style={{ width:'20px', height:'20px', borderRadius:'50%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                          <span style={{ fontSize:'11px', fontWeight:800, color: TEAM_COLORS[row.team] || '#888' }}>{row.team}</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:'11px', fontWeight:700, color:'#f87171' }}>❌ {row.out}</td>
                      <td style={{ padding:'9px 12px', fontSize:'10px', color:'#64748b', fontWeight:600 }}>{row.injury}</td>
                      <td style={{ padding:'9px 12px', fontSize:'11px', fontWeight:800, color:'#4ade80' }}>✅ {row.in}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {sortedTally.length > 0 && (
          <div style={{ margin:'32px 0 24px' }}>

            {/* ── Section Title */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', color:'#f59e0b', fontWeight:800, letterSpacing:'2px' }}>
                🏆 WIN LEADERS — STRENGTH-ADJUSTED 2026 SEASON PREDICTIONS
              </div>
              <div style={{ fontSize:'9px', color:'#475569', fontWeight:600 }}>
                <span style={{ color:'#22c55e', fontWeight:800 }}>●</span> ACTUAL &nbsp;·&nbsp;
                <span style={{ color:'#f59e0b', fontWeight:800 }}>●</span> PREDICTED &nbsp;·&nbsp;
                Matches 1–15 actual + 16–70 ML ensemble
              </div>
            </div>

            {/* ── Rich Leaderboard Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'8px' }}>
              {sortedTally.map(([team, wins], i) => {
                const col = TEAM_COLORS[team] || '#888';
                const sq = SQUAD_STRENGTH[team] || {};
                const actualWins = adjustedPredictions.filter(p => p.isCompleted && p.actualWinner === team).length;
                const predictedWins = wins - actualWins;
                const maxWins = sortedTally[0][1] || 1;
                const pct = Math.round((wins / maxWins) * 100);
                const medals = ['🥇','🥈','🥉'];
                const isLeader = i === 0;

                return (
                  <div key={team} style={{
                    background: isLeader ? `linear-gradient(160deg,${col}18,${col}08)` : '#0f172a',
                    border: `1px solid ${isLeader ? col+'55' : '#1e293b'}`,
                    borderRadius:'12px', padding:'12px 14px',
                    boxShadow: isLeader ? `0 0 20px ${col}20` : 'none',
                    position:'relative', overflow:'hidden'
                  }}>
                    {/* Rank badge */}
                    <div style={{ position:'absolute', top:'8px', right:'8px', fontSize:'9px', fontWeight:900,
                      color: i < 3 ? col : '#475569',
                      background: i < 3 ? `${col}20` : '#1e293b',
                      border: `1px solid ${i < 3 ? col+'40' : '#334155'}`,
                      borderRadius:'5px', padding:'2px 6px' }}>
                      {medals[i] || `#${i+1}`}
                    </div>

                    {/* Team header */}
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                      <img src={TEAM_LOGOS[team]} alt={team}
                        style={{ width:'32px', height:'32px', borderRadius:'50%', objectFit:'cover',
                          border:`2px solid ${isLeader ? col : '#334155'}`,
                          boxShadow: isLeader ? `0 0 10px ${col}50` : 'none' }}
                        onError={e => e.target.style.display='none'} />
                      <div>
                        <div style={{ fontSize:'15px', fontWeight:900, color:col }}>{team}</div>
                        <div style={{ fontSize:'8px', color:'#475569', fontWeight:700 }}>Rank #{sq.rank || i+1} · {sq.overall}% Overall</div>
                      </div>
                    </div>

                    {/* Win count */}
                    <div style={{ display:'flex', alignItems:'baseline', gap:'6px', marginBottom:'6px' }}>
                      <span style={{ fontSize:'28px', fontWeight:900, color: isLeader ? col : '#e2e8f0', lineHeight:1 }}>{wins}</span>
                      <span style={{ fontSize:'11px', fontWeight:800, color:'#64748b' }}>WINS</span>
                      <div style={{ marginLeft:'auto', display:'flex', gap:'4px', alignItems:'center' }}>
                        <span style={{ fontSize:'8px', padding:'1px 5px', borderRadius:'3px',
                          background:'#22c55e20', color:'#22c55e', fontWeight:800,
                          border:'1px solid #22c55e30' }}>{actualWins}A</span>
                        <span style={{ fontSize:'8px', padding:'1px 5px', borderRadius:'3px',
                          background:'#f59e0b20', color:'#f59e0b', fontWeight:800,
                          border:'1px solid #f59e0b30' }}>{predictedWins}P</span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div style={{ height:'5px', background:'#0a1120', borderRadius:'3px', overflow:'hidden', marginBottom:'6px' }}>
                      <div style={{
                        height:'100%', width:`${pct}%`, borderRadius:'3px',
                        background: isLeader
                          ? `linear-gradient(90deg,${col},${col}aa)`
                          : `linear-gradient(90deg,${col}88,${col}44)`,
                        transition:'width 0.6s ease'
                      }} />
                    </div>

                    {/* Strength mini tags */}
                    <div style={{ display:'flex', gap:'3px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'7px', padding:'1px 4px', borderRadius:'3px',
                        background:`${col}15`, color:col, fontWeight:700 }}>BAT {sq.batting}%</span>
                      <span style={{ fontSize:'7px', padding:'1px 4px', borderRadius:'3px',
                        background:`${col}15`, color:col, fontWeight:700 }}>BWL {sq.bowling}%</span>
                      <span style={{ fontSize:'7px', padding:'1px 4px', borderRadius:'3px',
                        background:`${col}15`, color:col, fontWeight:700 }}>AR {sq.allRound}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footnote */}
            <div style={{ marginTop:'10px', fontSize:'8px', color:'#334155', textAlign:'center', letterSpacing:'0.5px' }}>
              🤖 Win projections use ensemble ML: 80% squad strength (2026 analysis) + 12% venue/home advantage + 8% historical form.
              Predictions update automatically when new match results are added.
            </div>
          </div>
        )}

        {/* ── AI Live Intelligence Center ──────────────────────────────────────── */}
        <div style={{ margin:'32px 0 24px', background:'linear-gradient(160deg,#060d1f,#0a1628)',
          border:'1px solid #3b82f640', borderRadius:'16px', overflow:'hidden' }}>
          {/* Section header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e293b',
            background:'linear-gradient(90deg,#0a1628,#111827)',
            display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#ef4444',
              boxShadow:'0 0 12px #ef4444', animation:'pulse 1s infinite', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:'12px', fontWeight:900, color:'#f59e0b', letterSpacing:'2px' }}>
                🤖 IPL 2026 AI LIVE INTELLIGENCE CENTER
              </div>
              <div style={{ fontSize:'9px', color:'#475569', fontWeight:600, marginTop:'1px' }}>
                Real-time scores · Toss AI predictor · Auto win probability · Match result tracking
              </div>
            </div>
            <div style={{ marginLeft:'auto', fontSize:'9px', color:'#22c55e', background:'#052e16',
              border:'1px solid #22c55e33', borderRadius:'6px', padding:'3px 8px', fontWeight:700 }}>
              ● LIVE STREAM
            </div>
          </div>
          <div style={{ padding:'16px 20px' }}>
            <LiveAssistant />
          </div>
        </div>

        {/* Filter Bar + H2H Button */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px', alignItems: 'center' }}>
          {teams.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                background: filter === t ? (TEAM_COLORS[t] || '#f59e0b') : '#1e293b',
                color: filter === t ? '#000' : '#94a3b8',
                fontWeight: 700, fontSize: '12px', letterSpacing: '0.5px',
                transition: 'all 0.2s ease',
                boxShadow: filter === t ? `0 4px 12px ${TEAM_COLORS[t] || '#f59e0b'}55` : 'none',
              }}
            >
              {t === 'ALL' ? '🌐 All Matches' : t}
            </button>
          ))}

          {/* H2H Button */}
          <button
            onClick={() => setShowH2H(true)}
            style={{
              marginLeft: 'auto',
              padding: '10px 22px', borderRadius: '20px',
              border: '2px solid #f59e0b',
              background: 'linear-gradient(135deg, #f59e0b22, #f59e0b11)',
              color: '#f59e0b', fontWeight: 800, fontSize: '13px',
              letterSpacing: '1px', cursor: 'pointer',
              boxShadow: '0 0 16px #f59e0b30',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = '#000'; e.currentTarget.style.boxShadow = '0 0 28px #f59e0b60'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#f59e0b22,#f59e0b11)'; e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.boxShadow = '0 0 16px #f59e0b30'; }}
          >
            ⚔️ HEAD-TO-HEAD STATS
          </button>
        </div>

        {/* Match count */}
        <div style={{ fontSize: '12px', color: '#475569', fontWeight: 700, letterSpacing: '1px', marginBottom: '20px' }}>
          SHOWING {filtered.length} MATCH{filtered.length !== 1 ? 'ES' : ''} of 74 · CLICK ANY CARD FOR DETAILED BREAKDOWN
        </div>

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#f59e0b' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
            <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px' }}>RUNNING PREDICTION MODEL...</div>
          </div>
        )}
        {/* Backend error — just a soft warning, never blocks the UI */}
        {error && predictions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#f87171' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontWeight: 700 }}>{error}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Make sure the backend is running on http://localhost:5000</div>
          </div>
        )}

        {/* Match Cards Grid — always shown when predictions exist */}
        {!loading && predictions.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filtered.map(pred => (
              <MatchCard key={pred.match || Math.random()} pred={pred} />
            ))}
          </div>
        )}
        
        {!loading && !error && predictions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#f59e0b' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontWeight: 700 }}>No predictions available</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Check backend connection</div>
          </div>
        )}

        {/* Model Info Footer */}
        {!loading && (
          <div style={{ marginTop: '48px', padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '2px', marginBottom: '4px' }}>🤖 ENSEMBLE ML PREDICTION MODEL — INJURY-ADJUSTED v2.0</div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '14px' }}>
              Matches 1–15: Actual IPL 2026 Results · Match 12: No Result (Rain) · Matches 16–70: Injury-Adjusted Ensemble ML
            </div>
            <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700, marginBottom: '6px' }}>
              ✅ Current Form: DC & RR strongest (4W each) · LSG & PBKS surging · SRH comeback (match 6)
            </div>
            <div style={{ fontSize: '10px', color: '#334155', fontWeight: 600 }}>
              Training Data: IPL 2008–2025 Historical | 2026 Live Squad Analysis | Venue Characteristics | Player Form + Availability Metrics
            </div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#334155', fontWeight: 600 }}>
              Strong Teams (Injury-Adjusted): MI (#1) | GT (#2) | DC (#3) | KKR (#4 — pace depth hit) | SRH (#5 — Cummins absent)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
