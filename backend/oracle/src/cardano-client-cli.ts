/**
 * Cardano Client - cardano-cli version
 * Queries contracts using cardano-cli instead of Lucid
 */

import { execSync } from 'child_process';
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
  datum: ExperimentDatum;
  utxo: { txHash: string; outputIndex: number };
}

export class CardanoClientCLI {
  private config: OracleConfig;

  constructor(config: OracleConfig) {
    this.config = config;
  }

  async initialize() {
    console.log('✅ Cardano CLI client initialized');
  }

  /**
   * Get all pending experiment UTxOs from the contract using cardano-cli
   */
  async getExperimentUTxOs(): Promise<ExperimentUTxO[]> {
    try {
      // Write to temp file (cardano-cli doesn't like /dev/stdout)
      const tmpFile = '/tmp/oracle-experiment-utxos.json';
      execSync(
        `cardano-cli query utxo --address ${this.config.experimentAddress} --testnet-magic 1 --out-file ${tmpFile}`,
        {
          encoding: 'utf-8',
          env: {
            ...process.env,
            CARDANO_NODE_SOCKET_PATH: this.config.cardanoNodeSocketPath
          }
        }
      );

      const output = execSync(`cat ${tmpFile}`, { encoding: 'utf-8' });
      const utxos = JSON.parse(output);
      const experiments: ExperimentUTxO[] = [];

      for (const [utxoKey, utxoData] of Object.entries(utxos as Record<string, any>)) {
        const [txHash, outputIndex] = utxoKey.split('#');
        
        if (!utxoData?.inlineDatum) continue;

        try {
          // Parse datum fields
          const fields = utxoData.inlineDatum.fields;
          
          const experimentDatum: ExperimentDatum = {
            userPkh: fields[0].bytes,
            ipfsHash: Buffer.from(fields[1].bytes, 'hex').toString('utf-8'),
            timestamp: fields[2].int,
            experimentType: Buffer.from(fields[3].bytes, 'hex').toString('utf-8'),
            targetDescription: Buffer.from(fields[4].bytes, 'hex').toString('utf-8'),
          };

          experiments.push({
            txHash,
            outputIndex: parseInt(outputIndex, 10),
            address: utxoData.address,
            datum: experimentDatum,
            utxo: { txHash, outputIndex: parseInt(outputIndex, 10) }
          });
        } catch (err) {
          console.error(`Failed to parse experiment datum for ${utxoKey}:`, err);
        }
      }

      return experiments;

    } catch (err: any) {
      console.error('Error querying experiment UTxOs:', err.message);
      return [];
    }
  }
}
