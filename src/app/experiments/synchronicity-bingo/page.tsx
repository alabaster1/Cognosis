'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/useWalletStore';
import {
  Loader2,
  Sparkles,
  Users,
  Calendar,
  Check,
  Star,
  Bell,
  MessageCircle,
  Phone,
  Music,
  Book,
  Clock,
  Heart,
  Lightbulb,
  Compass,
  Feather,
  Gift,
  Key,
  Map,
  Moon,
  Sun,
  Cloud,
  Bird,
  Flower2,
  Trophy,
} from 'lucide-react';

type Phase = 'intro' | 'playing' | 'bingo' | 'history';

interface SynchronicityType {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

interface BingoCell {
  type: SynchronicityType;
  logged: boolean;
  loggedAt: Date | null;
  matchedWith: string | null;
}

interface GlobalMatch {
  id: string;
  type: string;
  users: string[];
  timestamp: Date;
}

// 25 synchronicity types for the bingo card
const SYNCHRONICITY_TYPES: SynchronicityType[] = [
  { id: 'think_call', label: 'Think & Call', description: 'Thought of someone, they called/texted', icon: Phone, color: 'text-blue-400' },
  { id: 'number_repeat', label: 'Repeating Numbers', description: 'Saw repeating numbers (11:11, 333, etc.)', icon: Clock, color: 'text-cyan-400' },
  { id: 'song_answer', label: 'Song Answer', description: 'Heard a song that answered a question', icon: Music, color: 'text-pink-400' },
  { id: 'book_message', label: 'Book Message', description: 'Opened a book to a meaningful passage', icon: Book, color: 'text-amber-400' },
  { id: 'dream_event', label: 'Dream Event', description: 'Dreamed of something that happened', icon: Moon, color: 'text-indigo-400' },
  { id: 'name_everywhere', label: 'Name Everywhere', description: 'Kept seeing the same name repeatedly', icon: Bell, color: 'text-cyan-400' },
  { id: 'perfect_timing', label: 'Perfect Timing', description: 'Arrived at the perfect moment', icon: Clock, color: 'text-green-400' },
  { id: 'random_meeting', label: 'Random Meeting', description: 'Ran into someone unexpectedly', icon: Users, color: 'text-orange-400' },
  { id: 'thought_topic', label: 'Thought Topic', description: 'Thinking about X, someone mentions X', icon: MessageCircle, color: 'text-teal-400' },
  { id: 'found_object', label: 'Found Object', description: 'Found something you lost/needed', icon: Key, color: 'text-yellow-400' },
  { id: 'animal_sign', label: 'Animal Sign', description: 'Meaningful animal encounter', icon: Bird, color: 'text-emerald-400' },
  { id: 'deja_vu', label: 'Déjà Vu', description: 'Strong feeling of having lived this moment', icon: Compass, color: 'text-violet-400' },
  { id: 'insight', label: 'Sudden Insight', description: 'Answer came out of nowhere', icon: Lightbulb, color: 'text-yellow-400' },
  { id: 'gift_needed', label: 'Gift Needed', description: 'Received exactly what you needed', icon: Gift, color: 'text-rose-400' },
  { id: 'word_repeat', label: 'Word Repeat', description: 'Same unusual word appeared multiple times', icon: Feather, color: 'text-sky-400' },
  { id: 'path_cross', label: 'Paths Crossed', description: 'Met someone who connected you to your goal', icon: Map, color: 'text-lime-400' },
  { id: 'weather_mood', label: 'Weather Mood', description: 'Weather matched your emotional state', icon: Cloud, color: 'text-slate-400' },
  { id: 'nature_sign', label: 'Nature Sign', description: 'Meaningful pattern in nature', icon: Flower2, color: 'text-green-400' },
  { id: 'time_sync', label: 'Time Sync', description: 'Multiple clocks showed same unusual time', icon: Clock, color: 'text-blue-400' },
  { id: 'love_sign', label: 'Love Sign', description: 'Sign related to love/relationship', icon: Heart, color: 'text-red-400' },
  { id: 'creative_flow', label: 'Creative Flow', description: 'Ideas came effortlessly', icon: Star, color: 'text-amber-400' },
  { id: 'sun_moment', label: 'Light Moment', description: 'Sun/light appeared at meaningful moment', icon: Sun, color: 'text-yellow-400' },
  { id: 'help_appeared', label: 'Help Appeared', description: 'Help arrived when you needed it', icon: Users, color: 'text-emerald-400' },
  { id: 'symbol_repeat', label: 'Symbol Repeat', description: 'Same symbol appeared multiple times', icon: Sparkles, color: 'text-cyan-400' },
  { id: 'free', label: 'FREE', description: 'Free space!', icon: Star, color: 'text-gold-400' },
];

// Simulated global matches
const SIMULATED_MATCHES: GlobalMatch[] = [
  { id: '1', type: 'think_call', users: ['CosmicFox_7a3f', 'MysticOwl_2b1c'], timestamp: new Date(Date.now() - 3600000) },
  { id: '2', type: 'number_repeat', users: ['QuantumWolf_9d4e', 'AstralRaven_5f2a', 'NeuralPhoenix_1c8b'], timestamp: new Date(Date.now() - 7200000) },
  { id: '3', type: 'dream_event', users: ['EtherealDolphin_3e7f'], timestamp: new Date(Date.now() - 10800000) },
];

export default function SynchronicityBingoPage() {
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [nonce, setNonce] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Game state
  const [bingoCard, setBingoCard] = useState<BingoCell[]>([]);
  const [globalMatches, setGlobalMatches] = useState<GlobalMatch[]>(SIMULATED_MATCHES);
  const [hasBingo, setHasBingo] = useState(false);
  const [bingoLine, setBingoLine] = useState<number[]>([]);
  const [todayDate, setTodayDate] = useState('');

  // Generate a randomized bingo card
  const generateBingoCard = useCallback(() => {
    const shuffled = [...SYNCHRONICITY_TYPES]
      .filter((t) => t.id !== 'free')
      .sort(() => Math.random() - 0.5)
      .slice(0, 24);

    // Insert FREE space in the center
    const freeType = SYNCHRONICITY_TYPES.find((t) => t.id === 'free')!;
    const cells: BingoCell[] = shuffled.slice(0, 12).map((type) => ({
      type,
      logged: false,
      loggedAt: null,
      matchedWith: null,
    }));

    cells.push({
      type: freeType,
      logged: true, // Free space is always logged
      loggedAt: new Date(),
      matchedWith: null,
    });

    cells.push(
      ...shuffled.slice(12).map((type) => ({
        type,
        logged: false,
        loggedAt: null,
        matchedWith: null,
      }))
    );

    return cells;
  }, []);

  // Check for bingo
  const checkBingo = useCallback((cells: BingoCell[]) => {
    const lines = [
      // Rows
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      // Columns
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      // Diagonals
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ];

    for (const line of lines) {
      if (line.every((i) => cells[i].logged)) {
        return line;
      }
    }
    return null;
  }, []);

  // Initialize the game
  const startGame = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Call backend to get today's bingo card (seeded by date for consistency)
      const result = await apiService.getSynchronicityBingoCard({
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.cardId);
      setNonce(result.sessionId);
      localStorage.setItem(`sync_bingo_session_${result.cardId}`, result.sessionId);

      // Generate bingo card using backend-provided seed for deterministic layout
      const seed = result.cardSeed;
      const seededRandom = (s: number) => {
        let x = s;
        return () => {
          x = (x * 1103515245 + 12345) & 0x7fffffff;
          return x / 0x7fffffff;
        };
      };
      const random = seededRandom(seed);

      // Shuffle using seeded random
      const shuffled = [...SYNCHRONICITY_TYPES]
        .filter((t) => t.id !== 'free')
        .map((t) => ({ t, r: random() }))
        .sort((a, b) => a.r - b.r)
        .map((x) => x.t)
        .slice(0, 24);

      const freeType = SYNCHRONICITY_TYPES.find((t) => t.id === 'free')!;
      const cells: BingoCell[] = shuffled.slice(0, 12).map((type) => ({
        type,
        logged: false,
        loggedAt: null,
        matchedWith: null,
      }));

      cells.push({
        type: freeType,
        logged: true,
        loggedAt: new Date(),
        matchedWith: null,
      });

      cells.push(
        ...shuffled.slice(12).map((type) => ({
          type,
          logged: false,
          loggedAt: null,
          matchedWith: null,
        }))
      );

      setBingoCard(cells);
      setTodayDate(new Date().toLocaleDateString());
      setHasBingo(false);
      setBingoLine([]);

      // Load any global matches from backend
      if (result.globalMatches) {
        setGlobalMatches(result.globalMatches.map((m: { id: string; type: string; users: string[]; timestamp: string }) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
      }

      setIsLoading(false);
      setPhase('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setIsLoading(false);
    }
  };

  // Log a synchronicity
  const logSynchronicity = async (index: number) => {
    if (bingoCard[index].logged || hasBingo) return;

    const type = bingoCard[index].type;

    // Submit to backend
    try {
      const sessionId = localStorage.getItem(`sync_bingo_session_${commitmentId}`) || nonce;
      const result = await apiService.logSynchronicity({
        cardId: commitmentId,
        sessionId,
        synchronicityType: type.id,
        cellIndex: index,
      });

      setBingoCard((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          logged: true,
          loggedAt: new Date(),
          matchedWith: result.matchedWith || null,
        };

        // Check for bingo
        const line = checkBingo(updated);
        if (line) {
          setHasBingo(true);
          setBingoLine(line);

          // Submit bingo completion to feed
          apiService.submitToFeed({
            experimentType: 'synchronicity-bingo',
            score: updated.filter((c) => c.logged).length,
            accuracy: 100, // Completed bingo
            baseline: 0,
            commitmentHash: commitmentId,
            verified: true,
          });

          setTimeout(() => setPhase('bingo'), 1000);
        }

        return updated;
      });

      // Add to global matches if there was a match
      if (result.matchedWith || result.globalMatch) {
        setGlobalMatches((prev) => [
          {
            id: Date.now().toString(),
            type: type.id,
            users: result.matchedWith ? ['You', result.matchedWith] : ['You'],
            timestamp: new Date(),
          },
          ...prev,
        ].slice(0, 10));
      }
    } catch (err) {
      // Fallback: local-only logging
      setBingoCard((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          logged: true,
          loggedAt: new Date(),
          matchedWith: null,
        };

        const line = checkBingo(updated);
        if (line) {
          setHasBingo(true);
          setBingoLine(line);
          setTimeout(() => setPhase('bingo'), 1000);
        }

        return updated;
      });
    }
  };

  const loggedCount = bingoCard.filter((c) => c.logged).length;
  const matchedCount = bingoCard.filter((c) => c.matchedWith).length;

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <AnimatePresence mode="wait">
          {/* INTRO PHASE */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="bg-gradient-to-br from-rose-900/30 to-pink-900/30 rounded-2xl border border-rose-500/30 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-rose-500/20 rounded-xl">
                    <Sparkles className="w-8 h-8 text-rose-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Synchronicity Bingo</h1>
                    <p className="text-rose-300">Meaningful Coincidence Tracker</p>
                  </div>
                </div>

                <div className="space-y-4 text-slate-300 mb-8">
                  <p>
                    Track meaningful coincidences and discover when they align with other users
                    around the world. When 5 synchronicities align - BINGO!
                  </p>

                  <div className="bg-[#060a0f]/30 rounded-xl p-4 border border-rose-500/20">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-rose-400" />
                      How It Works
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400">1.</span>
                        <span>Get a daily 5x5 bingo card of synchronicity types</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400">2.</span>
                        <span>Log each synchronicity when you experience it</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400">3.</span>
                        <span>See when others log the same type on the same day</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400">4.</span>
                        <span>Get 5 in a row to complete a BINGO!</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                    <h3 className="font-semibold text-rose-300 mb-2">Synchronicity Clusters</h3>
                    <p className="text-sm text-slate-400">
                      When multiple users log the same synchronicity type on the same day,
                      it creates a &quot;cluster&quot; - a potential sign of global consciousness
                      patterns or collective meaning.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                <button
                  onClick={startGame}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white py-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Get Today&apos;s Card
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* PLAYING PHASE */}
          {phase === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Today&apos;s Bingo Card</h2>
                  <p className="text-slate-400 text-sm">{todayDate}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="bg-[#142030] rounded-lg px-4 py-2">
                    <span className="text-slate-400">Logged: </span>
                    <span className="text-rose-400 font-semibold">{loggedCount}/25</span>
                  </div>
                  <div className="bg-[#142030] rounded-lg px-4 py-2">
                    <span className="text-slate-400">Matched: </span>
                    <span className="text-green-400 font-semibold">{matchedCount}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bingo Card */}
                <div className="lg:col-span-2">
                  <div className="bg-[#0f1520]/30 rounded-2xl border border-[#1a2535] p-4">
                    <div className="grid grid-cols-5 gap-2">
                      {bingoCard.map((cell, index) => {
                        const Icon = cell.type.icon;
                        const isBingoCell = bingoLine.includes(index);

                        return (
                          <motion.button
                            key={index}
                            onClick={() => logSynchronicity(index)}
                            disabled={cell.logged}
                            className={`aspect-square p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                              isBingoCell
                                ? 'bg-yellow-500/30 border-yellow-500'
                                : cell.logged
                                ? cell.matchedWith
                                  ? 'bg-green-500/20 border-green-500'
                                  : 'bg-rose-500/20 border-rose-500'
                                : 'bg-[#0a1018] border-[#1a2535] hover:border-rose-500/50 hover:bg-[#142030]'
                            }`}
                            whileHover={!cell.logged ? { scale: 1.05 } : {}}
                            whileTap={!cell.logged ? { scale: 0.95 } : {}}
                          >
                            <Icon className={`w-5 h-5 md:w-6 md:h-6 ${cell.type.color}`} />
                            <span className="text-[10px] md:text-xs text-center text-slate-300 line-clamp-2">
                              {cell.type.label}
                            </span>
                            {cell.logged && cell.type.id !== 'free' && (
                              <Check className="w-3 h-3 text-green-400 absolute top-1 right-1" />
                            )}
                            {cell.matchedWith && (
                              <Users className="w-3 h-3 text-green-400 absolute bottom-1 right-1" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Global Activity */}
                <div className="space-y-4">
                  <div className="bg-[#0f1520]/30 rounded-xl border border-[#1a2535] p-4">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-rose-400" />
                      Global Matches Today
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {globalMatches.map((match) => {
                        const type = SYNCHRONICITY_TYPES.find((t) => t.id === match.type);
                        if (!type) return null;
                        const Icon = type.icon;

                        return (
                          <div
                            key={match.id}
                            className="bg-[#0a1018] rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className={`w-4 h-4 ${type.color}`} />
                              <span className="text-sm text-white">{type.label}</span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {match.users.join(', ')}
                            </p>
                            <p className="text-xs text-slate-600">
                              {match.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="bg-[#0f1520]/30 rounded-xl border border-[#1a2535] p-4">
                    <h3 className="font-semibold text-white mb-3">Legend</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#142030] border border-[#1a2535]" />
                        <span className="text-slate-400">Not logged</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-rose-500/20 border border-rose-500" />
                        <span className="text-slate-400">Logged by you</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-green-500/20 border border-green-500" />
                        <span className="text-slate-400">Matched with others!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* BINGO PHASE */}
          {phase === 'bingo' && (
            <motion.div
              key="bingo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <motion.div
                className="text-center space-y-6"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="relative">
                  <Trophy className="w-24 h-24 text-yellow-400 mx-auto" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      rotate: 360,
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-8 h-8 text-yellow-400 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4" />
                    <Sparkles className="w-8 h-8 text-rose-400 absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4" />
                    <Sparkles className="w-8 h-8 text-cyan-400 absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2" />
                    <Sparkles className="w-8 h-8 text-cyan-400 absolute right-0 top-1/2 translate-x-4 -translate-y-1/2" />
                  </motion.div>
                </div>

                <h1 className="text-5xl font-bold text-yellow-400">BINGO!</h1>
                <p className="text-xl text-slate-300">
                  You completed a synchronicity line!
                </p>

                <div className="bg-[#0f1520]/80 rounded-xl border border-yellow-500/30 p-6 max-w-md">
                  <p className="text-slate-400 mb-4">
                    {loggedCount} synchronicities logged today, with {matchedCount} global matches!
                  </p>
                  <p className="text-sm text-slate-500">
                    The universe seems to be speaking through meaningful coincidences.
                    Keep paying attention to the patterns around you.
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={startGame}
                    className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                  >
                    New Card
                  </button>
                  <button
                    onClick={() => (window.location.href = '/experiments')}
                    className="bg-[#142030] hover:bg-[#1a2535] text-white px-8 py-3 rounded-xl font-semibold transition-all"
                  >
                    Return to Experiments
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
