'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Loader2, ArrowRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';

type Phase = 'intro' | 'category' | 'timeline' | 'mode' | 'specificity' | 'prediction' | 'success';

const CATEGORIES = [
  { id: 'politics', name: 'Politics', description: 'Political events, elections, policy changes' },
  { id: 'technology', name: 'Technology', description: 'Tech launches, breakthroughs, market shifts' },
  { id: 'science', name: 'Science', description: 'Scientific discoveries, research outcomes' },
  { id: 'sports', name: 'Sports', description: 'Game outcomes, championships, records' },
  { id: 'entertainment', name: 'Entertainment', description: 'Awards, releases, celebrity news' },
  { id: 'weather', name: 'Weather', description: 'Weather patterns, natural events' },
  { id: 'economics', name: 'Economics', description: 'Market movements, economic indicators' },
  { id: 'personal', name: 'Personal', description: 'Personal life events and outcomes' },
];

const TIMELINES = [
  { id: '1week', name: '1 Week', days: 7, description: 'Short-term prediction' },
  { id: '1month', name: '1 Month', days: 30, description: 'Medium-term forecast' },
  { id: '3months', name: '3 Months', days: 90, description: 'Quarterly outlook' },
  { id: '6months', name: '6 Months', days: 180, description: 'Half-year projection' },
  { id: '1year', name: '1 Year', days: 365, description: 'Long-term forecast' },
];

const MODES = [
  { id: 'binary', name: 'Binary Yes/No', description: 'Will this specific event happen?' },
  { id: 'multiple', name: 'Multiple Choice', description: 'Which of several outcomes will occur?' },
  { id: 'specific', name: 'Specific Outcome', description: 'Predict exact details or numbers' },
  { id: 'range', name: 'Range/Estimate', description: 'Predict within a range of values' },
];

export default function EventForecastingPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [phase, setPhase] = useState<Phase>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [commitmentId, setCommitmentId] = useState('');

  const [category, setCategory] = useState('');
  const [timeline, setTimeline] = useState('');
  const [mode, setMode] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [specificity, setSpecificity] = useState('');
  const [prediction, setPrediction] = useState('');
  const [criteria, setCriteria] = useState('');

  const handleStartExperiment = () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }
    setPhase('category');
  };

  const handleSubmit = async () => {
    if (!prediction.trim() || !criteria.trim()) {
      setError('Please complete all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    const selectedCategory = CATEGORIES.find(c => c.id === category);
    const selectedTimeline = TIMELINES.find(t => t.id === timeline);
    const selectedMode = MODES.find(m => m.id === mode);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (selectedTimeline?.days || 30));

    const experimentData = {
      category,
      categoryName: selectedCategory?.name,
      timeline,
      timelineName: selectedTimeline?.name,
      targetDate: targetDate.toISOString(),
      mode,
      modeName: selectedMode?.name,
      confidence,
      specificity,
      prediction,
      criteria,
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await experimentService.createCommitment({
        experimentType: 'event-forecasting',
        prediction: JSON.stringify(experimentData),
        metadata: {
          type: 'precognition',
          title: `Event Forecast: ${selectedCategory?.name}`,
          description: `${selectedMode?.name} prediction`,
          targetDate: targetDate.toISOString(),
          category: 'precognition',
          tags: ['event-forecasting', category, timeline, mode],
        },
      });

      setCommitmentId(result.commitmentId);
      setPhase('success');
    } catch (err) {
      console.error('Commit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create commitment');
    } finally {
      setIsLoading(false);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#060a0f] overflow-hidden relative">
        <Header />
        {/* Crystal ball glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(ellipse,_rgba(99,102,241,0.08)_0%,_transparent_70%)] pointer-events-none" />

        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto text-center">
            {/* Crystal ball icon */}
            <motion.div
              className="inline-flex items-center justify-center w-24 h-24 mb-6 relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full border border-indigo-500/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="w-18 h-18 rounded-full bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-indigo-400/40 flex items-center justify-center p-4 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Calendar className="w-10 h-10 text-indigo-400" />
              </div>
            </motion.div>

            <motion.h1
              className="text-5xl md:text-6xl font-black mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-2xl md:text-3xl text-white/50 block font-light tracking-wider">EVENT</span>
              <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                FORECASTING
              </span>
            </motion.h1>

            <motion.p
              className="text-indigo-300/60 text-sm mt-3 uppercase tracking-widest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Precognition Research
            </motion.p>

            <motion.p
              className="text-slate-400 max-w-md mx-auto text-sm mt-4 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Predict future events before they occur. Your forecast is cryptographically
              sealed and timestamped for verifiable proof.
            </motion.p>

            {/* Category preview */}
            <motion.div
              className="flex flex-wrap justify-center gap-2 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {CATEGORIES.slice(0, 6).map((cat, i) => (
                <motion.span
                  key={cat.id}
                  className="px-3 py-1.5 bg-indigo-950/40 border border-indigo-500/20 text-indigo-300/70 rounded-full text-xs"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.05, type: 'spring' }}
                >
                  {cat.name}
                </motion.span>
              ))}
            </motion.div>

            {/* Steps */}
            <motion.div
              className="grid grid-cols-4 gap-2 mb-8 max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {['Category', 'Timeframe', 'Predict', 'Commit'].map((s, i) => (
                <div key={i} className="text-center p-3 rounded-xl bg-[#0a0e14] border border-[#1a2535]">
                  <div className="text-[10px] text-indigo-500/60 font-mono mb-1">0{i + 1}</div>
                  <div className="text-[11px] text-white/70">{s}</div>
                </div>
              ))}
            </motion.div>

            <motion.button
              onClick={handleStartExperiment}
              className="w-full max-w-md mx-auto relative group block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity" />
              <div className="relative px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <Zap className="w-5 h-5" />
                See the Future
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === 'category') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Select Event Category</h2>
            <p className="text-slate-400 mb-8">Choose the type of event you want to forecast</p>

            {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">{error}</div>}

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setError(''); }}
                  className={`p-6 rounded-xl border-2 transition-all ${category === cat.id ? 'border-blue-500 bg-blue-500/20' : 'border-[#1a2535] hover:border-gray-600'}`}
                >
                  <h3 className="font-bold mb-2">{cat.name}</h3>
                  <p className="text-xs text-slate-400">{cat.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => category ? setPhase('timeline') : setError('Please select a category')}
              disabled={!category}
              className="w-full px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue to Timeframe
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'timeline') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Select Timeframe</h2>
            <p className="text-slate-400 mb-8">How far into the future will this event occur?</p>

            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {TIMELINES.map((time) => (
                <button
                  key={time.id}
                  onClick={() => setTimeline(time.id)}
                  className={`p-6 rounded-xl border-2 transition-all ${timeline === time.id ? 'border-blue-500 bg-blue-500/20' : 'border-[#1a2535] hover:border-gray-600'}`}
                >
                  <Calendar className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <h3 className="font-bold mb-1">{time.name}</h3>
                  <p className="text-xs text-slate-400">{time.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setPhase('mode')}
              disabled={!timeline}
              className="w-full px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue to Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mode') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Choose Prediction Mode</h2>
            <p className="text-slate-400 mb-8">How would you like to structure your forecast?</p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${mode === m.id ? 'border-blue-500 bg-blue-500/20' : 'border-[#1a2535] hover:border-gray-600'}`}
                >
                  <h3 className="text-xl font-bold mb-2">{m.name}</h3>
                  <p className="text-sm text-slate-400">{m.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setPhase('specificity')}
              disabled={!mode}
              className="w-full px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue to Specificity
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'specificity') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Set Confidence & Specificity</h2>
            <p className="text-slate-400 mb-8">How confident are you in this prediction?</p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-6">
              <label className="block text-sm font-medium mb-4 flex items-center justify-between">
                <span>Confidence Level</span>
                <span className="text-2xl font-bold text-blue-400">{confidence}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-[#142030] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6 mb-8">
              <label className="block text-sm font-medium mb-2">Specificity Level</label>
              <textarea
                value={specificity}
                onChange={(e) => setSpecificity(e.target.value)}
                placeholder="Describe how specific your prediction will be..."
                rows={4}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={() => setPhase('prediction')}
              disabled={!specificity.trim()}
              className="w-full px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue to Prediction
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'prediction') {
    const selectedCategory = CATEGORIES.find(c => c.id === category);
    const selectedTimeline = TIMELINES.find(t => t.id === timeline);

    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Make Your Prediction</h2>
            <p className="text-slate-400 mb-8">
              Record your forecast for {selectedCategory?.name} over {selectedTimeline?.name}
            </p>

            {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">{error}</div>}

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6 mb-6">
              <label className="block text-sm font-medium mb-2">Your Detailed Prediction</label>
              <textarea
                value={prediction}
                onChange={(e) => setPrediction(e.target.value)}
                placeholder="Write your prediction in detail..."
                rows={10}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6 mb-6">
              <label className="block text-sm font-medium mb-2">Success Criteria</label>
              <textarea
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                placeholder="Define how you will measure if your prediction was correct..."
                rows={5}
                className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-blue-400">Privacy Protected</strong>
                <p className="text-slate-400 mt-1">Your prediction will be encrypted and stored on IPFS.</p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Creating Commitment...</> : <><Lock className="w-5 h-5" />Commit Forecast</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'success') {
    const selectedTimeline = TIMELINES.find(t => t.id === timeline);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (selectedTimeline?.days || 30));

    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Event Forecast Committed!</h2>
            <p className="text-slate-400 mb-8">Your prediction has been encrypted and committed to the blockchain.</p>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
              <div className="text-sm text-slate-400 mb-2">Commitment ID</div>
              <div className="font-mono text-sm bg-[#060a0f]/50 px-4 py-2 rounded border border-[#1a2535] break-all">{commitmentId}</div>
            </div>

            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"></div>
                <div><strong>Encrypted & Stored</strong><p className="text-sm text-slate-400">Prediction encrypted on IPFS</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"></div>
                <div><strong>Blockchain Verified</strong><p className="text-sm text-slate-400">Commitment hash timestamped</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"></div>
                <div><strong>Ready for Reveal</strong><p className="text-sm text-slate-400">Target: {targetDate.toLocaleDateString()}</p></div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => router.push('/dashboard')} className="flex-1 px-6 py-3 border border-[#1a2535] rounded-lg hover:border-blue-500 transition-colors">View Dashboard</button>
              <button onClick={() => router.push('/experiments')} className="flex-1 px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-colors">New Experiment</button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
