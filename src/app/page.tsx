'use client';

/**
 * Landing Page - Hero, features, and experiment showcase
 */

import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Brain, Lock, Sparkles, Globe, ArrowRight, Eye, Zap, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const experiments = [
  {
    id: 'remote-viewing',
    name: 'Remote Viewing',
    description: 'Describe distant or hidden locations without being physically present',
    icon: Eye,
    gradient: 'from-cyan-400 to-teal-500',
  },
  {
    id: 'precognition',
    name: 'Precognition',
    description: 'Predict future events before they occur using intuitive insight',
    icon: Zap,
    gradient: 'from-violet-500 to-fuchsia-500',
  },
  {
    id: 'telepathy',
    name: 'Telepathy',
    description: 'Receive thoughts or images transmitted by another person',
    icon: Users,
    gradient: 'from-emerald-400 to-cyan-400',
  },
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
    description: 'Cryptographic commitments on Midnight Network prove prediction timing',
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

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300 bg-clip-text text-transparent">
              Explore the Edges
            </span>
            <br />
            <span className="text-[#e0e8f0]">of Consciousness</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Conduct verified psi experiments with blockchain integrity, AI-powered analysis, and
            privacy-preserving technology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg font-semibold text-lg text-[#060a0f] hover:shadow-lg hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2"
            >
              Start Experimenting
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 border border-[#1a2535] rounded-lg font-semibold text-lg hover:border-cyan-500/60 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20 border-t border-[#1a2535]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Cognosis?</h2>
          <p className="text-slate-400 text-lg">
            Cutting-edge technology meets rigorous scientific methodology
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

      {/* Experiments Showcase */}
      <section className="container mx-auto px-4 py-20 border-t border-[#1a2535]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">10 Experiment Types</h2>
          <p className="text-slate-400 text-lg">
            From remote viewing to global consciousness studies
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {experiments.map((exp, index) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={`/experiments/${exp.id}`}
                className="block p-8 bg-gradient-to-br from-[#0f1520] to-[#0a1018] border border-[#1a2535] rounded-2xl hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(0,240,255,0.08)] transition-all group"
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${exp.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <exp.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{exp.name}</h3>
                <p className="text-slate-400">{exp.description}</p>
                <div className="mt-4 flex items-center text-cyan-400 group-hover:gap-2 transition-all">
                  Try Now
                  <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link
            href="/experiments"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            View All 10 Experiments
            <ArrowRight className="w-5 h-5" />
          </Link>
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
