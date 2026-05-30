# MongoDB Schema Design for IPL Prediction System

Based on the provided data structure and application requirements, here is the suggested MongoDB schema design using Mongoose.

## 1. Match Schema (`models/Match.js`)

This schema stores historical and upcoming match details. It accommodates the dataset fields previously provided.

```javascript
const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    ID: { type: Number, required: true, unique: true },
    City: { type: String },
    Date: { type: Date },
    Season: { type: String },
    MatchNumber: { type: String },
    Team1: { type: String, required: true },
    Team2: { type: String, required: true },
    Venue: { type: String },
    TossWinner: { type: String },
    TossDecision: { type: String, enum: ['bat', 'field'] },
    SuperOver: { type: String, enum: ['Y', 'N'] },
    WinningTeam: { type: String },
    WonBy: { type: String, enum: ['Wickets', 'Runs', 'SuperOver', 'NoResults'] },
    Margin: { type: Number },
    method: { type: String, default: null }, // e.g., D/L method
    Player_of_Match: { type: String },
    Team1Players: [{ type: String }], // Array of player names
    Team2Players: [{ type: String }],
    Umpire1: { type: String },
    Umpire2: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('Match', matchSchema);
```

## 2. Team Schema (`models/Team.js`)

This schema manages team-specific information.

```javascript
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "Chennai Super Kings"
    shortName: { type: String, required: true, unique: true }, // e.g., "CSK"
    captain: { type: String }, // e.g., "MS Dhoni"
    homeGround: { type: String },
    colors: {
        primary: { type: String },
        secondary: { type: String }
    },
    logoUrl: { type: String },
    championshipWins: [{ type: Number }] // Array of years they won, e.g., [2010, 2011, 2018, 2021, 2023]
}, {
    timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
```

## 3. Player Schema (`models/Player.js`)

Stores details of individual players.

```javascript
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    currentTeam: { type: String }, 
    role: { type: String, enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'] },
    battingStyle: { type: String },
    bowlingStyle: { type: String },
    nationality: { type: String, default: 'India' },
    isCaptain: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Player', playerSchema);
```

## 4. Stadium Schema (`models/Stadium.js`)

Information relating to venues where matches are played.

```javascript
const mongoose = require('mongoose');

const stadiumSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "Wankhede Stadium"
    city: { type: String, required: true },
    capacity: { type: Number },
    pitchType: { type: String, enum: ['Batting', 'Bowling', 'Balanced', 'Spin', 'Pace'] },
    boundaryLength: { type: Number }, // Average length in meters
    imageUrl: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('Stadium', stadiumSchema);
```

## 5. Prediction Schema (Optional / Inferred)

Used if users log their predictions, or to store the ML Model's match-by-match predictions.

```javascript
const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' }, 
    team1: { type: String, required: true },
    team2: { type: String, required: true },
    predictedWinner: { type: String, required: true },
    winProbability: { type: Number, required: true }, // e.g., 65.5 for 65.5%
    modelVersion: { type: String }, // Tracker for which ML model returned this
    featuresUsed: { type: Object } // Optional: Pitch info, toss winner, etc.
}, {
    timestamps: true
});

module.exports = mongoose.model('Prediction', predictionSchema);
```

## 6. Live Score Snapshot Schema (`models/LiveScore.js`)

Persists live match snapshots fetched from **Cricbuzz Cricket (RapidAPI)**
for historical comparison, offline fallback and audit trail.

```javascript
const mongoose = require('mongoose');

const scoreEntrySchema = new mongoose.Schema({
  inning:  { type: String },
  r:       { type: String },  // runs
  w:       { type: String },  // wickets
  o:       { type: String },  // overs
}, { _id: false });

const liveScoreSchema = new mongoose.Schema({
  // Identity
  matchId:     { type: String, required: true },  // Cricbuzz matchId
  source:      { type: String, enum: ['cricbuzz', 'cricapi', 'manual'], default: 'cricbuzz' },
  provider:    { type: String },                  // e.g., "Cricbuzz (RapidAPI)"

  // Match info
  name:        { type: String },
  series:      { type: String },
  matchType:   { type: String, default: 't20' },
  venue:       { type: String },
  date:        { type: String },
  dateTimeGMT: { type: String },

  // Teams
  team1:       { type: String },
  team2:       { type: String },

  // State
  status:      { type: String },
  matchStarted:{ type: Boolean, default: false },
  matchEnded:  { type: Boolean, default: false },
  isLive:      { type: Boolean, default: false },

  // Scores (source of truth from Cricbuzz scorecard)
  score:       [scoreEntrySchema],
  team1Score:  { type: Number, default: null },
  team1Wickets:{ type: Number, default: null },
  team1Overs:  { type: Number, default: null },
  team2Score:  { type: Number, default: null },
  team2Wickets:{ type: Number, default: null },
  team2Overs:  { type: Number, default: null },

  // Toss
  tossWinner:  { type: String, default: null },
  tossChoice:  { type: String, enum: ['bat', 'field', null], default: null },

  // ML overlay (injected by liveScoreService)
  mlWinProbability:  { type: mongoose.Schema.Types.Mixed, default: null },
  mlPredictedWinner: { type: String, default: null },

  // Snapshot timestamp
  snapshotAt:  { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Index for fast lookup by matchId + time
liveScoreSchema.index({ matchId: 1, snapshotAt: -1 });
liveScoreSchema.index({ isLive: 1 });

module.exports = mongoose.model('LiveScore', liveScoreSchema);
```

### Live Score API Source Summary

| Priority | Provider             | Host                                      | Endpoint used               |
|----------|----------------------|-------------------------------------------|-----------------------------|
| 1 (Primary) | Cricbuzz (RapidAPI) | `cricbuzz-cricket.p.rapidapi.com`       | `GET /matches/v1/live`      |
| 2        | Cricbuzz (RapidAPI)  | `cricbuzz-cricket.p.rapidapi.com`         | `GET /matches/v1/recent`    |
| 3 (Fallback) | CricAPI v2        | `api.cricapi.com/v1`                      | `GET /currentMatches`       |
| 4        | Manual state file    | `backend/data/live_match_state.json`      | JSON override               |

**Environment variables required** (in `backend/.env`):
```
RAPIDAPI_KEY=3af57b5625msh22c2c4b3ab642d5p1e9817jsnb3e4504ef03f
RAPIDAPI_HOST=cricbuzz-cricket.p.rapidapi.com
CRIC_API_KEY=ba916b36-c4d0-4224-a419-03ff6161dc8d
```
