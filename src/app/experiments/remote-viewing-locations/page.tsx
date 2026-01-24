// @ts-nocheck
'use client';

/**
 * Remote Viewing Locations - AI-Powered Target Selection
 * Structured location viewing with terrain, climate, and feature identification
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { MapPin, Timer, CheckCircle, XCircle, Loader2, Target, ArrowRight } from 'lucide-react';
import RevealModal, { ResultCard, StatsSummary } from '@/components/modals/RevealModal';

type Phase = 'intro' | 'meditation' | 'terrain' | 'environment' | 'features' | 'description' | 'results';

interface LocationData {
  terrain: string;
  climate: string;
  population: string;
  timePeriod: string;
  features: string[];
  description: string;
}

interface ScoringResult {
  target: Record<string, unknown>;
  score: number;
  accuracy: string;
  hits: Array<{ element: string; confidence: string; explanation: string }>;
  misses: Array<{ element: string; importance: string; explanation: string }>;
  feedback: string;
}

const TERRAIN_TYPES = [
  { id: 'mountains', label: 'Mountains', icon: '⛰️' },
  { id: 'desert', label: 'Desert', icon: '🏜️' },
  { id: 'forest', label: 'Forest', icon: '🌲' },
  { id: 'coast', label: 'Coastal', icon: '🏖️' },
  { id: 'urban', label: 'Urban', icon: '🏙️' },
  { id: 'plains', label: 'Plains', icon: '🌾' },
  { id: 'water', label: 'Water Body', icon: '🌊' },
  { id: 'arctic', label: 'Arctic', icon: '❄️' },
];

const CLIMATE_OPTIONS = ['Tropical', 'Arid', 'Temperate', 'Cold', 'Arctic', 'Mediterranean'];
const POPULATION_OPTIONS = ['Uninhabited', 'Sparse', 'Small Settlement', 'Town/City', 'Dense Urban'];
const TIME_PERIOD_OPTIONS = ['Ancient', 'Medieval', 'Early Modern', 'Modern', 'Contemporary'];
const FEATURE_OPTIONS = [
  'Buildings/Structures',
  'Water Features',
  'Vegetation',
  'Roads/Paths',
  'Animals/Wildlife',
  'People',
  'Natural Landmarks',
  'Artificial Landmarks',
];

export default function RemoteViewingLocationsPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [phase, setPhase] = useState<Phase>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ScoringResult | null>(null);

  const [locationData, setLocationData] = useState<LocationData>({
    terrain: '',
    climate: '',
    population: '',
    timePeriod: '',
    features: [],
    description: '',
  });

  const startExperiment = async () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }

    setIsLoading(true);
    setError('');
    setPhase('meditation');

    try {
      const result = await experimentService.generateRemoteViewingTarget({
        experimentType: 'remote-viewing-locations',
        verified: (wallet as any).isVerified ?? true,
      });

      setCommitmentId(result.commitmentId);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Generate target error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setIsLoading(false);
      setPhase('intro');
    }
  };

  const toggleFeature = (feature: string) => {
    setLocationData({
      ...locationData,
      features: locationData.features.includes(feature)
        ? locationData.features.filter((f) => f !== feature)
        : [...locationData.features, feature],
    });
  };

  const submitResponse = async () => {
    setIsLoading(true);
    setError('');

    try {
      const scoringResult = await experimentService.revealRemoteViewing({
        commitmentId,
        userResponse: locationData as any,
        verified: (wallet as any)?.isVerified ?? true,
      });

      setResults(scoringResult as any);
      setPhase('results');
    } catch (err: unknown) {
      console.error('Reveal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reveal and score experiment');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Location Viewing</h1>
                  <p className="text-slate-400">Identify terrain, climate, and features of hidden locations</p>
                </div>
              </div>

              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
                <h2 className="text-2xl font-bold mb-4">Structured Protocol</h2>
                <p className="text-slate-400 mb-4">
                  This experiment uses a structured approach to remote viewing, breaking down the location into specific attributes.
                </p>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">1</span>
                    <span>Meditation: AI commits random location target</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">2</span>
                    <span>Terrain: Identify the primary terrain type</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">3</span>
                    <span>Environment: Sense climate, population, time period</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">4</span>
                    <span>Features: Identify specific elements present</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">5</span>
                    <span>Description: Write detailed impressions</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={startExperiment}
                className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center gap-2"
              >
                Begin Experiment
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {phase === 'meditation' && (
            <motion.div
              key="meditation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-8 ${isLoading ? 'animate-pulse' : ''}`}>
                <Target className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-3xl font-bold mb-4">Meditation Phase</h2>

              {isLoading ? (
                <>
                  <p className="text-slate-400 mb-8">
                    AI is randomly selecting a location and committing it to blockchain...
                  </p>

                  <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                      <span className="text-green-400 font-medium">Preparing target...</span>
                    </div>

                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-slate-400">Generating random location</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-slate-400">Encrypting location data</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-slate-400">Committing to blockchain</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-400 mb-8">
                    The location has been securely committed to the blockchain. Take as much time as you need to center yourself and prepare for the viewing session.
                  </p>

                  <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                    <h3 className="font-semibold mb-4 text-green-400">Meditation Guidelines</h3>
                    <div className="space-y-3 text-left text-slate-300">
                      <p>• Find a quiet, comfortable space</p>
                      <p>• Take deep, slow breaths to relax your mind</p>
                      <p>• Clear your thoughts of distractions</p>
                      <p>• Focus on openness and receptivity</p>
                      <p>• When ready, begin your remote viewing session</p>
                    </div>
                  </div>

                  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-8">
                    <p className="text-sm text-green-300">
                      <strong>✓ Location Committed:</strong> The target is locked in and cannot be changed. Take your time - there's no rush.
                    </p>
                  </div>

                  <button
                    onClick={() => setPhase('terrain')}
                    className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center gap-2"
                  >
                    I&apos;m Ready - Begin Viewing
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </motion.div>
          )}

          {phase === 'terrain' && (
            <motion.div
              key="terrain"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold mb-4">Step 1: Terrain Type</h2>
              <p className="text-slate-400 mb-8">What type of terrain do you sense?</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {TERRAIN_TYPES.map((terrain) => (
                  <button
                    key={terrain.id}
                    onClick={() => setLocationData({ ...locationData, terrain: terrain.id })}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      locationData.terrain === terrain.id
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-[#1a2535] hover:border-green-500/50'
                    }`}
                  >
                    <div className="text-4xl mb-2">{terrain.icon}</div>
                    <div className="font-medium">{terrain.label}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPhase('environment')}
                disabled={!locationData.terrain}
                className="w-full px-6 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </motion.div>
          )}

          {phase === 'environment' && (
            <motion.div
              key="environment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold mb-4">Step 2: Environment</h2>
              <p className="text-slate-400 mb-8">Sense the environmental characteristics</p>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-3">Climate</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CLIMATE_OPTIONS.map((climate) => (
                      <button
                        key={climate}
                        onClick={() => setLocationData({ ...locationData, climate })}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          locationData.climate === climate
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-[#1a2535] hover:border-green-500/50'
                        }`}
                      >
                        {climate}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Population Density</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {POPULATION_OPTIONS.map((pop) => (
                      <button
                        key={pop}
                        onClick={() => setLocationData({ ...locationData, population: pop })}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          locationData.population === pop
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-[#1a2535] hover:border-green-500/50'
                        }`}
                      >
                        {pop}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Time Period</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {TIME_PERIOD_OPTIONS.map((period) => (
                      <button
                        key={period}
                        onClick={() => setLocationData({ ...locationData, timePeriod: period })}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          locationData.timePeriod === period
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-[#1a2535] hover:border-green-500/50'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setPhase('terrain')}
                  className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-green-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setPhase('features')}
                  disabled={!locationData.climate || !locationData.population || !locationData.timePeriod}
                  className="flex-1 px-6 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold mb-4">Step 3: Features</h2>
              <p className="text-slate-400 mb-8">Select all features you perceive (multiple selections allowed)</p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {FEATURE_OPTIONS.map((feature) => (
                  <button
                    key={feature}
                    onClick={() => toggleFeature(feature)}
                    className={`px-4 py-3 rounded-lg border transition-all text-left ${
                      locationData.features.includes(feature)
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-[#1a2535] hover:border-green-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {locationData.features.includes(feature) && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {feature}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setPhase('environment')}
                  className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-green-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setPhase('description')}
                  className="flex-1 px-6 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'description' && (
            <motion.div
              key="description"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold mb-4">Step 4: Detailed Description</h2>
              <p className="text-slate-400 mb-8">Write any additional impressions or details</p>

              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                  {error}
                </div>
              )}

              <textarea
                value={locationData.description}
                onChange={(e) => setLocationData({ ...locationData, description: e.target.value })}
                placeholder="Describe colors, textures, sounds, feelings, or any other impressions..."
                rows={10}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-green-500 focus:outline-none resize-none mb-8"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setPhase('features')}
                  className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-green-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={submitResponse}
                  disabled={isLoading}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Revealing & Scoring...
                    </>
                  ) : (
                    <>
                      Submit & Reveal
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <RevealModal
        isOpen={phase === 'results' && results !== null}
        onClose={() => router.push('/experiments')}
        onConfirm={() => window.location.reload()}
        title="Location Viewing Complete!"
        experimentType="Location Remote Viewing"
        confirmText="Try Again"
        showVerification={true}
        verificationData={{
          commitmentId,
          timestamp: new Date().toISOString()
        }}
      >
        {results && (
          <div className="space-y-6">
            <StatsSummary
              stats={[
                {
                  label: 'Overall Score',
                  value: `${results.score}/100`
                },
                {
                  label: 'Accuracy',
                  value: results.accuracy
                },
                {
                  label: 'Hits',
                  value: `${results.hits?.length || 0}`
                },
                {
                  label: 'Misses',
                  value: `${results.misses?.length || 0}`
                }
              ]}
            />

            {/* Target Reveal */}
            <ResultCard title="The Location" icon={<Target className="w-5 h-5" />} {...({variant: "info", children: (
              <div className="bg-[#060a0f]/30 rounded-lg p-4 font-mono text-sm">
                <pre className="text-slate-300 whitespace-pre-wrap">
                  {JSON.stringify(results.target, null, 2)}
                </pre>
              </div>
            )} as any)}
            />

            {/* Hits */}
            {results.hits && results.hits.length > 0 && (
              <ResultCard
                title={`Hits (${results.hits.length})`}
                icon={<CheckCircle className="w-5 h-5" />}
                variant="success"
              >
                <div className="space-y-3">
                  {results.hits.map((hit, idx) => (
                    <div key={idx} className="bg-[#060a0f]/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-green-300">{hit.element}</span>
                        <span className="text-xs px-2 py-1 bg-green-500/20 rounded text-green-400">
                          {hit.confidence}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{hit.explanation}</p>
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {/* Misses */}
            {results.misses && results.misses.length > 0 && (
              <ResultCard
                title={`Misses (${results.misses.length})`}
                icon={<XCircle className="w-5 h-5" />}
                variant="error"
              >
                <div className="space-y-3">
                  {results.misses.map((miss, idx) => (
                    <div key={idx} className="bg-[#060a0f]/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-red-300">{miss.element}</span>
                        <span className="text-xs px-2 py-1 bg-red-500/20 rounded text-red-400">
                          {miss.importance}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{miss.explanation}</p>
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {/* AI Feedback */}
            <ResultCard title="AI Feedback" variant="info">
              <p className="text-slate-300 leading-relaxed">{results.feedback}</p>
            </ResultCard>
          </div>
        )}
      </RevealModal>
    </div>
  );
}
