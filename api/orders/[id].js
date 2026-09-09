// =============================================================================
//  GET /api/orders/[id]  — Get single order details
//  PUT /api/orders/[id]  — Update order status (admin only)
// =============================================================================

import { supabaseAdmin } from '../_supabase.js';
import { handleCors, verifyAdmin, sendError, sendSuccess } from '../_middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const { id } = req.query;
  if (!id) return sendError(res, 400, 'Order ID is required');

  // ── GET /api/orders/:id ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        profiles:user_id (full_name, email, phone),
        order_items (*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, { order: data });
  }

  // ── PUT /api/orders/:id (admin only) ──────────────────────────────────────
  if (req.method === 'PUT') {
    const { user, error: authError } = await verifyAdmin(req);
    if (authError) return sendError(res, 401, authError);

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!body.status || !validStatuses.includes(body.status)) {
      return sendError(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single();

    if (error) return sendError(res, 500, error.message);
    if (!data) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, { order: data });
  }

  return sendError(res, 405, 'Method not allowed');
}
