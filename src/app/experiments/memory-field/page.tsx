'use client';

/**
 * Memory Field Detection Experiment
 * Based on Rupert Sheldrake's morphic resonance theory
 * Tests ability to detect collective viewing patterns
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import MeditationTimer from '@/components/experiments/MeditationTimer';
import { Radio, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Phase = 'intro' | 'sensing' | 'rating' | 'selection' | 'success';
type Target = 'A' | 'B' | 'C' | 'D';
type EmotionalTone = 'Calm' | 'Excited' | 'Anxious' | 'Joyful' | 'Sad' | 'Neutral';

const TARGETS: Target[] = ['A', 'B', 'C', 'D'];
const EMOTIONAL_TONES: EmotionalTone[] = ['Calm', 'Excited', 'Anxious', 'Joyful', 'Sad', 'Neutral'];

export default function MemoryFieldPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [phase, setPhase] = useState<Phase>('intro');
  const [activeTab, setActiveTab] = useState<Target>('A');

  // Data for each target
  const [resonanceRatings, setResonanceRatings] = useState<Record<Target, number>>({
    A: 5,
    B: 5,
    C: 5,
    D: 5,
  });
  const [emotionalImpressions, setEmotionalImpressions] = useState<Record<Target, EmotionalTone>>({
    A: 'Neutral',
    B: 'Neutral',
    C: 'Neutral',
    D: 'Neutral',
  });
  const [visualImpressions, setVisualImpressions] = useState<Record<Target, string>>({
    A: '',
    B: '',
    C: '',
    D: '',
  });

  // Selection phase
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [confidence, setConfidence] = useState(50);

  // Commitment
  const [isLoading, setIsLoading] = useState(false);
  const [commitmentId, setCommitmentId] = useState('');
  const [error, setError] = useState('');

  const handleStartExperiment = () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
    setPhase('sensing');
  };

  const handleContinueToRating = () => {
    setPhase('rating');
  };

  const handleContinueToSelection = () => {
    // Validate that all targets have visual impressions
    const allFilled = TARGETS.every(target => visualImpressions[target].trim().length > 0);
    if (!allFilled) {
      setError('Please provide visual impressions for all four targets');
      return;
    }
    setError('');
    setPhase('selection');
  };

  const handleSubmit = async () => {
    if (!selectedTarget) {
      setError('Please select a target');
      return;
    }

    setIsLoading(true);
    setError('');

    const experimentData = {
      selectedTarget,
      resonanceRatings,
      emotionalImpressions,
      visualImpressions,
      confidence,
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await experimentService.createCommitment({
        experimentType: 'memory-field',
        prediction: JSON.stringify(experimentData),
        metadata: {
          type: 'memory-field',
          title: 'Memory Field Detection',
          description: `Target selected: ${selectedTarget} (${confidence}% confidence)`,
          category: 'field-detection',
          tags: ['memory-field', 'morphic-resonance', 'field-detection'],
        } as any,
      });

      setCommitmentId(result.commitmentId);
      setPhase('success');
    } catch (err) {
      console.error('Commit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create commitment');
    } finally {
      setIsLoading(false);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#060a0f] overflow-hidden relative">
        <Header />
        {/* Ripple waves */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-teal-500/20"
              style={{ width: 150 + i * 80, height: 150 + i * 80, left: -(75 + i * 40), top: -(75 + i * 40) }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto text-center">
            <motion.div
              className="inline-flex items-center justify-center w-24 h-24 mb-6 relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full border border-teal-400/20"
                animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="w-18 h-18 rounded-full bg-gradient-to-br from-teal-600/20 to-cyan-600/20 border border-teal-400/30 flex items-center justify-center p-4 shadow-[0_0_30px_rgba(20,184,166,0.2)]">
                <Radio className="w-10 h-10 text-teal-400" />
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-black mb-1"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-2xl md:text-3xl text-white/50 block font-light tracking-wider">MEMORY</span>
              <span className="bg-gradient-to-r from-teal-300 via-cyan-200 to-teal-400 bg-clip-text text-transparent">
                FIELD
              </span>
            </motion.h1>

            <motion.p
              className="text-teal-300/50 text-sm mt-3 uppercase tracking-widest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Morphic Resonance Detection
            </motion.p>

            <motion.p
              className="text-slate-400 max-w-md mx-auto text-sm mt-4 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Sense which target has been viewed by thousands.
              Collective attention may leave a detectable resonance.
            </motion.p>

            {/* Four target squares */}
            <motion.div
              className="grid grid-cols-4 gap-3 max-w-xs mx-auto mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {['A', 'B', 'C', 'D'].map((t, i) => (
                <motion.div
                  key={t}
                  className="aspect-square rounded-xl bg-teal-950/30 border border-teal-500/20 flex items-center justify-center"
                  animate={{ borderColor: i === 1 ? ['rgba(20,184,166,0.2)', 'rgba(20,184,166,0.6)', 'rgba(20,184,166,0.2)'] : undefined }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                  whileHover={{ scale: 1.05, borderColor: 'rgba(20,184,166,0.8)' }}
                >
                  <span className="text-teal-400/60 font-bold text-lg">{t}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              className="flex justify-center gap-6 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-400">4</div>
                <div className="text-[10px] text-slate-500 uppercase">Targets</div>
              </div>
              <div className="w-px bg-[#1a2535]" />
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">25%</div>
                <div className="text-[10px] text-slate-500 uppercase">Baseline</div>
              </div>
              <div className="w-px bg-[#1a2535]" />
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-300">1</div>
                <div className="text-[10px] text-slate-500 uppercase">Hot Target</div>
              </div>
            </motion.div>

            <motion.button
              onClick={handleStartExperiment}
              className="w-full max-w-md mx-auto relative group block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
              <div className="relative px-8 py-5 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <Radio className="w-5 h-5" />
                Sense the Field
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === 'sensing') {
    return (
      <MeditationTimer
        duration={60}
        onComplete={handleContinueToRating}
        onSkip={handleContinueToRating}
      />
    );
  }

  if (phase === 'rating') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Rate Each Target</h2>
            <p className="text-slate-400 mb-8">
              Sense the resonance field around each target. Trust your first impressions.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              {TARGETS.map((target) => (
                <button
                  key={target}
                  onClick={() => setActiveTab(target)}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    activeTab === target
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                      : 'bg-[#0f1520] border border-[#1a2535] text-slate-400 hover:border-teal-500'
                  }`}
                >
                  Target {target}
                  {visualImpressions[target].trim() && (
                    <span className="ml-2 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Rating Form for Active Target */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-6 text-center text-teal-400">
                Target {activeTab}
              </h3>

              {/* Resonance Strength Slider */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3">
                  Resonance Strength
                  <span className="text-slate-400 ml-2">(How strong is the energy field?)</span>
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">Weak</span>
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={resonanceRatings[activeTab]}
                      onChange={(e) =>
                        setResonanceRatings({
                          ...resonanceRatings,
                          [activeTab]: parseInt(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-[#1a2535] rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${
                          ((resonanceRatings[activeTab] - 1) / 9) * 100
                        }%, #374151 ${((resonanceRatings[activeTab] - 1) / 9) * 100}%, #374151 100%)`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-slate-400">Strong</span>
                  <div className="w-12 text-center">
                    <span className="text-2xl font-bold text-teal-400">
                      {resonanceRatings[activeTab]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Emotional Tone Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3">
                  Emotional Tone
                  <span className="text-slate-400 ml-2">(What emotion do you sense?)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EMOTIONAL_TONES.map((tone) => (
                    <button
                      key={tone}
                      onClick={() =>
                        setEmotionalImpressions({
                          ...emotionalImpressions,
                          [activeTab]: tone,
                        })
                      }
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        emotionalImpressions[activeTab] === tone
                          ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                          : 'border-[#1a2535] hover:border-gray-600 text-slate-400'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Impressions */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  Visual Impressions
                  <span className="text-slate-400 ml-2">(What images or sensations arise?)</span>
                </label>
                <textarea
                  value={visualImpressions[activeTab]}
                  onChange={(e) =>
                    setVisualImpressions({
                      ...visualImpressions,
                      [activeTab]: e.target.value,
                    })
                  }
                  placeholder="Describe any images, colors, shapes, or sensory impressions you receive..."
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-teal-500 focus:outline-none resize-none"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Be specific and detailed. Include any colors, textures, movements, or feelings.
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              {activeTab !== 'A' && (
                <button
                  onClick={() => {
                    const currentIndex = TARGETS.indexOf(activeTab);
                    setActiveTab(TARGETS[currentIndex - 1]);
                  }}
                  className="px-6 py-3 border border-[#1a2535] rounded-lg hover:border-teal-500 transition-colors"
                >
                  Previous Target
                </button>
              )}
              {activeTab !== 'D' ? (
                <button
                  onClick={() => {
                    const currentIndex = TARGETS.indexOf(activeTab);
                    setActiveTab(TARGETS[currentIndex + 1]);
                  }}
                  className="flex-1 px-6 py-3 bg-teal-600 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                >
                  Next Target
                </button>
              ) : (
                <button
                  onClick={handleContinueToSelection}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all flex items-center justify-center gap-2"
                >
                  Continue to Selection
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'selection') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Compare & Select</h2>
            <p className="text-slate-400 mb-8">
              Review your ratings and select which target has the strongest memory field.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Comparative Analysis Table */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8 overflow-x-auto">
              <h3 className="text-xl font-bold mb-6">Comparative Analysis</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a2535]">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Attribute</th>
                    {TARGETS.map((target) => (
                      <th key={target} className="text-center py-3 px-4 font-semibold">
                        Target {target}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#1a2535]/50">
                    <td className="py-4 px-4 text-slate-400">Resonance Strength</td>
                    {TARGETS.map((target) => (
                      <td key={target} className="py-4 px-4 text-center">
                        <div className="text-2xl font-bold text-teal-400">
                          {resonanceRatings[target]}
                        </div>
                        <div className="text-xs text-slate-500">/ 10</div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[#1a2535]/50">
                    <td className="py-4 px-4 text-slate-400">Emotional Tone</td>
                    {TARGETS.map((target) => (
                      <td key={target} className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 bg-[#142030] rounded-full text-sm">
                          {emotionalImpressions[target]}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-slate-400">Visual Impressions</td>
                    {TARGETS.map((target) => (
                      <td key={target} className="py-4 px-4">
                        <div className="text-sm text-slate-300 line-clamp-3">
                          {visualImpressions[target]}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Target Selection */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-bold mb-6">Select Strongest Memory Field</h3>
              <p className="text-slate-400 mb-6">
                Which target has the most powerful collective viewing pattern?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {TARGETS.map((target) => (
                  <button
                    key={target}
                    onClick={() => setSelectedTarget(target)}
                    className={`p-8 rounded-xl border-2 transition-all ${
                      selectedTarget === target
                        ? 'border-teal-500 bg-teal-500/20 scale-105'
                        : 'border-[#1a2535] hover:border-gray-600'
                    }`}
                  >
                    <div className="text-4xl font-bold mb-2">Target {target}</div>
                    <div className="text-sm text-slate-400">
                      Resonance: {resonanceRatings[target]}/10
                    </div>
                  </button>
                ))}
              </div>

              {/* Confidence Slider */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Overall Confidence
                  <span className="text-slate-400 ml-2">(How confident are you in your selection?)</span>
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">Low</span>
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={confidence}
                      onChange={(e) => setConfidence(parseInt(e.target.value))}
                      className="w-full h-2 bg-[#1a2535] rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #0d9488 0%, #0d9488 ${confidence}%, #374151 ${confidence}%, #374151 100%)`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-slate-400">High</span>
                  <div className="w-16 text-center">
                    <span className="text-2xl font-bold text-teal-400">{confidence}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-teal-900/20 border border-teal-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-teal-400">Privacy Protected</strong>
                <p className="text-slate-400 mt-1">
                  Your complete ratings and selection will be encrypted and stored on IPFS.
                  Only the commitment hash goes on-chain, ensuring complete privacy until you choose to reveal.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || !selectedTarget}
              className="w-full px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-teal-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Commitment...
                </>
              ) : (
                <>
                  Commit Selection
                  <Lock className="w-5 h-5" />
                </>
              )}
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
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Commitment Created!</h2>
            <p className="text-slate-400 mb-8">
              Your memory field detection has been encrypted and committed to the blockchain.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535] break-all">
                {commitmentId}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold mb-4">Your Selection</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Selected Target:</span>
                  <span className="text-2xl font-bold text-teal-400">Target {selectedTarget}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Resonance Strength:</span>
                  <span className="font-semibold">{selectedTarget && resonanceRatings[selectedTarget]}/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-semibold">{confidence}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Encrypted & Stored</strong>
                  <p className="text-sm text-slate-400">
                    Your complete ratings are encrypted on IPFS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Blockchain Verified</strong>
                  <p className="text-sm text-slate-400">
                    Commitment hash timestamped on Cardano
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Ready for Analysis</strong>
                  <p className="text-sm text-slate-400">
                    Results can be verified and scored from Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-300">
                <strong>Tip:</strong> Memory field experiments work best when performed regularly.
                Track your accuracy over time to detect patterns and improvements in your sensitivity.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-teal-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => router.push('/experiments')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-colors"
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
