'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/useWalletStore';
import RevealModal, { StatsSummary } from '@/components/modals/RevealModal';
import { Loader2, Grid3X3, Eye, Target, Sparkles, Check, X } from 'lucide-react';

type Phase = 'intro' | 'meditation' | 'selection' | 'reveal' | 'results' | 'success';
type Difficulty = 'easy' | 'medium' | 'hard';

interface TileState {
  index: number;
  selected: boolean;
  isTarget: boolean;
  revealed: boolean;
}

interface RoundResult {
  round: number;
  hits: number;
  targetTiles: number[];
  selectedTiles: number[];
  accuracy: number;
}

interface Results {
  rounds: RoundResult[];
  totalHits: number;
  totalTargets: number;
  overallAccuracy: number;
  baseline: number;
  difference: number;
  performance: string;
  pValue: number;
  commitmentHash: string;
}

const GRID_SIZE = 25; // 5x5 grid
const TARGET_COUNT = 5; // 5 tiles contain the hidden pattern (20% of grid)
const BASELINE = 20; // 20% chance baseline

const difficultyConfig = {
  easy: { rounds: 3, timeLimit: null, label: 'Easy', description: '3 rounds, no time limit' },
  medium: { rounds: 5, timeLimit: 30, label: 'Medium', description: '5 rounds, 30s per round' },
  hard: { rounds: 7, timeLimit: 15, label: 'Hard', description: '7 rounds, 15s per round' },
};

export default function PatternOraclePage() {
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [commitmentId, setCommitmentId] = useState('');
  const [nonce, setNonce] = useState('');
  const [commitmentHash, setCommitmentHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Game state
  const [currentRound, setCurrentRound] = useState(1);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [allSelections, setAllSelections] = useState<number[][]>([]); // Store all round selections
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [showingReveal, setShowingReveal] = useState(false);

  // Initialize tiles
  const initializeTiles = useCallback(() => {
    const newTiles: TileState[] = Array.from({ length: GRID_SIZE }, (_, i) => ({
      index: i,
      selected: false,
      isTarget: false,
      revealed: false,
    }));
    setTiles(newTiles);
  }, []);

  // Timer effect
  useEffect(() => {
    if (phase !== 'selection' || timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmitRound();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timeRemaining]);

  const startMeditation = async () => {
    setPhase('meditation');
    setIsLoading(true);
    setError('');
    setAllSelections([]);
    setRoundResults([]);
    setCurrentRound(1);

    try {
      // Generate commitment on backend - targets are generated and committed server-side
      const totalRounds = difficultyConfig[difficulty].rounds;
      const result = await apiService.generatePatternOracleTarget({
        gridSize: GRID_SIZE,
        targetCount: TARGET_COUNT * totalRounds, // All targets for all rounds
        difficulty,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.commitmentId);
      setNonce(result.nonce);
      setCommitmentHash(result.commitmentHash);
      localStorage.setItem(`pattern_oracle_nonce_${result.commitmentId}`, result.nonce);

      initializeTiles();
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setPhase('intro');
      setIsLoading(false);
    }
  };

  const startRound = () => {
    initializeTiles();
    const timeLimit = difficultyConfig[difficulty].timeLimit;
    setTimeRemaining(timeLimit);
    setPhase('selection');
    setShowingReveal(false);
  };

  const handleTileClick = (index: number) => {
    if (phase !== 'selection' || showingReveal) return;

    const selectedCount = tiles.filter((t) => t.selected).length;
    const tile = tiles[index];

    // Can select up to TARGET_COUNT tiles
    if (!tile.selected && selectedCount >= TARGET_COUNT) return;

    setTiles((prev) =>
      prev.map((t) => (t.index === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleSubmitRound = () => {
    const selectedIndices = tiles.filter((t) => t.selected).map((t) => t.index);

    // Store this round's selections
    setAllSelections((prev) => [...prev, selectedIndices]);

    // Create a placeholder result (actual hits will be calculated on reveal)
    const placeholderResult: RoundResult = {
      round: currentRound,
      hits: 0,
      targetTiles: [],
      selectedTiles: selectedIndices,
      accuracy: 0,
    };

    setRoundResults((prev) => [...prev, placeholderResult]);
    setPhase('reveal');
    setShowingReveal(true);
  };

  const nextRound = () => {
    const totalRounds = difficultyConfig[difficulty].rounds;
    if (currentRound >= totalRounds) {
      calculateFinalResults();
    } else {
      setCurrentRound((prev) => prev + 1);
      startRound();
    }
  };

  const calculateFinalResults = async () => {
    setPhase('results');
    setIsLoading(true);

    try {
      // Combine all selections for the reveal call
      const allSelectionsFlat = allSelections.flat();

      // Call backend to reveal all targets and calculate results
      const revealResult = await apiService.revealPatternOracle({
        commitmentId,
        selections: allSelectionsFlat,
        nonce,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      // Parse the results from backend
      const totalRounds = difficultyConfig[difficulty].rounds;

      // Reconstruct round-by-round results from backend targets
      const reconstructedRounds: RoundResult[] = [];
      for (let r = 0; r < totalRounds; r++) {
        const roundTargets = revealResult.targetTiles.slice(
          r * TARGET_COUNT,
          (r + 1) * TARGET_COUNT
        );
        const roundSelections = allSelections[r] || [];
        const hits = roundSelections.filter((s) => roundTargets.includes(s)).length;

        reconstructedRounds.push({
          round: r + 1,
          hits,
          targetTiles: roundTargets,
          selectedTiles: roundSelections,
          accuracy: (hits / TARGET_COUNT) * 100,
        });
      }

      setResults({
        rounds: reconstructedRounds,
        totalHits: revealResult.hits,
        totalTargets: totalRounds * TARGET_COUNT,
        overallAccuracy: revealResult.accuracy,
        baseline: revealResult.baseline,
        difference: revealResult.difference,
        performance: revealResult.performance,
        pValue: revealResult.pValue,
        commitmentHash,
      });

      // Submit to feed
      try {
        await apiService.submitToFeed({
          experimentType: 'pattern-oracle',
          score: revealResult.hits,
          accuracy: revealResult.accuracy,
          baseline: revealResult.baseline,
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
      setError(err instanceof Error ? err.message : 'Failed to reveal results');
      setIsLoading(false);
      setPhase('intro');
    }
  };

  const selectedCount = tiles.filter((t) => t.selected).length;
  const totalRounds = difficultyConfig[difficulty].rounds;

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
              <div className="bg-gradient-to-br from-cyan-900/20 to-violet-900/20 rounded-2xl border border-indigo-500/30 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <Grid3X3 className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Pattern Oracle</h1>
                    <p className="text-indigo-300">ESP / Intuition Experiment</p>
                  </div>
                </div>

                <div className="space-y-4 text-slate-300 mb-8">
                  <p>
                    Test your intuitive pattern detection abilities. A 5x5 grid contains 5 hidden
                    &quot;target&quot; tiles. Can you sense which tiles hold the hidden pattern?
                  </p>

                  <div className="bg-[#060a0f]/30 rounded-xl p-4 border border-indigo-500/20">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-400" />
                      How It Works
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400">1.</span>
                        <span>Targets are generated on the blockchain and cryptographically committed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400">2.</span>
                        <span>Select exactly 5 tiles you intuit contain the pattern</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400">3.</span>
                        <span>After all rounds, targets are revealed from the blockchain</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400">4.</span>
                        <span>Baseline: 20% (1 hit by chance). Can you exceed it?</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Difficulty Selection */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Select Difficulty</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(Object.keys(difficultyConfig) as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`p-4 rounded-xl border transition-all ${
                          difficulty === d
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-[#1a2535] bg-[#0a1018] text-slate-400 hover:border-indigo-500/50'
                        }`}
                      >
                        <div className="font-semibold">{difficultyConfig[d].label}</div>
                        <div className="text-xs opacity-70">{difficultyConfig[d].description}</div>
                      </button>
                    ))}
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
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white py-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Begin Pattern Oracle
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
                      <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin" />
                      <Eye className="absolute inset-0 m-auto w-10 h-10 text-indigo-400" />
                    </div>
                    <p className="text-xl text-slate-300">Generating hidden patterns on blockchain...</p>
                    <p className="text-sm text-slate-500">
                      Creating cryptographic commitment
                    </p>
                  </>
                ) : (
                  <>
                    <div className="p-6 bg-indigo-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <Eye className="w-12 h-12 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Patterns Committed</h2>
                    <p className="text-slate-400 max-w-md">
                      The hidden patterns have been cryptographically committed to the blockchain.
                      Clear your mind and trust your intuition to find them.
                    </p>
                    <div className="text-xs text-slate-600 font-mono break-all max-w-md">
                      Commitment: {commitmentHash.slice(0, 20)}...
                    </div>
                    <button
                      onClick={startRound}
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                    >
                      Start Round 1
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* SELECTION PHASE */}
          {(phase === 'selection' || phase === 'reveal') && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold text-white">
                    Round {currentRound} of {totalRounds}
                  </div>
                  <div className="text-sm text-slate-400">
                    Selected: {selectedCount} / {TARGET_COUNT}
                  </div>
                </div>
                {timeRemaining !== null && phase === 'selection' && (
                  <div
                    className={`text-lg font-mono font-bold ${
                      timeRemaining <= 5 ? 'text-red-400' : 'text-indigo-400'
                    }`}
                  >
                    {timeRemaining}s
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className="bg-[#0f1520]/30 rounded-2xl border border-[#1a2535] p-6">
                <div className="grid grid-cols-5 gap-3 max-w-[400px] mx-auto">
                  {tiles.map((tile) => {
                    let tileClass =
                      'aspect-square rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center';

                    if (tile.selected) {
                      tileClass +=
                        ' bg-indigo-500/30 border-indigo-500 text-indigo-400';
                    } else {
                      tileClass +=
                        ' bg-[#0a1018] border-[#1a2535] hover:border-indigo-500/50 hover:bg-[#142030]';
                    }

                    return (
                      <motion.button
                        key={tile.index}
                        onClick={() => handleTileClick(tile.index)}
                        disabled={phase === 'reveal'}
                        className={tileClass}
                        whileHover={phase === 'selection' ? { scale: 1.05 } : {}}
                        whileTap={phase === 'selection' ? { scale: 0.95 } : {}}
                      >
                        {tile.selected && (
                          <div className="w-3 h-3 bg-indigo-400 rounded-full" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <p className="text-center text-slate-500 text-sm mt-4">
                  Targets are sealed on the blockchain - trust your intuition!
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-center">
                {phase === 'selection' && (
                  <button
                    onClick={handleSubmitRound}
                    disabled={selectedCount !== TARGET_COUNT}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-all"
                  >
                    Lock In Selection ({selectedCount}/{TARGET_COUNT})
                  </button>
                )}
                {phase === 'reveal' && (
                  <div className="text-center space-y-4">
                    <div className="text-xl font-semibold text-white">
                      Selection locked for Round {currentRound}
                    </div>
                    <p className="text-slate-400 text-sm">
                      Targets will be revealed after all rounds are complete
                    </p>
                    <button
                      onClick={nextRound}
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                    >
                      {currentRound >= totalRounds ? 'Reveal All Results' : 'Next Round'}
                    </button>
                  </div>
                )}
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
              <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-4" />
              <p className="text-xl text-slate-300">Revealing targets from blockchain...</p>
              <p className="text-sm text-slate-500 mt-2">Verifying cryptographic commitment</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULTS MODAL */}
        <RevealModal
          isOpen={phase === 'success' && results !== null}
          onClose={() => {}}
          onConfirm={() => (window.location.href = '/experiments')}
          title="Pattern Oracle Complete!"
          experimentType="Pattern Oracle (ESP)"
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
                    label: 'Total Hits',
                    value: `${results.totalHits}/${results.totalTargets}`,
                    trend: results.difference > 0 ? 'up' : results.difference < 0 ? 'down' : 'neutral',
                  },
                  {
                    label: 'Accuracy',
                    value: `${results.overallAccuracy.toFixed(1)}%`,
                    trend: results.difference > 0 ? 'up' : 'neutral',
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

              {/* Round breakdown */}
              <div className="bg-[#0a1018] rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3">Round Breakdown</h3>
                <div className="space-y-2">
                  {results.rounds.map((round) => (
                    <div
                      key={round.round}
                      className="flex items-center justify-between py-2 border-b border-[#1a2535] last:border-0"
                    >
                      <span className="text-slate-400">Round {round.round}</span>
                      <div className="flex items-center gap-4">
                        <span
                          className={`font-semibold ${
                            round.hits >= 2 ? 'text-green-400' : round.hits >= 1 ? 'text-yellow-400' : 'text-slate-400'
                          }`}
                        >
                          {round.hits}/{TARGET_COUNT} hits
                        </span>
                        <span className="text-sm text-slate-500">
                          {round.accuracy.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistical significance */}
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-indigo-300 mb-2">Statistical Analysis</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>
                    Baseline expectation: {BASELINE}% (1 hit per round by chance)
                  </p>
                  <p>
                    Your accuracy: {results.overallAccuracy.toFixed(1)}% ({results.totalHits} total hits)
                  </p>
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
            </div>
          )}
        </RevealModal>
      </main>
    </div>
  );
}
