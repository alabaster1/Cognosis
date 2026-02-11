// Check if backend process has access to .env vars
require('dotenv').config({ path: '../config/.env' }); // Same as server.js
require('dotenv').config(); // Also try local .env

console.log('=== Environment Variables ===');
console.log('UNSPLASH_ACCESS_KEY:', process.env.UNSPLASH_ACCESS_KEY ? `${process.env.UNSPLASH_ACCESS_KEY.substring(0, 10)}...` : '(not set)');
console.log('PEXELS_API_KEY:', process.env.PEXELS_API_KEY ? `${process.env.PEXELS_API_KEY.substring(0, 10)}...` : '(not set)');
console.log('NASA_API_KEY:', process.env.NASA_API_KEY || '(not set)');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : '(not set)');
