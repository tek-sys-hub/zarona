// =============================================================================
//  GET    /api/products/[id]  — Get single product
//  PUT    /api/products/[id]  — Update product (admin only)
//  DELETE /api/products/[id]  — Delete product (admin only)
// =============================================================================

import { supabaseAdmin } from '../_supabase.js';
import { handleCors, verifyAdmin, sendError, sendSuccess } from '../_middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const { id } = req.query;
  if (!id) return sendError(res, 400, 'Product ID is required');

  // ── GET /api/products/:id ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) return sendError(res, 404, 'Product not found');
    return sendSuccess(res, { product: data });
  }

  // ── PUT /api/products/:id (admin only) ────────────────────────────────────
  if (req.method === 'PUT') {
    const { user, error: authError } = await verifyAdmin(req);
    if (authError) return sendError(res, 401, authError);

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const allowedFields = [
      'name', 'category', 'price', 'original_price', 'badge',
      'sizes', 'colors', 'primary_image', 'secondary_image',
      'description', 'details', 'is_featured', 'is_new', 'is_active', 'stock',
    ];

    const updates = {};
    allowedFields.forEach(f => {
      if (body[f] !== undefined) updates[f] = body[f];
    });

    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.original_price) updates.original_price = parseFloat(updates.original_price);
    if (updates.stock) updates.stock = parseInt(updates.stock);

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return sendError(res, 500, error.message);
    if (!data) return sendError(res, 404, 'Product not found');
    return sendSuccess(res, { product: data });
  }

  // ── DELETE /api/products/:id (admin only) ─────────────────────────────────
  if (req.method === 'DELETE') {
    const { user, error: authError } = await verifyAdmin(req);
    if (authError) return sendError(res, 401, authError);

    // Soft delete — just mark as inactive
    const { error } = await supabaseAdmin
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) return sendError(res, 500, error.message);
    return sendSuccess(res, { message: 'Product deactivated successfully' });
  }

  return sendError(res, 405, 'Method not allowed');
}
