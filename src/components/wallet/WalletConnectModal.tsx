'use client';

/**
 * WalletConnectModal - Modal overlay for connecting Cardano wallets
 * Inspired by Bodega's clean wallet connection pattern
 */

import { useEffect, useState } from 'react';
import { X, Wallet, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/store/useWalletStore';
import walletService from '@/services/walletService';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WalletConnectModal({ isOpen, onClose, onSuccess }: WalletConnectModalProps) {
  const { connectCardano, isLoading, error, clearError } = useWalletStore();
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const wallets = walletService.getAvailableWallets();
      setAvailableWallets(wallets);
      clearError();
    }
  }, [isOpen, clearError]);

  const handleConnectWallet = async (walletName: string) => {
    try {
      await connectCardano(walletName);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Connect wallet error:', err);
    }
  };

  const getWalletDisplayName = (wallet: string) => {
    const names: Record<string, string> = {
      nami: 'Nami',
      eternl: 'Eternl',
      lace: 'Lace',
      flint: 'Flint',
      yoroi: 'Yoroi',
      typhon: 'Typhon',
    };
    return names[wallet] || wallet.charAt(0).toUpperCase() + wallet.slice(1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0f1520] border border-[#1a2535] rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#1a2535]">
            <div className="flex items-center gap-3">
              <Wallet className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">Connect Wallet</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1a2535] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Preprod Notice */}
            <div className="mb-6 p-3 bg-amber-900/20 border border-amber-500/40 rounded-lg">
              <p className="text-xs text-amber-300 text-center font-semibold">
                Currently running on Cardano Preprod Testnet
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Wallet Selection */}
            {availableWallets.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-400 mb-3">Choose a wallet to connect:</p>
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet}
                    onClick={() => handleConnectWallet(wallet)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-[#1a2535] hover:border-cyan-500/50 hover:bg-cyan-900/10 rounded-lg text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
                  >
                    <span className="font-medium">{getWalletDisplayName(wallet)}</span>
                    <div className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-orange-900/20 border border-orange-500/40 rounded-lg text-center">
                  <p className="text-sm text-orange-300 mb-2">No Cardano wallet detected</p>
                  <p className="text-xs text-orange-400/70">
                    Please install a wallet extension to continue
                  </p>
                </div>

                {/* Installation Links */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 mb-2">Popular wallets:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Nami', url: 'https://namiwallet.io/' },
                      { name: 'Eternl', url: 'https://eternl.io/' },
                      { name: 'Lace', url: 'https://www.lace.io/' },
                      { name: 'Yoroi', url: 'https://yoroi-wallet.com/' },
                    ].map((wallet) => (
                      <a
                        key={wallet.name}
                        href={wallet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-[#1a2535] hover:border-cyan-500/50 hover:bg-cyan-900/10 rounded-lg text-sm font-medium transition-all flex items-center justify-between"
                      >
                        <span>{wallet.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Note */}
            <p className="mt-6 text-xs text-slate-500 text-center">
              By connecting, you agree to sign a message for authentication
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
