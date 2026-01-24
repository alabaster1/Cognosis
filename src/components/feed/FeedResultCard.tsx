'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Clock,
  Target,
  Grid3X3,
  Zap,
  RotateCcw,
  Palette,
  Coins,
  Spade,
  Radio,
  Sparkles,
} from 'lucide-react';

export interface FeedResult {
  id: string;
  experimentType: string;
  score: number;
  accuracy: number;
  baseline: number;
  delta: number;
  timestamp: string;
  commitmentHash: string | null;
  verified: boolean;
  anonymizedUser: string;
}

const EXPERIMENT_ICONS: Record<string, React.ElementType> = {
  'pattern-oracle': Grid3X3,
  'timeline-racer': Zap,
  'retro-roulette': RotateCcw,
  'emotion-echo': Palette,
  'quantum-coin-arena': Coins,
  'psi-poker': Spade,
  'mind-pulse': Radio,
  'synchronicity-bingo': Sparkles,
  'card-prediction': Target,
  'remote-viewing': Target,
  'precognition': Target,
  default: Target,
};

const EXPERIMENT_COLORS: Record<string, string> = {
  'pattern-oracle': 'text-teal-300 bg-teal-500/15 border-teal-500/30',
  'timeline-racer': 'text-amber-300 bg-amber-500/15 border-amber-500/30',
  'retro-roulette': 'text-violet-300 bg-violet-500/15 border-violet-500/30',
  'emotion-echo': 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/30',
  'quantum-coin-arena': 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
  'psi-poker': 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
  'mind-pulse': 'text-violet-300 bg-violet-500/15 border-violet-500/30',
  'synchronicity-bingo': 'text-rose-300 bg-rose-500/15 border-rose-500/30',
  default: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
};

interface FeedResultCardProps {
  result: FeedResult;
  index?: number;
}

export default function FeedResultCard({ result, index = 0 }: FeedResultCardProps) {
  const Icon = EXPERIMENT_ICONS[result.experimentType] || EXPERIMENT_ICONS.default;
  const colorClass = EXPERIMENT_COLORS[result.experimentType] || EXPERIMENT_COLORS.default;
  const iconColor = colorClass.split(' ')[0];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const formatExperimentName = (type: string) => {
    return type
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-[#0f1520]/80 rounded-xl border ${colorClass.split(' ')[2]} p-4 hover:bg-[#142030] transition-colors`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon & Experiment Info */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClass.split(' ').slice(1, 3).join(' ')}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {formatExperimentName(result.experimentType)}
              </span>
              {result.verified && (
                <Shield className="w-4 h-4 text-green-400" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{result.anonymizedUser}</span>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{formatTime(result.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Right: Score & Delta */}
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-lg font-semibold text-white">
              {result.accuracy.toFixed(1)}%
            </span>
            <div
              className={`flex items-center text-sm ${
                result.delta > 0
                  ? 'text-green-400'
                  : result.delta < 0
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}
            >
              {result.delta > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : result.delta < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span>{result.delta >= 0 ? '+' : ''}{result.delta.toFixed(1)}%</span>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            vs {result.baseline}% baseline
          </div>
        </div>
      </div>

      {/* Commitment hash */}
      {result.commitmentHash && (
        <div className="mt-3 pt-3 border-t border-[#1a2535]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Commitment:</span>
            <code className="text-slate-500 font-mono">
              {result.commitmentHash.slice(0, 8)}...{result.commitmentHash.slice(-8)}
            </code>
          </div>
        </div>
      )}
    </motion.div>
  );
}
