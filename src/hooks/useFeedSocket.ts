'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FeedResult } from '@/components/feed/FeedResultCard';
import type { GlobalStats } from '@/components/feed/GlobalStatsPanel';

interface UseFeedSocketOptions {
  maxResults?: number;
  autoConnect?: boolean;
}

interface UseFeedSocketReturn {
  results: FeedResult[];
  globalStats: GlobalStats | null;
  isConnected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

// Generate wallet-derived alias
function generateAlias(walletAddress: string): string {
  const adjectives = ['Cosmic', 'Quantum', 'Mystic', 'Astral', 'Neural', 'Ethereal'];
  const nouns = ['Fox', 'Owl', 'Wolf', 'Raven', 'Phoenix', 'Dolphin'];
  const hash = walletAddress.slice(-8);
  const adjIdx = parseInt(hash.slice(0, 4), 16) % adjectives.length;
  const nounIdx = parseInt(hash.slice(4, 8), 16) % nouns.length;
  return `${adjectives[adjIdx]}${nouns[nounIdx]}_${hash.slice(0, 4)}`;
}

// Generate simulated feed results for demonstration
function generateSimulatedResult(): FeedResult {
  const experimentTypes = [
    'pattern-oracle',
    'timeline-racer',
    'retro-roulette',
    'emotion-echo',
    'quantum-coin-arena',
    'psi-poker',
    'mind-pulse',
    'synchronicity-bingo',
    'card-prediction',
    'remote-viewing',
  ];

  const baselines: Record<string, number> = {
    'pattern-oracle': 20,
    'timeline-racer': 25,
    'retro-roulette': 50,
    'emotion-echo': 12.5,
    'quantum-coin-arena': 50,
    'psi-poker': 7.7,
    'mind-pulse': 50,
    'synchronicity-bingo': 20,
    'card-prediction': 25,
    'remote-viewing': 25,
  };

  const type = experimentTypes[Math.floor(Math.random() * experimentTypes.length)];
  const baseline = baselines[type] || 25;
  // Generate accuracy with slight positive bias
  const accuracy = baseline + (Math.random() * 30 - 10);
  const fakeAddress = `addr1q${Math.random().toString(36).substring(2, 15)}`;

  return {
    id: `result-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    experimentType: type,
    score: Math.floor(accuracy),
    accuracy: Math.max(0, accuracy),
    baseline,
    delta: accuracy - baseline,
    timestamp: new Date().toISOString(),
    commitmentHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    verified: Math.random() > 0.2,
    anonymizedUser: generateAlias(fakeAddress),
  };
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun).
 * Returns P(Z <= x).
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

// Generate simulated global stats
function generateSimulatedStats(results: FeedResult[]): GlobalStats {
  const total = 15234 + results.length;
  const today = 847 + results.length;

  // Calculate aggregated stats
  const avgAccuracy = results.length > 0
    ? results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
    : 27.3;

  const avgBaseline = results.length > 0
    ? results.reduce((sum, r) => sum + r.baseline, 0) / results.length
    : 25;

  const n = Math.max(results.length, 1);
  const delta = avgAccuracy - avgBaseline;

  // Standard error: use pooled sample std dev / sqrt(n)
  const sampleStdDev = results.length > 1
    ? Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.accuracy - avgAccuracy, 2), 0) / (n - 1))
    : 15; // Default assumption
  const se = sampleStdDev / Math.sqrt(n);

  // Z-score: deviation from baseline in standard error units
  const zScore = se > 0 ? delta / se : 0;

  // One-tailed p-value: P(Z > z) for testing above-chance
  const pValue = delta > 0 ? 1 - normalCDF(zScore) : 1.0;

  // Effect size (Cohen's d)
  const effectSize = sampleStdDev > 0 ? delta / sampleStdDev : 0;

  let significanceLevel: GlobalStats['significanceLevel'] = 'none';
  if (pValue < 0.01) significanceLevel = 'highly_significant';
  else if (pValue < 0.05) significanceLevel = 'significant';
  else if (pValue < 0.10) significanceLevel = 'marginal';

  return {
    total,
    today,
    hitRate: avgAccuracy,
    baseline: avgBaseline,
    pValue,
    effectSize: parseFloat(effectSize.toFixed(3)),
    zScore: parseFloat(zScore.toFixed(2)),
    significanceLevel,
    activeUsers24h: 89 + Math.floor(Math.random() * 20),
  };
}

export default function useFeedSocket(
  options: UseFeedSocketOptions = {}
): UseFeedSocketReturn {
  const { maxResults = 100, autoConnect = true } = options;

  const [results, setResults] = useState<FeedResult[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulation mode for demonstration (fallback when API unavailable)
  const startSimulation = useCallback(() => {
    setIsConnected(true);
    setError(null);

    // Generate initial results
    const initialResults: FeedResult[] = [];
    for (let i = 0; i < 20; i++) {
      const result = generateSimulatedResult();
      // Offset timestamps to show history
      result.timestamp = new Date(Date.now() - i * 60000 * Math.random() * 10).toISOString();
      initialResults.push(result);
    }
    setResults(initialResults);
    setGlobalStats(generateSimulatedStats(initialResults));

    // Add new results periodically
    intervalRef.current = setInterval(() => {
      const newResult = generateSimulatedResult();
      setResults((prev) => {
        const updated = [newResult, ...prev].slice(0, maxResults);
        setGlobalStats(generateSimulatedStats(updated));
        return updated;
      });
    }, 5000 + Math.random() * 10000); // Random interval 5-15 seconds
  }, [maxResults]);

  // Fetch real data from the API
  const fetchRealData = useCallback(async (): Promise<boolean> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    try {
      const [resultsRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/api/feed/recent?limit=${maxResults}`),
        fetch(`${apiUrl}/api/feed/stats`),
      ]);

      if (resultsRes.ok && statsRes.ok) {
        const resultsData = await resultsRes.json();
        const statsData = await statsRes.json();

        if (resultsData.success && resultsData.results.length > 0) {
          setResults(resultsData.results);
        }
        if (statsData.success && statsData.stats) {
          setGlobalStats(statsData.stats);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [maxResults]);

  // Connect: try real API first, fall back to simulation
  const connect = useCallback(async () => {
    // Try fetching real data from API
    const hasRealData = await fetchRealData();

    if (hasRealData) {
      setIsConnected(true);
      setError(null);

      // Poll for updates every 30 seconds
      intervalRef.current = setInterval(async () => {
        await fetchRealData();
      }, 30000);
    } else {
      // Fall back to simulation mode
      startSimulation();
    }
  }, [fetchRealData, startSimulation]);

  const disconnect = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    results,
    globalStats,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
