const http = require('http');
const req = http.request({hostname:'localhost', port:5000, path:'/api/matches2026', method:'GET'}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const arr = JSON.parse(data);
    const playoffs = arr.filter(m => m.stage === 'playoff');
    playoffs.forEach(m => {
      const t1score = m.team1 ? m.team1.score : 'N/A';
      const t2score = m.team2 ? m.team2.score : 'N/A';
      console.log('M' + m.matchNumber, m.label || m.matchType,
        '| status:', m.status,
        '| winner:', JSON.stringify(m.winner),
        '| t1:', m.team1 && m.team1.code, t1score,
        '| t2:', m.team2 && m.team2.code, t2score
      );
    });
    process.exit(0);
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
