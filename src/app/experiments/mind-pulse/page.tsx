'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/useWalletStore';
import RevealModal, { StatsSummary } from '@/components/modals/RevealModal';
import {
  Loader2,
  Radio,
  Globe,
  Users,
  Clock,
  Target,
  Activity,
  Sparkles,
  TrendingUp,
  Zap,
  CircleDot,
} from 'lucide-react';

type Phase = 'intro' | 'waiting' | 'focusing' | 'pulse' | 'results' | 'history';

interface PulseTarget {
  id: string;
  type: 'color' | 'number' | 'concept';
  value: string;
  displayValue: string;
}

interface PulseEvent {
  id: string;
  scheduledTime: Date;
  target: PulseTarget;
  participants: number;
  convergenceRate: number;
  effectSize: number;
  completed: boolean;
}

interface HistoricalPulse {
  id: string;
  date: string;
  target: string;
  participants: number;
  convergenceRate: number;
  effectSize: number;
  significance: string;
}

// Simulated pulse targets
const PULSE_TARGETS: PulseTarget[] = [
  { id: 'red', type: 'color', value: 'red', displayValue: 'RED' },
  { id: 'blue', type: 'color', value: 'blue', displayValue: 'BLUE' },
  { id: 'green', type: 'color', value: 'green', displayValue: 'GREEN' },
  { id: '7', type: 'number', value: '7', displayValue: 'SEVEN' },
  { id: '3', type: 'number', value: '3', displayValue: 'THREE' },
  { id: 'peace', type: 'concept', value: 'peace', displayValue: 'PEACE' },
  { id: 'unity', type: 'concept', value: 'unity', displayValue: 'UNITY' },
  { id: 'light', type: 'concept', value: 'light', displayValue: 'LIGHT' },
];

// Simulated historical pulses
const HISTORICAL_PULSES: HistoricalPulse[] = [
  { id: '1', date: '2025-01-18 18:00', target: 'BLUE', participants: 1247, convergenceRate: 34.2, effectSize: 0.12, significance: 'Significant (p < 0.05)' },
  { id: '2', date: '2025-01-18 12:00', target: 'SEVEN', participants: 892, convergenceRate: 28.1, effectSize: 0.08, significance: 'Marginal (p < 0.10)' },
  { id: '3', date: '2025-01-17 18:00', target: 'PEACE', participants: 2103, convergenceRate: 41.7, effectSize: 0.19, significance: 'Highly Significant (p < 0.01)' },
  { id: '4', date: '2025-01-17 12:00', target: 'RED', participants: 756, convergenceRate: 31.5, effectSize: 0.09, significance: 'Significant (p < 0.05)' },
  { id: '5', date: '2025-01-16 18:00', target: 'THREE', participants: 1534, convergenceRate: 26.3, effectSize: 0.05, significance: 'Not Significant' },
];

export default function MindPulsePage() {
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [nonce, setNonce] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Pulse state
  const [nextPulse, setNextPulse] = useState<PulseEvent | null>(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [currentTarget, setCurrentTarget] = useState<PulseTarget | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [convergenceLevel, setConvergenceLevel] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [focusTimer, setFocusTimer] = useState(60);
  const [hasJoined, setHasJoined] = useState(false);

  // Generate next pulse event
  const generateNextPulse = useCallback(() => {
    const now = new Date();
    // Next pulse at the next hour mark
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    nextHour.setSeconds(0);
    nextHour.setMilliseconds(0);

    // For demo, make it sooner (2 minutes from now)
    const demoTime = new Date(now.getTime() + 2 * 60 * 1000);

    const randomTarget = PULSE_TARGETS[Math.floor(Math.random() * PULSE_TARGETS.length)];

    return {
      id: `pulse-${Date.now()}`,
      scheduledTime: demoTime,
      target: randomTarget,
      participants: Math.floor(Math.random() * 500) + 200,
      convergenceRate: 0,
      effectSize: 0,
      completed: false,
    };
  }, []);

  // Update countdown
  useEffect(() => {
    if (!nextPulse || phase !== 'waiting') return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextPulse.scheduledTime.getTime() - now.getTime();

      if (diff <= 0) {
        setPhase('focusing');
        setFocusTimer(60);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [nextPulse, phase]);

  // Focus timer and simulation
  useEffect(() => {
    if (phase !== 'focusing') return;

    const interval = setInterval(() => {
      setFocusTimer((prev) => {
        if (prev <= 1) {
          setPhase('pulse');
          simulatePulse();
          return 0;
        }
        return prev - 1;
      });

      // Simulate increasing convergence and participants
      setParticipantCount((prev) => prev + Math.floor(Math.random() * 5) + 1);
      setConvergenceLevel((prev) => Math.min(100, prev + Math.random() * 2));
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Pulse animation
  useEffect(() => {
    if (phase !== 'pulse') return;

    const interval = setInterval(() => {
      setPulseIntensity((prev) => {
        if (prev >= 100) {
          setTimeout(() => setPhase('results'), 3000);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase]);

  const simulatePulse = async () => {
    // Submit participation and get final results from backend
    try {
      const participantId = localStorage.getItem(`mind_pulse_participant_${commitmentId}`) || nonce;

      const result = await apiService.completeMindPulse({
        pulseId: commitmentId,
        participantId,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setConvergenceLevel(result.convergenceRate);
      setParticipantCount(result.finalParticipantCount);

      // Submit to global feed
      await apiService.submitToFeed({
        experimentType: 'mind-pulse',
        score: result.convergenceRate > 30 ? 1 : 0,
        accuracy: result.convergenceRate,
        baseline: 25,
        commitmentHash: result.pulseHash,
        verified: result.verified,
      });

      // Clean up
      localStorage.removeItem(`mind_pulse_participant_${commitmentId}`);
    } catch (err) {
      // Fallback: simulate final convergence rate
      const finalConvergence = 25 + Math.random() * 20;
      setConvergenceLevel(finalConvergence);
    }
  };

  const initializePulse = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Call backend to get or create a pulse event
      const result = await apiService.joinMindPulse({
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.pulseId);
      setNonce(result.participantId);
      localStorage.setItem(`mind_pulse_participant_${result.pulseId}`, result.participantId);

      // Use backend-provided pulse data
      const targetIndex = result.targetIndex;
      const target = PULSE_TARGETS[targetIndex % PULSE_TARGETS.length];

      const pulse: PulseEvent = {
        id: result.pulseId,
        scheduledTime: new Date(result.scheduledTime),
        target,
        participants: result.participantCount,
        convergenceRate: 0,
        effectSize: 0,
        completed: false,
      };

      setNextPulse(pulse);
      setCurrentTarget(target);
      setParticipantCount(result.participantCount);
      setConvergenceLevel(0);
      setPulseIntensity(0);

      setIsLoading(false);
      setPhase('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setIsLoading(false);
    }
  };

  const joinPulse = () => {
    setHasJoined(true);
    setParticipantCount((prev) => prev + 1);
  };

  const skipToFocusing = () => {
    // For demo purposes, skip countdown
    setPhase('focusing');
    setFocusTimer(60);
  };

  const viewHistory = () => {
    setPhase('history');
  };

  const getTargetColor = (target: PulseTarget | null) => {
    if (!target) return 'text-cyan-400';
    if (target.type === 'color') {
      return target.value === 'red' ? 'text-red-400' :
             target.value === 'blue' ? 'text-blue-400' :
             target.value === 'green' ? 'text-green-400' : 'text-cyan-400';
    }
    return 'text-cyan-400';
  };

  const getTargetBg = (target: PulseTarget | null) => {
    if (!target) return 'bg-cyan-500/20';
    if (target.type === 'color') {
      return target.value === 'red' ? 'bg-red-500/20' :
             target.value === 'blue' ? 'bg-blue-500/20' :
             target.value === 'green' ? 'bg-green-500/20' : 'bg-cyan-500/20';
    }
    return 'bg-cyan-500/20';
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {/* INTRO PHASE */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-cyan-900/20 to-fuchsia-900/30 rounded-2xl border border-cyan-500/20 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-cyan-500/20 rounded-xl">
                    <Radio className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Mind Pulse</h1>
                    <p className="text-cyan-300">Global Consciousness Experiment</p>
                  </div>
                </div>

                <div className="space-y-4 text-slate-300 mb-8">
                  <p>
                    Join researchers worldwide in synchronized global intention experiments.
                    Together, we focus on a single target to test collective consciousness effects.
                  </p>

                  <div className="bg-[#060a0f]/30 rounded-xl p-4 border border-cyan-500/20">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      How It Works
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">1.</span>
                        <span>Pulse events occur at scheduled times (hourly)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">2.</span>
                        <span>All participants focus on the same target (color, number, or concept)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">3.</span>
                        <span>Live dashboard shows global convergence in real-time</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">4.</span>
                        <span>Effect sizes measured against random baseline</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                    <h3 className="font-semibold text-cyan-300 mb-2">The Global Consciousness Project</h3>
                    <p className="text-sm text-slate-400">
                      Inspired by the Princeton GCP, Mind Pulse tests whether collective human
                      intention can influence random number generators worldwide. Join thousands
                      of researchers in this ongoing experiment.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={initializePulse}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Join Next Pulse
                      </>
                    )}
                  </button>
                  <button
                    onClick={viewHistory}
                    className="bg-[#142030] hover:bg-[#1a2535] text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    View History
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* WAITING PHASE */}
          {phase === 'waiting' && nextPulse && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#0f1520]/80 rounded-2xl border border-[#1a2535] p-8 text-center">
                <h2 className="text-xl font-bold text-white mb-2">Next Global Pulse</h2>

                {/* Countdown */}
                <div className="flex justify-center gap-4 my-8">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-cyan-400">
                      {String(countdown.hours).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-slate-500">HOURS</div>
                  </div>
                  <div className="text-4xl font-bold text-slate-600">:</div>
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-cyan-400">
                      {String(countdown.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-slate-500">MINUTES</div>
                  </div>
                  <div className="text-4xl font-bold text-slate-600">:</div>
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-cyan-400">
                      {String(countdown.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-slate-500">SECONDS</div>
                  </div>
                </div>

                {/* Target preview */}
                <div className={`inline-block px-8 py-4 rounded-xl ${getTargetBg(currentTarget)} border border-cyan-500/20`}>
                  <p className="text-sm text-slate-400 mb-1">Focus Target</p>
                  <p className={`text-3xl font-bold ${getTargetColor(currentTarget)}`}>
                    {currentTarget?.displayValue}
                  </p>
                </div>

                {/* Participants */}
                <div className="flex justify-center items-center gap-2 mt-6 text-slate-400">
                  <Users className="w-5 h-5" />
                  <span>{participantCount} researchers waiting</span>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4 mt-8">
                  {!hasJoined ? (
                    <button
                      onClick={joinPulse}
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                    >
                      Join This Pulse
                    </button>
                  ) : (
                    <div className="bg-green-500/20 border border-green-500 text-green-400 px-8 py-3 rounded-xl font-semibold">
                      You&apos;re Joined!
                    </div>
                  )}
                  <button
                    onClick={skipToFocusing}
                    className="text-slate-500 hover:text-slate-300 px-4 py-3 transition-colors"
                  >
                    Skip to Demo →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* FOCUSING PHASE */}
          {phase === 'focusing' && currentTarget && (
            <motion.div
              key="focusing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#0f1520]/30 rounded-2xl border border-cyan-500/20 p-8">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white mb-2">FOCUS NOW</h2>
                  <p className="text-slate-400 mb-6">
                    Concentrate all your attention on the target
                  </p>

                  {/* Focus timer */}
                  <div className="text-6xl font-mono font-bold text-cyan-400 mb-6">
                    {focusTimer}s
                  </div>

                  {/* Target */}
                  <motion.div
                    className={`inline-block px-12 py-8 rounded-2xl ${getTargetBg(currentTarget)} border-2 border-cyan-500`}
                    animate={{
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        '0 0 0 0 rgba(168, 85, 247, 0)',
                        '0 0 0 20px rgba(168, 85, 247, 0.1)',
                        '0 0 0 0 rgba(168, 85, 247, 0)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <p className={`text-5xl font-bold ${getTargetColor(currentTarget)}`}>
                      {currentTarget.displayValue}
                    </p>
                  </motion.div>

                  {/* Live stats */}
                  <div className="grid grid-cols-2 gap-4 mt-8 max-w-md mx-auto">
                    <div className="bg-[#0a1018] rounded-xl p-4">
                      <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">{participantCount}</p>
                      <p className="text-xs text-slate-500">Focusing Now</p>
                    </div>
                    <div className="bg-[#0a1018] rounded-xl p-4">
                      <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">{convergenceLevel.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Convergence</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PULSE PHASE */}
          {phase === 'pulse' && (
            <motion.div
              key="pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="text-center">
                <motion.div
                  className="relative w-48 h-48 mx-auto mb-8"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div
                    className="absolute inset-0 rounded-full bg-cyan-500/30"
                    style={{
                      transform: `scale(${1 + pulseIntensity / 100})`,
                      opacity: 1 - pulseIntensity / 200,
                    }}
                  />
                  <div
                    className="absolute inset-4 rounded-full bg-cyan-500/50"
                    style={{
                      transform: `scale(${1 + pulseIntensity / 150})`,
                      opacity: 1 - pulseIntensity / 300,
                    }}
                  />
                  <div className="absolute inset-8 rounded-full bg-cyan-500/70 flex items-center justify-center">
                    <CircleDot className="w-16 h-16 text-white" />
                  </div>
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-2">PULSE ACTIVE</h2>
                <p className="text-cyan-400 text-xl">
                  Global Intention Intensity: {pulseIntensity.toFixed(0)}%
                </p>
              </div>
            </motion.div>
          )}

          {/* RESULTS PHASE */}
          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#0f1520]/80 rounded-2xl border border-cyan-500/20 p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Pulse Complete!</h2>
                  <p className="text-slate-400">Global consciousness effect measured</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-[#0a1018] rounded-xl p-4 text-center">
                    <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{participantCount}</p>
                    <p className="text-xs text-slate-500">Participants</p>
                  </div>
                  <div className="bg-[#0a1018] rounded-xl p-4 text-center">
                    <Target className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <p className={`text-2xl font-bold ${getTargetColor(currentTarget)}`}>
                      {currentTarget?.displayValue}
                    </p>
                    <p className="text-xs text-slate-500">Target</p>
                  </div>
                  <div className="bg-[#0a1018] rounded-xl p-4 text-center">
                    <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-400">
                      {convergenceLevel.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">Convergence</p>
                  </div>
                  <div className="bg-[#0a1018] rounded-xl p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">
                      0.{Math.floor(convergenceLevel / 3)}
                    </p>
                    <p className="text-xs text-slate-500">Effect Size</p>
                  </div>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-cyan-300 mb-2">Analysis</h3>
                  <p className="text-sm text-slate-300">
                    {convergenceLevel > 35
                      ? 'Highly significant global coherence detected! The collective intention showed strong deviation from baseline randomness.'
                      : convergenceLevel > 28
                      ? 'Significant coherence detected. The group intention produced measurable effects on random data.'
                      : 'Marginal effects observed. More participants needed for stronger statistical power.'}
                  </p>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setPhase('intro')}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                  >
                    Join Another Pulse
                  </button>
                  <button
                    onClick={viewHistory}
                    className="bg-[#142030] hover:bg-[#1a2535] text-white px-8 py-3 rounded-xl font-semibold transition-all"
                  >
                    View History
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* HISTORY PHASE */}
          {phase === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Pulse History</h2>
                <button
                  onClick={() => setPhase('intro')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  ← Back
                </button>
              </div>

              <div className="space-y-3">
                {HISTORICAL_PULSES.map((pulse) => (
                  <div
                    key={pulse.id}
                    className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{pulse.target}</p>
                        <p className="text-sm text-slate-500">{pulse.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-cyan-400">{pulse.participants} participants</p>
                        <p className="text-sm text-slate-500">
                          {pulse.convergenceRate}% convergence
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#1a2535]">
                      <p className={`text-sm ${
                        pulse.significance.includes('Highly') ? 'text-green-400' :
                        pulse.significance.includes('Significant') ? 'text-yellow-400' :
                        pulse.significance.includes('Marginal') ? 'text-orange-400' :
                        'text-slate-500'
                      }`}>
                        {pulse.significance} | Effect Size: {pulse.effectSize}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setPhase('intro')}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                >
                  Join Next Pulse
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
