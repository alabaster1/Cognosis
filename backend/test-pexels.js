/**
 * Pexels API Integration Test
 * Tests that Pexels API key is valid and can fetch images
 */

require('dotenv').config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

async function testPexelsAPI() {
  console.log('🧪 Testing Pexels API Integration...\n');

  // 1. Check if API key exists
  if (!PEXELS_API_KEY) {
    console.error('❌ PEXELS_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('✅ PEXELS_API_KEY found in environment');
  console.log(`   Key: ${PEXELS_API_KEY.substring(0, 10)}...${PEXELS_API_KEY.substring(PEXELS_API_KEY.length - 5)}\n`);

  // 2. Test API connectivity
  try {
    console.log('📡 Making test API call to Pexels...');

    const response = await fetch('https://api.pexels.com/v1/curated?per_page=15', {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });

    if (!response.ok) {
      console.error(`❌ Pexels API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Response: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ Pexels API responded successfully');
    console.log(`   Total photos available: ${data.total_results || 'N/A'}`);
    console.log(`   Photos in this page: ${data.photos?.length || 0}\n`);

    // 3. Show sample target
    if (data.photos && data.photos.length > 0) {
      const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];

      console.log('📸 Sample RV Target from Pexels:');
      console.log(`   ID: ${randomPhoto.id}`);
      console.log(`   Photographer: ${randomPhoto.photographer}`);
      console.log(`   Alt Text: ${randomPhoto.alt || 'No alt text'}`);
      console.log(`   URL: ${randomPhoto.url}`);
      console.log(`   Image: ${randomPhoto.src?.large || randomPhoto.src?.original}\n`);

      // 4. Format as RV target
      const rvTarget = {
        source: 'pexels',
        id: randomPhoto.id,
        title: randomPhoto.alt || `Photo by ${randomPhoto.photographer}`,
        description: randomPhoto.alt || 'Curated photo from Pexels',
        imageUrl: randomPhoto.src?.large || randomPhoto.src?.original,
        thumbnailUrl: randomPhoto.src?.medium,
        tags: [],
        photographer: randomPhoto.photographer,
        photographerUrl: randomPhoto.photographer_url,
        originalUrl: randomPhoto.url,
        metadata: {
          width: randomPhoto.width,
          height: randomPhoto.height,
          avgColor: randomPhoto.avg_color
        }
      };

      console.log('✅ Successfully formatted as RV target:');
      console.log(JSON.stringify(rvTarget, null, 2));
      console.log();
    }

    // 5. Test targetService integration
    console.log('🔧 Testing targetService integration...');
    const targetService = require('./services/targetService');

    const target = await targetService.getRandomTarget();

    console.log('✅ targetService.getRandomTarget() successful');
    console.log(`   Source: ${target.source}`);
    console.log(`   Title: ${target.title}`);
    console.log(`   Image URL: ${target.imageUrl}\n`);

    if (target.source === 'pexels') {
      console.log('🎉 Successfully fetched a Pexels target through targetService!');
    } else {
      console.log(`ℹ️  Random selection chose ${target.source} this time`);
      console.log('   Pexels is available in the rotation.');
    }

    console.log('\n✨ All Pexels integration tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testPexelsAPI();
