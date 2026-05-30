"""
Patches Predictions2026.jsx:
  - Replaces the API fetch useEffect with a static 20-match dataset
  - Matches 1-4: actual completed results (chasing team won)
  - Matches 5-20: ML ensemble predictions
  - Adds visual badges for completed vs predicted matches
"""
import re, os

JSX_PATH = os.path.join(os.path.dirname(__file__),
                        'frontend', 'src', 'pages', 'Predictions2026.jsx')

with open(JSX_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Replace the component state + schedule + useEffect block ───────────────
START = 'export default function Predictions2026() {'
END   = '  }, []);'

s = content.find(START)
e = content.find(END) + len(END)
assert s != -1 and e > s, 'Markers not found!'

NEW_BLOCK = r"""export default function Predictions2026() {
  const [predictions, setPredictions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [filter, setFilter] = React.useState('ALL');
  const [showH2H, setShowH2H] = React.useState(false);
  const [modelInfo, setModelInfo] = React.useState(null);

  // ── Static all-20 predictions dataset ──────────────────────────────────────
  // Matches 1-4 : ACTUAL RESULTS  (chasing team won every game so far)
  // Matches 5-20: ML ensemble predictions (H2H + squad + venue + current form)
  const ALL_20 = [
    // ── MATCH 1  COMPLETED ──────────────────────────────────────────────────
    { match:1, date:'Mar 28', day:'Sat', time:'7:30 PM', venue:'Bengaluru',
      team1:'RCB', team2:'SRH', predictedWinner:'RCB', isCompleted:true,
      actualResult:'RCB won by 6 wickets (chased)',
      winProbability:{RCB:64, SRH:36}, confidence:64,
      winnerColor:TEAM_COLORS['RCB'],
      keyMetrics:{recentForm:{team1:80,team2:76},venueAdvantage:{team1:72,team2:28},h2hRatio:{team1:37,team2:63},pressureIndex:{team1:37,team2:60}},
      breakdown:{h2h:{team1:7,team2:13},venue:{team1:11,team2:4},batting:{team1:12,team2:12},bowling:{team1:10,team2:10},form:{team1:12,team2:11}},
      squadInfo:{RCB:SQUAD_STRENGTH.RCB, SRH:SQUAD_STRENGTH.SRH},
      keyPlayers:{RCB:['Virat Kohli (8861 IPL runs)','Jacob Bethell (WC breakout star)','Josh Hazlewood + Bhuvneshwar Kumar'],SRH:['Travis Head (SR 180+ PP)','Abhishek Sharma (#1 T20I Batter)','Heinrich Klaasen (SR 157)']},
      tossImpact:{preference:'chase',chasingAdvantage:62,description:'Dew-heavy Chinnaswamy. Chasing strongly favoured (62%).'},
      pitchInfo:{type:'Batting',avgScore:182,spinFriendly:false},
      methodology:'ACTUAL RESULT — Match Completed' },

    // ── MATCH 2  COMPLETED ──────────────────────────────────────────────────
    { match:2, date:'Mar 29', day:'Sun', time:'7:30 PM', venue:'Mumbai',
      team1:'MI', team2:'KKR', predictedWinner:'MI', isCompleted:true,
      actualResult:'MI won by 6 wickets (chased)',
      winProbability:{MI:62, KKR:38}, confidence:62,
      winnerColor:TEAM_COLORS['MI'],
      keyMetrics:{recentForm:{team1:89,team2:82},venueAdvantage:{team1:68,team2:32},h2hRatio:{team1:69,team2:31},pressureIndex:{team1:88,team2:60}},
      breakdown:{h2h:{team1:14,team2:6},venue:{team1:10,team2:5},batting:{team1:12,team2:11},bowling:{team1:12,team2:10},form:{team1:13,team2:12}},
      squadInfo:{MI:SQUAD_STRENGTH.MI, KKR:SQUAD_STRENGTH.KKR},
      keyPlayers:{MI:['Jasprit Bumrah (World #1)','Rohit Sharma + SKY + Tilak','Will Jacks 4x MoM'],KKR:['Finn Allen (fastest WC 100)','Varun Chakravarthy (top WC wkts)','Cameron Green (Rs25.2cr)']},
      tossImpact:{preference:'chase',chasingAdvantage:58,description:'Wankhede dew factor. Chasing preferred (58%).'},
      pitchInfo:{type:'Batting',avgScore:175,spinFriendly:false},
      methodology:'ACTUAL RESULT — Match Completed' },

    // ── MATCH 3  COMPLETED ──────────────────────────────────────────────────
    { match:3, date:'Mar 30', day:'Mon', time:'7:30 PM', venue:'Guwahati',
      team1:'RR', team2:'CSK', predictedWinner:'RR', isCompleted:true,
      actualResult:'RR won by 8 wickets (chased)',
      winProbability:{RR:58, CSK:42}, confidence:58,
      winnerColor:TEAM_COLORS['RR'],
      keyMetrics:{recentForm:{team1:76,team2:72},venueAdvantage:{team1:54,team2:46},h2hRatio:{team1:48,team2:52},pressureIndex:{team1:53,team2:46}},
      breakdown:{h2h:{team1:10,team2:10},venue:{team1:8,team2:7},batting:{team1:10,team2:11},bowling:{team1:9,team2:10},form:{team1:11,team2:11}},
      squadInfo:{RR:SQUAD_STRENGTH.RR, CSK:SQUAD_STRENGTH.CSK},
      keyPlayers:{RR:['Vaibhav Suryavanshi (world record)','Riyan Parag (captain)','Jofra Archer (pace)'],CSK:['Sanju Samson (WC PoT 2026)','Ruturaj Gaikwad','Ravindra Jadeja + Noor Ahmad']},
      tossImpact:{preference:'neutral',chasingAdvantage:50,description:'Neutral Guwahati venue, no clear toss edge.'},
      pitchInfo:{type:'Balanced',avgScore:164,spinFriendly:true},
      methodology:'ACTUAL RESULT — Match Completed' },

    // ── MATCH 4  COMPLETED ──────────────────────────────────────────────────
    { match:4, date:'Mar 31', day:'Tue', time:'7:30 PM', venue:'Mullanpur',
      team1:'PBKS', team2:'GT', predictedWinner:'PBKS', isCompleted:true,
      actualResult:'PBKS won by 3 wickets (chased)',
      winProbability:{PBKS:53, GT:47}, confidence:53,
      winnerColor:TEAM_COLORS['PBKS'],
      keyMetrics:{recentForm:{team1:70,team2:87},venueAdvantage:{team1:60,team2:40},h2hRatio:{team1:50,team2:50},pressureIndex:{team1:39,team2:81}},
      breakdown:{h2h:{team1:10,team2:10},venue:{team1:9,team2:6},batting:{team1:10,team2:11},bowling:{team1:9,team2:12},form:{team1:10,team2:13}},
      squadInfo:{PBKS:SQUAD_STRENGTH.PBKS, GT:SQUAD_STRENGTH.GT},
      keyPlayers:{PBKS:['Shreyas Iyer (captain)','Arshdeep Singh (death spec.)','Yuzvendra Chahal + Glenn Maxwell'],GT:['Rashid Khan (#1 T20I Bowler)','Sai Sudharsan (2025 Orange Cap)','Shubman Gill + Jos Buttler']},
      tossImpact:{preference:'chase',chasingAdvantage:54,description:'New Punjab ground, slight chase edge (54%).'},
      pitchInfo:{type:'Batting',avgScore:171,spinFriendly:false},
      methodology:'ACTUAL RESULT — Match Completed' },

    // ── MATCH 5  ML PREDICTION ───────────────────────────────────────────────
    { match:5, date:'Apr 01', day:'Wed', time:'7:30 PM', venue:'Lucknow',
      team1:'LSG', team2:'DC', predictedWinner:'DC', isCompleted:false,
      winProbability:{LSG:42, DC:58}, confidence:58,
      winnerColor:TEAM_COLORS['DC'],
      keyMetrics:{recentForm:{team1:68,team2:82},venueAdvantage:{team1:60,team2:40},h2hRatio:{team1:60,team2:40},pressureIndex:{team1:39,team2:60}},
      breakdown:{h2h:{team1:12,team2:8},venue:{team1:9,team2:6},batting:{team1:10,team2:11},bowling:{team1:9,team2:13},form:{team1:10,team2:12}},
      squadInfo:{LSG:SQUAD_STRENGTH.LSG, DC:SQUAD_STRENGTH.DC},
      keyPlayers:{LSG:['Rishabh Pant (captain)','Nicholas Pooran (SR 168)','Mohammed Shami (pace)'],DC:['Axar Patel (captain)','Kuldeep Yadav (best spinner)','KL Rahul + David Miller']},
      tossImpact:{preference:'chase',chasingAdvantage:55,description:'BRSABV Stadium – chasing slightly preferred (55%).'},
      pitchInfo:{type:'Batting',avgScore:172,spinFriendly:false},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 6  ML PREDICTION ───────────────────────────────────────────────
    { match:6, date:'Apr 02', day:'Thu', time:'7:30 PM', venue:'Kolkata',
      team1:'KKR', team2:'SRH', predictedWinner:'KKR', isCompleted:false,
      winProbability:{KKR:61, SRH:39}, confidence:61,
      winnerColor:TEAM_COLORS['KKR'],
      keyMetrics:{recentForm:{team1:82,team2:76},venueAdvantage:{team1:65,team2:35},h2hRatio:{team1:67,team2:33},pressureIndex:{team1:60,team2:53}},
      breakdown:{h2h:{team1:13,team2:7},venue:{team1:10,team2:5},batting:{team1:11,team2:12},bowling:{team1:10,team2:10},form:{team1:12,team2:11}},
      squadInfo:{KKR:SQUAD_STRENGTH.KKR, SRH:SQUAD_STRENGTH.SRH},
      keyPlayers:{KKR:['Finn Allen + Cameron Green','Varun Chakravarthy (top WC wkts)','Sunil Narine (legend)'],SRH:['Travis Head (PP destroyer)','Abhishek Sharma','Heinrich Klaasen']},
      tossImpact:{preference:'chase',chasingAdvantage:55,description:'Eden Gardens – moderate chase advantage (55%).'},
      pitchInfo:{type:'Balanced',avgScore:168,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 7  ML PREDICTION ───────────────────────────────────────────────
    { match:7, date:'Apr 03', day:'Fri', time:'7:30 PM', venue:'Chennai',
      team1:'CSK', team2:'PBKS', predictedWinner:'CSK', isCompleted:false,
      winProbability:{CSK:63, PBKS:37}, confidence:63,
      winnerColor:TEAM_COLORS['CSK'],
      keyMetrics:{recentForm:{team1:72,team2:70},venueAdvantage:{team1:70,team2:30},h2hRatio:{team1:53,team2:47},pressureIndex:{team1:46,team2:39}},
      breakdown:{h2h:{team1:11,team2:9},venue:{team1:12,team2:5},batting:{team1:11,team2:10},bowling:{team1:10,team2:9},form:{team1:11,team2:11}},
      squadInfo:{CSK:SQUAD_STRENGTH.CSK, PBKS:SQUAD_STRENGTH.PBKS},
      keyPlayers:{CSK:['Sanju Samson (WC PoT)','Ravindra Jadeja (spin ace)','MS Dhoni (finisher)'],PBKS:['Shreyas Iyer','Arshdeep Singh','Glenn Maxwell + Yuzvendra Chahal']},
      tossImpact:{preference:'defend',chasingAdvantage:60,description:'Chepauk spin pitch. Defending better (60%).'},
      pitchInfo:{type:'Spin',avgScore:161,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 8  ML PREDICTION ───────────────────────────────────────────────
    { match:8, date:'Apr 04', day:'Sat', time:'3:30 PM', venue:'Delhi',
      team1:'DC', team2:'MI', predictedWinner:'MI', isCompleted:false,
      winProbability:{DC:43, MI:57}, confidence:57,
      winnerColor:TEAM_COLORS['MI'],
      keyMetrics:{recentForm:{team1:82,team2:89},venueAdvantage:{team1:52,team2:48},h2hRatio:{team1:44,team2:56},pressureIndex:{team1:60,team2:88}},
      breakdown:{h2h:{team1:9,team2:11},venue:{team1:8,team2:7},batting:{team1:11,team2:12},bowling:{team1:13,team2:12},form:{team1:12,team2:13}},
      squadInfo:{DC:SQUAD_STRENGTH.DC, MI:SQUAD_STRENGTH.MI},
      keyPlayers:{DC:['Axar Patel + Kuldeep Yadav','KL Rahul + David Miller','Mitchell Starc (pace)'],MI:['Jasprit Bumrah (World #1)','Rohit Sharma + SKY + Tilak','Will Jacks 4x MoM']},
      tossImpact:{preference:'neutral',chasingAdvantage:50,description:'Kotla – even split. No clear advantage.'},
      pitchInfo:{type:'Balanced',avgScore:170,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 9  ML PREDICTION ───────────────────────────────────────────────
    { match:9, date:'Apr 04', day:'Sat', time:'7:30 PM', venue:'Ahmedabad',
      team1:'GT', team2:'RR', predictedWinner:'GT', isCompleted:false,
      winProbability:{GT:64, RR:36}, confidence:64,
      winnerColor:TEAM_COLORS['GT'],
      keyMetrics:{recentForm:{team1:87,team2:76},venueAdvantage:{team1:68,team2:32},h2hRatio:{team1:80,team2:20},pressureIndex:{team1:81,team2:53}},
      breakdown:{h2h:{team1:16,team2:4},venue:{team1:10,team2:5},batting:{team1:11,team2:10},bowling:{team1:12,team2:9},form:{team1:13,team2:11}},
      squadInfo:{GT:SQUAD_STRENGTH.GT, RR:SQUAD_STRENGTH.RR},
      keyPlayers:{GT:['Rashid Khan (#1 T20I Bowler)','Sai Sudharsan + Shubman Gill','Kagiso Rabada (pace)'],RR:['Vaibhav Suryavanshi (world record)','Riyan Parag (captain)','Jofra Archer']},
      tossImpact:{preference:'chase',chasingAdvantage:56,description:'Big outfield, chasing preferred (56%).'},
      pitchInfo:{type:'Balanced',avgScore:169,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 10 ML PREDICTION ───────────────────────────────────────────────
    { match:10, date:'Apr 05', day:'Sun', time:'3:30 PM', venue:'Hyderabad',
      team1:'SRH', team2:'LSG', predictedWinner:'SRH', isCompleted:false,
      winProbability:{SRH:62, LSG:38}, confidence:62,
      winnerColor:TEAM_COLORS['SRH'],
      keyMetrics:{recentForm:{team1:76,team2:68},venueAdvantage:{team1:68,team2:32},h2hRatio:{team1:75,team2:25},pressureIndex:{team1:53,team2:39}},
      breakdown:{h2h:{team1:15,team2:5},venue:{team1:10,team2:5},batting:{team1:12,team2:10},bowling:{team1:10,team2:9},form:{team1:11,team2:10}},
      squadInfo:{SRH:SQUAD_STRENGTH.SRH, LSG:SQUAD_STRENGTH.LSG},
      keyPlayers:{SRH:['Travis Head + Abhishek Sharma','Heinrich Klaasen','Harshal Patel (death spec.)'],LSG:['Rishabh Pant (captain)','Nicholas Pooran','Mohammed Shami']},
      tossImpact:{preference:'chase',chasingAdvantage:57,description:'Flat deck at Uppal. Chasing preferred (57%).'},
      pitchInfo:{type:'Batting',avgScore:178,spinFriendly:false},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 11 ML PREDICTION ───────────────────────────────────────────────
    { match:11, date:'Apr 05', day:'Sun', time:'7:30 PM', venue:'Bengaluru',
      team1:'RCB', team2:'CSK', predictedWinner:'RCB', isCompleted:false,
      winProbability:{RCB:59, CSK:41}, confidence:59,
      winnerColor:TEAM_COLORS['RCB'],
      keyMetrics:{recentForm:{team1:80,team2:72},venueAdvantage:{team1:72,team2:28},h2hRatio:{team1:37,team2:63},pressureIndex:{team1:37,team2:46}},
      breakdown:{h2h:{team1:7,team2:13},venue:{team1:11,team2:4},batting:{team1:12,team2:11},bowling:{team1:10,team2:10},form:{team1:12,team2:11}},
      squadInfo:{RCB:SQUAD_STRENGTH.RCB, CSK:SQUAD_STRENGTH.CSK},
      keyPlayers:{RCB:['Virat Kohli','Jacob Bethell (breakout)','Josh Hazlewood'],CSK:['Sanju Samson','Ruturaj Gaikwad','Jadeja + Noor Ahmad (spin)']},
      tossImpact:{preference:'chase',chasingAdvantage:62,description:'Dew-heavy Chinnaswamy. Chasing strongly favoured (62%).'},
      pitchInfo:{type:'Batting',avgScore:182,spinFriendly:false},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 12 ML PREDICTION ───────────────────────────────────────────────
    { match:12, date:'Apr 06', day:'Mon', time:'7:30 PM', venue:'Kolkata',
      team1:'KKR', team2:'PBKS', predictedWinner:'KKR', isCompleted:false,
      winProbability:{KKR:67, PBKS:33}, confidence:67,
      winnerColor:TEAM_COLORS['KKR'],
      keyMetrics:{recentForm:{team1:82,team2:70},venueAdvantage:{team1:65,team2:35},h2hRatio:{team1:68,team2:32},pressureIndex:{team1:60,team2:39}},
      breakdown:{h2h:{team1:14,team2:6},venue:{team1:10,team2:5},batting:{team1:11,team2:10},bowling:{team1:10,team2:9},form:{team1:12,team2:11}},
      squadInfo:{KKR:SQUAD_STRENGTH.KKR, PBKS:SQUAD_STRENGTH.PBKS},
      keyPlayers:{KKR:['Cameron Green (Rs25.2cr)','Varun Chakravarthy','Rinku Singh (finisher)'],PBKS:['Shreyas Iyer','Arshdeep Singh','Glenn Maxwell + Chahal']},
      tossImpact:{preference:'chase',chasingAdvantage:55,description:'Eden Gardens – moderate chase advantage (55%).'},
      pitchInfo:{type:'Balanced',avgScore:168,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 13 ML PREDICTION ───────────────────────────────────────────────
    { match:13, date:'Apr 07', day:'Tue', time:'7:30 PM', venue:'Guwahati',
      team1:'RR', team2:'MI', predictedWinner:'MI', isCompleted:false,
      winProbability:{RR:38, MI:62}, confidence:62,
      winnerColor:TEAM_COLORS['MI'],
      keyMetrics:{recentForm:{team1:76,team2:89},venueAdvantage:{team1:50,team2:50},h2hRatio:{team1:46,team2:54},pressureIndex:{team1:53,team2:88}},
      breakdown:{h2h:{team1:9,team2:11},venue:{team1:8,team2:8},batting:{team1:10,team2:12},bowling:{team1:9,team2:12},form:{team1:11,team2:13}},
      squadInfo:{RR:SQUAD_STRENGTH.RR, MI:SQUAD_STRENGTH.MI},
      keyPlayers:{RR:['Vaibhav Suryavanshi','Riyan Parag (captain)','Jofra Archer'],MI:['Jasprit Bumrah (World #1)','Rohit Sharma + SKY','Hardik Pandya + Will Jacks']},
      tossImpact:{preference:'neutral',chasingAdvantage:50,description:'Neutral Guwahati venue, no clear edge.'},
      pitchInfo:{type:'Balanced',avgScore:164,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 14 ML PREDICTION ───────────────────────────────────────────────
    { match:14, date:'Apr 08', day:'Wed', time:'7:30 PM', venue:'Delhi',
      team1:'DC', team2:'GT', predictedWinner:'DC', isCompleted:false,
      winProbability:{DC:55, GT:45}, confidence:55,
      winnerColor:TEAM_COLORS['DC'],
      keyMetrics:{recentForm:{team1:82,team2:87},venueAdvantage:{team1:58,team2:42},h2hRatio:{team1:25,team2:75},pressureIndex:{team1:60,team2:81}},
      breakdown:{h2h:{team1:5,team2:15},venue:{team1:9,team2:6},batting:{team1:11,team2:11},bowling:{team1:13,team2:12},form:{team1:12,team2:13}},
      squadInfo:{DC:SQUAD_STRENGTH.DC, GT:SQUAD_STRENGTH.GT},
      keyPlayers:{DC:['Axar Patel + Kuldeep Yadav (best spin duo)','KL Rahul + Tristan Stubbs','Vipraj Nigam (breakout)'],GT:['Rashid Khan','Sai Sudharsan + Shubman Gill','Kagiso Rabada']},
      tossImpact:{preference:'neutral',chasingAdvantage:50,description:'Kotla – even split. No clear advantage.'},
      pitchInfo:{type:'Balanced',avgScore:170,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 15 ML PREDICTION ───────────────────────────────────────────────
    { match:15, date:'Apr 09', day:'Thu', time:'7:30 PM', venue:'Kolkata',
      team1:'KKR', team2:'LSG', predictedWinner:'KKR', isCompleted:false,
      winProbability:{KKR:65, LSG:35}, confidence:65,
      winnerColor:TEAM_COLORS['KKR'],
      keyMetrics:{recentForm:{team1:82,team2:68},venueAdvantage:{team1:65,team2:35},h2hRatio:{team1:75,team2:25},pressureIndex:{team1:60,team2:39}},
      breakdown:{h2h:{team1:15,team2:5},venue:{team1:10,team2:5},batting:{team1:11,team2:10},bowling:{team1:10,team2:9},form:{team1:12,team2:10}},
      squadInfo:{KKR:SQUAD_STRENGTH.KKR, LSG:SQUAD_STRENGTH.LSG},
      keyPlayers:{KKR:['Finn Allen + Cameron Green','Varun Chakravarthy','Rinku Singh'],LSG:['Rishabh Pant','Nicholas Pooran','Mohammed Shami']},
      tossImpact:{preference:'chase',chasingAdvantage:55,description:'Eden Gardens – moderate chase advantage (55%).'},
      pitchInfo:{type:'Balanced',avgScore:168,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 16 ML PREDICTION ───────────────────────────────────────────────
    { match:16, date:'Apr 10', day:'Fri', time:'7:30 PM', venue:'Guwahati',
      team1:'RR', team2:'RCB', predictedWinner:'RCB', isCompleted:false,
      winProbability:{RR:41, RCB:59}, confidence:59,
      winnerColor:TEAM_COLORS['RCB'],
      keyMetrics:{recentForm:{team1:76,team2:80},venueAdvantage:{team1:50,team2:50},h2hRatio:{team1:45,team2:55},pressureIndex:{team1:53,team2:37}},
      breakdown:{h2h:{team1:9,team2:11},venue:{team1:8,team2:8},batting:{team1:10,team2:11},bowling:{team1:9,team2:10},form:{team1:11,team2:12}},
      squadInfo:{RR:SQUAD_STRENGTH.RR, RCB:SQUAD_STRENGTH.RCB},
      keyPlayers:{RR:['Vaibhav Suryavanshi','Riyan Parag (captain)','Jofra Archer + Sam Curran'],RCB:['Virat Kohli','Jacob Bethell','Phil Salt + Josh Hazlewood']},
      tossImpact:{preference:'neutral',chasingAdvantage:50,description:'Neutral Guwahati venue, no clear edge.'},
      pitchInfo:{type:'Balanced',avgScore:164,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 17 ML PREDICTION ───────────────────────────────────────────────
    { match:17, date:'Apr 11', day:'Sat', time:'3:30 PM', venue:'Mullanpur',
      team1:'PBKS', team2:'SRH', predictedWinner:'SRH', isCompleted:false,
      winProbability:{PBKS:43, SRH:57}, confidence:57,
      winnerColor:TEAM_COLORS['SRH'],
      keyMetrics:{recentForm:{team1:70,team2:76},venueAdvantage:{team1:58,team2:42},h2hRatio:{team1:30,team2:70},pressureIndex:{team1:39,team2:53}},
      breakdown:{h2h:{team1:6,team2:14},venue:{team1:9,team2:6},batting:{team1:10,team2:12},bowling:{team1:9,team2:10},form:{team1:10,team2:11}},
      squadInfo:{PBKS:SQUAD_STRENGTH.PBKS, SRH:SQUAD_STRENGTH.SRH},
      keyPlayers:{PBKS:['Shreyas Iyer','Arshdeep Singh','Glenn Maxwell + Chahal'],SRH:['Travis Head + Abhishek Sharma','Heinrich Klaasen','Harshal Patel']},
      tossImpact:{preference:'chase',chasingAdvantage:54,description:'New Punjab ground, slight chase edge (54%).'},
      pitchInfo:{type:'Batting',avgScore:171,spinFriendly:false},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 18 ML PREDICTION ───────────────────────────────────────────────
    { match:18, date:'Apr 11', day:'Sat', time:'7:30 PM', venue:'Chennai',
      team1:'CSK', team2:'DC', predictedWinner:'CSK', isCompleted:false,
      winProbability:{CSK:62, DC:38}, confidence:62,
      winnerColor:TEAM_COLORS['CSK'],
      keyMetrics:{recentForm:{team1:72,team2:82},venueAdvantage:{team1:72,team2:28},h2hRatio:{team1:63,team2:37},pressureIndex:{team1:46,team2:60}},
      breakdown:{h2h:{team1:13,team2:7},venue:{team1:11,team2:4},batting:{team1:11,team2:11},bowling:{team1:10,team2:13},form:{team1:11,team2:12}},
      squadInfo:{CSK:SQUAD_STRENGTH.CSK, DC:SQUAD_STRENGTH.DC},
      keyPlayers:{CSK:['Sanju Samson','Ruturaj Gaikwad','Jadeja + Noor Ahmad'],DC:['Axar Patel + Kuldeep Yadav','KL Rahul + Miller','Mitchell Starc']},
      tossImpact:{preference:'defend',chasingAdvantage:60,description:'Chepauk spin pitch. Defending better (60%).'},
      pitchInfo:{type:'Spin',avgScore:161,spinFriendly:true},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 19 ML PREDICTION ───────────────────────────────────────────────
    { match:19, date:'Apr 12', day:'Sun', time:'3:30 PM', venue:'Lucknow',
      team1:'LSG', team2:'GT', predictedWinner:'GT', isCompleted:false,
      winProbability:{LSG:37, GT:63}, confidence:63,
      winnerColor:TEAM_COLORS['GT'],
      keyMetrics:{recentForm:{team1:68,team2:87},venueAdvantage:{team1:58,team2:42},h2hRatio:{team1:33,team2:67},pressureIndex:{team1:39,team2:81}},
      breakdown:{h2h:{team1:7,team2:13},venue:{team1:9,team2:6},batting:{team1:10,team2:11},bowling:{team1:9,team2:12},form:{team1:10,team2:13}},
      squadInfo:{LSG:SQUAD_STRENGTH.LSG, GT:SQUAD_STRENGTH.GT},
      keyPlayers:{LSG:['Rishabh Pant','Nicholas Pooran','Mohammed Shami'],GT:['Rashid Khan','Sai Sudharsan + Gill','Rabada + Siraj']},
      tossImpact:{preference:'chase',chasingAdvantage:55,description:'BRSABV Stadium – chasing slightly preferred (55%).'},
      pitchInfo:{type:'Batting',avgScore:172,spinFriendly:false},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },

    // ── MATCH 20 ML PREDICTION ───────────────────────────────────────────────
    { match:20, date:'Apr 12', day:'Sun', time:'7:30 PM', venue:'Mumbai',
      team1:'MI', team2:'RCB', predictedWinner:'MI', isCompleted:false,
      winProbability:{MI:66, RCB:34}, confidence:66,
      winnerColor:TEAM_COLORS['MI'],
      keyMetrics:{recentForm:{team1:89,team2:80},venueAdvantage:{team1:68,team2:32},h2hRatio:{team1:58,team2:42},pressureIndex:{team1:88,team2:37}},
      breakdown:{h2h:{team1:12,team2:8},venue:{team1:10,team2:5},batting:{team1:12,team2:11},bowling:{team1:12,team2:10},form:{team1:13,team2:12}},
      squadInfo:{MI:SQUAD_STRENGTH.MI, RCB:SQUAD_STRENGTH.RCB},
      keyPlayers:{MI:['Jasprit Bumrah (World #1)','Rohit Sharma + SKY + Tilak','Will Jacks 4x MoM'],RCB:['Virat Kohli','Jacob Bethell','Josh Hazlewood + Bhuvneshwar']},
      tossImpact:{preference:'chase',chasingAdvantage:58,description:'Wankhede dew factor. Chasing preferred (58%).'},
      pitchInfo:{type:'Batting',avgScore:175,spinFriendly:false},
      methodology:'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)' },
  ];

  useEffect(() => {
    setPredictions(ALL_20);
    setModelInfo('Ensemble ML + Actual Results (Matches 1-4)');
    setLoading(false);
  }, []);"""

content = content[:s] + NEW_BLOCK + content[e:]

# ── 2. Fix useState references (React.useState -> useState since it's already imported) ──
content = content.replace('React.useState(', 'useState(')
content = content.replace('React.useState<', 'useState<')

with open(JSX_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'SUCCESS — wrote {len(content)} bytes to {JSX_PATH}')
