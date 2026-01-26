'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useWalletStore } from '@/store/walletStore';
import { Ghost, Send, Radio, Users, Clock, Loader2, Copy, Check } from 'lucide-react';
import Link from 'next/link';

type Mode = 'menu' | 'create' | 'join' | 'matchmaking' | 'waiting';

export default function TelepathyGhostPage() {
  const wallet = useWalletStore();
  const [mode, setMode] = useState<Mode>('menu');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [sessions, setSessions] = useState<any[]>([]);

  const userId = (wallet as any).address || 'guest-user';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/telepathy/sessions?userId=${userId}`);
      if (resp.ok) {
        const data = await resp.json();
        setSessions(data);
      }
    } catch {}
  };

  const createSession = async () => {
    setIsLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/telepathy/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, delayMinutes }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setInviteCode(data.inviteCode);
      setSessionId(data.sessionId);
      setMode('waiting');
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const joinSession = async () => {
    setIsLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/telepathy/sessions/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, inviteCode: joinCode }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setSessionId(data.sessionId);
      // Navigate to receiver page
      window.location.href = `/experiments/telepathy-ghost/receiver?sessionId=${data.sessionId}&userId=${userId}`;
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
    } finally {
      setIsLoading(false);
    }
  };

  const joinMatchmaking = async () => {
    setIsLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/telepathy/matchmaking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: 'any', preferredDelay: delayMinutes }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      if (data.matched) {
        setSessionId(data.sessionId);
        window.location.href = `/experiments/telepathy-ghost/sender?sessionId=${data.sessionId}&userId=${userId}`;
      } else {
        setMode('waiting');
      }
    } catch (err: any) {
      setError(err.message || 'Matchmaking failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Ghost className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Ghost Signal
            </h1>
          </div>
          <p className="text-gray-400">
            2-Player Async Telepathy &mdash; Send thoughts across time and space
          </p>
        </motion.div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Main Menu */}
        {mode === 'menu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left flex items-center gap-4"
            >
              <Send className="w-6 h-6 text-purple-400" />
              <div>
                <div className="font-semibold">Be the Sender</div>
                <div className="text-sm text-gray-400">View a target image and transmit your impression</div>
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left flex items-center gap-4"
            >
              <Radio className="w-6 h-6 text-indigo-400" />
              <div>
                <div className="font-semibold">Be the Receiver</div>
                <div className="text-sm text-gray-400">Tune in and identify the transmitted image</div>
              </div>
            </button>

            <button
              onClick={() => joinMatchmaking()}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left flex items-center gap-4"
            >
              <Users className="w-6 h-6 text-green-400" />
              <div>
                <div className="font-semibold">Auto-Match</div>
                <div className="text-sm text-gray-400">Get paired with another player automatically</div>
              </div>
            </button>

            {/* Active Sessions */}
            {sessions.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Your Sessions</h3>
                <div className="space-y-2">
                  {sessions.slice(0, 5).map((s: any) => (
                    <Link
                      key={s.sessionId}
                      href={`/experiments/telepathy-ghost/${s.role}?sessionId=${s.sessionId}&userId=${userId}`}
                      className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm capitalize">{s.role} &mdash; {s.status}</span>
                        {s.overallScore !== null && (
                          <span className="text-xs text-purple-400">Score: {(s.overallScore * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Create Session */}
        {mode === 'create' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Delay Duration (minutes)</label>
              <div className="flex gap-2">
                {[15, 30, 60].map(mins => (
                  <button
                    key={mins}
                    onClick={() => setDelayMinutes(mins)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      delayMinutes === mins
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mandatory waiting period between sender and receiver phases
              </p>
            </div>

            <button
              onClick={createSession}
              disabled={isLoading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Create Session & Generate Target
            </button>

            <button
              onClick={() => setMode('menu')}
              className="w-full py-2 text-gray-400 hover:text-white text-sm"
            >
              Back
            </button>
          </motion.div>
        )}

        {/* Join Session */}
        {mode === 'join' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Enter Invite Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter 12-character invite code..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <button
              onClick={joinSession}
              disabled={isLoading || !joinCode.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
              Join as Receiver
            </button>

            <button
              onClick={() => setMode('menu')}
              className="w-full py-2 text-gray-400 hover:text-white text-sm"
            >
              Back
            </button>
          </motion.div>
        )}

        {/* Waiting for Match */}
        {mode === 'waiting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
            {inviteCode && (
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm text-gray-400 mb-2">Share this invite code with your partner:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-mono text-purple-300 tracking-wider">{inviteCode}</code>
                  <button onClick={copyInviteCode} className="p-2 hover:bg-white/10 rounded-lg">
                    {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Once your partner joins, you'll be redirected to the sender view.
                </p>

                <Link
                  href={`/experiments/telepathy-ghost/sender?sessionId=${sessionId}&userId=${userId}`}
                  className="mt-4 inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all"
                >
                  Go to Sender View
                </Link>
              </div>
            )}

            {!inviteCode && (
              <div className="p-6">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-gray-300">Searching for a match...</p>
                <p className="text-sm text-gray-500 mt-1">You'll be paired when another player joins</p>
              </div>
            )}

            <button
              onClick={() => { setMode('menu'); setInviteCode(''); }}
              className="py-2 text-gray-400 hover:text-white text-sm"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10"
        >
          <h3 className="text-sm font-medium text-gray-300 mb-3">How Ghost Signal Works</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" />
              <span>Sender views an AI-generated target image and provides 3 descriptive tags</span>
            </div>
            <div className="flex gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" />
              <span>A mandatory {delayMinutes}-minute delay is enforced (blockchain-verified)</span>
            </div>
            <div className="flex gap-3">
              <Radio className="w-4 h-4 mt-0.5 text-green-400 shrink-0" />
              <span>Receiver provides 3 "sensed" tags, then selects from 4 similar images</span>
            </div>
            <div className="flex gap-3">
              <Ghost className="w-4 h-4 mt-0.5 text-yellow-400 shrink-0" />
              <span>AI scores using CLIP similarity, Psi-Coefficient, and tag overlap</span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
