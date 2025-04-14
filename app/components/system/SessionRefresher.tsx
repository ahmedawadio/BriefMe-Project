"use client";

import { useEffect, useRef } from "react";
import { trpcClient } from "@/utils/trpc";
import { useAuthStore } from "@/stores/auth.store";

// Time interval for token refresh (15 minutes)
const REFRESH_INTERVAL = 15 * 60 * 1000;

/**
 * Component that periodically refreshes the authentication session
 * to prevent session expiry while the user is actively using the app
 */
export function SessionRefresher() {
  const { isAuthenticated, user } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshToken = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const result = await trpcClient.auth.refreshToken.mutate();
      if (!result.success) {
        // If token refresh fails, we might need to clear auth state
        console.error("Token refresh failed:", result.message);
      }
    } catch (error) {
      console.error("Token refresh error:", error);
    }
  };

  useEffect(() => {
    // Initial token refresh
    if (isAuthenticated) {
      refreshToken();
    }

    // Set up recurring token refresh
    timerRef.current = setInterval(() => {
      refreshToken();
    }, REFRESH_INTERVAL);

    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAuthenticated, user?.id]);

  // This component doesn't render anything
  return null;
}
