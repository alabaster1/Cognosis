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
    // To be filled after minting on preprod
    policyId: "", // Will be generated during minting
    assetName: "507379", // Same hex name as mainnet
    assetNameDecoded: "Psy",
    fingerprint: "", // Will be generated
    unit: "", // Will be policyId + assetName
  }
};

export function getPsyConfig(network: 'mainnet' | 'preprod') {
  return PSY_TOKEN_CONFIG[network];
}
