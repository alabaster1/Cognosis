/**
 * Oracle Configuration
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

export interface OracleConfig {
  network: 'Preprod' | 'Mainnet';
  cardanoNodeSocketPath: string;
  oracleSigningKey: string;
  oracleAddress: string;
  experimentAddress: string;
  vaultAddress: string;
  lotteryAddress: string;
  openaiApiKey: string;
  pollIntervalMs: number;
}

// Load Oracle signing key
const ORACLE_SKEY_PATH = process.env.ORACLE_SKEY_PATH || 
  join(process.env.HOME!, 'cardano-preprod/oracle/payment.skey');

let oracleSigningKey = '';
try {
  const skeyFile = readFileSync(ORACLE_SKEY_PATH, 'utf-8');
  const skeyJson = JSON.parse(skeyFile);
  oracleSigningKey = skeyJson.cborHex;
} catch (err) {
  console.error(`Failed to load Oracle signing key from ${ORACLE_SKEY_PATH}`);
  throw err;
}

// Load Oracle address
const ORACLE_ADDR_PATH = process.env.ORACLE_ADDR_PATH ||
  join(process.env.HOME!, 'cardano-preprod/oracle/payment.addr');

let oracleAddress = '';
try {
  oracleAddress = readFileSync(ORACLE_ADDR_PATH, 'utf-8').trim();
} catch (err) {
  console.error(`Failed to load Oracle address from ${ORACLE_ADDR_PATH}`);
  throw err;
}

export const config: OracleConfig = {
  network: (process.env.CARDANO_NETWORK as any) || 'Preprod',
  cardanoNodeSocketPath: process.env.CARDANO_NODE_SOCKET_PATH || 
    join(process.env.HOME!, 'cardano-preprod/socket/node.socket'),
  oracleSigningKey,
  oracleAddress,
  
  // Smart contract addresses (preprod)
  experimentAddress: 'addr_test1wp0m9gv6fzvr5gunqvzlj2g2s235vz3ecndvrg7hdtw92hsaucqr4',
  vaultAddress: 'addr_test1wztacuc3ux3r9wnsdad0uwc0rmzt78wm9jhgk5tugp95vvge8k9ge',
  lotteryAddress: 'addr_test1wrszchzeux6k0gk8uqm7fvhhe6v5y2c2uf6yjherkd3adacz5k0jp',
  
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10), // 30 seconds
};

// Validate config
if (!config.openaiApiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

console.log('📋 Oracle Configuration:');
console.log(`   Network: ${config.network}`);
console.log(`   Node Socket: ${config.cardanoNodeSocketPath}`);
console.log(`   Oracle Address: ${config.oracleAddress}`);
console.log(`   Experiment Contract: ${config.experimentAddress}`);
console.log(`   Vault Contract: ${config.vaultAddress}`);
console.log(`   Lottery Contract: ${config.lotteryAddress}`);
console.log(`   Poll Interval: ${config.pollIntervalMs}ms`);
console.log('');
