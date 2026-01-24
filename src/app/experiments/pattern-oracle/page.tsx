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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 relative"
            >
              {/* Animated 5x5 grid background */}
              <div className="absolute -top-8 -right-8 w-64 h-64 opacity-20 pointer-events-none">
                <div className="grid grid-cols-5 gap-1 w-full h-full">
                  {[...Array(25)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="rounded-sm bg-indigo-500"
                      animate={{
                        opacity: [0.1, 0.6, 0.1],
                        scale: [0.8, 1, 0.8],
                      }}
                      transition={{
                        duration: 2 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Title area */}
              <div className="text-center pt-4">
                <motion.div
                  className="inline-flex mb-5"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                >
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 grid grid-cols-3 gap-0.5 p-2 bg-[#0a0e14] rounded-2xl border border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                      {[...Array(9)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="rounded-[2px] bg-indigo-500/60"
                          animate={{ opacity: i === 4 ? [0.3, 1, 0.3] : [0.2, 0.5, 0.2] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                    <motion.div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Eye className="w-3 h-3 text-[#0a0e14]" />
                    </motion.div>
                  </div>
                </motion.div>

                <motion.h1
                  className="text-4xl md:text-6xl font-black mb-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="bg-gradient-to-r from-indigo-300 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                    PATTERN
                  </span>
                  <br />
                  <span className="text-2xl md:text-3xl font-light tracking-[0.3em] text-white/70">
                    ORACLE
                  </span>
                </motion.h1>

                <motion.p
                  className="text-indigo-300/70 text-sm uppercase tracking-[0.25em] mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Extrasensory Perception
                </motion.p>
              </div>

              {/* Interactive grid demo */}
              <motion.div
                className="flex justify-center my-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="grid grid-cols-5 gap-1.5 p-4 rounded-2xl bg-[#080c12] border border-indigo-500/20">
                  {[...Array(GRID_SIZE)].map((_, i) => {
                    const isHighlighted = [2, 7, 12, 17, 22].includes(i);
                    return (
                      <motion.div
                        key={i}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-lg border ${
                          isHighlighted
                            ? 'border-cyan-400/60 bg-cyan-500/20'
                            : 'border-[#1a2535] bg-[#0f1520]'
                        }`}
                        animate={
                          isHighlighted
                            ? { boxShadow: ['0 0 0 rgba(34,211,238,0)', '0 0 12px rgba(34,211,238,0.3)', '0 0 0 rgba(34,211,238,0)'] }
                            : {}
                        }
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
                      />
                    );
                  })}
                </div>
              </motion.div>

              <motion.p
                className="text-center text-slate-400 max-w-md mx-auto text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                5 hidden targets in a 25-tile grid. Trust your intuition to sense
                the pattern beyond chance.
              </motion.p>

              {/* Difficulty Selection - redesigned as pills */}
              <motion.div
                className="pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="text-center text-xs text-slate-500 uppercase tracking-widest mb-3">Difficulty</div>
                <div className="flex gap-2 justify-center">
                  {(Object.keys(difficultyConfig) as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                        difficulty === d
                          ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                          : 'bg-[#0a0e14] text-slate-400 border border-[#1a2535] hover:border-indigo-500/50 hover:text-white'
                      }`}
                    >
                      {difficultyConfig[d].label}
                      <span className="text-[10px] ml-1.5 opacity-60">
                        {d === 'easy' ? '3R' : d === 'medium' ? '5R' : '7R'}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="text-center text-xs text-slate-600 mt-2">
                  {difficultyConfig[difficulty].description}
                </div>
              </motion.div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* CTA */}
              <motion.button
                onClick={startMeditation}
                disabled={isLoading}
                className="w-full relative group mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <div className="relative px-8 py-5 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Grid3X3 className="w-5 h-5" />
                      Open Your Third Eye
                      <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </>
                  )}
                </div>
              </motion.button>

              <p className="text-center text-slate-600 text-xs mt-3">
                Baseline: 20% by chance alone
              </p>
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
