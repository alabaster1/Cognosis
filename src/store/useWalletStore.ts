/**
 * Wallet Store - Zustand state management for wallet (Cardano only)
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
  connectCardano: (walletName: string) => Promise<void>;
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
        network: result.network as 'testnet' | 'mainnet' | 'preprod',
        isVerified: true,
      };
      set({ wallet, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect wallet';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  connectCardano: async (walletName: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await walletService.connectCardanoWallet(walletName);
      const wallet: WalletInfo = {
        address: result.address,
        type: result.type,
        network: result.network as 'testnet' | 'mainnet' | 'preprod',
        isVerified: true,
      };
      set({ wallet, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect wallet';
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
