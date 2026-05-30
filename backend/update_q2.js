const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('ipl_prediction');

  // Correct Q2 scores: RR batted first (216-6 in 20), GT chased (219-3 in 18.3), GT won by 7 wkts
  const res = await db.collection('ipl_matches_2026').updateOne(
    { match_number: 'Qualifier 2' },
    { $set: {
      team_1: 'Rajasthan Royals',
      team_2: 'Gujarat Titans',
      score_team_1: '216-6 (20)',
      score_team_2: '219-3 (18.3)',
      winner: 'Gujarat Titans',
      venue: 'New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    }}
  );
  console.log('Updated Q2:', res.modifiedCount, 'doc(s)');

  const q2 = await db.collection('ipl_matches_2026').findOne({ match_number: 'Qualifier 2' });
  console.log('Q2 now:');
  console.log(' ', q2.team_1, '→', q2.score_team_1);
  console.log(' ', q2.team_2, '→', q2.score_team_2);
  console.log('  Winner:', q2.winner);
  client.close();
}
run();
