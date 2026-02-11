'use client';

/**
 * WalletConnectModal - Cardano wallet connection modal
 * Styled after Indigo Protocol's Connect Wallet pattern
 * Shows all supported CIP-30 wallets with ToS agreement checkbox
 */

import { useEffect, useState } from 'react';
import { X, ExternalLink, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/store/useWalletStore';
import walletService from '@/services/walletService';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'eternl',
    name: 'Eternl',
    icon: '/wallets/eternl.svg',
    installUrl: 'https://eternl.io/',
  },
  {
    id: 'nufi',
    name: 'NuFi',
    icon: '/wallets/nufi.svg',
    installUrl: 'https://nu.fi/',
  },
  {
    id: 'lace',
    name: 'Lace',
    icon: '/wallets/lace.svg',
    installUrl: 'https://www.lace.io/',
  },
  {
    id: 'vespr',
    name: 'Vespr',
    icon: '/wallets/vespr.svg',
    installUrl: 'https://vespr.xyz/',
  },
  {
    id: 'typhon',
    name: 'Typhon',
    icon: '/wallets/typhon.svg',
    installUrl: 'https://typhonwallet.io/',
  },
  {
    id: 'okxwallet',
    name: 'OKX Wallet',
    icon: '/wallets/okx.svg',
    installUrl: 'https://www.okx.com/web3',
  },
  {
    id: 'begin',
    name: 'Begin Wallet',
    icon: '/wallets/begin.svg',
    installUrl: 'https://begin.is/',
  },
];

export default function WalletConnectModal({ isOpen, onClose, onSuccess }: WalletConnectModalProps) {
  const { connectCardano, isLoading, error, clearError } = useWalletStore();
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const wallets = walletService.getAvailableWallets();
      setAvailableWallets(wallets);
      clearError();
      setAgreedToTerms(false);
      setConnectingWallet(null);
    }
  }, [isOpen, clearError]);

  const handleConnectWallet = async (walletId: string) => {
    if (!agreedToTerms) return;

    try {
      setConnectingWallet(walletId);
      await connectCardano(walletId);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Connect wallet error:', err);
    } finally {
      setConnectingWallet(null);
    }
  };

  const isWalletAvailable = (walletId: string) => {
    return availableWallets.includes(walletId);
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
          className="relative w-full max-w-md bg-[#0f1520] border border-[#1a2535] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-[#1a2535] rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>

          {/* Content */}
          <div className="p-8">
            {/* Title */}
            <h2 className="text-2xl font-bold text-[#e0e8f0] mb-6">Connect Wallet</h2>

            {/* Terms Agreement Checkbox */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                    agreedToTerms
                      ? 'bg-cyan-500 border-cyan-500'
                      : 'border-slate-500 group-hover:border-slate-400'
                  }`}
                >
                  {agreedToTerms && <Check className="w-3.5 h-3.5 text-[#060a0f]" />}
                </div>
              </div>
              <span className="text-sm text-slate-300 leading-relaxed">
                By connecting your wallet, you agree to our{' '}
                <Link
                  href="/terms"
                  className="font-semibold text-[#e0e8f0] hover:text-cyan-400 underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </Link>
                {' '}and our{' '}
                <Link
                  href="/privacy"
                  className="font-semibold text-[#e0e8f0] hover:text-cyan-400 underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/40 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Wallet List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {WALLET_OPTIONS.map((wallet) => {
                const available = isWalletAvailable(wallet.id);
                const isConnecting = connectingWallet === wallet.id;

                return (
                  <button
                    key={wallet.id}
                    onClick={() => {
                      if (available) {
                        handleConnectWallet(wallet.id);
                      } else {
                        window.open(wallet.installUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    disabled={!agreedToTerms || (isLoading && !isConnecting)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                      !agreedToTerms
                        ? 'border-[#1a2535] opacity-40 cursor-not-allowed'
                        : available
                          ? 'border-[#1a2535] hover:border-cyan-500/50 hover:bg-cyan-900/10 cursor-pointer'
                          : 'border-[#1a2535] hover:border-slate-500/50 hover:bg-[#1a2535]/50 cursor-pointer'
                    } ${isConnecting ? 'border-cyan-500/50 bg-cyan-900/10' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${available ? 'text-[#e0e8f0]' : 'text-slate-500'}`}>
                        {wallet.name}
                      </span>
                      {!available && (
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <ExternalLink className="w-3 h-3" />
                          Install
                        </span>
                      )}
                      {isConnecting && (
                        <span className="text-xs text-cyan-400 animate-pulse">Connecting...</span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#1a2535] flex items-center justify-center overflow-hidden flex-shrink-0">
                      <Image
                        src={wallet.icon}
                        alt={wallet.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                        onError={(e) => {
                          // Fallback: show first letter
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('span')) {
                            const span = document.createElement('span');
                            span.className = 'text-sm font-bold text-cyan-400';
                            span.textContent = wallet.name[0];
                            parent.appendChild(span);
                          }
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Preprod Notice */}
            <div className="mt-6 p-3 bg-amber-900/15 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-300/80 text-center">
                Currently running on Cardano Preprod Testnet
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
