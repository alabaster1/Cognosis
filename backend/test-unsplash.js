require('dotenv').config();

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const UNSPLASH_CATEGORIES = ['nature', 'architecture', 'people', 'technology', 'animals', 'food', 'travel', 'abstract'];

async function testUnsplash() {
  console.log('UNSPLASH_ACCESS_KEY:', UNSPLASH_ACCESS_KEY ? `${UNSPLASH_ACCESS_KEY.substring(0, 10)}...` : '(not set)');

  if (!UNSPLASH_ACCESS_KEY) {
    console.log('❌ No Unsplash API key found');
    return;
  }

  try {
    const category = UNSPLASH_CATEGORIES[Math.floor(Math.random() * UNSPLASH_CATEGORIES.length)];
    console.log(`Fetching random ${category} photo from Unsplash...`);

    const response = await fetch(`https://api.unsplash.com/photos/random?query=${category}&content_filter=high`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const data = await response.json();

    const target = {
      type: 'image',
      source: 'Unsplash',
      description: data.description || data.alt_description || `A ${category} photograph`,
      tags: [category, ...(data.tags?.map(t => t.title) || [])].slice(0, 5),
      imageUrl: data.urls.regular,
      metadata: {
        photographer: data.user.name,
        location: data.location?.name,
        color: data.color,
        width: data.width,
        height: data.height
      }
    };

    console.log('\n✅ SUCCESS! Got Unsplash target:');
    console.log(JSON.stringify(target, null, 2));

  } catch (error) {
    console.error('❌ Unsplash error:', error.message);
  }
}

testUnsplash().then(() => process.exit(0));
