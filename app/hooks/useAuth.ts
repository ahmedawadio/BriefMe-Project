import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { trpc } from "@/utils/trpc";

export interface User {
  id: string;
  email: string;
}

export interface AuthError {
  message: string;
}

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();
  const utils = trpc.useContext();

  // Verify auth status
  const { data: authData, isLoading: isVerifying } = trpc.auth.verifyAuth.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (authData?.user) {
      setUser({
        id: authData.user.id,
        email: authData.user.email || '',
      });
    } else if (authData !== undefined) {
      // Only clear if we got a response and user is null
      clearUser();
    }
  }, [authData, setUser, clearUser]);

  // Login mutation
  const { mutateAsync: loginMutation, isPending: isLoggingIn } = trpc.auth.login.useMutation({
    onSuccess: async (result) => {
      if (result.success && result.user) {
        setUser({
          id: result.user.id,
          email: result.user.email || '',
        });
        await utils.auth.verifyAuth.invalidate();
        await router.replace("/briefs");
      }
    },
  });

  // Signup mutation
  const { mutateAsync: signupMutation, isPending: isSigningUp } = trpc.auth.signup.useMutation({
    onSuccess: async (result) => {
      if (result.success && result.user) {
        setUser({
          id: result.user.id,
          email: result.user.email || '',
        });
        await utils.auth.verifyAuth.invalidate();
        await router.replace("/briefs");
      }
    },
  });

  // Logout mutation
  const { mutateAsync: logoutMutation, isPending: isLoggingOut } = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      clearUser(); // Use clearUser instead of setUser(null)
      await utils.auth.verifyAuth.invalidate();
      await router.replace("/login");
    },
  });

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginMutation({ email, password });
        if (!result.success) {
          throw new Error("Invalid credentials");
        }
      } catch (error) {
        console.error("Login error:", error);
        throw error instanceof Error ? error : new Error("An unexpected error occurred");
      }
    },
    [loginMutation]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await signupMutation({ email, password });
        if (!result.success) {
          throw new Error("Failed to create account");
        }
      } catch (error) {
        console.error("Signup error:", error);
        throw error instanceof Error ? error : new Error("An unexpected error occurred");
      }
    },
    [signupMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation();
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API logout fails, clear local state
      clearUser();
      throw error instanceof Error ? error : new Error("An unexpected error occurred");
    }
  }, [logoutMutation, clearUser]);

  // Debug log to track auth state changes
  console.log("Auth State:", { user, authData, isVerifying });

  return {
    user: authData?.user ? {
      id: authData.user.id,
      email: authData.user.email || '',
    } : user,
    isAuthenticated: !!authData?.user || isAuthenticated,
    isLoading: {
      auth: isVerifying,
      login: isLoggingIn,
      signup: isSigningUp,
      logout: isLoggingOut,
    },
    login,
    signup,
    logout,
  };
} 