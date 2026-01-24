'use client';

import Header from '@/components/layout/Header';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Eye, MapPin, Package, Heart, Bot, Users, Target, Zap, Cloud, Sparkles, Dices, Hourglass, Radio, Clock, Wifi, Globe, Brain, Scan } from 'lucide-react';

// Define experiments grouped by category
const categoryData = {
  'remote-viewing': {
    name: 'Remote Viewing',
    description: 'Perceive information about distant or unseen targets through extrasensory means',
    icon: Eye,
    color: 'violet',
    experiments: [
      { id: 'rv-crv-protocol', name: 'CRV Protocol (AI-Guided)', icon: Scan, description: '6-stage Controlled Remote Viewing with AI expert guidance', isNew: true },
      { id: 'remote-viewing-images', name: 'Remote Viewing: Images', icon: Eye, description: '5-phase visual perception protocol with sketch canvas' },
      { id: 'remote-viewing-locations', name: 'Remote Viewing: Locations', icon: MapPin, description: 'Geographic sensing with terrain and climate analysis' },
      { id: 'remote-viewing-objects', name: 'Remote Viewing: Objects', icon: Package, description: '6-phase physical object perception protocol' },
    ]
  },
  'telepathy': {
    name: 'Telepathy & Empathy',
    description: 'Mind-to-mind communication and emotional connection experiments',
    icon: Heart,
    color: 'pink',
    experiments: [
      { id: 'telepathy-emotions', name: 'Telepathy: Emotions', icon: Heart, description: 'Emotion sensing with Plutchik wheel and body mapping' },
      { id: 'ai-telepathy', name: 'AI Telepathy', icon: Bot, description: 'Multi-round guessing with warmth feedback system' },
      { id: 'telepathy', name: 'Classic Telepathy', icon: Users, description: 'Traditional telepathy experiments' },
      { id: 'telepathy-live', name: 'Live Telepathy', icon: Users, description: 'Real-time telepathy sessions' },
    ]
  },
  'precognition': {
    name: 'Precognition & Forecasting',
    description: 'Predict future events before they occur',
    icon: Zap,
    color: 'blue',
    experiments: [
      { id: 'card-prediction', name: 'Card Prediction', icon: Target, description: 'Multi-round card guessing with accuracy tracking' },
      { id: 'event-forecasting', name: 'Event Forecasting', icon: Zap, description: 'Structured future event prediction protocol' },
      { id: 'precognition', name: 'General Precognition', icon: Zap, description: 'Classic precognition tests' },
    ]
  },
  'consciousness': {
    name: 'Consciousness & Awareness',
    description: 'Explore altered states and expanded awareness',
    icon: Cloud,
    color: 'indigo',
    experiments: [
      { id: 'dream-journal', name: 'Dream Journal', icon: Cloud, description: 'Enhanced dream logging with symbol analysis' },
      { id: 'synchronicity', name: 'Synchronicity Tracker', icon: Sparkles, description: 'Meaningful coincidence documentation' },
      { id: 'ganzfeld', name: 'Ganzfeld Protocol', icon: Eye, description: 'Sensory deprivation perception experiment' },
      { id: 'intuition', name: 'Intuition Testing', icon: Brain, description: 'General intuition experiments' },
    ]
  },
  'psychokinesis': {
    name: 'Psychokinesis & Influence',
    description: 'Influence physical systems through intention',
    icon: Target,
    color: 'orange',
    experiments: [
      { id: 'dice-influence', name: 'Dice Influence (PK)', icon: Dices, description: 'Random number generation influence with statistics' },
      { id: 'psychokinesis', name: 'General PK', icon: Target, description: 'Psychokinesis experiments' },
    ]
  },
  'time-causality': {
    name: 'Time & Causality',
    description: 'Explore temporal anomalies and backward causation',
    icon: Clock,
    color: 'violet',
    experiments: [
      { id: 'time-loop', name: 'Time-Loop Detection', icon: Hourglass, description: 'Déjà vu and temporal anomaly tracking' },
      { id: 'memory-field', name: 'Memory Field Detection', icon: Radio, description: 'Sense collective viewing patterns via resonance' },
      { id: 'retrocausality', name: 'Retrocausality', icon: Clock, description: 'Backward causation experiments' },
    ]
  },
  'group-network': {
    name: 'Group & Network',
    description: 'Collective consciousness and group psi phenomena',
    icon: Wifi,
    color: 'teal',
    experiments: [
      { id: 'multi-party-telepathy', name: 'Multi-Party Telepathy', icon: Wifi, description: 'Group telepathy experiments' },
      { id: 'global-consciousness', name: 'Global Consciousness', icon: Globe, description: 'Collective consciousness detection' },
    ]
  },
};

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params?.category as string;
  const category = categoryData[categorySlug as keyof typeof categoryData];

  if (!category) {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
          <Link href="/experiments" className="text-cyan-400 hover:underline">
            ← Back to all experiments
          </Link>
        </div>
      </div>
    );
  }

  const CategoryIcon = category.icon;

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />
      <div className="container mx-auto px-4 py-20">
        {/* Category Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Link href="/experiments" className="text-cyan-400 hover:underline mb-4 inline-block">
            ← Back to all experiments
          </Link>
          <div className="flex justify-center mb-6">
            <div className={`p-6 bg-${category.color}-900/20 border border-${category.color}-500/30 rounded-2xl`}>
              <CategoryIcon className={`w-16 h-16 text-${category.color}-400`} />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
            {category.name}
          </h1>
          <p className="text-xl text-slate-400">
            {category.description}
          </p>
        </div>

        {/* Experiments Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.experiments.map((exp) => (
              <Link
                key={exp.id}
                href={`/experiments/${exp.id}`}
                className="group p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl hover:border-cyan-500 transition-all hover:scale-105 relative"
              >
                {'isNew' in exp && exp.isNew && (
                  <span className="absolute top-4 right-4 px-2 py-1 bg-green-500 text-[#060a0f] text-xs font-bold rounded">
                    NEW
                  </span>
                )}
                <exp.icon className={`w-12 h-12 mb-4 text-${category.color}-400 group-hover:scale-110 transition-transform`} />
                <h3 className="text-xl font-bold mb-2">{exp.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{exp.description}</p>
                <p className="text-cyan-400 text-sm group-hover:translate-x-1 transition-transform">
                  Start experiment →
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Coming Soon Section */}
        {category.experiments.length < 5 && (
          <div className="max-w-4xl mx-auto mt-12 p-6 bg-[#0f1520]/30 border border-[#1a2535] rounded-xl text-center">
            <h3 className="text-xl font-bold mb-2">More Coming Soon</h3>
            <p className="text-slate-400">
              We're continuously developing new {category.name.toLowerCase()} experiments. Check back soon for updates!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
