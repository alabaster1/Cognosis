/**
 * Cardano Client - Lucid SDK integration
 */

import { Blockfrost, Lucid, UTxO, Datum, Constr, Data } from 'lucid-cardano';
import { OracleConfig } from './config.js';

export interface ExperimentDatum {
  userPkh: string;
  ipfsHash: string;
  timestamp: number;
  experimentType: string;
  targetDescription: string;
}

export interface ExperimentUTxO {
  txHash: string;
  outputIndex: number;
  address: string;
  assets: Record<string, bigint>;
  datum: ExperimentDatum;
  utxo: UTxO;
}

export class CardanoClient {
  private lucid?: Lucid;
  private config: OracleConfig;

  constructor(config: OracleConfig) {
    this.config = config;
  }

  async initialize() {
    // Use Blockfrost for preprod (easier than local node for now)
    // TODO: Switch to Kupo+Ogmios for production
    const blockfrostApiKey = process.env.BLOCKFROST_PROJECT_ID || '';
    
    if (!blockfrostApiKey) {
      throw new Error('BLOCKFROST_PROJECT_ID required for Lucid initialization');
    }

    this.lucid = await Lucid.new(
      new Blockfrost(
        `https://cardano-preprod.blockfrost.io/api/v0`,
        blockfrostApiKey
      ),
      this.config.network
    );

    // Load Oracle wallet
    // Note: Lucid expects signing key in different format than cardano-cli
    // For now, we'll use the address directly and handle signing separately
    this.lucid.selectWalletFromPrivateKey(this.config.oracleSigningKey);
  }

  /**
   * Get all pending experiment UTxOs from the contract
   */
  async getExperimentUTxOs(): Promise<ExperimentUTxO[]> {
    if (!this.lucid) throw new Error('Lucid not initialized');

    const utxos = await this.lucid.utxosAt(this.config.experimentAddress);
    
    const experiments: ExperimentUTxO[] = [];

    for (const utxo of utxos) {
      if (!utxo.datum) continue;

      try {
        // Parse datum
        const datum = Data.from(utxo.datum) as Constr<Data>;
        
        // ExperimentDatum fields: [user_pkh, ipfs_hash, timestamp, experiment_type, target_description]
        const fields = datum.fields as any[];
        
        const experimentDatum: ExperimentDatum = {
          userPkh: fields[0] as string,
          ipfsHash: Buffer.from(fields[1] as string, 'hex').toString('utf-8'),
          timestamp: Number(fields[2]),
          experimentType: Buffer.from(fields[3] as string, 'hex').toString('utf-8'),
          targetDescription: Buffer.from(fields[4] as string, 'hex').toString('utf-8'),
        };

        experiments.push({
          txHash: utxo.txHash,
          outputIndex: utxo.outputIndex,
          address: utxo.address,
          assets: utxo.assets,
          datum: experimentDatum,
          utxo,
        });
      } catch (err) {
        console.error(`Failed to parse experiment datum:`, err);
      }
    }

    return experiments;
  }

  /**
   * Get the vault UTxO (contains PSY tokens)
   */
  async getVaultUTxO(): Promise<UTxO | null> {
    if (!this.lucid) throw new Error('Lucid not initialized');

    const utxos = await this.lucid.utxosAt(this.config.vaultAddress);
    
    // Return the first UTxO (vault should only have one)
    return utxos[0] || null;
  }

  getLucid(): Lucid {
    if (!this.lucid) throw new Error('Lucid not initialized');
    return this.lucid;
  }
}
