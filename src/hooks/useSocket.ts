'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  userId?: string;
  username?: string;
  autoConnect?: boolean;
}

interface SessionParticipant {
  userId: string;
  username: string;
  role: string;
  status: string;
}

interface Session {
  id: string;
  experimentType: string;
  name: string;
  creator: string;
  participants: SessionParticipant[];
  maxParticipants: number;
  status: string;
  createdAt: string;
  hasTarget: boolean;
  hasResponse: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { userId, username, autoConnect = false } = options;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Event handlers map
  const eventHandlersRef = useRef<Map<string, Set<Function>>>(new Map());

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setConnected(true);
      setError(null);

      // Auto-authenticate if userId provided
      if (userId) {
        socket.emit('authenticate', { userId, username });
      }
    });

    socket.on('authenticated', (data) => {
      console.log('[Socket] Authenticated:', data);
      setAuthenticated(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
      setAuthenticated(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err);
      setError(err.message);
    });

    socket.on('session-error', (data) => {
      console.error('[Socket] Session error:', data.error);
      setError(data.error);
    });

    socket.on('auth-error', (data) => {
      console.error('[Socket] Auth error:', data.error);
      setError(data.error);
    });

    // Session events
    socket.on('session-created', (data) => {
      console.log('[Socket] Session created:', data.sessionId);
      setCurrentSession(data.session);
      triggerEvent('session-created', data);
    });

    socket.on('session-joined', (data) => {
      console.log('[Socket] Session joined:', data.sessionId);
      setCurrentSession(data.session);
      triggerEvent('session-joined', data);
    });

    socket.on('participant-joined', (data) => {
      console.log('[Socket] Participant joined:', data.participant.username);
      if (currentSession) {
        setCurrentSession({
          ...currentSession,
          participants: data.participants
        });
      }
      triggerEvent('participant-joined', data);
    });

    socket.on('participant-left', (data) => {
      console.log('[Socket] Participant left:', data.username);
      if (currentSession) {
        setCurrentSession({
          ...currentSession,
          participants: data.participants
        });
      }
      triggerEvent('participant-left', data);
    });

    // Telepathy experiment events
    socket.on('sender-ready', (data) => {
      triggerEvent('sender-ready', data);
    });

    socket.on('target-locked', (data) => {
      triggerEvent('target-locked', data);
    });

    socket.on('response-received', (data) => {
      triggerEvent('response-received', data);
    });

    socket.on('target-revealed', (data) => {
      triggerEvent('target-revealed', data);
    });

    // Chat
    socket.on('chat-message', (data) => {
      triggerEvent('chat-message', data);
    });

    socketRef.current = socket;
  }, [userId, username, currentSession]);

  /**
   * Disconnect from server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setAuthenticated(false);
      setCurrentSession(null);
    }
  }, []);

  /**
   * Emit event to server
   */
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit - not connected');
    }
  }, []);

  /**
   * Register event listener
   */
  const on = useCallback((event: string, handler: Function) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }, []);

  /**
   * Trigger custom event handlers
   */
  const triggerEvent = useCallback((event: string, data: any) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }, []);

  // Session methods
  const createSession = useCallback((data: {
    experimentType: string;
    sessionName?: string;
    maxParticipants?: number;
  }) => {
    emit('create-session', data);
  }, [emit]);

  const joinSession = useCallback((sessionId: string, role?: string) => {
    emit('join-session', { sessionId, role });
  }, [emit]);

  const leaveSession = useCallback((sessionId: string) => {
    emit('leave-session', { sessionId });
    setCurrentSession(null);
  }, [emit]);

  // Telepathy methods
  const senderReady = useCallback((sessionId: string) => {
    emit('sender-ready', { sessionId });
  }, [emit]);

  const selectTarget = useCallback((sessionId: string, targetHash: string, targetMetadata: any) => {
    emit('target-selected', { sessionId, targetHash, targetMetadata });
  }, [emit]);

  const submitResponse = useCallback((sessionId: string, response: any, responseHash: string) => {
    emit('receiver-response', { sessionId, response, responseHash });
  }, [emit]);

  const revealTarget = useCallback((sessionId: string, actualTarget: any) => {
    emit('reveal-target', { sessionId, actualTarget });
  }, [emit]);

  // Chat method
  const sendMessage = useCallback((sessionId: string, message: string) => {
    emit('send-message', { sessionId, message });
  }, [emit]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && userId) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        disconnect();
      }
    };
  }, [autoConnect, userId, connect, disconnect]);

  return {
    connected,
    authenticated,
    currentSession,
    error,
    connect,
    disconnect,
    emit,
    on,
    createSession,
    joinSession,
    leaveSession,
    senderReady,
    selectTarget,
    submitResponse,
    revealTarget,
    sendMessage
  };
}
