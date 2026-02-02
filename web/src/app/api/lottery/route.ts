/**
 * Lottery API - Query lottery pool status
 * GET /api/lottery
 */

import { NextResponse } from 'next/server';
import { Blockfrost, Lucid } from 'lucid-cardano';

const LOTTERY_ADDRESS = 'addr_test1wrszchzeux6k0gk8uqm7fvhhe6v5y2c2uf6yjherkd3adacz5k0jp';

export async function GET() {
  try {
    // Initialize Lucid with Blockfrost
    const blockfrostApiKey = process.env.BLOCKFROST_PROJECT_ID;
    
    if (!blockfrostApiKey) {
      return NextResponse.json(
        { error: 'Blockfrost API key not configured' },
        { status: 500 }
      );
    }

    const lucid = await Lucid.new(
      new Blockfrost(
        `https://cardano-preprod.blockfrost.io/api/v0`,
        blockfrostApiKey
      ),
      'Preprod'
    );

    // Query lottery contract UTxOs
    const utxos = await lucid.utxosAt(LOTTERY_ADDRESS);

    // Calculate total ADA in lottery pool
    let totalLovelace = 0n;
    let entryCount = 0;

    for (const utxo of utxos) {
      totalLovelace += utxo.assets.lovelace;
      
      // Each UTxO represents lottery entries (0.01 ADA per entry)
      // Subtract the initial 2 ADA lock
      if (totalLovelace > 2000000n) {
        entryCount = Number((totalLovelace - 2000000n) / 10000n);
      }
    }

    // Convert to ADA
    const totalAda = Number(totalLovelace) / 1_000_000;

    // Calculate next drawing (placeholder - weekly drawings)
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    nextMonday.setHours(20, 0, 0, 0); // 8 PM CST

    return NextResponse.json({
      success: true,
      lottery: {
        poolBalance: totalAda,
        entryCount,
        nextDrawing: nextMonday.toISOString(),
        contractAddress: LOTTERY_ADDRESS,
        entryFee: 0.01, // ADA
      },
    });

  } catch (error) {
    console.error('Lottery API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lottery data', details: String(error) },
      { status: 500 }
    );
  }
}
