// @ts-nocheck
'use client';

/**
 * Remote Viewing Experiment - AI-Powered Target Selection
 * Flow: Intro → Meditation (AI commits target) → Viewing → Results (AI scores)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Eye, Lock, Loader2, Target, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

type Step = 'intro' | 'meditation' | 'viewing' | 'results';

interface ScoringResult {
  target: Record<string, unknown>;
  score: number;
  accuracy: string;
  hits: Array<{ element: string; confidence: string; explanation: string }>;
  misses: Array<{ element: string; importance: string; explanation: string }>;
  feedback: string;
  strengths?: string[];
  areasForImprovement?: string[];
  statistics?: {
    zScore: number;
    pValue: number;
    significance: string;
    observedMean: number;
    baselineMean: number;
    effectSize: number;
  };
  scoringMethod?: string;
  drandRound?: number;
  randomnessSource?: string;
}

export default function RemoteViewingPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [step, setStep] = useState<Step>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [description, setDescription] = useState('');
  const [impressions, setImpressions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ScoringResult | null>(null);

  const handleStartExperiment = async () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('meditation');

    try {
      // AI generates and commits random target during meditation phase
      const result = await experimentService.generateRemoteViewingTarget({
        experimentType: 'remote-viewing',
        verified: wallet.isVerified,
      });

      setCommitmentId(result.commitmentId);
      console.log('[RV] Target committed:', result.commitmentId);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Generate target error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setIsLoading(false);
      setStep('intro');
    }
  };

  const handleBeginViewing = () => {
    setStep('viewing');
  };

  const handleSubmitViewing = async () => {
    if (!description.trim() && !impressions.trim()) {
      setError('Please provide your remote viewing impressions');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Submit user response and get AI scoring
      const userResponse = {
        description: description.trim(),
        impressions: impressions.trim(),
        timestamp: new Date().toISOString(),
      };

      const scoringResult = await experimentService.revealRemoteViewing({
        commitmentId,
        userResponse,
        verified: wallet?.isVerified || false,
      });

      setResults(scoringResult);
      setStep('results');
    } catch (err: unknown) {
      console.error('Reveal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reveal and score experiment');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-400 flex items-center justify-center">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Remote Viewing</h1>
                <p className="text-slate-400">Perceive hidden targets with your mind</p>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Meditation Phase</strong>
                    <p className="text-slate-400 text-sm">
                      AI randomly selects a target and commits it to blockchain (hidden from you)
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Remote Viewing</strong>
                    <p className="text-slate-400 text-sm">
                      Record your psychic impressions about the hidden target
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>AI Scoring</strong>
                    <p className="text-slate-400 text-sm">
                      Target is revealed and AI compares your impressions to the actual target
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-300">
                <strong>🔒 Cryptographic Fairness:</strong> The target is selected and committed to IPFS/Midnight before you begin. This ensures the experiment cannot be manipulated.
              </p>
            </div>

            <button
              onClick={handleStartExperiment}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2"
            >
              Begin Experiment
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'meditation') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-teal-400 flex items-center justify-center mx-auto mb-8 ${isLoading ? 'animate-pulse' : ''}`}>
              <Target className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold mb-4">Meditation Phase</h2>

            {isLoading ? (
              <>
                <p className="text-slate-400 mb-8">
                  AI is randomly selecting a target and committing it to blockchain...
                </p>

                <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    <span className="text-cyan-400 font-medium">Preparing target...</span>
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-slate-400">Generating random target</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-slate-400">Encrypting target data</span>
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
                  The target has been securely committed to the blockchain. Take as much time as you need to center yourself and prepare for the viewing session.
                </p>

                <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                  <h3 className="font-semibold mb-4 text-cyan-400">Meditation Guidelines</h3>
                  <div className="space-y-3 text-left text-slate-300">
                    <p>• Find a quiet, comfortable space</p>
                    <p>• Take deep, slow breaths to relax your mind</p>
                    <p>• Clear your thoughts of distractions</p>
                    <p>• Focus on openness and receptivity</p>
                    <p>• When ready, begin your remote viewing session</p>
                  </div>
                </div>

                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-8">
                  <p className="text-sm text-cyan-300">
                    <strong>✓ Target Committed:</strong> The target is locked in and cannot be changed. Take your time - there's no rush.
                  </p>
                </div>

                <button
                  onClick={handleBeginViewing}
                  className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2"
                >
                  I&apos;m Ready - Begin Viewing
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'viewing') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Remote Viewing Session</h2>
            <p className="text-slate-400 mb-8">
              Focus your mind and record any impressions, images, feelings, or thoughts that come to you.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Visual Impressions
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What do you see? Shapes, colors, structures, landscapes..."
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Other Sensory Impressions
                </label>
                <textarea
                  value={impressions}
                  onChange={(e) => setImpressions(e.target.value)}
                  placeholder="Feelings, textures, sounds, temperatures, emotional tones..."
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-cyan-400">Fair Scoring Guaranteed</strong>
                <p className="text-slate-400 mt-1">
                  The target was committed to blockchain before you started. Your response will be compared against the pre-committed target.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitViewing}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Revealing & Scoring...
                </>
              ) : (
                <>
                  Submit & Reveal Target
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results' && results) {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-8">
              <div className={`w-24 h-24 rounded-full ${results.score >= 70 ? 'bg-gradient-to-br from-green-500 to-emerald-500' : results.score >= 40 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-gradient-to-br from-red-500 to-pink-500'} flex items-center justify-center mx-auto mb-6`}>
                <span className="text-3xl font-bold text-white">{results.score}</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Results</h2>
              <p className="text-xl text-slate-400 capitalize">Accuracy: {results.accuracy}</p>
            </div>

            {/* Target Reveal */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-cyan-400" />
                The Target
              </h3>
              <div className="bg-[#060a0f]/50 rounded-lg p-6">
                <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">
                  {JSON.stringify(results.target, null, 2)}
                </pre>
              </div>
            </div>

            {/* Hits */}
            {results.hits && results.hits.length > 0 && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-6 h-6" />
                  Hits ({results.hits.length})
                </h3>
                <div className="space-y-4">
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
              </div>
            )}

            {/* Misses */}
            {results.misses && results.misses.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-400">
                  <XCircle className="w-6 h-6" />
                  Misses ({results.misses.length})
                </h3>
                <div className="space-y-4">
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
              </div>
            )}

            {/* Feedback */}
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-4">AI Feedback</h3>
              <p className="text-slate-300 leading-relaxed">{results.feedback}</p>
            </div>

            {/* Statistics */}
            {results.statistics && (
              <div className="bg-purple-900/20 border border-purple-500/50 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4">Statistical Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-slate-400">Z-Score</span>
                    <p className="font-bold text-xl">{results.statistics.zScore}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">P-Value</span>
                    <p className="font-bold text-xl">{results.statistics.pValue < 0.001 ? '< 0.001' : results.statistics.pValue.toFixed(4)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Effect Size</span>
                    <p className="font-bold text-xl">{results.statistics.effectSize}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Significance</span>
                    <p className={`font-bold text-xl ${
                      results.statistics.significance.includes('significant') && !results.statistics.significance.includes('not') ? 'text-green-400' : 'text-slate-400'
                    }`}>
                      {results.statistics.significance.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Scoring: {results.scoringMethod === 'embedding' ? 'Semantic Embedding' : 'LLM-based'}
                </p>
              </div>
            )}

            {/* drand Verification Badge */}
            {results.drandRound && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-4 mb-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 text-lg">&#10003;</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-300">Verifiable Randomness</p>
                  <p className="text-xs text-green-500">drand round #{results.drandRound} | {results.randomnessSource || 'drand_quicknet'}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-cyan-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-cyan-600 rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
