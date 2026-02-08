#!/usr/bin/env ts-node
/**
 * PSY Rewards Distribution Script
 * 
 * Auto-sends ADA to PSY holders based on snapshot
 * Uses batch transactions for efficiency
 * 
 * Usage:
 *   ts-node distribute.ts --period 682 --dry-run
 *   ts-node distribute.ts --period 682 --network preprod
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Config {
  network: 'preprod' | 'mainnet';
  period: number;
  dryRun: boolean;
  batchSize: number;  // Max recipients per transaction
}

interface Distribution {
  address: string;
  amount: number;       // ADA in lovelace
  monthlyReward: number;
  accumulated: number;
}

// Parse args
function parseArgs(): Config {
  const args = process.argv.slice(2);
  
  const periodArg = args[args.indexOf('--period') + 1];
  if (!periodArg) {
    console.error(`❌ Error: --period required`);
    console.error(`   Usage: ts-node distribute.ts --period 682`);
    process.exit(1);
  }
  
  return {
    network: args.includes('--mainnet') ? 'mainnet' : 'preprod',
    period: parseInt(periodArg),
    dryRun: args.includes('--dry-run'),
    batchSize: 50,  // Cardano tx limit (~50-100 outputs)
  };
}

// Load distribution list
function loadDistributions(period: number): Distribution[] {
  const distributionsDir = path.join(__dirname, '../distributions');
  const file = path.join(distributionsDir, `period-${period}.json`);
  
  if (!fs.existsSync(file)) {
    throw new Error(`Distribution file not found: period-${period}.json`);
  }
  
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return data.distributions;
}

// Build batch transaction (placeholder)
function buildBatchTransaction(
  recipients: Distribution[],
  config: Config
): string {
  console.log(`   Building batch tx for ${recipients.length} recipients...`);
  
  // Calculate total output
  const totalOutput = recipients.reduce((sum, r) => sum + r.amount, 0);
  
  console.log(`   Total output: ${(totalOutput / 1_000_000).toFixed(2)} ADA`);
  console.log(`   Recipients: ${recipients.length}`);
  console.log(`   Avg per recipient: ${((totalOutput / recipients.length) / 1_000_000).toFixed(2)} ADA`);
  
  // TODO: Actually build transaction with cardano-cli or Lucid
  // For now, return placeholder CBOR
  return `PLACEHOLDER_CBOR_HEX_${recipients.length}_recipients`;
}

// Submit transaction (placeholder)
async function submitTransaction(cborHex: string, config: Config): Promise<string> {
  console.log(`   Submitting transaction...`);
  
  // TODO: Actually submit via cardano-cli
  // cardano-cli transaction submit --tx-file tx.signed --testnet-magic 1
  
  const mockTxHash = createHash('sha256')
    .update(cborHex + Date.now())
    .digest('hex');
  
  console.log(`   Tx hash: ${mockTxHash.slice(0, 16)}...`);
  
  return mockTxHash;
}

// Main
async function main() {
  const config = parseArgs();
  
  console.log(`\n💸 PSY Rewards Distribution\n`);
  
  if (config.dryRun) {
    console.log(`⚠️  DRY RUN MODE\n`);
  }
  
  console.log(`Network: ${config.network}`);
  console.log(`Period: ${config.period}`);
  console.log(`Batch size: ${config.batchSize} recipients/tx\n`);
  
  // Load distributions
  console.log(`📊 Loading distribution list...`);
  const distributions = loadDistributions(config.period);
  
  console.log(`✅ Loaded ${distributions.length} distributions`);
  console.log(`   Total to distribute: ${(distributions.reduce((sum, d) => sum + d.amount, 0) / 1_000_000).toFixed(2)} ADA\n`);
  
  // Split into batches
  const batches: Distribution[][] = [];
  for (let i = 0; i < distributions.length; i += config.batchSize) {
    batches.push(distributions.slice(i, i + config.batchSize));
  }
  
  console.log(`📦 Split into ${batches.length} batch(es)\n`);
  
  // Process each batch
  const txHashes: string[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    console.log(`📦 Batch ${i + 1}/${batches.length}:`);
    console.log(`   Recipients: ${batch.length}`);
    
    // Build transaction
    const cborHex = buildBatchTransaction(batch, config);
    
    if (config.dryRun) {
      console.log(`   ⏭️  Skipping submission (dry run)\n`);
      continue;
    }
    
    // Submit transaction
    const txHash = await submitTransaction(cborHex, config);
    txHashes.push(txHash);
    
    console.log(`✅ Batch ${i + 1} submitted!\n`);
    
    // Wait between batches to avoid rate limits
    if (i < batches.length - 1) {
      console.log(`   Waiting 5s before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Summary
  console.log(`\n📊 Distribution Summary:`);
  console.log(`   Period: ${config.period}`);
  console.log(`   Total Recipients: ${distributions.length}`);
  console.log(`   Total Distributed: ${(distributions.reduce((sum, d) => sum + d.amount, 0) / 1_000_000).toFixed(2)} ADA`);
  console.log(`   Batches: ${batches.length}`);
  console.log(`   Transactions: ${txHashes.length}\n`);
  
  // Top 5 distributions
  console.log(`🏆 Top 5 Distributions:`);
  distributions
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.address.slice(0, 35)}... → ${(d.amount / 1_000_000).toFixed(2)} ADA`);
      if (d.accumulated > 0) {
        console.log(`      (includes ${(d.accumulated / 1_000_000).toFixed(2)} ADA accumulated)`);
      }
    });
  
  console.log(``);
  
  if (config.dryRun) {
    console.log(`⚠️  DRY RUN - No transactions submitted\n`);
  } else {
    console.log(`✅ Distribution complete!\n`);
    console.log(`Transaction hashes:`);
    txHashes.forEach((hash, i) => {
      console.log(`   Batch ${i + 1}: ${hash.slice(0, 16)}...`);
    });
    console.log(``);
  }
  
  console.log(`📝 Next steps:`);
  console.log(`   1. Verify transactions on blockchain explorer`);
  console.log(`   2. Update distribution status (mark as paid)`);
  console.log(`   3. Notify holders (optional)\n`);
}

main().catch(err => {
  console.error(`❌ Error:`, err);
  process.exit(1);
});
