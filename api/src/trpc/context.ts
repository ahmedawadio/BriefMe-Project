import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { createClient } from '@supabase/supabase-js';
import { supabase as adminSupabase } from '../utils/supabase';

/**
 * tRPC Request Context
 * 
 * Creates a context object for each incoming API request that:
 * - Extracts authentication state from cookies
 * - Verifies the token with Supabase
 * - Provides access to HTTP request/response objects
 * - Creates a user-specific Supabase client that respects RLS policies
 * - Falls back to admin client when not authenticated
 * 
 * This context is available to all tRPC procedures and middleware
 */

/**
 * Create Request Context Function
 * 
 * Called for each API request to prepare the request context
 * 
 * @param req Express request object containing cookies and headers
 * @param res Express response object for setting cookies
 * @returns Context object with authenticated user and Supabase client
 */
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Get auth token from cookie
  const token = req.cookies['auth-token'];
  
  // User info will be null if not authenticated
  let user = null;
  let userSupabase = adminSupabase; // Default to admin client
  
  if (token) {
    try {
      // Verify token with Supabase
      const { data, error } = await adminSupabase.auth.getUser(token);
      
      if (!error && data.user) {
        user = data.user;
        
        // Create a new Supabase client with the user's auth token
        // This ensures RLS policies are respected when using this client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {
          userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              autoRefreshToken: true,
              persistSession: true
            },
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          });
        }
      }
    } catch (error) {
      // Invalid token, handle silently
      console.error('Auth error:', error);
    }
  }
  
  // Return the context object with user and Supabase client
  return {
    req,
    res,
    user,
    supabase: userSupabase // Use user-specific Supabase client when available
  };
};

// Export the inferred type for use in router definitions
export type Context = inferAsyncReturnType<typeof createContext>; 