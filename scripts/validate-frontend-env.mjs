#!/usr/bin/env node

/**
 * Build-time validation for required public frontend env vars.
 * Keeps production deploys from silently targeting stale endpoints.
 */

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const required = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_AI_URL'];
if (process.env.SKIP_ENV_VALIDATION === '1') {
  console.log('[env-check] Skipped (SKIP_ENV_VALIDATION=1).');
  process.exit(0);
}

const shouldEnforce =
  process.env.VERCEL === '1' || process.env.ENFORCE_ENV_VALIDATION === '1';

if (!shouldEnforce) {
  console.log('[env-check] Skipped (not a Vercel/strict build).');
  process.exit(0);
}
const missing = required.filter((key) => {
  const value = process.env[key];
  return !value || value.trim() === '';
});

if (missing.length > 0) {
  console.error(
    `[env-check] Missing required frontend env vars: ${missing.join(', ')}`
  );
  process.exit(1);
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!isValidUrl(apiUrl)) {
  console.error(
    `[env-check] NEXT_PUBLIC_API_URL must be a valid http(s) URL. Received: ${apiUrl}`
  );
  process.exit(1);
}

const aiUrl = process.env.NEXT_PUBLIC_AI_URL;
if (!isValidUrl(aiUrl)) {
  console.error(
    `[env-check] NEXT_PUBLIC_AI_URL must be a valid http(s) URL. Received: ${aiUrl}`
  );
  process.exit(1);
}

console.log('[env-check] Frontend environment looks valid.');
