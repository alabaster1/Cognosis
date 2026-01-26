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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="relative"
            >
              {/* Quantum particle field */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-cyan-400"
                    initial={{
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`,
                      opacity: 0,
                    }}
                    animate={{
                      opacity: [0, 0.6, 0],
                      scale: [0, 1.5, 0],
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`,
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 3,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 text-center pt-6">
                {/* Spinning coin */}
                <motion.div
                  className="inline-flex items-center justify-center w-28 h-28 mb-6 relative"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  style={{ perspective: '600px' }}
                >
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 shadow-[0_0_40px_rgba(34,211,238,0.4)] flex items-center justify-center border-4 border-cyan-300/30">
                    <Coins className="w-10 h-10 text-[#0a0e14]" />
                  </div>
                </motion.div>

                <motion.h1
                  className="text-4xl md:text-6xl font-black mb-1"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-400 bg-clip-text text-transparent">
                    QUANTUM
                  </span>
                </motion.h1>
                <motion.h2
                  className="text-2xl md:text-3xl font-black tracking-[0.2em] text-white/70 mb-1"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  COIN ARENA
                </motion.h2>

                <motion.div
                  className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-300 text-xs font-medium">Collective Psychokinesis</span>
                </motion.div>

                <motion.p
                  className="text-slate-400 max-w-sm mx-auto text-sm mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Unite minds to bend probability. Can collective intention
                  influence quantum-random events?
                </motion.p>
              </div>

              {/* Arena visualization */}
              <motion.div
                className="relative w-56 h-56 mx-auto my-8"
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.8 }}
              >
                {/* Central coin */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="w-14 h-14 rounded-full bg-[#0a0e14] border-2 border-cyan-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                    animate={{ boxShadow: ['0 0 10px rgba(34,211,238,0.1)', '0 0 30px rgba(34,211,238,0.4)', '0 0 10px rgba(34,211,238,0.1)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-cyan-400 font-bold text-lg">H/T</span>
                  </motion.div>
                </div>

                {/* Player nodes in circle */}
                {[...Array(6)].map((_, i) => {
                  const angle = (i / 6) * 360 - 90;
                  const rad = (angle * Math.PI) / 180;
                  const radius = 90;
                  const x = Math.cos(rad) * radius;
                  const y = Math.sin(rad) * radius;

                  return (
                    <motion.div
                      key={i}
                      className="absolute left-1/2 top-1/2"
                      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.9 + i * 0.1, type: 'spring' }}
                    >
                      <motion.div
                        className="w-9 h-9 rounded-full bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center"
                        animate={{ borderColor: ['rgba(34,211,238,0.4)', 'rgba(34,211,238,0.8)', 'rgba(34,211,238,0.4)'] }}
                        transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                      >
                        <Users className="w-4 h-4 text-cyan-400/70" />
                      </motion.div>
                      {/* Connection line to center */}
                      <svg className="absolute top-1/2 left-1/2 w-0 h-0 overflow-visible pointer-events-none">
                        <motion.line
                          x1="0" y1="0"
                          x2={-x} y2={-y}
                          stroke="rgba(34,211,238,0.15)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          animate={{ strokeOpacity: [0.1, 0.3, 0.1] }}
                          transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                        />
                      </svg>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Stats */}
              <motion.div
                className="grid grid-cols-3 gap-3 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <div className="text-center p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/15">
                  <div className="text-2xl font-bold text-cyan-400">3-8</div>
                  <div className="text-[10px] text-slate-500 uppercase">Players</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/15">
                  <div className="text-2xl font-bold text-teal-400">20</div>
                  <div className="text-[10px] text-slate-500 uppercase">Flips</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/15">
                  <div className="text-2xl font-bold text-cyan-300">50%</div>
                  <div className="text-[10px] text-slate-500 uppercase">Baseline</div>
                </div>
              </motion.div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* CTA */}
              <motion.button
                onClick={startLobby}
                disabled={isLoading}
                className="w-full relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <div className="relative px-8 py-5 bg-gradient-to-r from-cyan-600 to-teal-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Enter the Arena
                    </>
                  )}
                </div>
              </motion.button>

              <motion.p
                className="text-center text-slate-600 text-xs mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                Global Consciousness hypothesis testing
              </motion.p>
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
