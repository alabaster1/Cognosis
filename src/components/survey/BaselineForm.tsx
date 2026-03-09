'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import type { BaselineProfile } from '@/types';

interface BaselineFormProps {
  existingProfile?: BaselineProfile | null;
  onComplete: (profile: BaselineProfile) => void;
  onCancel?: () => void;
}

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const HANDEDNESS_OPTIONS = ['Right', 'Left', 'Ambidextrous'];
const PSI_TRAINING_OPTIONS = ['None', 'Books/videos', 'Workshops', 'Formal training', 'Professional'];

function meditationLabel(value: number): string {
  if (value <= 2) return 'Novice';
  if (value <= 4) return 'Some experience';
  if (value <= 6) return 'Intermediate';
  if (value <= 8) return 'Experienced';
  return 'Expert';
}

function beliefLabel(value: number): string {
  if (value <= 2) return 'Strong skeptic';
  if (value <= 4) return 'Leaning skeptic';
  if (value === 5) return 'Neutral';
  if (value <= 7) return 'Open-minded';
  if (value <= 9) return 'Believer';
  return 'Strong believer';
}

export default function BaselineForm({ existingProfile, onComplete, onCancel }: BaselineFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [ageRange, setAgeRange] = useState(existingProfile?.ageRange || '');
  const [gender, setGender] = useState(existingProfile?.gender || '');
  const [handedness, setHandedness] = useState(existingProfile?.handedness || 'Right');
  const [meditationExperience, setMeditationExperience] = useState(existingProfile?.meditationExperience ?? 3);
  const [beliefScale, setBeliefScale] = useState(existingProfile?.beliefScale ?? 5);
  const [psiTraining, setPsiTraining] = useState(existingProfile?.psiTraining || 'None');

  const canProceedStep1 = ageRange !== '' && handedness !== '';
  const canSubmit = canProceedStep1;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { default: apiService } = await import('@/services/apiService');
      const profile = await apiService.submitBaseline({
        ageRange,
        gender: gender || undefined,
        handedness,
        meditationExperience,
        beliefScale,
        psiTraining,
      });
      onComplete(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit baseline');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    enter: { x: 20, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
  };

  return (
    <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 md:p-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > s
                  ? 'bg-cyan-500 text-white'
                  : step === s
                    ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                    : 'bg-[#1a2535] text-slate-500'
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {i < 2 && (
              <div
                className={`w-16 h-0.5 mx-2 transition-colors ${
                  step > s ? 'bg-cyan-500' : 'bg-[#1a2535]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Demographics */}
        {step === 1 && (
          <motion.div
            key="step1"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white mb-1">Demographics</h2>
            <p className="text-slate-400 mb-6 text-sm">Basic info used for statistical controls</p>

            {/* Age Range */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Age Range <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AGE_RANGES.map((range) => (
                  <button
                    key={range}
                    onClick={() => setAgeRange(range)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      ageRange === range
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                        : 'border-[#1a2535] text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      gender === g
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                        : 'border-[#1a2535] text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Handedness */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Handedness <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {HANDEDNESS_OPTIONS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHandedness(h)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      handedness === h
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                        : 'border-[#1a2535] text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <motion.div
            key="step2"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white mb-1">Experience & Beliefs</h2>
            <p className="text-slate-400 mb-6 text-sm">Your background with meditation and psi phenomena</p>

            {/* Meditation Experience */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Meditation Experience
              </label>
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyan-400 font-semibold text-sm">{meditationLabel(meditationExperience)}</span>
                <span className="text-white font-bold">{meditationExperience}/10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={meditationExperience}
                onChange={(e) => setMeditationExperience(parseInt(e.target.value))}
                className="w-full h-2 bg-[#1a2535] rounded-full appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>None</span>
                <span>Expert</span>
              </div>
            </div>

            {/* Belief Scale */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Belief in Psi Phenomena
              </label>
              <div className="flex items-center justify-between mb-2">
                <span className="text-teal-400 font-semibold text-sm">{beliefLabel(beliefScale)}</span>
                <span className="text-white font-bold">{beliefScale}/10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={beliefScale}
                onChange={(e) => setBeliefScale(parseInt(e.target.value))}
                className="w-full h-2 bg-[#1a2535] rounded-full appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Skeptic</span>
                <span>Believer</span>
              </div>
            </div>

            {/* Psi Training */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Psi Training</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PSI_TRAINING_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setPsiTraining(option)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      psiTraining === option
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                        : 'border-[#1a2535] text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <motion.div
            key="step3"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white mb-1">Review & Submit</h2>
            <p className="text-slate-400 mb-6 text-sm">Confirm your responses before submitting</p>

            <div className="space-y-4">
              <div className="bg-[#0a0f18] rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Demographics</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Age Range:</span>
                    <span className="text-white ml-2 font-medium">{ageRange}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Gender:</span>
                    <span className="text-white ml-2 font-medium">{gender || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Handedness:</span>
                    <span className="text-white ml-2 font-medium">{handedness}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0f18] rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Experience</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Meditation:</span>
                    <span className="text-white font-medium">{meditationExperience}/10 ({meditationLabel(meditationExperience)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Belief in Psi:</span>
                    <span className="text-white font-medium">{beliefScale}/10 ({beliefLabel(beliefScale)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Psi Training:</span>
                    <span className="text-white font-medium">{psiTraining}</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : onCancel ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          ) : (
            <div />
          )}
        </div>
        <div>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !canProceedStep1}
              className="flex items-center gap-1 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
