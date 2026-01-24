'use client';

/**
 * Remote Viewing Images - AI-Powered Target Selection
 * Focus on visual composition, colors, and artistic elements
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Image, Palette, Loader2, Target, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

type Phase = 'intro' | 'meditation' | 'composition' | 'colors' | 'details' | 'results';

interface ImageData {
  composition: string;
  dominantColors: string[];
  lightingMood: string;
  subjectMatter: string;
  style: string;
  movement: string;
  emotions: string[];
  additionalDetails: string;
}

interface ScoringResult {
  target: Record<string, unknown>;
  score: number;
  accuracy: string;
  hits: Array<{ element: string; confidence: string; explanation: string }>;
  misses: Array<{ element: string; importance: string; explanation: string }>;
  feedback: string;
}

const COMPOSITION_OPTIONS = ['Centered', 'Asymmetric', 'Layered', 'Minimalist', 'Complex', 'Panoramic'];
const COLOR_OPTIONS = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Black', 'White', 'Brown', 'Gray'];
const LIGHTING_OPTIONS = ['Bright', 'Dark', 'Dramatic', 'Soft', 'Natural', 'Artificial', 'Backlit', 'Shadowy'];
const SUBJECT_OPTIONS = ['People', 'Animals', 'Nature', 'Architecture', 'Objects', 'Abstract', 'Landscape', 'Urban'];
const STYLE_OPTIONS = ['Realistic', 'Artistic', 'Abstract', 'Vintage', 'Modern', 'Surreal'];
const MOVEMENT_OPTIONS = ['Static', 'Dynamic', 'Flowing', 'Chaotic', 'Peaceful', 'Energetic'];
const EMOTION_OPTIONS = ['Peaceful', 'Energetic', 'Mysterious', 'Joyful', 'Somber', 'Tense', 'Serene', 'Dramatic'];

export default function RemoteViewingImagesPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [phase, setPhase] = useState<Phase>('intro');
  const [meditationTime, setMeditationTime] = useState(30);
  const [commitmentId, setCommitmentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ScoringResult | null>(null);

  const [imageData, setImageData] = useState<ImageData>({
    composition: '',
    dominantColors: [],
    lightingMood: '',
    subjectMatter: '',
    style: '',
    movement: '',
    emotions: [],
    additionalDetails: '',
  });

  useEffect(() => {
    if (phase === 'meditation' && meditationTime > 0) {
      const timer = setInterval(() => setMeditationTime((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (phase === 'meditation' && meditationTime === 0) {
      setPhase('composition');
    }
  }, [phase, meditationTime]);

  const startExperiment = async () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }

    setIsLoading(true);
    setError('');
    setPhase('meditation');

    try {
      const result = await experimentService.generateRemoteViewingTarget({
        experimentType: 'remote-viewing-images',
        verified: (wallet as any).isVerified ?? true,
      });

      setCommitmentId(result.commitmentId);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Generate target error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setIsLoading(false);
      setPhase('intro');
    }
  };

  const toggleColor = (color: string) => {
    setImageData({
      ...imageData,
      dominantColors: imageData.dominantColors.includes(color)
        ? imageData.dominantColors.filter((c) => c !== color)
        : [...imageData.dominantColors, color],
    });
  };

  const toggleEmotion = (emotion: string) => {
    setImageData({
      ...imageData,
      emotions: imageData.emotions.includes(emotion)
        ? imageData.emotions.filter((e) => e !== emotion)
        : [...imageData.emotions, emotion],
    });
  };

  const submitResponse = async () => {
    setIsLoading(true);
    setError('');

    try {
      const scoringResult = await experimentService.revealRemoteViewing({
        commitmentId,
        userResponse: imageData as any,
        verified: (wallet as any)?.isVerified ?? true,
      });

      setResults(scoringResult as any);
      setPhase('results');
    } catch (err: unknown) {
      console.error('Reveal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reveal and score experiment');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto text-center"
            >
              {/* Abstract image frame */}
              <motion.div
                className="inline-flex items-center justify-center w-28 h-28 mb-6 relative"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <div className="absolute inset-0 rounded-2xl border-2 border-pink-500/30 rotate-3" />
                <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-pink-950/50 to-rose-950/50 border border-pink-400/20 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.15)]">
                  <Image className="w-10 h-10 text-pink-400" />
                </div>
                {/* Color dots */}
                {['bg-red-400', 'bg-blue-400', 'bg-yellow-400', 'bg-green-400'].map((c, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-3 h-3 rounded-full ${c}`}
                    style={{ top: i < 2 ? '-4px' : undefined, bottom: i >= 2 ? '-4px' : undefined, left: i % 2 === 0 ? '-4px' : undefined, right: i % 2 !== 0 ? '-4px' : undefined }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                  />
                ))}
              </motion.div>

              <motion.h1
                className="text-4xl md:text-6xl font-black mb-1"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="text-2xl md:text-3xl text-white/50 block font-light tracking-wider">REMOTE VIEWING</span>
                <span className="bg-gradient-to-r from-pink-300 via-rose-300 to-red-400 bg-clip-text text-transparent">
                  IMAGES
                </span>
              </motion.h1>

              <motion.p
                className="text-pink-300/50 text-sm mt-3 uppercase tracking-widest"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Visual Perception Protocol
              </motion.p>

              <motion.p
                className="text-slate-400 max-w-sm mx-auto text-sm mt-3 mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Perceive the composition, colors, and essence of a hidden image through psychic impression alone.
              </motion.p>

              {/* Phase steps */}
              <motion.div
                className="grid grid-cols-4 gap-2 mb-8 max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {[
                  { label: 'Meditate', color: 'border-pink-500/20' },
                  { label: 'Compose', color: 'border-rose-500/20' },
                  { label: 'Color', color: 'border-red-500/20' },
                  { label: 'Detail', color: 'border-pink-500/20' },
                ].map((s, i) => (
                  <div key={i} className={`p-3 rounded-xl bg-[#0a0e14] border ${s.color} text-center`}>
                    <div className="text-[9px] text-pink-500/50 font-mono">{i + 1}</div>
                    <div className="text-[11px] text-white/70">{s.label}</div>
                  </div>
                ))}
              </motion.div>

              <motion.button
                onClick={startExperiment}
                className="w-full max-w-md mx-auto relative group block"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <div className="relative px-8 py-5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <Image className="w-5 h-5" />
                  View the Unseen
                  <ArrowRight className="w-5 h-5" />
                </div>
              </motion.button>
            </motion.div>
          )}

          {phase === 'meditation' && (
            <motion.div
              key="meditation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Target className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-3xl font-bold mb-4">Meditation Phase</h2>
              <div className="text-6xl font-bold text-pink-400 mb-8">{formatTime(meditationTime)}</div>

              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8">
                <p className="text-slate-400 mb-6">
                  Relax and allow visual impressions to come to you...
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
                  <span className="text-pink-400">Target committed to blockchain</span>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'composition' && (
            <motion.div
              key="composition"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold mb-4">Step 1: Composition & Structure</h2>
              <p className="text-slate-400 mb-8">How is the image organized visually?</p>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-3">Composition Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COMPOSITION_OPTIONS.map((comp) => (
                      <button
                        key={comp}
                        onClick={() => setImageData({ ...imageData, composition: comp })}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          imageData.composition === comp
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-[#1a2535] hover:border-pink-500/50'
                        }`}
                      >
                        {comp}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Subject Matter</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SUBJECT_OPTIONS.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => setImageData({ ...imageData, subjectMatter: subject })}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          imageData.subjectMatter === subject
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-[#1a2535] hover:border-pink-500/50'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPhase('colors')}
                disabled={!imageData.composition || !imageData.subjectMatter}
                className="w-full px-6 py-3 bg-pink-600 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </motion.div>
          )}

          {phase === 'colors' && (
            <motion.div
              key="colors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold mb-4">Step 2: Colors & Lighting</h2>
              <p className="text-slate-400 mb-8">Select dominant colors and lighting mood</p>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Dominant Colors (select multiple)
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          imageData.dominantColors.includes(color)
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-[#1a2535] hover:border-pink-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {imageData.dominantColors.includes(color) && <CheckCircle className="w-4 h-4 text-pink-400" />}
                          {color}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Lighting/Mood</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {LIGHTING_OPTIONS.map((lighting) => (
                      <button
                        key={lighting}
                        onClick={() => setImageData({ ...imageData, lightingMood: lighting })}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          imageData.lightingMood === lighting
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-[#1a2535] hover:border-pink-500/50'
                        }`}
                      >
                        {lighting}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setPhase('composition')}
                  className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-pink-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setPhase('details')}
                  disabled={imageData.dominantColors.length === 0 || !imageData.lightingMood}
                  className="flex-1 px-6 py-3 bg-pink-600 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold mb-4">Step 3: Style & Emotions</h2>
              <p className="text-slate-400 mb-8">Describe the artistic style and emotional tone</p>

              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-3">Artistic Style</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {STYLE_OPTIONS.map((style) => (
                      <button
                        key={style}
                        onClick={() => setImageData({ ...imageData, style })}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          imageData.style === style
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-[#1a2535] hover:border-pink-500/50'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Movement/Energy</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {MOVEMENT_OPTIONS.map((movement) => (
                      <button
                        key={movement}
                        onClick={() => setImageData({ ...imageData, movement })}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          imageData.movement === movement
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-[#1a2535] hover:border-pink-500/50'
                        }`}
                      >
                        {movement}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Emotional Tone (select multiple)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {EMOTION_OPTIONS.map((emotion) => (
                      <button
                        key={emotion}
                        onClick={() => toggleEmotion(emotion)}
                        className={`px-4 py-3 rounded-lg border transition-all ${
                          imageData.emotions.includes(emotion)
                            ? 'border-pink-500 bg-pink-500/20'
                            : 'border-[#1a2535] hover:border-pink-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {imageData.emotions.includes(emotion) && <CheckCircle className="w-4 h-4 text-pink-400" />}
                          {emotion}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Additional Details</label>
                  <textarea
                    value={imageData.additionalDetails}
                    onChange={(e) => setImageData({ ...imageData, additionalDetails: e.target.value })}
                    placeholder="Any other visual impressions, textures, patterns, symbols..."
                    rows={6}
                    className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-pink-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setPhase('colors')}
                  className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-pink-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={submitResponse}
                  disabled={isLoading || !imageData.style || !imageData.movement}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-pink-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Revealing & Scoring...
                    </>
                  ) : (
                    <>
                      Submit & Reveal
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-8">
                <div
                  className={`w-24 h-24 rounded-full ${
                    results.score >= 70
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                      : results.score >= 40
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                      : 'bg-gradient-to-br from-red-500 to-pink-500'
                  } flex items-center justify-center mx-auto mb-6`}
                >
                  <span className="text-3xl font-bold text-white">{results.score}</span>
                </div>
                <h2 className="text-3xl font-bold mb-2">Results</h2>
                <p className="text-xl text-slate-400 capitalize">Accuracy: {results.accuracy}</p>
              </div>

              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-pink-400" />
                  The Target
                </h3>
                <div className="bg-[#060a0f]/50 rounded-lg p-6">
                  <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">
                    {JSON.stringify(results.target, null, 2)}
                  </pre>
                </div>
              </div>

              {results.hits && results.hits.length > 0 && (
                <div className="bg-green-900/20 border border-green-500/50 rounded-2xl p-8 mb-8">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-6 h-6" />
                    Hits ({results.hits.length})
                  </h3>
                  <div className="space-y-4">
                    {results.hits.map((hit, idx) => (
                      <div key={idx} className="bg-[#060a0f]/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-green-300">{hit.element}</span>
                          <span className="text-xs px-2 py-1 bg-green-500/20 rounded text-green-400">
                            {hit.confidence}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{hit.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.misses && results.misses.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-8 mb-8">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-400">
                    <XCircle className="w-6 h-6" />
                    Misses ({results.misses.length})
                  </h3>
                  <div className="space-y-4">
                    {results.misses.map((miss, idx) => (
                      <div key={idx} className="bg-[#060a0f]/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-red-300">{miss.element}</span>
                          <span className="text-xs px-2 py-1 bg-red-500/20 rounded text-red-400">
                            {miss.importance}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{miss.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-900/20 border border-blue-500/50 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4">AI Feedback</h3>
                <p className="text-slate-300 leading-relaxed">{results.feedback}</p>
              </div>

              {/* Statistics */}
              {(results as any).statistics && (
                <div className="bg-purple-950/30 rounded-xl border border-purple-500/20 p-4 mb-4">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3">Statistical Analysis</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500">z-score:</span> <span className="text-white font-mono">{(results as any).statistics.zScore?.toFixed(2)}</span></div>
                    <div><span className="text-slate-500">p-value:</span> <span className="text-white font-mono">{(results as any).statistics.pValue?.toFixed(4)}</span></div>
                    <div><span className="text-slate-500">Effect:</span> <span className="text-white font-mono">{(results as any).statistics.effectSize?.toFixed(3)}</span></div>
                    <div><span className="text-slate-500">Significance:</span> <span className={`font-mono ${(results as any).statistics.significance === 'significant' || (results as any).statistics.significance === 'highly_significant' ? 'text-green-400' : 'text-slate-400'}`}>{(results as any).statistics.significance}</span></div>
                  </div>
                </div>
              )}

              {/* drand Verification */}
              {(results as any).drandRound && (
                <div className="bg-green-950/30 rounded-lg border border-green-500/20 px-4 py-2 mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs text-green-400">Verified via drand #{(results as any).drandRound}</span>
                    {(results as any).scoringMethod && <span className="text-xs text-green-300/60 ml-2">({(results as any).scoringMethod})</span>}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-pink-500 transition-colors"
                >
                  View Dashboard
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-6 py-3 bg-pink-600 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
