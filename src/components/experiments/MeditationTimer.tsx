'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface MeditationTimerProps {
  duration?: number; // in seconds
  onComplete: () => void;
  onSkip?: () => void;
}

export default function MeditationTimer({ duration = 60, onComplete, onSkip }: MeditationTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    // 4-7-8 breathing cycle (19 seconds total)
    const cycleTime = timeLeft % 19;
    if (cycleTime < 4) setPhase('inhale');
    else if (cycleTime < 11) setPhase('hold');
    else setPhase('exhale');
  }, [timeLeft]);

  const progress = ((duration - timeLeft) / duration) * 100;
  const scale = phase === 'inhale' ? 1.2 : phase === 'exhale' ? 0.8 : 1;

  return (
    <div className="min-h-screen bg-[#060a0f] flex items-center justify-center">
      <div className="text-center space-y-8">
        <h2 className="text-3xl font-bold">Meditation Preparation</h2>
        <p className="text-slate-400">Clear your mind and enter a receptive state</p>

        {/* Breathing Circle */}
        <div className="relative w-64 h-64 mx-auto">
          <motion.div
            animate={{ scale }}
            transition={{ duration: phase === 'hold' ? 7 : phase === 'inhale' ? 4 : 8, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold">{timeLeft}s</div>
              <div className="text-xl mt-2 capitalize text-cyan-300">{phase}</div>
            </div>
          </div>
        </div>

        {/* Breathing Instructions */}
        <div className="space-y-2 text-slate-400">
          <div className={phase === 'inhale' ? 'text-white font-semibold' : ''}>
            Inhale (4 seconds)
          </div>
          <div className={phase === 'hold' ? 'text-white font-semibold' : ''}>
            Hold (7 seconds)
          </div>
          <div className={phase === 'exhale' ? 'text-white font-semibold' : ''}>
            Exhale (8 seconds)
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto">
          <div className="h-2 bg-[#142030] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Skip Button */}
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-slate-500 hover:text-slate-300 text-sm underline"
          >
            Skip meditation
          </button>
        )}
      </div>
    </div>
  );
}
