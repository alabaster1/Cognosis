/**
 * Reveal Transaction Builder
 * Builds and submits the reveal transaction that:
 * - Spends experiment UTxO (reveal)
 * - Spends vault UTxO (withdraw reward)
 * - Sends PSY tokens to user
 * - Sends 0.01 ADA to lottery
 * - Updates vault datum
 */

import { Data, Constr, fromText, Lucid, UTxO, Assets } from 'lucid-cardano';
import { CardanoClient, ExperimentUTxO } from './cardano-client.js';
import { OracleConfig } from './config.js';
import { readFileSync } from 'fs';
import { join } from 'path';

export class RevealTransactionBuilder {
  private cardano: CardanoClient;
  private config: OracleConfig;
  private experimentValidator: any;
  private vaultValidator: any;
  private experimentScriptCbor: string;
  private vaultScriptCbor: string;

  constructor(cardano: CardanoClient, config: OracleConfig) {
    this.cardano = cardano;
    this.config = config;

    // Load validator scripts (PlutusV3)
    const validatorsPath = join(process.env.HOME!, 'cardano-preprod/validators');
    
    try {
      const experimentWrapperContent = readFileSync(
        join(validatorsPath, 'experiment-validator-v3-wrapped.json'),
        'utf-8'
      );
      this.experimentValidator = JSON.parse(experimentWrapperContent);
      this.experimentScriptCbor = this.experimentValidator.cborHex;
      console.log('   ✅ Loaded experiment validator (PlutusV3)');
    } catch (err) {
      console.error('   ❌ Failed to load experiment validator:', err);
      throw new Error('Failed to load experiment validator');
    }

    try {
      const vaultWrapperContent = readFileSync(
        join(validatorsPath, 'vault-validator-v3-wrapped.json'),
        'utf-8'
      );
      this.vaultValidator = JSON.parse(vaultWrapperContent);
      this.vaultScriptCbor = this.vaultValidator.cborHex;
      console.log('   ✅ Loaded vault validator (PlutusV3)');
    } catch (err) {
      console.error('   ❌ Failed to load vault validator:', err);
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

    console.log(`\n🔨 Building reveal transaction...`);
    console.log(`   Experiment: ${experiment.utxo.txHash}#${experiment.utxo.outputIndex}`);
    console.log(`   User PKH: ${experiment.datum.userPkh}`);
    console.log(`   Accuracy: ${accuracyScore}%`);

    // Get vault UTxO
    const vaultUTxO = await this.cardano.getVaultUTxO();
    if (!vaultUTxO) {
      throw new Error('Vault UTxO not found');
    }

    console.log(`   Vault: ${vaultUTxO.txHash}#${vaultUTxO.outputIndex}`);

    // Parse vault datum
    const vaultDatum = this.parseVaultDatum(vaultUTxO);
    console.log(`   Vault PSY balance: ${vaultDatum.psyBalance}`);
    console.log(`   Claims count: ${vaultDatum.claimsCount}`);

    // Calculate PSY reward using exponential curve
    const reward = this.calculateReward(accuracyScore);
    console.log(`   💰 Calculated reward: ${reward} PSY`);

    // Get PSY asset ID from vault UTxO
    const psyAsset = this.getPsyAssetFromVault(vaultUTxO);
    if (!psyAsset) {
      throw new Error('PSY token not found in vault');
    }
    console.log(`   PSY Asset: ${psyAsset}`);

    // Build experiment redeemer: Reveal { accuracy_score, ai_model }
    const experimentRedeemer = Data.to(
      new Constr(0, [ // Reveal variant
        BigInt(accuracyScore),
        fromText('gpt-4')
      ])
    );

    // Build vault redeemer: ClaimReward { participant_pkh, accuracy_score }
    const vaultRedeemer = Data.to(
      new Constr(0, [ // ClaimReward variant
        experiment.datum.userPkh,
        BigInt(accuracyScore)
      ])
    );

    // Build updated vault datum
    const newVaultDatum = Data.to(
      new Constr(0, [
        vaultDatum.psyPolicyId,
        BigInt(vaultDatum.psyBalance - reward),
        vaultDatum.oraclePkh,
        vaultDatum.experimentScriptHash,
        vaultDatum.lotteryScriptHash,
        BigInt(100), // base_reward
        BigInt(400), // max_reward
        BigInt(25), // steepness (2.5 * 10)
        BigInt(vaultDatum.claimsCount + 1) // increment claims
      ])
    );

    // Calculate remaining vault assets
    const remainingPSY = BigInt(vaultDatum.psyBalance - reward);
    const vaultAssets: Assets = {
      lovelace: vaultUTxO.assets.lovelace,
      [psyAsset]: remainingPSY
    };

    // User address (derive from PKH)
    const userAddress = await this.deriveAddressFromPkh(experiment.datum.userPkh);
    console.log(`   User address: ${userAddress}`);

    // Build and submit transaction
    try {
      const tx = await lucid
        .newTx()
        .collectFrom([experiment.utxo], experimentRedeemer)
        .attachSpendingValidator({
          type: 'PlutusV2',
          script: this.experimentScriptCbor
        })
        .collectFrom([vaultUTxO], vaultRedeemer)
        .attachSpendingValidator({
          type: 'PlutusV2',
          script: this.vaultScriptCbor
        })
        .payToAddress(userAddress, { 
          lovelace: 2000000n, // 2 ADA min
          [psyAsset]: BigInt(reward) 
        })
        .payToAddress(this.config.lotteryAddress, { 
          lovelace: 10000000n // 10 ADA lottery contribution
        })
        .payToContract(
          this.config.vaultAddress,
          { inline: newVaultDatum },
          vaultAssets
        )
        .addSigner(this.config.oracleAddress)
        .complete();

      console.log('   ✅ Transaction built successfully');
      console.log('   📝 Signing transaction...');

      const signedTx = await tx.sign().complete();
      
      console.log('   📡 Submitting to blockchain...');
      const txHash = await signedTx.submit();
      
      console.log(`   ✅ Transaction submitted: ${txHash}`);
      console.log(`   🔗 https://preprod.cardanoscan.io/transaction/${txHash}`);
      
      return txHash;

    } catch (error: any) {
      console.error('   ❌ Transaction building/submission failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse vault datum from UTxO
   */
  private parseVaultDatum(utxo: UTxO): any {
    if (!utxo.datum) {
      throw new Error('Vault UTxO has no datum');
    }

    const datum = Data.from(utxo.datum);
    
    // Vault datum structure (Constr 0):
    // [ psy_policy_id, psy_balance, oracle_pkh, experiment_script_hash, 
    //   lottery_script_hash, base_reward, max_reward, steepness, claims_count ]
    
    return {
      psyPolicyId: (datum as any).fields[0],
      psyBalance: Number((datum as any).fields[1]),
      oraclePkh: (datum as any).fields[2],
      experimentScriptHash: (datum as any).fields[3],
      lotteryScriptHash: (datum as any).fields[4],
      baseReward: Number((datum as any).fields[5]),
      maxReward: Number((datum as any).fields[6]),
      steepness: Number((datum as any).fields[7]),
      claimsCount: Number((datum as any).fields[8])
    };
  }

  /**
   * Get PSY asset ID from vault UTxO
   */
  private getPsyAssetFromVault(utxo: UTxO): string | null {
    for (const asset in utxo.assets) {
      if (asset !== 'lovelace' && utxo.assets[asset] > 1000000n) {
        return asset;
      }
    }
    return null;
  }

  /**
   * Derive user address from public key hash
   */
  private async deriveAddressFromPkh(pkh: string): Promise<string> {
    const lucid = this.cardano.getLucid();
    
    // For preprod testnet, construct payment address from pkh
    // Format: addr_test1 + payment credential (pkh)
    const paymentCredential = {
      type: 'Key' as const,
      hash: pkh
    };

    const address = lucid.utils.credentialToAddress(paymentCredential);
    return address;
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
