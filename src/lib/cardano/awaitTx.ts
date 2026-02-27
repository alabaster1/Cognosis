/**
 * Custom awaitTx that polls Blockfrost /txs/{hash} instead of /txs/{hash}/cbor.
 * Lucid-Evolution's built-in awaitTx polls the /cbor endpoint which returns 404
 * on Blockfrost preprod, causing infinite retry loops.
 */

const BLOCKFROST_URL = "https://cardano-preprod.blockfrost.io/api/v0";
const BLOCKFROST_API_KEY = typeof process !== "undefined"
  ? (process.env?.NEXT_PUBLIC_BLOCKFROST_API_KEY || "")
  : "";

export async function blockfrostAwaitTx(
  txHash: string,
  maxAttempts = 60,
  intervalMs = 3000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BLOCKFROST_URL}/txs/${txHash}`, {
        headers: { project_id: BLOCKFROST_API_KEY },
      });
      if (res.ok) return true;
      // 404 = not yet confirmed, keep polling
      if (res.status !== 404) {
        console.warn(`[awaitTx] Unexpected status ${res.status} for ${txHash}`);
      }
    } catch {
      // Network error, keep trying
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.warn(`[awaitTx] Timed out waiting for ${txHash} after ${maxAttempts} attempts`);
  return false;
}
