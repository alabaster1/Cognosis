#!/usr/bin/env node
/**
 * Deploy reward_vault contract to Cardano Preprod
 *
 * Locks initial PSY token supply at the reward vault address with initial datum.
 * Must run AFTER deploy-psi-experiment-preprod.ts and mint-preprod-psy.ts.
 *
 * Usage:
 *   BLOCKFROST_API_KEY=xxx WALLET_SEED_PHRASE="..." npx tsx scripts/cardano/deploy-reward-vault-preprod.ts
 */

import {
  Lucid,
  Blockfrost,
  Data,
  Constr,
  applyDoubleCborEncoding,
  validatorToAddress,
  validatorToScriptHash,
  getAddressDetails,
} from "@lucid-evolution/lucid";
import type { Script } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";
const PSY_ASSET_NAME_HEX = "507379"; // "Psy" in hex

// Amount of PSY to lock in vault initially (default: 5 billion)
const INITIAL_PSY_SUPPLY = process.env.VAULT_PSY_AMOUNT
  ? BigInt(process.env.VAULT_PSY_AMOUNT)
  : 5_000_000_000n;

async function deployRewardVault() {
  console.log("Deploying Reward Vault to Cardano Preprod...\n");

  if (!BLOCKFROST_KEY || !SEED_PHRASE) {
    throw new Error("BLOCKFROST_API_KEY and WALLET_SEED_PHRASE must be set");
  }

  // Load deployment record
  const deploymentPath = path.resolve(__dirname, "PREPROD_DEPLOYMENT.json");
  let deployment: any;
  try {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  } catch {
    throw new Error("PREPROD_DEPLOYMENT.json not found. Run previous deploy scripts first.");
  }

  if (!deployment.psiExperiment?.scriptHash) {
    throw new Error("psi_experiment not deployed yet. Run deploy-psi-experiment-preprod.ts first.");
  }

  // Load PSY token config
  const psyConfigPath = path.resolve(__dirname, "psy-token-config.ts");
  const psyConfigContent = fs.readFileSync(psyConfigPath, "utf-8");
  const policyIdMatch = psyConfigContent.match(/preprod:[\s\S]*?policyId:\s*"([^"]+)"/);
  const psyPolicyId = process.env.PSY_POLICY_ID || policyIdMatch?.[1];

  if (!psyPolicyId) {
    throw new Error("PSY_POLICY_ID not set. Run mint-preprod-psy.ts first.");
  }

  const lucid = await Lucid(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", BLOCKFROST_KEY),
    "Preprod"
  );
  lucid.selectWallet.fromSeed(SEED_PHRASE);

  const address = await lucid.wallet().address();
  const { paymentCredential } = getAddressDetails(address);
  const adminPkh = paymentCredential!.hash;
  console.log(`Admin wallet: ${address}`);
  console.log(`Admin PKH: ${adminPkh}`);
  console.log(`PSY Policy ID: ${psyPolicyId}\n`);

  // Load compiled validator from plutus.json
  const plutusJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../cardano/plutus.json"), "utf-8")
  );

  const vaultValidator = plutusJson.validators.find(
    (v: any) => v.title === "reward_vault.reward_vault.spend"
  );
  if (!vaultValidator) throw new Error("reward_vault.spend validator not found in plutus.json");

  const rewardVaultScript: Script = {
    type: "PlutusV3",
    script: applyDoubleCborEncoding(vaultValidator.compiledCode),
  };

  const vaultScriptHash = validatorToScriptHash(rewardVaultScript);
  const vaultAddress = validatorToAddress("Preprod", rewardVaultScript);

  console.log(`Reward Vault Script Hash: ${vaultScriptHash}`);
  console.log(`Reward Vault Address: ${vaultAddress}\n`);

  // Check that wallet has PSY tokens
  const psyUnit = psyPolicyId + PSY_ASSET_NAME_HEX;
  const utxos = await lucid.wallet().getUtxos();
  let totalPsy = 0n;
  for (const utxo of utxos) {
    totalPsy += utxo.assets[psyUnit] ?? 0n;
  }

  console.log(`Wallet PSY balance: ${totalPsy}`);
  if (totalPsy < INITIAL_PSY_SUPPLY) {
    throw new Error(`Insufficient PSY tokens. Have ${totalPsy}, need ${INITIAL_PSY_SUPPLY}. Mint more first.`);
  }

  // Build initial RewardVaultDatum
  // RewardVaultDatum = Constr(0, [psy_policy_id, psy_asset_name, base_reward, decay_factor, total_claims, experiment_script_hash, admin_pkh])
  const vaultDatum = new Constr(0, [
    psyPolicyId,                             // psy_policy_id
    PSY_ASSET_NAME_HEX,                      // psy_asset_name: "Psy"
    1000n,                                   // base_reward: 1000 PSY (scaled for on-chain integer math)
    10000n,                                  // decay_factor: 10000 (slow decay)
    0n,                                      // total_claims: 0
    deployment.psiExperiment.scriptHash,      // experiment_script_hash
    adminPkh,                                // admin_pkh
  ]);

  // Lock PSY tokens + 2 ADA at the vault address
  const tx = await lucid
    .newTx()
    .pay.ToContract(
      vaultAddress,
      { kind: "inline", value: Data.to(vaultDatum) },
      { lovelace: 2_000_000n, [psyUnit]: INITIAL_PSY_SUPPLY }
    )
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  console.log(`\nVault deployment tx: ${txHash}`);
  console.log("Waiting for confirmation...");
  await lucid.awaitTx(txHash);
  console.log("Confirmed!\n");

  // Update deployment record
  deployment.rewardVault = {
    scriptHash: vaultScriptHash,
    address: vaultAddress,
    validatorScript: rewardVaultScript.script,
    deployTxHash: txHash,
    initialPsyLocked: INITIAL_PSY_SUPPLY.toString(),
    psyPolicyId,
    psyAssetName: PSY_ASSET_NAME_HEX,
    psyUnit,
  };
  deployment.deployedAt = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("===================================================");
  console.log("REWARD VAULT DEPLOYED SUCCESSFULLY");
  console.log("===================================================");
  console.log(`Script Hash:   ${vaultScriptHash}`);
  console.log(`Address:       ${vaultAddress}`);
  console.log(`PSY Locked:    ${INITIAL_PSY_SUPPLY}`);
  console.log(`Tx Hash:       ${txHash}`);
  console.log(`Explorer:      https://preprod.cardanoscan.io/transaction/${txHash}`);
  console.log("===================================================\n");
  console.log("All contracts deployed! PREPROD_DEPLOYMENT.json updated.");
  console.log("Next: Run prisma migrate, then start the backend.");
}

deployRewardVault()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
