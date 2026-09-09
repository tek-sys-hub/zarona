// =============================================================================
//  GET  /api/products  — List all active products
//  POST /api/products  — Create a new product (admin only)
// =============================================================================

import { supabaseAdmin } from './_supabase.js';
import { handleCors, verifyAdmin, sendError, sendSuccess } from './_middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  // ── GET /api/products ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { category, featured, search, sort = 'created_at', limit = 50 } = req.query;

    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true)
      .limit(parseInt(limit));

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Sorting
    switch (sort) {
      case 'price_asc':   query = query.order('price', { ascending: true });  break;
      case 'price_desc':  query = query.order('price', { ascending: false }); break;
      case 'rating':      query = query.order('rating', { ascending: false }); break;
      case 'newest':
      default:            query = query.order('created_at', { ascending: false }); break;
    }

    const { data, error } = await query;
    if (error) return sendError(res, 500, error.message);
    return sendSuccess(res, { products: data || [] });
  }

  // ── POST /api/products (admin only) ───────────────────────────────────────
  if (req.method === 'POST') {
    const { user, error: authError } = await verifyAdmin(req);
    if (authError) return sendError(res, 401, authError);

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const {
      name, category, price, original_price, badge,
      sizes, colors, primary_image, secondary_image,
      description, details, is_featured, is_new, stock,
    } = body;

    if (!name || !category || !price || !primary_image || !description) {
      return sendError(res, 400, 'Missing required fields: name, category, price, primary_image, description');
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([{
        name, category,
        price: parseFloat(price),
        original_price: original_price ? parseFloat(original_price) : null,
        badge: badge || null,
        sizes: sizes || [],
        colors: colors || [],
        primary_image,
        secondary_image: secondary_image || null,
        description,
        details: details || [],
        is_featured: Boolean(is_featured),
        is_new: Boolean(is_new),
        stock: parseInt(stock) || 100,
        is_active: true,
      }])
      .select()
      .single();

    if (error) return sendError(res, 500, error.message);
    return sendSuccess(res, { product: data }, 201);
  }

  return sendError(res, 405, 'Method not allowed');
}
