"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { trpc, trpcClient, queryClient } from "@/utils/trpc";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Create stable references to avoid re-renders
  const [stableClient] = useState(() => trpcClient);
  const [stableQueryClient] = useState(() => queryClient);

  return (
    <trpc.Provider client={stableClient} queryClient={stableQueryClient}>
      <QueryClientProvider client={stableQueryClient}>
        {children}
        {process.env.NODE_ENV !== "production" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
