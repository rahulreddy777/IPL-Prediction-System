// Test script for IPL 2026 predictions

const playerStatsService = require('./services/playerStatsService');

console.log("=== Testing Player Stats Service ===\n");

// Test 1: Get all teams strength
console.log("1. Team Squad Strength Rankings:");
const teamsStrength = playerStatsService.getAllTeamsStrength();
teamsStrength.forEach((team, index) => {
  console.log(`   ${index + 1}. ${team.team}: ${team.score} points`);
});

console.log("\n2. Historical Performance (2023-2025):");
const performance = playerStatsService.getHistoricalPerformance();
Object.entries(performance).forEach(([team, perf]) => {
  console.log(`   ${team}: ${perf.recentForm}% recent form, ${perf.allTimeWinRate}% all-time win rate`);
});

console.log("\n=== Testing Prediction Service ===\n");

const predictionService = require('./services/predictionService');

// Test 3: Tournament Prediction
async function testPredictions() {
  try {
    const tournamentResult = await predictionService.predictTournament2026();
    console.log("3. IPL 2026 Tournament Winner Prediction:");
    console.log(`   Predicted Winner: ${tournamentResult.predictedWinner}`);
    console.log(`   Predicted Runner-up: ${tournamentResult.predictedRunnerUp}`);
    console.log(`   Methodology: ${tournamentResult.methodology}`);
    
    console.log("\n   Full Rankings:");
    tournamentResult.predictions.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.team}: Score ${team.combinedScore}, Probability ${team.probability}%`);
    });
    
    console.log("\n4. Playoffs Prediction:");
    const playoffsResult = await predictionService.predictPlayoffs2026();
    console.log(`   Qualifier 1: ${playoffsResult.qualifier1}`);
    console.log(`   Qualifier 2: ${playoffsResult.qualifier2}`);
    console.log(`   Eliminator 1: ${playoffsResult.eliminator1}`);
    console.log(`   Eliminator 2: ${playoffsResult.eliminator2}`);
    console.log(`   Top 4: ${playoffsResult.top4.join(', ')}`);
    
    console.log("\n5. Team Analysis:");
    const analysis = await predictionService.getTeamAnalysis();
    analysis.forEach(team => {
      console.log(`   ${team.team}: Squad ${team.squadStrength}, Form ${team.recentForm}%, Win Rate ${team.allTimeWinRate}%`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testPredictions();

