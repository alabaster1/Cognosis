'use client';

/**
 * Onboarding Page - Cardano Wallet Connection
 * Shows modal-based wallet connection
 */

import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/useWalletStore';
import Header from '@/components/layout/Header';
import WalletConnectModal from '@/components/wallet/WalletConnectModal';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function OnboardingPage() {
  const router = useRouter();
  const { wallet } = useWalletStore();
  const [showModal, setShowModal] = useState(false);

  // Redirect if already connected
  useEffect(() => {
    if (wallet) {
      router.push('/experiments');
    } else {
      // Show modal after page loads
      setShowModal(true);
    }
  }, [wallet, router]);

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

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mt-12 grid md:grid-cols-3 gap-6"
        >
          <div className="p-6 bg-gradient-to-br from-purple-900/20 to-[#0f1520] border border-purple-500/30 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">Remote Viewing</h3>
            <p className="text-sm text-slate-400">
              Test your ability to perceive distant locations
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-cyan-900/20 to-[#0f1520] border border-cyan-500/30 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">AI Scoring</h3>
            <p className="text-sm text-slate-400">
              GPT-4 evaluates your predictions objectively
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-teal-900/20 to-[#0f1520] border border-teal-500/30 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">Earn Rewards</h3>
            <p className="text-sm text-slate-400">
              Receive PSY tokens based on accuracy
            </p>
          </div>
        </motion.div>
      </div>

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          router.push('/');
        }}
        onSuccess={() => {
          setShowModal(false);
          router.push('/experiments');
        }}
      />
    </div>
  );
}
