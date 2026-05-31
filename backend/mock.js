const { MongoClient } = require('mongodb');
require('dotenv').config({path: '.env'});
const client = new MongoClient(process.env.MONGO_URI);

async function run() {
  try {
    await client.connect();
    const db = client.db('ipl_prediction');
    const col = db.collection('liveCache');
    
    // Create a mock match
    const mockData = {
      status: "success",
      response: [
        {
          id: "mock123",
          matchDesc: "CSK vs MI, Final",
          status: "Live - MI need 42 runs in 18 balls",
          venue: { name: "Wankhede Stadium, Mumbai" },
          dateTimeGMT: new Date().toISOString(),
          team1: { teamSName: "CSK" },
          team2: { teamSName: "MI" },
          matchScore: {
            team1Score: { inngs1: { runs: 210, wickets: 4, overs: 20 } },
            team2Score: { inngs1: { runs: 169, wickets: 3, overs: 17 } }
          },
          state: "In Progress"
        }
      ]
    };

    await col.updateOne(
      { type: 'ipl' },
      { $set: { data: mockData, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log('Mock data inserted successfully into liveCache.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
