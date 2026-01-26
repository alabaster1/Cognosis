'use client';

import Header from '@/components/layout/Header';
import { Award, Lock, CheckCircle, Trophy, Target, Zap, Star } from 'lucide-react';

export default function AchievementsPage() {
  // Mock data - will be replaced with real data from backend
  const achievements = [
    {
      id: 'first_rv',
      name: 'First Steps',
      description: 'Complete your first Remote Viewing session',
      icon: '🎯',
      rarity: 'common',
      unlocked: true,
      unlockedAt: '2025-10-06',
      tokens: 10
    },
    {
      id: 'streak_5',
      name: 'Dedicated Practitioner',
      description: 'Practice for 5 days in a row',
      icon: '🔥',
      rarity: 'uncommon',
      unlocked: true,
      unlockedAt: '2025-10-09',
      tokens: 25
    },
    {
      id: 'high_accuracy',
      name: 'Sharp Vision',
      description: 'Achieve 80%+ accuracy in a session',
      icon: '👁️',
      rarity: 'rare',
      unlocked: true,
      unlockedAt: '2025-10-08',
      tokens: 50
    },
    {
      id: 'perfect_score',
      name: 'Perfect Perception',
      description: 'Achieve 95%+ accuracy in a session',
      icon: '💎',
      rarity: 'legendary',
      unlocked: false,
      tokens: 100
    },
    {
      id: 'ten_sessions',
      name: 'Experienced Viewer',
      description: 'Complete 10 Remote Viewing sessions',
      icon: '📚',
      rarity: 'uncommon',
      unlocked: true,
      unlockedAt: '2025-10-09',
      tokens: 30
    },
    {
      id: 'all_stages',
      name: 'Stage Master',
      description: 'Complete all 6 CRV stages in one session',
      icon: '🎓',
      rarity: 'rare',
      unlocked: false,
      tokens: 50
    },
    {
      id: 'baseline_complete',
      name: 'Well Calibrated',
      description: 'Complete your baseline profile',
      icon: '⚖️',
      rarity: 'common',
      unlocked: false,
      tokens: 15
    },
    {
      id: 'streak_30',
      name: 'True Dedication',
      description: 'Practice for 30 days in a row',
      icon: '⚡',
      rarity: 'epic',
      unlocked: false,
      tokens: 150
    }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalTokens = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.tokens, 0);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-slate-400 border-gray-600';
      case 'uncommon': return 'text-green-400 border-green-600';
      case 'rare': return 'text-blue-400 border-blue-600';
      case 'epic': return 'text-cyan-400 border-cyan-500';
      case 'legendary': return 'text-yellow-400 border-yellow-600';
      default: return 'text-slate-400 border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Award className="w-8 h-8 text-orange-400" />
              Achievements
            </h1>
            <p className="text-slate-400">Unlock badges and earn rewards for your accomplishments</p>
          </div>

          {/* Progress Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <div className="text-slate-400 text-sm">Unlocked</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {unlockedCount}/{achievements.length}
              </div>
            </div>

            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <div className="text-slate-400 text-sm">Completion</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {Math.round((unlockedCount / achievements.length) * 100)}%
              </div>
            </div>

            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div className="text-slate-400 text-sm">Tokens Earned</div>
              </div>
              <div className="text-3xl font-bold text-yellow-400">{totalTokens}</div>
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`relative bg-[#0f1520] border ${
                  achievement.unlocked
                    ? getRarityColor(achievement.rarity)
                    : 'border-[#1a2535] opacity-60'
                } rounded-xl p-6 transition-all hover:scale-105`}
              >
                {/* Rarity Badge */}
                <div className={`absolute top-3 right-3 px-2 py-0.5 bg-[#142030] ${
                  getRarityColor(achievement.rarity)
                } text-xs rounded capitalize`}>
                  {achievement.rarity}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 ${
                  achievement.unlocked ? 'bg-[#142030]' : 'bg-[#0a1018]'
                }`}>
                  {achievement.unlocked ? achievement.icon : <Lock className="w-6 h-6 text-slate-600" />}
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  {achievement.name}
                  {achievement.unlocked && <CheckCircle className="w-4 h-4 text-green-400" />}
                </h3>
                <p className="text-sm text-slate-400 mb-4">{achievement.description}</p>

                {/* Rewards */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-yellow-400 text-sm font-semibold">
                    <Star className="w-4 h-4" />
                    {achievement.tokens} tokens
                  </div>
                  {achievement.unlocked && (
                    <div className="text-xs text-slate-500">
                      {achievement.unlockedAt}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
