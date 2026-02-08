'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import { Map, Compass, Loader2, CheckCircle2, XCircle } from 'lucide-react';

type Phase = 'intro' | 'selecting' | 'committing' | 'generating' | 'results';

interface Sector {
  id: number;
  name: string;
  color: string;
  icon: string;
}

const SECTORS: Sector[] = [
  { id: 0, name: 'North Peak', color: 'from-blue-500/20 to-cyan-500/20', icon: '🏔️' },
  { id: 1, name: 'East Valley', color: 'from-green-500/20 to-emerald-500/20', icon: '🌿' },
  { id: 2, name: 'South Coast', color: 'from-orange-500/20 to-amber-500/20', icon: '🏖️' },
  { id: 3, name: 'West Forest', color: 'from-purple-500/20 to-violet-500/20', icon: '🌲' },
];

export default function PrecogExplorerPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const [targetSector, setTargetSector] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Require wallet
  useEffect(() => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
  }, [wallet, router]);

  const commitChoice = async () => {
    if (selectedSector === null || !wallet?.address) return;
    setPhase('committing');
    setIsLoading(true);
    setError('');

    try {
      // Commit the player's choice on-chain, then AI generates landscape in a random sector
      const resp = await fetch(`${API_URL}/api/experiments/precog-explorer/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: wallet.address,
          chosenSector: selectedSector,
          verified: !!(wallet as any).isVerified,
        }),
      });
      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || 'Commit failed');

      setPhase('generating');

      // Poll for result
      const revealResp = await fetch(`${API_URL}/api/experiments/precog-explorer/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: wallet.address,
          commitmentId: data.commitmentId,
          chosenSector: selectedSector,
        }),
      });
      const revealData = await revealResp.json();

      if (!revealResp.ok) throw new Error(revealData.error || 'Reveal failed');

      setTargetSector(revealData.targetSector);
      setGeneratedImage(revealData.generatedImageUrl || null);
      setScore(revealData.score);
      setPhase('results');
    } catch (err: any) {
      setError(err.message || 'Failed to process experiment');
      setPhase('selecting');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setPhase('intro');
    setSelectedSector(null);
    setTargetSector(null);
    setGeneratedImage(null);
    setScore(null);
    setError('');
  };

  const isHit = targetSector !== null && selectedSector === targetSector;

  return (
    <div className="min-h-screen bg-[#060a0f] text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Intro */}
        {phase === 'intro' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto pt-8">
            {/* Compass / Map background */}
            <div className="relative mb-10">
              {/* Topographic rings */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-emerald-500/10"
                  style={{
                    width: `${180 + i * 50}px`,
                    height: `${180 + i * 50}px`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 4, delay: i * 0.5, repeat: Infinity }}
                />
              ))}

              {/* Compass icon with spinning needle */}
              <div className="relative w-28 h-28 mx-auto mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                />
                {/* Cross-hairs */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute w-full h-px bg-emerald-500/20" />
                  <div className="absolute w-px h-full bg-emerald-500/20" />
                </div>
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-emerald-700 to-green-800 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <motion.div
                    animate={{ rotate: [0, 15, -10, 5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Compass className="w-8 h-8 text-white" />
                  </motion.div>
                </div>
                {/* Sector labels */}
                {['N', 'E', 'S', 'W'].map((dir, i) => (
                  <span
                    key={dir}
                    className="absolute text-[10px] font-bold text-emerald-400/60"
                    style={{
                      top: i === 0 ? '0px' : i === 2 ? 'auto' : '50%',
                      bottom: i === 2 ? '0px' : 'auto',
                      left: i === 3 ? '0px' : i === 1 ? 'auto' : '50%',
                      right: i === 1 ? '0px' : 'auto',
                      transform: (i === 0 || i === 2) ? 'translateX(-50%)' : 'translateY(-50%)',
                    }}
                  >
                    {dir}
                  </span>
                ))}
              </div>

              {/* Title */}
              <div className="text-center">
                <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
                  <span className="text-emerald-400">PRECOG</span>
                  <br />
                  <span className="text-green-300/80 text-3xl md:text-4xl font-light tracking-[0.2em]">EXPLORER</span>
                </h1>
                <p className="text-slate-500 text-sm mt-3 tracking-wide">Predict the AI&apos;s Chosen Sector</p>
              </div>
            </div>

            {/* 4 Sector preview cards */}
            <div className="grid grid-cols-4 gap-2 mb-8">
              {SECTORS.map((sector, i) => (
                <motion.div
                  key={sector.id}
                  className={`text-center p-3 rounded-xl bg-gradient-to-br ${sector.color} border border-emerald-900/30`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-xl mb-1">{sector.icon}</div>
                  <div className="text-[10px] text-slate-300 font-medium">{sector.name}</div>
                </motion.div>
              ))}
            </div>

            {/* How it works compact */}
            <div className="grid grid-cols-4 gap-2 mb-8">
              {[
                { n: '1', label: 'Intuit' },
                { n: '2', label: 'Lock-in' },
                { n: '3', label: 'AI Gen' },
                { n: '4', label: 'Reveal' },
              ].map((step, i) => (
                <motion.div
                  key={step.n}
                  className="text-center p-2.5 rounded-xl bg-[#060f0a]/60 border border-emerald-900/30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                >
                  <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-bold">
                    {step.n}
                  </div>
                  <span className="text-[10px] text-slate-400">{step.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-6 mb-8 text-xs text-slate-500">
              <span>4 SECTORS</span>
              <span className="text-emerald-700">|</span>
              <span>25% BASELINE</span>
              <span className="text-emerald-700">|</span>
              <span>ON-CHAIN LOCK</span>
            </div>

            {/* CTA */}
            <motion.button
              onClick={() => setPhase('selecting')}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2 relative overflow-hidden group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Compass className="w-5 h-5 relative" />
              <span className="relative">Begin Exploration</span>
            </motion.button>
          </motion.div>
        )}

        {/* Sector Selection */}
        {phase === 'selecting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <p className="text-center text-gray-300 text-sm">
              Which sector will the AI choose to generate a landscape in? Trust your intuition.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {SECTORS.map((sector) => (
                <motion.button
                  key={sector.id}
                  onClick={() => setSelectedSector(sector.id)}
                  className={`p-6 rounded-xl border-2 transition-all text-center ${
                    selectedSector === sector.id
                      ? 'border-green-500 ring-2 ring-green-500/30 bg-green-500/10'
                      : 'border-white/10 hover:border-white/30 bg-gradient-to-br ' + sector.color
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-3xl mb-2">{sector.icon}</div>
                  <div className="font-medium">{sector.name}</div>
                  <div className="text-xs text-gray-400 mt-1">Sector {sector.id + 1}</div>
                </motion.button>
              ))}
            </div>

            {selectedSector !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <button
                  onClick={commitChoice}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Lock In: {SECTORS[selectedSector].name}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Committing / Generating */}
        {(phase === 'committing' || phase === 'generating') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-green-400 mx-auto" />
            <h2 className="text-lg font-semibold">
              {phase === 'committing' ? 'Committing your choice...' : 'AI generating landscape...'}
            </h2>
            <p className="text-gray-400 text-sm">
              {phase === 'committing'
                ? 'Your selection is being locked on-chain'
                : 'The AI is generating a landscape in one random sector'}
            </p>
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className={`p-6 rounded-xl text-center ${
              isHit ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'
            }`}>
              {isHit ? (
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
              )}
              <h2 className="text-xl font-semibold">{isHit ? 'Precognitive Hit!' : 'Miss'}</h2>
              <p className="text-gray-400 text-sm mt-1">
                You chose: <span className="text-white">{SECTORS[selectedSector!]?.name}</span>
                {' | '}
                AI generated in: <span className="text-white">{targetSector !== null ? SECTORS[targetSector]?.name : '?'}</span>
              </p>
            </div>

            {generatedImage && (
              <div className="rounded-xl overflow-hidden border border-white/10">
                <img src={generatedImage} alt="Generated landscape" className="w-full aspect-video object-cover" />
                <div className="p-3 bg-white/5 text-center text-sm text-gray-400">
                  AI-generated landscape in {targetSector !== null ? SECTORS[targetSector]?.name : 'unknown sector'}
                </div>
              </div>
            )}

            {score && (
              <div className="p-3 bg-white/5 rounded-lg text-center">
                <span className="text-sm text-gray-400">Score: </span>
                <span className="text-lg font-bold text-green-300">{score.overallScore || 0}%</span>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-all"
            >
              Explore Again
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
