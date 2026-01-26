'use client';

import Header from '@/components/layout/Header';
import Link from 'next/link';
import { Eye, Zap, Users, Brain, Sparkles, Cloud, Target, Clock, Wifi, Globe, MapPin, Package, Heart, Bot, Dices, Hourglass, Radio, Scan, Grid3X3, RotateCcw, Palette, Coins, Spade } from 'lucide-react';

const enhancedExperiments = [
  {
    category: 'Game-Like Experiments',
    experiments: [
      { id: 'pattern-oracle', name: 'Pattern Oracle', icon: Grid3X3, color: 'indigo', description: '5x5 grid intuition game - find hidden patterns with ESP', isNew: true },
      { id: 'timeline-racer', name: 'Timeline Racer', icon: Zap, color: 'amber', description: 'Speed precognition - predict symbols in 2-second windows', isNew: true },
      { id: 'emotion-echo', name: 'Emotion Echo', icon: Palette, color: 'pink', description: 'Sense emotions in abstract art using Plutchik\'s 8 emotions', isNew: true },
      { id: 'psi-poker', name: 'Psi Poker', icon: Spade, color: 'emerald', description: 'Card game using precognition and telepathy to predict hands', isNew: true },
      { id: 'synchronicity-bingo', name: 'Synchronicity Bingo', icon: Sparkles, color: 'rose', description: 'Daily bingo card of meaningful coincidences', isNew: true },
    ]
  },
  {
    category: 'Multiplayer & Global',
    experiments: [
      { id: 'quantum-coin-arena', name: 'Quantum Coin Arena', icon: Coins, color: 'cyan', description: 'Multiplayer PK - influence random coin flips together', isNew: true },
      { id: 'mind-pulse', name: 'Mind Pulse', icon: Radio, color: 'violet', description: 'Global consciousness - synchronized intention experiments', isNew: true },
      { id: 'multi-party-telepathy', name: 'Multi-Party Telepathy', icon: Wifi, color: 'teal', description: 'Group telepathy experiments' },
      { id: 'global-consciousness', name: 'Global Consciousness', icon: Globe, color: 'amber', description: 'Collective consciousness detection' },
    ]
  },
  {
    category: 'Remote Viewing',
    experiments: [
      { id: 'rv-crv-protocol', name: 'CRV Protocol (AI-Guided)', icon: Scan, color: 'indigo', description: '6-stage Controlled Remote Viewing with AI expert guidance' },
      { id: 'remote-viewing-images', name: 'Remote Viewing: Images', icon: Eye, color: 'violet', description: '5-phase visual perception protocol with sketch canvas' },
      { id: 'remote-viewing-locations', name: 'Remote Viewing: Locations', icon: MapPin, color: 'green', description: 'Geographic sensing with terrain and climate analysis' },
      { id: 'remote-viewing-objects', name: 'Remote Viewing: Objects', icon: Package, color: 'blue', description: '6-phase physical object perception protocol' },
    ]
  },
  {
    category: 'Telepathy & Empathy',
    experiments: [
      { id: 'telepathy-emotions', name: 'Telepathy: Emotions', icon: Heart, color: 'pink', description: 'Emotion sensing with Plutchik wheel and body mapping' },
      { id: 'ai-telepathy', name: 'AI Telepathy', icon: Bot, color: 'cyan', description: 'Multi-round guessing with warmth feedback system' },
      { id: 'telepathy', name: 'Classic Telepathy', icon: Users, color: 'green', description: 'Traditional telepathy experiments' },
    ]
  },
  {
    category: 'Precognition & Forecasting',
    experiments: [
      { id: 'card-prediction', name: 'Card Prediction', icon: Target, color: 'orange', description: 'Multi-round card guessing with accuracy tracking' },
      { id: 'event-forecasting', name: 'Event Forecasting', icon: Zap, color: 'blue', description: 'Structured future event prediction protocol' },
      { id: 'precognition', name: 'General Precognition', icon: Zap, color: 'blue', description: 'Classic precognition tests' },
    ]
  },
  {
    category: 'Time & Causality',
    experiments: [
      { id: 'retro-roulette', name: 'Retro Roulette', icon: RotateCcw, color: 'violet', description: 'Can you influence pre-determined random outcomes?', isNew: true },
      { id: 'time-loop', name: 'Time-Loop Detection', icon: Hourglass, color: 'violet', description: 'Déjà vu and temporal anomaly tracking' },
      { id: 'memory-field', name: 'Memory Field Detection', icon: Radio, color: 'teal', description: 'Sense collective viewing patterns via resonance' },
      { id: 'retrocausality', name: 'Retrocausality', icon: Clock, color: 'violet', description: 'Backward causation experiments' },
    ]
  },
  {
    category: 'Consciousness & Awareness',
    experiments: [
      { id: 'dream-journal', name: 'Dream Journal', icon: Cloud, color: 'indigo', description: 'Enhanced dream logging with symbol analysis' },
      { id: 'synchronicity', name: 'Synchronicity Tracker', icon: Sparkles, color: 'pink', description: 'Meaningful coincidence documentation' },
      { id: 'ganzfeld', name: 'Ganzfeld Protocol', icon: Eye, color: 'violet', description: 'Sensory deprivation perception experiment' },
    ]
  },
  {
    category: 'Psychokinesis & Influence',
    experiments: [
      { id: 'dice-influence', name: 'Dice Influence (PK)', icon: Dices, color: 'orange', description: 'Random number generation influence with statistics' },
      { id: 'psychokinesis', name: 'General PK', icon: Target, color: 'orange', description: 'Psychokinesis experiments' },
    ]
  },
  {
    category: 'Other',
    experiments: [
      { id: 'intuition', name: 'Intuition Testing', icon: Brain, color: 'cyan', description: 'General intuition experiments' },
    ]
  },
];

export default function ExperimentsPage() {
  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-4 text-center">Choose an Experiment</h1>
        <p className="text-slate-400 text-center mb-12">
          Enhanced experiments with full IPFS, AI, and Blockchain integration
        </p>

        <div className="max-w-7xl mx-auto space-y-12">
          {enhancedExperiments.map((category) => (
            <div key={category.category}>
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">{category.category}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.experiments.map((exp) => (
                  <Link
                    key={exp.id}
                    href={`/experiments/${exp.id}`}
                    className="p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl hover:border-cyan-500/40 transition-all group relative"
                  >
                    {exp.isNew && (
                      <span className="absolute top-4 right-4 px-2 py-1 bg-emerald-400 text-[#060a0f] text-xs font-bold rounded">
                        NEW
                      </span>
                    )}
                    <exp.icon className={`w-12 h-12 mb-4 text-${exp.color}-400`} />
                    <h3 className="text-xl font-bold mb-2">{exp.name}</h3>
                    <p className="text-slate-400 text-sm">{exp.description}</p>
                    <p className="text-cyan-400 text-sm mt-4 group-hover:translate-x-1 transition-transform">Start experiment →</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
