'use client';

/**
 * Lottery Tracker Component
 * Displays current lottery pool status
 */

import { useEffect, useState } from 'react';
import { TrophyIcon, TicketIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface LotteryData {
  poolBalance: number;
  entryCount: number;
  nextDrawing: string;
  contractAddress: string;
  entryFee: number;
}

export default function LotteryTracker() {
  const [lottery, setLottery] = useState<LotteryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLotteryData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchLotteryData, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchLotteryData() {
    try {
      const res = await fetch('/api/lottery');
      const data = await res.json();

      if (data.success) {
        setLottery(data.lottery);
        setError(null);
      } else {
        setError(data.error || 'Failed to load lottery data');
      }
    } catch (err) {
      setError('Network error');
      console.error('Lottery fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-6 shadow-xl animate-pulse">
        <div className="h-8 bg-purple-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-purple-700 rounded w-1/2"></div>
          <div className="h-4 bg-purple-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <p className="text-red-400">⚠️ {error}</p>
      </div>
    );
  }

  if (!lottery) return null;

  const nextDrawing = new Date(lottery.nextDrawing);
  const daysUntil = Math.ceil((nextDrawing.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-6 shadow-xl border border-purple-500/30">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <TrophyIcon className="w-8 h-8 text-yellow-400" />
        <h2 className="text-2xl font-bold text-white">PSY Lottery</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Prize Pool */}
        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-300">Prize Pool</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {lottery.poolBalance.toFixed(2)} ₳
          </div>
          <div className="text-xs text-gray-400 mt-1">
            ≈ ${(lottery.poolBalance * 0.50).toFixed(2)} USD
          </div>
        </div>

        {/* Entries */}
        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TicketIcon className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-300">Total Entries</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {lottery.entryCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {lottery.entryFee} ₳ per entry
          </div>
        </div>
      </div>

      {/* Next Drawing */}
      <div className="bg-black/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-gray-300">Next Drawing</span>
        </div>
        <div className="text-lg font-semibold text-white">
          {nextDrawing.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </div>
        <div className="text-sm text-purple-300 mt-1">
          {daysUntil === 0 ? 'Today!' : `${daysUntil} day${daysUntil > 1 ? 's' : ''} away`}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-black/20 rounded-lg p-4 border border-purple-500/20">
        <h3 className="text-sm font-semibold text-purple-300 mb-2">How It Works</h3>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Every RV submission = 1 lottery entry (0.01 ₳ fee)</li>
          <li>• Higher PSY rewards = more tickets (weighted)</li>
          <li>• Weekly drawings every Monday at 8 PM CST</li>
          <li>• Winner receives entire prize pool in PSY tokens</li>
        </ul>
      </div>

      {/* Contract Link */}
      <div className="mt-4 text-center">
        <a 
          href={`https://preprod.cardanoscan.io/address/${lottery.contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 hover:text-purple-300 underline"
        >
          View Contract on CardanoScan →
        </a>
      </div>
    </div>
  );
}
