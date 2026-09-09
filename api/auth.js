// =============================================================================
//  POST /api/auth   — Login (get session token)
//  DELETE /api/auth — Logout
// =============================================================================

import { supabaseAdmin } from './_supabase.js';
import { handleCors, sendError, sendSuccess } from './_middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  // ── POST /api/auth — Login ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, password } = body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      return sendError(res, 401, error?.message || 'Invalid credentials');
    }

    // Fetch profile to include role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();

    return sendSuccess(res, {
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || '',
        role: profile?.role || 'customer',
      },
    });
  }

  // ── DELETE /api/auth — Logout ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      await supabaseAdmin.auth.admin.signOut(token);
    }
    return sendSuccess(res, { message: 'Logged out successfully' });
  }

  return sendError(res, 405, 'Method not allowed');
}
