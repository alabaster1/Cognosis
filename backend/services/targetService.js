/**
 * Target Service
 * Fetches random targets from multiple free APIs for RV experiments
 * Uses: Unsplash, Pexels, Lorem Picsum, and NASA APOD
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

// Categories for diverse target selection
const UNSPLASH_CATEGORIES = ['nature', 'architecture', 'people', 'technology', 'animals', 'food', 'travel', 'abstract'];
const PEXELS_CATEGORIES = ['nature', 'city', 'people', 'animals', 'food', 'technology', 'architecture', 'travel'];

/**
 * Fetch random target from Unsplash
 */
async function getUnsplashTarget() {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('[TargetService] No Unsplash API key configured');
    return null;
  }

  try {
    const category = UNSPLASH_CATEGORIES[Math.floor(Math.random() * UNSPLASH_CATEGORIES.length)];
    const response = await fetch(`https://api.unsplash.com/photos/random?query=${category}&content_filter=high`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
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
  } catch (error) {
    console.error('[TargetService] Unsplash error:', error.message);
    return null;
  }
}

/**
 * Fetch random target from Pexels
 */
async function getPexelsTarget() {
  if (!PEXELS_API_KEY) {
    console.warn('[TargetService] No Pexels API key configured');
    return null;
  }

  try {
    const category = PEXELS_CATEGORIES[Math.floor(Math.random() * PEXELS_CATEGORIES.length)];
    const page = Math.floor(Math.random() * 10) + 1; // Random page 1-10

    const response = await fetch(`https://api.pexels.com/v1/search?query=${category}&per_page=1&page=${page}`, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      return null;
    }

    const photo = data.photos[0];

    return {
      type: 'image',
      source: 'Pexels',
      description: `A ${category} photograph${photo.alt ? ': ' + photo.alt : ''}`,
      tags: [category, 'photography'],
      imageUrl: photo.src.large,
      metadata: {
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        avgColor: photo.avg_color,
        width: photo.width,
        height: photo.height
      }
    };
  } catch (error) {
    console.error('[TargetService] Pexels error:', error.message);
    return null;
  }
}

/**
 * Fetch random target from Lorem Picsum
 */
async function getLoremPicsumTarget() {
  try {
    // Get random image info
    const id = Math.floor(Math.random() * 1000) + 1;
    const response = await fetch(`https://picsum.photos/id/${id}/info`);

    if (!response.ok) {
      throw new Error(`Lorem Picsum API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      type: 'image',
      source: 'Lorem Picsum',
      description: `A photograph by ${data.author}`,
      tags: ['photography', 'random'],
      imageUrl: data.download_url,
      metadata: {
        photographer: data.author,
        width: data.width,
        height: data.height
      }
    };
  } catch (error) {
    console.error('[TargetService] Lorem Picsum error:', error.message);
    return null;
  }
}

/**
 * Fetch NASA Astronomy Picture of the Day (or random from archive)
 */
async function getNASATarget() {
  try {
    // Get a random date from the last 3 years
    const today = new Date();
    const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    const randomDate = new Date(threeYearsAgo.getTime() + Math.random() * (today.getTime() - threeYearsAgo.getTime()));
    const dateStr = randomDate.toISOString().split('T')[0];

    const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${dateStr}`);

    if (!response.ok) {
      throw new Error(`NASA API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Skip if it's a video
    if (data.media_type === 'video') {
      return null;
    }

    return {
      type: 'image',
      source: 'NASA APOD',
      description: data.explanation,
      tags: ['space', 'astronomy', 'nasa', 'cosmic'],
      imageUrl: data.url,
      metadata: {
        title: data.title,
        date: data.date,
        copyright: data.copyright
      }
    };
  } catch (error) {
    console.error('[TargetService] NASA error:', error.message);
    return null;
  }
}

/**
 * Fallback targets when APIs are unavailable
 */
const FALLBACK_TARGETS = [
  {
    type: 'image',
    source: 'Fallback',
    description: 'A serene mountain landscape at sunset with a calm lake reflecting the orange sky',
    tags: ['nature', 'mountain', 'sunset', 'lake', 'peaceful'],
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    metadata: { note: 'Fallback target' }
  },
  {
    type: 'image',
    source: 'Fallback',
    description: 'A busy urban street corner in Tokyo at night with neon signs and crowds',
    tags: ['city', 'urban', 'night', 'neon', 'tokyo'],
    imageUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989',
    metadata: { note: 'Fallback target' }
  },
  {
    type: 'image',
    source: 'Fallback',
    description: 'A vintage steam locomotive crossing a stone bridge over a river',
    tags: ['train', 'vintage', 'bridge', 'river', 'historic'],
    imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3',
    metadata: { note: 'Fallback target' }
  },
  {
    type: 'image',
    source: 'Fallback',
    description: 'An ancient Egyptian pyramid under a clear blue sky in the desert',
    tags: ['pyramid', 'egypt', 'ancient', 'desert', 'architecture'],
    imageUrl: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020',
    metadata: { note: 'Fallback target' }
  },
  {
    type: 'image',
    source: 'Fallback',
    description: 'A colorful hot air balloon floating over a countryside landscape at dawn',
    tags: ['balloon', 'sky', 'flight', 'countryside', 'dawn'],
    imageUrl: 'https://images.unsplash.com/photo-1498550744921-75f79806b163',
    metadata: { note: 'Fallback target' }
  }
];

/**
 * Get a random target from any available source
 */
async function getRandomTarget() {
  console.log('[TargetService] Fetching random target...');

  // Available sources based on API keys
  const sources = [];

  if (UNSPLASH_ACCESS_KEY) sources.push(getUnsplashTarget);
  if (PEXELS_API_KEY) sources.push(getPexelsTarget);
  sources.push(getLoremPicsumTarget); // Always available
  sources.push(getNASATarget); // Always available (DEMO_KEY)

  // Randomly select a source
  const randomSource = sources[Math.floor(Math.random() * sources.length)];

  try {
    const target = await randomSource();

    if (target) {
      console.log(`[TargetService] Got target from ${target.source}:`, target.description.substring(0, 50) + '...');
      return target;
    }
  } catch (error) {
    console.error('[TargetService] Error fetching from primary source:', error);
  }

  // Fallback to other sources if primary fails
  for (const source of sources) {
    if (source === randomSource) continue; // Skip the one we already tried

    try {
      const target = await source();
      if (target) {
        console.log(`[TargetService] Got fallback target from ${target.source}`);
        return target;
      }
    } catch (error) {
      console.error('[TargetService] Fallback source error:', error);
    }
  }

  // Last resort: use hardcoded fallback
  const fallbackTarget = FALLBACK_TARGETS[Math.floor(Math.random() * FALLBACK_TARGETS.length)];
  console.log('[TargetService] Using hardcoded fallback target');
  return fallbackTarget;
}

module.exports = {
  getRandomTarget
};
