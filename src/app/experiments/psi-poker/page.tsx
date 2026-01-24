'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import apiService from '@/services/apiService';
import { useWalletStore } from '@/store/useWalletStore';
import RevealModal, { StatsSummary } from '@/components/modals/RevealModal';
import {
  Loader2,
  Spade,
  Heart,
  Diamond,
  Club,
  Eye,
  Brain,
  Trophy,
  Users,
  Sparkles,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';

type Phase = 'intro' | 'meditation' | 'predict_opponents' | 'predict_community' | 'reveal' | 'results' | 'success';
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  suit: Suit;
  rank: Rank;
}

interface Player {
  id: string;
  name: string;
  isYou: boolean;
  hand: Card[];
  predictedHand: Card[] | null;
}

interface CommunityCards {
  flop: Card[];
  turn: Card | null;
  river: Card | null;
}

interface Prediction {
  opponentHands: Record<string, Card[]>;
  communityCards: Card[];
}

interface Results {
  opponentAccuracy: number;
  communityAccuracy: number;
  totalAccuracy: number;
  correctOpponentCards: number;
  totalOpponentCards: number;
  correctCommunityCards: number;
  totalCommunityCards: number;
  performance: string;
  pValue: number;
  commitmentHash?: string;
  verified?: boolean;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const BASELINE = 7.7; // ~1/13 chance for rank match

const SIMULATED_PLAYERS = ['MindReader_7x', 'CardSense_3k', 'PsiPlayer_9m'];

const SuitIcon = ({ suit, className }: { suit: Suit; className?: string }) => {
  const icons = {
    hearts: Heart,
    diamonds: Diamond,
    clubs: Club,
    spades: Spade,
  };
  const Icon = icons[suit];
  const color = suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-gray-800';
  return <Icon className={`${color} ${className}`} fill="currentColor" />;
};

export default function PsiPokerPage() {
  const wallet = useWalletStore((state) => state.wallet);
  const [phase, setPhase] = useState<Phase>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [commitmentHash, setCommitmentHash] = useState('');
  const [nonce, setNonce] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<CommunityCards>({
    flop: [],
    turn: null,
    river: null,
  });
  const [deck, setDeck] = useState<Card[]>([]);
  const [predictions, setPredictions] = useState<Prediction>({
    opponentHands: {},
    communityCards: [],
  });
  const [currentPredictingPlayer, setCurrentPredictingPlayer] = useState(0);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [results, setResults] = useState<Results | null>(null);

  // Deal cards from deck (deck comes from backend)
  const dealCards = useCallback((shuffledDeck: Card[], numOpponents: number) => {
    let deckIndex = 0;

    // Create players
    const yourName = wallet?.address ? `You_${wallet.address.slice(-4)}` : 'You';
    const newPlayers: Player[] = [
      { id: 'you', name: yourName, isYou: true, hand: [], predictedHand: null },
    ];

    // Add opponents (count from backend)
    for (let i = 0; i < numOpponents; i++) {
      newPlayers.push({
        id: `opponent-${i}`,
        name: SIMULATED_PLAYERS[i],
        isYou: false,
        hand: [],
        predictedHand: null,
      });
    }

    // Deal 2 cards to each player
    for (const player of newPlayers) {
      player.hand = [shuffledDeck[deckIndex++], shuffledDeck[deckIndex++]];
    }

    // Deal community cards (but don't reveal yet)
    const flop = [
      shuffledDeck[deckIndex++],
      shuffledDeck[deckIndex++],
      shuffledDeck[deckIndex++],
    ];
    const turn = shuffledDeck[deckIndex++];
    const river = shuffledDeck[deckIndex++];

    return {
      players: newPlayers,
      community: { flop, turn, river },
      remainingDeck: shuffledDeck.slice(deckIndex),
    };
  }, [wallet]);

  const startMeditation = async () => {
    setPhase('meditation');
    setIsLoading(true);
    setError('');

    try {
      // Call backend to generate shuffled deck with cryptographic commitment
      const result = await apiService.generatePsiPokerTarget({
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      setCommitmentId(result.commitmentId);
      setCommitmentHash(result.commitmentHash);
      setNonce(result.nonce);
      localStorage.setItem(`psi_poker_nonce_${result.commitmentId}`, result.nonce);

      // Backend provides: shuffledDeck (array of card indices), numOpponents
      // Convert card indices to Card objects
      const shuffledDeck: Card[] = result.shuffledDeck.map((cardIndex: number) => {
        const suitIndex = Math.floor(cardIndex / 13);
        const rankIndex = cardIndex % 13;
        return { suit: SUITS[suitIndex], rank: RANKS[rankIndex] };
      });

      // Deal cards using backend-provided deck
      const dealt = dealCards(shuffledDeck, result.numOpponents);
      setPlayers(dealt.players);
      setCommunityCards(dealt.community);
      setDeck(dealt.remainingDeck);

      // Initialize predictions
      const opponentPredictions: Record<string, Card[]> = {};
      dealt.players.filter((p) => !p.isYou).forEach((p) => {
        opponentPredictions[p.id] = [];
      });
      setPredictions({
        opponentHands: opponentPredictions,
        communityCards: [],
      });

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game');
      setPhase('intro');
      setIsLoading(false);
    }
  };

  const startPredicting = () => {
    setCurrentPredictingPlayer(0);
    setSelectedCards([]);
    setPhase('predict_opponents');
  };

  const handleCardSelect = (card: Card) => {
    const isSelected = selectedCards.some(
      (c) => c.suit === card.suit && c.rank === card.rank
    );

    if (isSelected) {
      setSelectedCards((prev) =>
        prev.filter((c) => !(c.suit === card.suit && c.rank === card.rank))
      );
    } else {
      const maxCards = phase === 'predict_opponents' ? 2 : 5;
      if (selectedCards.length < maxCards) {
        setSelectedCards((prev) => [...prev, card]);
      }
    }
  };

  const confirmOpponentPrediction = () => {
    if (selectedCards.length !== 2) return;

    const opponents = players.filter((p) => !p.isYou);
    const currentOpponent = opponents[currentPredictingPlayer];

    setPredictions((prev) => ({
      ...prev,
      opponentHands: {
        ...prev.opponentHands,
        [currentOpponent.id]: [...selectedCards],
      },
    }));

    setSelectedCards([]);

    if (currentPredictingPlayer < opponents.length - 1) {
      setCurrentPredictingPlayer((prev) => prev + 1);
    } else {
      setPhase('predict_community');
    }
  };

  const confirmCommunityPrediction = () => {
    if (selectedCards.length !== 5) return;

    setPredictions((prev) => ({
      ...prev,
      communityCards: [...selectedCards],
    }));

    setPhase('reveal');
  };

  // Convert card to index for API
  const cardToIndex = (card: Card): number => {
    const suitIndex = SUITS.indexOf(card.suit);
    const rankIndex = RANKS.indexOf(card.rank);
    return suitIndex * 13 + rankIndex;
  };

  const revealAndScore = async () => {
    setPhase('results');
    setIsLoading(true);

    try {
      // Retrieve stored nonce
      const storedNonce = localStorage.getItem(`psi_poker_nonce_${commitmentId}`) || nonce;

      // Prepare predictions for API
      const opponentPredictions = Object.entries(predictions.opponentHands).map(([opponentId, cards]) => ({
        opponentId,
        predictedCards: cards.map(cardToIndex),
      }));

      const communityPredictions = predictions.communityCards.map(cardToIndex);

      // Call reveal API
      const revealResult = await apiService.revealPsiPoker({
        commitmentId,
        opponentPredictions,
        communityPredictions,
        nonce: storedNonce,
        verified: !!(wallet as { isVerified?: boolean })?.isVerified,
      });

      // Determine performance label
      let performance = 'Average';
      if (revealResult.totalAccuracy >= 40) performance = 'Exceptional';
      else if (revealResult.totalAccuracy >= 30) performance = 'Excellent';
      else if (revealResult.totalAccuracy >= 20) performance = 'Good';
      else if (revealResult.totalAccuracy < 10) performance = 'Below Average';

      setResults({
        opponentAccuracy: revealResult.opponentAccuracy,
        communityAccuracy: revealResult.communityAccuracy,
        totalAccuracy: revealResult.totalAccuracy,
        correctOpponentCards: revealResult.correctOpponentCards,
        totalOpponentCards: revealResult.totalOpponentCards,
        correctCommunityCards: revealResult.correctCommunityCards,
        totalCommunityCards: 5,
        performance,
        pValue: revealResult.pValue,
        commitmentHash: revealResult.commitmentHash,
        verified: revealResult.verified,
      });

      // Submit to global feed
      await apiService.submitToFeed({
        experimentType: 'psi-poker',
        score: revealResult.correctOpponentCards + revealResult.correctCommunityCards,
        accuracy: revealResult.totalAccuracy,
        baseline: BASELINE,
        commitmentHash: revealResult.commitmentHash,
        verified: revealResult.verified,
      });

      // Clean up stored nonce
      localStorage.removeItem(`psi_poker_nonce_${commitmentId}`);

      setIsLoading(false);
      setPhase('success');
    } catch (err) {
      console.error('Reveal error:', err);
      // Fallback: calculate locally
      let correctOpponentCards = 0;
      let totalOpponentCards = 0;

      const opponents = players.filter((p) => !p.isYou);
      opponents.forEach((opponent) => {
        const predicted = predictions.opponentHands[opponent.id] || [];
        const actual = opponent.hand;

        predicted.forEach((predictedCard) => {
          totalOpponentCards++;
          if (actual.some((actualCard) => actualCard.rank === predictedCard.rank)) {
            correctOpponentCards++;
          }
        });
      });

      let correctCommunityCards = 0;
      const actualCommunity = [
        ...communityCards.flop,
        communityCards.turn!,
        communityCards.river!,
      ];

      predictions.communityCards.forEach((predictedCard) => {
        if (actualCommunity.some((actualCard) => actualCard.rank === predictedCard.rank)) {
          correctCommunityCards++;
        }
      });

      const opponentAccuracy = totalOpponentCards > 0
        ? (correctOpponentCards / totalOpponentCards) * 100
        : 0;
      const communityAccuracy = (correctCommunityCards / 5) * 100;
      const totalCorrect = correctOpponentCards + correctCommunityCards;
      const totalCards = totalOpponentCards + 5;
      const totalAccuracy = (totalCorrect / totalCards) * 100;

      const n = totalCards;
      const k = totalCorrect;
      const p = 1 / 13;
      const expectedHits = n * p;
      const stdDev = Math.sqrt(n * p * (1 - p));
      const zScore = stdDev > 0 ? (k - expectedHits) / stdDev : 0;
      const pValue = 1 - (0.5 * (1 + Math.tanh(zScore * 0.7)));

      let performance = 'Average';
      if (totalAccuracy >= 40) performance = 'Exceptional';
      else if (totalAccuracy >= 30) performance = 'Excellent';
      else if (totalAccuracy >= 20) performance = 'Good';
      else if (totalAccuracy < 10) performance = 'Below Average';

      setResults({
        opponentAccuracy,
        communityAccuracy,
        totalAccuracy,
        correctOpponentCards,
        totalOpponentCards,
        correctCommunityCards,
        totalCommunityCards: 5,
        performance,
        pValue,
      });

      setIsLoading(false);
      setPhase('success');
    }
  };

  const opponents = players.filter((p) => !p.isYou);
  const currentOpponent = opponents[currentPredictingPlayer];
  const you = players.find((p) => p.isYou);

  // Card rendering helper
  const renderCard = (card: Card, size: 'sm' | 'md' | 'lg' = 'md', faceDown = false) => {
    const sizeClasses = {
      sm: 'w-10 h-14 text-xs',
      md: 'w-14 h-20 text-sm',
      lg: 'w-20 h-28 text-lg',
    };

    if (faceDown) {
      return (
        <div
          className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-400 flex items-center justify-center`}
        >
          <div className="w-3/4 h-3/4 border border-blue-300 rounded opacity-50" />
        </div>
      );
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

    return (
      <div
        className={`${sizeClasses[size]} bg-white rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center gap-1 shadow-md`}
      >
        <span className={`font-bold ${isRed ? 'text-red-500' : 'text-gray-800'}`}>
          {card.rank}
        </span>
        <SuitIcon suit={card.suit} className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6'} />
      </div>
    );
  };

  // Selectable card for predictions
  const renderSelectableCard = (card: Card) => {
    const isSelected = selectedCards.some(
      (c) => c.suit === card.suit && c.rank === card.rank
    );
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

    return (
      <motion.button
        key={`${card.suit}-${card.rank}`}
        onClick={() => handleCardSelect(card)}
        className={`w-10 h-14 bg-white rounded-lg border-2 flex flex-col items-center justify-center text-xs transition-all ${
          isSelected
            ? 'border-cyan-500 ring-2 ring-cyan-500/50 scale-110'
            : 'border-gray-300 hover:border-cyan-300'
        }`}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className={`font-bold ${isRed ? 'text-red-500' : 'text-gray-800'}`}>
          {card.rank}
        </span>
        <SuitIcon suit={card.suit} className="w-3 h-3" />
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {/* INTRO PHASE */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative"
            >
              {/* Felt table gradient */}
              <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_50%_30%,_rgba(5,46,22,0.4)_0%,_transparent_70%)] pointer-events-none" />

              <div className="relative z-10 text-center pt-8">
                {/* Fanned card suits */}
                <motion.div
                  className="inline-flex gap-1 mb-6"
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {[
                    { Icon: Spade, color: 'text-slate-300', rotate: -15 },
                    { Icon: Heart, color: 'text-red-400', rotate: -5 },
                    { Icon: Diamond, color: 'text-red-400', rotate: 5 },
                    { Icon: Club, color: 'text-slate-300', rotate: 15 },
                  ].map(({ Icon, color, rotate }, i) => (
                    <motion.div
                      key={i}
                      className="w-16 h-22 bg-white rounded-lg flex items-center justify-center shadow-xl relative"
                      style={{ rotate: `${rotate}deg`, zIndex: 4 - Math.abs(rotate) / 5 }}
                      initial={{ y: -50, opacity: 0, rotate: rotate - 20 }}
                      animate={{ y: 0, opacity: 1, rotate }}
                      transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 200 }}
                      whileHover={{ y: -8, scale: 1.05 }}
                    >
                      <div className="py-5 px-3">
                        <Icon className={`w-7 h-7 ${color}`} fill="currentColor" />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.h1
                  className="text-5xl md:text-7xl font-black mb-2"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-teal-300 bg-clip-text text-transparent">
                    PSI
                  </span>
                  <br />
                  <span className="text-3xl md:text-4xl font-black tracking-wider text-white/80">
                    POKER
                  </span>
                </motion.h1>

                <motion.div
                  className="flex items-center justify-center gap-3 mt-4 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300/70 text-sm">Telepathy + Precognition</span>
                  <Eye className="w-4 h-4 text-emerald-400" />
                </motion.div>

                <motion.p
                  className="text-slate-400 max-w-sm mx-auto text-sm mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  Read your opponents&apos; minds and foresee the cards yet to come.
                  Can you beat a deck stacked by fate?
                </motion.p>
              </div>

              {/* Poker table layout */}
              <motion.div
                className="relative my-10 mx-auto max-w-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 }}
              >
                {/* Oval table */}
                <div className="relative w-full aspect-[16/10] rounded-[50%] bg-gradient-to-b from-emerald-950/60 to-green-950/40 border-2 border-emerald-700/40 shadow-[inset_0_0_40px_rgba(16,185,129,0.1)] flex items-center justify-center">
                  {/* Community cards area */}
                  <div className="flex gap-1.5">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-8 h-11 rounded bg-emerald-800/50 border border-emerald-600/30 flex items-center justify-center"
                        initial={{ rotateY: 180 }}
                        animate={{ rotateY: [180, 0, 180] }}
                        transition={{ duration: 3, delay: 1.2 + i * 0.2, repeat: Infinity, repeatDelay: 5 }}
                      >
                        <span className="text-emerald-400/40 text-xs">?</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Opponent positions */}
                  {[
                    { top: '-12px', left: '50%', transform: 'translateX(-50%)' },
                    { top: '30%', left: '-8px' },
                    { top: '30%', right: '-8px' },
                  ].map((pos, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-7 h-7 rounded-full bg-[#0a0e14] border border-emerald-500/40 flex items-center justify-center"
                      style={pos}
                      animate={{ borderColor: ['rgba(16,185,129,0.4)', 'rgba(16,185,129,0.8)', 'rgba(16,185,129,0.4)'] }}
                      transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                    </motion.div>
                  ))}

                  {/* Your position */}
                  <motion.div
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600/30 border border-emerald-400/50 rounded-full"
                    animate={{ boxShadow: ['0 0 0 rgba(16,185,129,0)', '0 0 15px rgba(16,185,129,0.3)', '0 0 0 rgba(16,185,129,0)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-[10px] text-emerald-300 font-medium">YOU</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="flex justify-center gap-6 mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
              >
                <div>
                  <div className="text-2xl font-bold text-emerald-400">7.7%</div>
                  <div className="text-[10px] text-slate-500 uppercase">Baseline</div>
                </div>
                <div className="w-px bg-[#1a2535]" />
                <div>
                  <div className="text-2xl font-bold text-green-400">2+3</div>
                  <div className="text-[10px] text-slate-500 uppercase">Opponents</div>
                </div>
                <div className="w-px bg-[#1a2535]" />
                <div>
                  <div className="text-2xl font-bold text-teal-400">13</div>
                  <div className="text-[10px] text-slate-500 uppercase">Ranks</div>
                </div>
              </motion.div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* CTA */}
              <motion.button
                onClick={startMeditation}
                disabled={isLoading}
                className="w-full relative group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
                <div className="relative px-8 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Spade className="w-5 h-5" fill="currentColor" />
                      Deal Me In
                    </>
                  )}
                </div>
              </motion.button>
            </motion.div>
          )}

          {/* MEDITATION PHASE */}
          {phase === 'meditation' && (
            <motion.div
              key="meditation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="text-center space-y-6">
                {isLoading ? (
                  <>
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin" />
                      <Spade className="absolute inset-0 m-auto w-10 h-10 text-emerald-400" fill="currentColor" />
                    </div>
                    <p className="text-xl text-slate-300">Shuffling and dealing...</p>
                  </>
                ) : (
                  <>
                    <div className="p-6 bg-emerald-500/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <Eye className="w-12 h-12 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Cards Dealt!</h2>
                    <p className="text-slate-400 max-w-md">
                      Each player has 2 hidden cards. Your hand is shown below.
                      Now predict what your opponents are holding!
                    </p>

                    {/* Show your hand */}
                    {you && (
                      <div className="flex justify-center gap-2">
                        {you.hand.map((card, i) => (
                          <div key={i}>{renderCard(card, 'lg')}</div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={startPredicting}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                    >
                      Start Predicting
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* PREDICT OPPONENTS PHASE */}
          {phase === 'predict_opponents' && currentOpponent && (
            <motion.div
              key="predict_opponents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">
                    Predicting opponent {currentPredictingPlayer + 1} of {opponents.length}
                  </span>
                  <span className="text-emerald-400">
                    {selectedCards.length}/2 selected
                  </span>
                </div>
              </div>

              <div className="bg-[#0f1520]/30 rounded-2xl border border-[#1a2535] p-6">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 text-lg font-semibold text-white mb-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>{currentOpponent.name.split('_')[0]}&apos;s Hand</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Use telepathy to sense what 2 cards they&apos;re holding
                  </p>

                  {/* Show face-down cards */}
                  <div className="flex justify-center gap-2 my-4">
                    {renderCard({ suit: 'spades', rank: 'A' }, 'md', true)}
                    {renderCard({ suit: 'spades', rank: 'A' }, 'md', true)}
                  </div>
                </div>

                {/* Card selector */}
                <div className="bg-[#0a1018] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Select 2 cards:</h3>
                  <div className="space-y-3">
                    {SUITS.map((suit) => (
                      <div key={suit} className="flex flex-wrap gap-1 justify-center">
                        {RANKS.map((rank) => renderSelectableCard({ suit, rank }))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected cards preview */}
                {selectedCards.length > 0 && (
                  <div className="mt-4 flex justify-center gap-2">
                    {selectedCards.map((card, i) => (
                      <div key={i}>{renderCard(card, 'md')}</div>
                    ))}
                  </div>
                )}

                <button
                  onClick={confirmOpponentPrediction}
                  disabled={selectedCards.length !== 2}
                  className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  Confirm Prediction
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* PREDICT COMMUNITY PHASE */}
          {phase === 'predict_community' && (
            <motion.div
              key="predict_community"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#0f1520]/80 rounded-xl border border-[#1a2535] p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Predicting community cards</span>
                  <span className="text-emerald-400">{selectedCards.length}/5 selected</span>
                </div>
              </div>

              <div className="bg-[#0f1520]/30 rounded-2xl border border-[#1a2535] p-6">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 text-lg font-semibold text-white mb-2">
                    <Eye className="w-5 h-5 text-emerald-400" />
                    <span>Community Cards</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Use precognition to predict the 5 community cards (Flop + Turn + River)
                  </p>

                  {/* Show face-down community cards */}
                  <div className="flex justify-center gap-2 my-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i}>{renderCard({ suit: 'spades', rank: 'A' }, 'md', true)}</div>
                    ))}
                  </div>
                </div>

                {/* Card selector */}
                <div className="bg-[#0a1018] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">Select 5 cards:</h3>
                  <div className="space-y-3">
                    {SUITS.map((suit) => (
                      <div key={suit} className="flex flex-wrap gap-1 justify-center">
                        {RANKS.map((rank) => renderSelectableCard({ suit, rank }))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected cards preview */}
                {selectedCards.length > 0 && (
                  <div className="mt-4 flex justify-center gap-2">
                    {selectedCards.map((card, i) => (
                      <div key={i}>{renderCard(card, 'md')}</div>
                    ))}
                  </div>
                )}

                <button
                  onClick={confirmCommunityPrediction}
                  disabled={selectedCards.length !== 5}
                  className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all"
                >
                  Reveal All Cards
                </button>
              </div>
            </motion.div>
          )}

          {/* REVEAL PHASE */}
          {phase === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#0f1520]/30 rounded-2xl border border-[#1a2535] p-6 text-center">
                <h2 className="text-xl font-bold text-white mb-6">The Big Reveal!</h2>

                {/* Community cards */}
                <div className="mb-8">
                  <h3 className="text-sm text-slate-400 mb-3">Community Cards</h3>
                  <div className="flex justify-center gap-2">
                    {communityCards.flop.map((card, i) => (
                      <div key={`flop-${i}`}>{renderCard(card, 'md')}</div>
                    ))}
                    {communityCards.turn && renderCard(communityCards.turn, 'md')}
                    {communityCards.river && renderCard(communityCards.river, 'md')}
                  </div>
                </div>

                {/* Player hands */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-4 rounded-xl ${
                        player.isYou
                          ? 'bg-emerald-500/20 border border-emerald-500'
                          : 'bg-[#0a1018] border border-[#1a2535]'
                      }`}
                    >
                      <p className={`text-sm font-semibold mb-2 ${player.isYou ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {player.isYou ? 'You' : player.name.split('_')[0]}
                      </p>
                      <div className="flex justify-center gap-1">
                        {player.hand.map((card, i) => (
                          <div key={i}>{renderCard(card, 'sm')}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={revealAndScore}
                  className="mt-8 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
                >
                  Calculate Score
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULTS LOADING */}
          {phase === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <Loader2 className="w-16 h-16 animate-spin text-emerald-500 mb-4" />
              <p className="text-xl text-slate-300">Analyzing your psi abilities...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULTS MODAL */}
        <RevealModal
          isOpen={phase === 'success' && results !== null}
          onClose={() => {}}
          onConfirm={() => (window.location.href = '/experiments')}
          title="Psi Poker Complete!"
          experimentType="Psi Poker (Multi-Psi)"
          confirmText="Return to Experiments"
          showVerification={true}
          verificationData={{
            commitmentId,
            nonce,
            timestamp: new Date().toISOString(),
          }}
        >
          {results && (
            <div className="space-y-6">
              <StatsSummary
                stats={[
                  {
                    label: 'Telepathy',
                    value: `${results.correctOpponentCards}/${results.totalOpponentCards}`,
                    trend: results.opponentAccuracy > BASELINE ? 'up' : 'neutral',
                  },
                  {
                    label: 'Precognition',
                    value: `${results.correctCommunityCards}/5`,
                    trend: results.communityAccuracy > BASELINE ? 'up' : 'neutral',
                  },
                  {
                    label: 'Total Accuracy',
                    value: `${results.totalAccuracy.toFixed(1)}%`,
                    trend: results.totalAccuracy > BASELINE ? 'up' : 'neutral',
                  },
                  {
                    label: 'Performance',
                    value: results.performance,
                    trend: results.totalAccuracy > 15 ? 'up' : 'neutral',
                  },
                ]}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a1018] rounded-xl p-4 text-center">
                  <Brain className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Telepathy Score</p>
                  <p className="text-xl font-bold text-white">
                    {results.opponentAccuracy.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0a1018] rounded-xl p-4 text-center">
                  <Eye className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Precognition Score</p>
                  <p className="text-xl font-bold text-white">
                    {results.communityAccuracy.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-emerald-300 mb-2">Statistical Analysis</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>Baseline expectation: {BASELINE.toFixed(1)}% (1 in 13 rank match)</p>
                  <p>Your accuracy: {results.totalAccuracy.toFixed(1)}%</p>
                  <p className={results.pValue < 0.05 ? 'text-green-400' : 'text-slate-400'}>
                    p-value: {results.pValue.toFixed(4)}
                    {results.pValue < 0.05 && ' (statistically significant!)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </RevealModal>
      </main>
    </div>
  );
}
