/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

/**
 * Remote Viewing Experiment - AI-Powered Target Selection
 *
 * Two modes:
 *   1. Guest Mode (no wallet) - Backend-only flow, no blockchain
 *   2. Verified Mode (Cardano wallet) - Full on-chain commit, AI scoring, PSY reward
 *
 * Flow (guest):    Intro → Meditation → Viewing → Results
 * Flow (verified): Intro → Commit (sign tx) → Meditation → Viewing → Results → Settle (sign tx, claim PSY)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import rvCardanoService from '@/services/rvCardanoService';
import type { RVStartResult, RVScoreResult, RVSettleResult } from '@/services/rvCardanoService';
import {
  Eye, Lock, Loader2, Target, CheckCircle, XCircle, ArrowRight,
  Wallet, ExternalLink, Coins, Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';

type Step = 'intro' | 'committing' | 'meditation' | 'viewing' | 'results' | 'settling';

interface ScoringResult {
  target: Record<string, unknown>;
  score: number;
  accuracy: string;
  hits: Array<{ element: string; confidence: string; explanation: string }>;
  misses: Array<{ element: string; importance: string; explanation: string }>;
  feedback: string;
  strengths?: string[];
  areasForImprovement?: string[];
  statistics?: {
    zScore: number;
    pValue: number;
    significance: string;
    observedMean: number;
    baselineMean: number;
    effectSize: number;
  };
  scoringMethod?: string;
  drandRound?: number;
  randomnessSource?: string;
}

export default function RemoteViewingPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);
  const connectCardano = useWalletStore((state) => state.connectCardano);

  const [step, setStep] = useState<Step>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [description, setDescription] = useState('');
  const [impressions, setImpressions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ScoringResult | null>(null);

  // Blockchain mode state
  const [blockchainMode, setBlockchainMode] = useState(false);
  const [cardanoSession, setCardanoSession] = useState<RVStartResult | null>(null);
  const [cardanoScore, setCardanoScore] = useState<RVScoreResult | null>(null);
  const [settleResult, setSettleResult] = useState<RVSettleResult | null>(null);
  const [walletDetected, setWalletDetected] = useState(false);

  // Detect Cardano wallet availability
  useEffect(() => {
    const checkWallet = () => {
      const cardano = (window as any).cardano;
      setWalletDetected(!!(cardano?.lace || cardano?.nami || cardano?.eternl || cardano?.flint));
    };
    checkWallet();
    // Re-check after a short delay (wallet extensions load async)
    const timer = setTimeout(checkWallet, 1000);
    return () => clearTimeout(timer);
  }, []);

  // If wallet is already connected, enable blockchain mode
  useEffect(() => {
    if (wallet?.address && wallet.isVerified) {
      setBlockchainMode(true);
    }
  }, [wallet]);

  const handleConnectWallet = async (walletName: string) => {
    setIsLoading(true);
    setError('');
    try {
      await connectCardano(walletName);
      setBlockchainMode(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // GUEST MODE: Backend-only flow (no blockchain)
  // ============================================================

  const handleStartGuestExperiment = async () => {
    setIsLoading(true);
    setError('');
    setStep('meditation');

    try {
      const result = await experimentService.generateRemoteViewingTarget({
        experimentType: 'remote-viewing',
        verified: wallet?.isVerified || false,
      });
      setCommitmentId(result.commitmentId);
      console.log('[RV] Target committed:', result.commitmentId);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Generate target error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setIsLoading(false);
      setStep('intro');
    }
  };

  // ============================================================
  // VERIFIED MODE: Full Cardano on-chain flow
  // ============================================================

  const handleStartVerifiedExperiment = async () => {
    setIsLoading(true);
    setError('');
    setStep('committing');

    try {
      // Connect to rvCardanoService (uses wallet already connected via store)
      await rvCardanoService.initialize();
      const walletName = wallet?.type || 'lace';
      await rvCardanoService.connectWallet(walletName);

      // Start experiment: generates target on backend, user signs commit tx
      const session = await rvCardanoService.startExperiment(2);
      setCardanoSession(session);
      setCommitmentId(session.sessionId);
      console.log('[RV Cardano] Commit tx:', session.commitTxHash);
      setIsLoading(false);
      setStep('meditation');
    } catch (err: unknown) {
      console.error('Cardano start error:', err);
      setError(err instanceof Error ? err.message : 'Failed to commit on-chain');
      setIsLoading(false);
      setStep('intro');
    }
  };

  const handleStartExperiment = async () => {
    if (blockchainMode) {
      await handleStartVerifiedExperiment();
    } else {
      await handleStartGuestExperiment();
    }
  };

  const handleBeginViewing = () => {
    setStep('viewing');
  };

  const handleSubmitViewing = async () => {
    if (!description.trim() && !impressions.trim()) {
      setError('Please provide your remote viewing impressions');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userResponse = {
        description: description.trim(),
        impressions: impressions.trim(),
        timestamp: new Date().toISOString(),
      };

      if (blockchainMode && cardanoSession) {
        // Verified: score via Cardano backend endpoint
        const scoreResult = await rvCardanoService.submitAndScore(
          cardanoSession.sessionId,
          { description: userResponse.description, impressions: userResponse.impressions }
        );
        setCardanoScore(scoreResult);

        // Also get the full scoring result from experiment service for display
        const scoringResult = await experimentService.revealRemoteViewing({
          commitmentId: cardanoSession.sessionId,
          userResponse,
          verified: true,
        });
        setResults(scoringResult);
      } else {
        // Guest: standard backend scoring
        const scoringResult = await experimentService.revealRemoteViewing({
          commitmentId,
          userResponse,
          verified: wallet?.isVerified || false,
        });
        setResults(scoringResult);
      }

      setStep('results');
    } catch (err: unknown) {
      console.error('Reveal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reveal and score experiment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettleAndClaim = async () => {
    if (!cardanoSession || !cardanoScore) return;

    setIsLoading(true);
    setError('');
    setStep('settling');

    try {
      const result = await rvCardanoService.settleAndClaim(
        cardanoSession.sessionId,
        cardanoScore.score,
        cardanoSession.nonce
      );
      setSettleResult(result);
      console.log('[RV Cardano] Settle tx:', result.txHash);
    } catch (err: unknown) {
      console.error('Settle error:', err);
      setError(err instanceof Error ? err.message : 'Failed to settle and claim reward');
      setStep('results');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RENDER: Intro
  // ============================================================

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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-400 flex items-center justify-center">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Remote Viewing</h1>
                <p className="text-slate-400">Perceive hidden targets with your mind</p>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Meditation Phase</strong>
                    <p className="text-slate-400 text-sm">
                      AI randomly selects a target and commits it{blockchainMode ? ' on-chain to Cardano' : ' to blockchain'} (hidden from you)
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Remote Viewing</strong>
                    <p className="text-slate-400 text-sm">
                      Record your psychic impressions about the hidden target
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>AI Scoring{blockchainMode ? ' & PSY Reward' : ''}</strong>
                    <p className="text-slate-400 text-sm">
                      Target is revealed and AI compares your impressions to the actual target
                      {blockchainMode && '. Earn PSY tokens based on your accuracy!'}
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Mode Toggle / Wallet Status */}
            {blockchainMode ? (
              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-300">Verified Mode (On-Chain)</p>
                  <p className="text-xs text-green-500">
                    Wallet: {wallet?.address?.slice(0, 12)}...{wallet?.address?.slice(-6)} | Stake: 2 ADA | Earn PSY tokens
                  </p>
                </div>
              </div>
            ) : walletDetected ? (
              <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Wallet className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">Cardano Wallet Detected</p>
                    <p className="text-xs text-amber-500">
                      Connect to enable Verified Mode and earn PSY tokens
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(window as any).cardano?.lace && (
                    <button
                      onClick={() => handleConnectWallet('lace')}
                      disabled={isLoading}
                      className="px-4 py-2 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm text-amber-300 hover:bg-amber-600/30 transition-colors disabled:opacity-50"
                    >
                      Connect Lace
                    </button>
                  )}
                  {(window as any).cardano?.nami && (
                    <button
                      onClick={() => handleConnectWallet('nami')}
                      disabled={isLoading}
                      className="px-4 py-2 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm text-amber-300 hover:bg-amber-600/30 transition-colors disabled:opacity-50"
                    >
                      Connect Nami
                    </button>
                  )}
                  {(window as any).cardano?.eternl && (
                    <button
                      onClick={() => handleConnectWallet('eternl')}
                      disabled={isLoading}
                      className="px-4 py-2 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm text-amber-300 hover:bg-amber-600/30 transition-colors disabled:opacity-50"
                    >
                      Connect Eternl
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-300">
                  <strong>Guest Mode:</strong> Results are stored server-side. Install a Cardano wallet (Lace, Nami) to enable on-chain verification and earn PSY tokens.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleStartExperiment}
              disabled={isLoading}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  {blockchainMode ? 'Begin Verified Experiment' : 'Begin Experiment'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Committing (blockchain mode only)
  // ============================================================

  if (step === 'committing') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-teal-400 flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Lock className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold mb-4">Committing On-Chain</h2>
            <p className="text-slate-400 mb-8">
              Your wallet will prompt you to sign the commitment transaction. This locks your 2 ADA stake and the target hash on Cardano.
            </p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-cyan-400 font-medium">Waiting for wallet signature...</span>
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-slate-400">Target generated by AI</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-slate-400">Target hash computed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-sm text-cyan-300">Building commit transaction...</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                  <span className="text-sm text-slate-500">Awaiting on-chain confirmation</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400 mb-4">
                {error}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Check your wallet extension for the signing prompt
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Meditation
  // ============================================================

  if (step === 'meditation') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-teal-400 flex items-center justify-center mx-auto mb-8 ${isLoading ? 'animate-pulse' : ''}`}>
              <Target className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold mb-4">Meditation Phase</h2>

            {isLoading ? (
              <>
                <p className="text-slate-400 mb-8">
                  AI is randomly selecting a target and committing it to blockchain...
                </p>

                <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    <span className="text-cyan-400 font-medium">Preparing target...</span>
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-slate-400">Generating random target</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-slate-400">Encrypting target data</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-slate-400">Committing to blockchain</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-400 mb-8">
                  The target has been securely committed{blockchainMode ? ' on-chain' : ' to the blockchain'}. Take as much time as you need to center yourself and prepare for the viewing session.
                </p>

                {/* On-chain commit confirmation (verified mode) */}
                {blockchainMode && cardanoSession && (
                  <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-4 mb-6 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-green-300">Committed On-Chain</span>
                    </div>
                    <div className="text-xs space-y-1 text-green-500">
                      <p>Session: {cardanoSession.sessionId.slice(0, 16)}...</p>
                      <p>
                        Tx:{' '}
                        <a
                          href={cardanoSession.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-green-300 inline-flex items-center gap-1"
                        >
                          {cardanoSession.commitTxHash.slice(0, 16)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                  <h3 className="font-semibold mb-4 text-cyan-400">Meditation Guidelines</h3>
                  <div className="space-y-3 text-left text-slate-300">
                    <p>Find a quiet, comfortable space</p>
                    <p>Take deep, slow breaths to relax your mind</p>
                    <p>Clear your thoughts of distractions</p>
                    <p>Focus on openness and receptivity</p>
                    <p>When ready, begin your remote viewing session</p>
                  </div>
                </div>

                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-8">
                  <p className="text-sm text-cyan-300">
                    Target Committed: The target is locked in and cannot be changed. Take your time - there&apos;s no rush.
                  </p>
                </div>

                <button
                  onClick={handleBeginViewing}
                  className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2"
                >
                  I&apos;m Ready - Begin Viewing
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Viewing
  // ============================================================

  if (step === 'viewing') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Remote Viewing Session</h2>
            <p className="text-slate-400 mb-8">
              Focus your mind and record any impressions, images, feelings, or thoughts that come to you.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Visual Impressions
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What do you see? Shapes, colors, structures, landscapes..."
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Other Sensory Impressions
                </label>
                <textarea
                  value={impressions}
                  onChange={(e) => setImpressions(e.target.value)}
                  placeholder="Feelings, textures, sounds, temperatures, emotional tones..."
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-cyan-400">Fair Scoring Guaranteed</strong>
                <p className="text-slate-400 mt-1">
                  The target was committed{blockchainMode ? ' on Cardano' : ' to blockchain'} before you started. Your response will be compared against the pre-committed target.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitViewing}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Revealing & Scoring...
                </>
              ) : (
                <>
                  Submit & Reveal Target
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Settling (blockchain mode - signing settle tx)
  // ============================================================

  if (step === 'settling') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            {settleResult ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-8">
                  <Coins className="w-12 h-12 text-white" />
                </div>

                <h2 className="text-3xl font-bold mb-4">PSY Reward Claimed!</h2>
                <p className="text-slate-400 mb-8">
                  Your experiment is settled on-chain and PSY tokens have been sent to your wallet.
                </p>

                <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-6 mb-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">PSY Earned</span>
                    <span className="text-2xl font-bold text-green-400">
                      {settleResult.psyReward.toString()} PSY
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Research Pool (5%)</span>
                    <span className="text-slate-300">
                      {(settleResult.psyReward * 5n / 100n).toString()} PSY
                    </span>
                  </div>
                  <hr className="border-green-500/20" />
                  <div className="text-sm">
                    <p className="text-slate-500 mb-1">Settlement Transaction</p>
                    <a
                      href={settleResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline hover:text-green-300 inline-flex items-center gap-1"
                    >
                      {settleResult.txHash.slice(0, 24)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-cyan-500 transition-colors"
                  >
                    View Dashboard
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 px-6 py-3 bg-cyan-600 rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center mx-auto mb-8 animate-pulse">
                  <Coins className="w-12 h-12 text-white" />
                </div>

                <h2 className="text-3xl font-bold mb-4">Settling On-Chain</h2>
                <p className="text-slate-400 mb-8">
                  Your wallet will prompt you to sign the settlement transaction. This claims your PSY reward.
                </p>

                <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                    <span className="text-amber-400 font-medium">Waiting for wallet signature...</span>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400 mb-4">
                    {error}
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Check your wallet extension for the signing prompt
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Results
  // ============================================================

  if (step === 'results' && results) {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-8">
              <div className={`w-24 h-24 rounded-full ${results.score >= 70 ? 'bg-gradient-to-br from-green-500 to-emerald-500' : results.score >= 40 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-gradient-to-br from-red-500 to-pink-500'} flex items-center justify-center mx-auto mb-6`}>
                <span className="text-3xl font-bold text-white">{results.score}</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Results</h2>
              <p className="text-xl text-slate-400 capitalize">Accuracy: {results.accuracy}</p>
            </div>

            {/* PSY Reward Preview (verified mode) */}
            {blockchainMode && cardanoScore && (
              <div className="bg-amber-900/20 border border-amber-500/50 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-amber-300">
                    <Coins className="w-5 h-5" />
                    PSY Reward
                  </h3>
                  <span className="text-2xl font-bold text-amber-400">
                    {cardanoScore.psyReward} PSY
                  </span>
                </div>
                <p className="text-sm text-amber-500 mb-4">
                  Based on your accuracy score of {cardanoScore.score}%. Sign the settlement transaction to claim your reward.
                </p>
                <button
                  onClick={handleSettleAndClaim}
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black rounded-lg font-semibold hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="w-5 h-5" />
                      Claim {cardanoScore.psyReward} PSY
                    </>
                  )}
                </button>
              </div>
            )}

            {/* On-chain verification badge (verified mode) */}
            {blockchainMode && cardanoSession && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-4 mb-8 flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-300">On-Chain Verified Experiment</p>
                  <p className="text-xs text-green-500">
                    Commit Tx:{' '}
                    <a
                      href={cardanoSession.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-green-300 inline-flex items-center gap-1"
                    >
                      {cardanoSession.commitTxHash.slice(0, 16)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Target Reveal */}
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-cyan-400" />
                The Target
              </h3>

              {/* Target Image */}
              {(results.target as Record<string, unknown>)?.imageUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-[#1a2535]">
                  <img
                    src={(results.target as Record<string, unknown>).imageUrl as string}
                    alt={(results.target as Record<string, unknown>).name as string || 'Target'}
                    className="w-full h-64 object-cover"
                  />
                  {(results.target as Record<string, unknown>).imagePhotographer && (
                    <p className="text-xs text-slate-500 px-3 py-1.5 bg-[#060a0f]/80">
                      Photo by {(results.target as Record<string, unknown>).imagePhotographer as string} via {(results.target as Record<string, unknown>).imageSource as string || 'Pexels'}
                    </p>
                  )}
                </div>
              )}

              {/* Target Details */}
              <div className="bg-[#060a0f]/50 rounded-lg p-6 space-y-4">
                {/* Name & Category */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="text-xl font-bold text-cyan-300">
                    {(results.target as Record<string, unknown>)?.name as string || 'Unknown Target'}
                  </h4>
                  {((results.target as Record<string, unknown>)?.category || (results.target as Record<string, unknown>)?.terrain || (results.target as Record<string, unknown>)?.country) && (
                    <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">
                      {((results.target as Record<string, unknown>)?.category || (results.target as Record<string, unknown>)?.terrain || (results.target as Record<string, unknown>)?.country) as string}
                    </span>
                  )}
                </div>

                {/* Description */}
                {(results.target as Record<string, unknown>)?.description && (
                  <p className="text-slate-300 leading-relaxed">
                    {(results.target as Record<string, unknown>).description as string}
                  </p>
                )}

                {/* Features */}
                {(results.target as Record<string, unknown>)?.features && Array.isArray((results.target as Record<string, unknown>).features) && (
                  <div className="flex flex-wrap gap-2">
                    {((results.target as Record<string, unknown>).features as string[]).map((feature, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}

                {/* Colors */}
                {(results.target as Record<string, unknown>)?.colors && Array.isArray((results.target as Record<string, unknown>).colors) && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Colors:</span>
                    {((results.target as Record<string, unknown>).colors as string[]).map((color, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded">
                        {color}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hits */}
            {results.hits && results.hits.length > 0 && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-6 h-6" />
                  Hits ({results.hits.length})
                </h3>
                <div className="space-y-4">
                  {results.hits.map((hit, idx) => (
                    <div key={idx} className="bg-[#060a0f]/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-green-300">{hit.element}</span>
                        <span className="text-xs px-2 py-1 bg-green-500/20 rounded text-green-400">
                          {hit.confidence}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{hit.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Misses */}
            {results.misses && results.misses.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-400">
                  <XCircle className="w-6 h-6" />
                  Misses ({results.misses.length})
                </h3>
                <div className="space-y-4">
                  {results.misses.map((miss, idx) => (
                    <div key={idx} className="bg-[#060a0f]/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-red-300">{miss.element}</span>
                        <span className="text-xs px-2 py-1 bg-red-500/20 rounded text-red-400">
                          {miss.importance}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{miss.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-4">AI Feedback</h3>
              <p className="text-slate-300 leading-relaxed">{results.feedback}</p>
            </div>

            {/* Statistics */}
            {results.statistics && (
              <div className="bg-purple-900/20 border border-purple-500/50 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-4">Statistical Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-slate-400">Z-Score</span>
                    <p className="font-bold text-xl">{results.statistics.zScore}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">P-Value</span>
                    <p className="font-bold text-xl">{results.statistics.pValue < 0.001 ? '< 0.001' : results.statistics.pValue.toFixed(4)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Effect Size</span>
                    <p className="font-bold text-xl">{results.statistics.effectSize}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Significance</span>
                    <p className={`font-bold text-xl ${
                      results.statistics.significance.includes('significant') && !results.statistics.significance.includes('not') ? 'text-green-400' : 'text-slate-400'
                    }`}>
                      {results.statistics.significance.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Scoring: {results.scoringMethod === 'embedding' ? 'Semantic Embedding' : 'LLM-based'}
                </p>
              </div>
            )}

            {/* drand Verification Badge */}
            {results.drandRound && (
              <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-4 mb-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-300">Verifiable Randomness</p>
                  <p className="text-xs text-green-500">drand round #{results.drandRound} | {results.randomnessSource || 'drand_quicknet'}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-cyan-500 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-cyan-600 rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
