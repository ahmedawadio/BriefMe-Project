import { trpcClient } from "@/utils/trpc";

/**
 * User interface representing authenticated user data
 */
export interface User {
  id: string;
  email: string;
}

/**
 * Standard authentication response format
 */
export interface AuthResponse {
  success: boolean;
  user: User;
}

/**
 * Authentication Service
 * 
 * Provides methods for user authentication operations:
 * - Login with email/password
 * - Registration of new accounts
 * - Logout functionality
 * - Auth verification for session management
 * 
 * All methods communicate with the backend via tRPC client
 */
class AuthService {
  /**
   * Authenticates a user with email and password
   * 
   * @param email User's email address
   * @param password User's password
   * @returns Promise with auth response containing user data
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await trpcClient.auth.login.mutate({ email, password });
    return {
      success: response.success,
      user: {
        id: response.user.id,
        email: response.user.email || '',
      }
    };
  }

  /**
   * Registers a new user account
   * 
   * @param email User's email address
   * @param password User's password
   * @returns Promise with auth response containing new user data
   * @throws Error if signup fails
   */
  async signup(email: string, password: string): Promise<AuthResponse> {
    const response = await trpcClient.auth.signup.mutate({ email, password });
    if (!response.success || !response.user) {
      throw new Error("Signup failed");
    }
    return {
      success: response.success,
      user: {
        id: response.user.id,
        email: response.user.email || '',
      }
    };
  }

  /**
   * Logs out the current user by clearing their session
   */
  async logout(): Promise<void> {
    await trpcClient.auth.logout.mutate();
  }

  /**
   * Verifies if user is currently authenticated
   * 
   * @returns Promise with auth response if authenticated, null otherwise
   */
  async verifyAuth(): Promise<AuthResponse | null> {
    const response = await trpcClient.auth.verifyAuth.query();
    if (!response.authenticated || !response.user) return null;
    return {
      success: true,
      user: {
        id: response.user.id,
        email: response.user.email || '',
      }
    };
  }
}

// Export singleton instance of the auth service
export const authService = new AuthService(); 