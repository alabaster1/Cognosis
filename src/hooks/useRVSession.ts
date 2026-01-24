import { useState, useCallback } from 'react';

interface RVSessionState {
  sessionId: string | null;
  currentStage: number;
  protocol: string;
  impressions: Record<string, any>;
  isLoading: boolean;
  error: string | null;
}

interface SessionStartResult {
  sessionId: string;
  welcomeMessage: string;
}

export function useRVSession() {
  const [state, setState] = useState<RVSessionState>({
    sessionId: null,
    currentStage: 1,
    protocol: 'CRV',
    impressions: {},
    isLoading: false,
    error: null
  });

  const startSession = useCallback(async (
    userId: string,
    protocol: string = 'CRV'
  ): Promise<SessionStartResult> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Call backend to start RV session and commit target
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rv/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          protocol
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start RV session');
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        sessionId: result.sessionId,
        currentStage: result.currentStage || 1,
        protocol: result.protocol,
        isLoading: false
      }));

      return {
        sessionId: result.sessionId,
        welcomeMessage: result.message
      };
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  const advanceStage = useCallback((stageImpressions: any) => {
    setState(prev => ({
      ...prev,
      impressions: {
        ...prev.impressions,
        [`stage_${prev.currentStage}_data`]: stageImpressions
      },
      currentStage: prev.currentStage + 1
    }));
  }, []);

  const completeSession = useCallback(async (finalImpressions: any) => {
    if (!state.sessionId) {
      throw new Error('No active session');
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const allImpressions = {
        ...state.impressions,
        [`stage_${state.currentStage}_data`]: finalImpressions
      };

      // Call webhook to complete session and trigger scoring
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/webhooks/rv/session-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          userId: 'current-user-id', // TODO: Get from auth context
          impressions: allImpressions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete session');
      }

      const result = await response.json();
      setState(prev => ({ ...prev, isLoading: false }));

      return result;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      throw error;
    }
  }, [state.sessionId, state.impressions, state.currentStage]);

  const reset = useCallback(() => {
    setState({
      sessionId: null,
      currentStage: 1,
      protocol: 'CRV',
      impressions: {},
      isLoading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    startSession,
    advanceStage,
    completeSession,
    reset
  };
}
