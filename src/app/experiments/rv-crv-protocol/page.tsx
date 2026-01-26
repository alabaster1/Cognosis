'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Brain, Eye, Hand, Box, Heart, MessageCircle, Sparkles, Clock, Target, CheckCircle } from 'lucide-react';
import { useRVSession } from '@/hooks/useRVSession';
import { useWalletStore } from '@/store/useWalletStore';
import SessionCalibration from '@/components/survey/SessionCalibration';

export default function CRVProtocolPage() {
  const router = useRouter();
  const wallet = useWalletStore((state) => state.wallet);
  const { startSession, isLoading, error } = useRVSession();
  const [isStarting, setIsStarting] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [sessionData, setSessionData] = useState<{ userId: string; sessionId: string } | null>(null);

  const handleStartClick = async () => {
    if (!wallet) {
      router.push('/onboarding');
      return;
    }

    setIsStarting(true);

    try {
      const userId = wallet.address;

      const result = await startSession(userId, 'CRV');

      // Store session data and show calibration
      setSessionData({ userId, sessionId: result.sessionId });
      setShowCalibration(true);
      setIsStarting(false);
    } catch (err) {
      console.error('Failed to start session:', err);
      setIsStarting(false);
    }
  };

  const handleCalibrationComplete = () => {
    // Navigate to the session page after calibration
    if (sessionData) {
      router.push(`/experiments/rv-session/${sessionData.sessionId}`);
    }
  };

  const handleCalibrationSkip = () => {
    // Navigate to the session page even if calibration is skipped
    if (sessionData) {
      router.push(`/experiments/rv-session/${sessionData.sessionId}`);
    }
  };

  const stages = [
    {
      number: 1,
      name: 'Ideogram Detection',
      icon: Eye,
      color: 'violet',
      duration: '2 minutes',
      description: 'Initial contact - capture first impressions as simple lines and gestures'
    },
    {
      number: 2,
      name: 'Sensory Contact',
      icon: Hand,
      color: 'blue',
      duration: '5 minutes',
      description: 'Explore textures, temperatures, sounds, smells, and tastes'
    },
    {
      number: 3,
      name: 'Dimensional Analysis',
      icon: Box,
      color: 'green',
      duration: '5 minutes',
      description: 'Analyze spatial dimensions and physical properties'
    },
    {
      number: 4,
      name: 'Aesthetic Impact',
      icon: Heart,
      color: 'pink',
      duration: '5 minutes',
      description: 'Capture emotional tone, beauty, and aesthetic qualities'
    },
    {
      number: 5,
      name: 'Analytical Queries',
      icon: MessageCircle,
      color: 'orange',
      duration: '10 minutes',
      description: 'Deep probing with specific analytical questions'
    },
    {
      number: 6,
      name: '3D Modeling',
      icon: Brain,
      color: 'indigo',
      duration: '10 minutes',
      description: 'Comprehensive 3D mental model of the target'
    }
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'AI Expert Guidance',
      description: 'Stage-specific instructions from our RV-Expert AI agent'
    },
    {
      icon: Target,
      title: 'Blind Integrity',
      description: 'Target is committed before session begins - completely blind protocol'
    },
    {
      icon: CheckCircle,
      title: 'Multi-Dimensional Scoring',
      description: '5-dimensional objective scoring with statistical analysis'
    },
    {
      icon: Clock,
      title: 'Total Time: ~40 minutes',
      description: 'Complete all 6 stages at your own pace'
    }
  ];

  // Show calibration modal if started
  if (showCalibration && sessionData) {
    return (
      <div className="min-h-screen bg-[#060a0f]">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <SessionCalibration
            userId={sessionData.userId}
            sessionId={sessionData.sessionId}
            experimentType="remote_viewing"
            onComplete={handleCalibrationComplete}
            onSkip={handleCalibrationSkip}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-semibold">NEW: AI-Guided Protocol</span>
          </div>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Controlled Remote Viewing (CRV)
          </h1>

          <p className="text-xl text-slate-400 mb-8">
            Experience a complete 6-stage CRV protocol with personalized AI guidance
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-sm text-red-400">
                Error: {error}
              </p>
            </div>
          )}

          <button
            onClick={handleStartClick}
            disabled={isStarting || isLoading}
            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700
                     text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl
                     transition-all disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-3 mx-auto"
          >
            {isStarting || isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Starting Session...
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                Start CRV Session
              </>
            )}
          </button>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center text-cyan-400">
            What Makes This Special
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl"
              >
                <feature.icon className="w-10 h-10 mb-4 text-cyan-400" />
                <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 6 Stages */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center text-cyan-400">
            The 6-Stage CRV Protocol
          </h2>
          <div className="space-y-4">
            {stages.map((stage) => (
              <div
                key={stage.number}
                className="p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl hover:border-cyan-500 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 bg-${stage.color}-500/20 rounded-lg`}>
                    <stage.icon className={`w-6 h-6 text-${stage.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-white">
                        Stage {stage.number}: {stage.name}
                      </h3>
                      <span className="text-sm text-slate-500">{stage.duration}</span>
                    </div>
                    <p className="text-slate-400">{stage.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center text-cyan-400">
            How It Works
          </h2>
          <div className="space-y-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-white">Target Commitment</h3>
                <p className="text-slate-400">A random target is selected and cryptographically committed before you begin</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-white">AI-Guided Session</h3>
                <p className="text-slate-400">Progress through all 6 stages with personalized guidance from RV-Expert AI</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-white">Record Impressions</h3>
                <p className="text-slate-400">Capture all your perceptions, sensations, and insights at each stage</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                4
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-white">Objective Scoring</h3>
                <p className="text-slate-400">PsiScoreAI analyzes your impressions across 5 dimensions and provides detailed feedback</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                5
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-white">Personalized Feedback</h3>
                <p className="text-slate-400">Receive specific recommendations to improve your remote viewing abilities</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-4xl mx-auto mt-16 text-center">
          <button
            onClick={handleStartClick}
            disabled={isStarting || isLoading}
            className="px-12 py-5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700
                     text-white rounded-lg font-bold text-xl shadow-2xl hover:shadow-cyan-500/30
                     transition-all disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-3 mx-auto"
          >
            {isStarting || isLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                Starting Session...
              </>
            ) : (
              <>
                <Target className="w-6 h-6" />
                Begin Your CRV Journey
              </>
            )}
          </button>
          <p className="text-sm text-slate-500 mt-4">
            ~40 minutes • Complete privacy • Blockchain verified
          </p>
        </div>
      </div>
    </div>
  );
}
