const express = require('express');
const router = express.Router();
const { historyDB } = require('../config/db');

// GET /api/team-history
router.get('/', async (req, res) => {
  try {
    if (!historyDB) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const teamHistoryCollection = historyDB.collection('team_history');
    const data = await teamHistoryCollection.findOne({ dataset: 'Active Franchises All-Time Standings' });
    
    if (!data || !data.teams) {
      return res.status(404).json({ error: 'Team history data not found' });
    }

    res.json({ success: true, data: data.teams });
  } catch (err) {
    console.error('[Team History Route Error]', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
