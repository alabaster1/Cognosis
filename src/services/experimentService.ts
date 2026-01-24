/**
 * Experiment Service - Client-side commit-reveal flow
 */

import encryptionService from './encryptionService';
import ipfsService from './ipfsService';
import apiService from './apiService';
import walletService from './walletService';
import type { ExperimentType, ExperimentMetadata } from '@/types';

class ExperimentService {
  /**
   * Create a commitment for an experiment
   */
  async createCommitment(params: {
    experimentType: ExperimentType;
    prediction: string;
    metadata: ExperimentMetadata;
  }): Promise<{
    commitmentId: string;
    commitmentHash: string;
    nonce: string;
    cid: string;
  }> {
    try {
      console.log('[ExperimentService] Creating commitment...');

      const { experimentType, prediction, metadata } = params;

      // 1. Generate random nonce
      const nonce = encryptionService.generateKey();
      console.log('[ExperimentService] Nonce generated');

      // 2. Generate commitment hash
      const commitmentHash = await encryptionService.generateCommitment(prediction, nonce);
      console.log('[ExperimentService] Commitment hash:', commitmentHash);

      // 3. Encrypt prediction data
      const encryptionKey = encryptionService.generateKey();
      const encryptedData = await encryptionService.encrypt(
        JSON.stringify({ prediction, nonce, metadata }),
        encryptionKey
      );
      console.log('[ExperimentService] Data encrypted');

      // 4. Upload to IPFS
      const cid = await ipfsService.uploadJSON(
        { encryptedData },
        {
          name: `${experimentType}_${Date.now()}`,
          keyvalues: {
            type: experimentType,
            timestamp: new Date().toISOString(),
          },
        }
      );
      console.log('[ExperimentService] Uploaded to IPFS:', cid);

      // 5. Get wallet address
      const walletInfo = await walletService.getWalletInfo();
      if (!walletInfo) {
        throw new Error('No wallet connected');
      }

      // 6. Blockchain timestamping (TODO: implement when Midnight smart contracts are ready)
      // For now, the commitment is timestamped via:
      // - IPFS upload (decentralized storage with CID)
      // - Backend database (timestamp + commitment hash)
      // - Future: Midnight blockchain smart contract transaction
      const blockchainTxHash = null;

      // Note: Lace Midnight wallet API for transaction building is not yet available
      // in browser contexts. Will implement when the full SDK is released.
      console.log('[ExperimentService] Commitment timestamped via IPFS CID:', cid);
      console.log('[ExperimentService] TODO: Add Midnight blockchain tx when smart contracts are ready');

      // 7. Submit to backend for storage
      const commitment = await apiService.createCommitment({
        userId: walletInfo.address,
        experimentType,
        prediction,
        metadata,
        verified: walletInfo.isVerified,
        commitmentHash,
        ipfsCID: cid,
        blockchainTxHash, // Pass the real blockchain tx hash
      });

      console.log('[ExperimentService] Commitment created:', commitment.id);

      // 7. Store encryption key locally for reveal
      localStorage.setItem(`exp_key_${commitment.id}`, encryptionKey);
      localStorage.setItem(`exp_nonce_${commitment.id}`, nonce);

      return {
        commitmentId: commitment.id,
        commitmentHash: commitment.commitmentHash,
        nonce,
        cid: commitment.cid,
      };
    } catch (error) {
      console.error('[ExperimentService] Create commitment error:', error);
      throw error;
    }
  }

  /**
   * Reveal a commitment after target date
   */
  async revealCommitment(commitmentId: string): Promise<{
    score: number;
    matches: unknown[];
    explanation: string;
  }> {
    try {
      console.log('[ExperimentService] Revealing commitment:', commitmentId);

      // 1. Get stored nonce and prediction
      const nonce = localStorage.getItem(`exp_nonce_${commitmentId}`);
      const encryptionKey = localStorage.getItem(`exp_key_${commitmentId}`);

      if (!nonce) {
        throw new Error('Nonce not found. Cannot reveal this experiment.');
      }

      // 2. Get commitment data from backend
      const commitment = await apiService.getExperimentById(commitmentId);

      // 3. Decrypt prediction from IPFS
      const ipfsData = await ipfsService.retrieve(commitment.cid);
      const decryptedData = await encryptionService.decrypt(
        (ipfsData as any).encryptedData,
        encryptionKey!
      );
      const { prediction } = JSON.parse(decryptedData);

      // 4. Get wallet info
      const walletInfo = await walletService.getWalletInfo();

      // 5. Submit reveal to backend
      const response = await apiService.revealCommitment({
        commitmentId,
        prediction,
        nonce,
        verified: walletInfo?.isVerified || false,
      });

      console.log('[ExperimentService] Revealed successfully');

      // 6. Clean up local storage
      localStorage.removeItem(`exp_key_${commitmentId}`);
      localStorage.removeItem(`exp_nonce_${commitmentId}`);

      return {
        score: response.aiScore || 0,
        matches: [], // Will be populated from response
        explanation: response.aiExplanation || '',
      };
    } catch (error) {
      console.error('[ExperimentService] Reveal commitment error:', error);
      throw error;
    }
  }

  /**
   * Get user's experiment history
   */
  async getExperiments(userId: string): Promise<unknown> {
    try {
      return await apiService.getUserExperiments(userId);
    } catch (error) {
      console.error('[ExperimentService] Get experiments error:', error);
      throw error;
    }
  }

  /**
   * Generate and commit a random target for remote viewing experiments
   * This is called during the meditation/setup phase
   */
  async generateRemoteViewingTarget(params: {
    experimentType: ExperimentType;
    verified: boolean;
  }): Promise<{
    commitmentId: string;
    nonce: string;
    timestamp: string;
  }> {
    try {
      console.log('[ExperimentService] Generating RV target...');

      const { experimentType, verified } = params;

      // Call backend API to generate target and commit
      const response = await apiService.generateRemoteViewingTarget({
        experimentType,
        verified,
      });

      console.log('[ExperimentService] Target committed:', response.commitmentId);

      // Store nonce locally for reveal phase
      localStorage.setItem(`rv_nonce_${response.commitmentId}`, response.nonce);

      return {
        commitmentId: response.commitmentId,
        nonce: response.nonce,
        timestamp: response.timestamp,
      };
    } catch (error) {
      console.error('[ExperimentService] Generate RV target error:', error);
      throw error;
    }
  }

  /**
   * Reveal and score a remote viewing experiment
   */
  async revealRemoteViewing(params: {
    commitmentId: string;
    userResponse: Record<string, unknown>;
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
      console.log('[ExperimentService] Revealing RV experiment:', params.commitmentId);

      const { commitmentId, userResponse, verified } = params;

      // Get nonce from local storage
      const nonce = localStorage.getItem(`rv_nonce_${commitmentId}`);
      if (!nonce) {
        throw new Error('Nonce not found. Cannot reveal this experiment.');
      }

      // Submit reveal to backend (backend will retrieve target, score response, and log results)
      const response = await apiService.revealRemoteViewing({
        commitmentId,
        userResponse,
        nonce,
        verified,
      });

      console.log('[ExperimentService] RV revealed successfully, score:', response.score);

      // Clean up local storage
      localStorage.removeItem(`rv_nonce_${commitmentId}`);

      return response;
    } catch (error) {
      console.error('[ExperimentService] Reveal RV error:', error);
      throw error;
    }
  }

  /**
   * Check if commitment can be revealed (user-controlled)
   * User can reveal anytime, but we suggest waiting until after target date
   */
  canReveal(commitment: { revealed: boolean }): boolean {
    // User can reveal if not yet revealed
    return !commitment.revealed;
  }

  /**
   * Check if target date has passed (for UI suggestions)
   */
  isAfterTargetDate(commitment: { commitTimestamp: Date | string; metadata?: { targetDate?: string } }): boolean {
    const targetDate = commitment.metadata?.targetDate
      ? new Date(commitment.metadata.targetDate)
      : new Date(new Date(commitment.commitTimestamp).getTime() + 24 * 60 * 60 * 1000); // 24 hours default

    return new Date() >= targetDate;
  }
}

export default new ExperimentService();
