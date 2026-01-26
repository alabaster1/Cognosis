'use client';

/**
 * Providers - React Query and other client-side providers
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/useWalletStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  const loadWallet = useWalletStore((state) => state.loadWallet);

  useEffect(() => {
    // Load wallet on mount
    loadWallet();
  }, [loadWallet]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
