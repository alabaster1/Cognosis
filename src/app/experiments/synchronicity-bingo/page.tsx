'use client';

import { useState, useCallback } from 'react';
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

interface BingoStatistics {
  cellsToComplete: number;
  expectedCells: number;
  zScore: number;
  pValue: number;
  significance: string;
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

  // drand and dynamic events state
  const [drandRound, setDrandRound] = useState<number | null>(null);
  const [randomnessSource, setRandomnessSource] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<string | null>(null);
  const [bingoStatistics, setBingoStatistics] = useState<BingoStatistics | null>(null);
  const [eventDescription, setEventDescription] = useState('');
  const [suggestedCellIndex, setSuggestedCellIndex] = useState<number | null>(null);
  const [showDescriptionInput, setShowDescriptionInput] = useState<number | null>(null);

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

  // Helper: map event text to SynchronicityType with icon/color
  const FALLBACK_ICONS = [Sparkles, Star, Bell, Heart, Lightbulb, Compass, Feather, Gift, Key, Map, Moon, Sun, Cloud, Bird, Flower2, Trophy, Phone, Music, Book, Clock, MessageCircle, Users, Calendar, Check];
  const FALLBACK_COLORS = ['text-rose-400', 'text-cyan-400', 'text-amber-400', 'text-emerald-400', 'text-violet-400', 'text-pink-400', 'text-sky-400', 'text-lime-400', 'text-orange-400', 'text-teal-400', 'text-indigo-400', 'text-yellow-400', 'text-green-400', 'text-red-400', 'text-blue-400', 'text-slate-400'];

  const eventToType = (eventText: string, index: number): SynchronicityType => {
    if (eventText === 'FREE') {
      return SYNCHRONICITY_TYPES.find((t) => t.id === 'free')!;
    }
    // Try to match to existing static types by keyword
    const lower = eventText.toLowerCase();
    const matched = SYNCHRONICITY_TYPES.find((t) =>
      t.id !== 'free' && (lower.includes(t.label.toLowerCase()) || t.description.toLowerCase().includes(lower.slice(0, 20)))
    );
    if (matched) return matched;
    // Create dynamic type from event text
    const label = eventText.length > 20 ? eventText.slice(0, 18) + '...' : eventText;
    return {
      id: `dynamic_${index}`,
      label,
      description: eventText,
      icon: FALLBACK_ICONS[index % FALLBACK_ICONS.length],
      color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    };
  };

  // Initialize the game
  const startGame = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Use the new generate-card endpoint with drand + AI events
      const result = await apiService.generateSynchronicityBingoCard({
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.commitmentId || result.cardId);
      setNonce(result.nonce || '');
      localStorage.setItem(`sync_bingo_session_${result.cardId}`, result.nonce || '');

      // Store drand info
      if (result.drandRound) setDrandRound(result.drandRound);
      if (result.randomnessSource) setRandomnessSource(result.randomnessSource);
      if (result.eventSource) setEventSource(result.eventSource);

      // Build bingo card from backend events or fallback to static types
      let cells: BingoCell[];

      if (result.events && result.events.length >= 25) {
        // Use dynamic events from backend (already ordered with gridOrder applied, FREE at center)
        cells = result.events.map((eventText, idx) => {
          const type = eventToType(eventText, idx);
          return {
            type,
            logged: type.id === 'free',
            loggedAt: type.id === 'free' ? new Date() : null,
            matchedWith: null,
          };
        });
      } else {
        // Fallback: use static types with gridOrder permutation
        const order = result.gridOrder || Array.from({ length: 25 }, (_, i) => i);
        const nonFreeTypes = SYNCHRONICITY_TYPES.filter((t) => t.id !== 'free');
        const freeType = SYNCHRONICITY_TYPES.find((t) => t.id === 'free')!;
        cells = order.map((permIdx) => {
          if (permIdx === 12) {
            return { type: freeType, logged: true, loggedAt: new Date(), matchedWith: null };
          }
          const typeIdx = permIdx > 12 ? permIdx - 1 : permIdx;
          const type = nonFreeTypes[typeIdx % nonFreeTypes.length];
          return { type, logged: false, loggedAt: null, matchedWith: null };
        });
      }

      setBingoCard(cells);
      setTodayDate(new Date().toLocaleDateString());
      setHasBingo(false);
      setBingoLine([]);
      setBingoStatistics(null);
      setSuggestedCellIndex(null);
      setShowDescriptionInput(null);
      setEventDescription('');

      setIsLoading(false);
      setPhase('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setIsLoading(false);
    }
  };

  // Show description input for a cell
  const handleCellClick = (index: number) => {
    if (bingoCard[index].logged || hasBingo) return;
    setShowDescriptionInput(index);
    setEventDescription('');
    setSuggestedCellIndex(null);
  };

  // Log a synchronicity (with optional description for embedding matching)
  const logSynchronicity = async (index: number, description?: string) => {
    if (bingoCard[index].logged || hasBingo) return;

    const type = bingoCard[index].type;
    setShowDescriptionInput(null);

    // Submit to backend
    try {
      const result = await apiService.logSynchronicity({
        commitmentId,
        synchronicityType: type.id,
        cellIndex: index,
        description: description || undefined,
      });

      // Show suggested cell if embedding matching found a better match
      if (result.suggestedCell !== undefined && result.suggestedCell !== null && result.suggestedCell !== index) {
        setSuggestedCellIndex(result.suggestedCell);
      }

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

          // Check bingo with backend for statistics
          apiService.checkSynchronicityBingo({
            commitmentId,
            nonce,
          }).then((checkResult) => {
            if (checkResult.statistics) {
              setBingoStatistics(checkResult.statistics);
            }
          }).catch(() => {});

          // Submit bingo completion to feed
          apiService.submitToFeed({
            experimentType: 'synchronicity-bingo',
            score: updated.filter((c) => c.logged).length,
            accuracy: 100,
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
            users: result.matchedWith ? ['You', result.matchedWith as string] : ['You'],
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
              className="max-w-3xl mx-auto"
            >
              {/* Floating sparkle particles */}
              <div className="relative">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-rose-400/60"
                    style={{
                      left: `${10 + (i * 7) % 80}%`,
                      top: `${5 + (i * 13) % 60}%`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5, 0.5],
                      y: [0, -20, 0],
                    }}
                    transition={{ duration: 3 + i * 0.3, delay: i * 0.4, repeat: Infinity }}
                  />
                ))}

                {/* Animated mini bingo grid */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <div className="absolute inset-0 grid grid-cols-5 gap-0.5">
                    {[...Array(25)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="rounded-sm"
                        style={{ backgroundColor: i === 12 ? 'rgba(244,63,94,0.4)' : 'rgba(244,63,94,0.1)' }}
                        animate={
                          [3, 7, 12, 17, 21].includes(i)
                            ? { backgroundColor: ['rgba(244,63,94,0.1)', 'rgba(244,63,94,0.5)', 'rgba(244,63,94,0.1)'] }
                            : {}
                        }
                        transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                  </div>
                  {/* Diagonal line flash */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{ opacity: [0, 0.6, 0] }}
                    transition={{ duration: 3, delay: 2, repeat: Infinity }}
                  >
                    <div className="absolute top-0 left-0 w-full h-full"
                      style={{
                        background: 'linear-gradient(135deg, transparent 45%, rgba(244,63,94,0.3) 49%, rgba(244,63,94,0.3) 51%, transparent 55%)',
                      }}
                    />
                  </motion.div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                  <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
                    <span className="text-rose-400">SYNCHRONICITY</span>
                    <br />
                    <span className="text-pink-300/80 text-3xl md:text-4xl font-light tracking-[0.3em]">BINGO</span>
                  </h1>
                  <p className="text-slate-500 text-sm mt-3 tracking-wide">Meaningful Coincidence Tracker</p>
                </div>
              </div>

              {/* Sample synchronicity types */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {SYNCHRONICITY_TYPES.slice(0, 8).map((type, i) => {
                  const Icon = type.icon;
                  return (
                    <motion.div
                      key={type.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-500/20"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      whileHover={{ scale: 1.05, borderColor: 'rgba(244,63,94,0.5)' }}
                    >
                      <Icon className={`w-3 h-3 ${type.color}`} />
                      <span className="text-xs text-rose-200/80">{type.label}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* How it works - compact */}
              <div className="grid grid-cols-4 gap-2 mb-8">
                {[
                  { n: '1', label: 'Get Card', desc: 'Daily 5x5' },
                  { n: '2', label: 'Log Events', desc: 'As they happen' },
                  { n: '3', label: 'Match', desc: 'Global sync' },
                  { n: '4', label: 'BINGO!', desc: '5 in a row' },
                ].map((step, i) => (
                  <motion.div
                    key={step.n}
                    className="text-center p-3 rounded-xl bg-[#0f0a14]/60 border border-rose-900/40"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                  >
                    <div className="w-6 h-6 mx-auto mb-1.5 rounded-full bg-rose-500/20 text-rose-400 text-xs flex items-center justify-center font-bold">
                      {step.n}
                    </div>
                    <div className="text-xs font-medium text-rose-300">{step.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{step.desc}</div>
                  </motion.div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-6 mb-8 text-xs text-slate-500">
                <span>25 TYPES</span>
                <span className="text-rose-700">|</span>
                <span>GLOBAL SYNC</span>
                <span className="text-rose-700">|</span>
                <span>DAILY CARDS</span>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-center">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* CTA */}
              <motion.button
                onClick={startGame}
                disabled={isLoading}
                className="w-full px-8 py-4 bg-gradient-to-r from-rose-600 to-pink-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-rose-500/40 transition-all flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-rose-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin relative" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 relative" />
                    <span className="relative">Get Today&apos;s Card</span>
                  </>
                )}
              </motion.button>
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
                            onClick={() => handleCellClick(index)}
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
                  {/* drand Verification Badge */}
                  {drandRound && (
                    <div className="bg-green-950/30 rounded-xl border border-green-500/20 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-medium text-green-400">Verifiable Randomness</span>
                      </div>
                      <p className="text-[10px] text-green-300/60">
                        drand round #{drandRound} ({randomnessSource || 'drand_quicknet'})
                      </p>
                      {eventSource && (
                        <p className="text-[10px] text-green-300/60 mt-0.5">
                          Events: {eventSource === 'gemini_dynamic' ? 'AI-generated' : 'Static pool'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Suggested Cell Indicator */}
                  {suggestedCellIndex !== null && (
                    <div className="bg-amber-950/30 rounded-xl border border-amber-500/20 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-medium text-amber-400">AI Suggestion</span>
                      </div>
                      <p className="text-[10px] text-amber-300/60">
                        Your description best matches cell #{suggestedCellIndex + 1}: &quot;{bingoCard[suggestedCellIndex]?.type.label}&quot;
                      </p>
                      <button
                        onClick={() => setSuggestedCellIndex(null)}
                        className="text-[10px] text-amber-400/60 hover:text-amber-400 mt-1"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

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

              {/* Description Input Modal */}
              {showDescriptionInput !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                  onClick={() => setShowDescriptionInput(null)}
                >
                  <div
                    className="bg-[#0f1520] rounded-2xl border border-rose-500/30 p-6 max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Log: {bingoCard[showDescriptionInput]?.type.label}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {bingoCard[showDescriptionInput]?.type.description}
                    </p>
                    <textarea
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Describe what happened (optional - helps AI match events)..."
                      className="w-full bg-[#0a1018] border border-[#1a2535] rounded-lg p-3 text-sm text-white placeholder-slate-600 resize-none h-24 focus:outline-none focus:border-rose-500/50"
                    />
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => logSynchronicity(showDescriptionInput, eventDescription || undefined)}
                        className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 text-white py-2.5 rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-rose-500/20 transition-all"
                      >
                        Log Event
                      </button>
                      <button
                        onClick={() => setShowDescriptionInput(null)}
                        className="px-4 bg-[#1a2535] text-slate-400 py-2.5 rounded-lg text-sm hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
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

                {/* Statistics */}
                {bingoStatistics && (
                  <div className="bg-[#0f1520]/80 rounded-xl border border-purple-500/30 p-4 max-w-md">
                    <h3 className="text-sm font-semibold text-purple-400 mb-3">Bingo Statistics</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Cells to bingo:</span>
                        <span className="text-white ml-2 font-mono">{bingoStatistics.cellsToComplete}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Expected:</span>
                        <span className="text-white ml-2 font-mono">{bingoStatistics.expectedCells}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">z-score:</span>
                        <span className="text-white ml-2 font-mono">{bingoStatistics.zScore.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">p-value:</span>
                        <span className="text-white ml-2 font-mono">{bingoStatistics.pValue.toFixed(4)}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        bingoStatistics.significance === 'significant'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {bingoStatistics.significance === 'significant' ? 'Statistically Significant' : 'Not Significant'}
                      </span>
                    </div>
                  </div>
                )}

                {/* drand Badge in Results */}
                {drandRound && (
                  <div className="bg-green-950/30 rounded-lg border border-green-500/20 px-4 py-2 max-w-md">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-xs text-green-400">
                        Verified via drand #{drandRound} ({randomnessSource || 'drand_quicknet'})
                      </span>
                    </div>
                  </div>
                )}

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
