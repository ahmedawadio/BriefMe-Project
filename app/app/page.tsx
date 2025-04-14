"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Homepage component
 *
 * Serves as an authentication gateway/router:
 * - Checks user authentication status on load
 * - Redirects authenticated users to /briefs
 * - Redirects unauthenticated users to /login
 * - Shows loading spinner during authentication check
 */
export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Effect for handling authentication-based routing
  useEffect(() => {
    // Only proceed with redirects after authentication state is determined
    if (!isLoading.auth) {
      if (user) {
        router.push("/briefs");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading.auth, router]);

  // Display loading spinner while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
}
