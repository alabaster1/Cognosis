/**
 * Environment Data Service
 * Fetches geomagnetic, lunar, and environmental data for survey calibration
 */

/**
 * Get current geomagnetic field index from NOAA
 * Kp index: 0-9 scale measuring geomagnetic activity
 * Research shows correlation between geomagnetic storms and psi performance (Persinger, Spottiswoode)
 */
async function getGeomagneticIndex() {
  try {
    // NOAA SWPC API - real-time geomagnetic data
    const response = await fetch('https://services.swpc.noaa.gov/products/noaa-estimated-planetary-k-index-1-minute.json');

    if (!response.ok) {
      console.warn('[EnvService] NOAA API unavailable, using default');
      return null;
    }

    const data = await response.json();

    // Data format: [[timestamp, Kp, ...], ...]
    // Get most recent Kp value
    if (data.length > 1) {
      const latest = data[data.length - 1];
      const kpIndex = parseFloat(latest[1]);

      console.log(`[EnvService] Geomagnetic Kp index: ${kpIndex}`);
      return kpIndex;
    }

    return null;
  } catch (error) {
    console.error('[EnvService] Error fetching geomagnetic data:', error.message);
    return null;
  }
}

/**
 * Get current lunar phase
 * Returns phase name and illumination percentage
 */
function getLunarPhase() {
  try {
    const now = new Date();

    // Known new moon: January 6, 2000, 18:14 UTC
    const knownNewMoon = new Date('2000-01-06T18:14:00Z');
    const lunarCycle = 29.53059; // days

    // Calculate days since known new moon
    const daysSinceNewMoon = (now - knownNewMoon) / (1000 * 60 * 60 * 24);

    // Calculate current phase (0-29.53 days)
    const currentPhase = daysSinceNewMoon % lunarCycle;

    // Determine phase name
    let phaseName;
    let illumination;

    if (currentPhase < 1.84566) {
      phaseName = 'New Moon';
      illumination = 0;
    } else if (currentPhase < 7.38264) {
      phaseName = 'Waxing Crescent';
      illumination = Math.round((currentPhase / 7.38264) * 50);
    } else if (currentPhase < 9.22830) {
      phaseName = 'First Quarter';
      illumination = 50;
    } else if (currentPhase < 14.76529) {
      phaseName = 'Waxing Gibbous';
      illumination = Math.round(50 + ((currentPhase - 9.22830) / 5.53699) * 50);
    } else if (currentPhase < 16.61095) {
      phaseName = 'Full Moon';
      illumination = 100;
    } else if (currentPhase < 22.14794) {
      phaseName = 'Waning Gibbous';
      illumination = Math.round(100 - ((currentPhase - 16.61095) / 5.53699) * 50);
    } else if (currentPhase < 23.99360) {
      phaseName = 'Last Quarter';
      illumination = 50;
    } else {
      phaseName = 'Waning Crescent';
      illumination = Math.round(50 - ((currentPhase - 23.99360) / 5.53699) * 50);
    }

    console.log(`[EnvService] Lunar phase: ${phaseName} (${illumination}% illuminated)`);

    return {
      phase: phaseName,
      illumination,
      daysSinceNew: currentPhase
    };
  } catch (error) {
    console.error('[EnvService] Error calculating lunar phase:', error.message);
    return null;
  }
}

/**
 * Get comprehensive environment data for survey
 */
async function getEnvironmentData() {
  const [geomagneticIndex, lunarData] = await Promise.all([
    getGeomagneticIndex(),
    Promise.resolve(getLunarPhase())
  ]);

  return {
    geomagneticIndex,
    lunarPhase: lunarData?.phase || null,
    lunarIllumination: lunarData?.illumination || null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get timezone from location or auto-detect
 */
function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('[EnvService] Error detecting timezone:', error.message);
    return 'UTC';
  }
}

module.exports = {
  getGeomagneticIndex,
  getLunarPhase,
  getEnvironmentData,
  getTimezone
};
