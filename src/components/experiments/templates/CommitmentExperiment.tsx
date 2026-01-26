'use client';

/**
 * CommitmentExperiment Template
 * Reusable component for commitment-based experiments
 * Follows: intro → setup → predict → success flow
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Lock, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CommitmentExperimentConfig,
  defaultMetadataBuilder,
} from './types';

type Step = 'intro' | 'setup' | 'predict' | 'success';

interface CommitmentExperimentProps {
  config: CommitmentExperimentConfig;
}

export default function CommitmentExperiment({ config }: CommitmentExperimentProps) {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [step, setStep] = useState<Step>('intro');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commitmentId, setCommitmentId] = useState('');
  const [error, setError] = useState('');

  const Icon = config.icon;
  const { theme } = config;

  const handleStartExperiment = () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
    setStep('setup');
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    setError('');
  };

  const handleSetup = () => {
    // Validate required fields
    const missingFields = config.setup.fields
      .filter((f) => f.required !== false && !fieldValues[f.id])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }
    setError('');
    setStep('predict');
  };

  const handleSubmitPrediction = async () => {
    const minLen = config.predict.minLength || 1;
    if (!prediction.trim() || prediction.trim().length < minLen) {
      setError(
        minLen > 1
          ? `Please enter at least ${minLen} characters`
          : 'Please enter your prediction'
      );
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const metadata = config.buildMetadata
        ? config.buildMetadata(fieldValues, prediction)
        : defaultMetadataBuilder(config, fieldValues, prediction);

      const result = await experimentService.createCommitment({
        experimentType: config.experimentType,
        prediction: prediction,
        metadata,
      });

      setCommitmentId(result.commitmentId);
      setStep('success');
    } catch (err: unknown) {
      console.error('Commit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create commitment');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic gradient classes
  const gradientClass = `from-${theme.gradient.from} to-${theme.gradient.to}`;
  const accentBgClass = `bg-${theme.accent}-500/20`;
  const accentTextClass = `text-${theme.accent}-400`;
  const accentBorderClass = `border-${theme.accent}-500/30`;

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />
      <div className="container mx-auto px-4 py-20">
        <AnimatePresence mode="wait">
          {/* INTRO STEP */}
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">{config.title}</h1>
                  <p className="text-slate-400">{config.subtitle}</p>
                </div>
              </div>

              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
                <h2 className="text-2xl font-bold mb-4">How It Works</h2>
                <ol className="space-y-4">
                  {config.howItWorks.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span
                        className={`flex-shrink-0 w-8 h-8 rounded-full ${accentBgClass} ${accentTextClass} flex items-center justify-center font-bold`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <strong>{step.title}</strong>
                        <p className="text-slate-400 text-sm">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <button
                onClick={handleStartExperiment}
                className={`w-full py-4 bg-gradient-to-r ${gradientClass} rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
              >
                Begin Experiment
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* SETUP STEP */}
          {step === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-3xl font-bold mb-2">
                {config.setup.title || 'Setup Your Experiment'}
              </h2>
              <p className="text-slate-400 mb-8">Configure your experiment parameters</p>

              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-6 mb-8">
                {config.setup.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium mb-2">{field.label}</label>
                    {field.type === 'date' && (
                      <input
                        type="date"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-xl focus:outline-none focus:border-slate-500"
                      />
                    )}
                    {field.type === 'select' && (
                      <select
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-xl focus:outline-none focus:border-slate-500"
                      >
                        <option value="">{field.placeholder || 'Select...'}</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-xl focus:outline-none focus:border-slate-500"
                      />
                    )}
                    {field.type === 'textarea' && (
                      <textarea
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-xl focus:outline-none focus:border-slate-500 resize-none"
                      />
                    )}
                    {field.helperText && (
                      <p className="mt-1 text-sm text-slate-500">{field.helperText}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('intro')}
                  className="px-6 py-3 border border-[#1a2535] rounded-xl hover:bg-[#1a2535]/50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSetup}
                  className={`flex-1 py-3 bg-gradient-to-r ${gradientClass} rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* PREDICT STEP */}
          {step === 'predict' && (
            <motion.div
              key="predict"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-3xl font-bold mb-2">
                {config.predict.title || 'Record Your Prediction'}
              </h2>
              <p className="text-slate-400 mb-8">
                Your response will be encrypted and committed to the blockchain
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400">
                  {error}
                </div>
              )}

              <div className="mb-8">
                <label className="block text-sm font-medium mb-2">{config.predict.label}</label>
                <textarea
                  value={prediction}
                  onChange={(e) => {
                    setPrediction(e.target.value);
                    setError('');
                  }}
                  placeholder={config.predict.placeholder}
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-xl focus:outline-none focus:border-slate-500 resize-none"
                />
                {config.predict.helperText && (
                  <p className="mt-2 text-sm text-slate-500">{config.predict.helperText}</p>
                )}
              </div>

              <div className={`p-4 ${accentBgClass} border ${accentBorderClass} rounded-xl mb-8`}>
                <div className="flex items-center gap-3">
                  <Lock className={`w-5 h-5 ${accentTextClass}`} />
                  <div>
                    <p className="font-medium">Privacy Protected</p>
                    <p className="text-sm text-slate-400">
                      Your prediction is encrypted client-side before being stored
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('setup')}
                  className="px-6 py-3 border border-[#1a2535] rounded-xl hover:bg-[#1a2535]/50 transition-colors"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitPrediction}
                  disabled={isLoading}
                  className={`flex-1 py-3 bg-gradient-to-r ${gradientClass} rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Commitment...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Commit to Blockchain
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div
                className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-3xl font-bold mb-2">{config.success.heading}</h2>
              <p className="text-slate-400 mb-8">
                Your prediction has been encrypted and committed to the blockchain
              </p>

              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6 mb-8">
                <p className="text-sm text-slate-400 mb-2">Commitment ID</p>
                <p className="font-mono text-lg break-all">{commitmentId}</p>
              </div>

              <div className="space-y-3 mb-8">
                {config.success.achievements.map((achievement, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 justify-center text-slate-300"
                  >
                    <CheckCircle className={`w-5 h-5 ${accentTextClass}`} />
                    <span>{achievement}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 py-3 border border-[#1a2535] rounded-xl hover:bg-[#1a2535]/50 transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => {
                    setStep('intro');
                    setPrediction('');
                    setFieldValues({});
                    setCommitmentId('');
                  }}
                  className={`flex-1 py-3 bg-gradient-to-r ${gradientClass} rounded-xl font-semibold hover:opacity-90 transition-opacity`}
                >
                  New Experiment
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
