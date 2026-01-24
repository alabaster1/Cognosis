'use client';

/**
 * Header - Navigation and wallet connection
 */

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import walletService from '@/services/walletService';
import { Brain, User, LogOut, ChevronDown, Eye, Heart, Zap, Cloud, Target, Clock, Wifi, History, Settings, Coins, Award, HelpCircle, UserCircle, FileText, Radio, Grid3X3, RotateCcw, Palette, Spade, Sparkles, Gamepad2, Globe, Dices } from 'lucide-react';

const experimentCategories = [
  {
    id: 'game-like',
    name: 'Game-Like Experiments',
    icon: Gamepad2,
    experiments: [
      { id: 'pattern-oracle', name: 'Pattern Oracle', icon: Grid3X3, isNew: true },
      { id: 'timeline-racer', name: 'Timeline Racer', icon: Zap, isNew: true },
      { id: 'emotion-echo', name: 'Emotion Echo', icon: Palette, isNew: true },
      { id: 'psi-poker', name: 'Psi Poker', icon: Spade, isNew: true },
      { id: 'synchronicity-bingo', name: 'Synchronicity Bingo', icon: Sparkles, isNew: true },
    ],
  },
  {
    id: 'multiplayer',
    name: 'Multiplayer & Global',
    icon: Globe,
    experiments: [
      { id: 'quantum-coin-arena', name: 'Quantum Coin Arena', icon: Coins, isNew: true },
      { id: 'mind-pulse', name: 'Mind Pulse', icon: Radio, isNew: true },
      { id: 'multi-party-telepathy', name: 'Multi-Party Telepathy', icon: Wifi },
      { id: 'global-consciousness', name: 'Global Consciousness', icon: Globe },
    ],
  },
  {
    id: 'remote-viewing',
    name: 'Remote Viewing',
    icon: Eye,
    experiments: [
      { id: 'rv-crv-protocol', name: 'CRV Protocol', icon: Eye },
      { id: 'remote-viewing-images', name: 'RV: Images', icon: Eye },
      { id: 'remote-viewing-locations', name: 'RV: Locations', icon: Eye },
      { id: 'remote-viewing-objects', name: 'RV: Objects', icon: Eye },
    ],
  },
  {
    id: 'telepathy',
    name: 'Telepathy & Empathy',
    icon: Heart,
    experiments: [
      { id: 'telepathy-emotions', name: 'Telepathy: Emotions', icon: Heart },
      { id: 'ai-telepathy', name: 'AI Telepathy', icon: Heart },
      { id: 'telepathy', name: 'Classic Telepathy', icon: Heart },
    ],
  },
  {
    id: 'precognition',
    name: 'Precognition',
    icon: Zap,
    experiments: [
      { id: 'card-prediction', name: 'Card Prediction', icon: Target },
      { id: 'event-forecasting', name: 'Event Forecasting', icon: Zap },
      { id: 'precognition', name: 'General Precognition', icon: Zap },
    ],
  },
  {
    id: 'time-causality',
    name: 'Time & Causality',
    icon: Clock,
    experiments: [
      { id: 'retro-roulette', name: 'Retro Roulette', icon: RotateCcw, isNew: true },
      { id: 'time-loop', name: 'Time-Loop Detection', icon: Clock },
      { id: 'retrocausality', name: 'Retrocausality', icon: Clock },
    ],
  },
  {
    id: 'psychokinesis',
    name: 'Psychokinesis',
    icon: Dices,
    experiments: [
      { id: 'dice-influence', name: 'Dice Influence (PK)', icon: Dices },
      { id: 'psychokinesis', name: 'General PK', icon: Target },
    ],
  },
];

export default function Header() {
  const { wallet, logout } = useWalletStore();
  const [showExperimentsDropdown, setShowExperimentsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const experimentsRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (experimentsRef.current && !experimentsRef.current.contains(event.target as Node)) {
        setShowExperimentsDropdown(false);
        setExpandedCategory(null);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="border-b border-[#1a2535] bg-[#060a0f]/80 backdrop-blur-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <Brain className="w-6 h-6 text-cyan-400" />
          <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
            Cognosis
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {/* Experiments Dropdown */}
          <div className="relative" ref={experimentsRef}>
            <button
              onClick={() => setShowExperimentsDropdown(!showExperimentsDropdown)}
              className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
            >
              Experiments
              <ChevronDown className={`w-4 h-4 transition-transform ${showExperimentsDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showExperimentsDropdown && (
              <div
                className="absolute top-full left-0 mt-2 w-72 bg-[#0f1520] border border-[#1a2535] rounded-lg shadow-xl shadow-black/50 overflow-hidden max-h-[80vh] overflow-y-auto"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) {
                    setShowExperimentsDropdown(false);
                    setExpandedCategory(null);
                  }
                }}
              >
                <Link
                  href="/experiments"
                  className="block px-4 py-3 hover:bg-[#1a2535] transition-colors border-b border-[#1a2535]"
                >
                  <div className="font-semibold">All Experiments</div>
                  <div className="text-xs text-slate-500">Browse all categories</div>
                </Link>
                {experimentCategories.map((category) => (
                  <div key={category.id} className="border-b border-[#1a2535] last:border-0">
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                      className="flex items-center justify-between w-full px-4 py-3 hover:bg-[#1a2535] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <category.icon className="w-5 h-5 text-cyan-400" />
                        <span>{category.name}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedCategory === category.id ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedCategory === category.id && (
                      <div className="bg-[#0a1018] py-1">
                        {category.experiments.map((exp) => (
                          <Link
                            key={exp.id}
                            href={`/experiments/${exp.id}`}
                            className="flex items-center gap-3 px-6 py-2 hover:bg-[#142030] transition-colors text-sm"
                          >
                            <exp.icon className="w-4 h-4 text-slate-400" />
                            <span>{exp.name}</span>
                            {exp.isNew && (
                              <span className="ml-auto px-1.5 py-0.5 bg-emerald-400 text-[#060a0f] text-[10px] font-bold rounded">
                                NEW
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href="/feed" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
            <Radio className="w-4 h-4" />
            Feed
          </Link>
          <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
            Dashboard
          </Link>
          <Link href="/tokenomics" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
            <Coins className="w-4 h-4" />
            Tokenomics
          </Link>
          <Link href="/about" className="hover:text-cyan-400 transition-colors">
            About
          </Link>
        </div>

        {/* Wallet Status */}
        <div className="flex items-center gap-4">
          {wallet ? (
            <div className="flex items-center gap-3">
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="p-2 hover:bg-[#1a2535] rounded-full transition-colors"
                >
                  <User className="w-5 h-5" />
                </button>

                {showUserDropdown && (
                  <div
                    className="absolute top-full right-0 mt-2 w-56 bg-[#0f1520] border border-[#1a2535] rounded-lg shadow-xl shadow-black/50 overflow-hidden"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a')) {
                        setShowUserDropdown(false);
                      }
                    }}
                  >
                    {/* Profile Section */}
                    <div className="px-4 py-3 border-b border-[#1a2535] bg-[#0a1018]">
                      <div className="text-xs text-slate-500">Signed in as</div>
                      <div className="font-mono text-sm text-[#e0e8f0] mt-1">
                        {walletService.getShortenedAddress(wallet.address)}
                      </div>
                    </div>

                    {/* Profile & Stats */}
                    <div className="py-2">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a2535] transition-colors"
                      >
                        <UserCircle className="w-4 h-4 text-cyan-400" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        href="/history"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a2535] transition-colors"
                      >
                        <History className="w-4 h-4 text-violet-400" />
                        <span>Session History</span>
                      </Link>
                      <Link
                        href="/baseline"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a2535] transition-colors"
                      >
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>Baseline Profile</span>
                      </Link>
                    </div>

                    {/* Rewards & Achievements */}
                    <div className="py-2 border-t border-[#1a2535]">
                      <Link
                        href="/tokens"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a2535] transition-colors"
                      >
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span>My Tokens</span>
                      </Link>
                      <Link
                        href="/achievements"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a2535] transition-colors"
                      >
                        <Award className="w-4 h-4 text-orange-400" />
                        <span>Achievements</span>
                      </Link>
                    </div>

                    {/* Settings & Help */}
                    <div className="py-2 border-t border-[#1a2535]">
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a2535] transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        href="/help"
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a2535] transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-teal-400" />
                        <span>Help & Tutorials</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-[#1a2535] rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/onboarding"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-[#060a0f] font-semibold rounded-lg transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
