'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import { Zap, Focus, Loader2, Users, BarChart3 } from 'lucide-react';

type Phase = 'intro' | 'focusing' | 'generating' | 'results';

interface ConceptPair {
  a: string;
  b: string;
  label: string;
}

const CONCEPT_PAIRS: ConceptPair[] = [
  { a: 'fire', b: 'water', label: 'Fire vs Water' },
  { a: 'mountains', b: 'ocean', label: 'Mountains vs Ocean' },
  { a: 'sunrise', b: 'sunset', label: 'Sunrise vs Sunset' },
  { a: 'forest', b: 'desert', label: 'Forest vs Desert' },
  { a: 'storm', b: 'calm', label: 'Storm vs Calm' },
];

export default function PKInfluencePage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [conceptPair, setConceptPair] = useState<ConceptPair>(CONCEPT_PAIRS[0]);
  const [focusTarget, setFocusTarget] = useState<'a' | 'b' | null>(null);
  const [focusDuration, setFocusDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);
  const [participants, setParticipants] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const FOCUS_TIME = 30; // 30 seconds of focus

  // Require wallet
  useEffect(() => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
  }, [wallet, router]);

  useEffect(() => {
    // Random concept pair each session
    setConceptPair(CONCEPT_PAIRS[Math.floor(Math.random() * CONCEPT_PAIRS.length)]);
  }, []);

  useEffect(() => {
    if (phase === 'focusing' && focusDuration < FOCUS_TIME) {
      timerRef.current = setTimeout(() => {
        setFocusDuration(prev => prev + 1);
      }, 1000);
    } else if (focusDuration >= FOCUS_TIME && phase === 'focusing') {
      submitInfluence();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, focusDuration]);

  const startFocusing = (target: 'a' | 'b') => {
    setFocusTarget(target);
    setFocusDuration(0);
    setPhase('focusing');
  };

  const submitInfluence = async () => {
    if (!wallet?.address) return;
    setPhase('generating');
    setIsLoading(true);
    setError('');

    try {
      const resp = await fetch(`${API_URL}/api/experiments/pk-influence/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: wallet.address,
          conceptA: conceptPair.a,
          conceptB: conceptPair.b,
          focusTarget: focusTarget === 'a' ? conceptPair.a : conceptPair.b,
          focusDurationSeconds: FOCUS_TIME,
          verified: !!(wallet as any).isVerified,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Submission failed');

      setResults(data);
      setParticipants(data.totalParticipants || 1);
      setPhase('results');
    } catch (err: any) {
      setError(err.message || 'Failed to submit');
      setPhase('intro');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setPhase('intro');
    setFocusTarget(null);
    setFocusDuration(0);
    setResults(null);
    setConceptPair(CONCEPT_PAIRS[Math.floor(Math.random() * CONCEPT_PAIRS.length)]);
  };

  return (
    <div className="min-h-screen bg-[#060a0f] text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Intro */}
        {phase === 'intro' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto pt-8">
            {/* Electric discharge background */}
            <div className="relative mb-10">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-px bg-gradient-to-b from-transparent via-amber-400/40 to-transparent"
                  style={{
                    left: `${15 + i * 14}%`,
                    top: '10%',
                    height: '80%',
                  }}
                  animate={{ opacity: [0, 0.6, 0], scaleY: [0.5, 1, 0.5] }}
                  transition={{ duration: 2 + i * 0.4, delay: i * 0.5, repeat: Infinity }}
                />
              ))}

              {/* Central energy icon */}
              <div className="relative w-28 h-28 mx-auto mb-6">
                {/* Outer pulse rings */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-amber-500/30"
                    animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.5, 0] }}
                    transition={{ duration: 2, delay: i * 0.6, repeat: Infinity }}
                  />
                ))}
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Zap className="w-9 h-9 text-white" />
                </div>
                {/* Orbiting energy dots */}
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-amber-400"
                    style={{ top: '50%', left: '50%' }}
                    animate={{
                      x: [0, Math.cos(i * Math.PI / 2) * 50, 0],
                      y: [0, Math.sin(i * Math.PI / 2) * 50, 0],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{ duration: 3, delay: i * 0.75, repeat: Infinity }}
                  />
                ))}
              </div>

              {/* Title */}
              <div className="text-center">
                <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
                  <span className="text-amber-400">PK</span>
                  <br />
                  <span className="text-orange-300/80 text-3xl md:text-4xl font-light tracking-[0.2em]">INFLUENCE</span>
                </h1>
                <p className="text-slate-500 text-sm mt-3 tracking-wide">Collective Psychokinesis Engine</p>
              </div>
            </div>

            {/* Concept pair display */}
            <div className="relative mb-8">
              <div className="flex items-center justify-center gap-4">
                <motion.div
                  className="flex-1 text-center p-4 rounded-xl bg-blue-950/30 border border-blue-500/20"
                  whileHover={{ scale: 1.02, borderColor: 'rgba(59,130,246,0.5)' }}
                >
                  <div className="text-2xl mb-1 capitalize font-bold text-blue-400">{conceptPair.a}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Concept A</div>
                </motion.div>
                <motion.div
                  className="text-amber-500 font-bold text-lg"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  VS
                </motion.div>
                <motion.div
                  className="flex-1 text-center p-4 rounded-xl bg-orange-950/30 border border-orange-500/20"
                  whileHover={{ scale: 1.02, borderColor: 'rgba(249,115,22,0.5)' }}
                >
                  <div className="text-2xl mb-1 capitalize font-bold text-orange-400">{conceptPair.b}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Concept B</div>
                </motion.div>
              </div>
              {/* Energy beam between concepts */}
              <motion.div
                className="absolute top-1/2 left-1/4 right-1/4 h-px bg-gradient-to-r from-blue-500/40 via-amber-400/60 to-orange-500/40"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            {/* How it works compact */}
            <div className="grid grid-cols-3 gap-2 mb-8">
              {[
                { label: 'Choose', desc: 'Pick a concept' },
                { label: 'Focus', desc: '30 sec intent' },
                { label: 'Reveal', desc: 'AI shows shift' },
              ].map((step, i) => (
                <motion.div
                  key={step.label}
                  className="text-center p-3 rounded-xl bg-[#0f1008]/60 border border-amber-900/30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                >
                  <div className="text-xs font-medium text-amber-300">{step.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{step.desc}</div>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-6 mb-8 text-xs text-slate-500">
              <span>30s FOCUS</span>
              <span className="text-amber-700">|</span>
              <span>AI IMAGE GEN</span>
              <span className="text-amber-700">|</span>
              <span>COLLECTIVE PK</span>
            </div>

            {/* Choice buttons */}
            <div className="text-center text-sm text-slate-400 mb-4">
              Choose which concept to focus your intention on:
            </div>
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                onClick={() => startFocusing('a')}
                className="p-5 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-center relative overflow-hidden group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="absolute inset-0 bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Focus className="w-6 h-6 text-blue-400 mx-auto mb-2 relative" />
                <div className="font-semibold text-blue-300 capitalize relative">{conceptPair.a}</div>
                <div className="text-xs text-slate-500 mt-1 relative">Focus intention here</div>
              </motion.button>
              <motion.button
                onClick={() => startFocusing('b')}
                className="p-5 rounded-xl border-2 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-all text-center relative overflow-hidden group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="absolute inset-0 bg-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Focus className="w-6 h-6 text-orange-400 mx-auto mb-2 relative" />
                <div className="font-semibold text-orange-300 capitalize relative">{conceptPair.b}</div>
                <div className="text-xs text-slate-500 mt-1 relative">Focus intention here</div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Focusing Phase */}
        {phase === 'focusing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 space-y-6">
            <div className="relative w-48 h-48 mx-auto">
              {/* Circular progress */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={focusTarget === 'a' ? '#60a5fa' : '#fb923c'}
                  strokeWidth="4"
                  strokeDasharray={`${(focusDuration / FOCUS_TIME) * 283} 283`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-mono">{FOCUS_TIME - focusDuration}</div>
                <div className="text-xs text-gray-400">seconds</div>
              </div>
            </div>

            <div>
              <p className="text-lg font-semibold capitalize" style={{ color: focusTarget === 'a' ? '#60a5fa' : '#fb923c' }}>
                Focus on: {focusTarget === 'a' ? conceptPair.a : conceptPair.b}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Concentrate your intention. Visualize this concept clearly.
              </p>
            </div>
          </motion.div>
        )}

        {/* Generating */}
        {phase === 'generating' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-yellow-400 mx-auto" />
            <h2 className="text-lg font-semibold">AI Generating Image...</h2>
            <p className="text-gray-400 text-sm">Checking if collective intention shifted the output</p>
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && results && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10 text-center">
              <h2 className="text-lg font-semibold mb-2">Influence Analysis</h2>
              <p className="text-sm text-gray-400">
                The AI generated an image. Here's how it leaned:
              </p>
            </div>

            {results.generatedImageUrl && (
              <div className="rounded-xl overflow-hidden border border-white/10">
                <img src={results.generatedImageUrl} alt="AI generated" className="w-full aspect-square object-cover" />
              </div>
            )}

            {/* Influence meter */}
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-blue-400 capitalize">{conceptPair.a}</span>
                <span className="text-orange-400 capitalize">{conceptPair.b}</span>
              </div>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                  style={{ width: `${(results.conceptAWeight || 50)}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                  style={{ width: `${100 - (results.conceptAWeight || 50)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{results.conceptAWeight || 50}%</span>
                <span>{100 - (results.conceptAWeight || 50)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg text-center">
                <Users className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-sm text-gray-400">Participants</div>
                <div className="text-lg font-bold">{participants}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg text-center">
                <BarChart3 className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-sm text-gray-400">Deviation</div>
                <div className="text-lg font-bold">
                  {results.deviation != null ? `${results.deviation > 0 ? '+' : ''}${results.deviation.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>

            {results.significant && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center text-sm text-yellow-300">
                Statistically significant shift detected (p &lt; 0.05)
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl font-medium transition-all"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
