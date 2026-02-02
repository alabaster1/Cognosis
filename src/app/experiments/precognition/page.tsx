'use client';

/**
 * Precognition Experiment - Predict future events
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Zap, Lock, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

type Step = 'intro' | 'setup' | 'predict' | 'success';

export default function PrecognitionPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [step, setStep] = useState<Step>('intro');
  const [targetDate, setTargetDate] = useState('');
  const [eventType, setEventType] = useState('');
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
    if (!targetDate || !eventType) {
      setError('Please select a target date and event type');
      return;
    }
    setError('');
    setStep('predict');
  };

  const handleSubmitPrediction = async () => {
    if (!prediction.trim()) {
      setError('Please enter your prediction');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await experimentService.createCommitment({
        experimentType: 'precognition',
        prediction: prediction,
        metadata: {
          type: 'precognition',
          title: `Precognition: ${eventType}`,
          description: `Target date: ${targetDate}`,
          targetDate,
          category: 'precognition',
          tags: ['precognition', eventType].filter(Boolean),
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Precognition</h1>
                <p className="text-slate-400">Predict future events before they happen</p>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Choose an Event</strong>
                    <p className="text-slate-400 text-sm">
                      Select a future date and type of event to predict (news, sports, weather, etc.)
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Make Your Prediction</strong>
                    <p className="text-slate-400 text-sm">
                      Write down what you predict will happen on that date
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>Commit to Blockchain</strong>
                    <p className="text-slate-400 text-sm">
                      Your prediction is encrypted and timestamped immutably
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    4
                  </span>
                  <div>
                    <strong>Check Accuracy</strong>
                    <p className="text-slate-400 text-sm">
                      After the event occurs, reveal and compare your prediction with reality
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <button
              onClick={handleStartExperiment}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
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
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select event type...</option>
                  <option value="news">World News Event</option>
                  <option value="sports">Sports Outcome</option>
                  <option value="weather">Weather Event</option>
                  <option value="market">Financial Market</option>
                  <option value="personal">Personal Event</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Choose when this event will occur or can be verified
                </p>
              </div>

              <button
                onClick={handleSetup}
                className="w-full px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
            <h2 className="text-3xl font-bold mb-4">Make Your Prediction</h2>
            <p className="text-slate-400 mb-8">
              Predict what will happen on {new Date(targetDate).toLocaleDateString()}
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
                placeholder="Describe your prediction in detail..."
                rows={12}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
              <p className="text-sm text-slate-400 mt-2">
                Be specific. Include details about what, when, where, who, and how the event will unfold.
              </p>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-blue-400">Privacy Protected</strong>
                <p className="text-slate-400 mt-1">
                  Your prediction will be encrypted and stored on IPFS. Only the commitment hash goes
                  on-chain, ensuring complete privacy until you choose to reveal.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitPrediction}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Commitment...
                </>
              ) : (
                <>
                  Commit Prediction
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
              Your precognition prediction has been encrypted and committed to the blockchain.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535]">
                {commitmentId}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <strong>Encrypted & Stored</strong>
                  <p className="text-sm text-slate-400">
                    Your prediction is encrypted on IPFS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
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
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  📅
                </div>
                <div>
                  <strong>Target Date</strong>
                  <p className="text-sm text-slate-400">
                    {new Date(targetDate).toLocaleDateString()} - You can check accuracy anytime from Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-300">
                💡 <strong>Tip:</strong> For best results, wait until after the target date before checking accuracy.
                Visit your Dashboard anytime to review and reveal your experiments.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-blue-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => router.push('/experiments')}
                className="flex-1 px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
