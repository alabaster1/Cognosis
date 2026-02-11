const targetService = require('./services/targetService');

async function testSources() {
  console.log('Testing all target sources...\n');

  const results = {
    'Unsplash': 0,
    'Pexels': 0,
    'Lorem Picsum': 0,
    'NASA APOD': 0,
    'Fallback': 0
  };

  // Test 20 times to see distribution
  for (let i = 1; i <= 20; i++) {
    try {
      const target = await targetService.getRandomTarget();
      results[target.source]++;
      console.log(`${i}. ${target.source.padEnd(15)} - ${target.description.substring(0, 50)}...`);
    } catch (error) {
      console.error(`${i}. ERROR:`, error.message);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n=== Distribution ===');
  Object.entries(results).forEach(([source, count]) => {
    if (count > 0) {
      console.log(`${source.padEnd(15)}: ${count} (${Math.round(count/20*100)}%)`);
    }
  });
}

testSources().then(() => {
  console.log('\nTest complete!');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
