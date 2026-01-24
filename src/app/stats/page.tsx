'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/services/apiService';
import PerformanceCharts from '@/components/charts/PerformanceCharts';
import { TrendingUp, Award, Flame, Brain, ArrowLeft, RefreshCw } from 'lucide-react';

export default function StatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [bayesianEstimates, setBayesianEstimates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, performanceRes, bayesianRes] = await Promise.all([
        apiService.getGamificationStats(),
        apiService.getPerformanceHistory(undefined, 50),
        apiService.getBayesianEstimates()
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
      }

      if (performanceRes.success) {
        setPerformanceHistory(performanceRes.performanceHistory);
      }

      if (bayesianRes.success) {
        setBayesianEstimates(bayesianRes.estimates);
      }
    } catch (err: any) {
      console.error('[StatsPage] Error loading data:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading your stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-6">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/30 border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  Performance Analytics
                </h1>
                <p className="text-slate-400 mt-1">
                  Track your progress with Bayesian updating
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Streak */}
            <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl p-6 border border-orange-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Flame className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-200">Current Streak</h3>
              </div>
              <div className="text-4xl font-bold text-orange-400">
                {stats.streak.current}
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Longest: {stats.streak.longest} days
              </p>
            </div>

            {/* Achievements */}
            <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 rounded-xl p-6 border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Award className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-200">Achievements</h3>
              </div>
              <div className="text-4xl font-bold text-yellow-400">
                {stats.achievements.total}
              </div>
              <p className="text-sm text-slate-400 mt-2">
                {stats.achievements.totalPoints} points earned
              </p>
            </div>

            {/* Total Experiments */}
            <div className="bg-gradient-to-br from-cyan-900/20 to-pink-900/30 rounded-xl p-6 border border-cyan-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-200">Total Trials</h3>
              </div>
              <div className="text-4xl font-bold text-cyan-400">
                {stats.performance.totalExperiments}
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Completed experiments
              </p>
            </div>

            {/* Bayesian Models */}
            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Brain className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-200">Models Active</h3>
              </div>
              <div className="text-4xl font-bold text-blue-400">
                {bayesianEstimates.length}
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Bayesian priors updating
              </p>
            </div>
          </div>
        )}

        {/* Bayesian Estimates Detail */}
        {bayesianEstimates.length > 0 && (
          <div className="bg-[#0f1520]/80 rounded-xl p-6 border border-cyan-500/20">
            <h2 className="text-2xl font-bold text-gray-200 mb-6 flex items-center gap-3">
              <Brain className="w-6 h-6 text-cyan-400" />
              Bayesian Performance Models
            </h2>
            <p className="text-slate-400 mb-6">
              These estimates update with each experiment you complete, providing increasingly accurate predictions of your abilities.
              The uncertainty decreases as you accumulate more data.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bayesianEstimates.map((estimate) => (
                <div
                  key={estimate.experimentType}
                  className="bg-gradient-to-br from-violet-900/15 to-cyan-900/15 rounded-lg p-6 border border-cyan-500/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-200">
                      {estimate.experimentType}
                    </h3>
                    <span className="text-xs text-slate-500 bg-[#142030] px-3 py-1 rounded-full">
                      n = {estimate.sampleSize}
                    </span>
                  </div>

                  {/* Expected Performance */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-cyan-400">
                        {estimate.estimatedPerformance}%
                      </span>
                      <span className="text-slate-500">
                        ± {estimate.uncertainty}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">Expected performance</p>
                  </div>

                  {/* Visual bar */}
                  <div className="relative h-3 bg-[#142030] rounded-full overflow-hidden mb-4">
                    <div
                      className="absolute h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${estimate.estimatedPerformance}%` }}
                    />
                    <div
                      className="absolute h-full bg-violet-300/20"
                      style={{
                        left: `${Math.max(0, parseFloat(estimate.estimatedPerformance) - parseFloat(estimate.uncertainty))}%`,
                        width: `${parseFloat(estimate.uncertainty) * 2}%`
                      }}
                    />
                  </div>

                  {/* Technical details */}
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                    <div>
                      <div className="text-slate-400 mb-1">Prior Mean</div>
                      <div className="font-mono">{(estimate.priorMean * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Posterior Mean</div>
                      <div className="font-mono text-cyan-400">{(estimate.posteriorMean * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Prior Variance</div>
                      <div className="font-mono">{estimate.priorVariance.toFixed(3)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Posterior Variance</div>
                      <div className="font-mono text-blue-400">{estimate.posteriorVariance.toFixed(3)}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#1a2535]">
                    <p className="text-xs text-slate-500">
                      Updated: {new Date(estimate.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Charts */}
        {performanceHistory.length > 0 && (
          <PerformanceCharts
            performanceHistory={performanceHistory}
            bayesianEstimates={bayesianEstimates}
            showBaseline={true}
            height={350}
          />
        )}

        {/* Empty State */}
        {performanceHistory.length === 0 && (
          <div className="bg-[#0f1520]/80 rounded-xl p-12 border border-[#1a2535] text-center">
            <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              No Performance Data Yet
            </h3>
            <p className="text-slate-500 mb-6">
              Complete some experiments to see your performance analytics and Bayesian estimates.
            </p>
            <button
              onClick={() => router.push('/experiments')}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              Start Experimenting
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">
            About Bayesian Updating
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your performance estimates use Bayesian inference to continuously update predictions based on new data.
            Starting with a neutral prior (50% chance performance), each experiment you complete refines the model.
            The posterior mean shows your estimated true ability, while the variance indicates our confidence in that estimate.
            More trials = lower variance = more accurate predictions.
          </p>
        </div>
      </div>
    </div>
  );
}
