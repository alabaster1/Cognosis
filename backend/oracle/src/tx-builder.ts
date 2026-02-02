/**
 * Reveal Transaction Builder
 * Builds and submits the reveal transaction that:
 * - Spends experiment UTxO (reveal)
 * - Spends vault UTxO (withdraw reward)
 * - Sends PSY tokens to user
 * - Sends 0.01 ADA to lottery
 * - Updates vault datum
 */

import { Data, Constr } from 'lucid-cardano';
import { CardanoClient, ExperimentUTxO } from './cardano-client.js';
import { OracleConfig } from './config.js';
import { readFileSync } from 'fs';
import { join } from 'path';

export class RevealTransactionBuilder {
  private cardano: CardanoClient;
  private config: OracleConfig;
  private experimentValidator: string;
  private vaultValidator: string;

  constructor(cardano: CardanoClient, config: OracleConfig) {
    this.cardano = cardano;
    this.config = config;

    // Load validator scripts
    const validatorsPath = join(process.env.HOME!, 'cardano-preprod/validators');
    
    try {
      this.experimentValidator = readFileSync(
        join(validatorsPath, 'experiment-validator-wrapped.json'),
        'utf-8'
      );
    } catch (err) {
      throw new Error('Failed to load experiment validator');
    }

    try {
      this.vaultValidator = readFileSync(
        join(validatorsPath, 'vault-validator-wrapped.json'),
        'utf-8'
      );
    } catch (err) {
      throw new Error('Failed to load vault validator');
    }
  }

  /**
   * Build and submit reveal transaction
   */
  async buildAndSubmitReveal(
    experiment: ExperimentUTxO,
    accuracyScore: number
  ): Promise<string> {
    const lucid = this.cardano.getLucid();

    // Get vault UTxO
    const vaultUTxO = await this.cardano.getVaultUTxO();
    if (!vaultUTxO) {
      throw new Error('Vault UTxO not found');
    }

    // Calculate PSY reward using exponential curve
    const reward = this.calculateReward(accuracyScore);
    console.log(`   💰 Calculated reward: ${reward} PSY for ${accuracyScore}% accuracy`);

    // Build experiment redeemer: Reveal { accuracy_score, ai_model }
    const experimentRedeemer = Data.to(
      new Constr(0, [ // Reveal variant
        BigInt(accuracyScore),
        Data.fromJson({ bytes: Buffer.from('gpt-4').toString('hex') })
      ])
    );

    // Build vault redeemer: ClaimReward { participant_pkh, accuracy_score }
    const vaultRedeemer = Data.to(
      new Constr(0, [ // ClaimReward variant
        Data.fromJson({ bytes: experiment.datum.userPkh }),
        BigInt(accuracyScore)
      ])
    );

    // TODO: Implement full transaction building with Lucid
    // This is a complex transaction that requires:
    // 1. Spending both experiment and vault UTxOs
    // 2. Providing redeemers for both
    // 3. Calculating exact PSY token amounts
    // 4. Building outputs (user, lottery, continuing vault)
    // 5. Balancing and signing

    // For now, throw error with details
    throw new Error(
      `Transaction building not yet implemented. Would distribute ${reward} PSY to user ${experiment.datum.userPkh}`
    );

    // TODO: Replace with actual Lucid transaction:
    /*
    const tx = await lucid
      .newTx()
      .collectFrom([experiment.utxo], experimentRedeemer)
      .attachSpendingValidator(JSON.parse(this.experimentValidator))
      .collectFrom([vaultUTxO], vaultRedeemer)
      .attachSpendingValidator(JSON.parse(this.vaultValidator))
      .payToAddress(userAddress, { lovelace: minAda, [psyAsset]: BigInt(reward) })
      .payToAddress(this.config.lotteryAddress, { lovelace: 10000n }) // 0.01 ADA
      .payToContract(this.config.vaultAddress, updatedVaultDatum, remainingAssets)
      .addSigner(this.config.oracleAddress)
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    
    return txHash;
    */
  }

  /**
   * Calculate PSY reward using exponential curve
   * Formula: base + (max - base) * lookup(accuracy, steepness)
   * 
   * Using lookup table from reward_vault_v2.ak:
   * Base: 100 PSY, Max: 400 PSY, Steepness: 2.5
   */
  private calculateReward(accuracy: number): number {
    const base = 100;
    const max = 400;
    const bonusPool = max - base; // 300

    // Lookup table for steepness 2.5 (from Aiken contract)
    const lookupTable: Record<number, number> = {
      20: 179,
      25: 316,
      30: 492,
      40: 1014,
      50: 1768,
      60: 2800,
      70: 4084,
      75: 4840,
      80: 5734,
      90: 7631,
      95: 8688,
      100: 10000,
    };

    // Find closest accuracy in lookup table or interpolate
    let multiplier = lookupTable[accuracy];
    
    if (!multiplier) {
      // Linear interpolation between known points
      const keys = Object.keys(lookupTable).map(Number).sort((a, b) => a - b);
      const lower = keys.filter(k => k < accuracy).pop() || 0;
      const upper = keys.find(k => k > accuracy) || 100;

      if (lower === 0) {
        multiplier = (accuracy * accuracy) / 10; // Quadratic fallback for low scores
      } else {
        const lowerMult = lookupTable[lower];
        const upperMult = lookupTable[upper];
        const ratio = (accuracy - lower) / (upper - lower);
        multiplier = lowerMult + (upperMult - lowerMult) * ratio;
      }
    }

    const reward = base + Math.round((bonusPool * multiplier) / 10000);
    return reward;
  }
}
