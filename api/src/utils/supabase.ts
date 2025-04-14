import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

/**
 * Supabase Admin Client
 * 
 * Creates a Supabase client with admin privileges using the service role key.
 * This client is used for server-side operations that need to bypass RLS policies,
 * such as:
 * - User management operations
 * - Background data processing tasks
 * - Administrative file access
 * 
 * IMPORTANT: This client should never be exposed to the client-side.
 * For user-authenticated operations, use the client created in context.ts
 * which respects row-level security policies.
 */

dotenv.config();

// Load Supabase connection details from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

// Use service role key for backend operations
export const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
); 