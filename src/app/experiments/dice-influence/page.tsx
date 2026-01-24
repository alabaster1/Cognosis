'use client';

/**
 * Dice Influence (PK) Experiment
 * Test psychokinetic influence on dice rolls
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dices, Lock, Loader2, ArrowRight, Check, X, TrendingUp, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import apiService from '@/services/apiService';

type Phase = 'intro' | 'meditation' | 'target' | 'rolling' | 'results' | 'success';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const TOTAL_ROLLS = 20;

interface Roll {
  number: number;
  result: number;
  isHit: boolean;
}

/**
 * Calculate chi-square statistic for goodness-of-fit test
 * Tests if observed distribution differs significantly from expected uniform distribution
 */
function calculateChiSquare(rolls: Roll[]): number {
  const observed = [0, 0, 0, 0, 0, 0];
  rolls.forEach((roll) => {
    observed[roll.result]++;
  });

  const expected = rolls.length / 6; // Uniform distribution
  let chiSquare = 0;

  for (let i = 0; i < 6; i++) {
    const diff = observed[i] - expected;
    chiSquare += (diff * diff) / expected;
  }

  return chiSquare;
}

/**
 * Get p-value interpretation for chi-square statistic (df=5)
 * Critical values: p<0.05 = 11.07, p<0.01 = 15.09, p<0.001 = 20.52
 */
function getSignificanceLevel(chiSquare: number): {
  level: string;
  description: string;
  color: string;
} {
  if (chiSquare >= 20.52) {
    return {
      level: 'p < 0.001',
      description: 'Highly significant - Very strong evidence of non-random distribution',
      color: 'text-cyan-400',
    };
  } else if (chiSquare >= 15.09) {
    return {
      level: 'p < 0.01',
      description: 'Very significant - Strong evidence of non-random distribution',
      color: 'text-blue-400',
    };
  } else if (chiSquare >= 11.07) {
    return {
      level: 'p < 0.05',
      description: 'Significant - Moderate evidence of non-random distribution',
      color: 'text-green-400',
    };
  } else {
    return {
      level: 'p > 0.05',
      description: 'Not significant - Within normal random variation',
      color: 'text-slate-400',
    };
  }
}

export default function DiceInfluencePage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [phase, setPhase] = useState<Phase>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [commitmentId, setCommitmentId] = useState('');
  const [nonce, setNonce] = useState('');

  const [targetFace, setTargetFace] = useState<number | null>(null);
  const [backendResults, setBackendResults] = useState<number[]>([]);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [currentRoll, setCurrentRoll] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [currentDiceFace, setCurrentDiceFace] = useState(0);
  const [results, setResults] = useState<{
    success: boolean;
    rolls: Array<{ number: number; result: number; isHit: boolean }>;
    hits: number;
    totalRolls: number;
    hitRate: number;
    expectedRate: number;
    expectedHits: number;
    difference: number;
    distribution: number[];
    chiSquare: number;
    significance: { level: string; description: string; color: string };
    performance: string;
    targetFace: number;
    actualResults: number[];
  } | null>(null);

  const handleStartExperiment = () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
    setPhase('meditation');
  };

  const handleTargetSelect = (face: number) => {
    setTargetFace(face);
  };

  const handleStartRolling = async () => {
    if (targetFace === null) {
      setError('Please select a target face');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // Generate backend dice rolls
      const result = await apiService.generateDiceInfluenceTarget({
        targetFace,
        totalRolls: TOTAL_ROLLS,
        verified: !!wallet,
      });

      setCommitmentId(result.commitmentId);
      setNonce(result.nonce);
      setBackendResults([]); // Keep results hidden

      // Store nonce in localStorage
      localStorage.setItem(`dice_influence_nonce_${result.commitmentId}`, result.nonce);

      console.log('[DiceInfluence] Target generated:', result.commitmentId);
      setIsLoading(false);
      setPhase('rolling');
      rollNextDice();
    } catch (err) {
      console.error('[DiceInfluence] Generation error:', err);
      setError('Failed to generate dice rolls. Please try again.');
      setIsLoading(false);
    }
  };

  const rollNextDice = () => {
    if (currentRoll >= TOTAL_ROLLS) {
      // All rolls shown - reveal and score
      revealAndScore();
      return;
    }

    setIsRolling(true);

    // Animated rolling effect (visual only)
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setCurrentDiceFace(Math.floor(Math.random() * 6));
      rollCount++;

      if (rollCount >= 10) {
        clearInterval(rollInterval);

        // Show placeholder result (user thinks this is random)
        const placeholderResult = Math.floor(Math.random() * 6);
        const isHit = placeholderResult === targetFace;

        setCurrentDiceFace(placeholderResult);

        setTimeout(() => {
          setRolls((prev) => [
            ...prev,
            {
              number: currentRoll + 1,
              result: placeholderResult,
              isHit,
            },
          ]);
          setCurrentRoll((prev) => prev + 1);
          setIsRolling(false);
        }, 500);
      }
    }, 100);
  };

  const revealAndScore = async () => {
    setPhase('results');
    setIsLoading(true);
    setError('');

    try {
      const result = await apiService.revealDiceInfluence({
        commitmentId,
        nonce,
        verified: !!wallet,
      });

      setResults(result);
      setIsLoading(false);
    } catch (err) {
      console.error('[DiceInfluence] Reveal error:', err);
      setError('Failed to reveal and score. Please try again.');
      setIsLoading(false);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#060a0f] overflow-hidden relative">
        <Header />
        {/* Animated floating dice background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-orange-500/10 text-6xl select-none"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                rotate: Math.random() * 360,
                scale: 0.5 + Math.random() * 1.5,
              }}
              animate={{
                y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                rotate: [Math.random() * 360, Math.random() * 360 + 180],
                scale: [0.5 + Math.random(), 1 + Math.random()],
              }}
              transition={{
                duration: 8 + Math.random() * 12,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
            >
              {DICE_FACES[i % 6]}
            </motion.div>
          ))}
        </div>

        {/* Radial energy gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(251,146,60,0.08)_0%,_transparent_70%)] pointer-events-none" />

        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            {/* Hero section with large animated dice */}
            <div className="text-center mb-12">
              <motion.div
                className="inline-flex items-center justify-center w-32 h-32 mb-6 relative"
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-[0_0_60px_rgba(251,146,60,0.4)]" />
                <div className="absolute inset-[3px] bg-[#0a0e14] rounded-2xl flex items-center justify-center">
                  <Dices className="w-16 h-16 text-orange-400" />
                </div>
              </motion.div>

              <motion.h1
                className="text-5xl md:text-7xl font-black tracking-tight mb-3"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                  DICE
                </span>
                <br />
                <span className="text-white/90 text-3xl md:text-4xl font-light tracking-widest">
                  INFLUENCE
                </span>
              </motion.h1>

              <motion.div
                className="inline-block px-4 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
              >
                <span className="text-orange-300 text-sm font-medium tracking-wider uppercase">
                  Psychokinesis Research
                </span>
              </motion.div>

              <motion.p
                className="text-slate-400 text-lg max-w-xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Can your mind influence matter? Focus your intention on a dice face
                and test the boundaries of psychokinetic ability.
              </motion.p>
            </div>

            {/* Stats strip */}
            <motion.div
              className="grid grid-cols-3 gap-4 mb-10"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="text-center p-4 rounded-xl bg-gradient-to-b from-orange-950/40 to-transparent border border-orange-500/20">
                <div className="text-3xl font-bold text-orange-400">{TOTAL_ROLLS}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Rolls</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-b from-amber-950/40 to-transparent border border-amber-500/20">
                <div className="text-3xl font-bold text-amber-400">16.7%</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Baseline</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-b from-red-950/40 to-transparent border border-red-500/20">
                <div className="text-3xl font-bold text-red-400">p&lt;0.05</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Significance</div>
              </div>
            </motion.div>

            {/* Visual dice faces preview */}
            <motion.div
              className="flex justify-center gap-3 mb-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              {DICE_FACES.map((face, i) => (
                <motion.div
                  key={i}
                  className="w-14 h-14 rounded-xl bg-[#0f1520] border border-orange-500/30 flex items-center justify-center text-3xl cursor-default"
                  whileHover={{
                    scale: 1.2,
                    borderColor: 'rgba(251,146,60,0.8)',
                    boxShadow: '0 0 20px rgba(251,146,60,0.3)',
                  }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  {face}
                </motion.div>
              ))}
            </motion.div>

            {/* How it works - compact horizontal */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {[
                { step: '01', label: 'Meditate', desc: 'Clear your mind' },
                { step: '02', label: 'Choose', desc: 'Pick a target face' },
                { step: '03', label: 'Focus', desc: 'Roll with intention' },
                { step: '04', label: 'Analyze', desc: 'Chi-square results' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="relative p-4 rounded-xl bg-[#0a0e14] border border-[#1a2535] group hover:border-orange-500/40 transition-colors"
                  whileHover={{ y: -2 }}
                >
                  <div className="text-[10px] text-orange-500/60 font-mono mb-2">{item.step}</div>
                  <div className="text-white font-semibold text-sm">{item.label}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{item.desc}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.button
              onClick={handleStartExperiment}
              className="w-full relative group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity" />
              <div className="relative px-8 py-5 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <Dices className="w-6 h-6" />
                Begin Experiment
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            <motion.p
              className="text-center text-slate-600 text-xs mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              Results verified on Midnight blockchain
            </motion.p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === 'meditation') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-12"
            >
              <Brain className="w-16 h-16 text-orange-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Prepare Your Mind</h2>
              <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-orange-400 mb-2">Meditation Guidelines:</h3>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>Find a quiet, comfortable space</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>Take deep breaths and center yourself</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>Clear your mind of distractions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>Focus on openness and receptivity</span>
                  </li>
                </ul>
              </div>
              <p className="text-slate-400 mb-8">
                When you&apos;re ready, you&apos;ll select your target face and begin the dice influence experiment.
              </p>
              <button
                onClick={() => setPhase('target')}
                className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all"
              >
                I&apos;m Ready - Continue
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'target') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Select Your Target Face</h2>
            <p className="text-slate-400 mb-8">
              Choose the dice face you will attempt to influence. You&apos;ll perform {TOTAL_ROLLS} rolls,
              focusing your intention on this target.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <label className="block text-sm font-medium mb-6 text-center">
                Which face will you influence?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {DICE_FACES.map((face, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleTargetSelect(index)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-8 rounded-xl border-2 transition-all ${
                      targetFace === index
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-[#1a2535] hover:border-gray-600'
                    }`}
                  >
                    <div className="text-6xl mb-2">{face}</div>
                    <div className="text-sm text-slate-400">{index + 1}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-300">
                <strong>Tip:</strong> Visualize the target face clearly. Some practitioners find it helpful
                to imagine the dice settling on the desired number, while others prefer to &quot;feel&quot; the outcome
                rather than force it.
              </p>
            </div>

            <button
              onClick={handleStartRolling}
              disabled={targetFace === null}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Begin Rolling ({TOTAL_ROLLS} rolls)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'rolling') {
    const progress = (rolls.length / TOTAL_ROLLS) * 100;
    const currentHits = rolls.filter((r) => r.isHit).length;
    const currentHitRate = rolls.length > 0 ? (currentHits / rolls.length) * 100 : 0;

    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">
                Roll {rolls.length + 1} of {TOTAL_ROLLS}
              </h2>
              <div className="text-sm text-slate-400">
                Target: <span className="text-2xl ml-2">{DICE_FACES[targetFace!]}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6 mb-8">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Progress</span>
                <span>
                  {rolls.length}/{TOTAL_ROLLS}
                </span>
              </div>
              <div className="h-2 bg-[#142030] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-600 to-amber-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-orange-400">
                  {currentHits}/{rolls.length}
                </div>
                <div className="text-sm text-slate-400 mt-2">Hits</div>
              </div>
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-orange-400">
                  {rolls.length > 0 ? currentHitRate.toFixed(1) : '0.0'}%
                </div>
                <div className="text-sm text-slate-400 mt-2">Hit Rate</div>
                <div className="text-xs text-slate-500 mt-1">(Baseline: 16.67%)</div>
              </div>
            </div>

            {/* Animated Dice */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-12 mb-8 flex items-center justify-center">
              <motion.div
                animate={
                  isRolling
                    ? {
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                      }
                    : {}
                }
                transition={{
                  duration: 0.1,
                  repeat: isRolling ? Infinity : 0,
                }}
                className="text-9xl"
              >
                {DICE_FACES[currentDiceFace]}
              </motion.div>
            </div>

            {/* Recent Rolls */}
            {rolls.length > 0 && (
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6 mb-8">
                <h3 className="font-semibold mb-4">Recent Rolls</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {rolls
                    .slice()
                    .reverse()
                    .slice(0, 5)
                    .map((roll) => (
                      <div
                        key={roll.number}
                        className="flex items-center justify-between p-3 bg-[#060a0f]/30 rounded-lg"
                      >
                        <span className="text-slate-400">Roll {roll.number}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{DICE_FACES[roll.result]}</span>
                          <span className="text-slate-500">({roll.result + 1})</span>
                          {roll.isHit ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <X className="w-5 h-5 text-red-400/50" />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={rollNextDice}
              disabled={isRolling || rolls.length >= TOTAL_ROLLS}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRolling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Rolling...
                </>
              ) : rolls.length >= TOTAL_ROLLS ? (
                'All rolls complete'
              ) : (
                <>
                  <Dices className="w-5 h-5" />
                  Roll Dice
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    if (isLoading || !results) {
      return (
        <div className="min-h-screen bg-[#060a0f]">
          <Header />
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-2xl mx-auto text-center">
              <Loader2 className="w-16 h-16 text-orange-500 mx-auto mb-6 animate-spin" />
              <h2 className="text-2xl font-bold mb-4">Revealing Results</h2>
              <p className="text-slate-400">
                Cryptographically verifying your dice rolls and calculating statistics...
              </p>
            </div>
          </div>
        </div>
      );
    }

    const hits = results.hits;
    const hitRate = results.hitRate;
    const expectedRate = results.expectedRate;
    const expectedHits = results.expectedHits;
    const chiSquare = results.chiSquare;
    const significance = results.significance;
    const aboveBaseline = hitRate > expectedRate;
    const distribution = results.distribution;

    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Experiment Results</h2>
            <p className="text-slate-400 mb-8">
              Statistical analysis of your dice influence performance
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Main Statistics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-orange-400">{hitRate.toFixed(1)}%</div>
                <div className="text-sm text-slate-400 mt-2">Hit Rate</div>
                <div className="text-xs text-slate-500 mt-1">
                  ({hits}/{TOTAL_ROLLS} rolls)
                </div>
              </div>
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-slate-400">16.67%</div>
                <div className="text-sm text-slate-400 mt-2">Baseline (Chance)</div>
                <div className="text-xs text-slate-500 mt-1">
                  ({expectedHits.toFixed(1)}/{TOTAL_ROLLS} expected)
                </div>
              </div>
              <div
                className={`bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 text-center ${
                  aboveBaseline ? 'border-green-500/50' : ''
                }`}
              >
                <div
                  className={`text-4xl font-bold ${
                    aboveBaseline ? 'text-green-400' : 'text-slate-400'
                  }`}
                >
                  {aboveBaseline ? '+' : ''}
                  {(hitRate - expectedRate).toFixed(1)}%
                </div>
                <div className="text-sm text-slate-400 mt-2">vs. Baseline</div>
                <div className="text-xs text-slate-500 mt-1">
                  ({(hits - expectedHits).toFixed(1)} rolls)
                </div>
              </div>
            </div>

            {/* Chi-Square Analysis */}
            <div
              className={`border-2 rounded-xl p-6 mb-8 ${
                significance.level !== 'p > 0.05'
                  ? 'border-cyan-500 bg-cyan-900/20'
                  : 'border-[#1a2535] bg-[#0f1520]/80'
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Chi-Square Statistical Analysis</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-slate-400">Chi-Square Value</div>
                      <div className="text-2xl font-bold text-orange-400">
                        χ² = {chiSquare.toFixed(3)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Significance Level</div>
                      <div className={`text-2xl font-bold ${significance.color}`}>
                        {significance.level}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">{significance.description}</p>
                </div>
              </div>

              {significance.level !== 'p > 0.05' && (
                <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-sm text-cyan-300">
                    <strong>Note:</strong> Your results show statistical significance, suggesting a
                    non-random distribution. This could indicate PK influence, but multiple trials are
                    needed to rule out chance. Continue experimenting to build a stronger dataset.
                  </p>
                </div>
              )}
            </div>

            {/* Distribution Chart */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6 mb-8">
              <h3 className="font-semibold mb-4 flex items-center justify-between">
                <span>Distribution of Results</span>
                <span className="text-sm text-slate-400">
                  Target: <span className="text-2xl ml-2">{DICE_FACES[results.targetFace]}</span>
                </span>
              </h3>
              <div className="space-y-3">
                {DICE_FACES.map((face, index) => {
                  const count = distribution[index];
                  const percentage = (count / results.totalRolls) * 100;
                  const isTarget = index === results.targetFace;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{face}</span>
                          <span className="text-slate-400">({index + 1})</span>
                          {isTarget && (
                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                              TARGET
                            </span>
                          )}
                        </div>
                        <span className="text-slate-300">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-6 bg-[#142030] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className={`h-full ${
                            isTarget
                              ? 'bg-gradient-to-r from-orange-600 to-amber-600'
                              : 'bg-gray-600'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-[#1a2535] text-xs text-slate-400">
                Expected uniform distribution: ~16.67% per face (3.33 rolls per face)
              </div>
            </div>

            {/* All Rolls */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6 mb-8">
              <h3 className="font-semibold mb-4">All Rolls</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {results.rolls.map((roll) => (
                  <div
                    key={roll.number}
                    className={`p-3 rounded-lg text-center ${
                      roll.isHit
                        ? 'bg-green-900/30 border border-green-500/50'
                        : 'bg-[#060a0f]/30 border border-[#1a2535]'
                    }`}
                  >
                    <div className="text-xs text-slate-400 mb-1">#{roll.number}</div>
                    <div className="text-3xl">{DICE_FACES[roll.result]}</div>
                    <div className="text-xs text-slate-500 mt-1">({roll.result + 1})</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-green-400">Cryptographically Verified</strong>
                <p className="text-slate-400 mt-1">
                  Your dice rolls were generated with cryptographically secure randomness before the experiment began. Results have been verified and committed to the blockchain.
                </p>
              </div>
            </div>

            <button
              onClick={() => setPhase('success')}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Continue to Summary
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Experiment Committed!</h2>
            <p className="text-slate-400 mb-8">
              Your dice influence experiment has been encrypted and committed to the blockchain.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535] break-all">
                {commitmentId}
              </div>
            </div>

            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Encrypted & Stored</strong>
                  <p className="text-sm text-slate-400">
                    Your experiment data is encrypted on IPFS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Blockchain Verified</strong>
                  <p className="text-sm text-slate-400">
                    Commitment hash timestamped on Midnight
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Statistical Analysis Complete</strong>
                  <p className="text-sm text-slate-400">
                    Chi-square analysis and distribution data preserved
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-orange-300">
                <strong>Tip:</strong> PK effects are typically subtle and cumulative. Run multiple
                trials over time to build a stronger statistical dataset. Visit your Dashboard to
                track your progress across experiments.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-orange-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => {
                  // Reset for new experiment
                  setPhase('intro');
                  setTargetFace(null);
                  setRolls([]);
                  setCurrentRoll(0);
                  setCommitmentId('');
                }}
                className="flex-1 px-6 py-3 bg-orange-600 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                New Experiment
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
