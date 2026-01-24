'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import TagInput from '@/components/experiments/TagInput';
import { Send, Eye, Clock, CheckCircle2, Loader2 } from 'lucide-react';

type Phase = 'loading' | 'viewing' | 'tagging' | 'submitted' | 'waiting' | 'results';

export default function SenderPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';
  const userId = searchParams.get('userId') || '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [targetImageUrl, setTargetImageUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (sessionId && userId) {
      loadSession();
    }
  }, [sessionId, userId]);

  const loadSession = async () => {
    try {
      const resp = await fetch(
        `${API_URL}/api/telepathy/sessions/${sessionId}?userId=${userId}`
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      setSession(data);

      if (data.status === 'sending' || data.status === 'awaiting_receiver') {
        setTargetImageUrl(data.targetImageUrl);
        setPhase('viewing');
      } else if (data.status === 'delay') {
        setPhase('waiting');
      } else if (data.status === 'scored' || data.status === 'revealed') {
        setPhase('results');
      } else {
        setPhase('viewing');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    }
  };

  const submitTags = async () => {
    if (tags.length !== 3) return;
    setIsLoading(true);
    setError('');
    try {
      const resp = await fetch(
        `${API_URL}/api/telepathy/sessions/${sessionId}/sender-tags`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tags }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setPhase('submitted');
    } catch (err: any) {
      setError(err.message || 'Failed to submit tags');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Send className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold">Sender Phase</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
            <p className="text-gray-400 mt-3">Loading session...</p>
          </div>
        )}

        {/* Viewing Phase */}
        {phase === 'viewing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
              <Eye className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">
                Study this image carefully. Focus on its key visual elements.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You will provide 3 descriptive tags to help your partner identify it.
              </p>
            </div>

            {/* Target Image */}
            <div className="rounded-xl overflow-hidden border border-white/10 max-w-md mx-auto">
              {targetImageUrl ? (
                <img src={targetImageUrl} alt="Target" className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-purple-900/50 to-indigo-900/50 flex items-center justify-center">
                  <p className="text-gray-400">Target image will appear here</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setPhase('tagging')}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition-all"
            >
              I've studied the image - Provide Tags
            </button>
          </motion.div>
        )}

        {/* Tagging Phase */}
        {phase === 'tagging' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <p className="text-sm text-gray-300">
                Provide exactly 3 descriptive tags that capture the essence of the target image.
                These will be compared to your partner's sensed impressions.
              </p>
            </div>

            <TagInput
              tags={tags}
              onTagsChange={setTags}
              maxTags={3}
              placeholder="Enter a descriptive word or phrase..."
              label="Your 3 Descriptive Tags"
            />

            <button
              onClick={submitTags}
              disabled={tags.length !== 3 || isLoading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              Submit Tags & Start Delay
            </button>

            <button
              onClick={() => setPhase('viewing')}
              className="w-full py-2 text-gray-400 hover:text-white text-sm"
            >
              Back to image
            </button>
          </motion.div>
        )}

        {/* Submitted / Waiting */}
        {(phase === 'submitted' || phase === 'waiting') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
            <Clock className="w-12 h-12 text-indigo-400 mx-auto" />
            <h2 className="text-xl font-semibold">Tags Submitted!</h2>
            <p className="text-gray-400">
              The mandatory delay period has begun. Your partner will receive the image grid
              after the delay expires.
            </p>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-gray-300">Your tags:</p>
              <div className="flex gap-2 justify-center mt-2">
                {tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              You'll be notified when results are available.
            </p>
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && session && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className={`p-6 rounded-xl text-center ${
              session.hit ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'
            }`}>
              <h2 className="text-xl font-semibold mb-2">
                {session.hit ? 'Target Identified!' : 'Session Complete'}
              </h2>
              <p className="text-gray-400">
                {session.hit
                  ? 'Your partner successfully identified the target image.'
                  : 'Your partner selected a different image.'}
              </p>
            </div>

            {session.scores && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-sm text-gray-400">CLIP Similarity</div>
                  <div className="text-lg font-bold text-purple-300">
                    {session.scores.clipSimilarity != null ? (session.scores.clipSimilarity * 100).toFixed(1) + '%' : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-sm text-gray-400">Psi-Coefficient</div>
                  <div className="text-lg font-bold text-indigo-300">
                    {session.scores.psiCoefficient != null ? session.scores.psiCoefficient.toFixed(3) : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-sm text-gray-400">Tag Overlap</div>
                  <div className="text-lg font-bold text-green-300">
                    {session.scores.tagOverlapScore != null ? (session.scores.tagOverlapScore * 100).toFixed(0) + '%' : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg text-center">
                  <div className="text-sm text-gray-400">Overall</div>
                  <div className="text-lg font-bold text-yellow-300">
                    {session.scores.overallScore != null ? (session.scores.overallScore * 100).toFixed(0) + '%' : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {session.senderTags && session.receiverTags && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Sender Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {session.senderTags.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Receiver Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {session.receiverTags.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
