/**
 * PSY Token Configuration for Cognosis Reward Vault
 * 
 * Mainnet: Production PSY token (already minted)
 * Preprod: Test PSY token (to be minted)
 */

export const PSY_TOKEN_CONFIG = {
  mainnet: {
    policyId: "d137118335bd9618c1b5be5612691baf7a5c13c159b00d44fb69f177",
    assetName: "507379", // hex for "Psy"
    assetNameDecoded: "Psy",
    fingerprint: "asset14hzv9w4pqfwxhmcsjnze4ukx7wwjlpqrk68wal",
    unit: "d137118335bd9618c1b5be5612691baf7a5c13c159b00d44fb69f177507379",
  },
  preprod: {
    policyId: "4207d2740c0d32476f2c7026d6454ec0bc878230dfc9492e5de77ed8",
    assetName: "507379",
    assetNameDecoded: "Psy",
    fingerprint: "",
    unit: "4207d2740c0d32476f2c7026d6454ec0bc878230dfc9492e5de77ed8507379",
  }
};

export function getPsyConfig(network: 'mainnet' | 'preprod') {
  return PSY_TOKEN_CONFIG[network];
}
