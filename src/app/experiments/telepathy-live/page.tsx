'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { ArrowLeft, Users, Send, Eye, Brain, Clock, CheckCircle, Loader } from 'lucide-react';

type Phase = 'lobby' | 'waiting-partner' | 'sender-setup' | 'receiver-waiting' | 'receiver-respond' | 'results';
type Role = 'sender' | 'receiver' | null;

const TARGET_OPTIONS = [
  { id: 'circle', name: 'Circle', emoji: '⭕', color: 'blue' },
  { id: 'square', name: 'Square', emoji: '⬜', color: 'green' },
  { id: 'triangle', name: 'Triangle', emoji: '🔺', color: 'red' },
  { id: 'star', name: 'Star', emoji: '⭐', color: 'yellow' },
  { id: 'heart', name: 'Heart', emoji: '❤️', color: 'pink' }
];

export default function LiveTelepathyPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [role, setRole] = useState<Role>(null);
  const [selectedTarget, setSelectedTarget] = useState<typeof TARGET_OPTIONS[0] | null>(null);
  const [receiverGuess, setReceiverGuess] = useState<typeof TARGET_OPTIONS[0] | null>(null);
  const [messages, setMessages] = useState<Array<{ username: string; message: string; timestamp: Date }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);

  // Mock user (in real app, get from auth context)
  const userId = 'user_' + Math.random().toString(36).substr(2, 9);
  const username = 'User_' + Math.floor(Math.random() * 1000);

  const socket = useSocket({
    userId,
    username,
    autoConnect: true
  });

  // Setup event listeners
  useEffect(() => {
    if (!socket.connected) return;

    const unsubscribers = [
      socket.on('session-created', (data: any) => {
        console.log('Session created', data);
        setPhase('waiting-partner');
      }),

      socket.on('session-joined', (data: any) => {
        console.log('Session joined', data);
      }),

      socket.on('participant-joined', (data: any) => {
        console.log('Participant joined', data);
        setMessages(prev => [...prev, {
          username: 'System',
          message: `${data.participant.username} joined the session`,
          timestamp: new Date()
        }]);

        // Move to role selection if we have 2 participants
        if (data.participants.length === 2 && phase === 'waiting-partner') {
          setPhase('lobby');
        }
      }),

      socket.on('sender-ready', (data: any) => {
        console.log('Sender ready', data);
        setStartTime(new Date(data.timestamp));
        if (role === 'receiver') {
          setPhase('receiver-waiting');
        }
      }),

      socket.on('target-locked', (data: any) => {
        console.log('Target locked', data);
        if (role === 'receiver') {
          setPhase('receiver-respond');
        }
      }),

      socket.on('response-received', (data: any) => {
        console.log('Response received', data);
        setMessages(prev => [...prev, {
          username: 'System',
          message: 'Receiver has submitted their response',
          timestamp: new Date()
        }]);
      }),

      socket.on('target-revealed', (data: any) => {
        console.log('Target revealed', data);
        setDuration(data.duration);
        setPhase('results');
      }),

      socket.on('chat-message', (data: any) => {
        setMessages(prev => [...prev, {
          username: data.username,
          message: data.message,
          timestamp: new Date(data.timestamp)
        }]);
      }),

      socket.on('participant-left', (data: any) => {
        setMessages(prev => [...prev, {
          username: 'System',
          message: `${data.username} left the session`,
          timestamp: new Date()
        }]);
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [socket, phase, role]);

  const handleCreateSession = () => {
    socket.createSession({
      experimentType: 'telepathy-live',
      sessionName: `${username}'s Telepathy Session`,
      maxParticipants: 2
    });
  };

  const handleSelectRole = (selectedRole: Role) => {
    setRole(selectedRole);
    if (selectedRole === 'sender') {
      setPhase('sender-setup');
    } else {
      setPhase('receiver-waiting');
    }
  };

  const handleSelectTarget = (target: typeof TARGET_OPTIONS[0]) => {
    setSelectedTarget(target);
  };

  const handleConfirmTarget = () => {
    if (!selectedTarget || !socket.currentSession) return;

    const targetHash = btoa(JSON.stringify({ target: selectedTarget.id, timestamp: Date.now() }));

    socket.selectTarget(
      socket.currentSession.id,
      targetHash,
      { targetType: 'shape', targetId: selectedTarget.id }
    );

    socket.senderReady(socket.currentSession.id);
    setMessages(prev => [...prev, {
      username: 'System',
      message: 'Target locked. Waiting for receiver...',
      timestamp: new Date()
    }]);
  };

  const handleReceiverGuess = (target: typeof TARGET_OPTIONS[0]) => {
    setReceiverGuess(target);
  };

  const handleSubmitGuess = () => {
    if (!receiverGuess || !socket.currentSession) return;

    const responseHash = btoa(JSON.stringify({ guess: receiverGuess.id, timestamp: Date.now() }));

    socket.submitResponse(
      socket.currentSession.id,
      { guess: receiverGuess.id },
      responseHash
    );

    setMessages(prev => [...prev, {
      username: 'System',
      message: 'Response submitted. Waiting for reveal...',
      timestamp: new Date()
    }]);
  };

  const handleReveal = () => {
    if (!selectedTarget || !socket.currentSession) return;

    socket.revealTarget(socket.currentSession.id, { target: selectedTarget });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket.currentSession) return;

    socket.sendMessage(socket.currentSession.id, chatInput);
    setChatInput('');
  };

  const isCorrect = receiverGuess?.id === selectedTarget?.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/30 border-b border-cyan-500/20 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/experiments')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Live Telepathy Experiment</h1>
              <p className="text-slate-400 text-sm">Multi-user real-time transmission</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {socket.connected ? (
              <span className="flex items-center gap-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-400 text-sm">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                Disconnected
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-[#0f1520]/80 rounded-xl border border-cyan-500/20 p-8">
              {/* Initial Lobby */}
              {phase === 'lobby' && socket.currentSession && socket.currentSession.participants.length < 2 && (
                <div className="text-center space-y-6">
                  <Users className="w-16 h-16 text-cyan-400 mx-auto" />
                  <h2 className="text-2xl font-bold">Waiting for Partner...</h2>
                  <p className="text-slate-400">
                    Share this session ID with another person:
                  </p>
                  <div className="bg-[#142030] rounded-lg p-4 font-mono text-sm">
                    {socket.currentSession.id}
                  </div>
                  <Loader className="w-8 h-8 text-cyan-400 mx-auto animate-spin" />
                </div>
              )}

              {/* Role Selection */}
              {phase === 'lobby' && socket.currentSession && socket.currentSession.participants.length === 2 && !role && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Choose Your Role</h2>
                    <p className="text-slate-400">Select whether you'll send or receive</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <button
                      onClick={() => handleSelectRole('sender')}
                      className="bg-gradient-to-br from-cyan-900/30 to-violet-900/30 hover:from-cyan-800/30 hover:to-violet-800/30 border-2 border-blue-500/30 rounded-xl p-8 transition-all"
                    >
                      <Eye className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Sender</h3>
                      <p className="text-slate-400 text-sm">
                        Focus on a target and transmit mentally
                      </p>
                    </button>

                    <button
                      onClick={() => handleSelectRole('receiver')}
                      className="bg-gradient-to-br from-pink-900/50 to-violet-900/30 hover:from-pink-800/50 hover:to-violet-800/30 border-2 border-pink-500/30 rounded-xl p-8 transition-all"
                    >
                      <Brain className="w-12 h-12 text-pink-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Receiver</h3>
                      <p className="text-slate-400 text-sm">
                        Perceive and identify the transmitted target
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Sender: Select Target */}
              {phase === 'sender-setup' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Eye className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Choose Your Target</h2>
                    <p className="text-slate-400">Select a shape to transmit</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {TARGET_OPTIONS.map(target => (
                      <button
                        key={target.id}
                        onClick={() => handleSelectTarget(target)}
                        className={`p-8 rounded-xl border-2 transition-all ${
                          selectedTarget?.id === target.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-[#1a2535] hover:border-gray-600 bg-[#0a1018]'
                        }`}
                      >
                        <div className="text-6xl mb-2">{target.emoji}</div>
                        <div className="text-sm text-slate-400">{target.name}</div>
                      </button>
                    ))}
                  </div>

                  {selectedTarget && (
                    <button
                      onClick={handleConfirmTarget}
                      className="w-full py-4 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-700 hover:to-violet-700 rounded-lg font-semibold transition-all"
                    >
                      Lock Target & Begin Transmission
                    </button>
                  )}
                </div>
              )}

              {/* Receiver: Waiting */}
              {phase === 'receiver-waiting' && (
                <div className="text-center space-y-6">
                  <Brain className="w-16 h-16 text-pink-400 mx-auto animate-pulse" />
                  <h2 className="text-2xl font-bold">Preparing to Receive...</h2>
                  <p className="text-slate-400">
                    Sender is selecting and focusing on their target
                  </p>
                  <Loader className="w-8 h-8 text-pink-400 mx-auto animate-spin" />
                </div>
              )}

              {/* Receiver: Make Guess */}
              {phase === 'receiver-respond' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Brain className="w-12 h-12 text-pink-400 mx-auto mb-4 animate-pulse" />
                    <h2 className="text-2xl font-bold mb-2">What Do You Perceive?</h2>
                    <p className="text-slate-400">Select the shape you're receiving</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {TARGET_OPTIONS.map(target => (
                      <button
                        key={target.id}
                        onClick={() => handleReceiverGuess(target)}
                        className={`p-8 rounded-xl border-2 transition-all ${
                          receiverGuess?.id === target.id
                            ? 'border-pink-500 bg-pink-900/30'
                            : 'border-[#1a2535] hover:border-gray-600 bg-[#0a1018]'
                        }`}
                      >
                        <div className="text-6xl mb-2">{target.emoji}</div>
                        <div className="text-sm text-slate-400">{target.name}</div>
                      </button>
                    ))}
                  </div>

                  {receiverGuess && (
                    <button
                      onClick={handleSubmitGuess}
                      className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-700 hover:to-violet-700 rounded-lg font-semibold transition-all"
                    >
                      Submit Response
                    </button>
                  )}
                </div>
              )}

              {/* Results */}
              {phase === 'results' && (
                <div className="space-y-8">
                  <div className="text-center">
                    {isCorrect ? (
                      <>
                        <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-green-400 mb-2">Success!</h2>
                        <p className="text-slate-400">The transmission was received correctly</p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 mx-auto mb-4 text-yellow-400">⚠️</div>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-2">Not Quite</h2>
                        <p className="text-slate-400">The transmission wasn't fully received</p>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-blue-900/20 rounded-lg p-6 border border-blue-500/30">
                      <h3 className="text-sm text-slate-400 mb-4">Target (Sent)</h3>
                      <div className="text-center">
                        <div className="text-6xl mb-2">{selectedTarget?.emoji}</div>
                        <div className="font-semibold">{selectedTarget?.name}</div>
                      </div>
                    </div>

                    <div className={`rounded-lg p-6 border ${
                      isCorrect
                        ? 'bg-green-900/20 border-green-500/30'
                        : 'bg-pink-900/20 border-pink-500/30'
                    }`}>
                      <h3 className="text-sm text-slate-400 mb-4">Response (Received)</h3>
                      <div className="text-center">
                        <div className="text-6xl mb-2">{receiverGuess?.emoji}</div>
                        <div className="font-semibold">{receiverGuess?.name}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0a1018] rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Duration: {duration}s</span>
                    </div>
                    {role === 'sender' && (
                      <button
                        onClick={handleReveal}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Reveal Results
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 rounded-lg font-semibold transition-all"
                  >
                    Start New Session
                  </button>
                </div>
              )}

              {/* Create Session Button */}
              {!socket.currentSession && (
                <div className="text-center space-y-6">
                  <Users className="w-16 h-16 text-cyan-400 mx-auto" />
                  <h2 className="text-2xl font-bold">Ready to Begin?</h2>
                  <p className="text-slate-400">
                    Create a session and invite a partner
                  </p>
                  <button
                    onClick={handleCreateSession}
                    disabled={!socket.connected}
                    className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Session
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Session Info & Chat */}
          <div className="space-y-6">
            {/* Session Info */}
            {socket.currentSession && (
              <div className="bg-[#0f1520]/80 rounded-xl border border-cyan-500/20 p-6">
                <h3 className="text-lg font-semibold mb-4">Session Info</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-slate-400 mb-1">Participants</div>
                    <div className="space-y-2">
                      {socket.currentSession.participants.map((p: any) => (
                        <div key={p.userId} className="flex items-center gap-2 bg-[#142030] rounded p-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          <span>{p.username}</span>
                          {p.role && (
                            <span className="ml-auto text-xs text-cyan-400">
                              {p.role}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {role && (
                    <div>
                      <div className="text-slate-400 mb-1">Your Role</div>
                      <div className="bg-cyan-900/30 rounded p-2 capitalize">
                        {role}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat */}
            {socket.currentSession && (
              <div className="bg-[#0f1520]/80 rounded-xl border border-cyan-500/20 p-6">
                <h3 className="text-lg font-semibold mb-4">Chat</h3>
                <div className="space-y-4">
                  <div className="h-64 overflow-y-auto space-y-2 mb-4">
                    {messages.map((msg, i) => (
                      <div key={i} className="text-sm">
                        <span className={`font-semibold ${
                          msg.username === 'System' ? 'text-slate-500' : 'text-cyan-400'
                        }`}>
                          {msg.username}:
                        </span>
                        <span className="text-slate-300 ml-2">{msg.message}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-[#142030] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
