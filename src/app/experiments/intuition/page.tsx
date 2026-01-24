'use client';

/**
 * Intuition Testing Experiment - Test your intuitive decision-making
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Lightbulb, Lock, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Step = 'intro' | 'setup' | 'predict' | 'success';

export default function IntuitionPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [step, setStep] = useState<Step>('intro');
  const [decisionDate, setDecisionDate] = useState('');
  const [decisionType, setDecisionType] = useState('');
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
    if (!decisionDate || !decisionType) {
      setError('Please select a decision date and type');
      return;
    }
    setError('');
    setStep('predict');
  };

  const handleSubmitPrediction = async () => {
    if (!prediction.trim()) {
      setError('Please record your intuitive impression');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await experimentService.createCommitment({
        experimentType: 'intuition',
        prediction: prediction,
        metadata: {
          type: 'intuition',
          title: `Intuition Testing: ${decisionType}`,
          description: `Decision date: ${decisionDate}`,
          targetDate: decisionDate,
          category: 'intuition',
          tags: ['intuition', decisionType].filter(Boolean),
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Intuition Testing</h1>
                <p className="text-slate-400">Test your intuitive decision-making abilities</p>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Choose Your Decision</strong>
                    <p className="text-slate-400 text-sm">
                      Select a decision type (business, personal, stock pick, yes/no) and when you&apos;ll make it
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Record Your Intuitive Impression</strong>
                    <p className="text-slate-400 text-sm">
                      Without overthinking, write down your gut feeling about the decision
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>Commit to Blockchain</strong>
                    <p className="text-slate-400 text-sm">
                      Your intuitive impression is encrypted and timestamped immutably
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
                    4
                  </span>
                  <div>
                    <strong>Compare Results</strong>
                    <p className="text-slate-400 text-sm">
                      After the decision date, reveal and see how accurate your intuition was
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <button
              onClick={handleStartExperiment}
              className="w-full px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-yellow-500/50 transition-all flex items-center justify-center gap-2"
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
                  Decision Type
                </label>
                <select
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-yellow-500 focus:outline-none"
                >
                  <option value="">Select decision type...</option>
                  <option value="business decision">Business Decision</option>
                  <option value="personal choice">Personal Choice</option>
                  <option value="stock pick">Stock Pick</option>
                  <option value="yes/no question">Yes/No Question</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Decision Date
                </label>
                <input
                  type="date"
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-yellow-500 focus:outline-none"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Choose when you&apos;ll make this decision or can verify the outcome
                </p>
              </div>

              <button
                onClick={handleSetup}
                className="w-full px-6 py-3 bg-yellow-600 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
              >
                Continue to Prediction
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
            <h2 className="text-3xl font-bold mb-4">Record Your Intuitive Impression</h2>
            <p className="text-slate-400 mb-8">
              What does your intuition tell you about this decision? Don&apos;t overthink it.
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
                placeholder="Record your intuitive impression..."
                rows={12}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-yellow-500 focus:outline-none resize-none"
              />
              <p className="text-sm text-slate-400 mt-2">
                Trust your first instinct. Include what you feel, sense, or believe will happen.
              </p>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-yellow-400">Privacy Protected</strong>
                <p className="text-slate-400 mt-1">
                  Your intuitive impression will be encrypted and stored on IPFS. Only the commitment hash goes
                  on-chain, ensuring complete privacy until you choose to reveal.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitPrediction}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Commitment...
                </>
              ) : (
                <>
                  Commit Intuition
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
              Your intuitive impression has been encrypted and committed to the blockchain.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535]">
                {commitmentId}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Encrypted & Stored</strong>
                  <p className="text-sm text-slate-400">
                    Your intuitive impression is encrypted on IPFS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
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
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  📅
                </div>
                <div>
                  <strong>Decision Date</strong>
                  <p className="text-sm text-slate-400">
                    {new Date(decisionDate).toLocaleDateString()} - You can check accuracy anytime from Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-yellow-300">
                💡 <strong>Tip:</strong> For best results, wait until after the decision date before checking accuracy.
                Visit your Dashboard anytime to review and reveal your experiments.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-yellow-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => router.push('/experiments')}
                className="flex-1 px-6 py-3 bg-yellow-600 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
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
