#!/usr/bin/env ts-node
/**
 * PSY Snapshot Generator (Ogmios Integration)
 * 
 * Queries blockchain for all PSY token holders using Ogmios
 * Generates Merkle tree for efficient on-chain verification
 * 
 * Usage:
 *   ts-node snapshot-ogmios.ts --network preprod
 *   ts-node snapshot-ogmios.ts --dry-run
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PsyHolder {
  address: string;
  psyBalance: number;
  share: number;
}

interface Snapshot {
  blockHeight: number;
  timestamp: number;
  period: number;
  holders: PsyHolder[];
  totalSupply: number;
  merkleRoot: string;
  rewardPool: number;
}

interface Config {
  network: 'preprod' | 'mainnet';
  ogmiosUrl: string;
  psyPolicyId: string;
  psyAssetName: string;
  dryRun: boolean;
}

// Parse args
function parseArgs(): Config {
  const args = process.argv.slice(2);
  
  return {
    network: args.includes('--mainnet') ? 'mainnet' : 'preprod',
    ogmiosUrl: process.env.OGMIOS_URL || 'http://localhost:1337',
    psyPolicyId: process.env.PSY_POLICY_ID || 'MOCK_POLICY_ID',
    psyAssetName: process.env.PSY_ASSET_NAME || 'PSY',
    dryRun: args.includes('--dry-run'),
  };
}

// Query current blockchain tip via Ogmios
async function queryBlockchainTip(ogmiosUrl: string): Promise<{ slot: number; height: number }> {
  const response = await fetch(ogmiosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'queryNetwork/tip',
      id: 1,
    }),
  });
  
  const data = await response.json();
  
  return {
    slot: data.result.slot,
    height: data.result.height || 0,
  };
}

// Query PSY holders (mock for now, will integrate real Kupo/Ogmios later)
async function queryPsyHolders(config: Config): Promise<Map<string, number>> {
  console.log(`📊 Querying PSY holders...`);
  console.log(`   Policy ID: ${config.psyPolicyId}`);
  console.log(`   Asset Name: ${config.psyAssetName}`);
  
  // TODO: Once we have real PSY token on preprod, query UTxOs via Ogmios
  // For now, using mock data for testing
  
  const mockHolders = new Map<string, number>();
  
  // Mock addresses (will be replaced with real blockchain queries)
  mockHolders.set('addr_test1qz...mock1', 10000);
  mockHolders.set('addr_test1qz...mock2', 50000);
  mockHolders.set('addr_test1qz...mock3', 5000);
  mockHolders.set('addr_test1qz...mock4', 100000);
  mockHolders.set('addr_test1qz...mock5', 25000);
  mockHolders.set('addr_test1qz...mock6', 75000);
  mockHolders.set('addr_test1qz...mock7', 15000);
  mockHolders.set('addr_test1qz...mock8', 8000);
  mockHolders.set('addr_test1qz...mock9', 30000);
  mockHolders.set('addr_test1qz...mock10', 2000);  // Below 5 ADA threshold
  
  console.log(`✅ Found ${mockHolders.size} PSY holders`);
  
  return mockHolders;
}

// Calculate shares and filter by min threshold
function calculateShares(
  holders: Map<string, number>,
  minRewardThreshold: number,
  rewardPool: number
): PsyHolder[] {
  const totalSupply = Array.from(holders.values()).reduce((sum, amt) => sum + amt, 0);
  
  console.log(`📈 Total PSY supply: ${totalSupply.toLocaleString()}`);
  
  const holderList: PsyHolder[] = [];
  let skippedCount = 0;
  let skippedAmount = 0;
  
  for (const [address, balance] of holders.entries()) {
    const share = (balance / totalSupply) * 100;
    const estimatedReward = Math.floor((rewardPool * share) / 100);
    
    if (estimatedReward >= minRewardThreshold) {
      holderList.push({
        address,
        psyBalance: balance,
        share,
      });
    } else {
      skippedCount++;
      skippedAmount += balance;
      console.log(`   ⏭️  Skipping ${address.slice(0, 30)}... (reward ${(estimatedReward / 1_000_000).toFixed(2)} ADA < 5 ADA threshold)`);
    }
  }
  
  console.log(`✅ ${holderList.length} holders eligible (>= 5 ADA)`);
  console.log(`   ${skippedCount} holders skipped (< 5 ADA threshold)`);
  console.log(`   Skipped PSY amount: ${skippedAmount.toLocaleString()} (${((skippedAmount / totalSupply) * 100).toFixed(2)}%)`);
  
  return holderList.sort((a, b) => b.psyBalance - a.psyBalance);
}

// Build Merkle tree
function buildMerkleTree(holders: PsyHolder[]): { root: string; tree: string[][] } {
  console.log(`🌲 Building Merkle tree...`);
  
  // Create leaf hashes
  const leaves = holders.map(h => {
    const data = `${h.address}:${h.psyBalance}`;
    return hashData(data);
  });
  
  console.log(`   Leaves: ${leaves.length}`);
  
  const tree: string[][] = [leaves];
  let currentLevel = leaves;
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      nextLevel.push(hashPair(left, right));
    }
    
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }
  
  const root = currentLevel[0];
  
  console.log(`✅ Merkle root: ${root.slice(0, 32)}...`);
  console.log(`   Tree depth: ${tree.length}`);
  
  return { root, tree };
}

function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hashPair(left: string, right: string): string {
  return createHash('sha256').update(left + right).digest('hex');
}

// Generate Merkle proof for a specific holder
function getMerkleProof(tree: string[][], holderIndex: number): string[] {
  const proof: string[] = [];
  let index = holderIndex;
  
  for (let level = 0; level < tree.length - 1; level++) {
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;
    
    if (siblingIndex < tree[level].length) {
      proof.push(tree[level][siblingIndex]);
    }
    
    index = Math.floor(index / 2);
  }
  
  return proof;
}

// Save snapshot
function saveSnapshot(snapshot: Snapshot, merkleTree: string[][], config: Config) {
  const snapshotsDir = path.join(__dirname, '../snapshots');
  
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }
  
  const filename = `snapshot-${config.network}-period-${snapshot.period}.json`;
  const filepath = path.join(snapshotsDir, filename);
  
  // Save snapshot with Merkle proofs for each holder
  const snapshotWithProofs = {
    ...snapshot,
    holders: snapshot.holders.map((h, i) => ({
      ...h,
      merkleProof: getMerkleProof(merkleTree, i),
    })),
    merkleTree: merkleTree.map((level, i) => ({
      level: i,
      hashes: level,
    })),
  };
  
  fs.writeFileSync(filepath, JSON.stringify(snapshotWithProofs, null, 2));
  
  console.log(`💾 Snapshot saved to: ${filepath}`);
}

// Main
async function main() {
  const config = parseArgs();
  
  console.log(`\n🦞 PSY Snapshot Generator (Ogmios)\n`);
  
  if (config.dryRun) {
    console.log(`⚠️  DRY RUN MODE\n`);
  }
  
  // Query blockchain tip
  console.log(`📡 Connecting to Ogmios...`);
  console.log(`   URL: ${config.ogmiosUrl}`);
  
  const tip = await queryBlockchainTip(config.ogmiosUrl);
  
  console.log(`✅ Connected!`);
  console.log(`   Slot: ${tip.slot.toLocaleString()}`);
  console.log(`   Height: ${tip.height.toLocaleString()}\n`);
  
  // Snapshot details
  const blockHeight = tip.height;
  const timestamp = Date.now();
  const period = Math.floor(Date.now() / (30 * 24 * 60 * 60 * 1000));
  
  console.log(`📦 Snapshot Details:`);
  console.log(`   Block Height: ${blockHeight.toLocaleString()}`);
  console.log(`   Timestamp: ${new Date(timestamp).toISOString()}`);
  console.log(`   Period: ${period}\n`);
  
  // Query holders
  const holdersMap = await queryPsyHolders(config);
  
  // Mock reward pool
  const rewardPool = 10_000_000_000;  // 10,000 ADA
  console.log(`💰 Reward pool: ${(rewardPool / 1_000_000).toLocaleString()} ADA\n`);
  
  // Calculate shares (min 5 ADA threshold)
  const holders = calculateShares(holdersMap, 5_000_000, rewardPool);
  
  const totalSupply = Array.from(holdersMap.values()).reduce((sum, amt) => sum + amt, 0);
  
  // Build Merkle tree
  const { root: merkleRoot, tree: merkleTree } = buildMerkleTree(holders);
  
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
  
  // Save
  saveSnapshot(snapshot, merkleTree, config);
  
  // Summary
  console.log(`\n📊 Snapshot Summary:`);
  console.log(`   Total Holders: ${holdersMap.size}`);
  console.log(`   Eligible Holders: ${holders.length} (>= 5 ADA)`);
  console.log(`   Total PSY Supply: ${totalSupply.toLocaleString()}`);
  console.log(`   Reward Pool: ${(rewardPool / 1_000_000).toLocaleString()} ADA`);
  console.log(`   Avg Reward/Holder: ${((rewardPool / holders.length) / 1_000_000).toFixed(2)} ADA`);
  console.log(`   Merkle Root: ${merkleRoot}`);
  
  // Top 5
  console.log(`\n🏆 Top 5 Holders:`);
  holders.slice(0, 5).forEach((h, i) => {
    const reward = Math.floor((rewardPool * h.share) / 100);
    console.log(`   ${i + 1}. ${h.address.slice(0, 35)}... - ${h.psyBalance.toLocaleString()} PSY (${h.share.toFixed(2)}%) → ${(reward / 1_000_000).toFixed(2)} ADA`);
  });
  
  console.log(`\n✅ Snapshot generation complete!\n`);
  
  if (!config.dryRun) {
    console.log(`Next steps:`);
    console.log(`  1. Review snapshot file`);
    console.log(`  2. Submit to blockchain (npm run snapshot:submit)`);
    console.log(`  3. Distribute rewards (npm run distribute)\n`);
  }
}

main().catch(err => {
  console.error(`❌ Error:`, err);
  process.exit(1);
});
