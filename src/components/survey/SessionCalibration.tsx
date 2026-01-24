'use client';

import { useState } from 'react';

interface SessionCalibrationProps {
  userId: string;
  sessionId: string;
  experimentType: string;
  onComplete: (data: CalibrationData) => void;
  onSkip: () => void;
}

interface CalibrationData {
  sleepHours: number | null;
  caffeineIntake: string;
  moodState: number;
  stressLevel: number;
  focusLevel: number;
  timePressure: boolean;
  outcomeExpectation: number;
}

export default function SessionCalibration({
  userId,
  sessionId,
  experimentType,
  onComplete,
  onSkip
}: SessionCalibrationProps) {
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [caffeineIntake, setCaffeineIntake] = useState<string>('None');
  const [moodState, setMoodState] = useState<number>(5);
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [focusLevel, setFocusLevel] = useState<number>(5);
  const [timePressure, setTimePressure] = useState<boolean>(false);
  const [outcomeExpectation, setOutcomeExpectation] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const calibrationData: CalibrationData = {
        sleepHours,
        caffeineIntake,
        moodState,
        stressLevel,
        focusLevel,
        timePressure,
        outcomeExpectation
      };

      // Submit to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/survey/calibration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          experimentType,
          ...calibrationData,
          attentionCheckPassed: true,
          skipped: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit calibration');
      }

      const result = await response.json();
      console.log('[Calibration] Saved:', result);

      onComplete(calibrationData);
    } catch (error) {
      console.error('[Calibration] Error:', error);
      alert('Failed to save calibration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Record that user skipped
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/survey/calibration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          experimentType,
          skipped: true
        })
      });

      onSkip();
    } catch (error) {
      console.error('[Calibration] Skip error:', error);
      onSkip();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-[#142030] rounded-xl shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Session Calibration
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Let's calibrate your current state for accurate results
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {/* Sleep */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Hours of sleep last night: <span className="text-cyan-500 font-bold">{sleepHours}h</span>
          </label>
          <input
            type="range"
            min="0"
            max="12"
            step="0.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-[#1a2535]"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0h</span>
            <span>12h</span>
          </div>
        </div>

        {/* Caffeine */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Caffeine intake today
          </label>
          <div className="grid grid-cols-2 gap-3">
            {['None', '1 cup', '2+', 'Energy drink'].map((option) => (
              <button
                key={option}
                onClick={() => setCaffeineIntake(option)}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  caffeineIntake === option
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-cyan-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Current mood: <span className="text-2xl">{moodState <= 3 ? '😞' : moodState <= 7 ? '😐' : '🙂'}</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={moodState}
            onChange={(e) => setMoodState(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-[#1a2535]"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Stress */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Current stress level: <span className="text-cyan-500 font-bold">{stressLevel}/10</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={stressLevel}
            onChange={(e) => setStressLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-[#1a2535]"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Relaxed</span>
            <span>Stressed</span>
          </div>
        </div>

        {/* Focus */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            How focused do you feel?: <span className="text-cyan-500 font-bold">{focusLevel}/10</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={focusLevel}
            onChange={(e) => setFocusLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-[#1a2535]"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Unfocused</span>
            <span>Very Focused</span>
          </div>
        </div>

        {/* Time Pressure */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={timePressure}
              onChange={(e) => setTimePressure(e.target.checked)}
              className="w-5 h-5 text-cyan-500 border-gray-300 rounded focus:ring-cyan-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              I'm rushed or pressed for time right now
            </span>
          </label>
        </div>

        {/* Outcome Expectation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            How well do you expect to perform?: <span className="text-cyan-500 font-bold">{outcomeExpectation}/10</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={outcomeExpectation}
            onChange={(e) => setOutcomeExpectation(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-[#1a2535]"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg
                   font-medium transition-colors shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Begin Experiment'}
        </button>
        <button
          onClick={handleSkip}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-[#1a2535] dark:hover:bg-gray-600
                   text-gray-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Skip Warning */}
      <p className="mt-4 text-sm text-center text-slate-500 dark:text-slate-400">
        Skipping may reduce accuracy of your results
      </p>
    </div>
  );
}
