'use client';

import { useState, useEffect } from 'react';
import { Brain, Eye, Hand, Heart, MessageCircle, Box } from 'lucide-react';

interface RVStageGuideProps {
  sessionId: string;
  stage: number;
  previousImpressions?: string;
  onComplete: (impressions: any) => void;
}

const STAGE_ICONS: Record<number, typeof Eye> = {
  1: Eye,
  2: Hand,
  3: Box,
  4: Heart,
  5: MessageCircle,
  6: Brain
};

const STAGE_NAMES: Record<number, string> = {
  1: 'Ideogram Detection',
  2: 'Sensory Contact',
  3: 'Dimensional Analysis',
  4: 'Aesthetic Impact',
  5: 'Analytical Queries',
  6: '3D Modeling'
};

const STAGE_DURATIONS: Record<number, number> = {
  1: 2,
  2: 5,
  3: 5,
  4: 5,
  5: 10,
  6: 10
};

export default function RVStageGuide({
  sessionId,
  stage,
  previousImpressions,
  onComplete
}: RVStageGuideProps) {
  const [guidance, setGuidance] = useState<string>('');
  const [impressions, setImpressions] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const Icon = STAGE_ICONS[stage] || Brain;
  const stageName = STAGE_NAMES[stage] || `Stage ${stage}`;
  const duration = STAGE_DURATIONS[stage] || 5;

  // Clear impressions when stage changes
  useEffect(() => {
    setImpressions('');
  }, [stage]);

  useEffect(() => {
    async function fetchGuidance() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8001'}/rv/session/guide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            stage,
            protocol: 'CRV',
            previous_impressions: previousImpressions || ''
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch guidance');
        }

        const data = await response.json();
        setGuidance(data.guidance);
      } catch (err: any) {
        console.error('Failed to fetch guidance:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGuidance();
  }, [sessionId, stage, previousImpressions]);

  const handleSubmit = () => {
    if (!impressions.trim()) return;

    onComplete({
      text: impressions,
      timestamp: new Date().toISOString(),
      stage
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Stage Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg">
          <Icon className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Stage {stage}: {stageName}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            CRV Protocol • ~{duration} minutes
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="animate-pulse space-y-4 mb-6">
          <div className="h-4 bg-gray-200 dark:bg-[#1a2535] rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-[#1a2535] rounded w-1/2"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-900 dark:text-red-100">
            Error loading guidance: {error}
          </p>
        </div>
      )}

      {/* Guidance */}
      {!isLoading && !error && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-line">
              {guidance}
            </p>
          </div>

          {/* Impressions Input */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Record your impressions:
            </label>
            <textarea
              value={impressions}
              onChange={(e) => setImpressions(e.target.value)}
              className="w-full h-48 p-3 border border-gray-300 dark:border-[#1a2535] rounded-lg
                       bg-white dark:bg-[#142030] text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                       resize-none"
              placeholder="Write down everything you perceive... sensations, images, feelings, thoughts..."
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Don't analyze or judge - just record your raw impressions
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!impressions.trim() || isLoading}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg
                     font-medium disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors shadow-lg hover:shadow-xl"
          >
            {stage === 6 ? 'Complete Session' : `Continue to Stage ${stage + 1}`}
          </button>
        </div>
      )}
    </div>
  );
}
