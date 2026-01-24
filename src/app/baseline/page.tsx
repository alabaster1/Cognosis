'use client';

import Header from '@/components/layout/Header';
import { FileText, User, Moon, Brain, AlertCircle, CheckCircle } from 'lucide-react';

export default function BaselinePage() {
  // Mock data - will be replaced with real data from backend
  const baseline = {
    ageRange: '25-34',
    handedness: 'Right',
    meditationExperience: 7,
    beliefScale: 6,
    psiTraining: 'Books/videos',
    lunarPhase: 'Waning Gibbous',
    createdAt: '2025-10-09',
    expiresAt: '2026-01-07'
  };

  const hasBaseline = baseline;

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-400" />
              Baseline Profile
            </h1>
            <p className="text-slate-400">
              Stable demographic and background data used to control for individual differences
            </p>
          </div>

          {hasBaseline ? (
            <>
              {/* Status Banner */}
              <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 mb-8 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <div className="text-green-400 font-semibold">Profile Active</div>
                  <div className="text-sm text-slate-400">
                    Valid until {baseline.expiresAt} • Updates every 90 days
                  </div>
                </div>
              </div>

              {/* Demographics */}
              <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  Demographics
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Age Range</div>
                    <div className="text-white font-semibold">{baseline.ageRange}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Handedness</div>
                    <div className="text-white font-semibold">{baseline.handedness}</div>
                  </div>
                </div>
              </div>

              {/* Experience & Beliefs */}
              <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  Experience & Beliefs
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-slate-400">Meditation Experience</div>
                      <div className="text-white font-semibold">{baseline.meditationExperience}/10</div>
                    </div>
                    <div className="w-full bg-[#142030] rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${baseline.meditationExperience * 10}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-slate-400">
                        Belief in Psi (Skeptic ↔ Believer)
                      </div>
                      <div className="text-white font-semibold">{baseline.beliefScale}/10</div>
                    </div>
                    <div className="w-full bg-[#142030] rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full"
                        style={{ width: `${baseline.beliefScale * 10}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-400 mb-1">Psi Training</div>
                    <div className="text-white font-semibold">{baseline.psiTraining}</div>
                  </div>
                </div>
              </div>

              {/* Environment */}
              <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  Environmental Data
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Lunar Phase at Baseline</div>
                    <div className="text-white font-semibold">{baseline.lunarPhase}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Recorded</div>
                    <div className="text-white font-semibold">{baseline.createdAt}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* No Baseline State */
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-12 text-center">
              <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Baseline Profile</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Complete your baseline profile to improve experiment accuracy and enable better statistical controls
              </p>
              <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">
                Complete Baseline Survey
              </button>
              <div className="mt-6 text-sm text-slate-500">
                Takes ~5 minutes • Required once every 90 days
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
