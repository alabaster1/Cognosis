'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/useWalletStore';
import RevealModal, { StatsSummary } from '@/components/modals/RevealModal';
import {
  Loader2,
  Coins,
  Users,
  Zap,
  Activity,
} from 'lucide-react';

type Phase = 'intro' | 'lobby' | 'meditation' | 'focusing' | 'flip' | 'results' | 'success';
type IntentionTarget = 'heads' | 'tails';

interface Player {
  id: string;
  name: string;
  intention: IntentionTarget | null;
  isYou: boolean;
}

interface RoundIntention {
  round: number;
  userIntention: IntentionTarget;
  simulatedIntentions: IntentionTarget[];
}

interface FlipResult {
  round: number;
  outcome: 'heads' | 'tails';
  headsCount: number;
  tailsCount: number;
  groupIntention: IntentionTarget | null;
  aligned: boolean;
}

interface Results {
  rounds: FlipResult[];
  totalFlips: number;
  headsOutcomes: number;
  tailsOutcomes: number;
  groupAlignments: number;
  yourAlignments: number;
  chiSquare: number;
  effectSize: number;
  significance: string;
  performance: string;
  commitmentHash?: string;
  verified?: boolean;
}

const TOTAL_ROUNDS = 20;
const BASELINE = 50; // 50% chance

// Simulated player names for single-player mode
const SIMULATED_PLAYERS = [
  'QuantumMind_7x', 'PsiExplorer_3k', 'WaveCollapse_9m', 'Entangled_5j',
  'CosmicView_2a', 'MindField_8b', 'DeepFocus_4c', 'Resonance_6d',
];

// Seeded random for deterministic simulated player behavior
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export default function QuantumCoinArenaPage() {
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [commitmentHash, setCommitmentHash] = useState('');
  const [nonce, setNonce] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [myIntention, setMyIntention] = useState<IntentionTarget | null>(null);
  const [flipResults, setFlipResults] = useState<FlipResult[]>([]);
  const [currentFlip, setCurrentFlip] = useState<'heads' | 'tails' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [focusTimer, setFocusTimer] = useState(5);
  const [results, setResults] = useState<Results | null>(null);

  // Store intentions for each round (for reveal)
  const [roundIntentions, setRoundIntentions] = useState<RoundIntention[]>([]);

  // Backend-provided data
  const simulatedPlayerSeedRef = useRef<number>(0);

  // Generate simulated players
  const generatePlayers = useCallback(() => {
    const playerCount = Math.floor(Math.random() * 5) + 3; // 3-7 other players
    const simulatedPlayers: Player[] = [];

    // Add yourself
    const yourName = wallet?.address
      ? `You_${wallet.address.slice(-4)}`
      : 'You';
    simulatedPlayers.push({ id: 'you', name: yourName, intention: null, isYou: true });

    // Add simulated players
    const shuffled = [...SIMULATED_PLAYERS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < playerCount; i++) {
      simulatedPlayers.push({
        id: `player-${i}`,
        name: shuffled[i],
        intention: null,
        isYou: false,
      });
    }

    return simulatedPlayers;
  }, [wallet]);

  // Focus timer effect
  useEffect(() => {
    if (phase !== 'focusing' || focusTimer <= 0) return;

    const timer = setInterval(() => {
      setFocusTimer((prev) => {
        if (prev <= 1) {
          executeFlip();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, focusTimer]);

  const startLobby = async () => {
    setPhase('lobby');
    setIsLoading(true);
    setError('');

    try {
      // Call backend to generate coin flip outcomes with cryptographic commitment
      const result = await apiService.generateQuantumCoinTarget({
        totalFlips: TOTAL_ROUNDS,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.commitmentId);
      setCommitmentHash(result.commitmentHash);
      setNonce(result.nonce);
      localStorage.setItem(`quantum_coin_nonce_${result.commitmentId}`, result.nonce);

      // Store seed for deterministic simulated player behavior
      simulatedPlayerSeedRef.current = result.simulatedPlayerSeed;

      // Generate players
      const generatedPlayers = generatePlayers();
      setPlayers(generatedPlayers);

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize arena');
      setPhase('intro');
      setIsLoading(false);
    }
  };

  const startMeditation = () => {
    setPhase('meditation');
    // Simulate players joining
    setTimeout(() => {
      setPhase('focusing');
      setCurrentRound(1);
      setFlipResults([]);
    }, 3000);
  };

  const setIntention = (target: IntentionTarget) => {
    if (phase !== 'focusing') return;
    setMyIntention(target);

    // Generate deterministic simulated player intentions using seeded random
    const seed = simulatedPlayerSeedRef.current + currentRound;
    const random = seededRandom(seed);

    // Simulate other players setting intentions deterministically
    const simulatedIntentions: IntentionTarget[] = [];
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.isYou) return { ...p, intention: target };
        // Deterministically assign intentions to simulated players
        const intention: IntentionTarget = random() < 0.5 ? 'heads' : 'tails';
        simulatedIntentions.push(intention);
        return { ...p, intention };
      })
    );

    // Store this round's intentions for reveal
    setRoundIntentions((prev) => [
      ...prev,
      {
        round: currentRound,
        userIntention: target,
        simulatedIntentions,
      },
    ]);
  };

  const executeFlip = async () => {
    setPhase('flip');
    setIsFlipping(true);

    // Calculate group intention
    const headsIntentions = players.filter((p) => p.intention === 'heads').length;
    const tailsIntentions = players.filter((p) => p.intention === 'tails').length;
    const groupIntention: IntentionTarget | null =
      headsIntentions > tailsIntentions ? 'heads' :
      tailsIntentions > headsIntentions ? 'tails' : null;

    try {
      // Retrieve stored nonce
      const storedNonce = localStorage.getItem(`quantum_coin_nonce_${commitmentId}`) || nonce;

      // Call backend to reveal this flip's outcome
      const revealResult = await apiService.revealQuantumCoinFlip({
        commitmentId,
        flipIndex: currentRound - 1,
        userIntention: myIntention || 'heads',
        nonce: storedNonce,
      });

      const outcome: 'heads' | 'tails' = revealResult.outcome;

      // Animate the flip (wait 2 seconds for animation)
      setTimeout(() => {
        setCurrentFlip(outcome);
        setIsFlipping(false);

        const result: FlipResult = {
          round: currentRound,
          outcome,
          headsCount: headsIntentions,
          tailsCount: tailsIntentions,
          groupIntention,
          aligned: groupIntention === outcome,
        };

        setFlipResults((prev) => [...prev, result]);

        // Continue to next round or finish
        setTimeout(() => {
          if (currentRound >= TOTAL_ROUNDS) {
            finalizeResults([...flipResults, result]);
          } else {
            setCurrentRound((prev) => prev + 1);
            setMyIntention(null);
            setCurrentFlip(null);
            setFocusTimer(5);
            setPhase('focusing');

            // Reset player intentions
            setPlayers((prev) =>
              prev.map((p) => ({ ...p, intention: null }))
            );
          }
        }, 2000);
      }, 2000);
    } catch (err) {
      // Fallback: continue with local random if API fails
      console.error('Flip reveal error:', err);
      const outcome: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';

      setTimeout(() => {
        setCurrentFlip(outcome);
        setIsFlipping(false);

        const result: FlipResult = {
          round: currentRound,
          outcome,
          headsCount: headsIntentions,
          tailsCount: tailsIntentions,
          groupIntention,
          aligned: groupIntention === outcome,
        };

        setFlipResults((prev) => [...prev, result]);

        setTimeout(() => {
          if (currentRound >= TOTAL_ROUNDS) {
            finalizeResults([...flipResults, result]);
          } else {
            setCurrentRound((prev) => prev + 1);
            setMyIntention(null);
            setCurrentFlip(null);
            setFocusTimer(5);
            setPhase('focusing');

            setPlayers((prev) =>
              prev.map((p) => ({ ...p, intention: null }))
            );
          }
        }, 2000);
      }, 2000);
    }
  };

  const finalizeResults = async (allResults: FlipResult[]) => {
    setPhase('results');
    setIsLoading(true);

    try {
      // Retrieve stored nonce
      const storedNonce = localStorage.getItem(`quantum_coin_nonce_${commitmentId}`) || nonce;

      // Call backend to finalize and verify results
      const finalResult = await apiService.finalizeQuantumCoinArena({
        commitmentId,
        roundIntentions: roundIntentions.map((ri) => ({
          round: ri.round,
          userIntention: ri.userIntention,
        })),
        nonce: storedNonce,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      const headsOutcomes = allResults.filter((r) => r.outcome === 'heads').length;
      const tailsOutcomes = allResults.filter((r) => r.outcome === 'tails').length;
      const groupAlignments = allResults.filter((r) => r.aligned).length;

      // Count how many times user's intention matched outcome
      const yourAlignments = roundIntentions.filter((ri, idx) => {
        if (idx < allResults.length) {
          return ri.userIntention === allResults[idx].outcome;
        }
        return false;
      }).length;

      // Determine performance label
      let performance = 'Average';
      const alignRate = (groupAlignments / TOTAL_ROUNDS) * 100;
      if (alignRate >= 70) performance = 'Exceptional';
      else if (alignRate >= 60) performance = 'Excellent';
      else if (alignRate >= 55) performance = 'Good';
      else if (alignRate < 40) performance = 'Below Average';

      // Determine significance label
      let significance = 'Not Significant';
      if (finalResult.chiSquare > 10.83) significance = 'Highly Significant (p < 0.001)';
      else if (finalResult.chiSquare > 6.63) significance = 'Very Significant (p < 0.01)';
      else if (finalResult.chiSquare > 3.84) significance = 'Significant (p < 0.05)';
      else if (finalResult.chiSquare > 2.71) significance = 'Marginally Significant (p < 0.10)';

      setResults({
        rounds: allResults,
        totalFlips: TOTAL_ROUNDS,
        headsOutcomes,
        tailsOutcomes,
        groupAlignments,
        yourAlignments,
        chiSquare: finalResult.chiSquare,
        effectSize: finalResult.effectSize,
        significance,
        performance,
        commitmentHash: finalResult.commitmentHash,
        verified: finalResult.verified,
      });

      // Submit to global feed
      await apiService.submitToFeed({
        experimentType: 'quantum-coin-arena',
        score: groupAlignments,
        accuracy: (groupAlignments / TOTAL_ROUNDS) * 100,
        baseline: BASELINE,
        commitmentHash: finalResult.commitmentHash,
        verified: finalResult.verified,
      });

      // Clean up stored nonce
      localStorage.removeItem(`quantum_coin_nonce_${commitmentId}`);

      setIsLoading(false);
      setPhase('success');
    } catch (err) {
      console.error('Finalize error:', err);
      // Fallback: calculate locally
      const headsOutcomes = allResults.filter((r) => r.outcome === 'heads').length;
      const tailsOutcomes = allResults.filter((r) => r.outcome === 'tails').length;
      const groupAlignments = allResults.filter((r) => r.aligned).length;

      const expected = TOTAL_ROUNDS / 2;
      const chiSquare =
        Math.pow(headsOutcomes - expected, 2) / expected +
        Math.pow(tailsOutcomes - expected, 2) / expected;

      const observedRate = groupAlignments / TOTAL_ROUNDS;
      const effectSize = (observedRate - 0.5) / 0.5;

      let significance = 'Not Significant';
      if (chiSquare > 10.83) significance = 'Highly Significant (p < 0.001)';
      else if (chiSquare > 6.63) significance = 'Very Significant (p < 0.01)';
      else if (chiSquare > 3.84) significance = 'Significant (p < 0.05)';
      else if (chiSquare > 2.71) significance = 'Marginally Significant (p < 0.10)';

      let performance = 'Average';
      const alignRate = (groupAlignments / TOTAL_ROUNDS) * 100;
      if (alignRate >= 70) performance = 'Exceptional';
      else if (alignRate >= 60) performance = 'Excellent';
      else if (alignRate >= 55) performance = 'Good';
      else if (alignRate < 40) performance = 'Below Average';

      setResults({
        rounds: allResults,
        totalFlips: TOTAL_ROUNDS,
        headsOutcomes,
        tailsOutcomes,
        groupAlignments,
        yourAlignments: 0,
        chiSquare,
        effectSize,
        significance,
        performance,
      });

      setIsLoading(false);
      setPhase('success');
    }
  };

  const progressPercent = (currentRound / TOTAL_ROUNDS) * 100;
  const headsIntentions = players.filter((p) => p.intention === 'heads').length;
  const tailsIntentions = players.filter((p) => p.intention === 'tails').length;

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
              <div className="bg-gradient-to-br from-cyan-900/30 to-teal-900/30 rounded-2xl border border-cyan-500/30 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-cyan-500/20 rounded-xl">
                    <Coins className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Quantum Coin Arena</h1>
                    <p className="text-cyan-300">Multiplayer Psychokinesis Experiment</p>
                  </div>
                </div>

                <div className="space-y-4 text-slate-300 mb-8">
                  <p>
                    Join other researchers in a collective psychokinesis experiment. Together,
                    focus your intention on influencing quantum-random coin flips!
                  </p>

                  <div className="bg-[#060a0f]/30 rounded-xl p-4 border border-cyan-500/20">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-400" />
                      How It Works
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">1.</span>
                        <span>Join an arena with 3-8 players</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">2.</span>
                        <span>Each round, choose heads or tails to focus on</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">3.</span>
                        <span>Group intention is determined by majority</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">4.</span>
                        <span>20 flips total - can collective will influence randomness?</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <h3 className="font-semibold text-cyan-300 mb-2">The Science</h3>
                    <p className="text-sm text-slate-400">
                      This experiment tests the Global Consciousness hypothesis - whether
                      collective human intention can influence random events. Chi-square
                      analysis measures statistical deviation from chance.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <button
                  onClick={startLobby}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white py-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Enter the Arena
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* LOBBY PHASE */}
          {phase === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#0f1520]/80 rounded-2xl border border-[#1a2535] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-cyan-400" />
                    Arena Lobby
                  </h2>
                  <span className="text-cyan-400">{players.length} researchers</span>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
                    <p className="text-slate-400">Finding other researchers...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {players.map((player) => (
                        <div
                          key={player.id}
                          className={`p-3 rounded-xl border ${
                            player.isYou
                              ? 'bg-cyan-500/20 border-cyan-500'
                              : 'bg-[#0a1018] border-[#1a2535]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                player.isYou ? 'bg-cyan-500' : 'bg-[#1a2535]'
                              }`}
                            >
                              <span className="text-xs font-bold">
                                {player.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${player.isYou ? 'text-cyan-400' : 'text-slate-300'}`}>
                                {player.isYou ? 'You' : player.name.split('_')[0]}
                              </p>
                              {player.isYou && (
                                <p className="text-xs text-slate-500">Ready</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={startMeditation}
                      className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white py-3 rounded-xl font-semibold transition-all"
                    >
                      Start Experiment
                    </button>
                  </>
                )}
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
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin" />
                  <Activity className="absolute inset-0 m-auto w-10 h-10 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Synchronizing...</h2>
                <p className="text-slate-400 max-w-md">
                  Connecting with other researchers. Prepare to focus your collective intention.
                </p>
              </div>
            </motion.div>
          )}

          {/* FOCUSING & FLIP PHASES */}
          {(phase === 'focusing' || phase === 'flip') && (
            <motion.div
              key="focusing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress */}
              <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Round {currentRound} of {TOTAL_ROUNDS}</span>
                  <span className="text-cyan-400">
                    {flipResults.filter((r) => r.aligned).length} alignments
                  </span>
                </div>
                <div className="h-2 bg-[#142030] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Coin display */}
              <div className="bg-[#0f1520]/30 rounded-2xl border border-[#1a2535] p-8">
                <div className="text-center space-y-6">
                  {/* Coin */}
                  <div className="relative w-40 h-40 mx-auto">
                    <motion.div
                      className={`absolute inset-0 rounded-full border-4 ${
                        isFlipping
                          ? 'border-cyan-400'
                          : currentFlip
                          ? currentFlip === 'heads'
                            ? 'border-yellow-400 bg-yellow-500/20'
                            : 'border-gray-400 bg-gray-500/20'
                          : 'border-gray-600'
                      } flex items-center justify-center`}
                      animate={
                        isFlipping
                          ? { rotateY: [0, 180, 360, 540, 720] }
                          : {}
                      }
                      transition={{ duration: 2, ease: 'easeInOut' }}
                    >
                      {isFlipping ? (
                        <Coins className="w-16 h-16 text-cyan-400 animate-pulse" />
                      ) : currentFlip ? (
                        <span className={`text-4xl font-bold ${
                          currentFlip === 'heads' ? 'text-yellow-400' : 'text-slate-400'
                        }`}>
                          {currentFlip === 'heads' ? 'H' : 'T'}
                        </span>
                      ) : (
                        <span className="text-4xl text-slate-600">?</span>
                      )}
                    </motion.div>
                  </div>

                  {phase === 'focusing' && (
                    <>
                      {/* Timer */}
                      <div className="text-3xl font-mono font-bold text-cyan-400">
                        {focusTimer}s
                      </div>

                      {/* Intention buttons */}
                      <div className="flex justify-center gap-6">
                        <motion.button
                          onClick={() => setIntention('heads')}
                          className={`w-28 h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                            myIntention === 'heads'
                              ? 'bg-yellow-500/30 border-yellow-500 text-yellow-400'
                              : 'bg-[#142030] border-[#1a2535] text-slate-400 hover:border-yellow-500/50'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-3xl font-bold">H</span>
                          <span className="text-sm">Heads</span>
                        </motion.button>

                        <motion.button
                          onClick={() => setIntention('tails')}
                          className={`w-28 h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                            myIntention === 'tails'
                              ? 'bg-gray-500/30 border-gray-400 text-slate-300'
                              : 'bg-[#142030] border-[#1a2535] text-slate-400 hover:border-gray-400/50'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-3xl font-bold">T</span>
                          <span className="text-sm">Tails</span>
                        </motion.button>
                      </div>

                      {/* Group intention display */}
                      <div className="flex justify-center gap-8 text-sm">
                        <div className="text-center">
                          <div className="text-yellow-400 font-semibold text-xl">{headsIntentions}</div>
                          <div className="text-slate-500">for Heads</div>
                        </div>
                        <div className="text-center">
                          <div className="text-slate-400 font-semibold text-xl">{tailsIntentions}</div>
                          <div className="text-slate-500">for Tails</div>
                        </div>
                      </div>
                    </>
                  )}

                  {phase === 'flip' && !isFlipping && currentFlip && (
                    <div className="space-y-4">
                      <p className={`text-2xl font-bold ${
                        currentFlip === 'heads' ? 'text-yellow-400' : 'text-slate-400'
                      }`}>
                        {currentFlip.toUpperCase()}!
                      </p>
                      {flipResults[flipResults.length - 1]?.aligned && (
                        <p className="text-green-400">Group intention aligned!</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent results */}
              <div className="bg-[#0f1520]/30 rounded-xl border border-[#1a2535] p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Flips</h3>
                <div className="flex gap-2 flex-wrap">
                  {flipResults.slice(-10).map((r, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        r.aligned
                          ? 'bg-green-500/30 border border-green-500 text-green-400'
                          : 'bg-[#142030] border border-[#1a2535] text-slate-500'
                      }`}
                    >
                      {r.outcome === 'heads' ? 'H' : 'T'}
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
              <Loader2 className="w-16 h-16 animate-spin text-cyan-500 mb-4" />
              <p className="text-xl text-slate-300">Analyzing collective influence...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULTS MODAL */}
        <RevealModal
          isOpen={phase === 'success' && results !== null}
          onClose={() => {}}
          onConfirm={() => (window.location.href = '/experiments')}
          title="Arena Session Complete!"
          experimentType="Quantum Coin Arena (PK)"
          confirmText="Return to Experiments"
          showVerification={true}
          verificationData={{
            commitmentId,
            nonce,
            timestamp: new Date().toISOString(),
          }}
        >
          {results && (
            <div className="space-y-6">
              <StatsSummary
                stats={[
                  {
                    label: 'Group Alignments',
                    value: `${results.groupAlignments}/${results.totalFlips}`,
                    trend: results.groupAlignments > results.totalFlips / 2 ? 'up' : 'neutral',
                  },
                  {
                    label: 'Heads/Tails',
                    value: `${results.headsOutcomes}/${results.tailsOutcomes}`,
                    trend: 'neutral',
                  },
                  {
                    label: 'Chi-Square',
                    value: results.chiSquare.toFixed(2),
                    trend: results.chiSquare > 3.84 ? 'up' : 'neutral',
                  },
                  {
                    label: 'Performance',
                    value: results.performance,
                    trend: results.groupAlignments > results.totalFlips * 0.55 ? 'up' : 'neutral',
                  },
                ]}
              />

              {/* Visual result strip */}
              <div className="bg-[#0a1018] rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3">All Flips</h3>
                <div className="flex gap-1 flex-wrap">
                  {results.rounds.map((r, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        r.aligned
                          ? 'bg-green-500/30 border border-green-500 text-green-400'
                          : 'bg-[#142030] border border-[#1a2535] text-slate-500'
                      }`}
                    >
                      {r.outcome === 'heads' ? 'H' : 'T'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistical analysis */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-cyan-300 mb-2">Chi-Square Analysis</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>Expected: 50/50 distribution (10 heads, 10 tails)</p>
                  <p>Observed: {results.headsOutcomes} heads, {results.tailsOutcomes} tails</p>
                  <p>Chi-Square statistic: {results.chiSquare.toFixed(3)}</p>
                  <p className={results.chiSquare > 3.84 ? 'text-green-400' : 'text-slate-400'}>
                    {results.significance}
                  </p>
                </div>
              </div>

              <div className="text-sm text-slate-500 text-center">
                <p>
                  Group alignment rate: {((results.groupAlignments / results.totalFlips) * 100).toFixed(1)}%
                  (baseline: 50%)
                </p>
              </div>
            </div>
          )}
        </RevealModal>
      </main>
    </div>
  );
}
