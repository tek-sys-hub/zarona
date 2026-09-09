// =============================================================================
//  ZARONA — Shared Supabase Admin Client
//  Used by ALL /api/ serverless functions
// =============================================================================

import { createClient } from '@supabase/supabase-js';

function sanitizeKey(val) {
  if (!val) return '';
  let s = String(val).trim();
  // If user pasted 'KEY=ey...' or duplicated variables with spaces:
  const match = s.match(/(ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
  if (match) return match[1];
  if (s.startsWith('sb_')) return s.split(/\s+/)[0];
  if (s.includes('=')) return s.split('=').pop().trim();
  return s.split(/\s+/)[0];
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const serviceRoleKey = sanitizeKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
const anonKey = sanitizeKey(process.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

// Admin client — bypasses RLS (server-side only, never exposed to browser)
export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Public client — respects RLS (use for user-facing operations)
export const supabasePublic = createClient(
  supabaseUrl,
  anonKey || serviceRoleKey
);
