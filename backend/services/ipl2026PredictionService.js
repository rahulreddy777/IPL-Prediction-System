/**
 * IPL 2026 Match Prediction Service
 *
 * Multi-factor weighted scoring model:
 * - Head-to-Head (30%): Historical win % between two teams
 * - Venue Advantage (20%): Win % at specific venue / home advantage
 * - Player Batting SR (20%): Avg strike rate of top batsmen (with form boost)
 * - Player Bowling Economy (20%): Avg economy of key bowlers (lower = better)
 * - Recent Form (10%): International tournament performance + rankings
 *
 * Team Rankings (2026):
 * #1 MI — Most Balanced (Rohit/SKY/Tilak/de Kock + Bumrah/Boult/Hardik/Will Jacks)
 * #2 GT — Strongest Bowling & Top Order (Sai Sudharsan/Gill/Buttler + Rashid/Rabada/Siraj)
 * #3 DC — Tactical Reset & Spin Dominance (KL Rahul/Miller/Stubbs + Axar/Kuldeep/Starc)
 * #4 KKR — All-Rounder Specialists (Cameron Green/Allen/Rinku + Narine/Varun)
 */

const fs = require('fs');
const path = require('path');

// ─── Load raw data ───────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, '..', 'data');

const matchesList = JSON.parse(fs.readFileSync(path.join(dataDir, 'ipl_2026_matches_schedule.json'), 'utf8'));
const headToHead  = JSON.parse(fs.readFileSync(path.join(dataDir, 'head to head in .json'), 'utf8'));
const playerStats = JSON.parse(fs.readFileSync(path.join(dataDir, 'player_stats_2026.json'), 'utf8'));

// ─── Team colors ─────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  CSK: '#F9CD05', MI: '#1E90FF', KKR: '#7B2FBE', RR: '#EA1A85',
  RCB: '#D4101A', DC: '#0057A8', SRH: '#F26522', GT: '#00B4D8',
  PBKS: '#DD1F2D', LSG: '#00BFFF'
};

const TEAM_LOGOS = {
  CSK: '/teams/csk.jpg', MI: '/teams/MI.jpg', KKR: '/teams/kkr.jpg',
  RR: '/teams/rr.jpg', RCB: '/teams/rcb.jpg', DC: '/teams/dc.jpg',
  SRH: '/teams/srh.jpg', GT: '/teams/gt.jpg', PBKS: '/teams/pbks.jpg', LSG: '/teams/lsg.jpg'
};

// ─── Venue home-team mapping ─────────────────────────────────────────────────
const VENUE_HOME_TEAM = {
  'Bengaluru':   'RCB',
  'Mumbai':      'MI',
  'Kolkata':     'KKR',
  'Chennai':     'CSK',
  'Hyderabad':   'SRH',
  'Delhi':       'DC',
  'Ahmedabad':   'GT',
  'Mullanpur':   'PBKS',
  'Lucknow':     'LSG',
  'Jaipur':      'RR',
  'Guwahati':    null  // neutral venue
};

// Historical venue win rates (approx from IPL data 2008-2025 for home teams)
const VENUE_HOME_WIN_PCT = {
  'Bengaluru':  55,
  'Mumbai':     60,
  'Kolkata':    58,
  'Chennai':    63,
  'Hyderabad':  56,
  'Delhi':      54,
  'Ahmedabad':  57,
  'Mullanpur':  54,
  'Lucknow':    56,
  'Jaipur':     55,
  'Guwahati':   50  // neutral
};

// ─── Toss Preference per Venue ────────────────────────────────────────────────
// 'chase' = chasing is better, 'defend' = defending is better, 'neutral' = even
const VENUE_TOSS_PREF = {
  'Bengaluru':  { pref: 'chase',   advantage: 62 },   // Dew-heavy, high-scoring, chasing favored
  'Mumbai':     { pref: 'chase',   advantage: 58 },   // Wankhede dew factor
  'Kolkata':    { pref: 'chase',   advantage: 55 },   // Eden Gardens - moderate chase advantage
  'Chennai':    { pref: 'defend',  advantage: 60 },   // Chepauk spin pitch, defending better
  'Hyderabad':  { pref: 'chase',   advantage: 57 },   // Uppal - flat deck, chasing better
  'Delhi':      { pref: 'neutral', advantage: 50 },   // Kotla - even split
  'Ahmedabad':  { pref: 'chase',   advantage: 56 },   // Narendra Modi - big ground, chasing
  'Mullanpur':  { pref: 'chase',   advantage: 54 },   // New Punjab ground
  'Lucknow':    { pref: 'chase',   advantage: 55 },   // BRSABV Stadium
  'Jaipur':     { pref: 'defend',  advantage: 52 },   // Sawai Mansingh - spin, defending slight edge
  'Guwahati':   { pref: 'neutral', advantage: 50 }    // Neutral venue
};

// ─── Squad Strength Scores (0–100) ───────────────────────────────────────────
// Based on user-provided squad analysis: Batting + Bowling + All-rounders depth
const SQUAD_STRENGTH = {
  // #1 MI — Most Balanced: Rohit/SKY/Tilak/de Kock + Bumrah/Boult/Hardik + Will Jacks 4×MoM
  MI:   { batting: 97, bowling: 97, allRound: 95, overall: 97,
          depth: 'Elite — 5 international match-winners in each dept.' },
  // #2 GT — Strongest Bowling & Top-3 Stability: Sudharsan/Gill/Buttler + Rashid/Rabada/Siraj/Prasidh
  GT:   { batting: 88, bowling: 98, allRound: 88, overall: 92,
          depth: 'Elite bowling; top-3 most stable in IPL' },
  // #3 DC — Tactical Reset: KL Rahul/Miller/Stubbs + Axar/Kuldeep/Starc (if fit)
  DC:   { batting: 84, bowling: 91, allRound: 87, overall: 87,
          depth: 'Best spin duo in league + pricey overseas finishers' },
  // #4 KKR — All-Rounder Specialists: Cameron Green/Allen/Rinku + Narine/Varun
  KKR:  { batting: 90, bowling: 83, allRound: 95, overall: 87,
          depth: 'Most all-rounders; pace depth fragile due to injuries' },
  // SRH — Explosive batting: Travis Head/Abhishek/Klaasen/Ishan + Harshal
  SRH:  { batting: 93, bowling: 79, allRound: 76, overall: 83,
          depth: 'Attack-first philosophy; bowling relatively thinner' },
  // RCB — Bethell/Kohli/Salt + Hazlewood/Bhuvi
  RCB:  { batting: 86, bowling: 78, allRound: 74, overall: 80,
          depth: 'Star batting lineup; bowling depth a concern' },
  // CSK — Samson/Ruturaj/Brevis + spin attack; Dhoni WK experience
  CSK:  { batting: 84, bowling: 76, allRound: 77, overall: 79,
          depth: 'Experienced core; Dhoni mentorship factor' },
  // RR — Vaibhav Suryavanshi/Jadeja/Curran + Riyan Parag (capt)
  RR:   { batting: 80, bowling: 74, allRound: 80, overall: 76,
          depth: 'Exciting youngsters; balanced but not elite' },
  // LSG — Pant/Pooran SR 168 + Shami (returning)
  LSG:  { batting: 82, bowling: 72, allRound: 71, overall: 74,
          depth: 'Big hitters up top; bowling depth concern' },
  // PBKS — Shreyas Iyer/Maxwell; solid but lacks elite depth
  PBKS: { batting: 78, bowling: 70, allRound: 69, overall: 71,
          depth: 'Competent squad; no standout bowling ace' }
};

// ─── Recent Form Scores (0–100) ────────────────────────────────────────────────
// Based on 2026 T20 WC performance + IPL 2025 form + squad quality
const TEAM_FORM_SCORES = {
  MI:   97, // #1 — World's best pace attack + batting depth + Will Jacks 4×MoM
  GT:   88, // #2 — Sai Sudharsan Orange Cap 759 runs + Rashid #1 bowler
  DC:   82, // #3 — Axar+Kuldeep elite spin + KL Rahul + David Miller
  KKR:  87, // #4 — Cameron Green ₹25.2cr + Finn Allen fastest WC century
  SRH:  84, // Abhishek #1 T20I + Head power play destroyer + Klaasen
  RCB:  80, // Bethell WC semi century + Kohli 8861 IPL runs + Hazlewood
  CSK:  79, // Sanju Samson WC POT + Ruturaj + Dhoni WK
  RR:   71, // Vaibhav Suryavanshi + Jadeja + Curran
  LSG:  70, // Pant + Pooran SR 168 + Shami return
  PBKS: 67  // Shreyas Iyer + Maxwell — solid but unspectacular depth
};

// ─── International Form Boost ─────────────────────────────────────────────────
const INTERNATIONAL_FORM_BOOST = {
  MI:   { battingBoost: 22, bowlingBoost: 22 },  // Rohit/SKY/Tilak/de Kock + Bumrah/Boult/Hardik/Jacks
  KKR:  { battingBoost: 18, bowlingBoost: 16 },  // Allen/Green/Rinku + Pathirana/Varun/Narine
  GT:   { battingBoost: 14, bowlingBoost: 21 },  // Sudharsan/Buttler/Gill + Rashid/Rabada/Prasidh/Siraj
  SRH:  { battingBoost: 17, bowlingBoost: 11 },  // Head/Abhishek/Klaasen/Ishan + Harshal
  DC:   { battingBoost: 10, bowlingBoost: 18 },  // KL Rahul/Miller/Stubbs + Axar+Kuldeep+Starc
  RCB:  { battingBoost: 14, bowlingBoost: 10 },  // Bethell/Kohli + Hazlewood/Bhuvi
  CSK:  { battingBoost: 12, bowlingBoost: 5  },  // Sanju POT, Dhoni experience
  RR:   { battingBoost: 8,  bowlingBoost: 10 },  // Vaibhav + Jadeja/Curran
  LSG:  { battingBoost: 8,  bowlingBoost: 4  },  // Pant + Pooran big hitters
  PBKS: { battingBoost: 4,  bowlingBoost: 4  }   // Maxwell + Shreyas
};

// ─── Pitch Type ───────────────────────────────────────────────────────────────
const VENUE_PITCH_TYPE = {
  'Bengaluru':  { type: 'Batting', avgScore: 182, spinFriendly: false },
  'Mumbai':     { type: 'Batting', avgScore: 175, spinFriendly: false },
  'Kolkata':    { type: 'Balanced', avgScore: 168, spinFriendly: true },
  'Chennai':    { type: 'Spin', avgScore: 161, spinFriendly: true },
  'Hyderabad':  { type: 'Batting', avgScore: 178, spinFriendly: false },
  'Delhi':      { type: 'Balanced', avgScore: 170, spinFriendly: true },
  'Ahmedabad':  { type: 'Balanced', avgScore: 169, spinFriendly: true },
  'Mullanpur':  { type: 'Batting', avgScore: 171, spinFriendly: false },
  'Lucknow':    { type: 'Batting', avgScore: 172, spinFriendly: false },
  'Jaipur':     { type: 'Spin',    avgScore: 162, spinFriendly: true },
  'Guwahati':   { type: 'Balanced', avgScore: 164, spinFriendly: true }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getH2HScore(team1, team2) {
  const records = headToHead[team1] || [];
  const record = records.find(r => r.opponent === team2);
  if (!record || record.total === 0) return 50;
  return Math.round((record.wins / record.total) * 100);
}

function getVenueScore(team, venue) {
  const homeTeam = VENUE_HOME_TEAM[venue];
  const homeWinPct = VENUE_HOME_WIN_PCT[venue] || 50;

  if (homeTeam === team) {
    return homeWinPct;
  } else if (homeTeam === null) {
    return 50;
  } else {
    return 100 - homeWinPct;
  }
}

function getBattingScore(teamCode) {
  const teamKey = teamCode.toLowerCase();
  const squad = playerStats[teamKey] || {};
  const boost = INTERNATIONAL_FORM_BOOST[teamCode]?.battingBoost || 0;

  const batters = Object.values(squad).filter(p => p.sr && p.sr > 100 && p.runs && p.matches > 5);
  if (batters.length === 0) return 130 + boost;

  batters.sort((a, b) => {
    const scoreA = (a.sr || 0) * Math.sqrt(a.avg || 25) * Math.log(Math.max(a.matches, 2));
    const scoreB = (b.sr || 0) * Math.sqrt(b.avg || 25) * Math.log(Math.max(b.matches, 2));
    return scoreB - scoreA;
  });

  const top5 = batters.slice(0, 5);
  const avgSR = top5.reduce((sum, p) => sum + (p.sr || 130), 0) / top5.length;
  return Math.round(avgSR + boost);
}

function getBowlingScore(teamCode) {
  const teamKey = teamCode.toLowerCase();
  const squad = playerStats[teamKey] || {};
  const boost = INTERNATIONAL_FORM_BOOST[teamCode]?.bowlingBoost || 0;

  const bowlers = Object.values(squad).filter(p => p.econ && p.wkts && p.matches > 3);
  if (bowlers.length === 0) return 50 + boost;

  bowlers.sort((a, b) => {
    const impactA = ((a.wkts || 0) / Math.max(a.matches, 1)) * (12 - (a.econ || 9));
    const impactB = ((b.wkts || 0) / Math.max(b.matches, 1)) * (12 - (b.econ || 9));
    return impactB - impactA;
  });

  const top5 = bowlers.slice(0, 5);
  const avgEcon = top5.reduce((sum, p) => sum + (p.econ || 9), 0) / top5.length;
  const econScore = Math.max(0, Math.min(100, ((12 - avgEcon) / 5) * 100));
  return Math.round(econScore + boost);
}

function getSquadStrengthScore(team) {
  const s = SQUAD_STRENGTH[team];
  if (!s) return 75;
  return s.overall;
}

/**
 * Pressure Index: measures how much pressure a team can handle
 * Based on batting depth, key players' big-match experience, and all-round strength
 */
function getPressureIndex(team) {
  const s = SQUAD_STRENGTH[team];
  if (!s) return 70;
  // Weighted: batting 30%, bowling 30%, all-round 40%
  return Math.round(s.batting * 0.30 + s.bowling * 0.30 + s.allRound * 0.40);
}

function minMaxScale(val, min, max) {
  if (max === min) return 0.5;
  return (val - min) / (max - min);
}

/**
 * Main prediction function for a single match
 * Weights: H2H 30%, Venue 20%, Batting 20%, Bowling 20%, Form 10%
 */
function predictMatch(match) {
  const parts = match.Matchup.split(' vs ');
  const team1 = parts[0].trim();
  const team2 = parts[1].trim();
  const venue = match.Venue;

  // ── Feature Scores ──────────────────────────────────────────────────────────

  // 1. H2H (0–100 scale, team1 wins %)
  const h2h1 = getH2HScore(team1, team2);
  const h2h2 = 100 - h2h1;

  // 2. Venue advantage (0–100)
  const venue1 = getVenueScore(team1, venue);
  const venue2 = getVenueScore(team2, venue);

  // 3. Batting (strike rate based, higher = better)
  const bat1Raw = getBattingScore(team1);
  const bat2Raw = getBattingScore(team2);
  const batMax = Math.max(bat1Raw, bat2Raw);
  const batMin = Math.min(bat1Raw, bat2Raw) - 10;
  const bat1 = Math.round(minMaxScale(bat1Raw, batMin, batMax) * 100);
  const bat2 = Math.round(minMaxScale(bat2Raw, batMin, batMax) * 100);

  // 4. Bowling (higher = better)
  const bowl1 = getBowlingScore(team1);
  const bowl2 = getBowlingScore(team2);
  const bowlMax = Math.max(bowl1, bowl2);
  const bowlMin = Math.min(bowl1, bowl2) - 10;
  const bowlN1 = Math.round(minMaxScale(bowl1, bowlMin, bowlMax) * 100);
  const bowlN2 = Math.round(minMaxScale(bowl2, bowlMin, bowlMax) * 100);

  // 5. Recent form (0–100)
  const form1 = TEAM_FORM_SCORES[team1] || 50;
  const form2 = TEAM_FORM_SCORES[team2] || 50;

  // ── Weighted Score ──────────────────────────────────────────────────────────
  const W_H2H  = 0.30;
  const W_VENUE = 0.20;
  const W_BAT  = 0.20;
  const W_BOWL = 0.20;
  const W_FORM = 0.10;

  const score1 = (h2h1 * W_H2H) + (venue1 * W_VENUE) + (bat1 * W_BAT) + (bowlN1 * W_BOWL) + (form1 * W_FORM);
  const score2 = (h2h2 * W_H2H) + (venue2 * W_VENUE) + (bat2 * W_BAT) + (bowlN2 * W_BOWL) + (form2 * W_FORM);

  const total = score1 + score2;
  const pct1 = Math.round((score1 / total) * 100);
  const pct2 = 100 - pct1;

  const predictedWinner = pct1 >= pct2 ? team1 : team2;
  const confidence = Math.max(pct1, pct2);

  // ── Squad Strength & Pressure ────────────────────────────────────────────────
  const squad1 = SQUAD_STRENGTH[team1] || { batting: 75, bowling: 70, allRound: 70, overall: 75, depth: 'Good squad' };
  const squad2 = SQUAD_STRENGTH[team2] || { batting: 75, bowling: 70, allRound: 70, overall: 75, depth: 'Good squad' };
  const pressure1 = getPressureIndex(team1);
  const pressure2 = getPressureIndex(team2);

  // ── Toss Impact ──────────────────────────────────────────────────────────────
  const tossInfo = VENUE_TOSS_PREF[venue] || { pref: 'neutral', advantage: 50 };

  // ── Pitch Info ───────────────────────────────────────────────────────────────
  const pitchInfo = VENUE_PITCH_TYPE[venue] || { type: 'Balanced', avgScore: 165, spinFriendly: false };

  return {
    match:          match.Match,
    date:           match.Date,
    day:            match.Day,
    venue:          venue,
    time:           match.Time_IST,
    team1,
    team2,
    team1Color:     TEAM_COLORS[team1]  || '#888',
    team2Color:     TEAM_COLORS[team2]  || '#888',
    team1Logo:      TEAM_LOGOS[team1]   || '',
    team2Logo:      TEAM_LOGOS[team2]   || '',
    predictedWinner,
    winnerColor:    TEAM_COLORS[predictedWinner] || '#888',
    confidence,
    winProbability: { [team1]: pct1, [team2]: pct2 },
    breakdown: {
      h2h:          { team1: h2h1,   team2: h2h2   },
      venue:        { team1: venue1, team2: venue2  },
      batting:      { team1: bat1,   team2: bat2,   raw1: bat1Raw, raw2: bat2Raw },
      bowling:      { team1: bowlN1, team2: bowlN2, raw1: bowl1,   raw2: bowl2  },
      form:         { team1: form1,  team2: form2   },
      squadStrength:{ team1: squad1.overall, team2: squad2.overall }
    },
    squadInfo: {
      [team1]: squad1,
      [team2]: squad2
    },
    keyMetrics: {
      recentForm:         { team1: form1,     team2: form2 },
      venueAdvantage:     { team1: venue1,    team2: venue2 },
      h2hRatio:           { team1: h2h1,      team2: h2h2 },
      pressureIndex:      { team1: pressure1, team2: pressure2 },
      squadStrength:      { team1: squad1.overall, team2: squad2.overall }
    },
    tossImpact: {
      preference: tossInfo.pref,
      chasingAdvantage: tossInfo.advantage,
      description: tossInfo.pref === 'chase'
        ? `Chasing is preferred at ${venue} (${tossInfo.advantage}% chase win rate)`
        : tossInfo.pref === 'defend'
        ? `Defending is preferred at ${venue} (${tossInfo.advantage}% defend win rate)`
        : `Even split at ${venue} — toss decision unpredictable`
    },
    pitchInfo: {
      type: pitchInfo.type,
      avgScore: pitchInfo.avgScore,
      spinFriendly: pitchInfo.spinFriendly,
      description: `${pitchInfo.type} pitch · Avg score: ${pitchInfo.avgScore}${pitchInfo.spinFriendly ? ' · Spin-friendly' : ' · Pace-friendly'}`
    },
    keyPlayers: getKeyPlayers(team1, team2)
  };
}

/**
 * Get top key players for each team in a matchup
 */
function getKeyPlayers(team1, team2) {
  const internationalStars = {
    MI:   [
      'Jasprit Bumrah (4/15 WC Final, World #1 Bowler) + Trent Boult',
      'Rohit Sharma + Suryakumar Yadav + Tilak Varma + Quinton de Kock',
      'Will Jacks (4× MoM T20 WC 2026) + Hardik Pandya (all-round)',
      'Mitchell Santner (spin depth) + Deepak Chahar'
    ],
    KKR:  [
      'Finn Allen (Fastest WC T20 Century — 33 balls)',
      'Cameron Green (₹25.2cr — middle-order + pace all-round)',
      'Varun Chakravarthy (joint top wicket-taker T20 WC) + Sunil Narine',
      'Matheesha Pathirana (death-over specialist)',
      'Rinku Singh (Vice-Captain, finisher) + Rachin Ravindra'
    ],
    GT:   [
      'Sai Sudharsan (2025 Orange Cap – 759 runs)',
      'Shubman Gill (captain) + Jos Buttler (explosive opener)',
      'Rashid Khan (#1 T20I Bowler) + Kagiso Rabada (pace spearhead)',
      'Mohammed Siraj + Prasidh Krishna (25 wickets 2025)',
      'Washington Sundar + Jason Holder (all-round balance)'
    ],
    SRH:  [
      'Travis Head (power-play destroyer) + Ishan Kishan (captain)',
      'Abhishek Sharma (#1 T20I Batter + left-arm spin)',
      'Heinrich Klaasen (batting powerhouse, SR 157)',
      'Harshal Patel (death-over specialist)'
    ],
    RCB:  [
      'Jacob Bethell (WC Semi Century vs India, 2026)',
      'Virat Kohli (267 IPL matches, 8861 runs)',
      'Phil Salt (aggressive opener)',
      'Josh Hazlewood + Bhuvneshwar Kumar (death bowling)'
    ],
    CSK:  [
      'Sanju Samson (WC Player of Tournament 2026)',
      'Ruturaj Gaikwad + Dewald Brevis (batting)',
      'MS Dhoni (WK — wickets + experience)',
      'Ravindra Jadeja (batting + spin all-round)'
    ],
    DC:   [
      'KL Rahul (returning to opening + captaincy)',
      'David Miller + Tristan Stubbs (elite finishers)',
      'Pathum Nissanka (top-order stability)',
      'Axar Patel (captain) + Kuldeep Yadav (best spin duo in IPL)',
      'Mitchell Starc (pace threat, if fit) + Auqib Nabi Dar (60 Ranji wkts)'
    ],
    RR:   [
      'Vaibhav Suryavanshi (175 off 80 balls vs England U19)',
      'Riyan Parag (captain) + Shimron Hetmyer (power hitting)',
      'Ravindra Jadeja + Sam Curran (versatile all-rounders)',
      'Jofra Archer (returning to pace) + Maheesh Theekshana'
    ],
    LSG:  [
      'Rishabh Pant (captain, 125 IPL games, match-winner)',
      'Nicholas Pooran (SR 168.98, T20 explosive bat)',
      'Mohammed Shami (returning to form, pace ace)',
      'Ravi Bishnoi (wrist spin) + David Miller'
    ],
    PBKS: [
      'Shreyas Iyer (captain, anchor batter, IPL experience)',
      'Glenn Maxwell (power hitter + off-spin versatility)',
      'Josh Inglis (wicket-keeper-bat)',
      'Arshdeep Singh (left-arm pace, death specialist)'
    ]
  };
  return {
    [team1]: internationalStars[team1] || [],
    [team2]: internationalStars[team2] || []
  };
}

/**
 * Generate predictions for all 20 matches
 */
function getAllPredictions() {
  return matchesList.map(match => predictMatch(match));
}

module.exports = { getAllPredictions, predictMatch, SQUAD_STRENGTH, TEAM_FORM_SCORES };
