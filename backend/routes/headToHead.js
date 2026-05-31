const express = require('express');
const router = express.Router();
const { predictionDB } = require('../config/db');

// GET /api/head-to-head
// Return the complete document as JSON
router.get('/', async (req, res) => {
  try {
    if (!predictionDB) {
      return res.status(500).json({ success: false, error: 'Database connection not established' });
    }
    const data = await predictionDB.collection('ipl_teams_head_to_head').findOne({});
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/head-to-head/:teamA/:teamB
router.get('/:teamA/:teamB', async (req, res) => {
  try {
    const { teamA, teamB } = req.params;
    if (!predictionDB) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const h2hCollection = predictionDB.collection('ipl_teams_head_to_head');
    const doc = await h2hCollection.findOne({}); // Since all teams are in one document
    
    // Support the new MongoDB Atlas schema under head_to_head_splits
    const splits = doc?.head_to_head_splits;
    if (!splits || !splits[teamA]) {
      // Fallback for old schema if it exists
      if (doc && doc[teamA]) {
        const matchup = doc[teamA].find(m => m.opponent === teamB);
        if (matchup) return res.json({ success: true, data: matchup });
      }
      return res.status(404).json({ error: `H2H data not found for team ${teamA}` });
    }

    const matchupData = splits[teamA][teamB];
    if (!matchupData) {
      return res.status(404).json({ error: `Matchup not found between ${teamA} and ${teamB}` });
    }

    // Map Atlas schema to expected frontend format
    const matchup = {
      opponent: teamB,
      total: matchupData.total_matches,
      wins: matchupData.overall_wins,
      losses: matchupData.overall_losses,
      home: matchupData.home_wins,
      away: matchupData.away_neutral_wins
    };

    res.json({ success: true, data: matchup });
  } catch (err) {
    console.error('[Head to Head Route Error]', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/head-to-head/:teamA
// Get all opponents for team A
router.get('/:teamA', async (req, res) => {
  try {
    const { teamA } = req.params;
    if (!predictionDB) return res.status(500).json({ error: 'DB not established' });
    
    const doc = await predictionDB.collection('ipl_teams_head_to_head').findOne({});
    const splits = doc?.head_to_head_splits;
    
    if (!splits || !splits[teamA]) {
      if (doc && doc[teamA]) {
        return res.json({ success: true, data: doc[teamA] });
      }
      return res.status(404).json({ error: 'Not found' });
    }
    
    const opponents = Object.keys(splits[teamA]).map(teamB => {
      const data = splits[teamA][teamB];
      return {
        opponent: teamB,
        total: data.total_matches,
        wins: data.overall_wins,
        losses: data.overall_losses,
        home: data.home_wins,
        away: data.away_neutral_wins
      };
    });

    res.json({ success: true, data: opponents });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
