'use client';

/**
 * Onboarding Page - Cardano Wallet Connection
 * Auto-detects and supports multiple wallets
 */

import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/useWalletStore';
import Header from '@/components/layout/Header';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import walletService from '@/services/walletService';
import { useState, useEffect } from 'react';

export default function OnboardingPage() {
  const router = useRouter();
  const { connectCardano, isLoading, error, clearError } = useWalletStore();
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [primaryWallet, setPrimaryWallet] = useState<string | null>(null);

  useEffect(() => {
    const wallets = walletService.getAvailableWallets();
    setAvailableWallets(wallets);
    
    // Set primary wallet (first available)
    if (wallets.length > 0) {
      setPrimaryWallet(wallets[0]);
    }
  }, []);

  const handleConnectWallet = async (walletName?: string) => {
    try {
      // Use specified wallet or primary wallet
      const wallet = walletName || primaryWallet;
      if (!wallet) {
        throw new Error('No wallet found. Please install a Cardano wallet extension.');
      }
      
      await connectCardano(wallet);
      router.push('/experiments');
    } catch (err) {
      console.error('Connect wallet error:', err);
    }
  };

  const getWalletIcon = (wallet: string) => {
    const icons: Record<string, string> = {
      nami: '🐠',
      eternl: '♾️',
      lace: '🎴',
      flint: '🔥',
      yoroi: '⛩️',
    };
    return icons[wallet] || '💳';
  };

  const getWalletDisplayName = (wallet: string) => {
    return wallet.charAt(0).toUpperCase() + wallet.slice(1);
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">Cognosis</span>
          </h1>
          <p className="text-xl text-slate-400">Connect your Cardano wallet to get started</p>
        </motion.div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-900/15 border border-red-500 rounded-lg text-red-400">
            {error}
            <button onClick={clearError} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-cyan-900/20 to-[#0f1520] border border-cyan-500/30 rounded-2xl"
        >
          {/* Preprod Notice */}
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/40 rounded-lg">
            <p className="text-sm text-amber-300 text-center font-semibold">
              ⚠️ Currently running on Cardano Preprod Testnet
            </p>
            <p className="text-xs text-amber-400/70 text-center mt-1">
              Use a preprod-enabled wallet • No real ADA required
            </p>
          </div>

          <Wallet className="w-16 h-16 text-cyan-400 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold mb-3 text-center">Connect Wallet</h2>
          <p className="text-slate-400 mb-6 text-center">
            Sign a message with your wallet to authenticate securely
          </p>
          <ul className="text-sm text-slate-400 mb-6 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              Full blockchain verification
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              Cryptographic signature authentication
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              Permanent experiment records
            </li>
          </ul>

          {availableWallets.length > 0 ? (
            <div className="space-y-3">
              {/* Primary wallet button */}
              <button
                onClick={() => handleConnectWallet()}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  'Connecting...'
                ) : (
                  <>
                    {getWalletIcon(primaryWallet || '')} Connect Wallet
                    {primaryWallet && ` (${getWalletDisplayName(primaryWallet)})`}
                  </>
                )}
                <Wallet className="w-5 h-5" />
              </button>

              {/* Alternative wallets */}
              {availableWallets.length > 1 && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-slate-500 text-center">Or connect with:</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {availableWallets.slice(1).map(wallet => (
                      <button
                        key={wallet}
                        onClick={() => handleConnectWallet(wallet)}
                        disabled={isLoading}
                        className="px-4 py-2 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-900/15 transition-all disabled:opacity-50 capitalize flex items-center gap-1"
                      >
                        <span>{getWalletIcon(wallet)}</span>
                        {getWalletDisplayName(wallet)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-orange-900/20 border border-orange-500/40 rounded-lg text-center">
                <p className="text-orange-300 mb-2">No Cardano wallet detected</p>
                <p className="text-xs text-orange-400/70">
                  Please install a wallet extension to continue
                </p>
              </div>

              {/* Wallet installation links */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 text-center mb-3">Supported Wallets:</p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://namiwallet.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-900/15 transition-all text-center"
                  >
                    🐠 Install Nami
                  </a>
                  <a
                    href="https://eternl.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-900/15 transition-all text-center"
                  >
                    ♾️ Install Eternl
                  </a>
                  <a
                    href="https://www.lace.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-900/15 transition-all text-center"
                  >
                    🎴 Install Lace
                  </a>
                  <a
                    href="https://yoroi-wallet.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-900/15 transition-all text-center"
                  >
                    ⛩️ Install Yoroi
                  </a>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mt-12 grid md:grid-cols-3 gap-6"
        >
          <div className="p-6 bg-gradient-to-br from-purple-900/20 to-[#0f1520] border border-purple-500/30 rounded-xl">
            <div className="text-3xl mb-3">🔮</div>
            <h3 className="text-lg font-semibold mb-2">Remote Viewing</h3>
            <p className="text-sm text-slate-400">
              Test your ability to perceive distant locations
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-cyan-900/20 to-[#0f1520] border border-cyan-500/30 rounded-xl">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="text-lg font-semibold mb-2">AI Scoring</h3>
            <p className="text-sm text-slate-400">
              GPT-4 evaluates your predictions objectively
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-teal-900/20 to-[#0f1520] border border-teal-500/30 rounded-xl">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-lg font-semibold mb-2">Earn Rewards</h3>
            <p className="text-sm text-slate-400">
              Receive PSY tokens based on accuracy
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
