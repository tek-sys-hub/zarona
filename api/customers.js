// =============================================================================
//  GET /api/customers   — List all customers (admin only)
//  GET /api/customers/:id — Get single customer profile
// =============================================================================

import { supabaseAdmin } from './_supabase.js';
import { handleCors, verifyAdmin, sendError, sendSuccess } from './_middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const { user, error: authError } = await verifyAdmin(req);
  if (authError) return sendError(res, 401, authError);

  // ── GET /api/customers ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) return sendError(res, 500, error.message);

    // Get order count per customer
    const customerIds = (data || []).map(c => c.id);
    const { data: orderCounts } = await supabaseAdmin
      .from('orders')
      .select('user_id')
      .in('user_id', customerIds);

    const countMap = {};
    (orderCounts || []).forEach(o => {
      countMap[o.user_id] = (countMap[o.user_id] || 0) + 1;
    });

    const customers = (data || []).map(c => ({
      ...c,
      orders_count: countMap[c.id] || 0,
    }));

    return sendSuccess(res, {
      customers,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  // ── DELETE /api/customers?id=... ──────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = req.query.id || req.body?.id;
    if (!id) {
      return sendError(res, 400, 'Customer ID is required');
    }

    // Protect against self-deletion
    if (id === user.id) {
      return sendError(res, 400, 'You cannot remove your own administrator account');
    }

    // Check target profile
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('id', id)
      .single();

    if (profileErr && !targetProfile) {
      // User might already be deleted or not in profiles, try checking auth
    }

    if (targetProfile && targetProfile.role === 'admin') {
      return sendError(res, 400, 'Administrator accounts cannot be removed from the customer management console');
    }

    // 1. Decouple orders so history is preserved (set user_id = null)
    try {
      await supabaseAdmin
        .from('orders')
        .update({ user_id: null })
        .eq('user_id', id);
    } catch (e) {
      console.warn('Could not decouple orders for user:', e.message);
    }

    // 2. Remove persistent cart items
    try {
      await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('user_id', id);
    } catch (e) {
      console.warn('Could not remove cart items:', e.message);
    }

    // 3. Delete from Supabase Auth admin
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(id);

    // 4. Delete profile explicitly (in case CASCADE is not configured)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (authDeleteErr && authDeleteErr.status !== 404) {
      console.error('Auth delete error:', authDeleteErr);
      return sendError(res, 500, authDeleteErr.message || 'Failed to remove user account from authentication');
    }

    return sendSuccess(res, {
      message: 'Customer account removed successfully',
      id
    });
  }

  return sendError(res, 405, 'Method not allowed');
}
