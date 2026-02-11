/**
 * Remote Viewing Cardano Service - Full Lifecycle
 *
 * Handles the complete on-chain RV experiment flow:
 * 1. startExperiment() - Backend generates target, client builds & signs commit tx
 * 2. submitAndScore() - Client submits impressions, backend AI scores
 * 3. settleAndClaim() - Client builds composite settle+claim tx, signs, gets PSY
 *
 * All Cardano imports are lazy-loaded to avoid WASM loading during SSR prerendering.
 */

import type { LucidEvolution, UTxO } from "@lucid-evolution/lucid";

// Lazy-loaded modules (WASM can't load in Node.js SSR)
let _lucidMod: typeof import("@lucid-evolution/lucid") | null = null;
let _psiMod: typeof import("@/lib/cardano/psiContract") | null = null;
let _vaultMod: typeof import("@/lib/cardano/rewardVault") | null = null;

async function lucidMod() {
  if (!_lucidMod) _lucidMod = await import("@lucid-evolution/lucid");
  return _lucidMod;
}
async function psiMod() {
  if (!_psiMod) _psiMod = await import("@/lib/cardano/psiContract");
  return _psiMod;
}
async function vaultMod() {
  if (!_vaultMod) _vaultMod = await import("@/lib/cardano/rewardVault");
  return _vaultMod;
}

// ============================================================================
// TYPES
// ============================================================================

export interface RVStartResult {
  sessionId: string;
  targetHash: string;
  nonce: string;
  commitTxHash: string;
  explorerUrl: string;
}

export interface RVScoreResult {
  sessionId: string;
  score: number;
  psyReward: number;
  redeemerCbor: string;
}

export interface RVSettleResult {
  txHash: string;
  psyReward: bigint;
  explorerUrl: string;
}

export interface ContractConfig {
  network: string;
  validators: {
    psiExperiment: { hash: string; address: string; script: string };
    researchPool: { hash: string; address: string; script: string };
    rewardVault: { hash: string; address: string; script: string };
  };
  psyToken: {
    policyId: string;
    assetName: string;
    unit: string;
  };
}

// ============================================================================
// SERVICE
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const BLOCKFROST_URL = "https://cardano-preprod.blockfrost.io/api/v0";
const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || "";

class RVCardanoService {
  private lucid: LucidEvolution | null = null;
  private contractsInitialized = false;

  /**
   * Initialize Lucid with Blockfrost
   */
  async initialize(): Promise<void> {
    if (this.lucid) return;

    if (!BLOCKFROST_API_KEY) {
      throw new Error("Blockfrost API key not configured");
    }

    const { Lucid, Blockfrost } = await lucidMod();
    this.lucid = await Lucid(
      new Blockfrost(BLOCKFROST_URL, BLOCKFROST_API_KEY),
      "Preprod"
    );
  }

  /**
   * Connect wallet (Lace, Nami, etc.)
   */
  async connectWallet(walletName: string): Promise<string> {
    if (!this.lucid) {
      await this.initialize();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walletApi = await (window as any).cardano?.[walletName.toLowerCase()]?.enable();
    if (!walletApi) {
      throw new Error(`${walletName} wallet not found`);
    }

    this.lucid!.selectWallet.fromAPI(walletApi);
    return await this.lucid!.wallet().address();
  }

  /**
   * Load contract addresses from backend config
   */
  async initializeContracts(): Promise<void> {
    if (this.contractsInitialized) return;

    try {
      const response = await fetch(`${API_URL}/api/cardano/config`);
      const data = await response.json();

      if (!data.success) {
        throw new Error("Failed to load contract config");
      }

      const config: ContractConfig = data.config;
      const psi = await psiMod();
      const vault = await vaultMod();

      // Initialize psiContract module
      psi.initializeContracts(
        config.validators.psiExperiment.address,
        config.validators.researchPool.address,
        config.validators.psiExperiment.script,
        config.validators.researchPool.script
      );

      // Initialize rewardVault module
      if (config.validators.rewardVault.address && config.psyToken.policyId) {
        vault.initializeRewardVault(
          config.validators.rewardVault.address,
          config.validators.rewardVault.script,
          config.psyToken.policyId,
          config.psyToken.assetName
        );
      }

      this.contractsInitialized = true;
    } catch (error) {
      console.error("[RVCardanoService] Failed to load contract config:", error);
      throw error;
    }
  }

  /**
   * Check if wallet is connected
   */
  async isWalletConnected(): Promise<boolean> {
    if (!this.lucid) return false;
    try {
      await this.lucid.wallet().address();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet address
   */
  async getWalletAddress(): Promise<string | null> {
    if (!this.lucid) return null;
    try {
      return await this.lucid.wallet().address();
    } catch {
      return null;
    }
  }

  /**
   * Step 1: Start RV experiment
   * - Call backend /rv/start to generate target + hash
   * - Build commit tx with Lucid
   * - User signs
   * - Confirm with backend
   */
  async startExperiment(stakeAda: number = 2): Promise<RVStartResult> {
    if (!this.lucid) throw new Error("Lucid not initialized");
    await this.initializeContracts();

    const { Data, getAddressDetails } = await lucidMod();
    const psi = await psiMod();

    const walletAddress = await this.lucid.wallet().address();
    const stakeLovelace = Math.floor(stakeAda * 1_000_000);

    // 1. Call backend to generate target and get datum
    const startResponse = await fetch(`${API_URL}/api/cardano/rv/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, stakeLovelace }),
    });
    const startData = await startResponse.json();

    if (!startData.success) {
      throw new Error(startData.error || "Failed to start RV session");
    }

    const session = startData.session;

    // 2. Build commit tx using psiContract
    const { paymentCredential } = getAddressDetails(walletAddress);
    const hostPkh = paymentCredential!.hash;
    const currentSlot = BigInt(session.currentSlot);

    const datum = psi.buildPsiDatum(
      "RemoteViewing",
      session.targetHash,
      hostPkh,
      BigInt(stakeLovelace),
      currentSlot,
      BigInt(session.joinDeadlineSlot),
      BigInt(session.revealDeadlineSlot)
    );

    const tx = await this.lucid
      .newTx()
      .pay.ToContract(
        psi.PSI_CONTRACT_ADDRESS,
        { kind: "inline", value: Data.to(datum) },
        { lovelace: BigInt(stakeLovelace) }
      )
      .complete();

    // 3. User signs
    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();

    // 4. Wait for confirmation
    await this.lucid.awaitTx(txHash);

    // 5. Confirm with backend
    await fetch(`${API_URL}/api/cardano/rv/confirm-commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        txHash,
      }),
    });

    return {
      sessionId: session.sessionId,
      targetHash: session.targetHash,
      nonce: session.nonce,
      commitTxHash: txHash,
      explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
    };
  }

  /**
   * Step 2: Submit impressions and get AI score
   * - Send impressions to backend for AI scoring
   * - Backend returns score + redeemer data for settle tx
   */
  async submitAndScore(
    sessionId: string,
    impressions: { description: string; impressions: string }
  ): Promise<RVScoreResult> {
    const response = await fetch(`${API_URL}/api/cardano/rv/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, impressions }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to score impressions");
    }

    return {
      sessionId: data.sessionId,
      score: data.score,
      psyReward: data.psyReward,
      redeemerCbor: data.redeemerCbor,
    };
  }

  /**
   * Step 3: Settle experiment and claim PSY reward
   * - Build composite tx: spend experiment UTxO + vault UTxO
   * - User signs
   * - PSY tokens sent to user, research pool gets 5%
   */
  async settleAndClaim(
    sessionId: string,
    score: number,
    _nonce: string
  ): Promise<RVSettleResult> {
    if (!this.lucid) throw new Error("Lucid not initialized");

    const { Data, getAddressDetails } = await lucidMod();
    const psi = await psiMod();
    const vault = await vaultMod();

    if (!vault.REWARD_VAULT_ADDRESS || !psi.PSI_CONTRACT_ADDRESS) {
      throw new Error("Contracts not initialized");
    }

    // sessionId format is "txHash#outputIndex" from startExperiment
    const [commitTxHash, outputIndexStr] = sessionId.split("#");
    const outputIndex = parseInt(outputIndexStr ?? "0", 10);

    const walletAddress = await this.lucid.wallet().address();
    const { paymentCredential } = getAddressDetails(walletAddress);
    const recipientPkh = paymentCredential!.hash;

    // Find the session UTxO by matching the commit tx hash + output index
    const sessionUtxos = await this.lucid.utxosAt(psi.PSI_CONTRACT_ADDRESS);
    let sessionUtxo: UTxO | undefined;

    // First try: exact match on original commit tx
    sessionUtxo = sessionUtxos.find(
      (u) => u.txHash === commitTxHash && u.outputIndex === outputIndex
    );

    // Second try: match by host PKH in datum (for cases where UTxO was recreated)
    if (!sessionUtxo) {
      sessionUtxo = sessionUtxos.find((u) => {
        if (!u.datum) return false;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = Data.from(u.datum) as any;
          return d.fields?.[1] === recipientPkh;
        } catch {
          return false;
        }
      });
    }

    if (!sessionUtxo) {
      throw new Error(
        `Session UTxO not found at script address for session ${sessionId}`
      );
    }

    // Find the vault UTxO
    const vaultUtxos = await this.lucid.utxosAt(vault.REWARD_VAULT_ADDRESS);
    const vaultUtxo = vaultUtxos[0];
    if (!vaultUtxo) {
      throw new Error("Reward vault UTxO not found");
    }

    // Build composite settle + claim tx
    // For preprod MVP, oracle_signature is empty (server co-signs)
    const result = await vault.claimRewardWithScore(
      this.lucid,
      sessionUtxo,
      vaultUtxo,
      score,
      "", // oracle_signature - not verified on-chain for preprod
      recipientPkh
    );

    // Confirm settlement with backend
    await fetch(`${API_URL}/api/cardano/rv/confirm-settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        txHash: result.txHash,
        psyRewardAmount: result.rewardAmount.toString(),
      }),
    });

    return {
      txHash: result.txHash,
      psyReward: result.rewardAmount,
      explorerUrl: `https://preprod.cardanoscan.io/transaction/${result.txHash}`,
    };
  }

  /**
   * Get vault state (PSY balance, next reward)
   */
  async getVaultState(): Promise<{
    psyBalance: string;
    address: string;
  } | null> {
    try {
      const response = await fetch(`${API_URL}/api/cardano/rv/vault`);
      const data = await response.json();
      return data.vault;
    } catch {
      return null;
    }
  }
}

// Export singleton
const rvCardanoService = new RVCardanoService();
export default rvCardanoService;
