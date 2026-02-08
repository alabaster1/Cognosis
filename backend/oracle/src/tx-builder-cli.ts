/**
 * Reveal Transaction Builder (cardano-cli version)
 * Calls bash script to build reveal transaction
 */

import { execSync } from 'child_process';
import { ExperimentUTxO } from './cardano-client-cli.js';
import { OracleConfig } from './config.js';
import { join } from 'path';

export class RevealTransactionBuilderCLI {
  private config: OracleConfig;
  private scriptPath: string;

  constructor(config: OracleConfig) {
    this.config = config;
    this.scriptPath = join(process.cwd(), 'scripts', 'reveal-transaction.sh');
  }

  /**
   * Build and submit reveal transaction using cardano-cli
   */
  async buildAndSubmitReveal(
    experiment: ExperimentUTxO,
    accuracyScore: number
  ): Promise<string> {
    console.log(`\n🔨 Building reveal transaction with cardano-cli...`);
    console.log(`   Experiment: ${experiment.utxo.txHash}#${experiment.utxo.outputIndex}`);
    console.log(`   User PKH: ${experiment.datum.userPkh}`);
    console.log(`   Accuracy: ${accuracyScore}%`);

    // Calculate PSY reward
    const reward = this.calculateReward(accuracyScore);
    console.log(`   💰 Calculated reward: ${reward} PSY`);

    // Format experiment UTxO
    const experimentUTxO = `${experiment.utxo.txHash}#${experiment.utxo.outputIndex}`;

    try {
      // Call bash script
      const result = execSync(
        `bash ${this.scriptPath} "${experimentUTxO}" "${experiment.datum.userPkh}" ${accuracyScore} ${reward}`,
        {
          encoding: 'utf-8',
          env: {
            ...process.env,
            CARDANO_NODE_SOCKET_PATH: this.config.cardanoNodeSocketPath
          }
        }
      );

      console.log(result);

      // Extract transaction hash from output
      const match = result.match(/Transaction ID: ([a-f0-9]{64})/);
      if (match) {
        return match[1];
      } else {
        throw new Error('Could not extract transaction ID from script output');
      }

    } catch (error: any) {
      console.error('   ❌ cardano-cli transaction failed:');
      console.error(error.stdout || error.message);
      throw error;
    }
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
