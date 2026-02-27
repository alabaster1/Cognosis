'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import { History, Eye, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useWalletStore } from '@/store/useWalletStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CardanoSession {
  id: string;
  status: string;
  experimentType: string | null;
  score: number | null;
  createdAt: string;
}

export default function HistoryPage() {
  const { wallet } = useWalletStore();
  const [sessions, setSessions] = useState<CardanoSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      if (!wallet?.isVerified) {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Wallet is connected but auth token is missing. Reconnect wallet to refresh session.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/cardano/sessions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load session history');
        }
        setSessions(data.sessions || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load session history');
      } finally {
        setIsLoading(false);
      }
    }

    loadSessions();
  }, [wallet?.address, wallet?.isVerified]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const scoredSessions = useMemo(
    () => sessions.filter((s) => typeof s.score === 'number'),
    [sessions]
  );

  const averageScore = scoredSessions.length
    ? scoredSessions.reduce((acc, s) => acc + (s.score || 0), 0) / scoredSessions.length
    : 0;
  const bestScore = scoredSessions.length
    ? Math.max(...scoredSessions.map((s) => s.score || 0))
    : 0;

  const titleForType = (type: string | null) => {
    if (!type) return 'Unknown Experiment';
    return type
      .split('-')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <History className="w-8 h-8 text-cyan-400" />
              Session History
            </h1>
            <p className="text-slate-400">Review your past experiment sessions and results</p>
          </div>

          {isLoading && (
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-8 text-slate-300">
              Loading session history...
            </div>
          )}

          {!isLoading && !wallet?.isVerified && (
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-8 text-slate-300">
              Connect a wallet to view your history.
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-red-950/40 border border-red-800 rounded-xl p-6 mb-8 text-red-200">
              {error}
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Total Sessions</div>
              <div className="text-3xl font-bold text-white">{sessions.length}</div>
            </div>
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Average Score</div>
              <div className="text-3xl font-bold text-white">
                {averageScore ? `${averageScore.toFixed(0)}%` : '-'}
              </div>
            </div>
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Best Score</div>
              <div className="text-3xl font-bold text-green-400">
                {bestScore ? `${bestScore.toFixed(0)}%` : '-'}
              </div>
            </div>
          </div>

          {/* Sessions List */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#1a2535]">
              <h2 className="text-xl font-bold text-white">Recent Sessions</h2>
            </div>

            <div className="divide-y divide-gray-800">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-6 p-6 hover:bg-[#0a1018] transition-colors group"
                >
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                    <Eye className="w-6 h-6 text-cyan-400" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white">{titleForType(session.experimentType)}</h3>
                      <span className="px-2 py-0.5 bg-[#142030] text-slate-300 text-xs rounded">
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(session.createdAt).toLocaleString()}
                      </div>
                      {typeof session.score === 'number' && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          <span className={getScoreColor(session.score)}>
                            {session.score.toFixed(0)}% accuracy
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Empty State (shown when no sessions) */}
          {sessions.length === 0 && (
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-12 text-center">
              <History className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No sessions yet</h3>
              <p className="text-slate-400 mb-6">Start your first experiment to see your history here</p>
              <Link
                href="/experiments"
                className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                Browse Experiments
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
