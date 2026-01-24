'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/walletStore';
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
  const wallet = useWalletStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const [targetSector, setTargetSector] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState<any>(null);

  const userId = (wallet as any).address || 'guest-user';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const commitChoice = async () => {
    if (selectedSector === null) return;
    setPhase('committing');
    setIsLoading(true);
    setError('');

    try {
      // Commit the player's choice on-chain, then AI generates landscape in a random sector
      const resp = await fetch(`${API_URL}/api/experiments/precog-explorer/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
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
          userId,
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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-green-950/10 to-gray-950 text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Compass className="w-7 h-7 text-green-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Pre-Cognitive Explorer
            </h1>
          </div>
          <p className="text-gray-400">Choose a sector before the AI generates its landscape</p>
        </motion.div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Intro */}
        {phase === 'intro' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <Map className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">How It Works</h2>
              <div className="text-sm text-gray-400 space-y-2 text-left max-w-sm mx-auto">
                <p>1. Choose one of 4 map sectors using your intuition</p>
                <p>2. Your choice is committed on-chain (locked before generation)</p>
                <p>3. AI generates a landscape in ONE random sector using VRF seed</p>
                <p>4. If your choice matches the AI's sector, it's a precognitive hit!</p>
              </div>
              <p className="text-xs text-gray-500 mt-4">Baseline: 25% chance (1 in 4)</p>
            </div>
            <button
              onClick={() => setPhase('selecting')}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-all"
            >
              Begin Exploration
            </button>
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
