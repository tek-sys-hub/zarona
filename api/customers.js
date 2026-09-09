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

  return sendError(res, 405, 'Method not allowed');
}
