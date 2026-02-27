'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import { UserCircle, TrendingUp, Calendar, Award, Activity } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CardanoSession {
  id: string;
  status: string;
  experimentType: string | null;
  score: number | null;
  psyRewardAmount: string | null;
  createdAt: string;
}

interface ProfileStats {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  totalTokens: number;
  rank: string;
}

export default function ProfilePage() {
  const { wallet } = useWalletStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CardanoSession[]>([]);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    async function loadData() {
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
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        const [sessionsRes, streakRes] = await Promise.all([
          fetch(`${API_URL}/api/cardano/sessions`, { headers }),
          fetch(`${API_URL}/api/gamification/streak`, { headers }),
        ]);

        const sessionsJson = await sessionsRes.json();
        const streakJson = await streakRes.json();

        if (!sessionsRes.ok || !sessionsJson.success) {
          throw new Error(sessionsJson.error || 'Failed to load sessions');
        }

        setSessions(sessionsJson.sessions || []);
        setStreakDays(streakJson?.streak?.currentStreak || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [wallet?.address, wallet?.isVerified]);

  const stats = useMemo<ProfileStats>(() => {
    const totalSessions = sessions.length;
    const scored = sessions.filter((s) => typeof s.score === 'number');
    const averageScore = scored.length
      ? scored.reduce((sum, s) => sum + (s.score || 0), 0) / scored.length / 100
      : 0;
    const bestScore = scored.length
      ? Math.max(...scored.map((s) => (s.score || 0))) / 100
      : 0;
    const totalTokens = sessions.reduce((sum, s) => {
      const amount = Number(s.psyRewardAmount || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    let rank = 'Novice Viewer';
    if (averageScore >= 0.8) rank = 'Elite Viewer';
    else if (averageScore >= 0.65) rank = 'Advanced Viewer';
    else if (averageScore >= 0.5) rank = 'Developing Viewer';

    return {
      totalSessions,
      averageScore,
      bestScore,
      currentStreak: streakDays,
      totalTokens,
      rank,
    };
  }, [sessions, streakDays]);

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="max-w-4xl mx-auto">
          {isLoading && (
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6 text-slate-300">
              Loading profile data...
            </div>
          )}

          {!isLoading && !wallet?.isVerified && (
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6 text-slate-300">
              Connect a wallet to view your profile data.
            </div>
          )}

          {!isLoading && error && (
            <div className="bg-red-950/40 border border-red-800 rounded-xl p-6 mb-6 text-red-200">
              {error}
            </div>
          )}

          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-teal-400 rounded-full flex items-center justify-center">
                <UserCircle className="w-16 h-16 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
                <div className="text-slate-400 font-mono">{wallet?.address}</div>
                <div className="mt-2">
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-semibold">
                    {stats.rank}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <div className="text-slate-400 text-sm">Total Sessions</div>
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalSessions}</div>
            </div>

            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div className="text-slate-400 text-sm">Average Score</div>
              </div>
              <div className="text-3xl font-bold text-white">{(stats.averageScore * 100).toFixed(0)}%</div>
            </div>

            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-orange-400" />
                <div className="text-slate-400 text-sm">Current Streak</div>
              </div>
              <div className="text-3xl font-bold text-white">{stats.currentStreak} days</div>
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Profile Summary
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-[#142030] rounded-lg">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  🪙
                </div>
                <div>
                  <div className="font-semibold text-white">Total PSY Rewards</div>
                  <div className="text-sm text-slate-400">{stats.totalTokens.toLocaleString()} PSY distributed</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[#142030] rounded-lg">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  🎯
                </div>
                <div>
                  <div className="font-semibold text-white">Best Session Score</div>
                  <div className="text-sm text-slate-400">{(stats.bestScore * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[#142030] rounded-lg">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  📈
                </div>
                <div>
                  <div className="font-semibold text-white">Scored Sessions</div>
                  <div className="text-sm text-slate-400">
                    {sessions.filter((s) => typeof s.score === 'number').length} with finalized scores
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
