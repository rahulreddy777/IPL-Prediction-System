const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb+srv://rahulreddy39189_db_user:rahulreddy77@cluster0.xnodeai.mongodb.net/ipl_prediction?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    const db = client.db('ipl_prediction');
    const collection = db.collection('ipl_teams_head_to_head');
    
    // Clear out the bad data (which was player stats instead of H2H)
    await collection.deleteMany({});
    console.log('Cleared existing data from ipl_teams_head_to_head');
    
    // Read the correct H2H data from JSON
    const dataPath = path.join(__dirname, 'data', 'head to head in .json');
    const h2hData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Insert the single document containing all teams
    await collection.insertOne(h2hData);
    console.log('Successfully seeded correct Head-to-Head data!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await client.close();
  }
}

run();
