import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { supabase } from '../utils/supabase';
import { Context } from './context';

/**
 * Authentication Router
 * 
 * Provides all authentication-related API endpoints:
 * - User signup/registration
 * - Login with email/password
 * - Logout
 * - Session verification
 * - Token refresh
 * 
 * Uses Supabase Auth for backend authentication services
 * and HTTP-only cookies for secure client-side token storage
 */

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Input validation schemas with Zod
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// 30 days in seconds
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const authRouter = router({
  /**
   * User Registration Endpoint
   * 
   * Creates a new user account with Supabase Auth
   * Sets authentication token in HTTP-only cookie
   */
  signup: publicProcedure
    .input(signupSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Set auth token in HTTP-only cookie
      if (data.session) {
        ctx.res.cookie('auth-token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: COOKIE_MAX_AGE // 30 days
        });
      }
      
      return { 
        success: true, 
        user: data.user 
      };
    }),
    
  /**
   * User Login Endpoint
   * 
   * Authenticates an existing user with email/password
   * Sets authentication token in HTTP-only cookie
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Set auth token in HTTP-only cookie
      ctx.res.cookie('auth-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE // 30 days
      });
      
      return { 
        success: true, 
        user: data.user 
      };
    }),
    
  /**
   * User Logout Endpoint
   * 
   * Signs out the user from Supabase Auth
   * Clears the authentication cookie
   */
  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      // Supabase logout
      await supabase.auth.signOut();
      
      // Clear auth cookie
      ctx.res.clearCookie('auth-token');
      
      return { success: true };
    }),
    
  /**
   * Session Verification Endpoint
   * 
   * Checks if the current user session is valid
   * Refreshes cookie expiry on successful verification
   * Clears invalid cookies automatically
   */
  verifyAuth: publicProcedure
    .query(async ({ ctx }) => {
      const token = ctx.req.cookies['auth-token'];
      
      if (!token) {
        return { 
          authenticated: false,
          user: null
        };
      }
      
      // Verify token with Supabase
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        // Clear invalid token
        ctx.res.clearCookie('auth-token');
        return { 
          authenticated: false,
          user: null
        };
      }
      
      // Refresh the cookie expiry on successful verification
      ctx.res.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE // Reset to 30 days on each verification
      });
      
      return { 
        authenticated: true,
        user: data.user
      };
    }),
    
  /**
   * Token Refresh Endpoint
   * 
   * Explicitly extends the authentication token validity
   * Used to refresh session duration without full re-login
   */
  refreshToken: publicProcedure
    .mutation(async ({ ctx }) => {
      const token = ctx.req.cookies['auth-token'];
      
      if (!token) {
        return { 
          success: false,
          message: 'No authentication token found'
        };
      }
      
      // Verify the token is valid
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        ctx.res.clearCookie('auth-token');
        return { 
          success: false,
          message: 'Invalid authentication token'
        };
      }
      
      // Valid token - just refresh its expiry
      ctx.res.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE // Reset to 30 days
      });
      
      return { 
        success: true,
        message: 'Token refreshed successfully'
      };
    })
}); 