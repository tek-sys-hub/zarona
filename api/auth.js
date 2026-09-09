// =============================================================================
//  POST /api/auth   — Login (get session token)
//  DELETE /api/auth — Logout
// =============================================================================

import { supabaseAdmin } from './_supabase.js';
import { handleCors, sendError, sendSuccess } from './_middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  // ── POST /api/auth — Login or Signup ──────────────────────────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action = 'login', email, password, full_name } = body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const adminEmails = [
      (process.env.ADMIN_EMAIL || '').toLowerCase(),
      'tekawasthi16@gmail.com'
    ].filter(Boolean);

    // 1. Sign Up Flow
    if (action === 'signup') {
      let user = null;
      
      // Create user directly with email pre-confirmed
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || '' }
      });

      if (createError) {
        // If already registered or other error, return message
        return sendError(res, 400, createError.message);
      }

      user = createData.user;
      if (!user) {
        return sendError(res, 400, 'Unable to create user account');
      }

      // Check if admin email
      let role = 'customer';
      if (adminEmails.includes(user.email?.toLowerCase())) {
        await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
        role = 'admin';
      }

      // Immediately sign in the newly created, pre-confirmed user
      const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr || !signInData?.session) {
        return sendSuccess(res, {
          message: 'Account created successfully. You can now log in.',
          user: { id: user.id, email: user.email, role }
        }, 201);
      }

      return sendSuccess(res, {
        token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          full_name: full_name || '',
          role,
        },
      }, 201);
    }

    // 2. Login Flow
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      return sendError(res, 401, error?.message || 'Invalid credentials');
    }

    // Fetch profile to include role
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();

    let role = profile?.role || 'customer';
    if (adminEmails.includes(data.user.email?.toLowerCase()) && role !== 'admin') {
      await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
      role = 'admin';
    }

    return sendSuccess(res, {
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || '',
        role,
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
