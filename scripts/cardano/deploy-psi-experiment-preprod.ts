#!/usr/bin/env node
/**
 * Deploy psi_experiment validator to Cardano Preprod
 *
 * The psi_experiment validator is parameterized by the research_pool address.
 * Must run AFTER deploy-research-pool-preprod.ts.
 *
 * Deploys as a reference script UTxO to save tx fees for users.
 *
 * Usage:
 *   BLOCKFROST_API_KEY=xxx WALLET_SEED_PHRASE="..." npx tsx scripts/cardano/deploy-psi-experiment-preprod.ts
 */

import {
  Lucid,
  Blockfrost,
  Data,
  Constr,
  applyParamsToScript,
  applyDoubleCborEncoding,
  validatorToAddress,
  validatorToScriptHash,
  getAddressDetails,
  credentialToAddress,
  scriptHashToCredential,
} from "@lucid-evolution/lucid";
import type { Script } from "@lucid-evolution/lucid";
import * as fs from "fs";
import * as path from "path";

const BLOCKFROST_KEY = process.env.BLOCKFROST_API_KEY || "";
const SEED_PHRASE = process.env.WALLET_SEED_PHRASE || "";

async function deployPsiExperiment() {
  console.log("Deploying psi_experiment validator to Cardano Preprod...\n");

  if (!BLOCKFROST_KEY || !SEED_PHRASE) {
    throw new Error("BLOCKFROST_API_KEY and WALLET_SEED_PHRASE must be set");
  }

  // Load deployment record for research pool address
  const deploymentPath = path.resolve(__dirname, "PREPROD_DEPLOYMENT.json");
  let deployment: any;
  try {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  } catch {
    throw new Error("PREPROD_DEPLOYMENT.json not found. Run deploy-research-pool-preprod.ts first.");
  }

  if (!deployment.researchPool?.address) {
    throw new Error("Research pool not deployed yet. Run deploy-research-pool-preprod.ts first.");
  }

  const lucid = await Lucid(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", BLOCKFROST_KEY),
    "Preprod"
  );
  lucid.selectWallet.fromSeed(SEED_PHRASE);

  const address = await lucid.wallet().address();
  console.log(`Deployer wallet: ${address}\n`);

  // Load compiled validator from plutus.json
  const plutusJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../cardano/plutus.json"), "utf-8")
  );

  const psiValidator = plutusJson.validators.find(
    (v: any) => v.title === "psi_experiment.psi_experiment.spend"
  );
  if (!psiValidator) throw new Error("psi_experiment.spend validator not found in plutus.json");

  // The research_pool_address parameter is an Address type:
  // Address = Constr(0, [payment_credential, stake_credential])
  // payment_credential = Script(Constr(1, [scriptHash]))
  // stake_credential = None(Constr(1, []))
  const researchPoolScriptHash = deployment.researchPool.scriptHash;

  const researchPoolAddressParam = new Constr(0, [
    new Constr(1, [researchPoolScriptHash]), // Script credential
    new Constr(1, []),                       // No stake credential
  ]);

  // Apply the research pool address parameter
  const parameterizedScript = applyParamsToScript(
    applyDoubleCborEncoding(psiValidator.compiledCode),
    [researchPoolAddressParam]
  );

  const psiExperimentValidator: Script = {
    type: "PlutusV3",
    script: parameterizedScript,
  };

  const scriptHash = validatorToScriptHash(psiExperimentValidator);
  const scriptAddress = validatorToAddress("Preprod", psiExperimentValidator);

  console.log(`psi_experiment Script Hash: ${scriptHash}`);
  console.log(`psi_experiment Address: ${scriptAddress}`);
  console.log(`(NOTE: Different from unparameterized hash 527ef13a...)\n`);

  // Deploy as reference script UTxO (saves tx fees for users)
  // Lock ~15 ADA with the script as a reference
  const tx = await lucid
    .newTx()
    .pay.ToAddressWithData(
      address, // Send to own address with script ref
      { kind: "asHash", value: Data.to(new Constr(0, [])) }, // Minimal datum
      { lovelace: 15_000_000n },
      psiExperimentValidator // Reference script
    )
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();

  console.log(`Reference script deployment tx: ${txHash}`);
  console.log("Waiting for confirmation...");
  await lucid.awaitTx(txHash);
  console.log("Confirmed!\n");

  // Update deployment record
  deployment.psiExperiment = {
    scriptHash,
    address: scriptAddress,
    validatorScript: parameterizedScript,
    refScriptTxHash: txHash,
    unparameterizedHash: "527ef13a62d111d0a2e88fe98effddcf99e03e6802ca72cd793e571f",
  };
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("===================================================");
  console.log("PSI_EXPERIMENT DEPLOYED SUCCESSFULLY");
  console.log("===================================================");
  console.log(`Script Hash:   ${scriptHash}`);
  console.log(`Address:       ${scriptAddress}`);
  console.log(`Ref Script Tx: ${txHash}`);
  console.log(`Explorer:      https://preprod.cardanoscan.io/transaction/${txHash}`);
  console.log("===================================================\n");
  console.log("Next: Run deploy-reward-vault-preprod.ts");
}

deployPsiExperiment()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
