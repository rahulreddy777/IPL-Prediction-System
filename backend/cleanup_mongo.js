const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('ipl_prediction');
  
  const res1 = await db.collection('ipl_matches_2026').deleteMany({ matchNumber: { $exists: true } });
  console.log('Deleted old playoff docs:', res1.deletedCount);
  
  const res2 = await db.collection('ipl_matches_2026').deleteMany({ league_stage_matches: { $exists: true } });
  console.log('Deleted monolithic docs:', res2.deletedCount);
  
  const docs = await db.collection('ipl_matches_2026').countDocuments();
  console.log('Remaining documents:', docs);
  client.close();
}
run();
