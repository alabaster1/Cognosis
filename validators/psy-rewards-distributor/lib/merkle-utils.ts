/**
 * Merkle Tree Utilities for PSY Rewards Distribution
 * Generates Merkle trees and proofs for verifiable claims
 */

import * as crypto from "crypto";
import { Data, Constr } from "@lucid-evolution/lucid";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PsyHolder {
  address: string;
  pkh: string;  // Payment key hash (hex)
  psyBalance: number;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: PsyHolder;
}

export interface MerkleProof {
  leaf: string;
  path: string[];  // Sibling hashes
  isLeft: boolean[];  // True if node is on left
  root: string;
}

// ============================================
// HASHING
// ============================================

/**
 * Hash a leaf node (holder data)
 */
export function hashLeaf(holder: PsyHolder): string {
  // Leaf = blake2b_256(pkh ++ psy_balance_bytes)
  const pkhBytes = Buffer.from(holder.pkh, "hex");
  const balanceBytes = Buffer.alloc(8);
  balanceBytes.writeBigUInt64BE(BigInt(holder.psyBalance));

  const leafData = Buffer.concat([pkhBytes, balanceBytes]);
  return crypto.createHash("blake2b256").update(leafData).digest("hex");
}

/**
 * Hash two nodes together
 */
export function hashPair(left: string, right: string): string {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  const combined = Buffer.concat([leftBytes, rightBytes]);
  return crypto.createHash("blake2b256").update(combined).digest("hex");
}

// ============================================
// MERKLE TREE CONSTRUCTION
// ============================================

/**
 * Build Merkle tree from PSY holders
 */
export function buildMerkleTree(holders: PsyHolder[]): MerkleNode {
  if (holders.length === 0) {
    throw new Error("Cannot build tree with no holders");
  }

  // Sort holders by address for deterministic tree
  const sortedHolders = [...holders].sort((a, b) => a.address.localeCompare(b.address));

  // Build leaf nodes
  const leafNodes: MerkleNode[] = sortedHolders.map(holder => ({
    hash: hashLeaf(holder),
    data: holder,
  }));

  // Build tree bottom-up
  return buildTreeLevel(leafNodes);
}

/**
 * Recursively build tree levels
 */
function buildTreeLevel(nodes: MerkleNode[]): MerkleNode {
  if (nodes.length === 1) {
    return nodes[0];
  }

  const parentNodes: MerkleNode[] = [];

  // Pair up nodes and hash
  for (let i = 0; i < nodes.length; i += 2) {
    const left = nodes[i];
    const right = nodes[i + 1] || nodes[i]; // Duplicate last node if odd

    const parentHash = hashPair(left.hash, right.hash);
    parentNodes.push({
      hash: parentHash,
      left,
      right,
    });
  }

  return buildTreeLevel(parentNodes);
}

// ============================================
// MERKLE PROOF GENERATION
// ============================================

/**
 * Generate Merkle proof for a specific holder
 */
export function generateMerkleProof(
  tree: MerkleNode,
  holder: PsyHolder
): MerkleProof {
  const leafHash = hashLeaf(holder);
  const path: string[] = [];
  const isLeft: boolean[] = [];

  // Find leaf and build path to root
  function findLeafAndBuildPath(node: MerkleNode, targetHash: string): boolean {
    if (!node.left && !node.right) {
      // Leaf node
      return node.hash === targetHash;
    }

    // Check left subtree
    if (node.left && findLeafAndBuildPath(node.left, targetHash)) {
      // Found in left, add right sibling to path
      if (node.right) {
        path.push(node.right.hash);
        isLeft.push(true);  // Current node is on left
      }
      return true;
    }

    // Check right subtree
    if (node.right && findLeafAndBuildPath(node.right, targetHash)) {
      // Found in right, add left sibling to path
      if (node.left) {
        path.push(node.left.hash);
        isLeft.push(false);  // Current node is on right
      }
      return true;
    }

    return false;
  }

  const found = findLeafAndBuildPath(tree, leafHash);

  if (!found) {
    throw new Error("Holder not found in tree");
  }

  return {
    leaf: leafHash,
    path,
    isLeft,
    root: tree.hash,
  };
}

// ============================================
// PROOF VERIFICATION (OFF-CHAIN)
// ============================================

/**
 * Verify Merkle proof off-chain (for testing)
 */
export function verifyMerkleProof(proof: MerkleProof): boolean {
  let currentHash = proof.leaf;

  for (let i = 0; i < proof.path.length; i++) {
    const sibling = proof.path[i];
    const isLeftSibling = proof.isLeft[i];

    if (isLeftSibling) {
      // Current node is on left
      currentHash = hashPair(currentHash, sibling);
    } else {
      // Current node is on right
      currentHash = hashPair(sibling, currentHash);
    }
  }

  return currentHash === proof.root;
}

// ============================================
// DATUM CONSTRUCTION
// ============================================

export interface DistributorDatum {
  merkleRoot: string;
  totalPsySupply: bigint;
  accumulatedAda: bigint;
  snapshotTime: bigint;
  snapshotPeriod: bigint;
  claimedAddresses: string[];
  adminPkh: string;
  minRewardThreshold: bigint;
}

/**
 * Build distributor datum for Aiken contract
 */
export function buildDistributorDatum(params: {
  merkleRoot: string;
  totalPsySupply: number;
  accumulatedAda: number;
  snapshotTime: number;
  snapshotPeriod: number;
  claimedAddresses: string[];
  adminPkh: string;
  minRewardThreshold: number;
}): string {
  const datum = new Constr(0, [
    params.merkleRoot,
    BigInt(params.totalPsySupply),
    BigInt(params.accumulatedAda),
    BigInt(params.snapshotTime),
    BigInt(params.snapshotPeriod),
    params.claimedAddresses,
    params.adminPkh,
    BigInt(params.minRewardThreshold),
  ]);

  return Data.to(datum);
}

// ============================================
// REDEEMER CONSTRUCTION
// ============================================

/**
 * Build SubmitSnapshot redeemer
 */
export function buildSubmitSnapshotRedeemer(params: {
  newMerkleRoot: string;
  newTotalSupply: number;
  newRewardPool: number;
  newPeriod: number;
}): string {
  const redeemer = new Constr(0, [
    params.newMerkleRoot,
    BigInt(params.newTotalSupply),
    BigInt(params.newRewardPool),
    BigInt(params.newPeriod),
  ]);
  return Data.to(redeemer);
}

/**
 * Build Claim redeemer
 */
export function buildClaimRedeemer(
  psyBalance: number,
  merkleProof: MerkleProof
): string {
  const redeemer = new Constr(1, [
    BigInt(psyBalance),
    merkleProof.path,
    merkleProof.isLeft,
  ]);
  return Data.to(redeemer);
}

/**
 * Build WithdrawExpired redeemer
 */
export function buildWithdrawExpiredRedeemer(newPeriod: number): string {
  const redeemer = new Constr(2, [
    BigInt(newPeriod),
  ]);
  return Data.to(redeemer);
}

// ============================================
// REWARD CALCULATION
// ============================================

/**
 * Calculate reward share for a holder
 */
export function calculateRewardShare(
  psyBalance: number,
  totalPsySupply: number,
  accumulatedAda: number
): number {
  if (totalPsySupply === 0) {
    throw new Error("Total supply cannot be zero");
  }

  return Math.floor((psyBalance * accumulatedAda) / totalPsySupply);
}

// ============================================
// SNAPSHOT EXPORT/IMPORT
// ============================================

export interface SnapshotData {
  merkleRoot: string;
  totalPsySupply: number;
  accumulatedAda: number;
  snapshotTime: number;
  snapshotPeriod: number;
  holders: PsyHolder[];
}

/**
 * Export snapshot to JSON
 */
export function exportSnapshot(
  tree: MerkleNode,
  holders: PsyHolder[],
  params: {
    totalPsySupply: number;
    accumulatedAda: number;
    snapshotPeriod: number;
  }
): SnapshotData {
  return {
    merkleRoot: tree.hash,
    totalPsySupply: params.totalPsySupply,
    accumulatedAda: params.accumulatedAda,
    snapshotTime: Date.now(),
    snapshotPeriod: params.snapshotPeriod,
    holders,
  };
}

export default {
  hashLeaf,
  hashPair,
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  buildDistributorDatum,
  buildSubmitSnapshotRedeemer,
  buildClaimRedeemer,
  buildWithdrawExpiredRedeemer,
  calculateRewardShare,
  exportSnapshot,
};
