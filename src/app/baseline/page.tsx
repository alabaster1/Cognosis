'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import BaselineForm from '@/components/survey/BaselineForm';
import { FileText, User, Moon, Brain, AlertCircle, CheckCircle, RefreshCw, Loader2, Wallet } from 'lucide-react';
import type { BaselineProfile } from '@/types';

type PageState = 'loading' | 'no-wallet' | 'form' | 'display';

export default function BaselinePage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<BaselineProfile | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBaseline = useCallback(async () => {
    try {
      const { default: apiService } = await import('@/services/apiService');
      const result = await apiService.checkBaseline();
      if (result.needsBaseline) {
        setProfile(result.profile);
        setPageState('form');
      } else {
        setProfile(result.profile);
        setDaysRemaining(result.daysRemaining);
        setPageState('display');
      }
    } catch (err) {
      console.error('[Baseline] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load baseline');
      setPageState('form');
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      setPageState('no-wallet');
      return;
    }
    fetchBaseline();
  }, [fetchBaseline]);

  const handleFormComplete = (newProfile: BaselineProfile) => {
    setProfile(newProfile);
    const expires = new Date(newProfile.expiresAt);
    const now = new Date();
    setDaysRemaining(Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    setPageState('display');
  };

  const cardAnim = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

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

          {/* Loading */}
          {pageState === 'loading' && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          )}

          {/* No Wallet */}
          {pageState === 'no-wallet' && (
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-12 text-center">
              <Wallet className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Wallet Required</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Connect your wallet to create or view your baseline profile
              </p>
            </div>
          )}

          {/* Form */}
          {pageState === 'form' && (
            <motion.div {...cardAnim} transition={{ duration: 0.3 }}>
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <BaselineForm
                existingProfile={profile}
                onComplete={handleFormComplete}
                onCancel={profile ? () => setPageState('display') : undefined}
              />
            </motion.div>
          )}

          {/* Display */}
          {pageState === 'display' && profile && (
            <>
              {/* Status Banner */}
              <motion.div
                {...cardAnim}
                transition={{ duration: 0.3 }}
                className="bg-green-900/20 border border-green-800 rounded-xl p-4 mb-8 flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-green-400 font-semibold">Profile Active</div>
                  <div className="text-sm text-slate-400">
                    Valid until {new Date(profile.expiresAt).toLocaleDateString()}
                    {daysRemaining !== null && ` (${daysRemaining} days remaining)`}
                    {' '}&bull; Updates every 90 days
                  </div>
                </div>
                <button
                  onClick={() => setPageState('form')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-800/40 hover:bg-green-800/60 text-green-300 rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Update Profile
                </button>
              </motion.div>

              {/* Demographics */}
              <motion.div
                {...cardAnim}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  Demographics
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Age Range</div>
                    <div className="text-white font-semibold">{profile.ageRange}</div>
                  </div>
                  {profile.gender && (
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Gender</div>
                      <div className="text-white font-semibold">{profile.gender}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Handedness</div>
                    <div className="text-white font-semibold">{profile.handedness}</div>
                  </div>
                </div>
              </motion.div>

              {/* Experience & Beliefs */}
              <motion.div
                {...cardAnim}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  Experience & Beliefs
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-slate-400">Meditation Experience</div>
                      <div className="text-white font-semibold">{profile.meditationExperience}/10</div>
                    </div>
                    <div className="w-full bg-[#142030] rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${profile.meditationExperience * 10}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-slate-400">Belief in Psi (Skeptic &harr; Believer)</div>
                      <div className="text-white font-semibold">{profile.beliefScale}/10</div>
                    </div>
                    <div className="w-full bg-[#142030] rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${profile.beliefScale * 10}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-400 mb-1">Psi Training</div>
                    <div className="text-white font-semibold">{profile.psiTraining}</div>
                  </div>
                </div>
              </motion.div>

              {/* Environment */}
              <motion.div
                {...cardAnim}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  Environmental Data
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {profile.lunarPhase && (
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Lunar Phase at Baseline</div>
                      <div className="text-white font-semibold">{profile.lunarPhase}</div>
                    </div>
                  )}
                  {profile.geomagneticIndex !== null && (
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Geomagnetic Index (Kp)</div>
                      <div className="text-white font-semibold">{profile.geomagneticIndex}</div>
                    </div>
                  )}
                  {profile.timezone && (
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Timezone</div>
                      <div className="text-white font-semibold">{profile.timezone}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Recorded</div>
                    <div className="text-white font-semibold">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
