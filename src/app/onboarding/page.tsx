'use client';

/**
 * Onboarding Page - Lace Wallet Connection
 * Simplified to only support Lace wallet and guest mode
 */

import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/useWalletStore';
import Header from '@/components/layout/Header';
import { Wallet, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OnboardingPage() {
  const router = useRouter();
  const { connectLace, continueAsGuest, isLoading, error, clearError } = useWalletStore();

  const handleConnectLace = async () => {
    try {
      await connectLace();
      router.push('/experiments');
    } catch (err) {
      console.error('Connect Lace error:', err);
    }
  };

  const handleGuestMode = async () => {
    try {
      await continueAsGuest();
      router.push('/experiments');
    } catch (err) {
      console.error('Guest mode error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">Cognosis</span>
          </h1>
          <p className="text-xl text-slate-400">Choose how you&apos;d like to get started</p>
        </motion.div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-900/15 border border-red-500 rounded-lg text-red-400">
            {error}
            <button onClick={clearError} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Connect Lace Midnight Testnet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-8 bg-gradient-to-br from-cyan-900/20 to-[#0f1520] border border-cyan-500/30 rounded-2xl"
          >
            <Wallet className="w-16 h-16 text-cyan-400 mb-4" />
            <h2 className="text-2xl font-bold mb-3">Connect Lace Wallet</h2>
            <p className="text-slate-400 mb-6">
              Use Lace Midnight Preview to connect to Cognosis on testnet
            </p>
            <ul className="text-sm text-slate-400 mb-6 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                Full blockchain verification
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                Zero-knowledge privacy
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

          {/* Guest Mode */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-8 bg-gradient-to-br from-[#0f1520] to-[#142030] border border-[#1a2535] rounded-2xl"
          >
            <Shield className="w-16 h-16 text-slate-400 mb-4" />
            <h2 className="text-2xl font-bold mb-3">Try Without a Wallet</h2>
            <p className="text-slate-400 mb-6">
              Explore Cognosis without blockchain verification. Experiments stored locally.
            </p>
            <ul className="text-sm text-slate-400 mb-6 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-0.5">•</span>
                No wallet required
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-0.5">•</span>
                Local data storage
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500 mt-0.5">•</span>
                Limited features
              </li>
            </ul>
            <button
              onClick={handleGuestMode}
              disabled={isLoading}
              className="w-full px-6 py-3 border border-[#1a2535] rounded-lg font-semibold hover:border-cyan-500/40 hover:bg-[#1a2535] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Continue as Guest'}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
