// =============================================================================
//  ZARONA — Admin Auth Middleware
//  Verifies the incoming request has a valid Supabase admin session.
// =============================================================================

import { supabaseAdmin } from './_supabase.js';

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns { user, error }.
 */
export async function verifyAdmin(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '').trim();

  // Verify token with Supabase
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  // Check admin role in profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return { user: null, error: 'Access denied: admin role required' };
  }

  return { user: data.user, error: null };
}

/**
 * Extracts and verifies Bearer token for any authenticated user (customer or admin).
 * Returns { user, role, error }.
 */
export async function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, role: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '').trim();

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, role: null, error: 'Invalid or expired token' };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  return { user: data.user, role: profile?.role || 'customer', error: null };
}

/**
 * Standard CORS + JSON headers for all API responses.
 */
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

/**
 * Handle OPTIONS preflight requests.
 */
export function handleCors(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Send a JSON error response.
 */
export function sendError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

/**
 * Send a JSON success response.
 */
export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
