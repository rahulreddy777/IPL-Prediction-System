const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    
    // Check ipl_history.all_time_batters
    const historyDb = client.db('ipl_history');
    const batter = await historyDb.collection('all_time_batters').findOne();
    console.log('Sample Batter doc:', batter);
    
    // Check ipl_history.all_time_bowlers
    const bowler = await historyDb.collection('all_time_bowlers').findOne();
    console.log('Sample Bowler doc:', bowler);
    
    // Check ipl_prediction.ipl_captains_2026
    const predictionDb = client.db('ipl_prediction');
    const captain = await predictionDb.collection('ipl_captains_2026').findOne();
    console.log('Sample Captain doc:', JSON.stringify(captain, null, 2).slice(0, 1000));
  } finally {
    await client.close();
  }
}

run().catch(console.error);
