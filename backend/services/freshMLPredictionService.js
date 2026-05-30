const fs = require('fs')
const path = require('path')
const IPL2026Prediction = require('../models/IPL2026Prediction')

// ───────────────────────────────────────────────────────────────────────────────
// FRESH ML PREDICTION SERVICE FOR IPL 2026
// Uses Database as Data Module with Historical Data
// ───────────────────────────────────────────────────────────────────────────────

// ML Model Weights
const ML_WEIGHTS = {
  squadStrength: 0.25,
  headToHead: 0.20,
  venueAdvantage: 0.15,
  recentForm: 0.15,
  keyPlayers: 0.15,
  tossImpact: 0.10
}

// Team Colors
const TEAM_COLORS = {
  CSK: '#fbbf24', MI: '#1d4ed8', RCB: '#dc2626', KKR: '#7c3aed',
  RR: '#ea580c', PBKS: '#dc2626', DC: '#1d4ed8', SRH: '#f97316',
  GT: '#1e40af', LSG: '#3b82f6'
}

// Load Historical Data from JSON Files
function loadHistoricalData() {
  const dataDir = path.join(__dirname, '../data')
  
  try {
    const matches2025Path = path.join(dataDir, 'ipl matches 2025.json.json')
    const historicalPath = path.join(dataDir, 'ipl matches 2008 to 2024..json')
    const h2hPath = path.join(dataDir, 'head to head in .json')
    const batterPath = path.join(dataDir, 'IPL_Batter_Stats_2008_2025.json')
    const bowlerPath = path.join(dataDir, 'IPL_Bowler_Stats_2008_2025.json')
    const schedulePath = path.join(dataDir, 'ipl_2026_matches_schedule.json')
    
    console.log('[ML] Loading data files...')
    console.log('[ML] matches2025:', matches2025Path, '- exists:', fs.existsSync(matches2025Path))
    console.log('[ML] historical:', historicalPath, '- exists:', fs.existsSync(historicalPath))
    console.log('[ML] h2h:', h2hPath, '- exists:', fs.existsSync(h2hPath))
    console.log('[ML] batter:', batterPath, '- exists:', fs.existsSync(batterPath))
    console.log('[ML] bowler:', bowlerPath, '- exists:', fs.existsSync(bowlerPath))
    console.log('[ML] schedule:', schedulePath, '- exists:', fs.existsSync(schedulePath))
    
    const matches2025 = JSON.parse(fs.readFileSync(matches2025Path, 'utf8'))
    const historicalMatches = JSON.parse(fs.readFileSync(historicalPath, 'utf8'))
    const h2hData = JSON.parse(fs.readFileSync(h2hPath, 'utf8'))
    const batterStats = JSON.parse(fs.readFileSync(batterPath, 'utf8'))
    const bowlerStats = JSON.parse(fs.readFileSync(bowlerPath, 'utf8'))
    const matchSchedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'))
    
    console.log('[ML] Data loaded successfully')
    console.log('[ML] Schedule type:', typeof matchSchedule, 'isArray:', Array.isArray(matchSchedule))
    console.log('[ML] Schedule length:', matchSchedule?.length || 'N/A')
    
    return {
      matches2025,
      historicalMatches,
      h2hData,
      batterStats,
      bowlerStats,
      matchSchedule
    }
  } catch (error) {
    console.error('[ML] Error loading historical data:', error.message)
    console.error('[ML] Stack:', error.stack)
    return null
  }
}

// Calculate Squad Strength based on player stats
function calculateSquadStrength(teamCode, batterStats, bowlerStats) {
  const teamBatsmen = batterStats.filter(p => p.team === teamCode)
  const teamBowlers = bowlerStats.filter(p => p.team === teamCode)
  
  // Calculate batting strength (based on average, strike rate)
  let battingStrength = 70 // Base
  if (teamBatsmen.length > 0) {
    const topBatsmen = teamBatsmen.slice(0, 6)
    const avgRuns = topBatsmen.reduce((sum, p) => sum + (parseFloat(p.runs) || 0), 0) / topBatsmen.length
    const avgSR = topBatsmen.reduce((sum, p) => sum + (parseFloat(p.strike_rate) || 0), 0) / topBatsmen.length
    battingStrength = Math.min(95, 60 + (avgRuns / 100) + (avgSR / 200))
  }
  
  // Calculate bowling strength (based on wickets, economy)
  let bowlingStrength = 70 // Base
  if (teamBowlers.length > 0) {
    const topBowlers = teamBowlers.slice(0, 5)
    const avgWickets = topBowlers.reduce((sum, p) => sum + (parseFloat(p.wickets) || 0), 0) / topBowlers.length
    const avgEconomy = topBowlers.reduce((sum, p) => sum + (parseFloat(p.economy) || 0), 0) / topBowlers.length
    bowlingStrength = Math.min(95, 60 + (avgWickets / 2) + ((12 - avgEconomy) * 3))
  }
  
  // All-rounder strength
  const allRoundStrength = Math.round((battingStrength + bowlingStrength) / 2)
  
  // Overall strength
  const overall = Math.round((battingStrength * 0.4 + bowlingStrength * 0.4 + allRoundStrength * 0.2))
  
  return {
    batting: Math.round(battingStrength),
    bowling: Math.round(bowlingStrength),
    allRound: allRoundStrength,
    overall,
    rank: 0 // Will be calculated later
  }
}

// Calculate Head-to-Head from historical data
function calculateHeadToHead(team1, team2, historicalMatches) {
  const h2hMatches = historicalMatches.filter(m => 
    (m.Team1 === team1 && m.Team2 === team2) || 
    (m.Team1 === team2 && m.Team2 === team1)
  )
  
  if (h2hMatches.length === 0) return { team1: 50, team2: 50 }
  
  const team1Wins = h2hMatches.filter(m => m.WinningTeam === team1).length
  const totalMatches = h2hMatches.filter(m => m.WinningTeam).length
  
  if (totalMatches === 0) return { team1: 50, team2: 50 }
  
  const team1WinRate = (team1Wins / totalMatches) * 100
  return {
    team1: Math.round(team1WinRate),
    team2: Math.round(100 - team1WinRate)
  }
}

// Calculate Recent Form (last 10 matches in 2025)
function calculateRecentForm(teamCode, matches2025) {
  const teamMatches = matches2025.filter(m => 
    m.Team1 === teamCode || m.Team2 === teamCode
  ).slice(-10)
  
  if (teamMatches.length === 0) return { form: 75, winRate: 50 }
  
  const wins = teamMatches.filter(m => m.WinningTeam === teamCode).length
  const winRate = (wins / teamMatches.length) * 100
  
  return {
    form: Math.round(60 + (winRate * 0.35)),
    winRate: Math.round(winRate)
  }
}

// Calculate Venue Advantage
function calculateVenueAdvantage(team1, team2, venue, historicalMatches) {
  const venueMatches = historicalMatches.filter(m => m.Venue === venue)
  
  if (venueMatches.length === 0) return { team1: 50, team2: 50 }
  
  const team1Wins = venueMatches.filter(m => m.WinningTeam === team1).length
  const team2Wins = venueMatches.filter(m => m.WinningTeam === team2).length
  const totalMatches = venueMatches.filter(m => m.WinningTeam).length
  
  if (totalMatches === 0) return { team1: 50, team2: 50 }
  
  // Normalize to percentages
  const team1Advantage = (team1Wins / totalMatches) * 100
  const team2Advantage = (team2Wins / totalMatches) * 100
  
  return {
    team1: Math.round(team1Advantage + 40), // Base 40
    team2: Math.round(team2Advantage + 40)
  }
}

// Calculate Key Players Impact
function calculateKeyPlayersImpact(teamCode, batterStats, bowlerStats) {
  const teamBatsmen = batterStats.filter(p => p.team === teamCode)
  const teamBowlers = bowlerStats.filter(p => p.team === teamCode)
  
  // Get top 3 batsmen and bowlers
  const topBatsmen = teamBatsmen.slice(0, 3)
  const topBowlers = teamBowlers.slice(0, 3)
  
  let impact = 70 // Base
  
  // Add impact from top batsmen
  topBatsmen.forEach(p => {
    const runs = parseFloat(p.runs) || 0
    if (runs > 400) impact += 5
    if (runs > 500) impact += 5
  })
  
  // Add impact from top bowlers
  topBowlers.forEach(p => {
    const wickets = parseFloat(p.wickets) || 0
    if (wickets > 15) impact += 5
    if (wickets > 20) impact += 5
  })
  
  return Math.min(95, impact)
}

// Calculate Toss Impact
function calculateTossImpact(team1, team2, venue, historicalMatches) {
  // Simplified toss impact calculation
  const venueMatches = historicalMatches.filter(m => m.Venue === venue && m.TossWinner)
  
  if (venueMatches.length === 0) return { team1: 50, team2: 50 }
  
  const tossWinnersWin = venueMatches.filter(m => m.TossWinner === m.WinningTeam).length
  const tossAdvantage = (tossWinnersWin / venueMatches.length) * 100
  
  return {
    team1: Math.round(50 + (tossAdvantage - 50) * 0.5),
    team2: Math.round(50 - (tossAdvantage - 50) * 0.5)
  }
}

// Main ML Prediction Function
function predictMatch(match, historicalData) {
  const { matches2025, historicalMatches, batterStats, bowlerStats } = historicalData
  
  const { Match, Date, Day, Time_IST, Venue, Matchup } = match
  
  // Parse teams from Matchup string (e.g., "RCB vs SRH")
  const teams = Matchup.split(' vs ')
  if (teams.length !== 2) {
    throw new Error(`Invalid matchup format: ${Matchup}`)
  }
  const team1 = teams[0].trim()
  const team2 = teams[1].trim()
  const venue = Venue
  
  // Calculate all factors
  const squadStrength1 = calculateSquadStrength(team1, batterStats, bowlerStats)
  const squadStrength2 = calculateSquadStrength(team2, batterStats, bowlerStats)
  
  const h2h = calculateHeadToHead(team1, team2, historicalMatches)
  const form1 = calculateRecentForm(team1, matches2025)
  const form2 = calculateRecentForm(team2, matches2025)
  const venueAdv = calculateVenueAdvantage(team1, team2, venue, historicalMatches)
  const keyPlayers1 = calculateKeyPlayersImpact(team1, batterStats, bowlerStats)
  const keyPlayers2 = calculateKeyPlayersImpact(team2, batterStats, bowlerStats)
  const toss = calculateTossImpact(team1, team2, venue, historicalMatches)
  
  // Calculate weighted scores
  const team1Score = (
    squadStrength1.overall * ML_WEIGHTS.squadStrength +
    h2h.team1 * ML_WEIGHTS.headToHead +
    venueAdv.team1 * ML_WEIGHTS.venueAdvantage +
    form1.form * ML_WEIGHTS.recentForm +
    keyPlayers1 * ML_WEIGHTS.keyPlayers +
    toss.team1 * ML_WEIGHTS.tossImpact
  )
  
  const team2Score = (
    squadStrength2.overall * ML_WEIGHTS.squadStrength +
    h2h.team2 * ML_WEIGHTS.headToHead +
    venueAdv.team2 * ML_WEIGHTS.venueAdvantage +
    form2.form * ML_WEIGHTS.recentForm +
    keyPlayers2 * ML_WEIGHTS.keyPlayers +
    toss.team2 * ML_WEIGHTS.tossImpact
  )
  
  // Calculate win probabilities
  const totalScore = team1Score + team2Score
  const team1Prob = Math.round((team1Score / totalScore) * 100)
  const team2Prob = 100 - team1Prob
  
  // Determine winner
  const predictedWinner = team1Prob > team2Prob ? team1 : team2
  const confidence = Math.abs(team1Prob - 50) * 2
  
  return {
    matchNumber: Match,
    date: Date,
    day: Day,
    time: Time_IST,
    venue,
    team1,
    team2,
    predictedWinner,
    winProbability: { team1: team1Prob, team2: team2Prob },
    confidence,
    factors: {
      squadStrength: {
        team1: squadStrength1.overall,
        team2: squadStrength2.overall,
        weight: ML_WEIGHTS.squadStrength
      },
      headToHead: {
        team1: h2h.team1,
        team2: h2h.team2,
        weight: ML_WEIGHTS.headToHead
      },
      venueAdvantage: {
        team1: venueAdv.team1,
        team2: venueAdv.team2,
        weight: ML_WEIGHTS.venueAdvantage
      },
      recentForm: {
        team1: form1.form,
        team2: form2.form,
        weight: ML_WEIGHTS.recentForm
      },
      keyPlayers: {
        team1: keyPlayers1,
        team2: keyPlayers2,
        weight: ML_WEIGHTS.keyPlayers
      },
      tossImpact: {
        team1: toss.team1,
        team2: toss.team2,
        weight: ML_WEIGHTS.tossImpact
      }
    },
    squadInfo: {
      team1: squadStrength1,
      team2: squadStrength2
    },
    keyMetrics: {
      recentForm: { team1: form1.form, team2: form2.form },
      venueAdvantage: { team1: venueAdv.team1, team2: venueAdv.team2 },
      h2hRatio: { team1: h2h.team1, team2: h2h.team2 },
      pressureIndex: { 
        team1: Math.round(95 - (squadStrength1.rank || 5) * 7), 
        team2: Math.round(95 - (squadStrength2.rank || 5) * 7) 
      }
    },
    isPlayoff: match.Playoff || false
  }
}

// Rank all teams based on overall strength
function rankTeams(allPredictions) {
  const teamStrengths = {}
  
  allPredictions.forEach(pred => {
    if (!teamStrengths[pred.team1]) {
      teamStrengths[pred.team1] = { total: 0, count: 0 }
    }
    if (!teamStrengths[pred.team2]) {
      teamStrengths[pred.team2] = { total: 0, count: 0 }
    }
    
    teamStrengths[pred.team1].total += pred.squadInfo.team1.overall
    teamStrengths[pred.team1].count += 1
    teamStrengths[pred.team2].total += pred.squadInfo.team2.overall
    teamStrengths[pred.team2].count += 1
  })
  
  // Calculate averages and sort
  const ranked = Object.entries(teamStrengths)
    .map(([team, data]) => ({
      team,
      avg: data.total / data.count
    }))
    .sort((a, b) => b.avg - a.avg)
  
  // Assign ranks
  const ranks = {}
  ranked.forEach((item, index) => {
    ranks[item.team] = index + 1
  })
  
  return ranks
}

// ───────────────────────────────────────────────────────────────────────────────
// SERVICE METHODS
// ───────────────────────────────────────────────────────────────────────────────

// Generate Fresh Predictions for All 74 Matches
async function generateFreshPredictions() {
  try {
    console.log('[ML Service] Loading historical data...')
    const historicalData = loadHistoricalData()
    
    if (!historicalData) {
      throw new Error('Failed to load historical data')
    }
    
    console.log('[ML Service] Generating fresh ML predictions...')
    
    // Generate predictions for all matches
    const allPredictions = []
    for (const match of historicalData.matchSchedule) {
      const prediction = predictMatch(match, historicalData)
      allPredictions.push(prediction)
    }
    
    // Rank teams
    const ranks = rankTeams(allPredictions)
    
    // Add ranks to squad info
    allPredictions.forEach(pred => {
      pred.squadInfo.team1.rank = ranks[pred.team1] || 5
      pred.squadInfo.team2.rank = ranks[pred.team2] || 5
    })
    
    console.log(`[ML Service] Generated ${allPredictions.length} predictions`)
    
    return {
      success: true,
      totalMatches: allPredictions.length,
      predictions: allPredictions,
      teamRanks: ranks,
      modelInfo: {
        type: 'Ensemble ML Model',
        version: '2026.1',
        weights: ML_WEIGHTS,
        dataSources: [
          'IPL Historical 2008-2025',
          'IPL 2025 Recent Form',
          'Player Stats Database',
          'Venue Analysis'
        ]
      }
    }
  } catch (error) {
    console.error('[ML Service] Error generating predictions:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Save Predictions to Database
async function savePredictionsToDB(predictions) {
  try {
    console.log('[ML Service] Saving predictions to database...')
    
    // Clear existing predictions
    await IPL2026Prediction.deleteMany({})
    console.log('[ML Service] Cleared existing predictions')
    
    // Insert new predictions
    const result = await IPL2026Prediction.insertMany(predictions)
    console.log(`[ML Service] Saved ${result.length} predictions to database`)
    
    return {
      success: true,
      count: result.length
    }
  } catch (error) {
    console.error('[ML Service] Error saving predictions:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Get All Predictions from Database
async function getAllPredictionsFromDB() {
  try {
    const predictions = await IPL2026Prediction.find({}).sort({ matchNumber: 1 })
    return {
      success: true,
      totalMatches: predictions.length,
      predictions,
      modelInfo: {
        type: 'Ensemble ML Model',
        version: '2026.1',
        source: 'database'
      }
    }
  } catch (error) {
    console.error('[ML Service] Error fetching predictions:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Get Single Match Prediction
async function getMatchPrediction(matchNumber) {
  try {
    const prediction = await IPL2026Prediction.findOne({ matchNumber })
    
    if (!prediction) {
      return {
        success: false,
        error: `Match ${matchNumber} not found`
      }
    }
    
    return {
      success: true,
      prediction
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Update Prediction with Actual Result (for learning)
async function updateMatchResult(matchNumber, actualWinner) {
  try {
    const prediction = await IPL2026Prediction.findOneAndUpdate(
      { matchNumber },
      { 
        actualWinner,
        isCompleted: true,
        updatedAt: new Date()
      },
      { new: true }
    )
    
    return {
      success: true,
      prediction
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Get Win Tally
async function getWinTally() {
  try {
    const tally = await IPL2026Prediction.aggregate([
      {
        $group: {
          _id: '$predictedWinner',
          wins: { $sum: 1 }
        }
      },
      {
        $sort: { wins: -1 }
      }
    ])
    
    return {
      success: true,
      tally: tally.map(t => ({ team: t._id, wins: t.wins }))
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

module.exports = {
  generateFreshPredictions,
  savePredictionsToDB,
  getAllPredictionsFromDB,
  getMatchPrediction,
  updateMatchResult,
  getWinTally,
  ML_WEIGHTS,
  TEAM_COLORS
}
