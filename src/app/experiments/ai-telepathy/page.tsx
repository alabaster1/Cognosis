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
  const [results, setResults] = useState<{
    success: boolean;
    rounds: Array<{
      round: number;
      target: string;
      category: string;
      guesses: Array<{ guess: string; warmth: string }>;
      bestGuess: string;
      bestWarmth: string;
    }>;
    averageWarmth: string;
    accuracy: string;
    performance: string;
    targets: Array<{ concept: string; category: string }>;
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    AI Telepathy Challenge
                  </h1>
                </div>

                <div className="space-y-4 text-slate-600">
                  <p className="text-lg">
                    Can you sense what concept the AI is thinking? Use intuition and warmth feedback to guide your guesses.
                  </p>

                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <h3 className="font-semibold text-cyan-900 mb-2">How It Works:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-600 mt-1">1.</span>
                        <span>Begin with a brief meditation to clear your mind</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-600 mt-1">2.</span>
                        <span>Complete 3 rounds of concept guessing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-600 mt-1">3.</span>
                        <span>Make up to 5 guesses per round with warmth feedback</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-600 mt-1">4.</span>
                        <span>Warmth levels guide you: Burning Hot -&gt; Cold</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Concept Categories:</h3>
                    <div className="flex flex-wrap gap-2">
                      {['Nature', 'Emotions', 'Objects', 'Actions', 'Abstract'].map((cat) => (
                        <span key={cat} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={startMeditation}
                  className="mt-6 w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all"
                >
                  Begin Experience
                </button>
              </div>
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

          {phase === 'success' && results && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
