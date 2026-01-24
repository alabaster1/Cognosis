'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Bot, Sparkles, Shield, Brain, Activity, Database, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface VectorStore {
  status: string;
  documentsCount: number;
  type: string;
}

interface AgentStatus {
  success: boolean;
  agents: {
    publicOutreach: { enabled: boolean };
    scientificCommunicator: { enabled: boolean };
  };
  vectorStore: VectorStore;
}

interface SafetyCheck {
  safe: boolean;
  reason?: string;
  confidence: number;
}

interface GeneratedPost {
  content: string;
  hashtags: string[];
  tone: string;
  targetAudience: string;
  confidence: number;
  requiresApproval: boolean;
  safetyCheck: SafetyCheck;
}

interface PostResponse {
  success: boolean;
  post: GeneratedPost;
}

interface AgentStats {
  totalGenerated: number;
  averageConfidence: number;
  approvalRequired: number;
}

interface Stats {
  publicOutreach: AgentStats;
  scientificCommunicator: AgentStats;
}

export default function AgentsDashboard() {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<'publicOutreach' | 'scientificCommunicator'>('publicOutreach');
  const [experimentType, setExperimentType] = useState('remote-viewing');
  const [generatedPost, setGeneratedPost] = useState<PostResponse | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchAgentStatus();
    fetchStats();
  }, []);

  const fetchAgentStatus = async () => {
    try {
      // TODO: Add authentication token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agents/status`);
      const data = await response.json();
      if (data.success) {
        setAgentStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agents/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePost = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/agents/generate-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: selectedAgent,
          experimentType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedPost(data);
      }
    } catch (error) {
      console.error('Failed to generate post:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a0f] flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading AI Agents Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a0f]">
      <Header />

      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Bot className="w-10 h-10 text-cyan-400" />
            AI Agents Dashboard
          </h1>
          <p className="text-slate-400">
            Manage PublicOutreachAgent and ScientificCommunicatorAgent
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Bot className="w-6 h-6 text-blue-400" />
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm text-slate-400">Public Outreach</h3>
            <p className="text-2xl font-bold text-white">Active</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.publicOutreach?.totalGenerated || 0} posts generated
            </p>
          </div>

          <div className="p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-6 h-6 text-cyan-400" />
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm text-slate-400">Scientific Communicator</h3>
            <p className="text-2xl font-bold text-white">Active</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.scientificCommunicator?.totalGenerated || 0} posts generated
            </p>
          </div>

          <div className="p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-6 h-6 text-green-400" />
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm text-slate-400">Safety Filters</h3>
            <p className="text-2xl font-bold text-white">Active</p>
            <p className="text-xs text-slate-500 mt-1">
              Toxicity & Fact Verification
            </p>
          </div>

          <div className="p-6 bg-[#0f1520]/80 border border-[#1a2535] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-6 h-6 text-cyan-400" />
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm text-slate-400">Vector Store</h3>
            <p className="text-2xl font-bold text-white">
              {agentStatus?.vectorStore?.documentsCount || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {agentStatus?.vectorStore?.type?.toUpperCase() || 'FAISS'}
            </p>
          </div>
        </div>

        {/* Post Generator */}
        <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            Generate Post
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Select Agent
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedAgent('publicOutreach')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAgent === 'publicOutreach'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#1a2535] bg-[#0f1520]/80 hover:border-[#1a2535]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bot className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="font-semibold">Public Outreach Agent</p>
                      <p className="text-xs text-slate-500">Engaging, accessible content for social media</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedAgent('scientificCommunicator')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAgent === 'scientificCommunicator'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-[#1a2535] bg-[#0f1520]/80 hover:border-[#1a2535]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-cyan-400" />
                    <div>
                      <p className="font-semibold">Scientific Communicator</p>
                      <p className="text-xs text-slate-500">Rigorous, academic content with citations</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Experiment Type */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Experiment Type
              </label>
              <select
                value={experimentType}
                onChange={(e) => setExperimentType(e.target.value)}
                className="w-full p-3 bg-[#0f1520] border border-[#1a2535] rounded-lg text-white"
              >
                <option value="remote-viewing">Remote Viewing</option>
                <option value="card-prediction">Card Prediction</option>
                <option value="ai-telepathy">AI Telepathy</option>
                <option value="dream-journal">Dream Journal</option>
                <option value="event-forecasting">Event Forecasting</option>
                <option value="ganzfeld">Ganzfeld</option>
              </select>

              <button
                onClick={generatePost}
                disabled={generating}
                className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Activity className="w-5 h-5 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate Post
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Generated Post Preview */}
          {generatedPost && (
            <div className="mt-6 p-6 bg-[#0a1018] border border-[#1a2535] rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Generated Content</h3>
                <div className="flex items-center gap-2">
                  {generatedPost.post.requiresApproval ? (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Requires Approval
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Approved
                    </span>
                  )}
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    Confidence: {(generatedPost.post.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="bg-[#060a0f] p-4 rounded-lg mb-4">
                <p className="text-white whitespace-pre-wrap">{generatedPost.post.content}</p>
                {generatedPost.post.hashtags && generatedPost.post.hashtags.length > 0 && (
                  <p className="text-blue-400 mt-2">
                    {generatedPost.post.hashtags.join(' ')}
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-[#0f1520] rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Tone</p>
                  <p className="text-white capitalize">{generatedPost.post.tone}</p>
                </div>
                <div className="p-3 bg-[#0f1520] rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Target Audience</p>
                  <p className="text-white">{generatedPost.post.targetAudience}</p>
                </div>
              </div>

              {generatedPost.post.safetyCheck && !generatedPost.post.safetyCheck.safe && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold">Safety Concern</p>
                    <p className="text-red-300 text-sm">{generatedPost.post.safetyCheck.reason}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button className="flex-1 px-4 py-2 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition-all">
                  Approve & Post
                </button>
                <button className="flex-1 px-4 py-2 bg-[#1a2535] rounded-lg font-semibold hover:bg-gray-600 transition-all">
                  Edit
                </button>
                <button className="flex-1 px-4 py-2 bg-red-600 rounded-lg font-semibold hover:bg-red-700 transition-all">
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Public Outreach Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Generated:</span>
                  <span className="text-white font-semibold">{stats.publicOutreach.totalGenerated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg Confidence:</span>
                  <span className="text-white font-semibold">
                    {(stats.publicOutreach.averageConfidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pending Approval:</span>
                  <span className="text-yellow-400 font-semibold">{stats.publicOutreach.approvalRequired}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0f1520]/80 border border-[#1a2535] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Scientific Communicator Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Generated:</span>
                  <span className="text-white font-semibold">{stats.scientificCommunicator.totalGenerated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg Confidence:</span>
                  <span className="text-white font-semibold">
                    {(stats.scientificCommunicator.averageConfidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pending Approval:</span>
                  <span className="text-yellow-400 font-semibold">{stats.scientificCommunicator.approvalRequired}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
