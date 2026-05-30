const freshMLService = require('./services/freshMLPredictionService');

async function test() {
  try {
    console.log('Testing generateFreshPredictions...');
    const result = await freshMLService.generateFreshPredictions();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }
  process.exit(0);
}

test();
