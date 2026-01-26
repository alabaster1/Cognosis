'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/useWalletStore';
import RevealModal, { StatsSummary } from '@/components/modals/RevealModal';
import {
  Loader2,
  Zap,
  Clock,
  Trophy,
  Circle,
  Square,
  Triangle,
  Heart,
  Timer,
  TrendingUp,
} from 'lucide-react';

type Phase = 'intro' | 'meditation' | 'playing' | 'feedback' | 'results' | 'success';

// Symbol options for the game
const SYMBOLS = [
  { id: 0, name: 'circle', icon: Circle, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500' },
  { id: 1, name: 'square', icon: Square, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500' },
  { id: 2, name: 'triangle', icon: Triangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
  { id: 3, name: 'heart', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500' },
];

interface PredictionData {
  round: number;
  prediction: number;
  reactionTime: number;
}

interface RoundResult {
  round: number;
  prediction: number;
  actual: number;
  correct: boolean;
  reactionTime: number;
}

interface Results {
  rounds: RoundResult[];
  hits: number;
  total: number;
  accuracy: number;
  baseline: number;
  difference: number;
  averageReactionTime: number;
  fastestTime: number;
  performance: string;
  pValue: number;
  commitmentHash: string;
}

const TOTAL_ROUNDS = 30;
const TIME_LIMIT_MS = 2000; // 2 seconds per round
const BASELINE = 25; // 25% (1 in 4 symbols)

export default function TimelineRacerPage() {
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [nonce, setNonce] = useState('');
  const [commitmentHash, setCommitmentHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Game state
  const [currentRound, setCurrentRound] = useState(1);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(TIME_LIMIT_MS);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [results, setResults] = useState<Results | null>(null);
  const [lastPrediction, setLastPrediction] = useState<PredictionData | null>(null);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (phase !== 'playing') return;

    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 100;
        if (newTime <= 0) {
          // Time's up - auto-submit as timeout (-1)
          handleTimeout();
          return TIME_LIMIT_MS;
        }
        return newTime;
      });
    }, 100);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase, currentRound]);

  const startMeditation = async () => {
    setPhase('meditation');
    setIsLoading(true);
    setError('');
    setPredictions([]);
    setCurrentRound(1);

    try {
      // Generate targets on backend - cryptographically committed
      const result = await apiService.generateTimelineRacerTarget({
        totalRounds: TOTAL_ROUNDS,
        symbolCount: SYMBOLS.length,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.commitmentId);
      setNonce(result.nonce);
      setCommitmentHash(result.commitmentHash);
      localStorage.setItem(`timeline_racer_nonce_${result.commitmentId}`, result.nonce);

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setPhase('intro');
      setIsLoading(false);
    }
  };

  const startGame = () => {
    setCurrentRound(1);
    setPredictions([]);
    setTimeRemaining(TIME_LIMIT_MS);
    setRoundStartTime(Date.now());
    setPhase('playing');
  };

  const handleTimeout = () => {
    const predictionData: PredictionData = {
      round: currentRound,
      prediction: -1, // -1 indicates timeout
      reactionTime: TIME_LIMIT_MS,
    };

    processRoundResult(predictionData);
  };

  const handlePrediction = (symbolId: number) => {
    if (phase !== 'playing') return;

    const reactionTime = Date.now() - roundStartTime;

    const predictionData: PredictionData = {
      round: currentRound,
      prediction: symbolId,
      reactionTime,
    };

    processRoundResult(predictionData);
  };

  const processRoundResult = (predictionData: PredictionData) => {
    // Clear timers
    if (countdownRef.current) clearInterval(countdownRef.current);

    setPredictions((prev) => [...prev, predictionData]);
    setLastPrediction(predictionData);
    setPhase('feedback');

    // Show feedback briefly, then continue
    setTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS) {
        calculateFinalResults([...predictions, predictionData]);
      } else {
        setCurrentRound((prev) => prev + 1);
        setTimeRemaining(TIME_LIMIT_MS);
        setRoundStartTime(Date.now());
        setPhase('playing');
      }
    }, 500);
  };

  const calculateFinalResults = async (allPredictions: PredictionData[]) => {
    setPhase('results');
    setIsLoading(true);

    try {
      // Call backend to reveal targets and calculate results
      const revealResult = await apiService.revealTimelineRacer({
        commitmentId,
        predictions: allPredictions.map((p) => ({
          round: p.round,
          prediction: p.prediction,
          reactionTime: p.reactionTime,
        })),
        nonce,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      const validTimes = revealResult.rounds
        .filter((r) => r.prediction !== -1)
        .map((r) => r.reactionTime);
      const fastestTime = validTimes.length > 0 ? Math.min(...validTimes) : TIME_LIMIT_MS;

      setResults({
        rounds: revealResult.rounds,
        hits: revealResult.hits,
        total: revealResult.total,
        accuracy: revealResult.accuracy,
        baseline: revealResult.baseline,
        difference: revealResult.difference,
        averageReactionTime: revealResult.averageReactionTime,
        fastestTime,
        performance: revealResult.performance,
        pValue: revealResult.pValue,
        commitmentHash,
      });

      // Submit to feed
      try {
        await apiService.submitToFeed({
          experimentType: 'timeline-racer',
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

  const getSymbolById = (id: number) => SYMBOLS.find((s) => s.id === id) || SYMBOLS[0];
  const progressPercent = (currentRound / TOTAL_ROUNDS) * 100;
  const timePercent = (timeRemaining / TIME_LIMIT_MS) * 100;

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
              exit={{ opacity: 0, x: -50 }}
              className="relative"
            >
              {/* Speed lines background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
                    style={{
                      top: `${15 + i * 10}%`,
                      width: '120%',
                      left: '-10%',
                    }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{
                      duration: 1.5 + i * 0.3,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 text-center pt-6 pb-4">
                {/* Countdown ring */}
                <motion.div
                  className="inline-flex items-center justify-center w-28 h-28 mb-6 relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                >
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="3" />
                    <motion.circle
                      cx="50" cy="50" r="44" fill="none" stroke="url(#timerGrad)" strokeWidth="3"
                      strokeDasharray="276.5"
                      animate={{ strokeDashoffset: [276.5, 0, 276.5] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="timerGrad">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="flex flex-col items-center">
                    <Zap className="w-8 h-8 text-amber-400" />
                    <span className="text-[10px] text-amber-400/60 font-mono mt-1">2.0s</span>
                  </div>
                </motion.div>

                <motion.h1
                  className="text-5xl md:text-7xl font-black tracking-tighter mb-2"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-400 bg-clip-text text-transparent">
                    TIMELINE
                  </span>
                </motion.h1>
                <motion.h2
                  className="text-2xl md:text-3xl font-black tracking-[0.4em] text-white/60 uppercase"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                >
                  RACER
                </motion.h2>

                <motion.div
                  className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 text-xs font-medium">Speed Precognition</span>
                </motion.div>
              </div>

              {/* Symbol race track */}
              <motion.div
                className="my-8 relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <div className="flex justify-center items-center gap-2 py-6 px-4 rounded-xl bg-[#080c12] border border-amber-500/10 relative overflow-hidden">
                  {/* Track lines */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                  </div>

                  {SYMBOLS.map((symbol, i) => (
                    <motion.div
                      key={symbol.id}
                      className={`relative z-10 p-4 md:p-5 rounded-2xl ${symbol.bg} border-2 ${symbol.border} cursor-default`}
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
                      whileHover={{
                        scale: 1.15,
                        y: -5,
                        boxShadow: `0 10px 30px ${symbol.id === 0 ? 'rgba(59,130,246,0.3)' : symbol.id === 1 ? 'rgba(34,197,94,0.3)' : symbol.id === 2 ? 'rgba(234,179,8,0.3)' : 'rgba(236,72,153,0.3)'}`,
                      }}
                    >
                      <symbol.icon className={`w-8 h-8 md:w-10 md:h-10 ${symbol.color}`} />
                      <motion.div
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white/60"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Race stats */}
                <div className="flex justify-between mt-3 px-1">
                  <span className="text-[10px] text-slate-600 font-mono">{TOTAL_ROUNDS} ROUNDS</span>
                  <span className="text-[10px] text-slate-600 font-mono">BASELINE 25%</span>
                </div>
              </motion.div>

              {/* Quick rules */}
              <motion.div
                className="grid grid-cols-3 gap-2 mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/10">
                  <Timer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-[11px] text-slate-400">2s per round</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/10">
                  <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-[11px] text-slate-400">Speed matters</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/10">
                  <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-[11px] text-slate-400">Beat 25%</div>
                </div>
              </motion.div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* CTA */}
              <motion.button
                onClick={startMeditation}
                disabled={isLoading}
                className="w-full relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-red-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <div className="relative px-8 py-5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      Race the Timeline
                    </>
                  )}
                </div>
              </motion.button>
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
                      <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin" />
                      <Zap className="absolute inset-0 m-auto w-10 h-10 text-amber-400" />
                    </div>
                    <p className="text-xl text-slate-300">Generating timeline on blockchain...</p>
                    <p className="text-sm text-slate-500">30 symbols being cryptographically committed</p>
                  </>
                ) : (
                  <>
                    <div className="p-6 bg-amber-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <Zap className="w-12 h-12 text-amber-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Ready to Race!</h2>
                    <p className="text-slate-400 max-w-md">
                      30 symbols have been committed to the blockchain. Trust your first instinct -
                      speed is key! Results will be revealed at the end.
                    </p>
                    <div className="text-xs text-slate-600 font-mono break-all max-w-md">
                      Commitment: {commitmentHash.slice(0, 20)}...
                    </div>
                    <button
                      onClick={startGame}
                      className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                    >
                      Start Racing!
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* PLAYING PHASE */}
          {(phase === 'playing' || phase === 'feedback') && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Progress & Timer */}
              <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Round {currentRound} of {TOTAL_ROUNDS}</span>
                  <span className="text-slate-400">
                    Predictions: {predictions.length}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-[#142030] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                  />
                </div>
                {/* Timer bar */}
                <div className="h-3 bg-[#142030] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full transition-all ${
                      timePercent > 50 ? 'bg-green-500' : timePercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${timePercent}%` }}
                  />
                </div>
              </div>

              {/* Feedback Display */}
              {phase === 'feedback' && lastPrediction && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8 rounded-2xl border-2 bg-amber-500/20 border-amber-500"
                >
                  <div className="text-4xl mb-2">
                    {lastPrediction.prediction === -1 ? '⏱️' : '✓'}
                  </div>
                  <p className="text-xl font-bold text-amber-400">
                    {lastPrediction.prediction === -1 ? 'TIMEOUT' : 'Locked In!'}
                  </p>
                  <div className="flex justify-center items-center gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 uppercase">Your Pick</p>
                      {lastPrediction.prediction !== -1 ? (
                        (() => {
                          const sym = getSymbolById(lastPrediction.prediction);
                          return <sym.icon className={`w-8 h-8 mx-auto ${sym.color}`} />;
                        })()
                      ) : (
                        <Clock className="w-8 h-8 mx-auto text-slate-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    {lastPrediction.reactionTime}ms
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    (Results revealed after all rounds)
                  </p>
                </motion.div>
              )}

              {/* Symbol Selection */}
              {phase === 'playing' && (
                <>
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      What symbol comes NEXT?
                    </h2>
                    <p className="text-slate-400">Trust your instinct - be fast!</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    {SYMBOLS.map((symbol) => (
                      <motion.button
                        key={symbol.id}
                        onClick={() => handlePrediction(symbol.id)}
                        className={`p-8 rounded-2xl border-2 ${symbol.border} ${symbol.bg} hover:scale-105 transition-all`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <symbol.icon className={`w-16 h-16 mx-auto ${symbol.color}`} />
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
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
              <Loader2 className="w-16 h-16 animate-spin text-amber-500 mb-4" />
              <p className="text-xl text-slate-300">Revealing timeline from blockchain...</p>
              <p className="text-sm text-slate-500 mt-2">Verifying cryptographic commitment</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULTS MODAL */}
        <RevealModal
          isOpen={phase === 'success' && results !== null}
          onClose={() => {}}
          onConfirm={() => (window.location.href = '/experiments')}
          title="Timeline Racer Complete!"
          experimentType="Timeline Racer (Precognition)"
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
                    label: 'Hits',
                    value: `${results.hits}/${results.total}`,
                    trend: results.difference > 0 ? 'up' : results.difference < 0 ? 'down' : 'neutral',
                  },
                  {
                    label: 'Accuracy',
                    value: `${results.accuracy.toFixed(1)}%`,
                    trend: results.accuracy > BASELINE ? 'up' : 'neutral',
                  },
                  {
                    label: 'Avg Speed',
                    value: `${results.averageReactionTime.toFixed(0)}ms`,
                    trend: results.averageReactionTime < 1000 ? 'up' : 'neutral',
                  },
                  {
                    label: 'Fastest',
                    value: `${results.fastestTime}ms`,
                    trend: 'up',
                  },
                ]}
              />

              {/* Performance breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a1018] rounded-xl p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">vs Baseline</p>
                  <p
                    className={`text-2xl font-bold ${
                      results.difference > 0 ? 'text-green-400' : results.difference < 0 ? 'text-red-400' : 'text-slate-400'
                    }`}
                  >
                    {results.difference >= 0 ? '+' : ''}
                    {results.difference.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0a1018] rounded-xl p-4 text-center">
                  <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Performance</p>
                  <p className="text-2xl font-bold text-white">{results.performance}</p>
                </div>
              </div>

              {/* Recent rounds */}
              <div className="bg-[#0a1018] rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3">Round Results</h3>
                <div className="flex flex-wrap gap-1">
                  {results.rounds.slice(-20).map((round, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                        round.correct
                          ? 'bg-green-500/30 text-green-400'
                          : 'bg-red-500/30 text-red-400'
                      }`}
                    >
                      {round.correct ? '✓' : '✗'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistical significance */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-amber-300 mb-2">Statistical Analysis</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>Baseline expectation: {BASELINE}% (random guessing)</p>
                  <p>Your accuracy: {results.accuracy.toFixed(1)}%</p>
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
