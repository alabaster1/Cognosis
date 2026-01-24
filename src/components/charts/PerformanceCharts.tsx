'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp, Activity, Target, Brain } from 'lucide-react';

interface PerformanceDataPoint {
  recordedAt: string;
  score: number;
  accuracy?: number;
  delta?: number;
  experimentType: string;
  zScore?: number;
  pValue?: number;
}

interface BayesianEstimate {
  experimentType: string;
  estimatedPerformance: string;
  uncertainty: string;
  sampleSize: number;
}

interface PerformanceChartsProps {
  performanceHistory: PerformanceDataPoint[];
  bayesianEstimates?: BayesianEstimate[];
  showBaseline?: boolean;
  height?: number;
}

export default function PerformanceCharts({
  performanceHistory,
  bayesianEstimates = [],
  showBaseline = true,
  height = 300
}: PerformanceChartsProps) {
  // Format data for charts
  const chartData = performanceHistory.map((point, index) => ({
    index: index + 1,
    date: new Date(point.recordedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    score: point.score,
    accuracy: point.accuracy || 0,
    delta: point.delta || 0,
    experimentType: point.experimentType,
    zScore: point.zScore || 0,
    baseline: 50 // Chance baseline
  }));

  // Calculate aggregate stats
  const avgScore = performanceHistory.length > 0
    ? performanceHistory.reduce((sum, p) => sum + p.score, 0) / performanceHistory.length
    : 0;

  const recentTrend = chartData.length >= 5
    ? (chartData.slice(-5).reduce((sum, p) => sum + p.score, 0) / 5) -
      (chartData.slice(0, 5).reduce((sum, p) => sum + p.score, 0) / 5)
    : 0;

  const aboveChance = performanceHistory.filter(p => p.score > 50).length;
  const totalExperiments = performanceHistory.length;
  const successRate = totalExperiments > 0 ? (aboveChance / totalExperiments) * 100 : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1520] border border-cyan-500/20 rounded-lg p-3 shadow-xl">
          <p className="text-sm text-slate-400 mb-1">{payload[0].payload.date}</p>
          <p className="text-sm font-medium text-cyan-300">
            Score: {payload[0].value.toFixed(1)}
          </p>
          {payload[0].payload.delta !== 0 && (
            <p className={`text-xs ${payload[0].payload.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {payload[0].payload.delta > 0 ? '+' : ''}{payload[0].payload.delta.toFixed(1)} vs baseline
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            {payload[0].payload.experimentType}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-cyan-900/15 to-teal-900/15 rounded-lg p-4 border border-cyan-500/15">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Target className="w-4 h-4" />
            <span>Average Score</span>
          </div>
          <div className="text-2xl font-bold text-cyan-300">
            {avgScore.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {avgScore > 50 ? `+${(avgScore - 50).toFixed(1)}` : (avgScore - 50).toFixed(1)} vs chance
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-900/15 to-fuchsia-900/15 rounded-lg p-4 border border-violet-500/15">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Recent Trend</span>
          </div>
          <div className={`text-2xl font-bold ${recentTrend > 0 ? 'text-emerald-400' : recentTrend < 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {recentTrend > 0 ? '+' : ''}{recentTrend.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Last 5 vs first 5
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/15 to-teal-900/15 rounded-lg p-4 border border-emerald-500/15">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Activity className="w-4 h-4" />
            <span>Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {successRate.toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {aboveChance}/{totalExperiments} above chance
          </div>
        </div>

        <div className="bg-gradient-to-br from-fuchsia-900/15 to-violet-900/15 rounded-lg p-4 border border-fuchsia-500/15">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Brain className="w-4 h-4" />
            <span>Total Trials</span>
          </div>
          <div className="text-2xl font-bold text-fuchsia-300">
            {totalExperiments}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Experiments completed
          </div>
        </div>
      </div>

      {/* Score Progression Line Chart */}
      <div className="bg-[#0f1520]/80 rounded-lg p-6 border border-cyan-500/10">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Score Progression
        </h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: '#64748b' }}
              iconType="line"
            />
            {showBaseline && (
              <ReferenceLine
                y={50}
                stroke="#f43f5e"
                strokeDasharray="5 5"
                label={{ value: 'Chance Baseline', fill: '#f43f5e', fontSize: 12 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#00f0ff"
              strokeWidth={2}
              dot={{ fill: '#00f0ff', r: 4 }}
              activeDot={{ r: 6 }}
              name="Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Delta from Baseline Area Chart */}
      <div className="bg-[#0f1520]/80 rounded-lg p-6 border border-cyan-500/10">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-400" />
          Performance Delta (vs Baseline)
        </h3>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#64748b' }} />
            <ReferenceLine
              y={0}
              stroke="#475569"
              strokeDasharray="3 3"
            />
            <Area
              type="monotone"
              dataKey="delta"
              stroke="#a855f7"
              fill="#a855f7"
              fillOpacity={0.2}
              name="Delta"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bayesian Estimates */}
      {bayesianEstimates.length > 0 && (
        <div className="bg-[#0f1520]/80 rounded-lg p-6 border border-cyan-500/10">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            Bayesian Performance Estimates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bayesianEstimates.map((estimate) => (
              <div
                key={estimate.experimentType}
                className="bg-gradient-to-br from-cyan-900/10 to-violet-900/10 rounded-lg p-4 border border-cyan-500/15"
              >
                <div className="text-sm text-slate-400 mb-2">
                  {estimate.experimentType}
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-cyan-300">
                    {estimate.estimatedPerformance}%
                  </div>
                  <div className="text-sm text-slate-500">
                    ± {estimate.uncertainty}%
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Based on {estimate.sampleSize} trial{estimate.sampleSize !== 1 ? 's' : ''}
                </div>
                <div className="mt-3 bg-[#0a1018] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full transition-all duration-500"
                    style={{ width: `${estimate.estimatedPerformance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Z-Score Distribution */}
      {chartData.some(d => d.zScore !== 0) && (
        <div className="bg-[#0f1520]/80 rounded-lg p-6 border border-cyan-500/10">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Statistical Significance (Z-Scores)
          </h3>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#64748b' }} />
              <ReferenceLine
                y={1.96}
                stroke="#39ff8e"
                strokeDasharray="3 3"
                label={{ value: 'p < 0.05', fill: '#39ff8e', fontSize: 10 }}
              />
              <ReferenceLine
                y={-1.96}
                stroke="#39ff8e"
                strokeDasharray="3 3"
              />
              <Bar
                dataKey="zScore"
                fill="#39ff8e"
                opacity={0.7}
                name="Z-Score"
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-xs text-slate-500 text-center">
            Values beyond ±1.96 indicate statistically significant results (p &lt; 0.05)
          </div>
        </div>
      )}
    </div>
  );
}

// Export individual chart components for flexibility
export function ScoreProgressionChart({ data, height = 300 }: { data: any[], height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" />
        <XAxis dataKey="date" stroke="#64748b" />
        <YAxis stroke="#64748b" domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <ReferenceLine y={50} stroke="#f43f5e" strokeDasharray="5 5" />
        <Line type="monotone" dataKey="score" stroke="#00f0ff" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DeltaAreaChart({ data, height = 300 }: { data: any[], height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" />
        <XAxis dataKey="date" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip />
        <Legend />
        <ReferenceLine y={0} stroke="#475569" />
        <Area type="monotone" dataKey="delta" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
