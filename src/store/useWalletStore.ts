/**
 * Wallet Store - Zustand state management for wallet
 */

import { create } from 'zustand';
import type { WalletInfo } from '@/types';
import walletService from '@/services/walletService';

interface WalletState {
  wallet: WalletInfo | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  connectLace: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  loadWallet: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  isLoading: false,
  error: null,

  connectLace: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await walletService.connectLaceWallet();
      const wallet: WalletInfo = {
        address: result.address,
        type: result.type,
        network: result.network as 'testnet' | 'mainnet' | 'local',
        isVerified: true,
      };
      set({ wallet, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect Lace wallet';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  continueAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await walletService.continueAsGuest();
      const wallet: WalletInfo = {
        address: result.address,
        type: result.type,
        network: 'local',
        isVerified: false,
      };
      set({ wallet, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to continue as guest';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loadWallet: async () => {
    set({ isLoading: true, error: null });
    try {
      const info = await walletService.getWalletInfo();
      set({ wallet: info, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load wallet';
      set({ error: message, isLoading: false, wallet: null });
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await walletService.logout();
      set({ wallet: null, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to logout';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// Auto-load wallet on initialization (client-side only)
if (typeof window !== 'undefined') {
  useWalletStore.getState().loadWallet();
}
