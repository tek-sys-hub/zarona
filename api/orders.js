// =============================================================================
//  GET  /api/orders  — List orders (admin: all, customer: own orders)
//  POST /api/orders  — Place a new order (customer or guest)
// =============================================================================

import { supabaseAdmin } from './_supabase.js';
import { handleCors, verifyAuth, sendError, sendSuccess } from './_middleware.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  // ── GET /api/orders ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { user, role, error: authError } = await verifyAuth(req);
    if (authError) return sendError(res, 401, authError);

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        profiles:user_id (full_name, email),
        order_items (*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // If customer, restrict to their own orders only
    if (role !== 'admin') {
      query = query.eq('user_id', user.id);
    } else if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) return sendError(res, 500, error.message);

    return sendSuccess(res, {
      orders: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  // ── POST /api/orders — Place new order (user must be signed up) ───────────
  if (req.method === 'POST') {
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return sendError(res, 401, 'Please sign up or sign in to complete your order');
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { items, shipping_address, notes, payment_method } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Order must contain at least one item');
    }
    if (!shipping_address) {
      return sendError(res, 400, 'Shipping address is required');
    }

    // Validate products exist and compute totals
    const productIds = items.map(i => i.product_id || i.id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, primary_image, stock')
      .in('id', productIds)
      .eq('is_active', true);

    if (productsError) return sendError(res, 500, productsError.message);

    const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const pid = item.product_id || item.id;
      const product = productMap[pid];
      
      const unitPrice = product ? product.price : (parseFloat(item.price) || 0);
      const productName = product ? product.name : (item.name || 'Zarona Item');
      const productImage = product ? product.primary_image : (item.image || '');

      const qty = parseInt(item.quantity) || 1;
      const totalPrice = unitPrice * qty;
      subtotal += totalPrice;

      orderItems.push({
        product_id: pid,
        product_name: productName,
        product_image: productImage,
        quantity: qty,
        size: item.size || 'M',
        color: item.color || item.colorName || null,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    const shippingCost = subtotal >= 50 ? 0 : 5.99;
    const total = subtotal + shippingCost;

    const paymentLabel = payment_method || 'Cash on Delivery';
    const combinedNotes = [
      `Payment: ${paymentLabel}`,
      notes
    ].filter(Boolean).join(' | ');

    const formattedAddress = typeof shipping_address === 'object' ? {
      ...shipping_address,
      payment_method: paymentLabel
    } : { address: shipping_address, payment_method: paymentLabel };

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        user_id: user.id,
        guest_email: user.email,
        guest_name: user.user_metadata?.full_name || (typeof shipping_address === 'object' ? shipping_address.name : '') || '',
        status: 'pending',
        subtotal,
        shipping_cost: shippingCost,
        total,
        shipping_address: formattedAddress,
        notes: combinedNotes,
      }])
      .select()
      .single();

    if (orderError) return sendError(res, 500, orderError.message);

    // Insert order items
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems.map(item => ({ ...item, order_id: order.id })));

    if (itemsError) return sendError(res, 500, itemsError.message);

    return sendSuccess(res, { order: { ...order, items: orderItems } }, 201);
  }

  return sendError(res, 405, 'Method not allowed');
}
