'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/walletStore';
import { Brain, Sparkles, Timer, CheckCircle2, Loader2 } from 'lucide-react';

type Phase = 'intro' | 'meditation' | 'guessing' | 'results' | 'success';
type WarmthLevel = 'burning' | 'veryWarm' | 'warm' | 'lukewarm' | 'cool' | 'cold';

const WARMTH_LEVELS: { level: WarmthLevel; label: string; color: string }[] = [
  { level: 'burning', label: 'Burning Hot', color: 'text-red-500' },
  { level: 'veryWarm', label: 'Very Warm', color: 'text-orange-500' },
  { level: 'warm', label: 'Warm', color: 'text-yellow-500' },
  { level: 'lukewarm', label: 'Lukewarm', color: 'text-yellow-300' },
  { level: 'cool', label: 'Cool', color: 'text-blue-300' },
  { level: 'cold', label: 'Cold', color: 'text-blue-500' },
];

const TOTAL_ROUNDS = 3;
const GUESSES_PER_ROUND = 5;

export default function AITelepathyPage() {
  const wallet = useWalletStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentRound, setCurrentRound] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [roundGuesses, setRoundGuesses] = useState<string[]>([]);
  const [allGuesses, setAllGuesses] = useState<string[][]>([]);
  const [commitmentId, setCommitmentId] = useState('');
  const [nonce, setNonce] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [drandRound, setDrandRound] = useState<number | null>(null);
  const [randomnessSource, setRandomnessSource] = useState<string | null>(null);
  const [results, setResults] = useState<{
    success: boolean;
    rounds: Array<{
      round: number;
      target: string;
      category: string;
      imagery?: string;
      guesses: Array<{ guess: string; warmth: string; similarity?: number }>;
      bestGuess: string;
      bestWarmth: string;
      bestSimilarity?: number;
    }>;
    averageWarmth: string;
    accuracy: string;
    performance: string;
    targets: Array<{ concept: string; category: string; imagery?: string }>;
    statistics?: {
      zScore: number;
      pValue: number;
      significance: string;
      observedMean: number;
      baselineMean: number;
      effectSize: number;
      scoringMethod: string;
    };
    scoringMethod?: string;
    drandRound?: number;
    randomnessSource?: string;
  } | null>(null);

  // Generate backend target and store commitmentId/nonce
  const startMeditation = async () => {
    setPhase('meditation');
    setIsLoading(true);
    setError('');

    try {
      const result = await apiService.generateTelepathyTarget({
        rounds: TOTAL_ROUNDS,
        verified: (wallet as any).isVerified ?? true,
      });

      setCommitmentId(result.commitmentId);
      setNonce(result.nonce);
      if (result.drandRound) setDrandRound(result.drandRound);
      if (result.randomnessSource) setRandomnessSource(result.randomnessSource);

      // Store nonce in localStorage for reveal
      localStorage.setItem(`telepathy_nonce_${result.commitmentId}`, result.nonce);

      console.log('[Telepathy] Target generated:', result.commitmentId);
      setIsLoading(false);
    } catch (err) {
      console.error('[Telepathy] Generation error:', err);
      setError('Failed to generate target. Please try again.');
      setIsLoading(false);
      setPhase('intro');
    }
  };

  const startGuessing = () => {
    setRoundGuesses([]);
    setAllGuesses([]);
    setCurrentRound(0);
    setPhase('guessing');
  };

  const submitGuess = () => {
    if (!currentGuess.trim()) return;

    const updatedGuesses = [...roundGuesses, currentGuess];
    setRoundGuesses(updatedGuesses);
    setCurrentGuess('');

    if (updatedGuesses.length >= GUESSES_PER_ROUND) {
      // Round complete
      const updatedAllGuesses = [...allGuesses, updatedGuesses];
      setAllGuesses(updatedAllGuesses);

      if (currentRound + 1 >= TOTAL_ROUNDS) {
        // All rounds complete - reveal and score
        revealAndScore(updatedAllGuesses);
      } else {
        // Next round
        setCurrentRound(currentRound + 1);
        setRoundGuesses([]);
      }
    }
  };

  const revealAndScore = async (finalGuesses: string[][]) => {
    setPhase('results');
    setIsLoading(true);

    try {
      const result = await apiService.revealTelepathy({
        commitmentId,
        guesses: finalGuesses,
        nonce,
        verified: (wallet as any).isVerified ?? true,
      });

      setResults(result);
      setIsLoading(false);
      setTimeout(() => setPhase('success'), 2000);
    } catch (err) {
      console.error('[Telepathy] Reveal error:', err);
      setError('Failed to reveal and score. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              {/* Neural network background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 400">
                  {[...Array(8)].map((_, i) => (
                    <motion.circle
                      key={i}
                      cx={50 + (i % 4) * 100}
                      cy={80 + Math.floor(i / 4) * 200}
                      fill="#22d3ee"
                      initial={{ opacity: 0.3, r: 3 }}
                      animate={{ opacity: [0.3, 1, 0.3], r: [2, 4, 2] }}
                      transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                    />
                  ))}
                  {[...Array(6)].map((_, i) => (
                    <motion.line
                      key={`l${i}`}
                      x1={50 + (i % 3) * 100}
                      y1={80}
                      x2={100 + (i % 2) * 200}
                      y2={280}
                      stroke="#22d3ee"
                      strokeWidth="0.5"
                      animate={{ opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
                    />
                  ))}
                </svg>
              </div>

              <div className="relative z-10 text-center pt-6">
                {/* AI brain icon */}
                <motion.div
                  className="inline-flex items-center justify-center w-24 h-24 mb-6 relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl border"
                    style={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center p-4 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    <Brain className="w-10 h-10 text-cyan-400" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full"
                    style={{ backgroundColor: 'rgba(34, 211, 238, 0.8)' }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.4, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>

                <motion.h1
                  className="text-4xl md:text-6xl font-black mb-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-2xl md:text-3xl text-white/60 block font-light tracking-wider">AI</span>
                  <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
                    TELEPATHY
                  </span>
                </motion.h1>

                <motion.p
                  className="text-cyan-300/60 text-sm mt-3 uppercase tracking-widest"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Human-AI Mind Connection
                </motion.p>

                <motion.p
                  className="text-slate-400 max-w-sm mx-auto text-sm mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Sense the concept an AI is holding in mind.
                  Warmth feedback guides your intuition closer to the target.
                </motion.p>
              </div>

              {/* Warmth gradient bar */}
              <motion.div
                className="my-8 mx-auto max-w-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <div className="h-3 rounded-full bg-gradient-to-r from-blue-600 via-yellow-500 to-red-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" />
                <div className="flex justify-between mt-2 text-[10px] font-mono">
                  <span className="text-blue-400">COLD</span>
                  <span className="text-yellow-400">WARM</span>
                  <span className="text-red-400">BURNING</span>
                </div>
              </motion.div>

              {/* Category tags */}
              <motion.div
                className="flex flex-wrap justify-center gap-2 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {['Nature', 'Emotions', 'Objects', 'Actions', 'Abstract'].map((cat, i) => (
                  <motion.span
                    key={cat}
                    className="px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/20 text-cyan-300/80 rounded-full text-xs"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.05, type: 'spring' }}
                  >
                    {cat}
                  </motion.span>
                ))}
              </motion.div>

              {/* Stats */}
              <motion.div
                className="flex justify-center gap-6 mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div>
                  <div className="text-2xl font-bold text-cyan-400">3</div>
                  <div className="text-[10px] text-slate-500 uppercase">Rounds</div>
                </div>
                <div className="w-px bg-[#1a2535]" />
                <div>
                  <div className="text-2xl font-bold text-blue-400">5</div>
                  <div className="text-[10px] text-slate-500 uppercase">Guesses/Rnd</div>
                </div>
                <div className="w-px bg-[#1a2535]" />
                <div>
                  <div className="text-2xl font-bold text-indigo-400">6</div>
                  <div className="text-[10px] text-slate-500 uppercase">Warmth Lvls</div>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.button
                onClick={startMeditation}
                className="w-full relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <div className="relative px-8 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <Brain className="w-5 h-5" />
                  Connect to AI Mind
                </div>
              </motion.button>
            </motion.div>
          )}

          {phase === 'meditation' && (
            <motion.div
              key="meditation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
                {isLoading ? (
                  <>
                    <Loader2 className="w-16 h-16 text-cyan-500 mx-auto mb-6 animate-spin" />
                    <h2 className="text-2xl font-bold mb-4">Generating Targets</h2>
                    <p className="text-slate-600">
                      Creating cryptographically secure random concept targets...
                    </p>
                  </>
                ) : (
                  <>
                    <Brain className="w-16 h-16 text-cyan-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold mb-4">Prepare Your Mind</h2>
                    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-6 text-left">
                      <h3 className="font-semibold text-cyan-900 mb-2">Meditation Guidelines:</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-600 mt-1">•</span>
                          <span>Find a quiet, comfortable space</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-600 mt-1">•</span>
                          <span>Take deep breaths and center yourself</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-600 mt-1">•</span>
                          <span>Open your awareness and intuition</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-600 mt-1">•</span>
                          <span>Prepare to sense the AI's concepts</span>
                        </li>
                      </ul>
                    </div>
                    <p className="text-slate-600 mb-6">
                      {TOTAL_ROUNDS} random concept targets have been securely generated and committed. When you&apos;re ready, begin your guesses.
                    </p>
                    <button
                      onClick={startGuessing}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all"
                    >
                      I&apos;m Ready - Begin Guessing
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'guessing' && (
            <motion.div
              key="guessing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Round {currentRound + 1} of {TOTAL_ROUNDS}</h2>
                  <span className="text-sm text-slate-500">
                    Guess {roundGuesses.length + 1} of {GUESSES_PER_ROUND}
                  </span>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What concept is the AI thinking?
                  </label>
                  <input
                    type="text"
                    value={currentGuess}
                    onChange={(e) => setCurrentGuess(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && submitGuess()}
                    placeholder="Type your intuitive guess..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={submitGuess}
                  disabled={!currentGuess.trim()}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {roundGuesses.length + 1 >= GUESSES_PER_ROUND && currentRound + 1 >= TOTAL_ROUNDS ? 'Submit Final Guess' : 'Submit Guess'}
                </button>

                {roundGuesses.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="font-semibold text-gray-700">Your Guesses This Round:</h3>
                    {roundGuesses.map((guess, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                        <span className="text-gray-700">{guess}</span>
                        <span className="text-sm text-cyan-600">Guess {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {allGuesses.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-3">Completed Rounds:</h3>
                    <div className="space-y-2">
                      {allGuesses.map((roundGuess, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">Round {idx + 1}:</span>
                          <span className="text-sm text-cyan-600">{roundGuess.length} guesses made</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Sparkles className="w-16 h-16 text-cyan-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-2xl font-bold mb-4">Processing Your Session</h2>
                <p className="text-slate-600">Creating secure commitment...</p>
              </div>
            </motion.div>
          )}

          {phase === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {results ? (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
                  <p className="text-slate-600">Your telepathy results have been cryptographically verified</p>
                </div>

                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-cyan-900 mb-4">Performance Analysis:</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Average Warmth:</span>
                      <span className="font-bold text-lg">{results.averageWarmth}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Accuracy:</span>
                      <span className="font-bold text-lg">{results.accuracy}%</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-cyan-200">
                      <span className="text-slate-600">Performance:</span>
                      <span className={`font-bold text-lg ${
                        results.performance === 'above' ? 'text-green-600' : results.performance === 'below' ? 'text-red-600' : 'text-slate-600'
                      }`}>
                        {results.performance === 'above' ? 'Above Baseline' : results.performance === 'below' ? 'Below Baseline' : 'At Baseline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Statistics Section */}
                {results.statistics && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-purple-900 mb-4">Statistical Analysis:</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-slate-600">Z-Score:</span>
                        <p className="font-bold text-lg">{results.statistics.zScore}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">P-Value:</span>
                        <p className="font-bold text-lg">{results.statistics.pValue < 0.001 ? '< 0.001' : results.statistics.pValue.toFixed(4)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">Effect Size:</span>
                        <p className="font-bold text-lg">{results.statistics.effectSize}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">Significance:</span>
                        <p className={`font-bold text-lg ${
                          results.statistics.significance === 'highly_significant' ? 'text-purple-600' :
                          results.statistics.significance === 'significant' ? 'text-green-600' :
                          results.statistics.significance === 'marginally_significant' ? 'text-yellow-600' :
                          'text-slate-600'
                        }`}>
                          {results.statistics.significance === 'highly_significant' ? 'Highly Significant' :
                           results.statistics.significance === 'very_significant' ? 'Very Significant' :
                           results.statistics.significance === 'significant' ? 'Significant' :
                           results.statistics.significance === 'marginally_significant' ? 'Marginally Significant' :
                           'Not Significant'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      Scoring: {results.scoringMethod === 'embedding' ? 'Semantic Embedding (text-embedding-3-small)' : 'String Matching'} |
                      Observed mean: {results.statistics.observedMean?.toFixed(4)} vs baseline: {results.statistics.baselineMean}
                    </p>
                  </div>
                )}

                {/* drand Verification Badge */}
                {(results.drandRound || drandRound) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Verifiable Randomness</p>
                      <p className="text-xs text-green-700">
                        drand round #{results.drandRound || drandRound} | Source: {results.randomnessSource || randomnessSource || 'drand_quicknet'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Round-by-Round Results:</h3>
                  <div className="space-y-4">
                    {results.rounds.map((round) => (
                      <div key={round.round} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Round {round.round}:</span>
                          <span className="text-cyan-600 font-bold">{round.target}</span>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          Category: {round.category}
                        </div>
                        <div className="space-y-1">
                          {round.guesses.map((g, idx) => {
                            const warmthLevel = WARMTH_LEVELS.find(w => w.level === g.warmth);
                            return (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                                <span className="text-gray-700">{g.guess}</span>
                                <span className={`font-semibold ${warmthLevel?.color || 'text-slate-500'}`}>
                                  {warmthLevel?.label || g.warmth}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-slate-600">Best Guess: </span>
                          <span className="font-semibold">{round.bestGuess}</span>
                          <span className="text-slate-600"> - </span>
                          <span className={`font-semibold ${WARMTH_LEVELS.find(w => w.level === round.bestWarmth)?.color}`}>
                            {WARMTH_LEVELS.find(w => w.level === round.bestWarmth)?.label || round.bestWarmth}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-600 mb-1">Commitment ID:</p>
                  <p className="font-mono text-sm break-all">{commitmentId}</p>
                </div>

                <button
                  onClick={() => window.location.href = '/experiments'}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all"
                >
                  Return to Experiments
                </button>
              </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
