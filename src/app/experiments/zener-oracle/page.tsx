'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Zener card symbols
const ZENER_CARDS = [
  { id: 1, name: 'Circle', symbol: '⭕', color: 'from-blue-500 to-blue-600' },
  { id: 2, name: 'Cross', symbol: '✚', color: 'from-red-500 to-red-600' },
  { id: 3, name: 'Square', symbol: '⬜', color: 'from-green-500 to-green-600' },
  { id: 4, name: 'Star', symbol: '⭐', color: 'from-yellow-500 to-yellow-600' },
  { id: 5, name: 'Waves', symbol: '〰️', color: 'from-violet-500 to-violet-600' },
];

interface GameResult {
  guess: number;
  reveal: number;
  hit: boolean;
  timestamp: Date;
}

interface Stats {
  totalGuesses: number;
  totalHits: number;
  accuracy: number;
  streak: number;
}

export default function ZenerOraclePage() {
  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);

  // Game state
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalGuesses: 0,
    totalHits: 0,
    accuracy: 0,
    streak: 0,
  });
  const [globalStats, setGlobalStats] = useState<Stats | null>(null);

  // Session history
  const [history, setHistory] = useState<GameResult[]>([]);

  // Check for available wallets on mount
  useEffect(() => {
    const checkWallets = () => {
      const wallets: string[] = [];
      const cardano = (window as any).cardano;
      if (cardano?.nami) wallets.push('Nami');
      if (cardano?.eternl) wallets.push('Eternl');
      if (cardano?.lace) wallets.push('Lace');
      if (cardano?.flint) wallets.push('Flint');
      setAvailableWallets(wallets);
    };

    checkWallets();
    // Re-check after a delay (wallets may load async)
    setTimeout(checkWallets, 1000);
  }, []);

  // Connect wallet
  const connectWallet = async (walletName: string) => {
    try {
      const api = await (window as any).cardano?.[walletName.toLowerCase()]?.enable();
      if (api) {
        // Get address
        const addresses = await api.getUsedAddresses();
        const addr = addresses[0] || (await api.getUnusedAddresses())[0];
        setWalletAddress(addr);

        // Get balance
        const balance = await api.getBalance();
        // Convert from CBOR hex to lovelace (simplified)
        const lovelace = parseInt(balance, 16) || 0;
        setWalletBalance((lovelace / 1_000_000).toFixed(2));

        setWalletConnected(true);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet. Make sure it\'s unlocked.');
    }
  };

  // Compute RNG from tx hash (mock for now)
  const computeRNG = (seed: string): number => {
    const hash = seed + Date.now().toString();
    let num = 0;
    for (let i = 0; i < hash.length; i++) {
      num = ((num << 5) - num + hash.charCodeAt(i)) | 0;
    }
    return Math.abs(num % 5) + 1;
  };

  // Play game
  const playGame = async () => {
    if (!selectedCard) return;

    setIsPlaying(true);
    setShowResult(false);

    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate reveal (in production, this comes from tx hash)
    const reveal = computeRNG(walletAddress || 'demo');
    const hit = selectedCard === reveal;

    const result: GameResult = {
      guess: selectedCard,
      reveal,
      hit,
      timestamp: new Date(),
    };

    setLastResult(result);
    setHistory((prev) => [result, ...prev.slice(0, 49)]);

    // Update stats
    setStats((prev) => {
      const newGuesses = prev.totalGuesses + 1;
      const newHits = prev.totalHits + (hit ? 1 : 0);
      const newStreak = hit ? prev.streak + 1 : 0;
      return {
        totalGuesses: newGuesses,
        totalHits: newHits,
        accuracy: (newHits / newGuesses) * 100,
        streak: newStreak,
      };
    });

    setIsPlaying(false);
    setShowResult(true);
    setSelectedCard(null);
  };

  // Card selection component
  const CardButton = ({ card }: { card: typeof ZENER_CARDS[0] }) => {
    const isSelected = selectedCard === card.id;
    const isRevealed = showResult && lastResult?.reveal === card.id;
    const wasGuessed = showResult && lastResult?.guess === card.id;

    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => !isPlaying && !showResult && setSelectedCard(card.id)}
        disabled={isPlaying || showResult}
        className={`
          relative w-24 h-32 rounded-xl flex flex-col items-center justify-center
          transition-all duration-300 border-2
          ${isSelected ? 'border-white ring-2 ring-white/50' : 'border-white/20'}
          ${isRevealed ? 'bg-gradient-to-br ' + card.color : 'bg-white/5'}
          ${wasGuessed && !isRevealed ? 'border-red-500' : ''}
          ${!isPlaying && !showResult ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default'}
        `}
      >
        <span className="text-4xl mb-2">{card.symbol}</span>
        <span className="text-xs text-white/70">{card.name}</span>
        {isSelected && !showResult && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
          >
            <span className="text-[#060a0f] text-sm">✓</span>
          </motion.div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900 text-white">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-white/10">
        <div>
          <Link href="/" className="text-white/60 hover:text-white text-sm">
            ← Back to Cognosis
          </Link>
          <h1 className="text-2xl font-bold mt-1">🎴 Zener Card Oracle</h1>
          <p className="text-white/60 text-sm">ESP experiment with on-chain verification</p>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center gap-4">
          {walletConnected ? (
            <div className="text-right">
              <p className="text-sm text-white/60">Connected</p>
              <p className="text-sm font-mono">
                {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
              </p>
              <p className="text-sm text-green-400">{walletBalance} ₳</p>
            </div>
          ) : (
            <div className="flex gap-2">
              {availableWallets.length > 0 ? (
                availableWallets.map((wallet) => (
                  <button
                    key={wallet}
                    onClick={() => connectWallet(wallet)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                  >
                    {wallet}
                  </button>
                ))
              ) : (
                <span className="text-white/60 text-sm">No Cardano wallets detected</span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Game Area */}
        <div className="bg-white/5 rounded-2xl p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-xl mb-2">
              {showResult
                ? lastResult?.hit
                  ? '🎯 HIT! You predicted correctly!'
                  : '❌ Miss - The card was different'
                : 'Select the card you sense'}
            </h2>
            <p className="text-white/60">
              {showResult
                ? `You guessed ${ZENER_CARDS[lastResult!.guess - 1].name}, reveal was ${ZENER_CARDS[lastResult!.reveal - 1].name}`
                : 'Focus your mind and choose one of the five Zener symbols'}
            </p>
          </div>

          {/* Cards */}
          <div className="flex justify-center gap-4 mb-8">
            {ZENER_CARDS.map((card) => (
              <CardButton key={card.id} card={card} />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {showResult ? (
              <button
                onClick={() => {
                  setShowResult(false);
                  setLastResult(null);
                }}
                className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors"
              >
                Play Again
              </button>
            ) : (
              <button
                onClick={playGame}
                disabled={!selectedCard || isPlaying}
                className={`
                  px-8 py-3 rounded-lg font-semibold transition-all
                  ${
                    selectedCard && !isPlaying
                      ? 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700'
                      : 'bg-white/10 cursor-not-allowed'
                  }
                `}
              >
                {isPlaying ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                    Submitting...
                  </span>
                ) : (
                  `Submit Guess (0.2 ₳)`
                )}
              </button>
            )}
          </div>

          {/* Demo Mode Notice */}
          {!walletConnected && (
            <p className="text-center text-yellow-400/80 text-sm mt-4">
              ⚠️ Demo mode - Connect a Cardano wallet to play on-chain
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.totalGuesses}</p>
            <p className="text-white/60 text-sm">Total Plays</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.totalHits}</p>
            <p className="text-white/60 text-sm">Hits</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-cyan-400">{stats.accuracy.toFixed(1)}%</p>
            <p className="text-white/60 text-sm">Accuracy (20% chance)</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">{stats.streak}</p>
            <p className="text-white/60 text-sm">Current Streak</p>
          </div>
        </div>

        {/* Bodega Betting Link */}
        <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-xl p-6 mb-8 border border-orange-500/30">
          <h3 className="text-lg font-semibold mb-2">🎰 Bet on Global Performance</h3>
          <p className="text-white/70 mb-4">
            Think the global Zener accuracy will exceed 25%? Create or join a prediction market on Bodega!
          </p>
          <a
            href="https://bodegamarket.xyz/create"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition-colors"
          >
            Create Market on Bodega →
          </a>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.hit ? 'bg-green-500/20' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{ZENER_CARDS[result.guess - 1].symbol}</span>
                    <span className="text-white/40">→</span>
                    <span className="text-2xl">{ZENER_CARDS[result.reveal - 1].symbol}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={result.hit ? 'text-green-400' : 'text-white/40'}>
                      {result.hit ? '✓ HIT' : '✗ MISS'}
                    </span>
                    <span className="text-white/40 text-sm">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
