'use client';

/**
 * REDESIGNED Landing Page - Remote Viewing as Hero Feature
 * 
 * Structure:
 * 1. Hero: RV Front & Center
 * 2. Stats Ticker
 * 3. How It Works (3 Steps)
 * 4. Why Cardano?
 * 5. Other Experiments (below fold)
 * 6. Features
 */

import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Brain, Lock, Sparkles, Globe, ArrowRight, Eye, Zap, Users, Shield, Clock, TrendingUp, Target } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock stats - replace with real data from API
const stats = [
  { label: 'Trials Completed', value: '12,847', icon: TrendingUp },
  { label: 'Avg Accuracy', value: '67%', icon: Target },
  { label: 'Active Researchers', value: '1,234', icon: Users },
];

const rvSteps = [
  {
    number: '1',
    title: 'Predict',
    description: 'Describe a random location without knowing what it is',
    icon: Brain,
  },
  {
    number: '2',
    title: 'Commit',
    description: 'Your prediction is hashed and stored on Cardano blockchain',
    icon: Shield,
  },
  {
    number: '3',
    title: 'Reveal',
    description: 'See the target, get AI-scored feedback, track your progress',
    icon: Sparkles,
  },
];

const otherExperiments = [
  {
    id: 'precognition',
    name: 'Precognition',
    description: 'Predict future events before they occur',
    icon: Zap,
    gradient: 'from-violet-500 to-fuchsia-500',
  },
  {
    id: 'telepathy',
    name: 'Telepathy',
    description: 'Receive thoughts transmitted by another person',
    icon: Users,
    gradient: 'from-emerald-400 to-cyan-400',
  },
  // ... 7 more experiments
];

const features = [
  {
    icon: Lock,
    title: 'Privacy-Preserving',
    description: 'Zero-knowledge architecture ensures your predictions remain private until reveal',
  },
  {
    icon: Brain,
    title: 'AI-Powered Scoring',
    description: 'Advanced semantic analysis provides objective scoring of your results',
  },
  {
    icon: Sparkles,
    title: 'Blockchain Verified',
    description: 'Cryptographic commitments on Cardano prove prediction timing - no cheating possible',
  },
  {
    icon: Globe,
    title: 'Decentralized Storage',
    description: 'IPFS ensures your experiments are permanently stored and verifiable',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#060a0f] psi-grid-bg">
      <Header />

      {/* HERO SECTION - REMOTE VIEWING */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* Remote Viewing Icon/Badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-semibold">
            <Eye className="w-4 h-4" />
            FLAGSHIP FEATURE
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300 bg-clip-text text-transparent">
              Remote Viewing
            </span>
            <br />
            <span className="text-[#e0e8f0]">Prove Consciousness is Non-Local</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-400 mb-8 max-w-3xl mx-auto">
            Can you sense a location you've never seen? Thousands of trials. Blockchain-verified. AI-scored.
          </p>

          {/* Stats Ticker */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mb-12 p-6 bg-[#0f1520]/60 border border-[#1a2535] rounded-2xl backdrop-blur-sm">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <stat.icon className="w-5 h-5 text-cyan-400" />
                  <div className="text-3xl font-bold text-cyan-300">{stat.value}</div>
                </div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <Link
            href="/experiments/remote-viewing"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl font-bold text-xl text-[#060a0f] hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105 transition-all"
          >
            <Eye className="w-6 h-6" />
            Start Your First Remote Viewing Session
            <ArrowRight className="w-6 h-6" />
          </Link>

          <p className="mt-4 text-sm text-slate-500">
            No wallet required to try • Full blockchain verification available
          </p>
        </motion.div>
      </section>

      {/* HOW IT WORKS - 3 STEPS */}
      <section className="container mx-auto px-4 py-20 border-t border-[#1a2535]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How Remote Viewing Works</h2>
          <p className="text-slate-400 text-lg">Three simple steps to test your perception</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {rvSteps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.15 }}
              className="relative"
            >
              {/* Step Number Badge */}
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/30">
                {step.number}
              </div>

              {/* Step Card */}
              <div className="p-8 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl h-full">
                <step.icon className="w-12 h-12 mb-4 text-cyan-400" />
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>
              </div>

              {/* Arrow between steps (desktop only) */}
              {index < rvSteps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-cyan-500/30" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY CARDANO SECTION */}
      <section className="container mx-auto px-4 py-20 border-t border-[#1a2535]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Cardano Blockchain?
              </h2>
              <ul className="space-y-4">
                {[
                  'Immutable proof of prediction timing',
                  'No cheating - commitment before reveal',
                  'Decentralized verification by anyone',
                  'Privacy-preserving zero-knowledge architecture',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-lg text-slate-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 bg-gradient-to-br from-[#0f1520] to-[#0a1018] border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.1)]">
              <h3 className="text-xl font-bold mb-4 text-cyan-300">Blockchain Commitment</h3>
              <div className="space-y-3 font-mono text-sm text-slate-400">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Hash Function:</div>
                  <div className="text-cyan-400">Blake2b-256</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Your Prediction Hash:</div>
                  <div className="break-all opacity-60">527ef13a62d111d0a2e88fe9...</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Committed to Cardano:</div>
                  <div className="text-emerald-400">✓ Block #8,234,567</div>
                </div>
                <div className="text-xs text-slate-500 mt-4">
                  Prediction remains encrypted until you choose to reveal.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OTHER EXPERIMENTS (Below Fold) */}
      <section className="container mx-auto px-4 py-20 border-t border-[#1a2535]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">9 More Experiment Types</h2>
          <p className="text-slate-400 text-lg">
            Explore precognition, telepathy, global consciousness, and more
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {otherExperiments.slice(0, 6).map((exp) => (
            <Link
              key={exp.id}
              href={`/experiments/${exp.id}`}
              className="block p-6 bg-[#0f1520]/60 border border-[#1a2535] rounded-xl hover:border-cyan-500/30 transition-all group"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${exp.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <exp.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-1">{exp.name}</h3>
              <p className="text-sm text-slate-400">{exp.description}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            href="/experiments"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            View All 10 Experiments
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="container mx-auto px-4 py-20 border-t border-[#1a2535]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Scientific Rigor</h2>
          <p className="text-slate-400 text-lg">
            Cutting-edge technology meets reproducible research
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.06)] transition-all"
            >
              <feature.icon className="w-12 h-12 mb-4 text-cyan-400" />
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-[#1a2535] text-center text-slate-500">
        <p>
          Built with privacy, integrity, and scientific rigor •{' '}
          <Link href="/about" className="hover:text-cyan-400">
            Learn More
          </Link>
        </p>
      </footer>
    </div>
  );
}
