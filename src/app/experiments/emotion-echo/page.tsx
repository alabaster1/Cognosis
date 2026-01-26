'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/useWalletStore';
import RevealModal, { StatsSummary } from '@/components/modals/RevealModal';
import {
  Loader2,
  Palette,
  Heart,
  Frown,
  Angry,
  Smile,
  Zap,
  Eye,
  Cloud,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

type Phase = 'intro' | 'meditation' | 'viewing' | 'feedback' | 'results' | 'success';

// Plutchik's 8 basic emotions
const EMOTIONS = [
  { id: 'joy', label: 'Joy', icon: Smile, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500', hex: '#fbbf24' },
  { id: 'trust', label: 'Trust', icon: Heart, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500', hex: '#4ade80' },
  { id: 'fear', label: 'Fear', icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500', hex: '#34d399' },
  { id: 'surprise', label: 'Surprise', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500', hex: '#22d3ee' },
  { id: 'sadness', label: 'Sadness', icon: Frown, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500', hex: '#60a5fa' },
  { id: 'disgust', label: 'Disgust', icon: Cloud, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500', hex: '#a78bfa' },
  { id: 'anger', label: 'Anger', icon: Angry, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500', hex: '#f87171' },
  { id: 'anticipation', label: 'Anticipation', icon: Sparkles, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500', hex: '#fb923c' },
];

interface AbstractArt {
  emotion: string;
  shapes: Array<{
    type: 'circle' | 'rect' | 'polygon';
    x: number;
    y: number;
    size: number;
    color: string;
    opacity: number;
    rotation?: number;
  }>;
  backgroundColor: string;
}

interface RoundSelection {
  round: number;
  selectedEmotion: string;
}

interface RoundResult {
  round: number;
  targetEmotion: string;
  selectedEmotion: string;
  correct: boolean;
  art: AbstractArt;
}

interface Results {
  rounds: RoundResult[];
  hits: number;
  total: number;
  accuracy: number;
  baseline: number;
  difference: number;
  performance: string;
  emotionBreakdown: Record<string, { total: number; correct: number }>;
  pValue: number;
  commitmentHash?: string;
  verified?: boolean;
}

const TOTAL_ROUNDS = 10;
const BASELINE = 12.5; // 1 in 8 emotions

// Seeded random number generator for deterministic art generation
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export default function EmotionEchoPage() {
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [commitmentHash, setCommitmentHash] = useState('');
  const [nonce, setNonce] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Game state
  const [currentRound, setCurrentRound] = useState(1);
  const [arts, setArts] = useState<AbstractArt[]>([]);
  const [targetEmotions, setTargetEmotions] = useState<string[]>([]);
  const [selections, setSelections] = useState<RoundSelection[]>([]);
  const [results, setResults] = useState<Results | null>(null);
  const [lastSelection, setLastSelection] = useState<{ selected: string; target: string; correct: boolean } | null>(null);
  const [sessionEmotions, setSessionEmotions] = useState<string[]>([]);
  const [drandRound, setDrandRound] = useState<number | null>(null);
  const [randomnessSource, setRandomnessSource] = useState<string | null>(null);

  // Seeds for art generation (from backend)
  const artSeedsRef = useRef<number[]>([]);

  // Generate abstract art with embedded emotion using seeded random
  const generateAbstractArt = useCallback((emotion: string, seed: number): AbstractArt => {
    const random = seededRandom(seed);
    const shapes: AbstractArt['shapes'] = [];

    // Number of shapes varies by emotion
    const shapeCount = Math.floor(random() * 10) + 8;

    // Emotion-specific parameters
    const params = getEmotionParams(emotion);

    for (let i = 0; i < shapeCount; i++) {
      const shapeTypes: Array<'circle' | 'rect' | 'polygon'> = ['circle', 'rect', 'polygon'];
      const type = shapeTypes[Math.floor(random() * shapeTypes.length)];

      // Position influenced by emotion
      const x = random() * 300;
      const y = random() * 300;
      const size = params.sizeRange[0] + random() * (params.sizeRange[1] - params.sizeRange[0]);

      // Color influenced by emotion
      const colorVariation = params.colors[Math.floor(random() * params.colors.length)];

      shapes.push({
        type,
        x,
        y,
        size,
        color: colorVariation,
        opacity: params.opacityRange[0] + random() * (params.opacityRange[1] - params.opacityRange[0]),
        rotation: random() * 360,
      });
    }

    return {
      emotion,
      shapes,
      backgroundColor: params.bgColor,
    };
  }, []);

  // Get emotion-specific visual parameters
  const getEmotionParams = (emotion: string) => {
    const params: Record<string, any> = {
      joy: {
        colors: ['#fbbf24', '#fde047', '#fef08a', '#fff7ed'],
        sizeRange: [30, 80],
        opacityRange: [0.6, 0.9],
        bgColor: '#1a1a0a',
      },
      trust: {
        colors: ['#4ade80', '#86efac', '#a7f3d0', '#d1fae5'],
        sizeRange: [40, 70],
        opacityRange: [0.5, 0.8],
        bgColor: '#0a1a0f',
      },
      fear: {
        colors: ['#34d399', '#064e3b', '#022c22', '#0d0d0d'],
        sizeRange: [20, 50],
        opacityRange: [0.3, 0.6],
        bgColor: '#030a06',
      },
      surprise: {
        colors: ['#22d3ee', '#67e8f9', '#a5f3fc', '#ecfeff'],
        sizeRange: [20, 90],
        opacityRange: [0.7, 1.0],
        bgColor: '#0a1a1a',
      },
      sadness: {
        colors: ['#60a5fa', '#3b82f6', '#1e3a5f', '#1e293b'],
        sizeRange: [30, 60],
        opacityRange: [0.3, 0.5],
        bgColor: '#0a0a1a',
      },
      disgust: {
        colors: ['#a78bfa', '#7c3aed', '#4c1d95', '#2e1065'],
        sizeRange: [25, 55],
        opacityRange: [0.4, 0.7],
        bgColor: '#0f0a1a',
      },
      anger: {
        colors: ['#f87171', '#ef4444', '#dc2626', '#7f1d1d'],
        sizeRange: [25, 70],
        opacityRange: [0.6, 0.9],
        bgColor: '#1a0a0a',
      },
      anticipation: {
        colors: ['#fb923c', '#f97316', '#ea580c', '#fdba74'],
        sizeRange: [35, 75],
        opacityRange: [0.5, 0.8],
        bgColor: '#1a0f0a',
      },
    };
    return params[emotion] || params.joy;
  };

  const startMeditation = async () => {
    setPhase('meditation');
    setIsLoading(true);
    setError('');

    try {
      // Call backend to generate target emotions with cryptographic commitment
      const result = await apiService.generateEmotionEchoTarget({
        totalRounds: TOTAL_ROUNDS,
        emotionCount: EMOTIONS.length,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.commitmentId);
      setCommitmentHash(result.commitmentHash);
      setNonce(result.nonce);

      // Store drand info
      if (result.drandRound) setDrandRound(result.drandRound);
      if (result.randomnessSource) setRandomnessSource(result.randomnessSource);

      // Store session-specific emotions (dynamic from expanded Plutchik wheel)
      if (result.sessionEmotions) {
        setSessionEmotions(result.sessionEmotions);
      }

      // Store nonce in localStorage for verification
      localStorage.setItem(`emotion_echo_nonce_${result.commitmentId}`, result.nonce);

      // Backend provides: targetEmotions (indices) or sessionEmotions
      let emotions: string[];
      if (result.targetEmotions && result.targetEmotions.length > 0) {
        emotions = result.targetEmotions.map((idx: number) => EMOTIONS[idx]?.id || EMOTIONS[0].id);
      } else if (result.sessionEmotions) {
        emotions = result.sessionEmotions.slice(0, TOTAL_ROUNDS);
      } else {
        emotions = EMOTIONS.slice(0, TOTAL_ROUNDS).map(e => e.id);
      }
      setTargetEmotions(emotions);

      // Generate art seeds from commitment hash if not provided by backend
      const seeds = result.artSeeds || emotions.map((_, i) =>
        parseInt((result.commitmentHash || '0').substring(i * 4, i * 4 + 8), 16) || (i + 1) * 12345
      );
      artSeedsRef.current = seeds;

      // Generate art using seeds (deterministic)
      const generatedArts: AbstractArt[] = emotions.map((emotion: string, i: number) =>
        generateAbstractArt(emotion, seeds[i])
      );
      setArts(generatedArts);

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setPhase('intro');
      setIsLoading(false);
    }
  };

  const startViewing = () => {
    setCurrentRound(1);
    setSelections([]);
    setPhase('viewing');
  };

  const handleEmotionSelect = (emotionId: string) => {
    if (phase !== 'viewing') return;

    const currentArt = arts[currentRound - 1];
    const targetEmotion = targetEmotions[currentRound - 1];
    const correct = emotionId === targetEmotion;

    // Store selection
    const selection: RoundSelection = {
      round: currentRound,
      selectedEmotion: emotionId,
    };

    const updatedSelections = [...selections, selection];
    setSelections(updatedSelections);
    setLastSelection({ selected: emotionId, target: targetEmotion, correct });
    setPhase('feedback');

    // Show feedback briefly, then continue
    setTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS) {
        revealAndCalculateResults(updatedSelections);
      } else {
        setCurrentRound((prev) => prev + 1);
        setPhase('viewing');
      }
    }, 2000);
  };

  const revealAndCalculateResults = async (allSelections: RoundSelection[]) => {
    setPhase('results');
    setIsLoading(true);

    try {
      // Retrieve stored nonce
      const storedNonce = localStorage.getItem(`emotion_echo_nonce_${commitmentId}`) || nonce;

      // Call reveal API to verify results
      const revealResult = await apiService.revealEmotionEcho({
        commitmentId,
        selections: allSelections.map((s) => ({
          round: s.round,
          selectedEmotionIndex: EMOTIONS.findIndex((e) => e.id === s.selectedEmotion),
        })),
        nonce: storedNonce,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      // Build round results from reveal response
      const roundResults: RoundResult[] = revealResult.results.map((r: { round: number; targetEmotionIndex: number; selectedEmotionIndex: number; correct: boolean }, i: number) => ({
        round: r.round,
        targetEmotion: EMOTIONS[r.targetEmotionIndex].id,
        selectedEmotion: EMOTIONS[r.selectedEmotionIndex].id,
        correct: r.correct,
        art: arts[i],
      }));

      // Emotion breakdown
      const breakdown: Record<string, { total: number; correct: number }> = {};
      roundResults.forEach((r) => {
        if (!breakdown[r.targetEmotion]) {
          breakdown[r.targetEmotion] = { total: 0, correct: 0 };
        }
        breakdown[r.targetEmotion].total++;
        if (r.correct) breakdown[r.targetEmotion].correct++;
      });

      // Determine performance label
      let performance = 'Average';
      if (revealResult.accuracy >= 40) performance = 'Exceptional';
      else if (revealResult.accuracy >= 30) performance = 'Excellent';
      else if (revealResult.accuracy >= 20) performance = 'Good';
      else if (revealResult.accuracy < 10) performance = 'Below Average';

      setResults({
        rounds: roundResults,
        hits: revealResult.hits,
        total: revealResult.total,
        accuracy: revealResult.accuracy,
        baseline: BASELINE,
        difference: revealResult.accuracy - BASELINE,
        performance,
        emotionBreakdown: breakdown,
        pValue: revealResult.pValue,
        commitmentHash: revealResult.commitmentHash,
        verified: revealResult.verified,
      });

      // Submit to global feed
      await apiService.submitToFeed({
        experimentType: 'emotion-echo',
        score: revealResult.hits,
        accuracy: revealResult.accuracy,
        baseline: BASELINE,
        commitmentHash: revealResult.commitmentHash,
        verified: revealResult.verified,
      });

      // Clean up stored nonce
      localStorage.removeItem(`emotion_echo_nonce_${commitmentId}`);

      setIsLoading(false);
      setPhase('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify results');
      setIsLoading(false);
      // Fallback to showing results anyway
      setPhase('success');
    }
  };

  const currentArt = arts[currentRound - 1];
  const progressPercent = (currentRound / TOTAL_ROUNDS) * 100;

  // Render abstract art
  const renderArt = (art: AbstractArt) => (
    <svg
      width="300"
      height="300"
      viewBox="0 0 300 300"
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: art.backgroundColor }}
    >
      {art.shapes.map((shape, i) => {
        const transform = `rotate(${shape.rotation || 0} ${shape.x} ${shape.y})`;

        if (shape.type === 'circle') {
          return (
            <circle
              key={i}
              cx={shape.x}
              cy={shape.y}
              r={shape.size / 2}
              fill={shape.color}
              opacity={shape.opacity}
            />
          );
        } else if (shape.type === 'rect') {
          return (
            <rect
              key={i}
              x={shape.x - shape.size / 2}
              y={shape.y - shape.size / 2}
              width={shape.size}
              height={shape.size}
              fill={shape.color}
              opacity={shape.opacity}
              transform={transform}
            />
          );
        } else {
          // Polygon (triangle)
          const points = `${shape.x},${shape.y - shape.size / 2} ${shape.x - shape.size / 2},${shape.y + shape.size / 2} ${shape.x + shape.size / 2},${shape.y + shape.size / 2}`;
          return (
            <polygon
              key={i}
              points={points}
              fill={shape.color}
              opacity={shape.opacity}
              transform={transform}
            />
          );
        }
      })}
    </svg>
  );

  const getEmotionById = (id: string) => EMOTIONS.find((e) => e.id === id) || EMOTIONS[0];

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
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              {/* Floating emotion orbs background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {EMOTIONS.map((emotion, i) => (
                  <motion.div
                    key={emotion.id}
                    className="absolute w-16 h-16 rounded-full opacity-20 blur-xl"
                    style={{ backgroundColor: emotion.hex }}
                    animate={{
                      x: [0, 30 * Math.sin(i), -20 * Math.cos(i), 0],
                      y: [0, -25 * Math.cos(i), 15 * Math.sin(i), 0],
                    }}
                    transition={{
                      duration: 6 + i,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    initial={{
                      left: `${10 + (i % 4) * 25}%`,
                      top: `${15 + Math.floor(i / 4) * 50}%`,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 text-center pt-6">
                {/* Pulsing heart icon */}
                <motion.div
                  className="inline-flex items-center justify-center w-24 h-24 mb-6 relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  />
                  <Palette className="w-10 h-10 text-pink-400 relative z-10" />
                </motion.div>

                <motion.h1
                  className="text-5xl md:text-6xl font-black mb-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="bg-gradient-to-r from-pink-300 via-rose-300 to-purple-400 bg-clip-text text-transparent">
                    EMOTION
                  </span>
                  <br />
                  <span className="text-3xl font-light tracking-[0.3em] text-white/60 italic">
                    echo
                  </span>
                </motion.h1>

                <motion.p
                  className="text-pink-300/60 text-sm mt-3 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Empathy & Telepathy Research
                </motion.p>

                <motion.p
                  className="text-slate-400 max-w-sm mx-auto text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Feel the invisible. Sense emotions hidden within abstract art
                  through pure intuitive empathy.
                </motion.p>
              </div>

              {/* Circular emotion wheel */}
              <motion.div
                className="relative w-64 h-64 mx-auto my-10"
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
              >
                {EMOTIONS.map((emotion, i) => {
                  const angle = (i / EMOTIONS.length) * 360 - 90;
                  const rad = (angle * Math.PI) / 180;
                  const radius = 95;
                  const x = Math.cos(rad) * radius;
                  const y = Math.sin(rad) * radius;

                  return (
                    <motion.div
                      key={emotion.id}
                      className="absolute left-1/2 top-1/2"
                      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.08, type: 'spring' }}
                      whileHover={{ scale: 1.3 }}
                    >
                      <div
                        className={`w-12 h-12 rounded-full ${emotion.bg} border ${emotion.border} flex flex-col items-center justify-center cursor-default shadow-lg`}
                        style={{ boxShadow: `0 0 15px ${emotion.hex}30` }}
                      >
                        <emotion.icon className={`w-5 h-5 ${emotion.color}`} />
                      </div>
                      <div className={`text-[9px] ${emotion.color} text-center mt-1 font-medium`}>
                        {emotion.label}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-[#0a0e14] border border-pink-500/30 flex items-center justify-center"
                    animate={{ boxShadow: ['0 0 0 rgba(236,72,153,0)', '0 0 20px rgba(236,72,153,0.2)', '0 0 0 rgba(236,72,153,0)'] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <span className="text-pink-400 text-lg font-bold">8</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="flex justify-center gap-6 mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div>
                  <div className="text-2xl font-bold text-pink-400">10</div>
                  <div className="text-[10px] text-slate-500 uppercase">Rounds</div>
                </div>
                <div className="w-px bg-[#1a2535]" />
                <div>
                  <div className="text-2xl font-bold text-rose-400">12.5%</div>
                  <div className="text-[10px] text-slate-500 uppercase">Baseline</div>
                </div>
                <div className="w-px bg-[#1a2535]" />
                <div>
                  <div className="text-2xl font-bold text-purple-400">8</div>
                  <div className="text-[10px] text-slate-500 uppercase">Emotions</div>
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
                transition={{ delay: 1.1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <div className="relative px-8 py-5 bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Heart className="w-5 h-5" />
                      Tune Into Emotions
                      <Sparkles className="w-5 h-5" />
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
                      <div className="absolute inset-0 border-4 border-pink-500/30 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-pink-500 rounded-full animate-spin" />
                      <Palette className="absolute inset-0 m-auto w-10 h-10 text-pink-400" />
                    </div>
                    <p className="text-xl text-slate-300">Generating emotional artwork...</p>
                    <p className="text-sm text-slate-500">10 pieces being created</p>
                  </>
                ) : (
                  <>
                    <div className="p-6 bg-pink-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <Palette className="w-12 h-12 text-pink-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Art Generated</h2>
                    <p className="text-slate-400 max-w-md">
                      10 abstract artworks have been created, each embedded with a specific
                      emotion. Open your heart and trust your feelings.
                    </p>
                    <button
                      onClick={startViewing}
                      className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                    >
                      Start Viewing
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEWING PHASE */}
          {(phase === 'viewing' || phase === 'feedback') && (
            <motion.div
              key="viewing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress */}
              <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Artwork {currentRound} of {TOTAL_ROUNDS}</span>
                  <span className="text-slate-400">
                    Correct: {selections.filter((s, i) => s.selectedEmotion === targetEmotions[i]).length}
                  </span>
                </div>
                <div className="h-2 bg-[#142030] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Art display */}
              <div className="bg-[#0f1520]/30 rounded-2xl border border-[#1a2535] p-6">
                {phase === 'viewing' && currentArt && (
                  <div className="text-center space-y-6">
                    <h2 className="text-xl font-semibold text-white">
                      What emotion do you sense in this art?
                    </h2>

                    <div className="flex justify-center">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={currentRound}
                      >
                        {renderArt(currentArt)}
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
                      {EMOTIONS.map((emotion) => (
                        <motion.button
                          key={emotion.id}
                          onClick={() => handleEmotionSelect(emotion.id)}
                          className={`p-3 rounded-xl ${emotion.bg} border ${emotion.border} hover:scale-105 transition-all`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <emotion.icon className={`w-6 h-6 mx-auto ${emotion.color}`} />
                          <span className={`text-xs ${emotion.color} block mt-1`}>
                            {emotion.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {phase === 'feedback' && lastSelection && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6"
                  >
                    <div
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${
                        lastSelection.correct
                          ? 'bg-green-500/20 border border-green-500'
                          : 'bg-red-500/20 border border-red-500'
                      }`}
                    >
                      {lastSelection.correct ? (
                        <>
                          <Check className="w-6 h-6 text-green-400" />
                          <span className="text-green-400 font-semibold">Perfect Empathy!</span>
                        </>
                      ) : (
                        <>
                          <X className="w-6 h-6 text-red-400" />
                          <span className="text-red-400 font-semibold">Not quite</span>
                        </>
                      )}
                    </div>

                    <div className="flex justify-center items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 uppercase mb-2">You Sensed</p>
                        {(() => {
                          const e = getEmotionById(lastSelection.selected);
                          return (
                            <div className={`p-3 rounded-xl ${e.bg} border ${e.border}`}>
                              <e.icon className={`w-8 h-8 ${e.color}`} />
                              <span className={`text-sm ${e.color} block mt-1`}>{e.label}</span>
                            </div>
                          );
                        })()}
                      </div>
                      <span className="text-slate-500">→</span>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 uppercase mb-2">Actual Emotion</p>
                        {(() => {
                          const e = getEmotionById(lastSelection.target);
                          return (
                            <div className={`p-3 rounded-xl ${e.bg} border ${e.border}`}>
                              <e.icon className={`w-8 h-8 ${e.color}`} />
                              <span className={`text-sm ${e.color} block mt-1`}>{e.label}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.div>
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
              <Loader2 className="w-16 h-16 animate-spin text-pink-500 mb-4" />
              <p className="text-xl text-slate-300">Analyzing your emotional perception...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULTS MODAL */}
        <RevealModal
          isOpen={phase === 'success' && results !== null}
          onClose={() => {}}
          onConfirm={() => (window.location.href = '/experiments')}
          title="Emotion Echo Complete!"
          experimentType="Emotion Echo (Telepathy/Empathy)"
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
                    label: 'Correct',
                    value: `${results.hits}/${results.total}`,
                    trend: results.difference > 0 ? 'up' : results.difference < 0 ? 'down' : 'neutral',
                  },
                  {
                    label: 'Accuracy',
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

              {/* Round results */}
              <div className="bg-[#0a1018] rounded-xl p-4">
                <h3 className="font-semibold text-white mb-3">Results by Round</h3>
                <div className="flex gap-1 flex-wrap">
                  {results.rounds.map((r, i) => {
                    const e = getEmotionById(r.targetEmotion);
                    return (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          r.correct ? 'bg-green-500/30 border border-green-500' : 'bg-red-500/30 border border-red-500'
                        }`}
                        title={`${r.correct ? 'Correct' : 'Wrong'}: ${e.label}`}
                      >
                        <e.icon className={`w-4 h-4 ${e.color}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Statistical significance */}
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-pink-300 mb-2">Empathy Analysis</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>Baseline expectation: {BASELINE}% (random guessing)</p>
                  <p>Your accuracy: {results.accuracy.toFixed(1)}%</p>
                  <p className={results.pValue < 0.05 ? 'text-green-400' : 'text-slate-400'}>
                    p-value: {results.pValue.toFixed(4)}
                    {results.pValue < 0.05 && ' (statistically significant!)'}
                  </p>
                </div>
              </div>

              {/* drand Verification Badge */}
              {drandRound && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-7 h-7 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-300">Verifiable Randomness</p>
                    <p className="text-xs text-green-500">drand round #{drandRound} | {randomnessSource || 'drand_quicknet'}</p>
                  </div>
                </div>
              )}

              {/* Dynamic emotions indicator */}
              {sessionEmotions.length > 0 && (
                <div className="text-xs text-slate-500 text-center">
                  Session emotions from expanded Plutchik wheel ({sessionEmotions.length} unique)
                </div>
              )}
            </div>
          )}
        </RevealModal>
      </main>
    </div>
  );
}
