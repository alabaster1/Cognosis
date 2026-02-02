'use client';

/**
 * REDESIGNED Landing Page - Remote Viewing as Hero Feature
 * 
 * Structure:
 * 1. Hero: RV Front & Center
 * 2. Stats Ticker (LIVE DATA)
 * 3. How It Works (3 Steps)
 * 4. Why Cardano?
 * 5. Other Experiments (below fold)
 * 6. Features
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { Brain, Lock, Sparkles, Globe, ArrowRight, Eye, Zap, Users, Shield, Clock, TrendingUp, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface RVStats {
  totalTrials: number;
  averageAccuracy: number;
  activeResearchers: number;
}

// Fetch live stats from API
function useRVStats() {
  const [stats, setStats] = useState<RVStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats/remote-viewing');
        const data = await res.json();
        if (data.success) {
          setStats({
            totalTrials: data.stats.totalTrials,
            averageAccuracy: data.stats.averageAccuracy,
            activeResearchers: data.stats.activeResearchers,
          });
        }
      } catch (err) {
        console.error('Failed to fetch RV stats:', err);
        // Fallback to mock data if API fails
        setStats({
          totalTrials: 0,
          averageAccuracy: 0,
          activeResearchers: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return { stats, loading };
}

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
  const { stats, loading } = useRVStats();

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
            Can you sense a location you've never seen? Live data. Blockchain-verified. AI-scored.
          </p>

          {/* Stats Ticker - LIVE DATA */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mb-12 p-6 bg-[#0f1520]/60 border border-[#1a2535] rounded-2xl backdrop-blur-sm">
            {loading ? (
              <div className="col-span-3 text-center text-slate-400 py-4">
                Loading stats...
              </div>
            ) : stats ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    <div className="text-3xl font-bold text-cyan-300">
                      {stats.totalTrials.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">Trials Completed</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    <div className="text-3xl font-bold text-cyan-300">
                      {stats.averageAccuracy}%
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">Avg Accuracy</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <div className="text-3xl font-bold text-cyan-300">
                      {stats.activeResearchers.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">Active Researchers</div>
                </motion.div>
              </>
            ) : (
              <div className="col-span-3 text-center text-slate-400 py-4">
                Stats unavailable
              </div>
            )}
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

      {/* REWARDS & LOTTERY SYSTEM */}
      <section className="container mx-auto px-4 py-20 border-t border-[#1a2535]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                Earn Rewards for Accuracy
              </span>
            </h2>
            <p className="text-slate-400 text-lg">
              Get paid in PSY tokens for remote viewing accuracy • Join weekly lottery draws
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Reward System Card */}
            <div className="p-8 bg-gradient-to-br from-[#0f1520] to-[#0a1018] border border-cyan-500/30 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <Sparkles className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold">PSY Token Rewards</h3>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-slate-300">
                  Earn PSY tokens based on your remote viewing accuracy. The better your prediction, the more you earn.
                </p>
                
                <div className="p-4 bg-[#060a0f]/60 rounded-xl border border-[#1a2535]">
                  <div className="text-sm text-slate-400 mb-3">Reward Structure:</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Base Reward (participation):</span>
                      <span className="font-bold text-cyan-400">100 PSY</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">50% Accuracy:</span>
                      <span className="font-bold text-emerald-400">~150 PSY</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">75% Accuracy:</span>
                      <span className="font-bold text-amber-400">~245 PSY</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">100% Perfect Score:</span>
                      <span className="font-bold text-orange-400">400 PSY</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 leading-relaxed">
                  Rewards use an exponential curve - high accuracy is significantly rewarded. AI scoring ensures objective, reproducible results.
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <strong className="text-cyan-300">Blockchain Verified:</strong> All rewards are distributed via smart contracts on Cardano. No middleman, no manipulation.
                </div>
              </div>
            </div>

            {/* Lottery System Card */}
            <div className="p-8 bg-gradient-to-br from-[#0f1520] to-[#0a1018] border border-amber-500/30 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-500/20 rounded-lg">
                  <Sparkles className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold">Weekly Lottery</h3>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-slate-300">
                  Every experiment you complete automatically enters you into the weekly lottery draw.
                </p>

                <div className="p-4 bg-[#060a0f]/60 rounded-xl border border-[#1a2535]">
                  <div className="text-sm text-slate-400 mb-3">How It Works:</div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-amber-400">1</span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Small fee from each experiment funds the lottery pool
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-amber-400">2</span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Pool accumulates throughout the week
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-amber-400">3</span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Random winner selected every Sunday via Cardano VRF
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-amber-400">4</span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Winner receives entire pool (automatically distributed)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">Current Pool (Example)</div>
                    <div className="text-3xl font-bold text-amber-400 mb-1">2,450 ADA</div>
                    <div className="text-xs text-slate-500">Drawn every Sunday at 12:00 UTC</div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <Target className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <strong className="text-emerald-300">Provably Fair:</strong> Cardano's VRF ensures truly random, verifiable lottery draws. No rigging possible.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <Link
              href="/experiments/remote-viewing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-bold text-lg text-[#060a0f] hover:shadow-lg hover:shadow-amber-500/50 hover:scale-105 transition-all"
            >
              Start Earning PSY Tokens
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              First experiment is free • Wallet required for rewards
            </p>
          </div>
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
            <div
              key={exp.id}
              className="relative block p-6 bg-[#0f1520]/60 border border-[#1a2535] rounded-xl opacity-60 cursor-not-allowed"
            >
              {/* Coming Soon Badge */}
              <div className="absolute top-4 right-4 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-xs font-bold">
                COMING SOON
              </div>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${exp.gradient} flex items-center justify-center mb-3 opacity-50`}>
                <exp.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-1">{exp.name}</h3>
              <p className="text-sm text-slate-400">{exp.description}</p>
              <p className="text-xs text-amber-400 mt-2 font-semibold">Full Integration Coming Soon</p>
            </div>
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
