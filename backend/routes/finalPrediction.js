const express = require('express');
const router = express.Router();
const { getFinalPrediction } = require('../controllers/finalPredictionController');

// GET /api/final-prediction/rcb-vs-gt
router.get('/rcb-vs-gt', getFinalPrediction);

module.exports = router;
