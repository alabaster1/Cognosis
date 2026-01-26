// @ts-nocheck
'use client';

/**
 * Score Results Modal
 * Displays detailed AI scoring results with evidence and breakdown
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, CheckCircle, AlertCircle, TrendingUp, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ScoreResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitToBlockchain: () => void;
  results: {
    score: number;
    explanation: string;
    matches: unknown[];
    misses: unknown[];
    retrievedData?: {
      events: unknown[];
      summary: string;
      dateRange?: string;
    };
    experimentType?: string;
    prediction?: string;
  };
  isSubmitting?: boolean;
}

export default function ScoreResultsModal({
  isOpen,
  onClose,
  onSubmitToBlockchain,
  results,
  isSubmitting = false
}: ScoreResultsModalProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (!isOpen) return null;

  const { score, explanation, matches = [], misses = [], retrievedData, prediction } = results;

  // Determine score rating
  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: 'Exceptional', color: 'text-green-400', stars: 5 };
    if (score >= 75) return { label: 'Excellent', color: 'text-green-400', stars: 4 };
    if (score >= 60) return { label: 'Good', color: 'text-blue-400', stars: 3 };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-400', stars: 2 };
    return { label: 'Needs Work', color: 'text-slate-400', stars: 1 };
  };

  const rating = getScoreRating(score);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060a0f]/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0f1520] border border-[#1a2535] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#1a2535]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-400 flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Prediction Accuracy Results</h2>
                <p className="text-sm text-slate-400">AI-Powered Analysis</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#142030] rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Original Prediction */}
            {prediction && (
              <div className="bg-[#0a1018] border border-[#1a2535] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Your Original Prediction</h3>
                <p className="text-gray-200">{prediction}</p>
              </div>
            )}

            {/* Score Display */}
            <div className="bg-gradient-to-br from-cyan-900/20 to-pink-900/30 border border-cyan-500/30 rounded-xl p-8 text-center">
              <div className="mb-4">
                <div className="text-6xl font-bold bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
                  {score}%
                </div>
                <div className={`text-xl font-semibold mt-2 ${rating.color}`}>
                  {rating.label}
                </div>
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Award
                    key={i}
                    className={`w-6 h-6 ${
                      i < rating.stars
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>

              {/* Explanation */}
              <p className="text-slate-300">{explanation}</p>
            </div>

            {/* Matches */}
            {matches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  What You Got Right
                </h3>
                <div className="space-y-2">
                  {matches.map((match, i) => (
                    <div
                      key={i}
                      className="bg-green-900/20 border border-green-500/30 rounded-lg p-4"
                    >
                      {typeof match === 'string' ? (
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                          </div>
                          <p className="text-sm text-gray-200">{match}</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-green-400">{(match as any).aspect}</span>
                            {(match as any).accuracy && (
                              <span className="text-xs bg-green-500/20 px-2 py-1 rounded">
                                {(match as any).accuracy}% accurate
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300">{(match as any).reasoning || (match as any).description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Misses */}
            {misses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  Areas for Improvement
                </h3>
                <div className="space-y-2">
                  {misses.map((miss, i) => (
                    <div
                      key={i}
                      className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                        </div>
                        <p className="text-sm text-gray-200">{typeof miss === 'string' ? miss : (miss as any).description || miss}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Retrieved Evidence */}
            {retrievedData && retrievedData.events && retrievedData.events.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowEvidence(!showEvidence)}
                  className="w-full flex items-center justify-between p-4 bg-[#0a1018] border border-[#1a2535] rounded-lg hover:bg-[#142030] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold">Evidence Retrieved</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      {retrievedData.events.length} events
                    </span>
                  </div>
                  {showEvidence ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {showEvidence && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3"
                  >
                    {retrievedData.summary && (
                      <div className="p-4 bg-[#142030]/30 border border-[#1a2535] rounded-lg">
                        <p className="text-sm text-slate-300">{retrievedData.summary}</p>
                        {retrievedData.dateRange && (
                          <p className="text-xs text-slate-500 mt-2">
                            Period: {retrievedData.dateRange}
                          </p>
                        )}
                      </div>
                    )}

                    {(retrievedData.events as any[]).slice(0, 5).map((event: Record<string, unknown>, i: number) => (
                      <div
                        key={i}
                        className="p-4 bg-[#0a1018] border border-[#1a2535] rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {event.category && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                  {event.category}
                                </span>
                              )}
                              {event.date && (
                                <span className="text-xs text-slate-500">{event.date}</span>
                              )}
                            </div>
                            <h4 className="font-semibold text-sm mb-1">{event.title}</h4>
                            <p className="text-xs text-slate-400">{event.description}</p>
                            {event.keywords && event.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {event.keywords.slice(0, 4).map((keyword: string, ki: number) => (
                                  <span
                                    key={ki}
                                    className="text-xs bg-[#1a2535] text-slate-300 px-2 py-0.5 rounded"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {retrievedData.events.length > 5 && (
                      <p className="text-center text-sm text-slate-500">
                        ...and {retrievedData.events.length - 5} more events
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-[#1a2535] bg-[#0f1520]/80">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-cyan-500 transition-colors font-semibold"
              >
                Close
              </button>
              <button
                onClick={onSubmitToBlockchain}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Submit to Blockchain
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center mt-3">
              Review your results before submitting to the blockchain
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
