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
  mockHolders.set('addr_test1qz...mock10_small', 2000);  // ~6 ADA/month (will accumulate)
  mockHolders.set('addr_test1qz...mock11_tiny', 800);    // ~2.5 ADA/month (will accumulate)
  mockHolders.set('addr_test1qz...mock12_micro', 300);   // ~0.9 ADA/month (will accumulate)
  
  console.log(`✅ Found ${mockHolders.size} PSY holders`);
  
  return mockHolders;
}

// Calculate shares (NO filtering - include everyone!)
function calculateShares(
  holders: Map<string, number>,
  rewardPool: number
): PsyHolder[] {
  const totalSupply = Array.from(holders.values()).reduce((sum, amt) => sum + amt, 0);
  
  console.log(`📈 Total PSY supply: ${totalSupply.toLocaleString()}`);
  
  const holderList: PsyHolder[] = [];
  
  for (const [address, balance] of holders.entries()) {
    const share = (balance / totalSupply) * 100;
    
    holderList.push({
      address,
      psyBalance: balance,
      share,
    });
  }
  
  console.log(`✅ ${holderList.length} total holders (everyone included!)`);
  
  return holderList.sort((a, b) => b.psyBalance - a.psyBalance);
}

// Load previous accumulation state
function loadAccumulationState(period: number): Record<string, number> {
  const stateDir = path.join(__dirname, '../accumulation');
  const stateFile = path.join(stateDir, `period-${period}.json`);
  
  if (!fs.existsSync(stateFile)) {
    console.log(`   No previous accumulation found (period ${period})`);
    return {};
  }
  
  const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  console.log(`   Loaded accumulation from period ${period}`);
  console.log(`   ${Object.keys(data.accumulated || {}).length} addresses with accumulated rewards`);
  
  return data.accumulated || {};
}

// Save accumulation state
function saveAccumulationState(period: number, accumulated: Record<string, number>) {
  const stateDir = path.join(__dirname, '../accumulation');
  
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  
  const stateFile = path.join(stateDir, `period-${period}.json`);
  
  const state = {
    period,
    lastUpdated: new Date().toISOString(),
    accumulated,
    totalAddresses: Object.keys(accumulated).length,
    totalAccumulated: Object.values(accumulated).reduce((sum, amt) => sum + amt, 0),
  };
  
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  
  console.log(`💾 Accumulation state saved: period-${period}.json`);
  console.log(`   ${state.totalAddresses} addresses accumulating`);
  console.log(`   ${(state.totalAccumulated / 1_000_000).toFixed(2)} ADA total accumulated`);
}

// Calculate distributions with accumulation
function calculateDistributions(
  holders: PsyHolder[],
  rewardPool: number,
  previousAccumulation: Record<string, number>
): {
  distributions: Array<{ address: string; amount: number; monthlyReward: number; accumulated: number }>;
  newAccumulation: Record<string, number>;
  stats: { sent: number; accumulated: number; holders: { sent: number; accumulated: number } };
} {
  const MIN_THRESHOLD = 5_000_000;  // 5 ADA in lovelace
  const distributions: Array<{ address: string; amount: number; monthlyReward: number; accumulated: number }> = [];
  const newAccumulation: Record<string, number> = {};
  
  let totalSent = 0;
  let totalAccumulated = 0;
  let holdersSent = 0;
  let holdersAccumulated = 0;
  
  for (const holder of holders) {
    const monthlyReward = Math.floor((rewardPool * holder.share) / 100);
    const previouslyAccumulated = previousAccumulation[holder.address] || 0;
    const totalOwed = monthlyReward + previouslyAccumulated;
    
    if (totalOwed >= MIN_THRESHOLD) {
      // Send it!
      distributions.push({
        address: holder.address,
        amount: totalOwed,
        monthlyReward,
        accumulated: previouslyAccumulated,
      });
      totalSent += totalOwed;
      holdersSent++;
      // Reset accumulation for this address
      delete newAccumulation[holder.address];
    } else {
      // Accumulate
      newAccumulation[holder.address] = totalOwed;
      totalAccumulated += totalOwed;
      holdersAccumulated++;
    }
  }
  
  return {
    distributions,
    newAccumulation,
    stats: {
      sent: totalSent,
      accumulated: totalAccumulated,
      holders: { sent: holdersSent, accumulated: holdersAccumulated },
    },
  };
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
  
  // Load previous accumulation
  console.log(`📊 Loading previous accumulation...`);
  const previousAccumulation = loadAccumulationState(period - 1);
  console.log(``);
  
  // Calculate shares (NO filtering - everyone included!)
  const holders = calculateShares(holdersMap, rewardPool);
  
  const totalSupply = Array.from(holdersMap.values()).reduce((sum, amt) => sum + amt, 0);
  
  // Calculate distributions with accumulation
  console.log(`\n💵 Calculating distributions with accumulation...`);
  const { distributions, newAccumulation, stats } = calculateDistributions(
    holders,
    rewardPool,
    previousAccumulation
  );
  
  console.log(`✅ Distribution calculation complete:`);
  console.log(`   To distribute: ${stats.holders.sent} holders → ${(stats.sent / 1_000_000).toFixed(2)} ADA`);
  console.log(`   Accumulating: ${stats.holders.accumulated} holders → ${(stats.accumulated / 1_000_000).toFixed(2)} ADA`);
  console.log(``);
  
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
  
  // Save snapshot
  saveSnapshot(snapshot, merkleTree, config);
  
  // Save accumulation state
  saveAccumulationState(period, newAccumulation);
  
  // Save distribution list
  const distributionsDir = path.join(__dirname, '../distributions');
  if (!fs.existsSync(distributionsDir)) {
    fs.mkdirSync(distributionsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(distributionsDir, `period-${period}.json`),
    JSON.stringify({ period, distributions, stats }, null, 2)
  );
  console.log(`💾 Distribution list saved: period-${period}.json\n`);
  
  // Summary
  console.log(`📊 Snapshot Summary:`);
  console.log(`   Total Holders: ${holdersMap.size}`);
  console.log(`   Total PSY Supply: ${totalSupply.toLocaleString()}`);
  console.log(`   Reward Pool: ${(rewardPool / 1_000_000).toLocaleString()} ADA`);
  console.log(`   Merkle Root: ${merkleRoot}`);
  console.log(``);
  console.log(`📊 Distribution Summary:`);
  console.log(`   Sending Now: ${stats.holders.sent} holders → ${(stats.sent / 1_000_000).toFixed(2)} ADA`);
  console.log(`   Accumulating: ${stats.holders.accumulated} holders → ${(stats.accumulated / 1_000_000).toFixed(2)} ADA`);
  console.log(`   Avg Payment: ${stats.holders.sent > 0 ? ((stats.sent / stats.holders.sent) / 1_000_000).toFixed(2) : 0} ADA`);
  
  // Top 5 distributions
  console.log(`\n🏆 Top 5 Distributions (This Period):`);
  distributions.slice(0, 5).forEach((d, i) => {
    const holder = holders.find(h => h.address === d.address);
    const wasAccumulated = d.accumulated > 0;
    console.log(`   ${i + 1}. ${d.address.slice(0, 35)}...`);
    console.log(`      PSY: ${holder?.psyBalance.toLocaleString()} (${holder?.share.toFixed(2)}%)`);
    console.log(`      This month: ${(d.monthlyReward / 1_000_000).toFixed(2)} ADA`);
    if (wasAccumulated) {
      console.log(`      + Accumulated: ${(d.accumulated / 1_000_000).toFixed(2)} ADA`);
    }
    console.log(`      → Total sending: ${(d.amount / 1_000_000).toFixed(2)} ADA`);
  });
  
  // Show some accumulating holders
  if (stats.holders.accumulated > 0) {
    console.log(`\n📊 Sample Accumulating Holders:`);
    const accumulatingList = Object.entries(newAccumulation)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    
    accumulatingList.forEach(([address, amount], i) => {
      const holder = holders.find(h => h.address === address);
      const monthlyReward = Math.floor((rewardPool * (holder?.share || 0)) / 100);
      const previouslyAccumulated = previousAccumulation[address] || 0;
      console.log(`   ${i + 1}. ${address.slice(0, 35)}...`);
      console.log(`      PSY: ${holder?.psyBalance.toLocaleString()}`);
      console.log(`      This month: ${(monthlyReward / 1_000_000).toFixed(2)} ADA`);
      if (previouslyAccumulated > 0) {
        console.log(`      + Previously: ${(previouslyAccumulated / 1_000_000).toFixed(2)} ADA`);
      }
      console.log(`      = Accumulated: ${(amount / 1_000_000).toFixed(2)} ADA (need ${((5_000_000 - amount) / 1_000_000).toFixed(2)} more)`);
    });
  }
  
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
