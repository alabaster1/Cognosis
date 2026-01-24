// @ts-nocheck
'use client';

/**
 * Remote Viewing Objects Experiment - AI-Powered Target Selection
 * Flow: Intro → Meditation (AI commits target) → Multi-phase input → Results (AI scores)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/useWalletStore';
import experimentService from '@/services/experimentService';
import { Package, Lock, Loader2, Target, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import RevealModal, { ResultCard, StatsSummary } from '@/components/modals/RevealModal';

type Step = 'intro' | 'meditation' | 'form' | 'material' | 'details' | 'function' | 'summary' | 'results';

interface ScoringResult {
  target: Record<string, unknown>;
  score: number;
  accuracy: string;
  hits: Array<{ element: string; confidence: string; explanation: string }>;
  misses: Array<{ element: string; importance: string; explanation: string }>;
  feedback: string;
  strengths?: string[];
  areasForImprovement?: string[];
}

const SHAPES = ['sphere', 'cube', 'cylinder', 'cone', 'flat', 'irregular', 'complex', 'elongated'];
const SIZES = ['tiny', 'small', 'medium', 'large', 'huge'];
const WEIGHTS = ['featherweight', 'light', 'medium', 'heavy', 'very-heavy'];
const MATERIALS = ['metal', 'wood', 'plastic', 'glass', 'ceramic', 'fabric', 'stone', 'paper', 'rubber', 'organic'];
const TEXTURES = ['smooth', 'rough', 'bumpy', 'soft', 'hard', 'slippery', 'sticky', 'fuzzy', 'sharp', 'porous', 'rigid', 'flexible'];
const FUNCTIONS = ['tool', 'container', 'decorative', 'furniture', 'electronic', 'clothing', 'toy', 'kitchen', 'writing', 'unknown'];
const USAGE_FREQUENCY = ['everyday', 'frequent', 'occasional', 'rare', 'obsolete'];

export default function RemoteViewingObjectsPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);

  const [step, setStep] = useState<Step>('intro');
  const [commitmentId, setCommitmentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ScoringResult | null>(null);

  // Object data
  const [shape, setShape] = useState('');
  const [size, setSize] = useState('');
  const [weight, setWeight] = useState('');
  const [materials, setMaterials] = useState<string[]>([]);
  const [textures, setTextures] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(50);
  const [hasMovingParts, setHasMovingParts] = useState<boolean | null>(null);
  const [hasOpenings, setHasOpenings] = useState<boolean | null>(null);
  const [hasMarkings, setHasMarkings] = useState<boolean | null>(null);
  const [detailsNotes, setDetailsNotes] = useState('');
  const [functionCategory, setFunctionCategory] = useState('');
  const [usageFrequency, setUsageFrequency] = useState('');
  const [summaryDescription, setSummaryDescription] = useState('');

  const handleStartExperiment = async () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('meditation');

    try {
      const result = await experimentService.generateRemoteViewingTarget({
        experimentType: 'remote-viewing-objects',
        verified: (wallet as any).isVerified ?? true,
      });

      setCommitmentId(result.commitmentId);
      console.log('[RV Objects] Target committed:', result.commitmentId);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error('Generate target error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize experiment');
      setIsLoading(false);
      setStep('intro');
    }
  };

  const toggleMaterial = (material: string) => {
    setMaterials((prev) =>
      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]
    );
  };

  const toggleTexture = (texture: string) => {
    setTextures((prev) =>
      prev.includes(texture) ? prev.filter((t) => t !== texture) : [...prev, texture]
    );
  };

  const handleSubmitViewing = async () => {
    if (!summaryDescription.trim()) {
      setError('Please provide a summary description');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userResponse = {
        shape,
        size,
        weight,
        materials,
        textures,
        temperature,
        hasMovingParts,
        hasOpenings,
        hasMarkings,
        detailsNotes: detailsNotes.trim(),
        functionCategory,
        usageFrequency,
        summary: summaryDescription.trim(),
        timestamp: new Date().toISOString(),
      };

      const scoringResult = await experimentService.revealRemoteViewing({
        commitmentId,
        userResponse,
        verified: wallet?.isVerified || false,
      });

      setResults(scoringResult);
      setStep('results');
    } catch (err: unknown) {
      console.error('Reveal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reveal and score experiment');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Remote Viewing: Objects</h1>
                <p className="text-slate-400">Perceive physical properties of unknown objects</p>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">How It Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Meditation Phase</strong>
                    <p className="text-slate-400 text-sm">
                      AI randomly selects an object and commits it to blockchain (hidden from you)
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Physical Form</strong>
                    <p className="text-slate-400 text-sm">
                      Record impressions of shape, size, and weight
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>Material & Texture</strong>
                    <p className="text-slate-400 text-sm">
                      Identify materials, textures, and temperature
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    4
                  </span>
                  <div>
                    <strong>Details & Function</strong>
                    <p className="text-slate-400 text-sm">
                      Note specific features and purpose
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                    5
                  </span>
                  <div>
                    <strong>AI Scoring</strong>
                    <p className="text-slate-400 text-sm">
                      Object is revealed and AI compares your impressions to the actual object
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-300">
                <strong>🔒 Cryptographic Fairness:</strong> The object is selected and committed to IPFS/Midnight before you begin. This ensures the experiment cannot be manipulated.
              </p>
            </div>

            <button
              onClick={handleStartExperiment}
              className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2"
            >
              Begin Experiment
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'meditation') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-8 ${isLoading ? 'animate-pulse' : ''}`}>
              <Target className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold mb-4">Meditation Phase</h2>

            {isLoading ? (
              <>
                <p className="text-slate-400 mb-8">
                  AI is randomly selecting an object and committing it to blockchain...
                </p>

                <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                    <span className="text-orange-400 font-medium">Preparing target...</span>
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-slate-400">Generating random object target</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-slate-400">Encrypting object data</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-slate-400">Committing to blockchain</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-400 mb-8">
                  The object has been securely committed to the blockchain. Take as much time as you need to center yourself and prepare for the viewing session.
                </p>

                <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8 mb-8">
                  <h3 className="font-semibold mb-4 text-orange-400">Meditation Guidelines</h3>
                  <div className="space-y-3 text-left text-slate-300">
                    <p>• Find a quiet, comfortable space</p>
                    <p>• Take deep, slow breaths to relax your mind</p>
                    <p>• Clear your thoughts of distractions</p>
                    <p>• Focus on openness and receptivity</p>
                    <p>• When ready, begin your remote viewing session</p>
                  </div>
                </div>

                <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4 mb-8">
                  <p className="text-sm text-orange-300">
                    <strong>✓ Object Committed:</strong> The target is locked in and cannot be changed. Take your time - there's no rush.
                  </p>
                </div>

                <button
                  onClick={() => setStep('form')}
                  className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2"
                >
                  I&apos;m Ready - Begin Viewing
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Phase 1: Basic Form</h2>
            <p className="text-slate-400 mb-8">What is the basic shape, size, and weight?</p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Shape */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Shape</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SHAPES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setShape(s)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                        shape === s
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-[#1a2535] hover:border-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Size</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                        size === s
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-[#1a2535] hover:border-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Weight</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {WEIGHTS.map((w) => (
                    <button
                      key={w}
                      onClick={() => setWeight(w)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                        weight === w
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-[#1a2535] hover:border-gray-600'
                      }`}
                    >
                      {w.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('material')}
              className="w-full px-6 py-3 bg-orange-600 rounded-lg font-semibold hover:bg-orange-700 transition-colors mt-8"
            >
              Continue to Material & Texture
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'material') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Phase 2: Material & Texture</h2>
            <p className="text-slate-400 mb-8">What materials and textures do you perceive?</p>

            <div className="space-y-6">
              {/* Materials */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Materials (select all that apply)</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {MATERIALS.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMaterial(m)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                        materials.includes(m)
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-[#1a2535] hover:border-gray-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textures */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Textures (select all that apply)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {TEXTURES.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleTexture(t)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                        textures.includes(t)
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-[#1a2535] hover:border-gray-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Temperature Impression</label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-cyan-400">Cold</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-[#1a2535] rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-red-400">Hot</span>
                </div>
                <div className="text-center mt-2 text-sm text-slate-400">
                  {temperature < 30 ? 'Cold' : temperature < 45 ? 'Cool' : temperature < 55 ? 'Neutral' : temperature < 70 ? 'Warm' : 'Hot'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('details')}
              className="w-full px-6 py-3 bg-orange-600 rounded-lg font-semibold hover:bg-orange-700 transition-colors mt-8"
            >
              Continue to Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Phase 3: Details</h2>
            <p className="text-slate-400 mb-8">Specific details and characteristics</p>

            <div className="space-y-6">
              {/* Moving Parts */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Has Moving Parts?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHasMovingParts(true)}
                    className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                      hasMovingParts === true
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-[#1a2535] hover:border-gray-600'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setHasMovingParts(false)}
                    className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                      hasMovingParts === false
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-[#1a2535] hover:border-gray-600'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Openings */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Has Openings/Holes?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHasOpenings(true)}
                    className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                      hasOpenings === true
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-[#1a2535] hover:border-gray-600'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setHasOpenings(false)}
                    className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                      hasOpenings === false
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-[#1a2535] hover:border-gray-600'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Markings */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Has Markings/Text/Patterns?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHasMarkings(true)}
                    className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                      hasMarkings === true
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-[#1a2535] hover:border-gray-600'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setHasMarkings(false)}
                    className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                      hasMarkings === false
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-[#1a2535] hover:border-gray-600'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Additional Details (optional)</label>
                <textarea
                  value={detailsNotes}
                  onChange={(e) => setDetailsNotes(e.target.value)}
                  placeholder="Any other specific details, colors, features, or characteristics..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => setStep('function')}
              className="w-full px-6 py-3 bg-orange-600 rounded-lg font-semibold hover:bg-orange-700 transition-colors mt-8"
            >
              Continue to Function
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'function') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Phase 4: Function & Context</h2>
            <p className="text-slate-400 mb-8">What is the object&apos;s purpose and context?</p>

            <div className="space-y-6">
              {/* Function Category */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Function Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {FUNCTIONS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFunctionCategory(f)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                        functionCategory === f
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-[#1a2535] hover:border-gray-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage Frequency */}
              <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-2xl p-6">
                <label className="block text-sm font-medium mb-4">Usage Frequency</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {USAGE_FREQUENCY.map((uf) => (
                    <button
                      key={uf}
                      onClick={() => setUsageFrequency(uf)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all capitalize ${
                        usageFrequency === uf
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-[#1a2535] hover:border-gray-600'
                      }`}
                    >
                      {uf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('summary')}
              className="w-full px-6 py-3 bg-orange-600 rounded-lg font-semibold hover:bg-orange-700 transition-colors mt-8"
            >
              Continue to Summary
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'summary') {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Phase 5: Summary</h2>
            <p className="text-slate-400 mb-8">
              Provide a comprehensive summary of your impressions
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Overall Object Description
                </label>
                <textarea
                  value={summaryDescription}
                  onChange={(e) => setSummaryDescription(e.target.value)}
                  placeholder="Synthesize all your impressions into a coherent description of the object..."
                  rows={10}
                  className="w-full px-4 py-3 bg-[#0f1520] border border-[#1a2535] rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Lock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-orange-400">Fair Scoring Guaranteed</strong>
                <p className="text-slate-400 mt-1">
                  The object was committed to blockchain before you started. Your response will be compared against the pre-committed target.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitViewing}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Revealing & Scoring...
                </>
              ) : (
                <>
                  Submit & Reveal Object
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <RevealModal
        isOpen={step === 'results' && results !== null}
        onClose={() => router.push('/experiments')}
        onConfirm={() => window.location.reload()}
        title="Remote Viewing Complete!"
        experimentType="Object Remote Viewing"
        confirmText="Try Again"
        showVerification={true}
        verificationData={{
          commitmentId,
          timestamp: new Date().toISOString()
        }}
      >
        {results && (
          <div className="space-y-6">
            <StatsSummary
              stats={[
                {
                  label: 'Overall Score',
                  value: `${results.score}/100`,
                  variant: results.score >= 70 ? 'success' : results.score >= 40 ? 'warning' : 'error'
                },
                {
                  label: 'Accuracy',
                  value: results.accuracy,
                  variant: 'neutral'
                },
                {
                  label: 'Hits',
                  value: `${results.hits?.length || 0}`,
                  variant: 'success'
                },
                {
                  label: 'Misses',
                  value: `${results.misses?.length || 0}`,
                  variant: 'error'
                }
              ]}
            />

            {/* Target Reveal */}
            <ResultCard title="The Object" icon={<Target className="w-5 h-5" />} variant="info">
              <div className="bg-[#060a0f]/30 rounded-lg p-4 font-mono text-sm">
                <pre className="text-slate-300 whitespace-pre-wrap">
                  {JSON.stringify(results.target, null, 2)}
                </pre>
              </div>
            </ResultCard>

            {/* Hits */}
            {results.hits && results.hits.length > 0 && (
              <ResultCard
                title={`Hits (${results.hits.length})`}
                icon={<CheckCircle className="w-5 h-5" />}
                variant="success"
              >
                <div className="space-y-3">
                  {results.hits.map((hit, idx) => (
                    <div key={idx} className="bg-[#060a0f]/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-green-300">{hit.element}</span>
                        <span className="text-xs px-2 py-1 bg-green-500/20 rounded text-green-400">
                          {hit.confidence}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{hit.explanation}</p>
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {/* Misses */}
            {results.misses && results.misses.length > 0 && (
              <ResultCard
                title={`Misses (${results.misses.length})`}
                icon={<XCircle className="w-5 h-5" />}
                variant="error"
              >
                <div className="space-y-3">
                  {results.misses.map((miss, idx) => (
                    <div key={idx} className="bg-[#060a0f]/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-red-300">{miss.element}</span>
                        <span className="text-xs px-2 py-1 bg-red-500/20 rounded text-red-400">
                          {miss.importance}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{miss.explanation}</p>
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {/* AI Feedback */}
            <ResultCard title="AI Feedback" variant="info">
              <p className="text-slate-300 leading-relaxed">{results.feedback}</p>
            </ResultCard>

            {/* Strengths & Areas for Improvement */}
            {results.strengths && results.strengths.length > 0 && (
              <ResultCard title="Strengths" variant="success">
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  {results.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {results.areasForImprovement && results.areasForImprovement.length > 0 && (
              <ResultCard title="Areas for Improvement" variant="warning">
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  {results.areasForImprovement.map((area, idx) => (
                    <li key={idx}>{area}</li>
                  ))}
                </ul>
              </ResultCard>
            )}
          </div>
        )}
      </RevealModal>
    </>
  );
}
