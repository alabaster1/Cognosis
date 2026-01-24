'use client';

import Header from '@/components/layout/Header';
import { Coins, TrendingUp, Gift, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TokensPage() {
  // Mock data - will be replaced with real data from backend
  const tokenBalance = 250;

  const transactions = [
    { id: 1, type: 'earned', amount: 15, reason: 'RV Session Completion + Bonus', date: '2025-10-09', time: '14:30' },
    { id: 2, type: 'earned', amount: 10, reason: 'Session Calibration Completed', date: '2025-10-09', time: '14:25' },
    { id: 3, type: 'earned', amount: 20, reason: 'High Accuracy Bonus (85%)', date: '2025-10-08', time: '16:45' },
    { id: 4, type: 'earned', amount: 10, reason: 'RV Session Completion', date: '2025-10-08', time: '16:40' },
    { id: 5, type: 'earned', amount: 25, reason: '5-Day Streak Bonus', date: '2025-10-07', time: '12:00' },
  ];

  const stats = {
    totalEarned: 280,
    totalSpent: 30,
    thisWeek: 65,
    lastWeek: 45
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Coins className="w-8 h-8 text-yellow-400" />
              My Tokens
            </h1>
            <p className="text-slate-400">Earn tokens through experiments and achievements</p>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm mb-2">Current Balance</div>
                <div className="text-5xl font-bold text-yellow-400 flex items-center gap-2">
                  {tokenBalance}
                  <Coins className="w-10 h-10" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 text-2xl font-bold flex items-center gap-1 justify-end">
                  <TrendingUp className="w-5 h-5" />
                  +{stats.thisWeek}
                </div>
                <div className="text-slate-400 text-sm">this week</div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Total Earned</div>
              <div className="text-3xl font-bold text-green-400">{stats.totalEarned}</div>
            </div>
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Total Spent</div>
              <div className="text-3xl font-bold text-orange-400">{stats.totalSpent}</div>
            </div>
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Last Week</div>
              <div className="text-3xl font-bold text-blue-400">{stats.lastWeek}</div>
            </div>
          </div>

          {/* Ways to Earn */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-cyan-400" />
              Ways to Earn Tokens
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="font-semibold text-white mb-1">Complete Experiments</div>
                <div className="text-sm text-slate-400">10 tokens per session</div>
              </div>
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="font-semibold text-white mb-1">High Accuracy</div>
                <div className="text-sm text-slate-400">+5-20 bonus for 70%+</div>
              </div>
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="font-semibold text-white mb-1">Daily Streaks</div>
                <div className="text-sm text-slate-400">+25 every 5 days</div>
              </div>
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="font-semibold text-white mb-1">Achievements</div>
                <div className="text-sm text-slate-400">5-50 tokens each</div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#1a2535]">
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
            </div>

            <div className="divide-y divide-gray-800">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-6 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'earned' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {tx.type === 'earned' ? (
                      <ArrowUpRight className="w-5 h-5 text-green-400" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold text-white">{tx.reason}</div>
                    <div className="text-sm text-slate-400">{tx.date} at {tx.time}</div>
                  </div>

                  <div className={`text-xl font-bold ${
                    tx.type === 'earned' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'earned' ? '+' : '-'}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
