#!/usr/bin/env node
/**
 * Test Lucid API to see what's available
 */

import { Lucid, Blockfrost } from "@lucid-evolution/lucid";

async function testLucidAPI() {
  const lucid = await Lucid(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", "preprodCyWBDPxnHFvRweDTTmk1JXktv3IuKpNL"),
    "Preprod"
  );

  console.log("Lucid object keys:");
  console.log(Object.keys(lucid));
  console.log("\n");

  if (lucid.utils) {
    console.log("lucid.utils keys:");
    console.log(Object.keys(lucid.utils));
  } else {
    console.log("❌ lucid.utils is undefined");
  }

  console.log("\n");
  console.log("Checking for utility functions...");
  console.log("- getAddressDetails:", typeof (lucid as any).getAddressDetails);
  console.log("- paymentCredentialOf:", typeof (lucid as any).paymentCredentialOf);
  console.log("- nativeScriptFromJson:", typeof (lucid as any).nativeScriptFromJson);
  
}

testLucidAPI().catch(console.error);
