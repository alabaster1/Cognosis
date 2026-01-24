'use client';

/**
 * Dream Journal Experiment - Record and track your dreams
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Moon, Lock, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Step = 'intro' | 'setup' | 'predict' | 'success';

export default function DreamJournalPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [step, setStep] = useState<Step>('intro');
  const [verificationDate, setVerificationDate] = useState('');
  const [dreamType, setDreamType] = useState('');
  const [prediction, setPrediction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commitmentId, setCommitmentId] = useState('');
  const [error, setError] = useState('');

  const handleStartExperiment = () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
    setStep('setup');
  };

  const handleSetup = () => {
    if (!verificationDate || !dreamType) {
      setError('Please select a verification date and dream type');
      return;
    }
    setError('');
    setStep('predict');
  };

  const handleSubmitPrediction = async () => {
    if (!prediction.trim()) {
      setError('Please describe your dream');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await experimentService.createCommitment({
        experimentType: 'dream-journal',
        prediction: prediction,
        metadata: {
          type: 'dream-journal',
          title: `Dream Journal: ${dreamType}`,
          description: `Verification date: ${verificationDate}`,
          targetDate: verificationDate,
          category: 'dream-journal',
          tags: ['dream-journal', dreamType].filter(Boolean),
        },
      });

      setCommitmentId(result.commitmentId);
      setStep('success');
    } catch (err) {
      console.error('Commit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create commitment');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Moon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Dream Journal</h1>
                <p className="text-slate-400">Record and track your dreams over time</p>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Classify Your Dream</strong>
                    <p className="text-slate-400 text-sm">
                      Select dream type (precognitive, lucid, recurring, or symbolic) and set a verification date
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Record Your Dream</strong>
                    <p className="text-slate-400 text-sm">
                      Write down your dream in detail while it&apos;s fresh in your memory
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>Commit to Blockchain</strong>
                    <p className="text-slate-400 text-sm">
                      Your dream entry is encrypted and timestamped immutably
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    4
                  </span>
                  <div>
                    <strong>Track Patterns</strong>
                    <p className="text-slate-400 text-sm">
                      Review your dreams over time to identify patterns and verify precognitive elements
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <button
              onClick={handleStartExperiment}
              className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2"
            >
              Start Experiment
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Setup Your Experiment</h2>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Dream Type
                </label>
                <select
                  value={dreamType}
                  onChange={(e) => setDreamType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select dream type...</option>
                  <option value="precognitive">Precognitive Dream</option>
                  <option value="lucid">Lucid Dream</option>
                  <option value="recurring">Recurring Dream</option>
                  <option value="symbolic">Symbolic Dream</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Verification Date
                </label>
                <input
                  type="date"
                  value={verificationDate}
                  onChange={(e) => setVerificationDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Choose when you want to review or verify this dream entry
                </p>
              </div>

              <button
                onClick={handleSetup}
                className="w-full px-6 py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Continue to Dream Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'predict') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Describe Your Dream</h2>
            <p className="text-slate-400 mb-8">
              Record your dream for verification on {new Date(verificationDate).toLocaleDateString()}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="mb-6">
              <textarea
                value={prediction}
                onChange={(e) => setPrediction(e.target.value)}
                placeholder="Describe your dream in detail..."
                rows={12}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
              />
              <p className="text-sm text-slate-400 mt-2">
                Be specific. Include details about people, places, emotions, symbols, and any significant events.
              </p>
            </div>

            <div className="bg-indigo-900/20 border border-indigo-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-indigo-400">Privacy Protected</strong>
                <p className="text-slate-400 mt-1">
                  Your dream entry will be encrypted and stored on IPFS. Only the commitment hash goes
                  on-chain, ensuring complete privacy until you choose to reveal.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitPrediction}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Commitment...
                </>
              ) : (
                <>
                  Commit Dream Entry
                  <Lock className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Commitment Created!</h2>
            <p className="text-slate-400 mb-8">
              Your dream journal entry has been encrypted and committed to the blockchain.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535]">
                {commitmentId}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Encrypted & Stored</strong>
                  <p className="text-sm text-slate-400">
                    Your dream entry is encrypted on IPFS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Blockchain Verified</strong>
                  <p className="text-sm text-slate-400">
                    Commitment hash timestamped on Midnight
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  📅
                </div>
                <div>
                  <strong>Verification Date</strong>
                  <p className="text-sm text-slate-400">
                    {new Date(verificationDate).toLocaleDateString()} - You can review anytime from Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-900/20 border border-indigo-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-indigo-300">
                💡 <strong>Tip:</strong> Keep a regular dream journal to identify patterns over time.
                Visit your Dashboard anytime to review and reveal your dream entries.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-indigo-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => router.push('/experiments')}
                className="flex-1 px-6 py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                New Experiment
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
