'use client';

/**
 * Onboarding Page - Cardano Wallet Connection
 * Wallet-only authentication (CIP-30 + CIP-8)
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
  const { connectLace, connectCardano, isLoading, error, clearError } = useWalletStore();
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);

  useEffect(() => {
    setAvailableWallets(walletService.getAvailableWallets());
  }, []);

  const handleConnectLace = async () => {
    try {
      await connectLace();
      router.push('/experiments');
    } catch (err) {
      console.error('Connect Lace error:', err);
    }
  };

  const handleConnectWallet = async (name: string) => {
    try {
      await connectCardano(name);
      router.push('/experiments');
    } catch (err) {
      console.error(`Connect ${name} error:`, err);
    }
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
          <div className="space-y-3">
            <button
              onClick={handleConnectLace}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? 'Connecting...' : 'Connect Lace Wallet'}
              <Wallet className="w-5 h-5" />
            </button>

            {availableWallets.filter(w => w !== 'lace').length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-slate-500 text-center">Or connect with:</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {availableWallets.filter(w => w !== 'lace').map(wallet => (
                    <button
                      key={wallet}
                      onClick={() => handleConnectWallet(wallet)}
                      disabled={isLoading}
                      className="px-4 py-2 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-900/15 transition-all disabled:opacity-50 capitalize"
                    >
                      {wallet}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <a
              href="https://chromewebstore.google.com/detail/lace-midnight-preview/hgeekaiplokcnmakghbdfbgnlfheichg?pli=1"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-6 py-3 border border-cyan-500/30 rounded-lg font-semibold hover:bg-cyan-900/15 transition-all text-center"
            >
              Install Lace Extension
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
