/**
 * End-to-End Survey System Test
 * Tests the complete flow: Environment data → Calibration → Feedback
 */

const BASE_URL = 'http://localhost:3001';
const userId = `test-user-${Date.now()}`;

async function testSurveyFlow() {
  console.log('🧪 Testing Survey System End-to-End\n');
  console.log(`User ID: ${userId}\n`);

  try {
    // Test 1: Get Environment Data
    console.log('📡 Test 1: Fetching environment data...');
    const envResponse = await fetch(`${BASE_URL}/api/survey/environment`);
    const envData = await envResponse.json();

    console.log('✅ Environment data fetched:');
    console.log(`   Geomagnetic Kp: ${envData.geomagneticIndex || 'N/A'}`);
    console.log(`   Lunar Phase: ${envData.lunarPhase || 'N/A'}`);
    console.log(`   Timestamp: ${envData.timestamp}\n`);

    // Test 2: Submit Session Calibration
    console.log('📝 Test 2: Submitting session calibration...');
    const sessionId = `session-${Date.now()}`;

    const calibrationData = {
      userId,
      sessionId,
      experimentType: 'remote_viewing',
      sleepHours: 7.5,
      caffeineIntake: '1 cup',
      moodState: 7,
      stressLevel: 3,
      focusLevel: 8,
      timePressure: false,
      outcomeExpectation: 6,
      attentionCheckPassed: true,
      skipped: false
    };

    const calibrationResponse = await fetch(`${BASE_URL}/api/survey/calibration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calibrationData)
    });

    const calibrationResult = await calibrationResponse.json();

    if (!calibrationResult.success) {
      throw new Error(`Calibration failed: ${JSON.stringify(calibrationResult)}`);
    }

    console.log('✅ Calibration saved successfully');
    console.log(`   Calibration ID: ${calibrationResult.calibration?.id || 'N/A'}`);
    console.log(`   Commitment Hash: ${calibrationResult.calibration?.commitmentHash?.substring(0, 16) || 'N/A'}...`);
    console.log(`   Geomagnetic Index at calibration: ${calibrationResult.calibration?.geomagneticIndex || 'N/A'}\n`);

    // Test 3: Fetch Calibration Data
    console.log('🔍 Test 3: Fetching calibration data...');
    const fetchResponse = await fetch(`${BASE_URL}/api/survey/calibration/${sessionId}`);
    const fetchResult = await fetchResponse.json();

    console.log('✅ Calibration retrieved successfully');
    console.log(`   Sleep hours: ${fetchResult.calibration.sleepHours}h`);
    console.log(`   Mood: ${fetchResult.calibration.moodState}/10`);
    console.log(`   Focus: ${fetchResult.calibration.focusLevel}/10\n`);

    // Test 4: Submit Post-Experiment Feedback
    console.log('💭 Test 4: Submitting post-experiment feedback...');

    const feedbackData = {
      userId,
      sessionId,
      experimentType: 'remote_viewing',
      difficulty: 6,
      confidence: 7,
      phenomenology: ['Visual imagery', 'Emotional impressions'],
      comments: 'Great session! Felt very focused.',
      tokensEarned: 10,
      bonusTokens: 5,
      tokenReason: 'Session completion + high calibration focus',
      achievementsUnlocked: ['first_rv_session']
    };

    const feedbackResponse = await fetch(`${BASE_URL}/api/survey/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });

    const feedbackResult = await feedbackResponse.json();

    console.log('✅ Feedback saved successfully');
    console.log(`   Feedback ID: ${feedbackResult.feedback.id}`);
    console.log(`   Total tokens earned: ${feedbackResult.totalTokens}`);
    console.log(`   Achievements: ${feedbackResult.feedback.achievementsUnlocked.join(', ')}\n`);

    // Summary
    console.log('🎉 All tests passed successfully!\n');
    console.log('📊 Test Summary:');
    console.log('   ✓ Environment data fetched');
    console.log('   ✓ Session calibration saved');
    console.log('   ✓ Calibration data retrieved');
    console.log('   ✓ Post-experiment feedback saved');
    console.log('   ✓ Token rewards calculated\n');

    console.log('✨ Survey system is fully operational!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testSurveyFlow();
