/**
 * Target Selection Service
 * AI-powered selection and commitment of targets for remote viewing experiments
 * Uses OpenAI API for AI enrichment and scoring
 */

const OpenAI = require('openai');
const axios = require('axios');
const embeddingService = require('./embeddingService');
const drandService = require('./drandService');
const statisticsService = require('./statisticsService');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

/**
 * Fetch image from Pexels
 */
async function fetchFromPexels(query) {
  if (!PEXELS_API_KEY) return null;
  const response = await axios.get('https://api.pexels.com/v1/search', {
    headers: { Authorization: PEXELS_API_KEY },
    params: { query, per_page: 5, orientation: 'landscape' },
  });
  const photos = response.data?.photos;
  if (!photos || photos.length === 0) return null;
  const photo = photos[Math.floor(Math.random() * photos.length)];
  return { url: photo.src.large, photographer: photo.photographer, source: 'Pexels' };
}

/**
 * Fetch image from Unsplash
 */
async function fetchFromUnsplash(query) {
  if (!UNSPLASH_ACCESS_KEY) return null;
  const response = await axios.get('https://api.unsplash.com/photos/random', {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    params: { query, content_filter: 'high', orientation: 'landscape' },
  });
  const data = response.data;
  if (!data?.urls) return null;
  return { url: data.urls.regular, photographer: data.user?.name || 'Unknown', source: 'Unsplash' };
}

/**
 * Fetch image from NASA APOD (random date from last 3 years)
 */
async function fetchFromNASA() {
  const today = new Date();
  const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
  const randomDate = new Date(threeYearsAgo.getTime() + Math.random() * (today.getTime() - threeYearsAgo.getTime()));
  const dateStr = randomDate.toISOString().split('T')[0];
  const response = await axios.get(`https://api.nasa.gov/planetary/apod`, {
    params: { api_key: NASA_API_KEY, date: dateStr },
  });
  const data = response.data;
  if (!data?.url || data.media_type === 'video') return null;
  return { url: data.url, photographer: data.copyright || 'NASA', source: 'NASA APOD' };
}

/**
 * Fetch a relevant image for a target by randomly picking from available APIs
 * Tries: Pexels, Unsplash, NASA - randomly ordered, falls back through all
 */
async function fetchImageForTarget(query) {
  const sources = [
    () => fetchFromPexels(query),
    () => fetchFromUnsplash(query),
    () => fetchFromNASA(),
  ];

  // Shuffle sources randomly
  for (let i = sources.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sources[i], sources[j]] = [sources[j], sources[i]];
  }

  // Try each source until one succeeds
  for (const fetchFn of sources) {
    try {
      const result = await fetchFn();
      if (result) {
        console.log(`[TargetSelection] Image fetched from ${result.source}`);
        return result;
      }
    } catch (error) {
      console.warn('[TargetSelection] Image source failed:', error.message);
    }
  }

  console.warn('[TargetSelection] All image sources failed');
  return null;
}

// Lazy initialization of OpenAI client
let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

// Curated target datasets
const LOCATION_TARGETS = [
  { name: 'Machu Picchu', country: 'Peru', coordinates: '-13.1631,-72.5450', terrain: 'mountains', climate: 'temperate', features: ['Ancient ruins', 'Stone structures', 'Terraced agriculture', 'Mountain peaks'], description: 'Ancient Incan citadel on a mountain ridge, featuring intricate stonework and terraced structures.' },
  { name: 'Great Barrier Reef', country: 'Australia', coordinates: '-18.2871,147.6992', terrain: 'water', climate: 'tropical', features: ['Coral formations', 'Marine life', 'Clear water', 'Islands'], description: 'Vast underwater ecosystem with colorful coral formations and diverse marine life.' },
  { name: 'Sahara Desert', country: 'Algeria', coordinates: '23.8859,8.7879', terrain: 'desert', climate: 'arid', features: ['Sand dunes', 'Sparse vegetation', 'Rock formations'], description: 'Expansive desert landscape with massive sand dunes and occasional rock outcroppings.' },
  { name: 'Amazon Rainforest', country: 'Brazil', coordinates: '-3.4653,-62.2159', terrain: 'forest', climate: 'tropical', features: ['Dense vegetation', 'Rivers', 'Wildlife', 'Canopy'], description: 'Dense tropical rainforest with towering trees, winding rivers, and abundant biodiversity.' },
  { name: 'Mount Everest', country: 'Nepal', coordinates: '27.9881,86.9250', terrain: 'mountains', climate: 'arctic', features: ['Snow peaks', 'Ice', 'Rocky terrain', 'Extreme altitude'], description: 'World\'s highest mountain peak, covered in snow and ice with harsh conditions.' },
  { name: 'Venice Canals', country: 'Italy', coordinates: '45.4408,12.3155', terrain: 'urban', climate: 'mediterranean', features: ['Water canals', 'Historic buildings', 'Bridges', 'Boats'], description: 'Historic city built on water with intricate canal systems and Renaissance architecture.' },
  { name: 'Serengeti Plains', country: 'Tanzania', coordinates: '-2.3333,34.8333', terrain: 'plains', climate: 'tropical', features: ['Grasslands', 'Wildlife herds', 'Scattered trees'], description: 'Vast grassland ecosystem known for massive wildlife migrations and open horizons.' },
  { name: 'Antarctica Research Station', country: 'Antarctica', coordinates: '-77.8500,166.6667', terrain: 'arctic', climate: 'arctic', features: ['Ice sheets', 'Buildings', 'Research equipment', 'Penguins'], description: 'Scientific research station on frozen continent, surrounded by ice and limited wildlife.' },
  { name: 'Angkor Wat', country: 'Cambodia', coordinates: '13.4125,103.8670', terrain: 'jungle', climate: 'tropical', features: ['Temple towers', 'Stone carvings', 'Moat', 'Jungle roots'], description: 'Ancient temple complex with towering spires, intricate bas-reliefs, and encroaching jungle.' },
  { name: 'Grand Canyon', country: 'USA', coordinates: '36.1069,-112.1129', terrain: 'canyon', climate: 'arid', features: ['Layered rock', 'River below', 'Vast depth', 'Red orange walls'], description: 'Immense layered canyon carved by the Colorado River, revealing millions of years of geological history.' },
  { name: 'Northern Lights (Iceland)', country: 'Iceland', coordinates: '64.9631,-19.0208', terrain: 'tundra', climate: 'subarctic', features: ['Aurora borealis', 'Dark sky', 'Snow', 'Volcanic landscape'], description: 'Dancing green and purple lights across a dark sky above snow-covered volcanic terrain.' },
  { name: 'Tokyo Shibuya Crossing', country: 'Japan', coordinates: '35.6595,139.7004', terrain: 'urban', climate: 'temperate', features: ['Crowds', 'Neon signs', 'Crosswalks', 'Skyscrapers'], description: 'World\'s busiest pedestrian crossing surrounded by towering neon-lit buildings.' },
  { name: 'Petra Treasury', country: 'Jordan', coordinates: '30.3285,35.4444', terrain: 'desert', climate: 'arid', features: ['Carved facade', 'Rose-red rock', 'Narrow canyon', 'Columns'], description: 'Elaborate temple facade carved directly into rose-red sandstone cliff face.' },
  { name: 'Great Wall Watchtower', country: 'China', coordinates: '40.4319,116.5704', terrain: 'mountains', climate: 'continental', features: ['Stone wall', 'Watchtowers', 'Mountains', 'Steps'], description: 'Ancient stone fortification snaking along mountain ridgelines with periodic watchtowers.' },
  { name: 'Niagara Falls', country: 'Canada', coordinates: '43.0896,-79.0849', terrain: 'waterfall', climate: 'continental', features: ['Massive falls', 'Mist', 'Rainbow', 'Rushing water'], description: 'Enormous horseshoe-shaped waterfall sending up clouds of mist with rainbow refraction.' },
  { name: 'Santorini Caldera', country: 'Greece', coordinates: '36.3932,25.4615', terrain: 'volcanic island', climate: 'mediterranean', features: ['White buildings', 'Blue domes', 'Cliff edge', 'Sea view'], description: 'White-washed buildings with blue domes perched on volcanic caldera cliffs above deep blue sea.' },
  { name: 'Redwood Forest', country: 'USA', coordinates: '41.2132,-124.0046', terrain: 'forest', climate: 'temperate', features: ['Giant trees', 'Ferns', 'Fog', 'Dappled light'], description: 'Cathedral-like groves of towering ancient redwood trees shrouded in coastal fog.' },
  { name: 'Saharan Oasis', country: 'Libya', coordinates: '26.3678,12.7891', terrain: 'desert/oasis', climate: 'arid', features: ['Palm trees', 'Pool', 'Sand', 'Green patch'], description: 'Lush green palm grove surrounding a still pool of water amid endless sand dunes.' },
  { name: 'Bioluminescent Bay', country: 'Puerto Rico', coordinates: '18.0940,-65.7410', terrain: 'coastal', climate: 'tropical', features: ['Glowing water', 'Darkness', 'Mangroves', 'Stars'], description: 'Dark bay where disturbed water glows electric blue from microscopic bioluminescent organisms.' },
];

const IMAGE_TARGETS = [
  { category: 'architecture', name: 'Gothic Cathedral', description: 'Tall spires, pointed arches, stained glass windows, intricate stone carvings', colors: ['gray', 'brown', 'multicolor'], features: ['vertical', 'ornate', 'religious'] },
  { category: 'nature', name: 'Waterfall', description: 'Cascading water, mist, rocks, vegetation, flowing motion', colors: ['white', 'blue', 'green'], features: ['movement', 'vertical', 'water'] },
  { category: 'urban', name: 'City Skyline at Night', description: 'Illuminated buildings, lights, glass facades, urban density', colors: ['yellow', 'white', 'blue', 'black'], features: ['vertical', 'geometric', 'artificial'] },
  { category: 'wildlife', name: 'Tiger in Jungle', description: 'Orange and black stripes, feline features, green foliage, predatory pose', colors: ['orange', 'black', 'green'], features: ['organic', 'striped', 'living'] },
  { category: 'landscape', name: 'Mountain Lake', description: 'Still water reflecting mountains, pine trees, rocky shores, clear sky', colors: ['blue', 'green', 'gray', 'brown'], features: ['horizontal', 'reflective', 'peaceful'] },
  { category: 'nature', name: 'Lightning Storm', description: 'Multiple lightning bolts illuminating dark clouds, rain, dramatic sky', colors: ['purple', 'white', 'black', 'blue'], features: ['dramatic', 'electric', 'vertical'] },
  { category: 'architecture', name: 'Japanese Temple Garden', description: 'Wooden pagoda, raked gravel, bonsai trees, stone lanterns, koi pond', colors: ['brown', 'green', 'white', 'red'], features: ['peaceful', 'geometric', 'natural'] },
  { category: 'space', name: 'Nebula', description: 'Colorful gas clouds in deep space, stars, cosmic dust, swirling patterns', colors: ['purple', 'pink', 'blue', 'gold'], features: ['vast', 'colorful', 'cosmic'] },
  { category: 'underwater', name: 'Deep Sea Creatures', description: 'Bioluminescent jellyfish, dark water, glowing tentacles, mysterious depth', colors: ['blue', 'cyan', 'black', 'purple'], features: ['glowing', 'organic', 'mysterious'] },
  { category: 'abstract', name: 'Fractal Pattern', description: 'Self-similar geometric shapes repeating at different scales, mathematical beauty', colors: ['blue', 'gold', 'green', 'red'], features: ['geometric', 'repeating', 'complex'] },
  { category: 'urban', name: 'Ancient Library', description: 'Towering bookshelves, spiral staircase, warm light, leather books, dust motes', colors: ['brown', 'gold', 'cream', 'amber'], features: ['vertical', 'warm', 'enclosed'] },
  { category: 'nature', name: 'Volcanic Eruption', description: 'Molten lava fountaining from crater, ash cloud, glowing rocks, night sky', colors: ['red', 'orange', 'black', 'gray'], features: ['explosive', 'hot', 'dynamic'] },
  { category: 'wildlife', name: 'Eagle in Flight', description: 'Large raptor soaring with outstretched wings against blue sky, mountain backdrop', colors: ['brown', 'white', 'blue', 'gold'], features: ['movement', 'freedom', 'majestic'] },
  { category: 'landscape', name: 'Frozen Waterfall', description: 'Cascading ice formations, blue-white ice, frozen spray, winter forest backdrop', colors: ['white', 'blue', 'cyan', 'gray'], features: ['frozen', 'vertical', 'crystalline'] },
  { category: 'architecture', name: 'Suspension Bridge in Fog', description: 'Steel cables disappearing into thick fog, red towers, water below', colors: ['red', 'gray', 'white', 'silver'], features: ['geometric', 'mysterious', 'spanning'] },
  { category: 'abstract', name: 'Aurora Borealis', description: 'Rippling green and purple curtains of light against starry sky, silhouetted trees', colors: ['green', 'purple', 'blue', 'black'], features: ['flowing', 'ethereal', 'luminous'] },
  { category: 'nature', name: 'Desert Sand Dunes', description: 'Smooth curved sand formations with sharp ridgelines, warm golden light, shadows', colors: ['gold', 'orange', 'brown', 'amber'], features: ['curved', 'smooth', 'warm'] },
  { category: 'urban', name: 'Neon-lit Alley', description: 'Narrow street with colorful neon signs reflecting on wet pavement, steam rising', colors: ['pink', 'blue', 'purple', 'cyan'], features: ['glowing', 'reflective', 'atmospheric'] },
  { category: 'wildlife', name: 'Whale Breach', description: 'Massive humpback whale leaping from ocean surface, water spray, cloudy sky', colors: ['gray', 'blue', 'white', 'dark blue'], features: ['movement', 'massive', 'dynamic'] },
];

const OBJECT_TARGETS = [
  { name: 'Antique Pocket Watch', material: 'metal', texture: 'smooth/engraved', shape: 'circular/compact', size: 'small', function: 'timekeeping', features: ['mechanical', 'ornate', 'portable'], description: 'Circular metal timepiece with intricate engravings, chain attachment, visible gears' },
  { name: 'Ceramic Vase', material: 'ceramic', texture: 'smooth/glossy', shape: 'cylindrical/curved', size: 'medium', function: 'decorative/storage', features: ['hollow', 'decorative', 'fragile'], description: 'Glazed ceramic container with curved form, decorative patterns, stable base' },
  { name: 'Leather-bound Book', material: 'leather/paper', texture: 'textured/rough', shape: 'rectangular', size: 'medium', function: 'information storage', features: ['pages', 'text', 'portable'], description: 'Rectangular bound volume with leather cover, aged pages, embossed title' },
  { name: 'Crystal Prism', material: 'glass/crystal', texture: 'smooth/faceted', shape: 'triangular/geometric', size: 'small', function: 'light refraction', features: ['transparent', 'geometric', 'refractive'], description: 'Transparent triangular object with flat surfaces, refracts light into spectrum' },
  { name: 'Wooden Chess Piece (Knight)', material: 'wood', texture: 'smooth/carved', shape: 'sculptural/horse-head', size: 'small', function: 'game piece', features: ['carved', 'symbolic', 'tactile'], description: 'Hand-carved wooden piece shaped like horse head, weighted base, smooth finish' },
  { name: 'Iron Skeleton Key', material: 'iron', texture: 'rough/rusty', shape: 'elongated/toothed', size: 'small', function: 'lock mechanism', features: ['metallic', 'ornate', 'historical'], description: 'Long iron key with elaborate bit pattern, ring bow, and oxidized surface' },
  { name: 'Glass Marble', material: 'glass', texture: 'smooth/polished', shape: 'spherical', size: 'tiny', function: 'toy/decoration', features: ['transparent', 'colorful', 'rolling'], description: 'Small perfectly round glass sphere with swirling colored patterns inside' },
  { name: 'Bronze Sundial', material: 'bronze', texture: 'etched/patina', shape: 'flat/circular', size: 'medium', function: 'timekeeping', features: ['ancient', 'scientific', 'decorative'], description: 'Flat bronze disc with hour markings and a triangular gnomon casting shadow' },
  { name: 'Silk Scarf', material: 'silk', texture: 'smooth/flowing', shape: 'square/draped', size: 'medium', function: 'clothing/decoration', features: ['soft', 'colorful', 'lightweight'], description: 'Delicate square of printed silk fabric with flowing drape and vivid patterns' },
  { name: 'Copper Telescope', material: 'copper/glass', texture: 'polished/segmented', shape: 'cylindrical/extending', size: 'large', function: 'observation', features: ['extending', 'optical', 'nautical'], description: 'Segmented copper tube with brass fittings and glass lenses for distant viewing' },
  { name: 'Jade Figurine', material: 'jade', texture: 'smooth/cool', shape: 'sculptural/organic', size: 'small', function: 'art/spiritual', features: ['carved', 'translucent', 'precious'], description: 'Carved green jade figure of a dragon with smooth translucent surface' },
  { name: 'Woven Basket', material: 'reed/willow', texture: 'woven/natural', shape: 'rounded/open-top', size: 'medium', function: 'container/carrying', features: ['handmade', 'organic', 'functional'], description: 'Hand-woven reed basket with tight interlocking pattern and curved handle' },
  { name: 'Stone Mortar and Pestle', material: 'granite', texture: 'rough/ground', shape: 'bowl/cylindrical', size: 'medium', function: 'grinding/crushing', features: ['heavy', 'ancient', 'functional'], description: 'Heavy granite bowl with matching cylindrical grinding stone, worn smooth inside' },
  { name: 'Brass Compass', material: 'brass/glass', texture: 'engraved/polished', shape: 'circular/hinged', size: 'small', function: 'navigation', features: ['magnetic', 'precision', 'portable'], description: 'Hinged brass case revealing a magnetic needle over engraved compass rose' },
  { name: 'Feather Quill', material: 'feather/metal', texture: 'soft/pointed', shape: 'elongated/tapered', size: 'small', function: 'writing', features: ['delicate', 'historical', 'artistic'], description: 'Long white goose feather with sharpened metal nib tip, stained with ink' },
];

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
function parseJsonResponse(text) {
  let content = text.trim();
  // Remove markdown code blocks if present
  if (content.startsWith('```')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  return JSON.parse(content);
}

class TargetSelectionService {
  /**
   * Generate and commit a random target for remote viewing
   * Uses drand beacon for verifiable randomness
   */
  async generateTarget(experimentType, userId, beacon = null) {
    console.log('[TargetSelection] Generating target for:', experimentType);

    // Get drand beacon if not provided
    if (!beacon) {
      beacon = await drandService.getLatestBeacon();
    }

    let target;
    let targetMetadata;

    switch (experimentType) {
      case 'remote-viewing-locations':
        target = this.selectRandomLocation(beacon);
        targetMetadata = await this.enrichLocationTarget(target);
        break;

      case 'remote-viewing-images':
        target = this.selectRandomImage(beacon);
        targetMetadata = await this.enrichImageTarget(target);
        break;

      case 'remote-viewing-objects':
        target = this.selectRandomObject(beacon);
        targetMetadata = await this.enrichObjectTarget(target);
        break;

      case 'remote-viewing':
        // Generic remote viewing - select any type using drand
        const types = ['location', 'image', 'object'];
        const typeIdx = drandService.deriveIndex(beacon.randomness, 'rv-type', types.length);
        const selectedType = types[typeIdx];
        if (selectedType === 'location') {
          target = this.selectRandomLocation(beacon);
          targetMetadata = await this.enrichLocationTarget(target);
        } else if (selectedType === 'image') {
          target = this.selectRandomImage(beacon);
          targetMetadata = await this.enrichImageTarget(target);
        } else {
          target = this.selectRandomObject(beacon);
          targetMetadata = await this.enrichObjectTarget(target);
        }
        break;

      case 'ai-generated':
      case 'telepathy-ghost':
      case 'precog-explorer':
      case 'pk-influence':
        target = await this.generateAITarget(experimentType);
        targetMetadata = target;
        break;

      default:
        throw new Error(`Unknown experiment type: ${experimentType}`);
    }

    // Fetch a relevant image for the target
    const imageData = await fetchImageForTarget(target.name || target.description || 'nature');
    if (imageData) {
      target.imageUrl = imageData.url;
      target.imageSource = imageData.source;
      target.imagePhotographer = imageData.photographer;
    }

    return {
      target,
      targetMetadata,
      selectionTimestamp: new Date().toISOString(),
      experimentType,
      userId,
      drandRound: beacon.round,
      randomnessSource: beacon.source,
    };
  }

  /**
   * Select random location from dataset using drand if available
   * @param {{ randomness: string }|null} beacon
   */
  selectRandomLocation(beacon = null) {
    if (beacon && beacon.randomness) {
      const index = drandService.deriveIndex(beacon.randomness, 'rv-location', LOCATION_TARGETS.length);
      return LOCATION_TARGETS[index];
    }
    const index = Math.floor(Math.random() * LOCATION_TARGETS.length);
    return LOCATION_TARGETS[index];
  }

  /**
   * Select random image from dataset using drand if available
   * @param {{ randomness: string }|null} beacon
   */
  selectRandomImage(beacon = null) {
    if (beacon && beacon.randomness) {
      const index = drandService.deriveIndex(beacon.randomness, 'rv-image', IMAGE_TARGETS.length);
      return IMAGE_TARGETS[index];
    }
    const index = Math.floor(Math.random() * IMAGE_TARGETS.length);
    return IMAGE_TARGETS[index];
  }

  /**
   * Select random object from dataset using drand if available
   * @param {{ randomness: string }|null} beacon
   */
  selectRandomObject(beacon = null) {
    if (beacon && beacon.randomness) {
      const index = drandService.deriveIndex(beacon.randomness, 'rv-object', OBJECT_TARGETS.length);
      return OBJECT_TARGETS[index];
    }
    const index = Math.floor(Math.random() * OBJECT_TARGETS.length);
    return OBJECT_TARGETS[index];
  }

  /**
   * Enrich location target with AI-generated details
   */
  async enrichLocationTarget(location) {
    try {
      const prompt = `You are an expert in remote viewing target preparation. Generate detailed, accurate descriptions. Return ONLY valid JSON without markdown code blocks.

Generate a detailed remote viewing target description for: ${location.name}, ${location.country}

Provide rich sensory details that a remote viewer might perceive:
- Visual characteristics (colors, shapes, patterns)
- Spatial layout and scale
- Environmental conditions
- Distinctive features
- Emotional impressions

Return as JSON with keys: visualDetails, spatialLayout, atmosphere, distinctiveFeatures, emotionalImpressions`;

      const openai = getClient();
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const enrichedDetails = parseJsonResponse(result.choices[0].message.content);

      return {
        ...location,
        enrichedDetails,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TargetSelection] AI enrichment failed:', error);
      // Return basic target if AI fails
      return location;
    }
  }

  /**
   * Enrich image target with AI-generated details
   */
  async enrichImageTarget(image) {
    try {
      const prompt = `You are an expert in remote viewing target preparation. Generate detailed, accurate descriptions. Return ONLY valid JSON without markdown code blocks.

Generate a detailed remote viewing target description for an image of: ${image.name}

Provide rich sensory details:
- Visual composition and layout
- Color palette and lighting
- Textures and patterns
- Movement or dynamism
- Emotional tone

Return as JSON with keys: composition, colorAndLight, textures, movement, emotionalTone`;

      const openai = getClient();
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
      });

      const enrichedDetails = parseJsonResponse(result.choices[0].message.content);

      return {
        ...image,
        enrichedDetails,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TargetSelection] AI enrichment failed:', error);
      return image;
    }
  }

  /**
   * Enrich object target with AI-generated details
   */
  async enrichObjectTarget(object) {
    try {
      const prompt = `You are an expert in remote viewing target preparation. Generate detailed, accurate descriptions. Return ONLY valid JSON without markdown code blocks.

Generate a detailed remote viewing target description for: ${object.name}

Provide rich sensory details:
- Physical characteristics (shape, size, weight)
- Material properties and texture
- Functional aspects
- Visual appearance
- Tactile qualities

Return as JSON with keys: physicalForm, materialQualities, functionality, visualAppearance, tactileQualities`;

      const openai = getClient();
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
      });

      const enrichedDetails = parseJsonResponse(result.choices[0].message.content);

      return {
        ...object,
        enrichedDetails,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TargetSelection] AI enrichment failed:', error);
      return object;
    }
  }

  /**
   * Generate an AI-created target image via the AI service
   */
  async generateAITarget(experimentType, seed = null) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/generate/target`, {
        seed: seed,
        style: 'photorealistic',
        category: null,
      });
      return {
        ...response.data,
        experimentType,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TargetSelection] AI target generation failed:', error.message);
      // Fallback to library selection
      const fallback = this.selectRandomImage();
      return await this.enrichImageTarget(fallback);
    }
  }

  /**
   * Generate adversarial distractors for a target
   */
  async generateAdversarialDistractors(targetImageUrl, targetDescription, numDistractors = 3) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/distractors/adversarial`, {
        target_image_url: targetImageUrl,
        target_description: targetDescription,
        num_distractors: numDistractors,
        min_similarity: 0.7,
      });
      return response.data;
    } catch (error) {
      console.error('[TargetSelection] Distractor generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Score a remote viewing attempt using embedding similarity
   * Falls back to LLM scoring if embeddings unavailable
   */
  async scoreRemoteViewing(userResponse, target, experimentType) {
    console.log('[TargetSelection] Scoring remote viewing attempt');

    // Build target description text
    const targetText = this._buildTargetText(target);

    // Build user response text
    const userText = typeof userResponse === 'string'
      ? userResponse
      : [userResponse.description, userResponse.impressions, userResponse.shapes, userResponse.colors, userResponse.emotions]
          .filter(Boolean).join('. ');

    if (embeddingService.isAvailable() && userText.length > 0) {
      try {
        return await this._scoreWithEmbeddings(userText, targetText, target);
      } catch (error) {
        console.warn('[TargetSelection] Embedding scoring failed, trying LLM fallback:', error.message);
      }
    }

    // LLM fallback
    return await this._scoreWithLLM(userResponse, target, experimentType);
  }

  /**
   * Embedding-based scoring for remote viewing
   * @private
   */
  async _scoreWithEmbeddings(userText, targetText, target) {
    // Embed target and user response
    const [targetEmb, userEmb] = await embeddingService.getEmbeddings([targetText, userText]);
    const similarity = embeddingService.cosineSimilarity(targetEmb, userEmb);

    // Linear scale: map similarity range [0.15, 0.70] to [0, 100]
    const overallScore = Math.min(100, Math.max(0, Math.round((similarity - 0.15) / 0.55 * 100)));

    // Score individual sentences of user response against target features
    const userSentences = userText.split(/[.!?]+/).filter(s => s.trim().length > 3);
    const targetFeatures = (target.features || []).concat(
      target.description ? [target.description] : []
    );

    const hits = [];
    const misses = [];

    if (targetFeatures.length > 0 && userSentences.length > 0) {
      const featureEmbeddings = await embeddingService.getEmbeddings(targetFeatures);
      const sentenceEmbeddings = await embeddingService.getEmbeddings(userSentences);

      const matchedFeatures = new Set();

      for (let s = 0; s < sentenceEmbeddings.length; s++) {
        let bestFeatureSim = 0;
        let bestFeatureIdx = -1;

        for (let f = 0; f < featureEmbeddings.length; f++) {
          const sim = embeddingService.cosineSimilarity(sentenceEmbeddings[s], featureEmbeddings[f]);
          if (sim > bestFeatureSim) {
            bestFeatureSim = sim;
            bestFeatureIdx = f;
          }
        }

        if (bestFeatureSim >= 0.45 && bestFeatureIdx >= 0) {
          matchedFeatures.add(bestFeatureIdx);
          hits.push({
            element: targetFeatures[bestFeatureIdx],
            confidence: bestFeatureSim >= 0.65 ? 'high' : bestFeatureSim >= 0.55 ? 'medium' : 'low',
            explanation: `Your description "${userSentences[s].trim()}" matches this feature (${(bestFeatureSim * 100).toFixed(0)}% similarity)`,
          });
        }
      }

      // Features not matched are misses
      for (let f = 0; f < targetFeatures.length; f++) {
        if (!matchedFeatures.has(f)) {
          misses.push({
            element: targetFeatures[f],
            importance: 'medium',
            explanation: 'This feature was not detected in your response',
          });
        }
      }
    }

    // Determine accuracy level
    const accuracy = overallScore >= 75 ? 'exceptional' : overallScore >= 55 ? 'good' : overallScore >= 35 ? 'fair' : 'poor';

    // Compute statistics
    const stats = statisticsService.computeEmbeddingStats([similarity], 0.22, 0.06);

    // Try to get optional LLM feedback (non-blocking)
    let feedback = `Your response achieved ${overallScore}% similarity to the target.`;
    let strengths = hits.length > 0 ? [`Matched ${hits.length} target features`] : [];
    let areasForImprovement = misses.length > 0 ? [`${misses.length} features were not captured`] : [];

    try {
      const enrichment = await this._getLLMFeedback(userText, target);
      if (enrichment) {
        feedback = enrichment.feedback || feedback;
        strengths = enrichment.strengths || strengths;
        areasForImprovement = enrichment.areasForImprovement || areasForImprovement;
      }
    } catch {
      // Non-critical, continue without enrichment
    }

    return {
      overallScore,
      accuracy,
      hits,
      misses,
      feedback,
      strengths,
      areasForImprovement,
      statistics: stats,
      scoringMethod: 'embedding',
      rawSimilarity: parseFloat(similarity.toFixed(4)),
      scoredAt: new Date().toISOString(),
      target,
      userResponse: userText,
    };
  }

  /**
   * Build a text description from target for embedding
   * @private
   */
  _buildTargetText(target) {
    const parts = [];
    if (target.name) parts.push(target.name);
    if (target.description) parts.push(target.description);
    if (target.features && Array.isArray(target.features)) {
      parts.push(target.features.join(', '));
    }
    if (target.terrain) parts.push(target.terrain);
    if (target.climate) parts.push(target.climate);
    if (target.colors && Array.isArray(target.colors)) {
      parts.push(`Colors: ${target.colors.join(', ')}`);
    }
    if (target.material) parts.push(target.material);
    if (target.texture) parts.push(target.texture);
    if (target.shape) parts.push(target.shape);
    return parts.join('. ');
  }

  /**
   * Get optional LLM feedback for enrichment (non-scoring)
   * @private
   */
  async _getLLMFeedback(userText, target) {
    try {
      const openai = getClient();
      const prompt = `Provide brief feedback on this remote viewing attempt. Return ONLY valid JSON without markdown code blocks.
Target: ${target.name || target.category} - ${target.description || ''}
User described: ${userText.substring(0, 300)}
Return: { "feedback": "1-2 sentences", "strengths": ["1-2 items"], "areasForImprovement": ["1-2 items"] }`;

      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      });

      return parseJsonResponse(result.choices[0].message.content);
    } catch {
      return null;
    }
  }

  /**
   * LLM-based scoring fallback
   * @private
   */
  async _scoreWithLLM(userResponse, target, experimentType) {
    const prompt = this._buildScoringPrompt(userResponse, target, experimentType);

    const openai = getClient();
    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const scoring = parseJsonResponse(result.choices[0].message.content);

    return {
      ...scoring,
      scoringMethod: 'llm',
      scoredAt: new Date().toISOString(),
      target,
      userResponse,
    };
  }

  /**
   * Build scoring prompt for LLM fallback
   * @private
   */
  _buildScoringPrompt(userResponse, target, experimentType) {
    return `You are an expert remote viewing evaluator. Score objectively based on semantic similarity, not exact matches. Return ONLY valid JSON without markdown code blocks.

Evaluate this remote viewing attempt:

TARGET INFORMATION:
${JSON.stringify(target, null, 2)}

USER'S REMOTE VIEWING RESPONSE:
${JSON.stringify(userResponse, null, 2)}

Return as JSON with structure:
{
  "overallScore": number (0-100),
  "accuracy": "exceptional" | "good" | "fair" | "poor",
  "hits": [{ "element": string, "confidence": string, "explanation": string }],
  "misses": [{ "element": string, "importance": string, "explanation": string }],
  "feedback": string,
  "strengths": [string],
  "areasForImprovement": [string]
}`;
  }
}

module.exports = new TargetSelectionService();
