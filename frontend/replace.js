const fs = require('fs');
const txt = fs.readFileSync('src/pages/Predictions2026.jsx', 'utf8');
const lines = txt.split('\n');

const newCode = `  useEffect(() => {
    setModelInfo('IPL 2026 · Predictions Powered By MongoDB (ipl_matches_2026)');

    const fetchAllMatches = async () => {
      try {
        setLoading(true);
        const resp = await fetch('http://localhost:5000/api/matches2026');
        if (!resp.ok) throw new Error('Failed to load matches');
        
        const allMatches = await resp.json();
        const dynamicPredictions = allMatches.map(match => {
          const t1 = match?.team1Short || match?.team1?.code || match?.team1 || 'TBD';
          const t2 = match?.team2Short || match?.team2?.code || match?.team2 || 'TBD';
          
          let predictedWinner = 'TBD';
          let team1Prob = 50;
          let team2Prob = 50;
          let isCompleted = false;

          if (match.status === 'completed' || match.status === 'result') {
            isCompleted = true;
            predictedWinner = match?.winnerShort || match?.winner?.code || match?.winner || match?.winnerFull || 'TBD';
            if (predictedWinner === match?.team1?.name || predictedWinner === match?.team_1) predictedWinner = t1;
            if (predictedWinner === match?.team2?.name || predictedWinner === match?.team_2) predictedWinner = t2;
            
            team1Prob = predictedWinner === t1 ? 100 : 0;
            team2Prob = predictedWinner === t2 ? 100 : 0;
          } else {
            // Random generation for upcoming matches per user request
            predictedWinner = Math.random() > 0.5 ? t1 : t2;
            team1Prob = predictedWinner === t1 ? 52 : 48;
            team2Prob = predictedWinner === t2 ? 52 : 48;
          }

          const scoreTeam1 = match?.team1?.score || match?.score_team_1 || match?.scoreTeam1 || '';
          const scoreTeam2 = match?.team2?.score || match?.score_team_2 || match?.scoreTeam2 || '';
          const resultText = match?.resultText || match?.result || '';
          
          const actualResult = isCompleted 
            ? (resultText ? resultText : \`\${predictedWinner} won \${scoreTeam1 || scoreTeam2 ? '(' + scoreTeam1 + ' · ' + scoreTeam2 + ')' : ''}\`)
            : 'Upcoming';

          return {
            match: match.matchNumber,
            date: match.date || match.dateISO || '',
            day: '',
            time: match.timeIST || '',
            venue: match.venue || '',
            team1: t1,
            team2: t2,
            predictedWinner: predictedWinner,
            isCompleted: isCompleted,
            actualResult: actualResult,
            winProbability: { [t1]: team1Prob, [t2]: team2Prob },
            confidence: isCompleted ? 100 : Math.max(team1Prob, team2Prob),
            winnerColor: TEAM_COLORS[predictedWinner] || '#94a3b8',
            keyMetrics: { recentForm:{team1:50,team2:50}, venueAdvantage:{team1:50,team2:50}, h2hRatio:{team1:50,team2:50}, pressureIndex:{team1:50,team2:50} },
            breakdown: { h2h:{team1:10,team2:10}, venue:{team1:10,team2:10}, batting:{team1:10,team2:10}, bowling:{team1:10,team2:10}, form:{team1:10,team2:10} },
            squadInfo: { [t1]: {overall: 100}, [t2]: {overall: 100} },
            keyPlayers: { [t1]: [], [t2]: [] },
            tossImpact: { preference: 'neutral', chasingAdvantage: 50, description: '' },
            pitchInfo: { type: 'Balanced', avgScore: 170, spinFriendly: false },
            methodology: isCompleted ? 'ACTUAL RESULT — Match Completed' : 'Random Prediction',
            score_team_1: scoreTeam1,
            score_team_2: scoreTeam2,
            status: match.status,
            isPlayoff: match.stage === 'playoff' || match.matchNumber >= 71
          };
        });

        setPredictions(dynamicPredictions);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load predictions from DB:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAllMatches();
    const interval = setInterval(fetchAllMatches, 15000);
    return () => clearInterval(interval);
  }, []);`;

lines.splice(1231, 1447 - 1231 + 1, newCode);
fs.writeFileSync('src/pages/Predictions2026.jsx', lines.join('\n'));
console.log("Replaced successfully.");
