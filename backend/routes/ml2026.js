const express = require('express')
const router = express.Router()
const { spawn } = require('child_process')
const path = require('path')
const { MongoClient } = require('mongodb')

const MONGO_URI = 'mongodb://localhost:27017'
const PIPELINE_SCRIPT = path.join(__dirname, '..', '..', 'ml-model', 'train_mongodb_gb.py')

// ── POST /api/ml2026/run-pipeline ─────────────────────────────────────────────
// Runs the full Python ML pipeline:
//   fetch MongoDB collections → clean → engineer features →
//   train GradientBoostingClassifier → GridSearchCV → predict 2026 →
//   save predictions to ipl_prediction.match_predictions_2026
router.post('/run-pipeline', (req, res) => {
  console.log('[ML2026] Starting full ML pipeline...')

  // Check for Python availability
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'

  let stdout = ''
  let stderr = ''
  let finished = false

  const py = spawn(pythonCmd, [PIPELINE_SCRIPT], {
    cwd: path.join(__dirname, '..', '..', 'ml-model'),
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  })

  py.stdout.on('data', (d) => {
    const chunk = d.toString()
    stdout += chunk
    console.log('[ML2026 Python]', chunk.trim())
  })

  py.stderr.on('data', (d) => {
    const chunk = d.toString()
    stderr += chunk
    // Python often writes progress to stderr — not always an error
    console.log('[ML2026 stderr]', chunk.trim())
  })

  py.on('close', async (code) => {
    if (finished) return
    finished = true

    if (code !== 0) {
      console.error('[ML2026] Pipeline failed with code', code)
      return res.status(500).json({
        success: false,
        error: 'ML pipeline failed',
        details: stderr.slice(-2000) || stdout.slice(-2000),
        exitCode: code
      })
    }

    // Pipeline succeeded — now fetch count of saved predictions
    try {
      const client = new MongoClient(MONGO_URI)
      await client.connect()
      const db = client.db('ipl_prediction')
      const count = await db.collection('match_predictions_2026').countDocuments()
      await client.close()

      console.log(`[ML2026] Pipeline complete. ${count} predictions saved.`)
      res.json({
        success: true,
        message: `Pipeline complete — ${count} predictions saved to MongoDB`,
        totalPredictions: count,
        log: stdout.slice(-3000)
      })
    } catch (dbErr) {
      res.json({
        success: true,
        message: 'Pipeline complete (DB count failed)',
        log: stdout.slice(-3000),
        dbError: dbErr.message
      })
    }
  })

  py.on('error', (err) => {
    if (finished) return
    finished = true
    console.error('[ML2026] Spawn error:', err.message)
    res.status(500).json({
      success: false,
      error: 'Failed to start Python: ' + err.message,
      hint: 'Make sure Python 3 and required packages are installed. Run: pip install scikit-learn pandas pymongo matplotlib joblib'
    })
  })

  // 10 minute timeout for training
  setTimeout(() => {
    if (!finished) {
      finished = true
      py.kill()
      res.status(504).json({
        success: false,
        error: 'ML pipeline timed out (10 minutes)',
        partialLog: stdout.slice(-2000)
      })
    }
  }, 600000)
})

// ── GET /api/ml2026/predictions ───────────────────────────────────────────────
// Fetches all predictions from ipl_prediction.match_predictions_2026
router.get('/predictions', async (req, res) => {
  let client
  try {
    client = new MongoClient(MONGO_URI)
    await client.connect()
    const db = client.db('ipl_prediction')
    const predictions = await db
      .collection('match_predictions_2026')
      .find({})
      .sort({ match_id: 1 })
      .toArray()

    res.json({
      success: true,
      totalPredictions: predictions.length,
      predictions,
      source: 'ipl_prediction.match_predictions_2026',
      methodology: 'GradientBoostingClassifier (GridSearchCV tuned) · Trained on IPL 2008–2025'
    })
  } catch (err) {
    console.error('[ML2026] GET predictions error:', err.message)
    res.status(500).json({
      success: false,
      error: err.message,
      hint: 'Run the ML pipeline first via POST /api/ml2026/run-pipeline'
    })
  } finally {
    if (client) await client.close()
  }
})

// ── GET /api/ml2026/status ────────────────────────────────────────────────────
// Check pipeline status / how many predictions exist
router.get('/status', async (req, res) => {
  let client
  try {
    client = new MongoClient(MONGO_URI)
    await client.connect()
    const db = client.db('ipl_prediction')
    const count = await db.collection('match_predictions_2026').countDocuments()
    const latest = await db
      .collection('match_predictions_2026')
      .findOne({}, { sort: { createdAt: -1 } })

    res.json({
      success: true,
      predictionsCount: count,
      lastUpdated: latest?.createdAt || null,
      ready: count > 0,
      methodology: latest?.methodology || 'GradientBoostingClassifier'
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, ready: false })
  } finally {
    if (client) await client.close()
  }
})

// ── GET /api/ml2026/match18  — serve Match 18 prediction (CSK vs DC) ─────────
// Returns the pre-computed prediction saved by predict_match18_csk_dc.py
// which includes Dhoni + Brevis recovery delta and updated probability.
;(() => {
  const fs   = require('fs')
  const match18Path = path.join(__dirname, '..', 'data', 'match18_prediction.json')

  router.get('/match18', (req, res) => {
    try {
      if (!fs.existsSync(match18Path)) {
        return res.status(404).json({
          success: false,
          error: 'Match 18 prediction not generated yet. Run: python backend/ml/predict_match18_csk_dc.py'
        })
      }
      const data = JSON.parse(fs.readFileSync(match18Path, 'utf-8'))
      res.json({ success: true, prediction: data })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // POST /api/ml2026/run-match18  — regenerate Match 18 prediction on demand
  router.post('/run-match18', (req, res) => {
    const pythonCmd   = process.platform === 'win32' ? 'python' : 'python3'
    const scriptPath  = path.join(__dirname, '..', 'ml', 'predict_match18_csk_dc.py')
    let   out = '', err = ''

    const py = require('child_process').spawn(pythonCmd, [scriptPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    py.stdout.on('data', d => { out += d.toString() })
    py.stderr.on('data', d => { err += d.toString() })

    py.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ success: false, error: err || 'Script failed', log: out })
      }
      try {
        const data = JSON.parse(fs.readFileSync(match18Path, 'utf-8'))
        res.json({
          success: true,
          message: 'Match 18 prediction regenerated',
          prediction: data
        })
      } catch (e) {
        res.json({ success: true, message: 'Script ran but JSON parse failed', log: out })
      }
    })
  })
})()

module.exports = router
