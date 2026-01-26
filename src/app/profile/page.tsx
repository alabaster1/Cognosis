'use client';

import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import { UserCircle, TrendingUp, Calendar, Award, Activity } from 'lucide-react';

export default function ProfilePage() {
  const { wallet } = useWalletStore();

  // Mock data - will be replaced with real data from backend
  const stats = {
    totalSessions: 12,
    averageScore: 0.68,
    bestScore: 0.89,
    currentStreak: 5,
    totalTokens: 250,
    rank: 'Advanced Viewer'
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="max-w-4xl mx-auto">
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
              Recent Achievements
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-[#142030] rounded-lg">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  🏆
                </div>
                <div>
                  <div className="font-semibold text-white">First Remote Viewing Session</div>
                  <div className="text-sm text-slate-400">Completed your first RV session</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[#142030] rounded-lg">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  ⚡
                </div>
                <div>
                  <div className="font-semibold text-white">5-Day Streak</div>
                  <div className="text-sm text-slate-400">Practiced 5 days in a row</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[#142030] rounded-lg">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  🎯
                </div>
                <div>
                  <div className="font-semibold text-white">High Scorer</div>
                  <div className="text-sm text-slate-400">Achieved 80%+ accuracy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
