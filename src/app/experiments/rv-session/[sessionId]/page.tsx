'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RVStageGuide from '@/components/rv/RVStageGuide';
import { useRVSession } from '@/hooks/useRVSession';
import { useWalletStore } from '@/store/useWalletStore';

export default function RVSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const wallet = useWalletStore((state) => state.wallet);

  const {
    currentStage,
    impressions,
    isLoading,
    error,
    advanceStage,
    completeSession,
    reset
  } = useRVSession();

  const [showResults, setShowResults] = useState(false);
  const [scoring, setScoring] = useState<any>(null);
  const [previousImpressions, setPreviousImpressions] = useState<string>('');
  const [localSessionId, setLocalSessionId] = useState<string>(sessionId);
  const [loadingPhrase, setLoadingPhrase] = useState<string>('Analyzing your impressions...');

  // Require wallet
  useEffect(() => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
  }, [wallet, router]);

  // Initialize session on mount
  useEffect(() => {
    if (sessionId) {
      setLocalSessionId(sessionId);
    }
  }, [sessionId]);

  // Build previous impressions context for AI
  useEffect(() => {
    if (currentStage > 1) {
      const allImpressions = Object.entries(impressions)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n');
      setPreviousImpressions(allImpressions);
    }
  }, [currentStage, impressions]);

  // Rotate loading phrases during AI scoring
  useEffect(() => {
    if (!isLoading) return;

    const phrases = [
      'Analyzing your impressions...',
      'Computing semantic alignment...',
      'Evaluating spatial correlations...',
      'Measuring emotional resonance...',
      'Assessing sensory accuracy...',
      'Calculating symbolic correspondences...',
      'Generating statistical analysis...',
      'Preparing personalized feedback...'
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % phrases.length;
      setLoadingPhrase(phrases[currentIndex]);
    }, 2000); // Change phrase every 2 seconds

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleStageComplete = async (stageImpressions: any) => {
    if (currentStage === 6) {
      // Last stage - complete session
      try {
        // Manually call the webhook with the sessionId from URL
        const allImpressions = {
          ...impressions,
          [`stage_${currentStage}_data`]: stageImpressions
        };

        if (!wallet?.address) {
          throw new Error('Wallet not connected');
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/webhooks/rv/session-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: localSessionId,
            userId: wallet.address,
            impressions: allImpressions
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Session complete error:', response.status, errorText);
          throw new Error(`Failed to complete session: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        setScoring(result.scoring);
        setShowResults(true);
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    } else {
      // Advance to next stage
      advanceStage(stageImpressions);
    }
  };

  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
      reset();
      router.push('/experiments');
    }
  };

  if (showResults && scoring) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Results View */}
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Session Complete
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Here are your results
            </p>
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-r from-cyan-500 to-teal-400 rounded-xl p-8 text-white text-center">
            <div className="text-6xl font-bold mb-2">
              {Math.round(scoring.scores.overall_score * 100)}%
            </div>
            <div className="text-xl">Overall Score</div>
          </div>

          {/* Target Reveal */}
          {scoring.target_data && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3 text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Target Revealed
              </h3>
              <div className="bg-white dark:bg-[#142030] rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                {/* Target Image */}
                {scoring.target_data.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={scoring.target_data.imageUrl}
                      alt="Target image"
                      className="w-full max-h-96 object-contain rounded-lg"
                    />
                    {scoring.target_data.metadata?.photographer && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Photo by {scoring.target_data.metadata.photographer}
                        {scoring.target_data.source && ` • Source: ${scoring.target_data.source}`}
                      </p>
                    )}
                  </div>
                )}

                {/* Description */}
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {scoring.target_data.description}
                </p>

                {/* Tags */}
                {scoring.target_data.tags && scoring.target_data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {scoring.target_data.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200
                                 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-3">
                Compare your impressions above with this target to understand your accuracy
              </p>
            </div>
          )}

          {/* Dimensional Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScoreCard
              title="Spatial Correlation"
              score={scoring.scores.spatial_correlation}
              description="Geometric and structural accuracy"
            />
            <ScoreCard
              title="Semantic Alignment"
              score={scoring.scores.semantic_alignment}
              description="Concept and meaning similarity"
            />
            <ScoreCard
              title="Emotional Resonance"
              score={scoring.scores.emotional_resonance}
              description="Affective tone matching"
            />
            <ScoreCard
              title="Sensory Accuracy"
              score={scoring.scores.sensory_accuracy}
              description="Physical properties accuracy"
            />
            <ScoreCard
              title="Symbolic Correspondence"
              score={scoring.scores.symbolic_correspondence}
              description="Archetypal and metaphoric accuracy"
            />
          </div>

          {/* Statistical Context */}
          {scoring.statistical_context && (
            <div className="bg-gray-100 dark:bg-[#142030] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Statistical Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatItem
                  label="Z-Score"
                  value={scoring.statistical_context.z_score?.toFixed(2) || 'N/A'}
                />
                <StatItem
                  label="Effect Size (Cohen's d)"
                  value={scoring.statistical_context.effect_size?.toFixed(2) || 'N/A'}
                />
                <StatItem
                  label="Percentile"
                  value={`${scoring.statistical_context.percentile || 'N/A'}%`}
                />
                <StatItem
                  label="vs. Chance (20%)"
                  value={`+${Math.round((scoring.scores.overall_score - 0.20) * 100)}%`}
                />
              </div>
            </div>
          )}

          {/* Detailed Analysis */}
          {scoring.detailed_analysis && (
            <div className="bg-white dark:bg-[#142030] rounded-lg p-6 border border-gray-200 dark:border-[#1a2535]">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Detailed Analysis
              </h3>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-slate-300 whitespace-pre-line">
                  {scoring.detailed_analysis}
                </p>
              </div>
            </div>
          )}

          {/* Feedback */}
          {scoring.feedback && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
                Personalized Feedback
              </h3>
              <p className="text-blue-800 dark:text-blue-200 whitespace-pre-line">
                {scoring.feedback}
              </p>
            </div>
          )}

          {/* Recommendations */}
          {scoring.recommendations && scoring.recommendations.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold mb-4 text-green-900 dark:text-green-100">
                Recommendations
              </h3>
              <ul className="space-y-2">
                {scoring.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-green-800 dark:text-green-200">
                    <span className="text-green-600 dark:text-green-400 mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/experiments')}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg
                       font-medium transition-colors shadow-lg hover:shadow-xl"
            >
              Back to Experiments
            </button>
            <button
              onClick={() => {
                reset();
                router.push(`/experiments/rv-session/${Date.now()}`);
              }}
              className="flex-1 py-3 bg-gray-600 hover:bg-[#1a2535] text-white rounded-lg
                       font-medium transition-colors"
            >
              Start New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1520]">
      {/* Header */}
      <div className="bg-white dark:bg-[#142030] border-b border-gray-200 dark:border-[#1a2535]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Remote Viewing Session
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              CRV Protocol • Stage {currentStage} of 6
            </p>
          </div>
          <button
            onClick={handleExit}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white
                     border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
          >
            Exit Session
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-[#142030] border-b border-gray-200 dark:border-[#1a2535]">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((stage) => (
              <div
                key={stage}
                className={`flex-1 h-2 rounded-full transition-all ${
                  stage < currentStage
                    ? 'bg-green-500'
                    : stage === currentStage
                    ? 'bg-cyan-500'
                    : 'bg-gray-200 dark:bg-[#1a2535]'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
            <span>Ideogram</span>
            <span>Sensory</span>
            <span>Dimensional</span>
            <span>Aesthetic</span>
            <span>Analytical</span>
            <span>3D Model</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-900 dark:text-red-100">
              Error: {error}
            </p>
          </div>
        </div>
      )}

      {/* Stage Guide */}
      <div className="py-8">
        <RVStageGuide
          sessionId={localSessionId}
          stage={currentStage}
          previousImpressions={previousImpressions}
          onComplete={handleStageComplete}
        />
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#060a0f] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#142030] rounded-lg p-8 flex flex-col items-center gap-4 max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            <p className="text-gray-900 dark:text-white font-medium text-center">
              {loadingPhrase}
            </p>
            {currentStage === 6 && (
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                AI is analyzing your session against the committed target
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

function ScoreCard({ title, score, description }: { title: string; score: number; description: string }) {
  const percentage = Math.round(score * 100);
  const color = percentage >= 70 ? 'green' : percentage >= 50 ? 'yellow' : 'gray';

  return (
    <div className="bg-white dark:bg-[#142030] rounded-lg p-6 border border-gray-200 dark:border-[#1a2535]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
        <span className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-[#1a2535] rounded-full h-2 mb-2">
        <div
          className={`bg-${color}-500 h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
