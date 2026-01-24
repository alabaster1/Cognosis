'use client';

/**
 * Ganzfeld Protocol Experiment
 * Classic sensory deprivation protocol for psi research
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Eye, Lock, Volume2, Lightbulb, ArrowRight, Loader2, Plus, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

type Phase = 'intro' | 'setup' | 'adaptation' | 'reception' | 'mentation' | 'judging' | 'success';

interface MentationEntry {
  timestamp: number;
  elapsed: number;
  text: string;
}

interface TargetRanking {
  imageId: string;
  rank: number;
}

export default function GanzfeldPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [phase, setPhase] = useState<Phase>('intro');
  const [setupChecklist, setSetupChecklist] = useState({
    quietSpace: false,
    comfortable: false,
    eyeCovering: false,
    headphones: false,
    lighting: false,
  });

  // Adaptation phase (5 minutes)
  const [adaptationTimeLeft, setAdaptationTimeLeft] = useState(300);
  const [adaptationStarted, setAdaptationStarted] = useState(false);

  // Reception phase (15 minutes)
  const [receptionTimeLeft, setReceptionTimeLeft] = useState(900);
  const [receptionStartTime, setReceptionStartTime] = useState(0);
  const [mentationLog, setMentationLog] = useState<MentationEntry[]>([]);
  const [currentImpression, setCurrentImpression] = useState('');

  // Mentation review
  const [finalNotes, setFinalNotes] = useState('');

  // Judging phase
  const [targetRankings, setTargetRankings] = useState<TargetRanking[]>([
    { imageId: 'A', rank: 0 },
    { imageId: 'B', rank: 0 },
    { imageId: 'C', rank: 0 },
    { imageId: 'D', rank: 0 },
  ]);
  const [confidence, setConfidence] = useState(50);

  // Submission
  const [isLoading, setIsLoading] = useState(false);
  const [commitmentId, setCommitmentId] = useState('');
  const [error, setError] = useState('');

  // Adaptation timer
  useEffect(() => {
    if (phase === 'adaptation' && adaptationStarted && adaptationTimeLeft > 0) {
      const timer = setInterval(() => {
        setAdaptationTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setPhase('reception');
            setReceptionStartTime(Date.now());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, adaptationStarted, adaptationTimeLeft]);

  // Reception timer
  useEffect(() => {
    if (phase === 'reception' && receptionTimeLeft > 0) {
      const timer = setInterval(() => {
        setReceptionTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setPhase('mentation');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, receptionTimeLeft]);

  const handleStartExperiment = () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
    setPhase('setup');
  };

  const handleSetupComplete = () => {
    const allChecked = Object.values(setupChecklist).every((v) => v);
    if (!allChecked) {
      setError('Please complete all setup items for optimal results');
      return;
    }
    setError('');
    setPhase('adaptation');
  };

  const handleStartAdaptation = () => {
    setAdaptationStarted(true);
  };

  const handleSkipAdaptation = () => {
    setPhase('reception');
    setReceptionStartTime(Date.now());
  };

  const handleAddImpression = () => {
    if (!currentImpression.trim()) return;

    const elapsed = Math.floor((Date.now() - receptionStartTime) / 1000);
    setMentationLog([
      ...mentationLog,
      {
        timestamp: Date.now(),
        elapsed,
        text: currentImpression.trim(),
      },
    ]);
    setCurrentImpression('');
  };

  const handleContinueToJudging = () => {
    if (mentationLog.length === 0 && !finalNotes.trim()) {
      setError('Please log at least one impression or add final notes');
      return;
    }
    setError('');
    setPhase('judging');
  };

  const handleRankingChange = (imageId: string, rank: number) => {
    setTargetRankings((prev) =>
      prev.map((item) =>
        item.imageId === imageId ? { ...item, rank } : item
      )
    );
  };

  const handleSubmitExperiment = async () => {
    // Validate rankings
    const ranks = targetRankings.map((r) => r.rank).filter((r) => r > 0);
    if (ranks.length !== 4 || new Set(ranks).size !== 4) {
      setError('Please rank all 4 targets from 1-4 (each rank used once)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const experimentData = {
        mentationLog,
        finalNotes,
        targetRankings,
        confidence,
        adaptationDuration: 300 - adaptationTimeLeft,
        receptionDuration: 900 - receptionTimeLeft,
      };

      const result = await experimentService.createCommitment({
        experimentType: 'remote-viewing', // Using remote-viewing type for now
        prediction: JSON.stringify(experimentData),
        metadata: {
          type: 'remote-viewing',
          title: 'Ganzfeld Protocol Session',
          description: `Sensory deprivation experiment with ${mentationLog.length} impressions`,
          category: 'ganzfeld',
          tags: ['ganzfeld', 'sensory-deprivation', 'reception'],
        },
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Ganzfeld Protocol</h1>
                <p className="text-slate-400">Sensory deprivation for psi reception</p>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">The Ganzfeld Method</h2>
              <p className="text-slate-300 mb-4">
                The Ganzfeld protocol uses mild sensory deprivation to create an optimal state for psi reception.
                By reducing external stimuli through uniform visual fields (red light + eye covering) and white/pink
                noise, participants enter a relaxed, receptive state that may enhance psychic perception.
              </p>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Setup Environment</strong>
                    <p className="text-slate-400 text-sm">
                      Quiet space, eye covering (ping pong balls or cotton pads), headphones, red/amber light
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Adaptation Phase (5 min)</strong>
                    <p className="text-slate-400 text-sm">
                      Pink noise playing, visual field uniform, body relaxed
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>Reception Phase (15 min)</strong>
                    <p className="text-slate-400 text-sm">
                      Log impressions, images, thoughts as they arise
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    4
                  </span>
                  <div>
                    <strong>Review & Judge</strong>
                    <p className="text-slate-400 text-sm">
                      Review mentation log and rank target images by match quality
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-8">
              <p className="text-sm text-cyan-300">
                <strong>Note:</strong> This experiment works best in a quiet, comfortable environment.
                You&apos;ll need headphones and some form of eye covering (halved ping pong balls, cotton pads,
                or sleep mask). A red or amber light creates the ideal visual field.
              </p>
            </div>

            <button
              onClick={handleStartExperiment}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2"
            >
              Start Experiment
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Setup Your Environment</h2>
            <p className="text-slate-400 mb-8">
              Prepare your physical space for optimal Ganzfeld conditions
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-8">
              <label className="flex items-start gap-3 p-4 bg-[#0f1520]/80 border border-[#1a2535] rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                <input
                  type="checkbox"
                  checked={setupChecklist.quietSpace}
                  onChange={(e) =>
                    setSetupChecklist({ ...setupChecklist, quietSpace: e.target.checked })
                  }
                  className="mt-1 w-5 h-5 rounded border-[#1a2535] text-cyan-500 focus:ring-cyan-500"
                />
                <div className="flex-1">
                  <div className="font-semibold">Quiet Space</div>
                  <p className="text-sm text-slate-400">
                    Find a quiet room with minimal distractions and interruptions
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-[#0f1520]/80 border border-[#1a2535] rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                <input
                  type="checkbox"
                  checked={setupChecklist.comfortable}
                  onChange={(e) =>
                    setSetupChecklist({ ...setupChecklist, comfortable: e.target.checked })
                  }
                  className="mt-1 w-5 h-5 rounded border-[#1a2535] text-cyan-500 focus:ring-cyan-500"
                />
                <div className="flex-1">
                  <div className="font-semibold">Comfortable Position</div>
                  <p className="text-sm text-slate-400">
                    Reclined chair or lying down, fully supported and relaxed
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-[#0f1520]/80 border border-[#1a2535] rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                <input
                  type="checkbox"
                  checked={setupChecklist.eyeCovering}
                  onChange={(e) =>
                    setSetupChecklist({ ...setupChecklist, eyeCovering: e.target.checked })
                  }
                  className="mt-1 w-5 h-5 rounded border-[#1a2535] text-cyan-500 focus:ring-cyan-500"
                />
                <div className="flex-1 flex items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">Eye Covering</div>
                    <p className="text-sm text-slate-400">
                      Ping pong ball halves (taped over eyes), cotton pads, or sleep mask
                    </p>
                  </div>
                  <Eye className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-[#0f1520]/80 border border-[#1a2535] rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                <input
                  type="checkbox"
                  checked={setupChecklist.headphones}
                  onChange={(e) =>
                    setSetupChecklist({ ...setupChecklist, headphones: e.target.checked })
                  }
                  className="mt-1 w-5 h-5 rounded border-[#1a2535] text-cyan-500 focus:ring-cyan-500"
                />
                <div className="flex-1 flex items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">Headphones Ready</div>
                    <p className="text-sm text-slate-400">
                      Comfortable headphones or earbuds for pink/white noise
                    </p>
                  </div>
                  <Volume2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-[#0f1520]/80 border border-[#1a2535] rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                <input
                  type="checkbox"
                  checked={setupChecklist.lighting}
                  onChange={(e) =>
                    setSetupChecklist({ ...setupChecklist, lighting: e.target.checked })
                  }
                  className="mt-1 w-5 h-5 rounded border-[#1a2535] text-cyan-500 focus:ring-cyan-500"
                />
                <div className="flex-1 flex items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">Red/Amber Lighting</div>
                    <p className="text-sm text-slate-400">
                      Soft red or amber light source (LED bulb, lamp filter, or flashlight)
                    </p>
                  </div>
                  <Lightbulb className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                </div>
              </label>
            </div>

            <button
              onClick={handleSetupComplete}
              className="w-full px-6 py-3 bg-cyan-600 rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
            >
              Continue to Adaptation
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'adaptation') {
    const progress = ((300 - adaptationTimeLeft) / 300) * 100;

    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Adaptation Phase</h2>
            <p className="text-slate-400 mb-8">
              Relax and let your senses adjust to the Ganzfeld state
            </p>

            {!adaptationStarted ? (
              <div className="space-y-6">
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-3">Before You Begin:</h3>
                  <ul className="text-left space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Put on your eye covering (eyes open beneath it)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Put on headphones and start pink noise (search &quot;pink noise&quot; on YouTube/Spotify)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Get comfortable in your position</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Red/amber light should be on</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleStartAdaptation}
                  className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                  Start 5-Minute Adaptation
                </button>

                <button
                  onClick={handleSkipAdaptation}
                  className="text-slate-500 hover:text-slate-300 text-sm underline"
                >
                  Skip adaptation (not recommended)
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Visual Pink Noise Simulation */}
                <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden">
                  <motion.div
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 bg-gradient-to-br from-pink-600 via-violet-600 to-pink-600"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold">{formatTime(adaptationTimeLeft)}</div>
                      <div className="text-sm text-cyan-300 mt-2">Adapting...</div>
                    </div>
                  </div>
                </div>

                <p className="text-slate-400">
                  Relax and breathe naturally. Notice the uniform visual field.
                  Let your mind drift and become receptive.
                </p>

                {/* Progress Bar */}
                <div className="w-full max-w-md mx-auto">
                  <div className="h-2 bg-[#142030] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSkipAdaptation}
                  className="text-slate-500 hover:text-slate-300 text-sm underline"
                >
                  Skip remaining time
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'reception') {
    const progress = ((900 - receptionTimeLeft) / 900) * 100;

    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold">Reception Phase</h2>
                <p className="text-slate-400">Log your impressions as they arise</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-cyan-400">{formatTime(receptionTimeLeft)}</div>
                <div className="text-sm text-slate-500">remaining</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full mb-8">
              <div className="h-2 bg-[#142030] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Current Impression Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Current Impression
              </label>
              <div className="flex gap-2">
                <textarea
                  value={currentImpression}
                  onChange={(e) => setCurrentImpression(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddImpression();
                    }
                  }}
                  placeholder="Describe what you see, feel, or sense... Press Enter to log."
                  rows={3}
                  className="flex-1 px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-cyan-500 focus:outline-none resize-none"
                />
                <button
                  onClick={handleAddImpression}
                  disabled={!currentImpression.trim()}
                  className="px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Log
                </button>
              </div>
            </div>

            {/* Mentation Log */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Mentation Log ({mentationLog.length} entries)
              </h3>

              {mentationLog.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No impressions logged yet. Start recording what you perceive...
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {mentationLog.map((entry, index) => (
                    <div
                      key={index}
                      className="p-3 bg-[#060a0f]/30 rounded border border-[#1a2535]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs text-cyan-400 font-mono">
                          +{formatElapsed(entry.elapsed)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  setReceptionTimeLeft(0);
                  setPhase('mentation');
                }}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-cyan-500 transition-colors"
              >
                End Early
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mentation') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Review Your Mentation</h2>
            <p className="text-slate-400 mb-8">
              Review your impressions and add any final notes before judging
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Mentation Log Review */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                Logged Impressions ({mentationLog.length})
              </h3>

              {mentationLog.length === 0 ? (
                <p className="text-slate-500 text-sm">No impressions were logged.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {mentationLog.map((entry, index) => (
                    <div
                      key={index}
                      className="p-3 bg-[#060a0f]/30 rounded border border-[#1a2535]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs text-cyan-400 font-mono">
                          +{formatElapsed(entry.elapsed)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Final Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Final Notes (Optional)
              </label>
              <textarea
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                placeholder="Add any additional observations, patterns, or insights..."
                rows={6}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-cyan-500 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleContinueToJudging}
              className="w-full px-6 py-3 bg-cyan-600 rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
            >
              Continue to Target Judging
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'judging') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Judge Target Images</h2>
            <p className="text-slate-400 mb-8">
              Rank the 4 target images from 1 (best match) to 4 (worst match)
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Target Images with Ranking */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {targetRankings.map((target) => (
                <div
                  key={target.imageId}
                  className="bg-[#0f1520]/80 border border-[#1a2535] rounded-lg p-6"
                >
                  {/* Placeholder for target image */}
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-4 flex items-center justify-center">
                    <div className="text-4xl font-bold text-slate-600">
                      Target {target.imageId}
                    </div>
                  </div>

                  <label className="block text-sm font-medium mb-2">
                    Rank (1=best match, 4=worst)
                  </label>
                  <select
                    value={target.rank}
                    onChange={(e) =>
                      handleRankingChange(target.imageId, parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={0}>Select rank...</option>
                    <option value={1}>1 - Best match</option>
                    <option value={2}>2 - Good match</option>
                    <option value={3}>3 - Weak match</option>
                    <option value={4}>4 - No match</option>
                  </select>
                </div>
              ))}
            </div>

            {/* Confidence Slider */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-lg p-6 mb-8">
              <label className="block text-sm font-medium mb-4">
                Overall Confidence: {confidence}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-[#1a2535] rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>No confidence</span>
                <span>Complete confidence</span>
              </div>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-cyan-400">Privacy Protected</strong>
                <p className="text-slate-400 mt-1">
                  Your mentation log and rankings will be encrypted and stored on IPFS.
                  Only the commitment hash goes on-chain, ensuring complete privacy.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitExperiment}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Commitment...
                </>
              ) : (
                <>
                  Commit Experiment
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
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Commitment Created!</h2>
            <p className="text-slate-400 mb-8">
              Your Ganzfeld session data has been encrypted and committed to the blockchain.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535]">
                {commitmentId}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Encrypted & Stored</strong>
                  <p className="text-sm text-slate-400">
                    {mentationLog.length} impressions encrypted on IPFS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Blockchain Verified</strong>
                  <p className="text-sm text-slate-400">
                    Commitment hash timestamped on Midnight
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Rankings Recorded</strong>
                  <p className="text-sm text-slate-400">
                    Target rankings and {confidence}% confidence logged
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-300">
                <strong>Next Steps:</strong> The actual target will be revealed after the session.
                Visit your Dashboard to check if your top-ranked image was the actual target.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-cyan-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => router.push('/experiments')}
                className="flex-1 px-6 py-3 bg-cyan-600 rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
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
