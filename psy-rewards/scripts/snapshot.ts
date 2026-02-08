#!/usr/bin/env ts-node
/**
 * PSY Snapshot Generator
 * 
 * Queries blockchain for all PSY token holders at a specific block height
 * Generates Merkle tree for efficient on-chain verification
 * Saves snapshot data for later distribution
 * 
 * Usage:
 *   npm run snapshot -- --network preprod
 *   npm run snapshot -- --dry-run
 *   npm run snapshot -- --block-height 12345678
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// TODO: Replace with actual Ogmios/Kupo client when installed
// For now, using pseudocode structure

interface PsyHolder {
  address: string;
  psyBalance: number;
  share: number;  // Percentage of total supply
}

interface Snapshot {
  blockHeight: number;
  timestamp: number;
  period: number;
  holders: PsyHolder[];
  totalSupply: number;
  merkleRoot: string;
  rewardPool: number;  // ADA in lovelace
}

interface Config {
  network: 'preprod' | 'mainnet';
  ogmiosUrl: string;
  kupoUrl: string;
  psyPolicyId: string;
  psyAssetName: string;
  dryRun: boolean;
  blockHeight?: number;
}

// Parse command line args
function parseArgs(): Config {
  const args = process.argv.slice(2);
  
  return {
    network: args.includes('--network') && args[args.indexOf('--network') + 1] === 'mainnet' 
      ? 'mainnet' 
      : 'preprod',
    ogmiosUrl: process.env.OGMIOS_URL || 'http://localhost:1337',
    kupoUrl: process.env.KUPO_URL || 'http://localhost:1442',
    psyPolicyId: process.env.PSY_POLICY_ID || '',
    psyAssetName: process.env.PSY_ASSET_NAME || 'PSY',
    dryRun: args.includes('--dry-run'),
    blockHeight: args.includes('--block-height') 
      ? parseInt(args[args.indexOf('--block-height') + 1])
      : undefined,
  };
}

// Query all PSY holders from Kupo
async function queryPsyHolders(config: Config): Promise<Map<string, number>> {
  console.log(`📊 Querying PSY holders from blockchain...`);
  console.log(`   Network: ${config.network}`);
  console.log(`   Kupo URL: ${config.kupoUrl}`);
  
  // TODO: Actual Kupo query
  // const response = await fetch(`${config.kupoUrl}/matches/${config.psyPolicyId}.${config.psyAssetName}`);
  // const utxos = await response.json();
  
  // For now, return mock data for development
  const mockHolders = new Map<string, number>();
  
  // Mock addresses with PSY balances
  mockHolders.set('addr_test1...user1', 10000);
  mockHolders.set('addr_test1...user2', 50000);
  mockHolders.set('addr_test1...user3', 5000);
  mockHolders.set('addr_test1...user4', 100000);
  mockHolders.set('addr_test1...user5', 25000);
  
  console.log(`✅ Found ${mockHolders.size} PSY holders`);
  
  return mockHolders;
}

// Calculate holder shares and filter by min threshold
function calculateShares(
  holders: Map<string, number>,
  minRewardThreshold: number = 5_000_000,  // 5 ADA
  rewardPool: number = 0
): PsyHolder[] {
  const totalSupply = Array.from(holders.values()).reduce((sum, amt) => sum + amt, 0);
  
  console.log(`📈 Total PSY supply: ${totalSupply.toLocaleString()}`);
  
  const holderList: PsyHolder[] = [];
  
  for (const [address, balance] of holders.entries()) {
    const share = (balance / totalSupply) * 100;
    const estimatedReward = rewardPool > 0 ? Math.floor((rewardPool * share) / 100) : 0;
    
    // Only include holders who would receive >= min threshold
    if (rewardPool === 0 || estimatedReward >= minRewardThreshold) {
      holderList.push({
        address,
        psyBalance: balance,
        share,
      });
    } else {
      console.log(`   ⏭️  Skipping ${address} (reward ${estimatedReward / 1_000_000} ADA < 5 ADA threshold)`);
    }
  }
  
  console.log(`✅ ${holderList.length} holders eligible for rewards (>= 5 ADA threshold)`);
  
  return holderList.sort((a, b) => b.psyBalance - a.psyBalance);  // Sort by balance desc
}

// Build Merkle tree from holder data
function buildMerkleTree(holders: PsyHolder[]): string {
  console.log(`🌲 Building Merkle tree...`);
  
  // Create leaf hashes (hash of address + balance)
  const leaves = holders.map(h => {
    const data = `${h.address}:${h.psyBalance}`;
    return hashData(data);
  });
  
  // Build tree bottom-up
  let currentLevel = leaves;
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;  // Duplicate if odd
      
      nextLevel.push(hashPair(left, right));
    }
    
    currentLevel = nextLevel;
  }
  
  const root = currentLevel[0];
  console.log(`✅ Merkle root: ${root.slice(0, 16)}...`);
  
  return root;
}

// Hash data (leaf node)
function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// Hash two nodes together
function hashPair(left: string, right: string): string {
  return createHash('sha256').update(left + right).digest('hex');
}

// Save snapshot to file
function saveSnapshot(snapshot: Snapshot, config: Config) {
  const snapshotsDir = path.join(__dirname, '../snapshots');
  
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }
  
  const filename = `snapshot-${config.network}-period-${snapshot.period}.json`;
  const filepath = path.join(snapshotsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  
  console.log(`💾 Snapshot saved to: ${filepath}`);
}

// Main function
async function main() {
  const config = parseArgs();
  
  console.log(`\n🦞 PSY Snapshot Generator\n`);
  
  if (config.dryRun) {
    console.log(`⚠️  DRY RUN MODE - No on-chain submission\n`);
  }
  
  // Get current block height (or use specified)
  const blockHeight = config.blockHeight || 12345678;  // TODO: Query from Ogmios
  const timestamp = Date.now();
  const period = Math.floor(Date.now() / (30 * 24 * 60 * 60 * 1000));  // Rough period calculation
  
  console.log(`📦 Snapshot Details:`);
  console.log(`   Block Height: ${blockHeight}`);
  console.log(`   Timestamp: ${new Date(timestamp).toISOString()}`);
  console.log(`   Period: ${period}\n`);
  
  // Query holders
  const holdersMap = await queryPsyHolders(config);
  
  // Calculate reward pool (TODO: Query from platform fees)
  const rewardPool = 10_000_000_000;  // 10,000 ADA in lovelace (mock)
  console.log(`💰 Reward pool: ${rewardPool / 1_000_000} ADA\n`);
  
  // Calculate shares
  const holders = calculateShares(holdersMap, 5_000_000, rewardPool);
  
  const totalSupply = Array.from(holdersMap.values()).reduce((sum, amt) => sum + amt, 0);
  
  // Build Merkle tree
  const merkleRoot = buildMerkleTree(holders);
  
  // Create snapshot
  const snapshot: Snapshot = {
    blockHeight,
    timestamp,
    period,
    holders,
    totalSupply,
    merkleRoot,
    rewardPool,
  };
  
  // Save snapshot
  saveSnapshot(snapshot, config);
  
  // Display summary
  console.log(`\n📊 Snapshot Summary:`);
  console.log(`   Total Holders: ${holdersMap.size}`);
  console.log(`   Eligible Holders: ${holders.length} (>= 5 ADA threshold)`);
  console.log(`   Total PSY Supply: ${totalSupply.toLocaleString()}`);
  console.log(`   Reward Pool: ${(rewardPool / 1_000_000).toLocaleString()} ADA`);
  console.log(`   Avg Reward: ${((rewardPool / holders.length) / 1_000_000).toFixed(2)} ADA`);
  console.log(`   Merkle Root: ${merkleRoot}`);
  
  // Top 5 holders
  console.log(`\n🏆 Top 5 Holders:`);
  holders.slice(0, 5).forEach((h, i) => {
    const reward = Math.floor((rewardPool * h.share) / 100);
    console.log(`   ${i + 1}. ${h.address.slice(0, 20)}... - ${h.psyBalance.toLocaleString()} PSY (${h.share.toFixed(2)}%) - ${(reward / 1_000_000).toFixed(2)} ADA`);
  });
  
  if (!config.dryRun) {
    console.log(`\n⏭️  Next Step: Submit snapshot to blockchain`);
    console.log(`   npm run snapshot:submit -- --snapshot snapshots/${path.basename(filepath)}`);
  }
  
  console.log(`\n✅ Done!\n`);
}

// Run
main().catch(err => {
  console.error(`❌ Error:`, err);
  process.exit(1);
});
