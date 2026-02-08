'use client';

/**
 * Dashboard - AI-Enhanced Experiment History & Reveal Interface
 *
 * NEW FEATURES:
 * - Progressive loading states during AI reveal
 * - Detailed results modal with evidence
 * - Two-step reveal process (AI scoring → Blockchain submission)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import apiService from '@/services/apiService';
import ipfsService from '@/services/ipfsService';
import encryptionService from '@/services/encryptionService';
import walletService from '@/services/walletService';
import ScoreResultsModal from '@/components/modals/ScoreResultsModal';
import {
  Eye, Calendar,
  Loader2, Award, Clock, Brain, TrendingUp,
  Ghost, Compass, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Experiment {
  id: string;
  type: string;
  status: 'committed' | 'revealed' | 'verified';
  revealed?: boolean;
  metadata: {
    title: string;
    description: string;
    targetDate?: string;
    [key: string]: string | number | boolean | undefined;
  };
  commitTimestamp: Date;
  revealTimestamp?: Date;
  aiScore?: number;
  aiExplanation?: string;
  cid?: string;
}

interface RevealProgress {
  stage: 'starting' | 'retrieval' | 'scoring' | 'finalizing' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface AIResults {
  score: number;
  explanation: string;
  evidence: Record<string, unknown>;
}

export default function DashboardPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  // State
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [revealProgress, setRevealProgress] = useState<RevealProgress | null>(null);
  const [error, setError] = useState('');

  // Results modal state
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [currentResults, setCurrentResults] = useState<AIResults | null>(null);
  const [isSubmittingToBlockchain, setIsSubmittingToBlockchain] = useState(false);

  const loadExperiments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await experimentService.getExperiments(wallet!.address);
      setExperiments((data as Experiment[]) || []);
    } catch (err) {
      console.error('Load experiments error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
    loadExperiments();
  }, [wallet, router, loadExperiments]);

  /**
   * NEW: AI-Enhanced Reveal Flow with Progressive Loading
   */
  const handleAIReveal = async (experiment: Experiment) => {
    try {
      setRevealingId(experiment.id);
      setError('');
      setRevealProgress({ stage: 'starting', progress: 0, message: 'Initializing...' });

      // Step 1: Decrypt prediction from local storage and IPFS
      const nonce = localStorage.getItem(`exp_nonce_${experiment.id}`);
      const encryptionKey = localStorage.getItem(`exp_key_${experiment.id}`);

      if (!nonce || !encryptionKey) {
        throw new Error('Cannot decrypt prediction - missing keys');
      }

      // Fetch from IPFS
      if (!experiment.cid) {
        throw new Error('No IPFS CID found for this experiment');
      }

      setRevealProgress({ stage: 'starting', progress: 10, message: 'Retrieving encrypted data from IPFS...' });

      const ipfsData = await ipfsService.retrieve(experiment.cid) as { encryptedData: string };
      const decryptedData = await encryptionService.decrypt(
        ipfsData.encryptedData,
        encryptionKey
      );
      const { prediction } = JSON.parse(decryptedData);

      // Step 2: Call AI reveal endpoint
      setRevealProgress({ stage: 'retrieval', progress: 30, message: 'Gathering real-world evidence...' });

      const aiResults = await apiService.revealWithAI({
        commitmentId: experiment.id,
        prediction,
        metadata: experiment.metadata as any
      });

      // Simulate progress updates (in real implementation, we'd use SSE or polling)
      setRevealProgress({ stage: 'scoring', progress: 70, message: 'Analyzing prediction accuracy...' });
      await new Promise(resolve => setTimeout(resolve, 1000));

      setRevealProgress({ stage: 'finalizing', progress: 95, message: 'Preparing results...' });
      await new Promise(resolve => setTimeout(resolve, 500));

      setRevealProgress({ stage: 'complete', progress: 100, message: 'Analysis complete!' });

      // Step 3: Show results modal
      setCurrentResults({
        experimentId: experiment.id,
        ...aiResults,
        experimentType: experiment.type as any,
        prediction
      } as any);
      setShowResultsModal(true);

    } catch (err) {
      console.error('AI reveal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze prediction');
      setRevealProgress({ stage: 'error', progress: 0, message: 'Failed to analyze prediction' });
    } finally {
      setTimeout(() => {
        setRevealingId(null);
        setRevealProgress(null);
      }, 2000);
    }
  };

  /**
   * Submit approved score to blockchain
   * Uses Lace wallet for direct submission when available, otherwise falls back to backend
   */
  const handleSubmitToBlockchain = async () => {
    if (!currentResults) return;

    try {
      setIsSubmittingToBlockchain(true);

      // Check if using Lace wallet for direct transaction submission
      if (wallet?.type === 'lace') {
        console.log('[Dashboard] Submitting via Lace wallet...');

        // Prepare transaction data for Cardano blockchain
        const transactionData = {
          type: 'score_commitment',
          commitmentId: (currentResults as any).experimentId,
          score: currentResults.score,
          scoreData: JSON.stringify(currentResults),
          timestamp: Date.now(),
        };

        // Submit directly via Lace wallet
        const txResult = await walletService.submitCardanoTransaction(transactionData);

        if (!txResult.success) {
          throw new Error(txResult.error || 'Transaction submission failed');
        }

        console.log('[Dashboard] Transaction submitted:', txResult.txHash);

        // Update backend with transaction hash
        await apiService.submitScoreToBlockchain({
          commitmentId: (currentResults as any).experimentId,
          score: currentResults.score,
          scoreData: currentResults,
          // Include the transaction hash from Lace
          txHash: txResult.txHash,
        });
      } else {
        // Guest mode or other wallet types: use backend submission
        console.log('[Dashboard] Submitting via backend...');
        const result = await apiService.submitScoreToBlockchain({
          commitmentId: (currentResults as any).experimentId,
          score: currentResults.score,
          scoreData: currentResults
        });

        console.log('Blockchain submission result:', result);
      }

      // Clean up local storage
      localStorage.removeItem(`exp_key_${(currentResults as any).experimentId}`);
      localStorage.removeItem(`exp_nonce_${(currentResults as any).experimentId}`);

      // Reload experiments
      await loadExperiments();

      // Close modal
      setShowResultsModal(false);
      setCurrentResults(null);

    } catch (err) {
      console.error('Blockchain submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit to blockchain');
    } finally {
      setIsSubmittingToBlockchain(false);
    }
  };

  const getExperimentIcon = (_type?: string) => {
    return Eye;
  };

  const getStatusBadge = (revealed: boolean) => {
    if (revealed) {
      return <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-emerald-500/30 rounded-full text-xs font-semibold">Revealed</span>;
    }
    return <span className="px-3 py-1 bg-blue-900/30 text-violet-400 border border-violet-500/30 rounded-full text-xs font-semibold">Committed</span>;
  };

  const isAfterTargetDate = (exp: Experiment) => {
    return experimentService.isAfterTargetDate(exp);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />
      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
          <p className="text-slate-400">AI-powered prediction analysis with blockchain verification</p>
        </div>

        {/* Wallet Info - Show connected wallet address */}
        {wallet && (
          <div className="mb-8 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="text-lg font-semibold">Wallet Connected</h3>
            </div>
            <p className="text-sm text-slate-400 font-mono break-all">{wallet.address}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-cyan-900/20 to-teal-900/20 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-cyan-300" />
              <h3 className="text-lg font-semibold">Total Experiments</h3>
            </div>
            <p className="text-3xl font-bold">{experiments.length}</p>
          </div>

          <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 border border-violet-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-violet-400" />
              <h3 className="text-lg font-semibold">Pending Analysis</h3>
            </div>
            <p className="text-3xl font-bold">
              {experiments.filter(e => !e.revealed).length}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold">Analyzed</h3>
            </div>
            <p className="text-3xl font-bold">
              {experiments.filter(e => e.revealed).length}
            </p>
          </div>
        </div>

        {/* Quick Launch - New Experiments */}
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-4 text-slate-300">Quick Launch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/experiments/telepathy-ghost')}
              className="bg-[#0f1520]/80 border border-purple-500/30 rounded-xl p-5 hover:border-purple-400/50 hover:bg-purple-900/10 transition-all text-left group"
            >
              <Ghost className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-purple-300">Ghost Signal</h3>
              <p className="text-xs text-slate-500 mt-1">2-player async telepathy with AI images</p>
            </button>

            <button
              onClick={() => router.push('/experiments/precog-explorer')}
              className="bg-[#0f1520]/80 border border-teal-500/30 rounded-xl p-5 hover:border-teal-400/50 hover:bg-teal-900/10 transition-all text-left group"
            >
              <Compass className="w-6 h-6 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-teal-300">Pre-Cog Explorer</h3>
              <p className="text-xs text-slate-500 mt-1">Choose a sector before AI generates it</p>
            </button>

            <button
              onClick={() => router.push('/experiments/pk-influence')}
              className="bg-[#0f1520]/80 border border-yellow-500/30 rounded-xl p-5 hover:border-yellow-400/50 hover:bg-yellow-900/10 transition-all text-left group"
            >
              <Zap className="w-6 h-6 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-yellow-300">PK Influence</h3>
              <p className="text-xs text-slate-500 mt-1">Collective intention on AI image output</p>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/15 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Experiments List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-6">Your Experiments</h2>

          {experiments.length === 0 ? (
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-12 text-center">
              <Eye className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No experiments yet</h3>
              <p className="text-slate-400 mb-6">Start your first psi experiment to begin tracking your abilities</p>
              <button
                onClick={() => router.push('/experiments')}
                className="px-6 py-3 bg-cyan-600 rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
              >
                Browse Experiments
              </button>
            </div>
          ) : (
            experiments.map((exp) => {
              const Icon = getExperimentIcon(exp.type);
              const canReveal = experimentService.canReveal({ ...exp, revealed: exp.revealed ?? false });
              const afterTarget = isAfterTargetDate(exp);
              const isCurrentlyRevealing = revealingId === exp.id;

              return (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-cyan-300" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{exp.metadata?.title || 'Precognition Experiment'}</h3>
                          {getStatusBadge(exp.revealed || false)}
                        </div>

                        <p className="text-slate-400 text-sm mb-3">{exp.metadata?.description || 'Prediction commitment'}</p>

                        <div className="flex items-center gap-6 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Committed: {new Date(exp.commitTimestamp).toLocaleDateString()}
                            </span>
                          </div>

                          {exp.metadata?.targetDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Target: {new Date(exp.metadata.targetDate).toLocaleDateString()}
                                {afterTarget && <span className="ml-1 text-green-400">✓</span>}
                              </span>
                            </div>
                          )}

                          {exp.aiScore !== undefined && (
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4" />
                                <span className="text-cyan-300 font-semibold">
                                  Score: {exp.aiScore}%
                                </span>
                              </div>
                              {(exp as any).statistics && (exp as any).statistics.deviation > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                  {(exp as any).statistics.significanceLevel === 'highly_significant' && (
                                    <span className="px-2 py-0.5 bg-green-900/30 text-green-400 border border-emerald-500/30 rounded">
                                      Highly Significant
                                    </span>
                                  )}
                                  {(exp as any).statistics.significanceLevel === 'very_significant' && (
                                    <span className="px-2 py-0.5 bg-green-900/30 text-green-400 border border-emerald-500/30 rounded">
                                      Very Significant
                                    </span>
                                  )}
                                  {(exp as any).statistics.significanceLevel === 'significant' && (
                                    <span className="px-2 py-0.5 bg-blue-900/30 text-violet-400 border border-violet-500/30 rounded">
                                      Significant
                                    </span>
                                  )}
                                  {(exp as any).statistics.significanceLevel === 'marginally_significant' && (
                                    <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 border border-yellow-500/50 rounded">
                                      Marginal
                                    </span>
                                  )}
                                  <span className="text-slate-400">
                                    p={(exp as any).statistics.pValue?.toFixed(3)}
                                  </span>
                                </div>
                              )}
                              {(exp as any).statistics && (exp as any).statistics.deviation <= 0 && (
                                <span className="text-xs text-slate-500">
                                  Below baseline
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {exp.aiExplanation && (
                          <div className="mt-4 p-4 bg-cyan-900/15 border border-cyan-500/20 rounded-lg">
                            <p className="text-sm text-slate-300">{exp.aiExplanation}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="ml-4">
                      {!exp.revealed && canReveal && (
                        <div>
                          <button
                            onClick={() => handleAIReveal(exp)}
                            disabled={isCurrentlyRevealing}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                              afterTarget
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30'
                                : 'bg-cyan-600 hover:bg-cyan-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isCurrentlyRevealing ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {revealProgress?.message || 'Processing...'}
                              </>
                            ) : (
                              <>
                                <Brain className="w-5 h-5" />
                                AI Analysis
                              </>
                            )}
                          </button>
                          {!afterTarget && !isCurrentlyRevealing && (
                            <p className="text-xs text-slate-500 mt-2 text-right">
                              (Before target date)
                            </p>
                          )}
                          {isCurrentlyRevealing && revealProgress && (
                            <div className="mt-2">
                              <div className="h-1 bg-[#1a2535] rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${revealProgress.progress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                              <p className="text-xs text-slate-400 mt-1 text-right">
                                {revealProgress.progress}%
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {exp.revealed && (
                        <div className="px-6 py-3 bg-green-900/30 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                          <Award className="w-5 h-5 text-green-400" />
                          <span className="font-semibold text-green-400">Analyzed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Results Modal */}
      {showResultsModal && currentResults && (
        <ScoreResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setCurrentResults(null);
          }}
          onSubmitToBlockchain={handleSubmitToBlockchain}
          results={currentResults as any}
          isSubmitting={isSubmittingToBlockchain}
        />
      )}
    </div>
  );
}
