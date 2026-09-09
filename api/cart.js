// =============================================================================
//  GET    /api/cart  — Get user's cart
//  POST   /api/cart  — Add item to cart
//  DELETE /api/cart  — Remove item from cart
// =============================================================================

import { supabaseAdmin } from './_supabase.js';
import { handleCors, sendError, sendSuccess } from './_middleware.js';

// Helper: get user from Bearer token
async function getUserFromToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user || null;
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = await getUserFromToken(req);
  if (!user) return sendError(res, 401, 'Authentication required');

  // ── GET /api/cart ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        *,
        product:product_id (id, name, price, primary_image, sizes, colors, is_active)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) return sendError(res, 500, error.message);
    return sendSuccess(res, { cart: data || [] });
  }

  // ── POST /api/cart ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { product_id, quantity = 1, size, color } = body;

    if (!product_id) return sendError(res, 400, 'product_id is required');
    if (!size) return sendError(res, 400, 'size is required');

    // Check product exists
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (!product) return sendError(res, 404, 'Product not found');

    // Upsert cart item (increment qty if same product+size+color)
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .upsert(
        [{
          user_id: user.id,
          product_id,
          quantity: parseInt(quantity),
          size,
          color: color || null,
        }],
        {
          onConflict: 'user_id,product_id,size,color',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) return sendError(res, 500, error.message);
    return sendSuccess(res, { item: data }, 201);
  }

  // ── DELETE /api/cart ──────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { cart_item_id } = body;

    if (!cart_item_id) return sendError(res, 400, 'cart_item_id is required');

    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', cart_item_id)
      .eq('user_id', user.id); // ensure user owns this item

    if (error) return sendError(res, 500, error.message);
    return sendSuccess(res, { message: 'Item removed from cart' });
  }

  return sendError(res, 405, 'Method not allowed');
}
