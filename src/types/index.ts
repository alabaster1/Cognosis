/**
 * Cognosis Web - TypeScript Type Definitions
 */

export type WalletType = 'cardano';
export type ExperimentType =
  | 'remote-viewing'
  | 'precognition'
  | 'telepathy'
  | 'dream-journal'
  | 'synchronicity'
  | 'intuition'
  | 'psychokinesis'
  | 'retrocausality'
  | 'multi-party-telepathy'
  | 'global-consciousness'
  | 'memory-field'
  | 'event-forecasting'
  | 'card-prediction'
  | 'ai-telepathy'
  | 'remote-viewing-images'
  | 'remote-viewing-locations'
  | 'remote-viewing-objects'
  | 'telepathy-emotions'
  | 'telepathy-live'
  | 'time-loop'
  | 'pattern-oracle'
  | 'timeline-racer'
  | 'retro-roulette'
  | 'emotion-echo'
  | 'quantum-coin-arena'
  | 'psi-poker'
  | 'mind-pulse'
  | 'synchronicity-bingo'
  | 'telepathy-ghost'
  | 'dice-influence'
  | 'precog-explorer';

export type ExperimentStatus = 'draft' | 'committed' | 'revealed' | 'verified';

export interface WalletInfo {
  address: string;
  type: WalletType;
  providerName?: string; // CIP-30 provider key, e.g. 'lace', 'eternl'
  network: 'testnet' | 'mainnet' | 'preprod';
  isVerified: boolean;
}

export interface ExperimentMetadata {
  type: ExperimentType;
  title: string;
  description?: string;
  targetDate?: string;
  category?: string;
  tags?: string[];
}

export interface Commitment {
  id: string;
  userId: string;
  experimentType: ExperimentType;
  commitmentHash: string;
  metadataHash: string;
  cid: string;
  commitTxId?: string;
  commitBlockHeight?: number;
  commitTimestamp: Date;
  revealed: boolean;
  responseId?: string;
  createdAt: Date;
}

export interface Response {
  id: string;
  commitmentId: string;
  prediction: string;
  nonce: string;
  actualEvents?: string;
  aiScore?: number;
  aiExplanation?: string;
  revealTxId?: string;
  revealBlockHeight?: number;
  revealTimestamp?: Date;
  verified: boolean;
  createdAt: Date;
}

export interface ExperimentResult {
  commitment: Commitment;
  response?: Response;
  metadata: ExperimentMetadata;
  status: ExperimentStatus;
  score?: number;
  verified: boolean;
}

export interface EventMatch {
  event: string;
  similarity: number;
  explanation: string;
  source?: string;
  timestamp?: string;
}

export interface AIScore {
  score: number;
  confidence: number;
  matches: EventMatch[];
  explanation: string;
  verified: boolean;
}

export interface BaselineProfile {
  id: string;
  userId: string;
  ageRange: string;
  gender: string | null;
  handedness: string;
  timezone: string | null;
  meditationExperience: number;
  beliefScale: number;
  psiTraining: string;
  geomagneticIndex: number | null;
  lunarPhase: string | null;
  dataVersion: string;
  commitmentHash: string | null;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}
