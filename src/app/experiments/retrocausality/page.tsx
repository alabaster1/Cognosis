'use client';

/**
 * Retrocausality Experiment - Influence past events
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Clock, Lock, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Step = 'intro' | 'setup' | 'predict' | 'success';

export default function RetrocausalityPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [step, setStep] = useState<Step>('intro');
  const [referenceDate, setReferenceDate] = useState('');
  const [experimentType, setExperimentType] = useState('');
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
    if (!referenceDate || !experimentType) {
      setError('Please select a reference date and experiment type');
      return;
    }
    setError('');
    setStep('predict');
  };

  const handleSubmitPrediction = async () => {
    if (!prediction.trim()) {
      setError('Please describe the past event you are attempting to influence');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await experimentService.createCommitment({
        experimentType: 'retrocausality',
        prediction: prediction,
        metadata: {
          type: 'retrocausality',
          title: `Retrocausality: ${experimentType}`,
          description: `Reference date: ${referenceDate}`,
          targetDate: referenceDate,
          category: 'retrocausality',
          tags: ['retrocausality', experimentType].filter(Boolean),
        },
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-500 to-gray-500 flex items-center justify-center">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Retrocausality</h1>
                <p className="text-slate-400">Influence past events from the present</p>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Choose a Past Event</strong>
                    <p className="text-slate-400 text-sm">
                      Select an experiment type (past event influence, retroactive intention, backwards causation) and reference date
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Describe Your Influence</strong>
                    <p className="text-slate-400 text-sm">
                      Describe the past event you are attempting to influence
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>Commit to Blockchain</strong>
                    <p className="text-slate-400 text-sm">
                      Your intention is encrypted and timestamped immutably
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center font-bold">
                    4
                  </span>
                  <div>
                    <strong>Check Results</strong>
                    <p className="text-slate-400 text-sm">
                      Review the past event and compare with your retroactive intention
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <button
              onClick={handleStartExperiment}
              className="w-full px-8 py-4 bg-gradient-to-r from-slate-600 to-gray-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-slate-500/50 transition-all flex items-center justify-center gap-2"
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
                  Experiment Type
                </label>
                <select
                  value={experimentType}
                  onChange={(e) => setExperimentType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-slate-500 focus:outline-none"
                >
                  <option value="">Select experiment type...</option>
                  <option value="past event influence">Past Event Influence</option>
                  <option value="retroactive intention">Retroactive Intention</option>
                  <option value="backwards causation">Backwards Causation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Reference Date
                </label>
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-slate-500 focus:outline-none"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Choose the date of the past event you wish to influence
                </p>
              </div>

              <button
                onClick={handleSetup}
                className="w-full px-6 py-3 bg-slate-600 rounded-lg font-semibold hover:bg-slate-700 transition-colors"
              >
                Continue to Description
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
            <h2 className="text-3xl font-bold mb-4">Describe Your Influence</h2>
            <p className="text-slate-400 mb-8">
              Describe the past event you are attempting to influence from {new Date(referenceDate).toLocaleDateString()}
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
                placeholder="Describe the past event you're attempting to influence..."
                rows={12}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-slate-500 focus:outline-none resize-none"
              />
              <p className="text-sm text-slate-400 mt-2">
                Be specific. Include details about what happened, your intention, and how you aim to influence it retroactively.
              </p>
            </div>

            <div className="bg-slate-900/20 border border-slate-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-slate-400">Privacy Protected</strong>
                <p className="text-slate-400 mt-1">
                  Your intention will be encrypted and stored on IPFS. Only the commitment hash goes
                  on-chain, ensuring complete privacy until you choose to reveal.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitPrediction}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-slate-600 to-gray-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-slate-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Commitment...
                </>
              ) : (
                <>
                  Commit Intention
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
              Your retrocausality intention has been encrypted and committed to the blockchain.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535]">
                {commitmentId}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Encrypted & Stored</strong>
                  <p className="text-sm text-slate-400">
                    Your intention is encrypted on IPFS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Blockchain Verified</strong>
                  <p className="text-sm text-slate-400">
                    Commitment hash timestamped on Cardano
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center flex-shrink-0">
                  📅
                </div>
                <div>
                  <strong>Reference Date</strong>
                  <p className="text-sm text-slate-400">
                    {new Date(referenceDate).toLocaleDateString()} - You can review results anytime from Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/20 border border-slate-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-slate-300">
                💡 <strong>Tip:</strong> Retrocausality experiments explore the possibility of present actions
                influencing past events. Visit your Dashboard anytime to review and reveal your experiments.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-slate-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => router.push('/experiments')}
                className="flex-1 px-6 py-3 bg-slate-600 rounded-lg font-semibold hover:bg-slate-700 transition-colors"
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
