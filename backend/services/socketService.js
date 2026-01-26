/**
 * Socket Service - WebSocket management for real-time features
 * Handles multi-user telepathy sessions, live experiments, and notifications
 */

const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

class SocketService {
  constructor() {
    this.io = null;
    this.sessions = new Map(); // sessionId -> { participants, status, data }
    this.userSockets = new Map(); // userId -> socketId
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.on('connection', (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // Authentication
      socket.on('authenticate', (data) => {
        this.handleAuthenticate(socket, data);
      });

      // Session management
      socket.on('create-session', (data) => {
        this.handleCreateSession(socket, data);
      });

      socket.on('join-session', (data) => {
        this.handleJoinSession(socket, data);
      });

      socket.on('leave-session', (data) => {
        this.handleLeaveSession(socket, data);
      });

      // Telepathy experiment events
      socket.on('sender-ready', (data) => {
        this.handleSenderReady(socket, data);
      });

      socket.on('target-selected', (data) => {
        this.handleTargetSelected(socket, data);
      });

      socket.on('receiver-response', (data) => {
        this.handleReceiverResponse(socket, data);
      });

      socket.on('reveal-target', (data) => {
        this.handleRevealTarget(socket, data);
      });

      // Chat
      socket.on('send-message', (data) => {
        this.handleSendMessage(socket, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });

    console.log('[Socket] WebSocket server initialized');
  }

  /**
   * Handle user authentication
   */
  handleAuthenticate(socket, data) {
    const { userId, username } = data;

    if (!userId) {
      socket.emit('auth-error', { error: 'User ID required' });
      return;
    }

    socket.userId = userId;
    socket.username = username || 'Anonymous';
    this.userSockets.set(userId, socket.id);

    socket.emit('authenticated', {
      userId,
      username: socket.username
    });

    console.log(`[Socket] User authenticated: ${userId} (${socket.username})`);
  }

  /**
   * Create new multi-user session
   */
  handleCreateSession(socket, data) {
    const { experimentType, sessionName, maxParticipants = 2 } = data;

    if (!socket.userId) {
      socket.emit('session-error', { error: 'Not authenticated' });
      return;
    }

    // SECURITY: Use cryptographically secure session ID
    const sessionId = `session_${crypto.randomUUID()}`;

    const session = {
      id: sessionId,
      experimentType,
      name: sessionName || `${experimentType} Session`,
      creator: socket.userId,
      participants: [{
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id,
        role: 'creator',
        status: 'ready'
      }],
      maxParticipants,
      status: 'waiting', // waiting, in_progress, completed
      createdAt: new Date(),
      data: {}
    };

    this.sessions.set(sessionId, session);
    socket.join(sessionId);
    socket.sessionId = sessionId;

    socket.emit('session-created', {
      sessionId,
      session: this.sanitizeSession(session)
    });

    // Broadcast to all clients that new session is available
    this.io.emit('session-available', {
      sessionId,
      experimentType,
      name: session.name,
      participants: session.participants.length,
      maxParticipants
    });

    console.log(`[Socket] Session created: ${sessionId} by ${socket.username}`);
  }

  /**
   * Join existing session
   */
  handleJoinSession(socket, data) {
    const { sessionId, role } = data;

    if (!socket.userId) {
      socket.emit('session-error', { error: 'Not authenticated' });
      return;
    }

    const session = this.sessions.get(sessionId);

    if (!session) {
      socket.emit('session-error', { error: 'Session not found' });
      return;
    }

    if (session.participants.length >= session.maxParticipants) {
      socket.emit('session-error', { error: 'Session full' });
      return;
    }

    if (session.status !== 'waiting') {
      socket.emit('session-error', { error: 'Session already in progress' });
      return;
    }

    // Check if user already in session
    const existingParticipant = session.participants.find(p => p.userId === socket.userId);
    if (existingParticipant) {
      socket.emit('session-error', { error: 'Already in session' });
      return;
    }

    // Add participant
    const participant = {
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id,
      role: role || 'participant',
      status: 'ready'
    };

    session.participants.push(participant);
    socket.join(sessionId);
    socket.sessionId = sessionId;

    // Notify all participants
    this.io.to(sessionId).emit('participant-joined', {
      participant: this.sanitizeParticipant(participant),
      participants: session.participants.map(p => this.sanitizeParticipant(p))
    });

    socket.emit('session-joined', {
      sessionId,
      session: this.sanitizeSession(session)
    });

    console.log(`[Socket] User ${socket.username} joined session ${sessionId}`);
  }

  /**
   * Leave session
   */
  handleLeaveSession(socket, data) {
    const { sessionId } = data;
    const session = this.sessions.get(sessionId);

    if (!session) return;

    // Remove participant
    session.participants = session.participants.filter(p => p.socketId !== socket.id);

    if (session.participants.length === 0) {
      // Delete empty session
      this.sessions.delete(sessionId);
      console.log(`[Socket] Session ${sessionId} deleted (empty)`);
    } else {
      // Notify remaining participants
      this.io.to(sessionId).emit('participant-left', {
        userId: socket.userId,
        username: socket.username,
        participants: session.participants.map(p => this.sanitizeParticipant(p))
      });
    }

    socket.leave(sessionId);
    socket.sessionId = null;

    console.log(`[Socket] User ${socket.username} left session ${sessionId}`);
  }

  /**
   * Telepathy: Sender indicates they're ready
   */
  handleSenderReady(socket, data) {
    const { sessionId } = data;
    const session = this.sessions.get(sessionId);

    if (!session) {
      socket.emit('session-error', { error: 'Session not found' });
      return;
    }

    session.status = 'in_progress';
    session.data.senderReady = true;
    session.data.startTime = new Date();

    this.io.to(sessionId).emit('sender-ready', {
      message: 'Sender is focusing on the target...',
      timestamp: session.data.startTime
    });

    console.log(`[Socket] Sender ready in session ${sessionId}`);
  }

  /**
   * Telepathy: Sender has selected target
   */
  handleTargetSelected(socket, data) {
    const { sessionId, targetHash, targetMetadata } = data;
    const session = this.sessions.get(sessionId);

    if (!session) {
      socket.emit('session-error', { error: 'Session not found' });
      return;
    }

    session.data.targetHash = targetHash;
    session.data.targetMetadata = targetMetadata;
    session.data.targetSelectedAt = new Date();

    // Notify receiver to start
    this.io.to(sessionId).emit('target-locked', {
      message: 'Target locked. Receiver may now respond.',
      timestamp: session.data.targetSelectedAt
    });

    console.log(`[Socket] Target selected in session ${sessionId}`);
  }

  /**
   * Telepathy: Receiver submits response
   */
  handleReceiverResponse(socket, data) {
    const { sessionId, response, responseHash } = data;
    const session = this.sessions.get(sessionId);

    if (!session) {
      socket.emit('session-error', { error: 'Session not found' });
      return;
    }

    session.data.receiverResponse = response;
    session.data.responseHash = responseHash;
    session.data.responseSubmittedAt = new Date();

    // Notify sender
    this.io.to(sessionId).emit('response-received', {
      message: 'Receiver has submitted their response.',
      timestamp: session.data.responseSubmittedAt
    });

    console.log(`[Socket] Response received in session ${sessionId}`);
  }

  /**
   * Reveal target and calculate results
   */
  async handleRevealTarget(socket, data) {
    const { sessionId, actualTarget } = data;
    const session = this.sessions.get(sessionId);

    if (!session) {
      socket.emit('session-error', { error: 'Session not found' });
      return;
    }

    session.data.actualTarget = actualTarget;
    session.data.revealedAt = new Date();
    session.status = 'completed';

    // Calculate duration
    const duration = session.data.revealedAt - session.data.startTime;

    // Emit results to all participants
    this.io.to(sessionId).emit('target-revealed', {
      target: actualTarget,
      response: session.data.receiverResponse,
      duration: Math.floor(duration / 1000),
      timestamp: session.data.revealedAt
    });

    console.log(`[Socket] Target revealed in session ${sessionId}`);

    // Session will be cleaned up when users leave
  }

  /**
   * Send chat message within session
   */
  handleSendMessage(socket, data) {
    const { sessionId, message } = data;
    const session = this.sessions.get(sessionId);

    if (!session) {
      socket.emit('session-error', { error: 'Session not found' });
      return;
    }

    const chatMessage = {
      userId: socket.userId,
      username: socket.username,
      message,
      timestamp: new Date()
    };

    this.io.to(sessionId).emit('chat-message', chatMessage);
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(socket) {
    console.log(`[Socket] Client disconnected: ${socket.id}`);

    // Remove from user map
    if (socket.userId) {
      this.userSockets.delete(socket.userId);
    }

    // Leave any sessions
    if (socket.sessionId) {
      this.handleLeaveSession(socket, { sessionId: socket.sessionId });
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.sessions.values()).map(s => this.sanitizeSession(s));
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? this.sanitizeSession(session) : null;
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Emit event to all users
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Broadcast a new experiment result to all connected clients.
   * Called by reveal routes after scoring is complete.
   */
  broadcastExperimentResult({ experimentType, accuracy, baseline, userId, commitmentHash, verified }) {
    const hash = (userId || 'unknown').slice(-8);
    const adjectives = ['Cosmic', 'Quantum', 'Mystic', 'Astral', 'Neural', 'Ethereal', 'Stellar', 'Lunar'];
    const nouns = ['Fox', 'Owl', 'Wolf', 'Raven', 'Phoenix', 'Dolphin', 'Eagle', 'Hawk'];
    const adjIdx = parseInt(hash.slice(0, 4), 16) % adjectives.length || 0;
    const nounIdx = parseInt(hash.slice(4, 8), 16) % nouns.length || 0;

    const result = {
      id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      experimentType,
      score: Math.round(accuracy),
      accuracy,
      baseline,
      delta: parseFloat((accuracy - baseline).toFixed(2)),
      timestamp: new Date().toISOString(),
      commitmentHash: commitmentHash || null,
      verified: !!verified,
      anonymizedUser: `${adjectives[adjIdx]}${nouns[nounIdx]}_${hash.slice(0, 4)}`,
    };

    this.broadcast('new-result', result);
  }

  /**
   * Sanitize session data for client
   */
  sanitizeSession(session) {
    return {
      id: session.id,
      experimentType: session.experimentType,
      name: session.name,
      creator: session.creator,
      participants: session.participants.map(p => this.sanitizeParticipant(p)),
      maxParticipants: session.maxParticipants,
      status: session.status,
      createdAt: session.createdAt,
      // Don't expose sensitive data like hashes
      hasTarget: !!session.data.targetHash,
      hasResponse: !!session.data.responseHash
    };
  }

  /**
   * Sanitize participant data
   */
  sanitizeParticipant(participant) {
    return {
      userId: participant.userId,
      username: participant.username,
      role: participant.role,
      status: participant.status
    };
  }

  /**
   * Clean up old sessions (call periodically)
   */
  cleanupSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt.getTime() > maxAge) {
        console.log(`[Socket] Cleaning up old session: ${sessionId}`);
        this.sessions.delete(sessionId);
      }
    }
  }
}

module.exports = new SocketService();
