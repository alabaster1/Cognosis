# PSY/ADA Minswap Pool Creation

**Token:** PSY (Cognosis reward token)  
**Network:** Preprod testnet  
**DEX:** Minswap V2

---

## PSY Token Details (Preprod)

**Policy ID:** `52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e`  
**Asset Name:** `505359` ("PSY" in hex)  
**Current supply:** 245 PSY minted

---

## Pool Creation

**Status:** Pending (Albert creating via Minswap UI)

**Initial liquidity:**
- 50 ADA
- 200 PSY
- Trading fee: 0.3% (Minswap standard)

**Minswap preprod UI:** https://testnet-preprod.minswap.org/liquidity

---

## Why Pool Needed

The PSY/ADA liquidity pool enables:
1. **Token liquidity** - Users can trade PSY rewards for ADA
2. **Price discovery** - Market-driven PSY valuation
3. **Reward redemption** - RV participants can cash out PSY
4. **Ecosystem health** - Active market for reward token

---

## Files in This Folder

- `POOL-CREATION-GUIDE.md` - Full guide (SDK approach attempted)
- `create-minswap-pool*.ts` - SDK scripts (had dependency issues)
- `create-pool-simple.sh` - CLI approach notes

**Note:** SDK approach had Lucid version conflicts. Albert using Minswap UI (5 min vs 8 hours debugging).

---

## After Pool Created

**Next steps:**
1. Note LP token details
2. Update Cognosis docs with pool address
3. Monitor initial liquidity depth
4. Consider adding more liquidity as platform grows

---

**Related:** See `PLUTUSV3-DEPLOYMENT.md` for contract addresses
