const express = require('express');
const router = express.Router();
const { predictionDB } = require('../config/db');

// GET /api/head-to-head/:teamA/:teamB
router.get('/:teamA/:teamB', async (req, res) => {
  try {
    const { teamA, teamB } = req.params;
    if (!predictionDB) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const h2hCollection = predictionDB.collection('ipl_teams_head_to_head');
    const doc = await h2hCollection.findOne({}); // Since all teams are in one document
    
    if (!doc || !doc[teamA]) {
      return res.status(404).json({ error: `H2H data not found for team ${teamA}` });
    }

    const matchup = doc[teamA].find(m => m.opponent === teamB);
    
    if (!matchup) {
      return res.status(404).json({ error: `Matchup not found between ${teamA} and ${teamB}` });
    }

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
    if (!doc || !doc[teamA]) return res.status(404).json({ error: 'Not found' });
    
    res.json({ success: true, data: doc[teamA] });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
