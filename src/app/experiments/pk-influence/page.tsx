'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/walletStore';
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
  const wallet = useWalletStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [conceptPair, setConceptPair] = useState<ConceptPair>(CONCEPT_PAIRS[0]);
  const [focusTarget, setFocusTarget] = useState<'a' | 'b' | null>(null);
  const [focusDuration, setFocusDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);
  const [participants, setParticipants] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const userId = (wallet as any).address || 'guest-user';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const FOCUS_TIME = 30; // 30 seconds of focus

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
    setPhase('generating');
    setIsLoading(true);
    setError('');

    try {
      const resp = await fetch(`${API_URL}/api/experiments/pk-influence/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-yellow-950/10 to-gray-950 text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Zap className="w-7 h-7 text-yellow-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              PK Influence Engine
            </h1>
          </div>
          <p className="text-gray-400">Can collective intention shift AI-generated images?</p>
        </motion.div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Intro */}
        {phase === 'intro' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10 text-center">
              <Focus className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2">Collective Psychokinesis</h2>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                An AI will generate an image weighted 50/50 between two concepts.
                Focus your intention on ONE concept for 30 seconds.
                The system tracks whether collective intention shifts the AI output.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl text-center">
              <p className="text-sm text-gray-400 mb-3">Today's Concept Pair:</p>
              <p className="text-xl font-bold">
                <span className="text-blue-400">{conceptPair.a}</span>
                {' vs '}
                <span className="text-orange-400">{conceptPair.b}</span>
              </p>
            </div>

            <div className="text-center text-sm text-gray-400">
              Choose which concept to focus your intention on:
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => startFocusing('a')}
                className="p-6 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-center"
              >
                <div className="text-2xl mb-2">{'🔵'}</div>
                <div className="font-semibold text-blue-300 capitalize">{conceptPair.a}</div>
                <div className="text-xs text-gray-400 mt-1">Focus on this</div>
              </button>
              <button
                onClick={() => startFocusing('b')}
                className="p-6 rounded-xl border-2 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-all text-center"
              >
                <div className="text-2xl mb-2">{'🟠'}</div>
                <div className="font-semibold text-orange-300 capitalize">{conceptPair.b}</div>
                <div className="text-xs text-gray-400 mt-1">Focus on this</div>
              </button>
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
