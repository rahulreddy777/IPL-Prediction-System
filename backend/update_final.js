const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('ipl_prediction');

  const res = await db.collection('ipl_matches_2026').updateOne(
    { match_number: 'Final' },
    { $set: {
      team_1: 'Royal Challengers Bengaluru',
      team_2: 'Gujarat Titans',
      venue: 'Narendra Modi Stadium, Ahmedabad',
      date: 'Sun, May 31 2026'
    }}
  );
  console.log('Updated Final:', res.modifiedCount, 'doc(s)');

  const fin = await db.collection('ipl_matches_2026').findOne({ match_number: 'Final' });
  console.log('Final now:', fin?.team_1, 'vs', fin?.team_2);
  console.log('Date:', fin?.date, '| Venue:', fin?.venue?.substring(0, 50));
  client.close();
}
run();
