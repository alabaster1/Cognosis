'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import { Coins, TrendingUp, Gift, ArrowUpRight } from 'lucide-react';
import { useWalletStore } from '@/store/useWalletStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CardanoSession {
  id: string;
  status: string;
  experimentType: string | null;
  score: number | null;
  rewardTxHash: string | null;
  psyRewardAmount: string | null;
  createdAt: string;
}

interface CardanoConfigResponse {
  success: boolean;
  config?: {
    network?: string;
    psyToken?: {
      policyId?: string;
      assetName?: string;
      unit?: string;
    };
  };
}

export default function TokensPage() {
  const { wallet } = useWalletStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CardanoSession[]>([]);
  const [tokenMeta, setTokenMeta] = useState<{
    network: string;
    policyId: string;
    assetName: string;
    unit: string;
  } | null>(null);

  useEffect(() => {
    async function loadSessions() {
      if (!wallet?.isVerified) {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Wallet is connected but auth token is missing. Reconnect wallet to refresh session.');
        setIsLoading(false);
        return;
      }

      try {
        const [sessionsRes, configRes] = await Promise.all([
          fetch(`${API_URL}/api/cardano/sessions`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_URL}/api/cardano/config`),
        ]);
        const data = await sessionsRes.json();
        const configData = (await configRes.json()) as CardanoConfigResponse;
        if (!sessionsRes.ok || !data.success) {
          throw new Error(data.error || 'Failed to load token history');
        }
        setSessions(data.sessions || []);

        if (configRes.ok && configData.success && configData.config?.psyToken) {
          setTokenMeta({
            network: configData.config.network || wallet.network || 'preprod',
            policyId: configData.config.psyToken.policyId || '',
            assetName: configData.config.psyToken.assetName || 'PSY',
            unit: configData.config.psyToken.unit || '',
          });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load token history');
      } finally {
        setIsLoading(false);
      }
    }

    loadSessions();
  }, [wallet?.address, wallet?.isVerified, wallet?.network]);

  const rewardSessions = useMemo(
    () => sessions.filter((s) => Number(s.psyRewardAmount || 0) > 0),
    [sessions]
  );

  const tokenBalance = rewardSessions.reduce((sum, s) => sum + Number(s.psyRewardAmount || 0), 0);
  const thisWeekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lastWeekStart = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const stats = {
    totalEarned: tokenBalance,
    totalSpent: 0,
    thisWeek: rewardSessions
      .filter((s) => new Date(s.createdAt).getTime() >= thisWeekStart)
      .reduce((sum, s) => sum + Number(s.psyRewardAmount || 0), 0),
    lastWeek: rewardSessions
      .filter((s) => {
        const ts = new Date(s.createdAt).getTime();
        return ts >= lastWeekStart && ts < thisWeekStart;
      })
      .reduce((sum, s) => sum + Number(s.psyRewardAmount || 0), 0),
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {isLoading && (
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-8 text-slate-300">
              Loading token data...
            </div>
          )}
          {!isLoading && !wallet?.isVerified && (
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-8 text-slate-300">
              Connect a wallet to view your token data.
            </div>
          )}
          {!isLoading && error && (
            <div className="bg-red-950/40 border border-red-800 rounded-xl p-6 mb-8 text-red-200">
              {error}
            </div>
          )}

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Coins className="w-8 h-8 text-yellow-400" />
              My Tokens
            </h1>
            <p className="text-slate-400">Earn tokens through experiments and achievements</p>
          </div>

          {wallet?.network === 'preprod' && (
            <div className="mb-8 rounded-xl border border-amber-600/40 bg-amber-900/20 p-4 text-amber-200">
              <p className="text-sm">
                You are on preprod. Wallets may display token fingerprint IDs instead of token names until metadata is fully indexed.
              </p>
            </div>
          )}

          {tokenMeta && (
            <div className="mb-8 rounded-xl border border-[#1a2535] bg-[#0f1520] p-4">
              <p className="text-sm text-slate-300 mb-2">Token Metadata</p>
              <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-400">
                <div>Network: <span className="text-slate-200">{tokenMeta.network}</span></div>
                <div>Asset Name: <span className="text-slate-200">{tokenMeta.assetName}</span></div>
                <div className="md:col-span-2">
                  Policy ID: <span className="text-slate-200 font-mono break-all">{tokenMeta.policyId || '-'}</span>
                </div>
                <div className="md:col-span-2">
                  Unit: <span className="text-slate-200 font-mono break-all">{tokenMeta.unit || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm mb-2">Current Balance</div>
                <div className="text-5xl font-bold text-yellow-400 flex items-center gap-2">
                  {tokenBalance.toLocaleString()}
                  <Coins className="w-10 h-10" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 text-2xl font-bold flex items-center gap-1 justify-end">
                  <TrendingUp className="w-5 h-5" />
                  +{stats.thisWeek.toLocaleString()}
                </div>
                <div className="text-slate-400 text-sm">this week</div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Total Earned</div>
              <div className="text-3xl font-bold text-green-400">{stats.totalEarned.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Total Spent</div>
              <div className="text-3xl font-bold text-orange-400">{stats.totalSpent.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
              <div className="text-slate-400 text-sm mb-1">Last Week</div>
              <div className="text-3xl font-bold text-blue-400">{stats.lastWeek.toLocaleString()}</div>
            </div>
          </div>

          {/* Ways to Earn */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-cyan-400" />
              Ways to Earn Tokens
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="font-semibold text-white mb-1">Complete Experiments</div>
                <div className="text-sm text-slate-400">10 tokens per session</div>
              </div>
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="font-semibold text-white mb-1">High Accuracy</div>
                <div className="text-sm text-slate-400">+5-20 bonus for 70%+</div>
              </div>
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="font-semibold text-white mb-1">Daily Streaks</div>
                <div className="text-sm text-slate-400">+25 every 5 days</div>
              </div>
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="font-semibold text-white mb-1">Achievements</div>
                <div className="text-sm text-slate-400">5-50 tokens each</div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#1a2535]">
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
            </div>

            <div className="divide-y divide-gray-800">
              {rewardSessions.length === 0 && (
                <div className="p-6 text-slate-400">No token reward transactions yet.</div>
              )}
              {rewardSessions.map((tx) => (
                <div key={tx.id} className="p-6 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    'bg-green-500/20'
                  }`}>
                    <ArrowUpRight className="w-5 h-5 text-green-400" />
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {tx.experimentType || 'experiment'} reward
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(tx.createdAt).toLocaleString()}
                      {tx.rewardTxHash ? (
                        <>
                          {' • '}
                          <a
                            href={`https://preprod.cardanoscan.io/transaction/${tx.rewardTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            tx {tx.rewardTxHash.slice(0, 12)}...
                          </a>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-xl font-bold text-green-400">
                    +{Number(tx.psyRewardAmount || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
