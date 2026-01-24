'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/useWalletStore';
import RevealModal, { StatsSummary } from '@/components/modals/RevealModal';
import {
  Loader2,
  RotateCcw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';

type Phase = 'intro' | 'meditation' | 'influence' | 'revealing' | 'results' | 'success';

interface OutcomeState {
  index: number;
  influenced: 'red' | 'black' | null;
  outcome: 'red' | 'black' | null;
  revealed: boolean;
  match: boolean | null;
}

interface Results {
  outcomes: OutcomeState[];
  totalInfluenced: number;
  matches: number;
  accuracy: number;
  baseline: number;
  difference: number;
  performance: string;
  pValue: number;
  commitmentHash: string;
}

const TOTAL_OUTCOMES = 50;
const BASELINE = 50; // 50% chance

export default function RetroRoulettePage() {
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [nonce, setNonce] = useState('');
  const [commitmentHash, setCommitmentHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Game state
  const [outcomes, setOutcomes] = useState<OutcomeState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Results | null>(null);

  const startMeditation = async () => {
    setPhase('meditation');
    setIsLoading(true);
    setError('');

    try {
      // Generate all outcomes on backend - cryptographically committed
      const result = await apiService.generateRetroRouletteTarget({
        totalOutcomes: TOTAL_OUTCOMES,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.commitmentId);
      setNonce(result.nonce);
      setCommitmentHash(result.commitmentHash);
      localStorage.setItem(`retro_roulette_nonce_${result.commitmentId}`, result.nonce);

      // Initialize outcome tracking (no outcomes revealed yet)
      const initialOutcomes: OutcomeState[] = [];
      for (let i = 0; i < TOTAL_OUTCOMES; i++) {
        initialOutcomes.push({
          index: i,
          influenced: null,
          outcome: null, // Unknown until revealed
          revealed: false,
          match: null,
        });
      }
      setOutcomes(initialOutcomes);
      setCurrentIndex(0);

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setPhase('intro');
      setIsLoading(false);
    }
  };

  const startInfluencing = () => {
    setPhase('influence');
  };

  const handleInfluence = async (choice: 'red' | 'black') => {
    if (phase !== 'influence') return;

    // Record user's influence choice
    setOutcomes((prev) =>
      prev.map((o, i) =>
        i === currentIndex ? { ...o, influenced: choice } : o
      )
    );

    // Move to revealing phase
    setPhase('revealing');
    setIsLoading(true);

    try {
      // Call backend to reveal this specific outcome
      const revealResult = await apiService.revealRetroRouletteOutcome({
        commitmentId,
        outcomeIndex: currentIndex,
        userChoice: choice,
        nonce,
      });

      // Update with revealed outcome
      const match = revealResult.userChoice === revealResult.actualOutcome;
      setOutcomes((prev) =>
        prev.map((o, i) =>
          i === currentIndex
            ? {
                ...o,
                outcome: revealResult.actualOutcome,
                revealed: true,
                match,
              }
            : o
        )
      );

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal outcome');
      setIsLoading(false);
      // Still show what happened locally
      setOutcomes((prev) =>
        prev.map((o, i) =>
          i === currentIndex ? { ...o, revealed: true, match: false } : o
        )
      );
    }
  };

  const nextOutcome = () => {
    if (currentIndex < TOTAL_OUTCOMES - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase('influence');
    } else {
      calculateFinalResults();
    }
  };

  const calculateFinalResults = async () => {
    setPhase('results');
    setIsLoading(true);

    try {
      // Call backend to finalize and get complete results
      const finalResult = await apiService.finalizeRetroRoulette({
        commitmentId,
        nonce,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      // Map backend results to our state
      const finalOutcomes = outcomes.map((o, i) => {
        const backendOutcome = finalResult.allOutcomes.find((bo) => bo.index === i);
        const userChoice = finalResult.userChoices.find((uc) => uc.index === i);
        return {
          ...o,
          outcome: backendOutcome?.outcome || o.outcome,
          revealed: true,
          match: userChoice?.match ?? o.match,
        };
      });

      setResults({
        outcomes: finalOutcomes,
        totalInfluenced: finalResult.total,
        matches: finalResult.matches,
        accuracy: finalResult.accuracy,
        baseline: finalResult.baseline,
        difference: finalResult.difference,
        performance: finalResult.performance,
        pValue: finalResult.pValue,
        commitmentHash,
      });

      // Submit to feed
      try {
        await apiService.submitToFeed({
          experimentType: 'retro-roulette',
          score: finalResult.matches,
          accuracy: finalResult.accuracy,
          baseline: finalResult.baseline,
          commitmentId,
          verified: !!(wallet as { isVerified?: boolean })?.isVerified,
          walletAddress: wallet?.address,
        });
      } catch (feedErr) {
        console.error('Failed to submit to feed:', feedErr);
      }

      setIsLoading(false);
      setPhase('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize results');
      setIsLoading(false);
      setPhase('intro');
    }
  };

  const skipToResults = () => {
    // Allow early exit with current results
    if (outcomes.filter((o) => o.revealed).length >= 10) {
      calculateFinalResults();
    }
  };

  const current = outcomes[currentIndex];
  const influencedCount = outcomes.filter((o) => o.influenced !== null).length;
  const matchCount = outcomes.filter((o) => o.match === true).length;
  const revealedCount = outcomes.filter((o) => o.revealed).length;
  const progressPercent = ((currentIndex + 1) / TOTAL_OUTCOMES) * 100;

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {/* INTRO PHASE */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 rounded-2xl border border-violet-500/30 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-violet-500/20 rounded-xl">
                    <RotateCcw className="w-8 h-8 text-violet-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Retro Roulette</h1>
                    <p className="text-violet-300">Retrocausality Experiment</p>
                  </div>
                </div>

                <div className="space-y-4 text-slate-300 mb-8">
                  <p>
                    Explore the mysterious concept of retrocausality - can your intention affect
                    outcomes that have already been determined on the blockchain?
                  </p>

                  <div className="bg-[#060a0f]/30 rounded-xl p-4 border border-violet-500/20">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-violet-400" />
                      The Experiment
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-violet-400">1.</span>
                        <span>50 random outcomes (Red/Black) are generated on the blockchain</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-400">2.</span>
                        <span>You choose which color you want BEFORE seeing the result</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-400">3.</span>
                        <span>Only AFTER your choice is the blockchain outcome revealed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-400">4.</span>
                        <span>Can your intention correlate with what was already committed?</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                    <h3 className="font-semibold text-violet-300 mb-2">The Paradox</h3>
                    <p className="text-sm text-slate-400">
                      In standard physics, causes precede effects. Retrocausality explores whether
                      your present intention could correlate with past random events - suggesting
                      either backward causation or a deeper connection in time. The outcomes are
                      cryptographically committed before you make your choices.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <button
                  onClick={startMeditation}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Begin Retro Roulette
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* MEDITATION PHASE */}
          {phase === 'meditation' && (
            <motion.div
              key="meditation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="text-center space-y-6">
                {isLoading ? (
                  <>
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-violet-500/30 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-violet-500 rounded-full animate-spin" />
                      <Lock className="absolute inset-0 m-auto w-10 h-10 text-violet-400" />
                    </div>
                    <p className="text-xl text-slate-300">Generating sealed outcomes on blockchain...</p>
                    <p className="text-sm text-slate-500">
                      50 outcomes being cryptographically committed
                    </p>
                  </>
                ) : (
                  <>
                    <div className="p-6 bg-violet-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <Lock className="w-12 h-12 text-violet-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Outcomes Sealed on Blockchain</h2>
                    <p className="text-slate-400 max-w-md">
                      50 random Red/Black outcomes have been committed to the blockchain. They already
                      exist and cannot be changed - now see if your intentions can correlate with them.
                    </p>
                    <div className="text-xs text-slate-600 font-mono break-all max-w-md">
                      Commitment: {commitmentHash.slice(0, 20)}...
                    </div>
                    <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <span>Red outcomes sealed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#142030] rounded-full border border-gray-600" />
                        <span>Black outcomes sealed</span>
                      </div>
                    </div>
                    <button
                      onClick={startInfluencing}
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                    >
                      Start Influencing
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* INFLUENCE & REVEAL PHASES */}
          {(phase === 'influence' || phase === 'revealing') && (
            <motion.div
              key="influence"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress */}
              <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Outcome {currentIndex + 1} of {TOTAL_OUTCOMES}</span>
                  <span className="text-slate-400">
                    Matches: {matchCount}/{revealedCount}
                  </span>
                </div>
                <div className="h-2 bg-[#142030] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Main interaction area */}
              <div className="bg-[#0f1520]/30 rounded-2xl border border-[#1a2535] p-8">
                {phase === 'influence' && (
                  <div className="text-center space-y-6">
                    <div className="flex items-center justify-center gap-2 text-violet-400">
                      <EyeOff className="w-6 h-6" />
                      <span className="text-lg">Outcome #{currentIndex + 1} is sealed on blockchain</span>
                    </div>

                    <div className="relative w-32 h-32 mx-auto">
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full animate-pulse" />
                      <div className="absolute inset-2 bg-[#0f1520] rounded-full flex items-center justify-center">
                        <Lock className="w-12 h-12 text-slate-600" />
                      </div>
                    </div>

                    <p className="text-slate-300 max-w-md mx-auto">
                      Focus your intention on the color you want this pre-determined outcome to be.
                      The result already exists on the blockchain - can you align with it?
                    </p>

                    <div className="flex justify-center gap-6">
                      <motion.button
                        onClick={() => handleInfluence('red')}
                        disabled={isLoading}
                        className="w-32 h-32 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="w-12 h-12 bg-red-500 rounded-full" />
                        <span className="text-red-400 font-semibold">RED</span>
                      </motion.button>

                      <motion.button
                        onClick={() => handleInfluence('black')}
                        disabled={isLoading}
                        className="w-32 h-32 bg-[#0a1018] hover:bg-[#142030] border-2 border-gray-600 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="w-12 h-12 bg-[#0f1520] border-2 border-gray-600 rounded-full" />
                        <span className="text-slate-300 font-semibold">BLACK</span>
                      </motion.button>
                    </div>
                  </div>
                )}

                {phase === 'revealing' && current && (
                  <div className="text-center space-y-6">
                    <div className="flex items-center justify-center gap-2 text-violet-400">
                      <Eye className="w-6 h-6" />
                      <span className="text-lg">Revealing blockchain outcome #{currentIndex + 1}</span>
                    </div>

                    {isLoading ? (
                      <div className="py-8">
                        <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto" />
                        <p className="text-slate-400 mt-4">Verifying blockchain commitment...</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-8">
                          {/* User's choice */}
                          <div className="text-center">
                            <p className="text-sm text-slate-500 mb-2">Your Intention</p>
                            <div
                              className={`w-20 h-20 rounded-full flex items-center justify-center ${
                                current.influenced === 'red'
                                  ? 'bg-red-500/30 border-2 border-red-500'
                                  : 'bg-[#142030] border-2 border-gray-600'
                              }`}
                            >
                              <div
                                className={`w-12 h-12 rounded-full ${
                                  current.influenced === 'red' ? 'bg-red-500' : 'bg-[#0f1520] border border-gray-600'
                                }`}
                              />
                            </div>
                            <p className={`mt-2 font-semibold ${current.influenced === 'red' ? 'text-red-400' : 'text-slate-400'}`}>
                              {current.influenced?.toUpperCase()}
                            </p>
                          </div>

                          <ArrowRight className="w-8 h-8 text-slate-600" />

                          {/* Actual outcome */}
                          <motion.div
                            className="text-center"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, type: 'spring' }}
                          >
                            <p className="text-sm text-slate-500 mb-2">Blockchain Result</p>
                            <div
                              className={`w-20 h-20 rounded-full flex items-center justify-center ${
                                current.outcome === 'red'
                                  ? 'bg-red-500/30 border-2 border-red-500'
                                  : 'bg-[#142030] border-2 border-gray-600'
                              }`}
                            >
                              <div
                                className={`w-12 h-12 rounded-full ${
                                  current.outcome === 'red' ? 'bg-red-500' : 'bg-[#0f1520] border border-gray-600'
                                }`}
                              />
                            </div>
                            <p className={`mt-2 font-semibold ${current.outcome === 'red' ? 'text-red-400' : 'text-slate-400'}`}>
                              {current.outcome?.toUpperCase()}
                            </p>
                          </motion.div>
                        </div>

                        {/* Match result */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${
                            current.match
                              ? 'bg-green-500/20 border border-green-500'
                              : 'bg-red-500/20 border border-red-500'
                          }`}
                        >
                          {current.match ? (
                            <>
                              <Check className="w-6 h-6 text-green-400" />
                              <span className="text-green-400 font-semibold">ALIGNED!</span>
                            </>
                          ) : (
                            <>
                              <X className="w-6 h-6 text-red-400" />
                              <span className="text-red-400 font-semibold">Misaligned</span>
                            </>
                          )}
                        </motion.div>

                        <button
                          onClick={nextOutcome}
                          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                        >
                          {currentIndex >= TOTAL_OUTCOMES - 1 ? 'See Final Results' : 'Next Outcome'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Skip button */}
              {revealedCount >= 10 && phase === 'influence' && (
                <div className="text-center">
                  <button
                    onClick={skipToResults}
                    className="text-slate-500 hover:text-slate-300 text-sm underline"
                  >
                    Finish early with {revealedCount} outcomes
                  </button>
                </div>
              )}

              {/* Recent outcomes */}
              <div className="bg-[#0f1520]/30 rounded-xl border border-[#1a2535] p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Outcomes</h3>
                <div className="flex gap-2 flex-wrap">
                  {outcomes.slice(0, currentIndex + 1).map((o, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                        o.revealed
                          ? o.match
                            ? 'bg-green-500/30 border border-green-500'
                            : 'bg-red-500/30 border border-red-500'
                          : 'bg-[#142030] border border-[#1a2535]'
                      }`}
                    >
                      {o.revealed ? (
                        o.match ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )
                      ) : (
                        <Lock className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULTS LOADING */}
          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <Loader2 className="w-16 h-16 animate-spin text-violet-500 mb-4" />
              <p className="text-xl text-slate-300">Analyzing retrocausal correlations...</p>
              <p className="text-sm text-slate-500 mt-2">Verifying blockchain commitments</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULTS MODAL */}
        <RevealModal
          isOpen={phase === 'success' && results !== null}
          onClose={() => {}}
          onConfirm={() => (window.location.href = '/experiments')}
          title="Retro Roulette Complete!"
          experimentType="Retro Roulette (Retrocausality)"
          confirmText="Return to Experiments"
          showVerification={true}
          verificationData={{
            commitmentId,
            nonce,
            timestamp: new Date().toISOString(),
            commitmentHash: results?.commitmentHash,
          }}
        >
          {results && (
            <div className="space-y-6">
              <StatsSummary
                stats={[
                  {
                    label: 'Alignments',
                    value: `${results.matches}/${results.totalInfluenced}`,
                    trend: results.difference > 0 ? 'up' : results.difference < 0 ? 'down' : 'neutral',
                  },
                  {
                    label: 'Correlation',
                    value: `${results.accuracy.toFixed(1)}%`,
                    trend: results.accuracy > BASELINE ? 'up' : 'neutral',
                  },
                  {
                    label: 'vs Baseline',
                    value: `${results.difference >= 0 ? '+' : ''}${results.difference.toFixed(1)}%`,
                    trend: results.difference > 0 ? 'up' : results.difference < 0 ? 'down' : 'neutral',
                  },
                  {
                    label: 'Performance',
                    value: results.performance,
                    trend: results.difference > 5 ? 'up' : 'neutral',
                  },
                ]}
              />

              {/* Visual outcome strip */}
              <div className="bg-[#0a1018] rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3">All Outcomes</h3>
                <div className="flex gap-1 flex-wrap">
                  {results.outcomes
                    .filter((o) => o.revealed)
                    .map((o, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded flex items-center justify-center ${
                          o.match
                            ? 'bg-green-500/30 border border-green-500'
                            : 'bg-red-500/30 border border-red-500'
                        }`}
                      >
                        {o.match ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <X className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Statistical significance */}
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-violet-300 mb-2">Retrocausality Analysis</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>Baseline expectation: {BASELINE}% (random correlation)</p>
                  <p>Your alignment rate: {results.accuracy.toFixed(1)}%</p>
                  <p className={results.pValue < 0.05 ? 'text-green-400' : 'text-slate-400'}>
                    p-value: {results.pValue.toFixed(4)}
                    {results.pValue < 0.05 && ' (statistically significant!)'}
                  </p>
                </div>
              </div>

              {/* Blockchain verification */}
              <div className="bg-[#142030]/30 border border-[#1a2535] rounded-xl p-4">
                <h3 className="font-semibold text-slate-300 mb-2">Blockchain Verification</h3>
                <p className="text-xs text-slate-500 font-mono break-all">
                  Commitment Hash: {results.commitmentHash}
                </p>
              </div>

              <div className="text-sm text-slate-500 text-center">
                <p>
                  Results above 50% suggest a correlation between your present intentions
                  and the blockchain-committed outcomes - a potential retrocausal effect.
                </p>
              </div>
            </div>
          )}
        </RevealModal>
      </main>
    </div>
  );
}
