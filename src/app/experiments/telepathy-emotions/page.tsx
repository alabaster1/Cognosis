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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    Emotion Telepathy
                  </h1>
                </div>

                <div className="space-y-4 text-slate-600">
                  <p className="text-lg">
                    Sense and identify emotions being transmitted by a distant sender through a structured protocol.
                  </p>

                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <h3 className="font-semibold text-pink-900 mb-2">4-Phase Protocol:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-pink-600 mt-1">1.</span>
                        <span>Meditation: Deep relaxation and receptivity (2 minutes)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-pink-600 mt-1">2.</span>
                        <span>Emotion Sensing: Identify the emotion using the wheel</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-pink-600 mt-1">3.</span>
                        <span>Valence &amp; Arousal: Rate the emotional intensity</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-pink-600 mt-1">4.</span>
                        <span>Body Mapping: Where do you feel this emotion?</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                    <h3 className="font-semibold text-rose-900 mb-2">What You&apos;ll Do:</h3>
                    <ul className="space-y-1 text-sm">
                      <li>- Select primary and secondary emotions from the wheel</li>
                      <li>- Rate emotional valence (positive/negative) and arousal (calm/intense)</li>
                      <li>- Map where you feel the sensation in your body</li>
                      <li>- Add any intuitive notes or impressions</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={startMeditation}
                  className="mt-6 w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 transition-all"
                >
                  Begin Protocol
                </button>
              </div>
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
