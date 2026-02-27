/**
 * MVP RV scoring reliability tests.
 *
 * Verifies scoring chain behavior:
 * 1) AI service happy path (`psi-score-ai`)
 * 2) AI service unavailable fallback (`deterministic-fallback`)
 */

jest.mock('axios', () => ({
  post: jest.fn(),
}));

const axios = require('axios');
const predictionScoringService = require('../services/predictionScoringService');

describe('MVP Remote Viewing scoring chain', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns psi-score-ai result when AI service responds', async () => {
    const impressions = {
      impressions: 'I sense warm lights, circular forms, and food preparation.',
    };
    const targetData = {
      description: 'Hands turning takoyaki balls on a hot grill',
      tags: ['food', 'hands', 'cooking', 'round'],
    };

    axios.post.mockResolvedValueOnce({
      data: {
        scores: {
          spatial_correlation: 0.61,
          semantic_alignment: 0.74,
          emotional_resonance: 0.58,
          sensory_accuracy: 0.66,
          symbolic_correspondence: 0.49,
          overall_score: 0.67,
        },
        statistical_context: { chance_baseline: 0.2, z_score: 3.13 },
        detailed_analysis: 'Strong semantic and sensory overlap with food preparation context.',
        correspondences: ['round forms', 'heat', 'hands in motion'],
        mismatches: ['water imagery'],
        scorer_version: '1.1.0',
        duration_ms: 412,
      },
    });

    const result = await predictionScoringService.scoreRemoteViewing(
      'session-happy-path',
      impressions,
      targetData,
      'target-hash-1'
    );

    expect(result.scoringMethod).toBe('psi-score-ai');
    expect(result.score).toBe(67);
    expect(result.details.scores.overall_score).toBe(0.67);
    expect(result.details.scorerVersion).toBe('1.1.0');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  test('falls back to deterministic scoring when AI service and OpenAI fallback are unavailable', async () => {
    const impressions = {
      impressions: 'Bright lights, food, grill, hands, street market energy.',
    };
    const targetData = {
      description: 'Street food stand preparing takoyaki on a hot grill',
      tags: ['food', 'grill', 'street', 'hands'],
    };

    axios.post.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:8001'));

    jest
      .spyOn(predictionScoringService, 'scoreRemoteViewingWithOpenAI')
      .mockRejectedValueOnce(new Error('OPENAI_API_KEY environment variable is required'));

    const result = await predictionScoringService.scoreRemoteViewing(
      'session-fallback-path',
      impressions,
      targetData,
      'target-hash-2'
    );

    expect(result.scoringMethod).toBe('deterministic-fallback');
    expect(result.score).toBeGreaterThanOrEqual(35);
    expect(result.score).toBeLessThanOrEqual(85);
    expect(result.details.scorerVersion).toBe('fallback-basic-v1');
    expect(Array.isArray(result.details.correspondences)).toBe(true);
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
