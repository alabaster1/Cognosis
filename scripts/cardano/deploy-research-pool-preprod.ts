#!/usr/bin/env node
/**
 * Deploy Research Pool contract to Cardano Preprod
 *
 * Steps:
 * 1. Parameterize the research_pool_nft minting policy with a UTxO
 * 2. Mint the one-shot research pool NFT
 * 3. Send NFT + 2 ADA to the research_pool script address with initial PoolDatum
 *
 * Must be run FIRST - psi_experiment depends on the research pool address.
 *
 * Usage:
 *   BLOCKFROST_API_KEY=xxx WALLET_SEED_PHRASE="..." npx tsx scripts/cardano/deploy-research-pool-preprod.ts
 */

import {
  Lucid,
  Blockfrost,
  Data,
  Constr,
  applyParamsToScript,
  applyDoubleCborEncoding,
  mintingPolicyToId,
  validatorToAddress,
  validatorToScriptHash,
  getAddressDetails,
} from "@lucid-evolution/lucid";
import type { Script, UTxO } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function deployResearchPool() {
  console.log("Deploying Research Pool to Cardano Preprod...\n");

  if (!BLOCKFROST_KEY || !SEED_PHRASE) {
    throw new Error("BLOCKFROST_API_KEY and WALLET_SEED_PHRASE must be set");
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
  console.log(`Admin PKH: ${adminPkh}\n`);

  // Load compiled validators from plutus.json
  const plutusJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../cardano/plutus.json"), "utf-8")
  );

  // Find the research_pool_nft minting policy (parameterized by utxo_ref)
  const nftMintValidator = plutusJson.validators.find(
    (v: any) => v.title === "research_pool.research_pool_nft.mint"
  );
  if (!nftMintValidator) throw new Error("research_pool_nft.mint validator not found in plutus.json");

  // Find the research_pool spending validator
  const poolSpendValidator = plutusJson.validators.find(
    (v: any) => v.title === "research_pool.research_pool.spend"
  );
  if (!poolSpendValidator) throw new Error("research_pool.spend validator not found in plutus.json");

  // 1. Select a UTxO to parameterize the one-shot NFT policy
  const utxos = await lucid.wallet().getUtxos();
  if (utxos.length === 0) throw new Error("No UTxOs available");

  const seedUtxo = utxos[0];
  console.log(`Seed UTxO: ${seedUtxo.txHash}#${seedUtxo.outputIndex}`);

  // 2. Apply the UTxO parameter to the NFT minting policy
  // The parameter is OutputReference = Constr(0, [txHash, outputIndex])
  const utxoRefParam = new Constr(0, [
    seedUtxo.txHash,
    BigInt(seedUtxo.outputIndex),
  ]);

  const parameterizedNftScript = applyParamsToScript(
    applyDoubleCborEncoding(nftMintValidator.compiledCode),
    [utxoRefParam]
  );

  const nftMintingPolicy: Script = {
    type: "PlutusV3",
    script: parameterizedNftScript,
  };

  const nftPolicyId = mintingPolicyToId(nftMintingPolicy);
  const nftTokenName = "5265736561726368506f6f6c"; // "ResearchPool" in hex
  const nftUnit = nftPolicyId + nftTokenName;
  console.log(`NFT Policy ID: ${nftPolicyId}`);
  console.log(`NFT Unit: ${nftUnit}\n`);

  // 3. Derive research pool script address
  const poolValidator: Script = {
    type: "PlutusV3",
    script: applyDoubleCborEncoding(poolSpendValidator.compiledCode),
  };
  const poolScriptHash = validatorToScriptHash(poolValidator);
  const poolAddress = validatorToAddress("Preprod", poolValidator);
  console.log(`Research Pool Script Hash: ${poolScriptHash}`);
  console.log(`Research Pool Address: ${poolAddress}\n`);

  // 4. Build initial PoolDatum
  // PoolDatum = Constr(0, [total_collected, governance_pkhs, min_signatures])
  const poolDatum = new Constr(0, [
    0n,         // total_collected: 0
    [adminPkh], // governance_pkhs: [admin]
    1n,         // min_signatures: 1
  ]);

  // 5. Build mint + deploy transaction
  // Mint NFT and send it to the research pool address with datum
  // PlutusV3 requires a redeemer - use void/unit (Constr 0 [])
  const mintRedeemer = Data.to(new Constr(0, []));
  const tx = await lucid
    .newTx()
    .collectFrom([seedUtxo]) // Must spend the seed UTxO for one-shot policy
    .mintAssets({ [nftUnit]: 1n }, mintRedeemer)
    .attach.MintingPolicy(nftMintingPolicy)
    .pay.ToContract(
      poolAddress,
      { kind: "inline", value: Data.to(poolDatum) },
      { lovelace: 2_000_000n, [nftUnit]: 1n }
    )
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  console.log(`Transaction submitted: ${txHash}`);
  console.log("Waiting for confirmation...");
  await lucid.awaitTx(txHash);
  console.log("Confirmed!\n");

  const result = {
    researchPool: {
      scriptHash: poolScriptHash,
      address: poolAddress,
      validatorScript: poolValidator.script,
      nftPolicyId,
      nftUnit,
      deployTxHash: txHash,
    },
    adminPkh,
    deployedAt: new Date().toISOString(),
  };

  // Save deployment record
  const deploymentPath = path.resolve(__dirname, "PREPROD_DEPLOYMENT.json");
  let deployment: any = {};
  try {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  } catch {
    // File doesn't exist yet
  }
  deployment.researchPool = result.researchPool;
  deployment.adminPkh = result.adminPkh;
  deployment.network = "preprod";
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("===================================================");
  console.log("RESEARCH POOL DEPLOYED SUCCESSFULLY");
  console.log("===================================================");
  console.log(`Script Hash:   ${poolScriptHash}`);
  console.log(`Address:       ${poolAddress}`);
  console.log(`NFT Policy:    ${nftPolicyId}`);
  console.log(`Tx Hash:       ${txHash}`);
  console.log(`Explorer:      https://preprod.cardanoscan.io/transaction/${txHash}`);
  console.log("===================================================\n");
  console.log("Next: Run deploy-psi-experiment-preprod.ts");

  return result;
}

deployResearchPool()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
