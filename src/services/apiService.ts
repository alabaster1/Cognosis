/**
 * API Service - Backend communication for commit-reveal flow
 */

import axios from 'axios';
import type { ExperimentType, ExperimentMetadata, Commitment, Response, AIScore } from '@/types';

class APIService {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  // ========================================
  // COMMIT-REVEAL FLOW
  // ========================================

  async createCommitment(data: {
    userId: string;
    experimentType: ExperimentType;
    prediction: string;
    metadata: ExperimentMetadata;
    verified: boolean;
    commitmentHash: string;
    ipfsCID: string;
    blockchainTxHash?: string | null;
  }): Promise<Commitment> {
    try {
      const response = await axios.post(`${this.baseURL}/api/commit-reveal/commit`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Create commitment error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to create commitment');
    }
  }

  async revealCommitment(data: {
    commitmentId: string;
    prediction: string;
    nonce: string;
    verified: boolean;
  }): Promise<Response> {
    try {
      const response = await axios.post(`${this.baseURL}/api/commit-reveal/reveal/event-window`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal commitment error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal commitment');
    }
  }

  // ========================================
  // EXPERIMENT HISTORY
  // ========================================

  async getUserExperiments(userId: string): Promise<Commitment[]> {
    try {
      const response = await axios.get(`${this.baseURL}/api/experiments/user/list`, {
        params: { walletAddress: userId }
      });
      return response.data.experiments || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get user experiments error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to get experiments');
    }
  }

  async getExperimentById(commitmentId: string): Promise<Commitment> {
    try {
      const response = await axios.get(`${this.baseURL}/api/experiments/${commitmentId}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get experiment error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to get experiment');
    }
  }

  // ========================================
  // AI SERVICES
  // ========================================

  async getEventRetrieval(params: {
    startDate: string;
    endDate: string;
    predictionContext?: string;
    categories?: string[];
  }): Promise<unknown> {
    try {
      const response = await axios.post(`${this.baseURL}/api/events/retrieve`, params);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Event retrieval error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to retrieve events');
    }
  }

  async scoreExperiment(data: {
    experimentType: ExperimentType;
    prediction: string;
    actualEvents?: string;
    targetDate?: string;
  }): Promise<AIScore> {
    try {
      const response = await axios.post(`${this.baseURL}/api/score`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Score experiment error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to score experiment');
    }
  }

  // ========================================
  // BLOCKCHAIN VERIFICATION
  // ========================================

  async verifyOnChain(commitmentId: string): Promise<{ verified: boolean; txHash?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/api/verify/${commitmentId}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Verify on-chain error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to verify on-chain');
    }
  }

  // ========================================
  // AI-ENHANCED REVEAL FLOW
  // ========================================

  /**
   * AI-enhanced reveal with information retrieval and scoring
   * Returns complete scoring package for user review
   */
  async revealWithAI(data: {
    commitmentId: string;
    prediction: string;
    metadata: ExperimentMetadata;
  }): Promise<{
    success: boolean;
    score: number;
    explanation: string;
    matches: unknown[];
    misses: unknown[];
    retrievedData: {
      events: unknown[];
      summary: string;
      dateRange?: string;
      retrievalMethod?: string;
      error?: string;
    };
    progressLog?: unknown[];
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/commit-reveal/reveal-with-ai`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] AI reveal error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to process AI reveal');
    }
  }

  /**
   * Submit score to blockchain after user approval
   * If txHash is provided, updates backend with Lace-submitted transaction
   * Otherwise, backend handles the transaction submission
   */
  async submitScoreToBlockchain(data: {
    commitmentId: string;
    score: number;
    scoreData: unknown;
    userSignature?: string;
    txHash?: string;
  }): Promise<{
    success: boolean;
    txHash: string;
    status: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/commit-reveal/submit-score-to-blockchain`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Blockchain submission error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to submit score to blockchain');
    }
  }

  // ========================================
  // REMOTE VIEWING EXPERIMENTS
  // ========================================

  /**
   * Generate and commit a random target for remote viewing
   * Called during meditation/setup phase
   */
  async generateRemoteViewingTarget(data: {
    experimentType: ExperimentType;
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    timestamp: string;
    ipfsCID?: string | null;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/remote-viewing/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate RV target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate remote viewing target');
    }
  }

  /**
   * Reveal and score remote viewing experiment
   * Backend retrieves committed target, scores user response, and logs results
   */
  async revealRemoteViewing(data: {
    commitmentId: string;
    userResponse: Record<string, unknown>;
    nonce: string;
    verified: boolean;
  }): Promise<{
    target: Record<string, unknown>;
    score: number;
    accuracy: string;
    hits: unknown[];
    misses: unknown[];
    feedback: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/remote-viewing/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal RV error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal remote viewing experiment');
    }
  }

  // ========================================
  // CARD PREDICTION EXPERIMENT
  // ========================================

  /**
   * Generate cryptographically secure random card targets
   */
  async generateCardPredictionTarget(data: {
    difficulty: 'easy' | 'medium' | 'hard';
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    totalRounds: number;
    difficulty: string;
    ipfsCID?: string | null;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/card-prediction/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate card target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate card prediction target');
    }
  }

  /**
   * Reveal and score card predictions
   */
  async revealCardPrediction(data: {
    commitmentId: string;
    predictions: string[];
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    rounds: Array<{ prediction: string; actual: string; correct: boolean; round: number }>;
    hits: number;
    total: number;
    accuracy: number;
    baseline: number;
    difference: number;
    performance: string;
    targets: string[];
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/card-prediction/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal card prediction error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal card prediction');
    }
  }

  // ========================================
  // AI TELEPATHY EXPERIMENT
  // ========================================

  /**
   * Generate random telepathy concept targets
   */
  async generateTelepathyTarget(data: {
    rounds: number;
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    totalRounds: number;
    ipfsCID?: string | null;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/ai-telepathy/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate telepathy target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate telepathy target');
    }
  }

  /**
   * Reveal and score telepathy guesses with warmth feedback
   */
  async revealTelepathy(data: {
    commitmentId: string;
    guesses: string[][];
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    rounds: Array<{
      round: number;
      target: string;
      category: string;
      guesses: Array<{ guess: string; warmth: string }>;
      bestGuess: string;
      bestWarmth: string;
    }>;
    averageWarmth: string;
    accuracy: string;
    performance: string;
    targets: Array<{ concept: string; category: string }>;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/ai-telepathy/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal telepathy error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal telepathy');
    }
  }

  // ========================================
  // DICE INFLUENCE EXPERIMENT
  // ========================================

  /**
   * Generate random dice roll targets for psychokinesis experiment
   */
  async generateDiceInfluenceTarget(data: {
    targetFace: number;
    totalRolls: number;
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    totalRolls: number;
    ipfsCID?: string | null;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/dice-influence/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate dice target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate dice influence target');
    }
  }

  /**
   * Reveal and score dice influence with chi-square analysis
   */
  async revealDiceInfluence(data: {
    commitmentId: string;
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    rolls: Array<{ number: number; result: number; isHit: boolean }>;
    hits: number;
    totalRolls: number;
    hitRate: number;
    expectedRate: number;
    expectedHits: number;
    difference: number;
    distribution: number[];
    chiSquare: number;
    significance: { level: string; description: string; color: string };
    performance: string;
    targetFace: number;
    actualResults: number[];
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/dice-influence/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal dice influence error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal dice influence');
    }
  }

  // ========================================
  // AI-POWERED PREDICTION SCORING
  // ========================================

  /**
   * Reveal and score precognition prediction
   */
  async revealPrecognition(data: {
    commitmentId: string;
    actualOutcome: string;
    verificationEvidence: string;
  }): Promise<{
    success: boolean;
    prediction: string;
    overallScore: number;
    accuracy: string;
    hits: Array<{ element: string; confidence: string; explanation: string }>;
    misses: Array<{ element: string; importance: string; explanation: string }>;
    feedback: string;
    strengths: string[];
    areasForImprovement: string[];
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/precognition/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal precognition error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal precognition');
    }
  }

  /**
   * Reveal and score event forecasting
   */
  async revealEventForecasting(data: {
    commitmentId: string;
    actualEvents: string;
    dateRange: string;
  }): Promise<{
    success: boolean;
    prediction: string;
    overallScore: number;
    accuracy: string;
    hits: Array<{
      event: string;
      match: string;
      timingAccuracy: string;
      detailsAccuracy: string;
      explanation: string;
    }>;
    misses: Array<{ event: string; explanation: string }>;
    feedback: string;
    statisticalSignificance: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/event-forecasting/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal event forecasting error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal event forecasting');
    }
  }

  /**
   * Reveal and score dream journal entry
   */
  async revealDreamJournal(data: {
    commitmentId: string;
    actualEvents: string;
    dreamDate: string;
  }): Promise<{
    success: boolean;
    dreamContent: string;
    overallScore: number;
    accuracy: string;
    correspondences: Array<{
      dreamElement: string;
      realEvent: string;
      type: string;
      confidence: string;
      explanation: string;
    }>;
    nonMatches: Array<{ dreamElement: string; explanation: string }>;
    feedback: string;
    precognitiveValue: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/dream-journal/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal dream journal error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal dream journal');
    }
  }

  /**
   * Reveal and score telepathy session
   */
  async revealTelepathySession(data: {
    commitmentId: string;
    receiverResponse: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    senderThoughts: string;
    receiverResponse: string;
    overallScore: number;
    accuracy: string;
    directMatches: Array<{ element: string; confidence: string; explanation: string }>;
    thematicAlignment: Array<{ theme: string; strength: string; explanation: string }>;
    misses: Array<{ element: string; explanation: string }>;
    feedback: string;
    statisticalSignificance: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/telepathy/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal telepathy error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal telepathy');
    }
  }

  /**
   * Reveal and score global consciousness prediction
   */
  async revealGlobalConsciousness(data: {
    commitmentId: string;
    actualEvent: string;
    globalData: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    prediction: string;
    overallScore: number;
    accuracy: string;
    correlations: Array<{
      aspect: string;
      dataSupport: string;
      strength: string;
      explanation: string;
    }>;
    timing: { predicted: string; actual: string; accuracy: string };
    feedback: string;
    globalSignificance: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/global-consciousness/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal global consciousness error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal global consciousness');
    }
  }

  // ========================================
  // GAMIFICATION & PERFORMANCE TRACKING
  // ========================================

  async getGamificationStats(): Promise<{
    success: boolean;
    stats: {
      streak: {
        current: number;
        longest: number;
        totalDaysActive: number;
      };
      achievements: {
        total: number;
        recentlyUnlocked: any[];
        totalPoints: number;
      };
      performance: {
        recentScores: any[];
        totalExperiments: number;
      };
      bayesianEstimates: any[];
    };
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/api/gamification/stats`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get gamification stats error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to fetch gamification stats');
    }
  }

  async getPerformanceHistory(experimentType?: string, limit?: number): Promise<{
    success: boolean;
    performanceHistory: any[];
  }> {
    try {
      const params = new URLSearchParams();
      if (experimentType) params.append('experimentType', experimentType);
      if (limit) params.append('limit', limit.toString());

      const response = await axios.get(`${this.baseURL}/api/gamification/performance?${params.toString()}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get performance history error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to fetch performance history');
    }
  }

  async getBayesianEstimates(): Promise<{
    success: boolean;
    estimates: Array<{
      experimentType: string;
      estimatedPerformance: string;
      uncertainty: string;
      sampleSize: number;
      priorMean: number;
      priorVariance: number;
      posteriorMean: number;
      posteriorVariance: number;
      lastUpdated: string;
    }>;
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/api/gamification/bayesian`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get Bayesian estimates error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to fetch Bayesian estimates');
    }
  }

  async recordPerformance(data: {
    experimentType: string;
    score: number;
    metadata?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    performance: any;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/gamification/record-performance`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Record performance error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to record performance');
    }
  }

  async getAchievements(): Promise<{
    success: boolean;
    achievements: any[];
    totalUnlocked: number;
    totalPoints: number;
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/api/gamification/achievements`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get achievements error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to fetch achievements');
    }
  }

  async updateActivity(): Promise<{
    success: boolean;
    streak: any;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/gamification/activity`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Update activity error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to update activity');
    }
  }

  // ========================================
  // DATA FEED API
  // ========================================

  /**
   * Get live feed results with pagination
   */
  async getFeedResults(params?: {
    limit?: number;
    offset?: number;
    experimentType?: string;
  }): Promise<{
    success: boolean;
    results: Array<{
      id: string;
      experimentType: string;
      score: number;
      accuracy: number;
      baseline: number;
      delta: number;
      timestamp: string;
      commitmentHash: string;
      verified: boolean;
      anonymizedUser: string;
    }>;
    hasMore: boolean;
    globalStats: {
      total: number;
      today: number;
      hitRate: number;
      baseline: number;
      pValue: number;
      effectSize: number;
      zScore: number;
      significanceLevel: 'none' | 'marginal' | 'significant' | 'highly_significant';
      activeUsers24h: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.experimentType) queryParams.append('experimentType', params.experimentType);

      const response = await axios.get(`${this.baseURL}/api/feed/live?${queryParams.toString()}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get feed results error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to get feed results');
    }
  }

  /**
   * Get global aggregate statistics
   */
  async getGlobalStats(): Promise<{
    success: boolean;
    stats: {
      totalExperiments: number;
      todayExperiments: number;
      globalHitRate: number;
      baseline: number;
      cumulativePValue: number;
      effectSize: number;
      activeUsers24h: number;
      byExperimentType: Record<string, {
        count: number;
        hitRate: number;
        baseline: number;
        effectSize: number;
      }>;
    };
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/api/feed/global-stats`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get global stats error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to get global stats');
    }
  }

  /**
   * Submit experiment result to feed
   */
  async submitToFeed(data: {
    experimentType: string;
    score: number;
    accuracy: number;
    baseline: number;
    commitmentId?: string;
    commitmentHash?: string;
    verified: boolean;
    walletAddress?: string;
  }): Promise<{
    success: boolean;
    feedResult: {
      id: string;
      anonymizedUser: string;
      commitmentHash: string;
    };
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/feed/submit`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Submit to feed error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to submit to feed');
    }
  }

  // ========================================
  // PATTERN ORACLE EXPERIMENT
  // ========================================

  /**
   * Generate cryptographically secure random target tiles for Pattern Oracle
   */
  async generatePatternOracleTarget(data: {
    gridSize: number;
    targetCount: number;
    difficulty: 'easy' | 'medium' | 'hard';
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    gridSize: number;
    targetCount: number;
    difficulty: string;
    ipfsCID?: string | null;
    commitmentHash: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/pattern-oracle/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate pattern oracle target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate pattern oracle target');
    }
  }

  /**
   * Reveal and score Pattern Oracle selections
   */
  async revealPatternOracle(data: {
    commitmentId: string;
    selections: number[];
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    targetTiles: number[];
    hits: number;
    misses: number;
    accuracy: number;
    baseline: number;
    difference: number;
    pValue: number;
    performance: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/pattern-oracle/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal pattern oracle error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal pattern oracle');
    }
  }

  // ========================================
  // TIMELINE RACER EXPERIMENT
  // ========================================

  /**
   * Generate cryptographically secure random symbol sequence for Timeline Racer
   */
  async generateTimelineRacerTarget(data: {
    totalRounds: number;
    symbolCount: number;
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    totalRounds: number;
    symbolCount: number;
    ipfsCID?: string | null;
    commitmentHash: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/timeline-racer/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate timeline racer target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate timeline racer target');
    }
  }

  /**
   * Reveal and score Timeline Racer predictions
   */
  async revealTimelineRacer(data: {
    commitmentId: string;
    predictions: Array<{ round: number; prediction: number; reactionTime: number }>;
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    rounds: Array<{
      round: number;
      prediction: number;
      actual: number;
      correct: boolean;
      reactionTime: number;
    }>;
    hits: number;
    total: number;
    accuracy: number;
    baseline: number;
    difference: number;
    averageReactionTime: number;
    performance: string;
    pValue: number;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/timeline-racer/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal timeline racer error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal timeline racer');
    }
  }

  // ========================================
  // RETRO ROULETTE EXPERIMENT
  // ========================================

  /**
   * Generate pre-determined red/black outcomes for Retro Roulette
   */
  async generateRetroRouletteTarget(data: {
    totalOutcomes: number;
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    totalOutcomes: number;
    ipfsCID?: string | null;
    commitmentHash: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/retro-roulette/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate retro roulette target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate retro roulette target');
    }
  }

  /**
   * Reveal a single outcome in Retro Roulette (progressive reveal)
   */
  async revealRetroRouletteOutcome(data: {
    commitmentId: string;
    outcomeIndex: number;
    userChoice: 'red' | 'black';
    nonce: string;
  }): Promise<{
    success: boolean;
    index: number;
    actualOutcome: 'red' | 'black';
    userChoice: 'red' | 'black';
    match: boolean;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/retro-roulette/reveal-outcome`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal retro roulette outcome error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal retro roulette outcome');
    }
  }

  /**
   * Finalize Retro Roulette experiment with complete results
   */
  async finalizeRetroRoulette(data: {
    commitmentId: string;
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    allOutcomes: Array<{ index: number; outcome: 'red' | 'black' }>;
    userChoices: Array<{ index: number; choice: 'red' | 'black'; match: boolean }>;
    matches: number;
    total: number;
    accuracy: number;
    baseline: number;
    difference: number;
    pValue: number;
    performance: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/retro-roulette/finalize`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Finalize retro roulette error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to finalize retro roulette');
    }
  }

  // ========================================
  // EMOTION ECHO EXPERIMENT
  // ========================================

  /**
   * Generate random emotion targets for Emotion Echo
   */
  async generateEmotionEchoTarget(data: {
    totalRounds: number;
    emotionCount?: number;
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    totalRounds: number;
    targetEmotions: number[];
    artSeeds: number[];
    ipfsCID?: string | null;
    commitmentHash: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/emotion-echo/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate emotion echo target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate emotion echo target');
    }
  }

  /**
   * Get abstract art data for a specific round (art generation parameters without revealing emotion)
   */
  async getEmotionEchoArt(data: {
    commitmentId: string;
    roundIndex: number;
  }): Promise<{
    success: boolean;
    roundIndex: number;
    artSeed: string;
    artParameters: {
      shapes: Array<{ type: string; color: string; x: number; y: number; size: number; rotation: number }>;
      background: string;
    };
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/emotion-echo/get-art`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get emotion echo art error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to get emotion echo art');
    }
  }

  /**
   * Reveal and score Emotion Echo selections
   */
  async revealEmotionEcho(data: {
    commitmentId: string;
    selections: Array<{ round: number; selectedEmotion?: string; selectedEmotionIndex?: number }>;
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    rounds: Array<{
      round: number;
      targetEmotion: string;
      selectedEmotion: string;
      correct: boolean;
      artExplanation: string;
    }>;
    results: Array<{
      round: number;
      targetEmotionIndex: number;
      selectedEmotionIndex: number;
      correct: boolean;
    }>;
    hits: number;
    total: number;
    accuracy: number;
    baseline: number;
    difference: number;
    pValue: number;
    performance: string;
    commitmentHash: string;
    verified: boolean;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/emotion-echo/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal emotion echo error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal emotion echo');
    }
  }

  // ========================================
  // QUANTUM COIN ARENA EXPERIMENT
  // ========================================

  /**
   * Generate random coin flip outcomes for Quantum Coin Arena
   */
  async generateQuantumCoinTarget(data: {
    totalFlips: number;
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    totalFlips: number;
    simulatedPlayerSeed: number;
    ipfsCID?: string | null;
    commitmentHash: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/quantum-coin-arena/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate quantum coin target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate quantum coin target');
    }
  }

  /**
   * Reveal and score Quantum Coin Arena with intentions
   */
  async revealQuantumCoin(data: {
    commitmentId: string;
    intentions: Array<{ round: number; intention: 'heads' | 'tails' }>;
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    rounds: Array<{
      round: number;
      outcome: 'heads' | 'tails';
      intention: 'heads' | 'tails';
      aligned: boolean;
    }>;
    totalFlips: number;
    headsCount: number;
    tailsCount: number;
    alignments: number;
    accuracy: number;
    baseline: number;
    chiSquare: number;
    effectSize: number;
    significance: string;
    performance: string;
    commitmentHash: string;
    verified: boolean;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/quantum-coin-arena/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal quantum coin error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal quantum coin');
    }
  }

  /**
   * Reveal a single quantum coin flip (per-round reveal)
   */
  async revealQuantumCoinFlip(data: {
    commitmentId: string;
    flipIndex: number;
    userIntention: 'heads' | 'tails';
    nonce: string;
  }): Promise<{
    success: boolean;
    outcome: 'heads' | 'tails';
    aligned: boolean;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/quantum-coin-arena/reveal-flip`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal quantum coin flip error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal quantum coin flip');
    }
  }

  /**
   * Finalize quantum coin arena experiment with all round intentions
   */
  async finalizeQuantumCoinArena(data: {
    commitmentId: string;
    roundIntentions: Array<{ round: number; userIntention: 'heads' | 'tails' }>;
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    alignments: number;
    accuracy: number;
    baseline: number;
    pValue: number;
    chiSquare: number;
    effectSize: number;
    performance: string;
    commitmentHash: string;
    verified: boolean;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/quantum-coin-arena/finalize`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Finalize quantum coin arena error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to finalize quantum coin arena');
    }
  }

  // ========================================
  // PSI POKER EXPERIMENT
  // ========================================

  /**
   * Generate shuffled deck and hands for Psi Poker
   */
  async generatePsiPokerTarget(data: {
    playerCount?: number;
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    playerCount: number;
    shuffledDeck: number[];
    numOpponents: number;
    ipfsCID?: string | null;
    commitmentHash: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/psi-poker/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate psi poker target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate psi poker target');
    }
  }

  /**
   * Get user's own hand in Psi Poker (partial reveal)
   */
  async getPsiPokerHand(data: {
    commitmentId: string;
    playerId: string;
  }): Promise<{
    success: boolean;
    hand: Array<{ suit: string; rank: string }>;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/psi-poker/get-hand`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get psi poker hand error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to get psi poker hand');
    }
  }

  /**
   * Reveal and score Psi Poker predictions
   */
  async revealPsiPoker(data: {
    commitmentId: string;
    predictions?: {
      opponentHands: Array<{ playerId: string; predictedHand: Array<{ suit: string; rank: string }> }>;
      communityCards: Array<{ suit: string; rank: string }>;
    };
    opponentPredictions?: Array<{ opponentId: string; predictedCards: number[] }>;
    communityPredictions?: number[];
    nonce: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    actualHands: Array<{
      playerId: string;
      hand: Array<{ suit: string; rank: string }>;
      handRank: string;
    }>;
    actualCommunityCards: Array<{ suit: string; rank: string }>;
    handPredictionAccuracy: number;
    communityCardAccuracy: number;
    overallAccuracy: number;
    totalAccuracy: number;
    opponentAccuracy: number;
    communityAccuracy: number;
    correctOpponentCards: number;
    totalOpponentCards: number;
    correctCommunityCards: number;
    baseline: number;
    pValue: number;
    performance: string;
    commitmentHash: string;
    verified: boolean;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/psi-poker/reveal`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Reveal psi poker error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to reveal psi poker');
    }
  }

  // ========================================
  // MIND PULSE EXPERIMENT
  // ========================================

  /**
   * Generate target for Mind Pulse global consciousness experiment
   */
  async generateMindPulseTarget(data: {
    pulseType: 'color' | 'number' | 'concept';
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    pulseId: string;
    targetType: string;
    targetValue: string;
    targetDisplay: string;
    scheduledTime: string;
    ipfsCID?: string | null;
    commitmentHash: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/mind-pulse/generate-target`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate mind pulse target error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate mind pulse target');
    }
  }

  /**
   * Join a Mind Pulse event (or get current/next pulse)
   */
  async joinMindPulse(data: {
    verified: boolean;
    walletAddress?: string;
  }): Promise<{
    success: boolean;
    pulseId: string;
    participantId: string;
    participantCount: number;
    targetIndex: number;
    scheduledTime: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/mind-pulse/join`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Join mind pulse error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to join mind pulse');
    }
  }

  /**
   * Complete participation in a Mind Pulse event
   */
  async completeMindPulse(data: {
    pulseId: string;
    participantId: string;
    verified: boolean;
  }): Promise<{
    success: boolean;
    convergenceRate: number;
    finalParticipantCount: number;
    effectSize: number;
    significance: string;
    pulseHash: string;
    verified: boolean;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/mind-pulse/complete`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Complete mind pulse error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to complete mind pulse');
    }
  }

  /**
   * Get Mind Pulse results after completion
   */
  async getMindPulseResults(data: {
    commitmentId: string;
    nonce: string;
  }): Promise<{
    success: boolean;
    target: { type: string; value: string; display: string };
    participantCount: number;
    convergenceRate: number;
    effectSize: number;
    significance: string;
    rngDeviation: number;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/mind-pulse/results`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get mind pulse results error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to get mind pulse results');
    }
  }

  // ========================================
  // SYNCHRONICITY BINGO EXPERIMENT
  // ========================================

  /**
   * Generate daily bingo card for Synchronicity Bingo
   */
  async generateSynchronicityBingoCard(data: {
    verified: boolean;
  }): Promise<{
    success: boolean;
    commitmentId: string;
    nonce: string;
    cardId: string;
    gridOrder: number[];
    date: string;
    ipfsCID?: string | null;
    commitmentHash: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/synchronicity-bingo/generate-card`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Generate synchronicity bingo card error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to generate synchronicity bingo card');
    }
  }

  /**
   * Get today's bingo card with seed for deterministic layout
   */
  async getSynchronicityBingoCard(data: {
    verified: boolean;
  }): Promise<{
    success: boolean;
    cardId: string;
    sessionId: string;
    cardSeed: number;
    date: string;
    globalMatches?: Array<{ id: string; type: string; users: string[]; timestamp: string }>;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/synchronicity-bingo/get-card`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Get synchronicity bingo card error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to get synchronicity bingo card');
    }
  }

  /**
   * Log a synchronicity event
   */
  async logSynchronicity(data: {
    commitmentId?: string;
    cardId?: string;
    sessionId?: string;
    synchronicityType: string;
    cellIndex: number;
    description?: string;
  }): Promise<{
    success: boolean;
    logged: boolean;
    matchedWith: string | null;
    globalCount: number;
    globalMatch?: boolean;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/synchronicity-bingo/log`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Log synchronicity error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to log synchronicity');
    }
  }

  /**
   * Check for bingo and get final results
   */
  async checkSynchronicityBingo(data: {
    commitmentId: string;
    nonce: string;
  }): Promise<{
    success: boolean;
    hasBingo: boolean;
    bingoLine: number[] | null;
    loggedCount: number;
    matchedCount: number;
    globalMatches: Array<{ type: string; users: string[]; timestamp: string }>;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/experiments/synchronicity-bingo/check`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('[APIService] Check synchronicity bingo error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error || 'Failed to check synchronicity bingo');
    }
  }
  // ============================================
  // TELEPATHY GHOST SIGNAL
  // ============================================

  async createTelepathySession(data: { userId: string; delayMinutes?: number }) {
    try {
      const response = await axios.post(`${this.baseURL}/api/telepathy/sessions`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      throw new Error(err.response?.data?.error || 'Failed to create telepathy session');
    }
  }

  async joinTelepathySession(data: { userId: string; inviteCode?: string; sessionId?: string }) {
    try {
      const response = await axios.post(`${this.baseURL}/api/telepathy/sessions/join`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      throw new Error(err.response?.data?.error || 'Failed to join telepathy session');
    }
  }

  async submitSenderTags(sessionId: string, data: { userId: string; tags: string[] }) {
    try {
      const response = await axios.post(`${this.baseURL}/api/telepathy/sessions/${sessionId}/sender-tags`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      throw new Error(err.response?.data?.error || 'Failed to submit sender tags');
    }
  }

  async checkTelepathyDelay(sessionId: string) {
    try {
      const response = await axios.get(`${this.baseURL}/api/telepathy/sessions/${sessionId}/delay`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      throw new Error(err.response?.data?.error || 'Failed to check delay');
    }
  }

  async submitReceiverResponse(sessionId: string, data: { userId: string; tags: string[]; choiceIndex: number }) {
    try {
      const response = await axios.post(`${this.baseURL}/api/telepathy/sessions/${sessionId}/receiver-response`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      throw new Error(err.response?.data?.error || 'Failed to submit receiver response');
    }
  }

  async getTelepathySession(sessionId: string, userId: string) {
    try {
      const response = await axios.get(`${this.baseURL}/api/telepathy/sessions/${sessionId}?userId=${userId}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      throw new Error(err.response?.data?.error || 'Failed to get telepathy session');
    }
  }

  async getTelepathySessions(userId: string) {
    try {
      const response = await axios.get(`${this.baseURL}/api/telepathy/sessions?userId=${userId}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      throw new Error(err.response?.data?.error || 'Failed to get telepathy sessions');
    }
  }

  async joinTelepathyMatchmaking(data: { userId: string; role?: string; preferredDelay?: number }) {
    try {
      const response = await axios.post(`${this.baseURL}/api/telepathy/matchmaking`, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      throw new Error(err.response?.data?.error || 'Failed to join matchmaking');
    }
  }
}

export default new APIService();
