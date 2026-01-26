'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  Users,
  Beaker,
  BarChart3,
  Target,
  Gauge,
} from 'lucide-react';

export interface GlobalStats {
  total: number;
  today: number;
  hitRate: number;
  baseline: number;
  pValue: number;
  effectSize: number;
  zScore: number;
  significanceLevel: 'none' | 'marginal' | 'significant' | 'highly_significant';
  activeUsers24h: number;
}

export interface ExperimentTypeStats {
  type: string;
  count: number;
  hitRate: number;
  baseline: number;
}

interface GlobalStatsPanelProps {
  stats: GlobalStats;
  byExperimentType?: ExperimentTypeStats[];
}

const SignificanceColors = {
  none: 'text-slate-400',
  marginal: 'text-yellow-400',
  significant: 'text-green-400',
  highly_significant: 'text-emerald-400',
};

const SignificanceLabels = {
  none: 'Not Significant',
  marginal: 'Marginal (p < 0.10)',
  significant: 'Significant (p < 0.05)',
  highly_significant: 'Highly Significant (p < 0.01)',
};

export default function GlobalStatsPanel({
  stats,
  byExperimentType = [],
}: GlobalStatsPanelProps) {
  const delta = stats.hitRate - stats.baseline;
  const deltaPercent = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Global Statistics
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0a1018] rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Beaker className="w-3 h-3" />
              Total Experiments
            </div>
            <div className="text-xl font-bold text-white">
              {stats.total.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#0a1018] rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Activity className="w-3 h-3" />
              Today
            </div>
            <div className="text-xl font-bold text-white">
              {stats.today.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#0a1018] rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Users className="w-3 h-3" />
              Active Researchers
            </div>
            <div className="text-xl font-bold text-white">
              {stats.activeUsers24h}
            </div>
          </div>

          <div className="bg-[#0a1018] rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Target className="w-3 h-3" />
              Global Hit Rate
            </div>
            <div className="text-xl font-bold text-white">
              {stats.hitRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Significance Gauge */}
      <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-cyan-400" />
          Statistical Significance
        </h3>

        <div className="space-y-4">
          {/* Hit Rate vs Baseline */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Hit Rate vs Baseline</span>
              <span className={delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                {deltaPercent}%
              </span>
            </div>
            <div className="h-2 bg-[#1a2535] rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${delta >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(Math.abs(delta) * 5, 100)}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          {/* P-Value */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">p-value</span>
            <span className={`font-mono text-sm ${SignificanceColors[stats.significanceLevel]}`}>
              {stats.pValue.toFixed(4)}
            </span>
          </div>

          {/* Z-Score */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Z-Score</span>
            <span className="font-mono text-sm text-white">
              {stats.zScore.toFixed(2)}
            </span>
          </div>

          {/* Effect Size */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Effect Size (Cohen&apos;s d)</span>
            <span className="font-mono text-sm text-white">
              {stats.effectSize.toFixed(3)}
            </span>
          </div>

          {/* Significance Badge */}
          <div
            className={`text-center py-2 rounded-lg ${
              stats.significanceLevel === 'highly_significant'
                ? 'bg-emerald-500/20 border border-emerald-500/50'
                : stats.significanceLevel === 'significant'
                ? 'bg-green-500/20 border border-green-500/50'
                : stats.significanceLevel === 'marginal'
                ? 'bg-yellow-500/20 border border-yellow-500/50'
                : 'bg-[#1a2535] border border-[#1a2535]'
            }`}
          >
            <span className={`text-sm font-semibold ${SignificanceColors[stats.significanceLevel]}`}>
              {SignificanceLabels[stats.significanceLevel]}
            </span>
          </div>
        </div>
      </div>

      {/* By Experiment Type */}
      {byExperimentType.length > 0 && (
        <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            By Experiment Type
          </h3>

          <div className="space-y-3">
            {byExperimentType.map((exp) => {
              const expDelta = exp.hitRate - exp.baseline;
              const barWidth = Math.min((exp.hitRate / 50) * 100, 100);

              return (
                <div key={exp.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 capitalize">
                      {exp.type.replace(/-/g, ' ')}
                    </span>
                    <span className="text-slate-500">{exp.count} runs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#1a2535] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${expDelta >= 0 ? 'bg-cyan-500' : 'bg-slate-700'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span
                      className={`text-xs font-mono ${
                        expDelta >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {expDelta >= 0 ? '+' : ''}{expDelta.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verification Notice */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
        <p className="text-xs text-slate-400">
          All results are cryptographically verified using commitment hashes. Each experiment&apos;s
          target is committed before the user makes their prediction, ensuring data integrity.
        </p>
      </div>
    </div>
  );
}
