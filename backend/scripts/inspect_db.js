const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    console.log('Connected successfully to server');
    
    // Check ipl_history
    const historyDb = client.db('ipl_history');
    const historyColls = await historyDb.listCollections().toArray();
    console.log('ipl_history collections:', historyColls.map(c => c.name));
    
    // Check ipl_prediction
    const predictionDb = client.db('ipl_prediction');
    const predictionColls = await predictionDb.listCollections().toArray();
    console.log('ipl_prediction collections:', predictionColls.map(c => c.name));
    
    // Sample a few collections if they exist
    for (const colName of historyColls.map(c => c.name)) {
      const count = await historyDb.collection(colName).countDocuments();
      const sample = await historyDb.collection(colName).findOne();
      console.log(`Collection [ipl_history.${colName}] count:`, count);
      console.log(`Sample doc from [ipl_history.${colName}]:`, sample ? Object.keys(sample) : 'none');
    }

    for (const colName of predictionColls.map(c => c.name)) {
      const count = await predictionDb.collection(colName).countDocuments();
      const sample = await predictionDb.collection(colName).findOne();
      console.log(`Collection [ipl_prediction.${colName}] count:`, count);
      console.log(`Sample doc from [ipl_prediction.${colName}]:`, sample ? Object.keys(sample) : 'none');
    }
  } finally {
    await client.close();
  }
}

run().catch(console.error);
