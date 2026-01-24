'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/layout/Header';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Brain,
  Shield,
  Zap,
  Eye,
  Globe,
  Sparkles,
  Lock,
  Network,
  Waves,
  Atom,
  Moon,
  Radio,
  Users,
  Dice1,
  Clock,
  Layers,
  Target,
  Award,
  Coins,
  Server,
} from 'lucide-react';

function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let nodes: { x: number; y: number; vx: number; vy: number; radius: number; pulse: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const init = () => {
      resize();
      nodes = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      const time = Date.now() * 0.001;

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.offsetWidth) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.offsetHeight) node.vy *= -1;
        node.pulse += 0.02;
      });

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(0, 200, 180, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        const glow = Math.sin(node.pulse + time) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${0.3 + glow * 0.4})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
    />
  );
}

function SectionReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StatCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    step();
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
        <span className="bg-gradient-to-r from-[#00f0ff] to-[#00c8b4] bg-clip-text text-transparent">
          {count}{suffix}
        </span>
      </div>
      <div className="text-sm text-slate-500 mt-1 uppercase tracking-widest">{label}</div>
    </div>
  );
}

const researchDomains = [
  { icon: Eye, name: 'Premonition', description: 'Predicting future random events before they occur', color: '#00f0ff' },
  { icon: Moon, name: 'Dream Logging', description: 'Correlating dream content with future stimuli', color: '#a855f7' },
  { icon: Radio, name: 'Telepathy', description: 'Paired intuition tests with users or AI agents', color: '#e040a0' },
  { icon: Clock, name: 'Time-Displacement', description: 'Retrocausal prediction and delayed outcomes', color: '#ffb020' },
  { icon: Sparkles, name: 'Synchronicity', description: 'Logging and analyzing meaningful coincidences', color: '#39ff8e' },
  { icon: Layers, name: 'Memory Field', description: 'Delayed recall and morphic resonance experiments', color: '#00c8b4' },
  { icon: Atom, name: 'Entanglement', description: 'Multi-user simultaneous intention studies', color: '#00f0ff' },
  { icon: Dice1, name: 'Chance Influence', description: 'Focus-based random number modulation', color: '#a855f7' },
  { icon: Users, name: 'Collective Field', description: 'Group meditation and intention coherence', color: '#e040a0' },
  { icon: Target, name: 'Remote Viewing', description: 'Describing hidden targets and images', color: '#ffb020' },
];

const howItWorks = [
  {
    icon: Lock,
    title: 'Experience Capture',
    description: 'Record dreams, intuitions, or experiment outcomes in a secure, privacy-preserving journal. All data is encrypted locally and committed to the Midnight network.',
    number: '01',
  },
  {
    icon: Brain,
    title: 'AI Orchestration',
    description: 'A modular Multi-Agent System where each AI agent specializes in prediction scoring, synchronicity analysis, dream pattern mapping, or RNG validation.',
    number: '02',
  },
  {
    icon: Shield,
    title: 'Deferred Revelation',
    description: 'Entries remain encrypted until you choose to verify. The AI then scans real-world event streams and objectively scores accuracy.',
    number: '03',
  },
  {
    icon: Network,
    title: 'On-Chain Validation',
    description: 'Results are immutably recorded on-chain for transparent, peer-verifiable studies while maintaining full data privacy.',
    number: '04',
  },
];

export default function AboutPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[#060a0f] overflow-hidden">
      <Header />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[90vh] flex items-center justify-center pt-20"
      >
        <NeuralCanvas />

        {/* Radial gradient backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.06)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.04)_0%,transparent_60%)]" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#1a2535] bg-[#0f1520]/60 backdrop-blur-sm mb-8">
              <div className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400" style={{ fontFamily: "'Space Mono', monospace" }}>
                Consciousness Research Platform
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            <span className="text-[#e0e8f0]">About </span>
            <span className="bg-gradient-to-r from-[#00f0ff] via-[#00c8b4] to-[#a855f7] bg-clip-text text-transparent">
              Cognosis
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed"
          >
            A next-generation cognitive research platform merging parapsychology, neuroscience,
            and artificial intelligence into a unified experimental framework for studying consciousness at scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="mt-16"
          >
            <Waves className="w-6 h-6 mx-auto text-[#00f0ff]/30 animate-bounce" />
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Band */}
      <SectionReveal>
        <section className="relative py-16 border-y border-[#1a2535]">
          <div className="absolute inset-0 bg-[#0a0e14]/80" />
          <div className="relative z-10 max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter value={10} label="Research Domains" />
            <StatCounter value={30} label="Experiments" suffix="+" />
            <StatCounter value={256} label="Bit Encryption" />
            <StatCounter value={100} label="Privacy Score" suffix="%" />
          </div>
        </section>
      </SectionReveal>

      {/* Mission Statement */}
      <SectionReveal>
        <section className="py-24 md:py-32 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute -left-4 top-0 bottom-0 w-px bg-gradient-to-b from-[#00f0ff] via-[#a855f7] to-transparent" />
              <div className="pl-8">
                <p className="text-sm uppercase tracking-[0.3em] text-[#00c8b4] mb-4" style={{ fontFamily: "'Space Mono', monospace" }}>
                  The Mission
                </p>
                <p className="text-2xl md:text-3xl text-slate-200 leading-relaxed font-light" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Cognosis transforms subjective human experiences&mdash;dreams, premonitions, synchronicities,
                  telepathic impressions&mdash;into encrypted, timestamped research data. Through decentralized
                  logging, AI-assisted interpretation, and verifiable outcome tracking, we enable large-scale,
                  reproducible studies of consciousness and psi-related effects.
                </p>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* How It Works */}
      <section className="py-24 md:py-32 px-6 relative">
        <div className="absolute inset-0 psi-grid-bg opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.3em] text-[#00c8b4] mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
                Architecture
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-[#e0e8f0]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                How It Works
              </h2>
            </div>
          </SectionReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {howItWorks.map((step, i) => (
              <SectionReveal key={step.number}>
                <motion.div
                  whileHover={{ y: -4, borderColor: 'rgba(0, 240, 255, 0.3)' }}
                  transition={{ duration: 0.3 }}
                  className="relative p-8 rounded-2xl border border-[#1a2535] bg-[#0a0e14]/60 backdrop-blur-sm group"
                >
                  <div className="absolute top-6 right-6 text-5xl font-bold text-[#1a2535] select-none" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {step.number}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff]/10 to-[#00c8b4]/10 border border-[#00f0ff]/20 flex items-center justify-center mb-5 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-shadow">
                    <step.icon className="w-5 h-5 text-[#00f0ff]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#e0e8f0] mb-3">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{step.description}</p>
                </motion.div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Research Domains */}
      <section className="py-24 md:py-32 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.04)_0%,transparent_60%)]" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.3em] text-[#a855f7] mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
                10 Domains
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-[#e0e8f0]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Research Categories
              </h2>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {researchDomains.map((domain, i) => (
              <SectionReveal key={domain.name}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className="relative p-5 rounded-xl border border-[#1a2535] bg-[#0a0e14]/80 backdrop-blur-sm group cursor-default overflow-hidden"
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"
                    style={{ background: `radial-gradient(circle at 50% 50%, ${domain.color}08 0%, transparent 70%)` }}
                  />
                  <div className="relative z-10">
                    <domain.icon
                      className="w-6 h-6 mb-3 transition-colors duration-300"
                      style={{ color: domain.color }}
                    />
                    <h3 className="text-sm font-semibold text-[#e0e8f0] mb-1.5">{domain.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{domain.description}</p>
                  </div>
                </motion.div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Incentive System */}
      <section className="py-24 md:py-32 px-6 relative">
        <div className="absolute inset-0 border-y border-[#1a2535] bg-[#080c12]" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <SectionReveal>
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.3em] text-[#ffb020] mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
                Tokenomics
              </p>
              <h2 className="text-3xl md:text-5xl font-bold text-[#e0e8f0]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Incentive &amp; Discovery
              </h2>
            </div>
          </SectionReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Coins,
                title: 'PsyTokens',
                description: 'Earn tokens by participating in validated experiments, achieving accuracy thresholds, or contributing data for meta-analysis.',
              },
              {
                icon: Award,
                title: 'Proof-of-Intuition NFTs',
                description: 'High-performing users mint NFTs representing verified performance in specific cognitive domains.',
              },
              {
                icon: Zap,
                title: 'Staking & Proposals',
                description: 'Researchers and developers stake tokens to propose new experiment types or integrate external tools.',
              },
            ].map((item, i) => (
              <SectionReveal key={item.title}>
                <div className="p-6 rounded-xl border border-[#1a2535] bg-[#0a0e14]/60">
                  <item.icon className="w-8 h-8 text-[#ffb020] mb-4" />
                  <h3 className="text-lg font-semibold text-[#e0e8f0] mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Decentralized Network */}
      <section className="py-24 md:py-32 px-6 relative">
        <div className="relative z-10 max-w-5xl mx-auto">
          <SectionReveal>
            <div className="flex flex-col md:flex-row gap-12 items-start">
              <div className="flex-1">
                <p className="text-sm uppercase tracking-[0.3em] text-[#39ff8e] mb-3" style={{ fontFamily: "'Space Mono', monospace" }}>
                  Infrastructure
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-[#e0e8f0] mb-6" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Decentralized Science Network
                </h2>
                <p className="text-slate-400 leading-relaxed mb-8">
                  Through federated nodes and on-chain scoring, Cognosis evolves into a global consciousness
                  research network&mdash;an open scientific commons for studying psi phenomena with transparency,
                  reproducibility, and privacy.
                </p>
                <div className="space-y-4">
                  {[
                    'Host experiments locally on your own node',
                    'Sync anonymized results via the Midnight network',
                    'Participate in global data meta-analysis',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full border border-[#39ff8e]/30 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#39ff8e]" />
                      </div>
                      <span className="text-sm text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl border border-[#1a2535] bg-[#0a0e14]/60 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(57,255,142,0.06)_0%,transparent_70%)]" />
                  <Globe className="w-20 h-20 text-[#39ff8e]/40" />
                  <div className="absolute inset-0 border border-[#39ff8e]/10 rounded-2xl" />
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Vision / Closing */}
      <section className="py-32 md:py-40 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.03)_0%,transparent_60%)]" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <SectionReveal>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-[#1a2535] bg-[#0f1520]/60 mb-8">
              <Sparkles className="w-7 h-7 text-[#00f0ff]" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#e0e8f0] mb-8" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Our Vision
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 leading-relaxed font-light mb-6" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Bridge the subjective and objective&mdash;creating a scientifically rigorous,
              ethically grounded platform where the human mind becomes both the explorer
              and the instrument of discovery.
            </p>
            <p className="text-slate-500 leading-relaxed text-sm max-w-2xl mx-auto">
              By combining AI reasoning, cryptographic privacy, and collective participation,
              Cognosis redefines what&rsquo;s possible in consciousness science&mdash;paving the way
              for next-generation parapsychological research that is transparent, verifiable,
              and decentralized.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  );
}
