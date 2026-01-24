'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/walletStore';
import { Sparkles, Timer, CheckCircle2, TrendingUp, Target, Loader2 } from 'lucide-react';
import RevealModal, { ResultCard, RoundResult, StatsSummary } from '@/components/modals/RevealModal';

type Phase = 'intro' | 'meditation' | 'prediction' | 'results' | 'success';
type Suit = 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Round {
  prediction: Suit;
  actual: Suit;
  correct: boolean;
  round: number;
}

const SUITS: Suit[] = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

const DIFFICULTY_CONFIG: Record<Difficulty, { rounds: number; label: string }> = {
  easy: { rounds: 5, label: 'Easy (5 rounds)' },
  medium: { rounds: 10, label: 'Medium (10 rounds)' },
  hard: { rounds: 20, label: 'Hard (20 rounds)' },
};

export default function CardPredictionPage() {
  const wallet = useWalletStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [currentRound, setCurrentRound] = useState(0);
  const [predictions, setPredictions] = useState<Suit[]>([]);
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);
  const [commitmentId, setCommitmentId] = useState('');
  const [nonce, setNonce] = useState('');
  const [totalRounds, setTotalRounds] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{
    rounds: Round[];
    hits: number;
    total: number;
    accuracy: number;
    baseline: number;
    difference: number;
    performance: string;
    targets: Suit[];
  } | null>(null);

  // Generate backend target and store commitmentId/nonce
  const startMeditation = async () => {
    setPhase('meditation');
    setIsLoading(true);
    setError('');

    try {
      const result = await apiService.generateCardPredictionTarget({
        difficulty,
        verified: (wallet as any).isVerified ?? true,
      });

      setCommitmentId(result.commitmentId);
      setNonce(result.nonce);
      setTotalRounds(result.totalRounds);

      // Store nonce in localStorage for reveal
      localStorage.setItem(`card_prediction_nonce_${result.commitmentId}`, result.nonce);

      console.log('[CardPrediction] Target generated:', result.commitmentId);
      setIsLoading(false);
    } catch (err) {
      console.error('[CardPrediction] Generation error:', err);
      setError('Failed to generate target. Please try again.');
      setIsLoading(false);
      setPhase('intro');
    }
  };

  const startPrediction = () => {
    setPredictions([]);
    setCurrentRound(0);
    setPhase('prediction');
  };

  const submitPrediction = () => {
    if (!selectedSuit) return;

    const updatedPredictions = [...predictions, selectedSuit];
    setPredictions(updatedPredictions);
    setSelectedSuit(null);

    if (updatedPredictions.length >= totalRounds) {
      // All predictions collected - reveal and score
      revealAndScore(updatedPredictions);
    } else {
      setCurrentRound(currentRound + 1);
    }
  };

  const revealAndScore = async (finalPredictions: Suit[]) => {
    setPhase('results');
    setIsLoading(true);

    try {
      const result = await apiService.revealCardPrediction({
        commitmentId,
        predictions: finalPredictions,
        nonce,
        verified: (wallet as any).isVerified ?? true,
      });

      setResults(result as any);
      setIsLoading(false);
      setTimeout(() => setPhase('success'), 2000);
    } catch (err) {
      console.error('[CardPrediction] Reveal error:', err);
      setError('Failed to reveal and score. Please try again.');
      setIsLoading(false);
    }
  };

  const getSuitColor = (suit: Suit) => {
    if (suit === 'Hearts' || suit === 'Diamonds') return 'text-red-500';
    return 'text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
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
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    Card Suit Prediction
                  </h1>
                </div>

                <div className="space-y-4 text-slate-600">
                  <p className="text-lg">
                    Test your precognitive abilities by predicting card suits before they are revealed.
                  </p>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">How It Works:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">1.</span>
                        <span>Select your difficulty level</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">2.</span>
                        <span>Begin with a brief meditation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">3.</span>
                        <span>Predict the suit of each card</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">4.</span>
                        <span>Compare your accuracy vs 25% baseline</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Select Difficulty:</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            difficulty === diff
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <div className="font-semibold capitalize">{diff}</div>
                          <div className="text-sm text-slate-600">{DIFFICULTY_CONFIG[diff].rounds} rounds</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2">Card Suits:</h3>
                    <div className="flex flex-wrap gap-3">
                      {SUITS.map((suit) => (
                        <span key={suit} className={`px-4 py-2 bg-white rounded-lg font-semibold ${getSuitColor(suit)}`}>
                          {suit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={startMeditation}
                  className="mt-6 w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-700 transition-all"
                >
                  Begin Experiment
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
                    <Loader2 className="w-16 h-16 text-orange-500 mx-auto mb-6 animate-spin" />
                    <h2 className="text-2xl font-bold mb-4">Generating Target</h2>
                    <p className="text-slate-600">
                      Creating cryptographically secure random targets...
                    </p>
                  </>
                ) : (
                  <>
                    <Timer className="w-16 h-16 text-orange-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold mb-4">Prepare Your Mind</h2>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
                      <h3 className="font-semibold text-orange-900 mb-2">Meditation Guidelines:</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>Find a quiet, comfortable space</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>Take several deep breaths to relax</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>Clear your mind of distractions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          <span>Focus on openness and receptivity</span>
                        </li>
                      </ul>
                    </div>
                    <p className="text-slate-600 mb-6">
                      The target has been securely generated and committed. When you&apos;re ready, begin making your predictions.
                    </p>
                    <button
                      onClick={startPrediction}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-700 transition-all"
                    >
                      I&apos;m Ready - Begin Predictions
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'prediction' && (
            <motion.div
              key="prediction"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Round {currentRound + 1} of {totalRounds}</h2>
                  <span className="text-sm text-slate-500">
                    {predictions.length} predictions made
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="text-center py-8">
                    <p className="text-lg text-slate-600 mb-6">
                      What suit will the next card be?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {SUITS.map((suit) => (
                      <button
                        key={suit}
                        onClick={() => setSelectedSuit(suit)}
                        className={`p-6 rounded-lg border-2 transition-all ${
                          selectedSuit === suit
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <span className={`text-xl font-semibold ${getSuitColor(suit)}`}>
                          {suit}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={submitPrediction}
                    disabled={!selectedSuit}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {predictions.length + 1 >= totalRounds ? 'Submit Final Prediction' : 'Submit Prediction'}
                  </button>
                </div>

                {predictions.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-3">Your Predictions:</h3>
                    <div className="flex flex-wrap gap-2">
                      {predictions.map((pred, idx) => (
                        <div
                          key={idx}
                          className={`px-4 py-2 rounded-lg border-2 border-orange-200 bg-orange-50 font-semibold ${getSuitColor(pred)}`}
                        >
                          {pred}
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
                <Sparkles className="w-16 h-16 text-orange-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-2xl font-bold mb-4">Processing Results</h2>
                <p className="text-slate-600">Creating secure commitment...</p>
              </div>
            </motion.div>
          )}

          <RevealModal
            isOpen={phase === 'success' && results !== null}
            onClose={() => window.location.href = '/experiments'}
            onConfirm={() => window.location.href = '/experiments'}
            title="Experiment Complete!"
            experimentType="Card Prediction"
            confirmText="Return to Experiments"
            showVerification={true}
            verificationData={{
              commitmentId,
              nonce,
              timestamp: new Date().toISOString()
            }}
          >
            {results && (
              <div className="space-y-6">
                <StatsSummary
                  stats={[
                    { label: 'Hits', value: `${results.hits}/${results.total}` },
                    { label: 'Accuracy', value: `${results.accuracy.toFixed(1)}%` },
                    { label: 'Baseline', value: `${results.baseline}%` },
                    {
                      label: 'vs Baseline',
                      value: `${results.difference > 0 ? '+' : ''}${results.difference.toFixed(1)}%`,
                      trend: results.difference > 0 ? 'up' : results.difference < 0 ? 'down' : 'neutral',
                      trendValue: results.difference > 0 ? 'Above' : 'Below'
                    }
                  ]}
                />

                <div>
                  <h3 className="font-semibold text-lg mb-4">Round-by-Round Results</h3>
                  <div className="space-y-3">
                    {results.rounds.map((round) => (
                      <RoundResult
                        key={round.round}
                        round={round.round}
                        prediction={round.prediction}
                        actual={round.actual}
                        isCorrect={round.correct}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </RevealModal>
        </AnimatePresence>
      </main>
    </div>
  );
}
