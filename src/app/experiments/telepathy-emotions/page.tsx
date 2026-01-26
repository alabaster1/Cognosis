// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import EmotionWheel from '@/components/experiments/EmotionWheel';
import experimentService from '@/services/experimentService';
import { Heart, Timer, CheckCircle2, Sparkles } from 'lucide-react';

type Phase = 'intro' | 'meditation' | 'sensing' | 'valence' | 'body' | 'results' | 'success';

interface EmotionData {
  primaryEmotion: string;
  secondaryEmotion: string;
  valence: number;
  arousal: number;
  bodyLocation: { x: number; y: number } | null;
  notes: string;
}

export default function TelepathyEmotionsPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [meditationTime, setMeditationTime] = useState(120);
  const [emotionData, setEmotionData] = useState<EmotionData>({
    primaryEmotion: '',
    secondaryEmotion: '',
    valence: 5,
    arousal: 5,
    bodyLocation: null,
    notes: '',
  });
  const [commitmentId, setCommitmentId] = useState('');

  useEffect(() => {
    if (phase === 'meditation' && meditationTime > 0) {
      const timer = setInterval(() => {
        setMeditationTime((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (phase === 'meditation' && meditationTime === 0) {
      setPhase('sensing');
    }
  }, [phase, meditationTime]);

  const startMeditation = () => {
    setPhase('meditation');
    setMeditationTime(120);
  };

  const handleEmotionSelect = (primary: string, secondary: string) => {
    setEmotionData({ ...emotionData, primaryEmotion: primary, secondaryEmotion: secondary });
  };

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setEmotionData({ ...emotionData, bodyLocation: { x, y } });
  };

  const completeExperiment = async () => {
    setPhase('results');

    try {
      const commitment = await experimentService.createCommitment({
        experimentType: 'telepathy-emotions',
        data: {
          ...emotionData,
          timestamp: new Date().toISOString(),
        },
      });

      setCommitmentId(commitment.id);
      setTimeout(() => setPhase('success'), 2000);
    } catch (error) {
      console.error('Failed to create commitment:', error);
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              {/* Heartbeat wave background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center opacity-10">
                <svg width="100%" height="120" viewBox="0 0 600 120">
                  <motion.path
                    d="M0,60 L100,60 L120,20 L140,100 L160,40 L180,80 L200,60 L300,60 L320,20 L340,100 L360,40 L380,80 L400,60 L500,60 L520,20 L540,100 L560,40 L580,80 L600,60"
                    stroke="#ec4899"
                    strokeWidth="2"
                    fill="none"
                    animate={{ pathLength: [0, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </svg>
              </div>

              <div className="relative z-10 text-center pt-6">
                {/* Body silhouette with heart */}
                <motion.div
                  className="inline-flex items-center justify-center w-24 h-24 mb-6 relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full bg-pink-500/10"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-600/30 to-rose-600/30 border border-pink-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(236,72,153,0.3)]">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Heart className="w-8 h-8 text-pink-400" fill="currentColor" />
                    </motion.div>
                  </div>
                </motion.div>

                <motion.h1
                  className="text-4xl md:text-6xl font-black mb-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-2xl md:text-3xl text-white/60 block font-light tracking-wider">EMOTION</span>
                  <span className="bg-gradient-to-r from-pink-300 via-rose-300 to-red-400 bg-clip-text text-transparent">
                    TELEPATHY
                  </span>
                </motion.h1>

                <motion.p
                  className="text-pink-300/60 text-sm mt-3 uppercase tracking-widest"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Empathic Sensing Protocol
                </motion.p>

                <motion.p
                  className="text-slate-400 max-w-sm mx-auto text-sm mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Sense emotions transmitted by a distant sender.
                  Feel it in your body, name it, and map its location.
                </motion.p>
              </div>

              {/* 4-phase visual */}
              <motion.div
                className="grid grid-cols-4 gap-2 my-8 max-w-sm mx-auto"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                {[
                  { label: 'Meditate', icon: '🧘' },
                  { label: 'Sense', icon: '💫' },
                  { label: 'Rate', icon: '📊' },
                  { label: 'Map', icon: '🫁' },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    className="text-center p-3 rounded-xl bg-pink-950/20 border border-pink-500/15"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
                  >
                    <div className="text-xl mb-1">{step.icon}</div>
                    <div className="text-[10px] text-pink-300/80">{step.label}</div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Valence scale */}
              <motion.div
                className="max-w-xs mx-auto mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                  <span>Negative</span>
                  <span>Valence</span>
                  <span>Positive</span>
                </div>
                <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-slate-500 to-pink-500" />
                <div className="flex justify-between text-[9px] text-slate-500 mt-2">
                  <span>Calm</span>
                  <span>Arousal</span>
                  <span>Intense</span>
                </div>
                <div className="h-2 rounded-full bg-gradient-to-r from-slate-600 via-yellow-500 to-red-500 mt-1" />
              </motion.div>

              {/* CTA */}
              <motion.button
                onClick={startMeditation}
                className="w-full relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <div className="relative px-8 py-5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  <Heart className="w-5 h-5" />
                  Begin Protocol
                </div>
              </motion.button>
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
                <Timer className="w-16 h-16 text-pink-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-4">Deep Meditation</h2>
                <p className="text-slate-600 mb-8">
                  Enter a receptive state. Open your awareness to emotional signals
                </p>
                <div className="text-6xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-4">
                  {formatTime(meditationTime)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-pink-500 to-rose-600 h-2 rounded-full"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(meditationTime / 120) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'sensing' && (
            <motion.div
              key="sensing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-6">Phase 1: Identify the Emotion</h2>
                <p className="text-slate-600 mb-6">
                  What emotion are you sensing? Select from the emotion wheel.
                </p>

                <EmotionWheel
                  onEmotionSelect={handleEmotionSelect}
                  selectedPrimary={emotionData.primaryEmotion}
                  selectedSecondary={emotionData.secondaryEmotion}
                />

                {emotionData.primaryEmotion && (
                  <div className="mt-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
                    <p className="text-sm text-slate-600">Selected Emotion:</p>
                    <p className="text-lg font-semibold text-pink-900">
                      {emotionData.primaryEmotion}
                      {emotionData.secondaryEmotion && ` - ${emotionData.secondaryEmotion}`}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setPhase('valence')}
                  disabled={!emotionData.primaryEmotion}
                  className="mt-6 w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Valence Rating
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'valence' && (
            <motion.div
              key="valence"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-6">Phase 2: Rate Emotional Quality</h2>

                <div className="space-y-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Valence (Negative -&gt; Positive)
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-500">Negative</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={emotionData.valence}
                        onChange={(e) => setEmotionData({ ...emotionData, valence: parseInt(e.target.value) })}
                        className="flex-1 h-2 bg-gradient-to-r from-red-300 via-yellow-300 to-green-300 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-sm text-slate-500">Positive</span>
                      <span className="w-8 text-center font-semibold">{emotionData.valence}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Arousal (Calm -&gt; Intense)
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-500">Calm</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={emotionData.arousal}
                        onChange={(e) => setEmotionData({ ...emotionData, arousal: parseInt(e.target.value) })}
                        className="flex-1 h-2 bg-gradient-to-r from-blue-300 via-violet-300 to-red-300 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-sm text-slate-500">Intense</span>
                      <span className="w-8 text-center font-semibold">{emotionData.arousal}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setPhase('body')}
                  className="mt-8 w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 transition-all"
                >
                  Continue to Body Mapping
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'body' && (
            <motion.div
              key="body"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-6">Phase 3: Body Location Mapping</h2>
                <p className="text-slate-600 mb-6">
                  Where in your body do you feel this emotion? Click on the body diagram.
                </p>

                <div className="flex justify-center mb-6">
                  <div
                    onClick={handleBodyClick}
                    className="relative w-64 h-96 bg-gradient-to-b from-pink-100 to-rose-100 rounded-full cursor-crosshair border-2 border-pink-300"
                  >
                    {emotionData.bodyLocation && (
                      <div
                        className="absolute w-4 h-4 bg-rose-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                        style={{
                          left: `${emotionData.bodyLocation.x}%`,
                          top: `${emotionData.bodyLocation.y}%`,
                        }}
                      />
                    )}

                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-16 h-20 bg-pink-200 rounded-full" />
                    <div className="absolute top-24 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-pink-200 rounded-lg" />
                    <div className="absolute top-56 left-1/2 transform -translate-x-1/2 w-28 h-36 bg-pink-200 rounded-b-full" />
                  </div>
                </div>

                {emotionData.bodyLocation && (
                  <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
                    <p className="text-sm text-slate-600">Location marked at:</p>
                    <p className="text-sm font-mono">
                      X: {emotionData.bodyLocation.x.toFixed(1)}%, Y: {emotionData.bodyLocation.y.toFixed(1)}%
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={emotionData.notes}
                    onChange={(e) => setEmotionData({ ...emotionData, notes: e.target.value })}
                    placeholder="Describe any additional sensations, images, or impressions..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                <button
                  onClick={completeExperiment}
                  disabled={!emotionData.bodyLocation}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Protocol
                </button>
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
                <Sparkles className="w-16 h-16 text-pink-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-2xl font-bold mb-4">Processing Your Data</h2>
                <p className="text-slate-600">Creating secure commitment...</p>
              </div>
            </motion.div>
          )}

          {phase === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Protocol Complete!</h2>
                  <p className="text-slate-600">Your emotion sensing data has been recorded</p>
                </div>

                <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-pink-900 mb-3">Session Summary:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Emotion:</span>
                      <span className="font-semibold">
                        {emotionData.primaryEmotion}
                        {emotionData.secondaryEmotion && ` - ${emotionData.secondaryEmotion}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Valence:</span>
                      <span className="font-semibold">{emotionData.valence}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Arousal:</span>
                      <span className="font-semibold">{emotionData.arousal}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Body Location:</span>
                      <span className="font-semibold">Mapped</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-600 mb-1">Commitment ID:</p>
                  <p className="font-mono text-sm break-all">{commitmentId}</p>
                </div>

                <button
                  onClick={() => window.location.href = '/experiments'}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 transition-all"
                >
                  Return to Experiments
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
