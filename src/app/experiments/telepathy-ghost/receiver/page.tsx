'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import TagInput from '@/components/experiments/TagInput';
import ImageGrid from '@/components/experiments/ImageGrid';
import { Radio, Clock, Brain, Loader2, CheckCircle2 } from 'lucide-react';

type Phase = 'loading' | 'waiting_delay' | 'sensing' | 'selecting' | 'submitted' | 'results';

export default function ReceiverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    }>
      <ReceiverContent />
    </Suspense>
  );
}

function ReceiverContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';
  const userId = searchParams.get('userId') || '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [grid, setGrid] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<any>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (sessionId && userId) {
      loadSession();
    }
  }, [sessionId, userId]);

  // Countdown timer
  useEffect(() => {
    if (phase === 'waiting_delay' && remainingMs > 0) {
      const interval = setInterval(() => {
        setRemainingMs(prev => {
          if (prev <= 1000) {
            clearInterval(interval);
            checkDelay();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, remainingMs]);

  const loadSession = async () => {
    try {
      const resp = await fetch(
        `${API_URL}/api/telepathy/sessions/${sessionId}?userId=${userId}`
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      setSession(data);

      if (data.status === 'delay') {
        setRemainingMs(data.remainingMs || 0);
        setPhase(data.remainingMs > 0 ? 'waiting_delay' : 'sensing');
      } else if (data.status === 'receiving') {
        setGrid(data.grid);
        setPhase('sensing');
      } else if (data.status === 'scored' || data.status === 'revealed') {
        setPhase('results');
      } else {
        setPhase('waiting_delay');
        checkDelay();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    }
  };

  const checkDelay = async () => {
    try {
      const resp = await fetch(
        `${API_URL}/api/telepathy/sessions/${sessionId}/delay`
      );
      const data = await resp.json();
      if (data.status === 'receiving') {
        // Reload session to get grid
        loadSession();
      } else {
        setRemainingMs(data.remainingMs || 0);
        setPhase('waiting_delay');
      }
    } catch {}
  };

  const submitResponse = async () => {
    if (tags.length !== 3 || selectedIndex === null) return;
    setIsLoading(true);
    setError('');
    try {
      const resp = await fetch(
        `${API_URL}/api/telepathy/sessions/${sessionId}/receiver-response`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tags, choiceIndex: selectedIndex }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setSession({ ...session, ...data.scores, hit: data.hit, scores: data.scores });
      setPhase('results');
    } catch (err: any) {
      setError(err.message || 'Failed to submit response');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950 text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Radio className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold">Receiver Phase</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-gray-400 mt-3">Loading session...</p>
          </div>
        )}

        {/* Waiting for Delay */}
        {phase === 'waiting_delay' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-6">
            <Clock className="w-16 h-16 text-indigo-400 mx-auto" />
            <h2 className="text-xl font-semibold">Delay Period Active</h2>
            <p className="text-gray-400">
              The sender has submitted their impression. Please wait for the delay to expire.
            </p>
            <div className="text-4xl font-mono text-indigo-300">
              {formatTime(remainingMs)}
            </div>
            <p className="text-xs text-gray-500">
              This delay prevents information leakage and ensures temporal separation.
            </p>
          </motion.div>
        )}

        {/* Sensing Phase (Tags) */}
        {phase === 'sensing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
              <Brain className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">
                Before viewing the images, provide 3 words or phrases that come to mind.
                What impressions do you sense from the sender?
              </p>
            </div>

            <TagInput
              tags={tags}
              onTagsChange={setTags}
              maxTags={3}
              placeholder="What do you sense? Enter a word or phrase..."
              label="Your 3 Sensed Impressions"
            />

            {tags.length === 3 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <button
                  onClick={() => setPhase('selecting')}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-all"
                >
                  View Image Grid
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Selecting Phase (Image Grid) */}
        {phase === 'selecting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-3 bg-white/5 rounded-xl text-center">
              <p className="text-sm text-gray-300">
                Which image matches the sender's transmission? Select one.
              </p>
            </div>

            {grid && grid.images ? (
              <ImageGrid
                images={grid.images}
                onSelect={(idx) => setSelectedIndex(idx)}
                selectedIndex={selectedIndex}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading image grid...</p>
              </div>
            )}

            {selectedIndex !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <p className="text-sm text-gray-300">
                    Selected: Image {selectedIndex + 1}
                  </p>
                </div>
                <button
                  onClick={submitResponse}
                  disabled={isLoading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  Confirm Selection
                </button>
              </motion.div>
            )}

            <button
              onClick={() => { setPhase('sensing'); setSelectedIndex(null); }}
              className="w-full py-2 text-gray-400 hover:text-white text-sm"
            >
              Back to sensing
            </button>
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className={`p-6 rounded-xl text-center ${
              session?.hit ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'
            }`}>
              <h2 className="text-xl font-semibold mb-2">
                {session?.hit ? 'Direct Hit!' : 'Miss'}
              </h2>
              <p className="text-gray-400">
                {session?.hit
                  ? 'You correctly identified the target image!'
                  : 'The target was a different image. Keep practicing!'}
              </p>
            </div>

            {session?.scores && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-sm text-gray-400">CLIP Similarity</div>
                  <div className="text-lg font-bold text-purple-300">
                    {session.scores.clipSimilarity != null
                      ? (session.scores.clipSimilarity * 100).toFixed(1) + '%'
                      : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-sm text-gray-400">Psi-Coefficient</div>
                  <div className="text-lg font-bold text-indigo-300">
                    {session.scores.psiCoefficient != null
                      ? session.scores.psiCoefficient.toFixed(3)
                      : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-sm text-gray-400">Tag Overlap</div>
                  <div className="text-lg font-bold text-green-300">
                    {session.scores.tagOverlapScore != null
                      ? (session.scores.tagOverlapScore * 100).toFixed(0) + '%'
                      : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-sm text-gray-400">Overall</div>
                  <div className="text-lg font-bold text-yellow-300">
                    {session.scores.overallScore != null
                      ? (session.scores.overallScore * 100).toFixed(0) + '%'
                      : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <a
                href="/experiments/telepathy-ghost"
                className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-all"
              >
                Play Again
              </a>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
