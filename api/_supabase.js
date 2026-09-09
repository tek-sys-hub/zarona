// =============================================================================
//  ZARONA — Shared Supabase Admin Client
//  Used by ALL /api/ serverless functions
// =============================================================================

import { createClient } from '@supabase/supabase-js';

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Admin client — bypasses RLS (server-side only, never exposed to browser)
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Public client — respects RLS (use for user-facing operations)
export const supabasePublic = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
