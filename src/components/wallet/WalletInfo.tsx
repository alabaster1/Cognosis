'use client';

/**
 * WalletInfo Component - Display wallet balance and NFTs
 * Shows tDust balance and experiment NFTs from Midnight Network
 */

import { useState, useEffect } from 'react';
import { Wallet, Coins, Image, ExternalLink, RefreshCw } from 'lucide-react';
import midnightService, { type MidnightBalance } from '@/services/midnightService';
import { motion } from 'framer-motion';

interface WalletInfoProps {
  address: string;
  compact?: boolean;
}

export default function WalletInfo({ address, compact = false }: WalletInfoProps) {
  const [balance, setBalance] = useState<MidnightBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const loadBalance = async () => {
    try {
      setIsLoading(true);
      setError('');
      const bal = await midnightService.getBalance(address);
      setBalance(bal);
    } catch (err) {
      console.error('Balance load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBalance();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (isLoading && !balance) {
    return (
      <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-4">
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="ml-2 text-sm text-slate-400">Loading balance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (compact && balance) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="font-semibold">{balance.tDustFormatted} tDust</span>
        </div>
        {balance.nfts.length > 0 && (
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-cyan-400" aria-label="NFT icon" />
            <span className="font-semibold">{balance.nfts.length} NFT{balance.nfts.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1 hover:bg-[#142030] rounded transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-cyan-400" />
          <h3 className="text-lg font-semibold">Wallet Balance</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-[#142030] rounded-lg transition-colors"
          title="Refresh balance"
        >
          <RefreshCw className={`w-5 h-5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* tDust Balance */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">tDust Balance</p>
            <p className="text-3xl font-bold text-yellow-400">{balance?.tDustFormatted || '0.00'}</p>
          </div>
          <Coins className="w-12 h-12 text-yellow-400 opacity-50" />
        </div>
      </div>

      {/* NFTs */}
      {balance && balance.nfts.length > 0 && (
        <div className="bg-gradient-to-br from-violet-900/15 to-fuchsia-900/15 border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Image className="w-5 h-5 text-cyan-400" aria-label="NFT collection icon" />
            <h4 className="font-semibold">Experiment NFTs ({balance.nfts.length})</h4>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {balance.nfts.map((nft, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#060a0f]/30 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{nft.assetName}</p>
                  <p className="text-xs text-slate-400">Quantity: {nft.quantity}</p>
                </div>
                {nft.metadata && (
                  <div className="text-xs text-slate-500">
                    {(nft.metadata.attributes as any)?.type && (
                      <span className="px-2 py-1 bg-cyan-900/30 rounded">
                        {(nft.metadata.attributes as any).type}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Address Display */}
      <div className="mt-4 pt-4 border-t border-[#1a2535]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">Address</p>
            <p className="text-sm font-mono text-slate-300 break-all">{address}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(address);
            }}
            className="ml-2 p-2 hover:bg-[#142030] rounded transition-colors"
            title="Copy address"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <a
          href={midnightService.getAddressExplorerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View in Polkadot.js Explorer
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
