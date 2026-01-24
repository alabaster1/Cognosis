'use client';

/**
 * Time-Loop Detection Experiment
 * Track déjà vu, temporal anomalies, and time-loop experiences
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Hourglass, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Phase = 'intro' | 'event' | 'temporal' | 'knowledge' | 'pattern' | 'verification' | 'summary' | 'success';

type ExperienceType = 'Déjà Vu' | 'Déjà Vécu' | 'Premonition' | 'Jamais Vu' | 'Precognitive Recognition';
type Duration = 'Instant' | 'Seconds' | 'Extended' | 'Prolonged';
type Source = 'Dream' | 'Vision' | 'Intuition' | 'Meditation' | 'Previous Loop' | 'External';
type DetailType = 'Dialogue' | 'Visual' | 'Sequence' | 'Emotion' | 'Sensory' | 'Action' | 'Location' | 'Person';

export default function TimeLoopPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [phase, setPhase] = useState<Phase>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [commitmentId, setCommitmentId] = useState('');
  const [error, setError] = useState('');

  // Event phase data
  const [location, setLocation] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  // Temporal phase data
  const [experienceType, setExperienceType] = useState<ExperienceType>('Déjà Vu');
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState<Duration>('Instant');

  // Knowledge phase data
  const [hadPriorKnowledge, setHadPriorKnowledge] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<Source[]>([]);
  const [detailsRecognized, setDetailsRecognized] = useState<DetailType[]>([]);
  const [knowledgeTiming, setKnowledgeTiming] = useState('');

  // Pattern phase data
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [timelineVariations, setTimelineVariations] = useState('');
  const [branchingPoints, setBranchingPoints] = useState('');

  // Verification phase data
  const [hasWitnesses, setHasWitnesses] = useState(false);
  const [hasEvidence, setHasEvidence] = useState(false);
  const [evidenceType, setEvidenceType] = useState('');

  // Summary phase data
  const [significanceRating, setSignificanceRating] = useState(5);
  const [personalNotes, setPersonalNotes] = useState('');

  const intensityLabels = [
    'Subtle',
    'Faint',
    'Mild',
    'Moderate',
    'Notable',
    'Strong',
    'Very Strong',
    'Intense',
    'Overwhelming'
  ];

  const handleStartExperiment = () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
    setPhase('event');
  };

  const handleEventSubmit = () => {
    if (!eventDescription.trim()) {
      setError('Please describe what happened');
      return;
    }
    setError('');
    setPhase('temporal');
  };

  const handleTemporalSubmit = () => {
    setPhase('knowledge');
  };

  const handleKnowledgeSubmit = () => {
    if (hadPriorKnowledge) {
      if (knowledgeSources.length === 0) {
        setError('Please select at least one source of prior knowledge');
        return;
      }
      if (detailsRecognized.length === 0) {
        setError('Please select at least one type of detail recognized');
        return;
      }
      if (!knowledgeTiming.trim()) {
        setError('Please indicate when you had this knowledge');
        return;
      }
    }
    setError('');
    setPhase('pattern');
  };

  const handlePatternSubmit = () => {
    if (isRecurring) {
      if (recurrenceCount < 2) {
        setError('For recurring experiences, count must be at least 2');
        return;
      }
    }
    setError('');
    setPhase('verification');
  };

  const handleVerificationSubmit = () => {
    setPhase('summary');
  };

  const handleSummarySubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const experimentData = {
        event: {
          location,
          time: eventTime,
          description: eventDescription,
        },
        temporal: {
          experienceType,
          intensity,
          intensityLabel: intensityLabels[intensity - 1],
          duration,
        },
        priorKnowledge: hadPriorKnowledge ? {
          sources: knowledgeSources,
          detailsRecognized,
          timing: knowledgeTiming,
        } : null,
        loopPattern: isRecurring ? {
          recurrenceCount,
          variations: timelineVariations,
          branchingPoints,
        } : null,
        verification: {
          hasWitnesses,
          hasEvidence,
          evidenceType: hasEvidence ? evidenceType : null,
        },
        summary: {
          significanceRating,
          notes: personalNotes,
        },
      };

      const result = await experimentService.createCommitment({
        experimentType: 'time-loop',
        prediction: JSON.stringify(experimentData, null, 2),
        metadata: {
          type: 'time-loop',
          title: `Time-Loop Detection: ${experienceType}`,
          description: `${location || 'Location unspecified'} - ${eventTime || 'Time unspecified'}`,
          category: 'time-loop',
          tags: [
            'time-loop',
            experienceType.toLowerCase().replace(/\s+/g, '-'),
            duration.toLowerCase(),
            ...(isRecurring ? ['recurring'] : []),
            ...(hadPriorKnowledge ? ['prior-knowledge'] : []),
          ].filter(Boolean),
        },
      });

      setCommitmentId(result.commitmentId);
      setPhase('success');
    } catch (err: unknown) {
      console.error('Commit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create commitment');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSource = (source: Source) => {
    setKnowledgeSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const toggleDetail = (detail: DetailType) => {
    setDetailsRecognized(prev =>
      prev.includes(detail)
        ? prev.filter(d => d !== detail)
        : [...prev, detail]
    );
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#060a0f] overflow-hidden relative">
        <Header />
        {/* Infinity loop particle effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.svg
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 opacity-10"
            viewBox="0 0 200 100"
          >
            <motion.path
              d="M50,50 C50,20 80,20 100,50 C120,80 150,80 150,50 C150,20 120,20 100,50 C80,80 50,80 50,50"
              stroke="url(#loopGrad)"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="400"
              animate={{ strokeDashoffset: [400, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            <defs>
              <linearGradient id="loopGrad">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
          </motion.svg>
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto text-center">
            {/* Hourglass with flip animation */}
            <motion.div
              className="inline-flex items-center justify-center w-24 h-24 mb-6 relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <motion.div
                className="w-18 h-18 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-400/30 flex items-center justify-center p-4 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Hourglass className="w-10 h-10 text-violet-400" />
              </motion.div>
            </motion.div>

            <motion.h1
              className="text-5xl md:text-6xl font-black mb-1"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                TIME-LOOP
              </span>
            </motion.h1>
            <motion.p
              className="text-2xl text-white/40 font-light tracking-[0.3em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              DETECTION
            </motion.p>

            <motion.p
              className="text-violet-300/50 text-sm mt-4 uppercase tracking-widest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Temporal Anomaly Research
            </motion.p>

            <motion.p
              className="text-slate-400 max-w-sm mx-auto text-sm mt-4 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Document d&eacute;j&agrave; vu moments and temporal glitches.
              Has this happened before?
            </motion.p>

            {/* Anomaly types */}
            <motion.div
              className="flex flex-wrap justify-center gap-2 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {['D\u00e9j\u00e0 Vu', 'Precognitive Dream', 'Time Slip', 'Repeated Pattern', 'Glitch'].map((type, i) => (
                <motion.span
                  key={type}
                  className="px-3 py-1.5 bg-violet-950/40 border border-violet-500/20 text-violet-300/70 rounded-full text-xs"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.06, type: 'spring' }}
                >
                  {type}
                </motion.span>
              ))}
            </motion.div>

            {/* Compact steps */}
            <motion.div
              className="grid grid-cols-5 gap-1 mb-8 max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {['Describe', 'Classify', 'Document', 'Pattern', 'Commit'].map((s, i) => (
                <div key={i} className="text-center p-2 rounded-lg bg-[#0a0e14] border border-violet-500/10">
                  <div className="text-[9px] text-violet-500/50 font-mono">{i + 1}</div>
                  <div className="text-[10px] text-white/60">{s}</div>
                </div>
              ))}
            </motion.div>

            <motion.button
              onClick={handleStartExperiment}
              className="w-full max-w-md mx-auto relative group block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
              <div className="relative px-8 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <Hourglass className="w-5 h-5" />
                Log Temporal Event
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === 'event') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Describe the Event</h2>
            <p className="text-slate-400 mb-8">
              Record what just happened while the experience is fresh
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Coffee shop on Main Street"
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Time of Event (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  What Happened? *
                </label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Describe the event in detail - what were you doing, who was present, what triggered the experience..."
                  rows={8}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none resize-none"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Include as much context as possible - the environment, people involved, what you were thinking about
                </p>
              </div>

              <button
                onClick={handleEventSubmit}
                className="w-full px-6 py-3 bg-violet-600 rounded-lg font-semibold hover:bg-violet-700 transition-colors"
              >
                Continue to Temporal Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'temporal') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Temporal Characteristics</h2>
            <p className="text-slate-400 mb-8">
              Classify the nature and intensity of your experience
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Experience Type
                </label>
                <select
                  value={experienceType}
                  onChange={(e) => setExperienceType(e.target.value as ExperienceType)}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none"
                >
                  <option value="Déjà Vu">Déjà Vu - Feeling of having experienced this before</option>
                  <option value="Déjà Vécu">Déjà Vécu - Detailed recollection of living through this moment</option>
                  <option value="Premonition">Premonition - Advance knowledge of what would happen</option>
                  <option value="Jamais Vu">Jamais Vu - Familiar situation feels completely unfamiliar</option>
                  <option value="Precognitive Recognition">Precognitive Recognition - Knowing what comes next</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Intensity: {intensity} - {intensityLabels[intensity - 1]}
                </label>
                <input
                  type="range"
                  min="1"
                  max="9"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Subtle</span>
                  <span>Moderate</span>
                  <span>Overwhelming</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Instant', 'Seconds', 'Extended', 'Prolonged'] as Duration[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-4 py-3 rounded-lg border transition-colors ${
                        duration === d
                          ? 'bg-violet-600 border-violet-500'
                          : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  Instant: Flash | Seconds: Brief moment | Extended: Minutes | Prolonged: Ongoing
                </p>
              </div>

              <button
                onClick={handleTemporalSubmit}
                className="w-full px-6 py-3 bg-violet-600 rounded-lg font-semibold hover:bg-violet-700 transition-colors"
              >
                Continue to Prior Knowledge
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'knowledge') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Prior Knowledge</h2>
            <p className="text-slate-400 mb-8">
              Did you have advance knowledge of this event?
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Did you have prior knowledge of this event?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setHadPriorKnowledge(true)}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      hadPriorKnowledge
                        ? 'bg-violet-600 border-violet-500'
                        : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setHadPriorKnowledge(false)}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      !hadPriorKnowledge
                        ? 'bg-violet-600 border-violet-500'
                        : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {hadPriorKnowledge && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Sources of Prior Knowledge (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['Dream', 'Vision', 'Intuition', 'Meditation', 'Previous Loop', 'External'] as Source[]).map((source) => (
                        <button
                          key={source}
                          onClick={() => toggleSource(source)}
                          className={`px-4 py-3 rounded-lg border transition-colors ${
                            knowledgeSources.includes(source)
                              ? 'bg-violet-600 border-violet-500'
                              : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                          }`}
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Specific Details Recognized (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['Dialogue', 'Visual', 'Sequence', 'Emotion', 'Sensory', 'Action', 'Location', 'Person'] as DetailType[]).map((detail) => (
                        <button
                          key={detail}
                          onClick={() => toggleDetail(detail)}
                          className={`px-4 py-3 rounded-lg border transition-colors ${
                            detailsRecognized.includes(detail)
                              ? 'bg-violet-600 border-violet-500'
                              : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                          }`}
                        >
                          {detail}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      When did you have this knowledge?
                    </label>
                    <textarea
                      value={knowledgeTiming}
                      onChange={(e) => setKnowledgeTiming(e.target.value)}
                      placeholder="e.g., Had a dream about this 3 days ago, or felt it coming seconds before..."
                      rows={3}
                      className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleKnowledgeSubmit}
                className="w-full px-6 py-3 bg-violet-600 rounded-lg font-semibold hover:bg-violet-700 transition-colors"
              >
                Continue to Pattern Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'pattern') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Pattern Recognition</h2>
            <p className="text-slate-400 mb-8">
              Is this experience part of a recurring pattern?
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Is this a recurring experience?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsRecurring(true)}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      isRecurring
                        ? 'bg-violet-600 border-violet-500'
                        : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setIsRecurring(false)}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      !isRecurring
                        ? 'bg-violet-600 border-violet-500'
                        : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {isRecurring && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      How many times has this occurred? (Including this instance)
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 2)}
                      className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Timeline Variations (Optional)
                    </label>
                    <textarea
                      value={timelineVariations}
                      onChange={(e) => setTimelineVariations(e.target.value)}
                      placeholder="What changed between iterations? Different outcomes, different choices made..."
                      rows={4}
                      className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Branching Points (Optional)
                    </label>
                    <textarea
                      value={branchingPoints}
                      onChange={(e) => setBranchingPoints(e.target.value)}
                      placeholder="Key decision points or moments where timelines diverged..."
                      rows={4}
                      className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handlePatternSubmit}
                className="w-full px-6 py-3 bg-violet-600 rounded-lg font-semibold hover:bg-violet-700 transition-colors"
              >
                Continue to Verification
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'verification') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Verification</h2>
            <p className="text-slate-400 mb-8">
              Is there any external confirmation of this experience?
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Were there witnesses to this event?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setHasWitnesses(true)}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      hasWitnesses
                        ? 'bg-violet-600 border-violet-500'
                        : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setHasWitnesses(false)}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      !hasWitnesses
                        ? 'bg-violet-600 border-violet-500'
                        : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">
                  Do you have any evidence of this experience?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setHasEvidence(true)}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      hasEvidence
                        ? 'bg-violet-600 border-violet-500'
                        : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setHasEvidence(false)}
                    className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
                      !hasEvidence
                        ? 'bg-violet-600 border-violet-500'
                        : 'bg-[#0f1520] border-[#1a2535] hover:border-violet-500'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {hasEvidence && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type of Evidence
                  </label>
                  <input
                    type="text"
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    placeholder="e.g., Written notes, photo timestamp, recording, journal entry..."
                    className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none"
                  />
                </div>
              )}

              <button
                onClick={handleVerificationSubmit}
                className="w-full px-6 py-3 bg-violet-600 rounded-lg font-semibold hover:bg-violet-700 transition-colors"
              >
                Continue to Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Final Summary</h2>
            <p className="text-slate-400 mb-8">
              Rate the significance and add any final notes
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Personal Significance: {significanceRating}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={significanceRating}
                  onChange={(e) => setSignificanceRating(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Minor</span>
                  <span>Moderate</span>
                  <span>Profound</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder="Any other observations, feelings, or context you want to record..."
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-violet-500 focus:outline-none resize-none"
                />
              </div>

              <div className="bg-violet-900/20 border border-violet-500/50 rounded-lg p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong className="text-violet-400">Privacy Protected</strong>
                  <p className="text-slate-400 mt-1">
                    Your time-loop experience will be encrypted and stored on IPFS. Only the commitment hash goes
                    on-chain, ensuring complete privacy until you choose to reveal.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSummarySubmit}
                disabled={isLoading}
                className="w-full px-6 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Commitment...
                  </>
                ) : (
                  <>
                    Commit Experience
                    <Lock className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
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
              Your time-loop experience has been encrypted and committed to the blockchain.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535] break-all">
                {commitmentId}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Encrypted & Stored</strong>
                  <p className="text-sm text-slate-400">
                    Your experience is encrypted on IPFS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
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
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  📊
                </div>
                <div>
                  <strong>Pattern Analysis</strong>
                  <p className="text-sm text-slate-400">
                    Track temporal anomalies over time in your Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-violet-900/20 border border-violet-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-violet-300">
                <strong>Tip:</strong> Document temporal anomalies as they occur for better pattern recognition.
                Review your experiences in the Dashboard to identify recurring loops or precognitive patterns.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-violet-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => router.push('/experiments')}
                className="flex-1 px-6 py-3 bg-violet-600 rounded-lg font-semibold hover:bg-violet-700 transition-colors"
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
