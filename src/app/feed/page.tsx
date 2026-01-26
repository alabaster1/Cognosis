'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import FeedResultCard, { type FeedResult } from '@/components/feed/FeedResultCard';
import GlobalStatsPanel, { type ExperimentTypeStats } from '@/components/feed/GlobalStatsPanel';
import useFeedSocket from '@/hooks/useFeedSocket';
import {
  Activity,
  Radio,
  Filter,
  RefreshCw,
  Wifi,
  WifiOff,
  TrendingUp,
  Users,
  Beaker,
  Clock,
} from 'lucide-react';

const EXPERIMENT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pattern-oracle', label: 'Pattern Oracle' },
  { id: 'timeline-racer', label: 'Timeline Racer' },
  { id: 'retro-roulette', label: 'Retro Roulette' },
  { id: 'emotion-echo', label: 'Emotion Echo' },
  { id: 'quantum-coin-arena', label: 'Quantum Coin Arena' },
  { id: 'psi-poker', label: 'Psi Poker' },
  { id: 'mind-pulse', label: 'Mind Pulse' },
  { id: 'synchronicity-bingo', label: 'Synchronicity Bingo' },
  { id: 'card-prediction', label: 'Card Prediction' },
  { id: 'remote-viewing', label: 'Remote Viewing' },
];

export default function FeedPage() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { results, globalStats, isConnected, connect, disconnect } = useFeedSocket();

  // Filter results
  const filteredResults = useMemo(() => {
    if (selectedFilter === 'all') return results;
    return results.filter((r) => r.experimentType === selectedFilter);
  }, [results, selectedFilter]);

  // Calculate experiment type stats
  const experimentTypeStats = useMemo((): ExperimentTypeStats[] => {
    const statsMap = new Map<string, { count: number; totalAccuracy: number; baseline: number }>();

    results.forEach((result) => {
      const existing = statsMap.get(result.experimentType);
      if (existing) {
        existing.count++;
        existing.totalAccuracy += result.accuracy;
      } else {
        statsMap.set(result.experimentType, {
          count: 1,
          totalAccuracy: result.accuracy,
          baseline: result.baseline,
        });
      }
    });

    return Array.from(statsMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        hitRate: data.totalAccuracy / data.count,
        baseline: data.baseline,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [results]);

  // Quick stats
  const quickStats = useMemo(() => {
    const total = globalStats?.today || 0;
    const avgDelta =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.delta, 0) / results.length
        : 0;
    const verifiedCount = results.filter((r) => r.verified).length;

    return { total, avgDelta, verifiedCount };
  }, [results, globalStats]);

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/15 rounded-xl">
                <Radio className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Global Research Feed</h1>
                <p className="text-slate-400">Real-time experiment results from researchers worldwide</p>
              </div>
            </div>

            {/* Connection status */}
            <div className="flex items-center gap-4">
              <button
                onClick={isConnected ? disconnect : connect}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isConnected
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm">Disconnected</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Beaker className="w-4 h-4" />
                Experiments Today
              </div>
              <div className="text-2xl font-bold text-white">
                {quickStats.total.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                Global Hit Rate
              </div>
              <div className="text-2xl font-bold text-white">
                {globalStats ? `${globalStats.hitRate.toFixed(1)}%` : '--'}
              </div>
            </div>

            <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Activity className="w-4 h-4" />
                Current p-value
              </div>
              <div
                className={`text-2xl font-bold ${
                  globalStats && globalStats.pValue < 0.05
                    ? 'text-green-400'
                    : 'text-white'
                }`}
              >
                {globalStats ? globalStats.pValue.toFixed(3) : '--'}
                {globalStats && globalStats.pValue < 0.05 && '*'}
              </div>
            </div>

            <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Users className="w-4 h-4" />
                Active Researchers
              </div>
              <div className="text-2xl font-bold text-white">
                {globalStats?.activeUsers24h || '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Tabs */}
            <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter className="w-4 h-4 text-slate-500 ml-2 flex-shrink-0" />
                {EXPERIMENT_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      selectedFilter === filter.id
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-[#1a2535]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Results Stream */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Live Results
                  {isConnected && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  )}
                </h2>
                <span className="text-sm text-slate-500">
                  {filteredResults.length} results
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                {filteredResults.length > 0 ? (
                  filteredResults.map((result, index) => (
                    <FeedResultCard
                      key={result.id}
                      result={result}
                      index={index}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-8 text-center"
                  >
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">
                      {selectedFilter === 'all'
                        ? 'Waiting for results...'
                        : `No ${selectedFilter.replace(/-/g, ' ')} results yet`}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Load More (pagination placeholder) */}
              {filteredResults.length >= 20 && (
                <div className="text-center py-4">
                  <button className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-2 mx-auto">
                    <RefreshCw className="w-4 h-4" />
                    Load More
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            {globalStats && (
              <GlobalStatsPanel
                stats={globalStats}
                byExperimentType={experimentTypeStats}
              />
            )}

            {!globalStats && (
              <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-8 text-center">
                <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-pulse" />
                <p className="text-slate-500">Loading statistics...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>
            All results are cryptographically verified. Commitment hashes ensure data integrity
            and prevent post-hoc modification.
          </p>
        </div>
      </main>
    </div>
  );
}
