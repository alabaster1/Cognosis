'use client';

import Header from '@/components/layout/Header';
import { HelpCircle, BookOpen, Video, FileQuestion, Lightbulb, Target, Eye, Brain } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-blue-400" />
              Help & Tutorials
            </h1>
            <p className="text-slate-400">Learn how to get the most out of your experiments</p>
          </div>

          {/* Getting Started */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-400" />
              Getting Started
            </h2>
            <div className="space-y-4 text-slate-300">
              <div>
                <h3 className="font-semibold text-white mb-2">1. Complete Your Baseline Profile</h3>
                <p className="text-sm text-slate-400">
                  Start by completing your baseline survey. This captures stable demographic data and helps control for individual differences in our scientific analysis.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">2. Choose an Experiment</h3>
                <p className="text-sm text-slate-400">
                  Browse available experiments and select one that interests you. We recommend starting with Remote Viewing using the CRV protocol.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">3. Complete Session Calibration</h3>
                <p className="text-sm text-slate-400">
                  Before each session, we'll ask about your current state (sleep, mood, focus). This helps us understand session-specific factors.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">4. Follow the Protocol</h3>
                <p className="text-sm text-slate-400">
                  Each experiment has specific instructions. Take your time, relax, and record your genuine impressions without overthinking.
                </p>
              </div>
            </div>
          </div>

          {/* Experiment Guides */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              Experiment Guides
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold text-white">Remote Viewing (CRV)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-3">
                  Coordinate Remote Viewing follows 6 structured stages to perceive distant or hidden targets.
                </p>
                <div className="text-sm text-slate-300 space-y-1">
                  <div><span className="text-cyan-400 font-semibold">Stage 1:</span> Record initial impressions (lines, curves, angles)</div>
                  <div><span className="text-cyan-400 font-semibold">Stage 2:</span> Note sensory data (textures, sounds, temperatures)</div>
                  <div><span className="text-cyan-400 font-semibold">Stage 3:</span> Dimensional and emotional impressions</div>
                  <div><span className="text-cyan-400 font-semibold">Stage 4-6:</span> Advanced analytical overlay management</div>
                </div>
              </div>

              <div className="p-4 bg-[#142030] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white">Dream Logging</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Record your dreams immediately upon waking. Include sensory details, emotions, and any recurring symbols or themes.
                </p>
              </div>
            </div>
          </div>

          {/* Tips for Success */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              Tips for Improving Accuracy
            </h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="text-yellow-400 font-bold">•</div>
                <div>
                  <div className="text-white font-semibold">Practice Regularly</div>
                  <div className="text-sm text-slate-400">Consistency builds skill. Aim for daily or weekly sessions to maintain your streak.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-yellow-400 font-bold">•</div>
                <div>
                  <div className="text-white font-semibold">Stay Relaxed</div>
                  <div className="text-sm text-slate-400">High stress or anxiety can interfere with perception. Find a quiet space and take deep breaths.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-yellow-400 font-bold">•</div>
                <div>
                  <div className="text-white font-semibold">Record First Impressions</div>
                  <div className="text-sm text-slate-400">Don't overthink or analyze. Your initial gut feeling is often the most accurate.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-yellow-400 font-bold">•</div>
                <div>
                  <div className="text-white font-semibold">Avoid Analytical Overlay</div>
                  <div className="text-sm text-slate-400">If you find yourself naming objects or locations, pause and return to raw sensory impressions.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-yellow-400 font-bold">•</div>
                <div>
                  <div className="text-white font-semibold">Review Your History</div>
                  <div className="text-sm text-slate-400">Look for patterns in your successful sessions. What conditions led to your best scores?</div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-indigo-400" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-1">How is my accuracy calculated?</h3>
                <p className="text-sm text-slate-400">
                  We use AI-powered semantic analysis to compare your impressions with the target. The system evaluates similarity across multiple dimensions including sensory, spatial, and emotional correspondence.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">What are tokens used for?</h3>
                <p className="text-sm text-slate-400">
                  Tokens are rewards for participation and performance. You earn tokens for completing sessions, maintaining streaks, and achieving high accuracy. Future features will allow token redemption for advanced experiments and insights.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">How is my data protected?</h3>
                <p className="text-sm text-slate-400">
                  All your responses are encrypted client-side before storage. We use Midnight blockchain for cryptographic commitments, ensuring data integrity while maintaining your privacy. Only you and the AI scoring service can decrypt your data.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Why do I need to update my baseline every 90 days?</h3>
                <p className="text-sm text-slate-400">
                  Your baseline profile captures stable characteristics, but some factors may change over time. Regular updates ensure our analysis accounts for any shifts in your experience or beliefs.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Can I skip session calibration?</h3>
                <p className="text-sm text-slate-400">
                  Yes, but we don't recommend it. Calibration data helps us control for state-dependent variables like sleep and mood, which can significantly affect performance.
                </p>
              </div>
            </div>
          </div>

          {/* Video Tutorials */}
          <div className="bg-[#0f1520] border border-[#1a2535] rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-red-400" />
              Video Tutorials
            </h2>
            <div className="text-slate-400 text-center py-8">
              <Video className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p>Video tutorials coming soon!</p>
              <p className="text-sm text-slate-500 mt-2">
                We're creating comprehensive video guides for each experiment type.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
