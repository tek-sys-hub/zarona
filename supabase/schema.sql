-- =============================================================================
--  ZARONA UNISEX — SUPABASE DATABASE SCHEMA
--  Run this entire script in: Supabase → SQL Editor → New Query → Run
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
--  PROFILES TABLE (extends Supabase auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
--  PRODUCTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id             TEXT PRIMARY KEY DEFAULT ('zarona-' || gen_random_uuid()::TEXT),
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  price          DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  badge          TEXT,
  rating         DECIMAL(2, 1) DEFAULT 0.0,
  reviews_count  INTEGER DEFAULT 0,
  sizes          TEXT[] NOT NULL DEFAULT '{}',
  colors         JSONB DEFAULT '[]',    -- [{name, hex, image}]
  primary_image  TEXT NOT NULL,
  secondary_image TEXT,
  description    TEXT NOT NULL,
  details        TEXT[] DEFAULT '{}',
  is_featured    BOOLEAN DEFAULT FALSE,
  is_new         BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  stock          INTEGER DEFAULT 100,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
--  ORDERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_email       TEXT,
  guest_name        TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal          DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_cost     DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total             DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_address  JSONB,   -- {name, line1, line2, city, state, zip, country}
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
--  ORDER ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name     TEXT NOT NULL,
  product_image    TEXT,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  size        TEXT NOT NULL,
  color       TEXT,
  unit_price  DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL
);

-- =============================================================================
--  CART ITEMS TABLE (persistent cart for logged-in users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size        TEXT NOT NULL,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id, size, color)
);

-- =============================================================================
--  UPDATED_AT TRIGGER FUNCTION (auto-update timestamps)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
--  ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Products (public read, admin write)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders (user sees own orders, admin sees all)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Order items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
  );
CREATE POLICY "Anyone can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Cart items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
--  SEED PRODUCTS (your existing catalog)
-- =============================================================================
INSERT INTO public.products
  (id, name, category, price, original_price, badge, rating, reviews_count, sizes, colors, primary_image, secondary_image, description, details, is_featured, is_new)
VALUES
  (
    'zarona-tee-01', 'Essential Oversized Tee', 'T-Shirts',
    28.00, 35.00, 'Best Seller', 4.9, 142,
    ARRAY['XS','S','M','L','XL','XXL'],
    '[{"name":"Noir Black","hex":"#151515","image":"/assets/images/products/tee_black.jpg"},{"name":"Bone White","hex":"#EDE8DF","image":"/assets/images/products/tee_white_male.jpg"},{"name":"Alabaster","hex":"#DCD4C7","image":"/assets/images/products/tee_white_female.jpg"}]',
    '/assets/images/products/tee_black.jpg', '/assets/images/products/tee_white_male.jpg',
    'Cut from ultra-heavyweight 280GSM organic combed cotton with dropped shoulders and a boxy relaxed silhouette.',
    ARRAY['100% Organic Combed Cotton (280 GSM)','Relaxed unisex boxy drape','Reinforced ribbed collar','Embroidered Z monogram','Pre-shrunk'],
    TRUE, FALSE
  ),
  (
    'zarona-hoodie-01', 'Classic Hoodie', 'Hoodies',
    48.00, 60.00, 'Essential', 5.0, 218,
    ARRAY['XS','S','M','L','XL','XXL'],
    '[{"name":"Noir Black","hex":"#1A1A1A","image":"/assets/images/products/hoodie_zip_black.jpg"},{"name":"Charcoal Heather","hex":"#484440","image":"/assets/images/products/hoodie_charcoal.jpg"},{"name":"Alabaster Cream","hex":"#EAE4D8","image":"/assets/images/products/hoodie_cream_female.jpg"}]',
    '/assets/images/products/hoodie_charcoal.jpg', '/assets/images/products/hoodie_zip_black.jpg',
    'Constructed with 450GSM custom loopback French terry. Features double-layered structured hood.',
    ARRAY['450 GSM Heavyweight Loopback French Terry','Double-lined hood','Drop-shoulder tailoring','Embroidered Z monogram','Ribbed side gussets'],
    TRUE, FALSE
  ),
  (
    'zarona-shirt-01', 'Linen Shirt', 'Shirts',
    42.00, 50.00, NULL, 4.8, 89,
    ARRAY['XS','S','M','L','XL'],
    '[{"name":"Sand Ecru","hex":"#D6CCA9","image":"/assets/images/products/shirt_linen_sand.jpg"},{"name":"Warm Taupe","hex":"#B8A78F","image":"/assets/images/products/shirt_linen_sand.jpg"},{"name":"Charcoal Noir","hex":"#222222","image":"/assets/images/products/longsleeve_black.jpg"}]',
    '/assets/images/products/shirt_linen_sand.jpg', '/assets/images/products/shirt_linen_sand.jpg',
    '100% breathable European washed flax linen. Relaxed camp-collar profile.',
    ARRAY['100% Premium European Washed Linen','Naturally thermoregulating','Camp collar with horn-effect buttons','Single chest patch pocket','Curved hem'],
    TRUE, FALSE
  ),
  (
    'zarona-pants-01', 'Relaxed Fit Pants', 'Pants',
    45.00, NULL, 'Popular', 4.9, 96,
    ARRAY['XS','S','M','L','XL'],
    '[{"name":"Charcoal Grey","hex":"#3D3D3C","image":"/assets/images/products/pants_relaxed.jpg"},{"name":"Olive Khaki","hex":"#555246","image":"/assets/images/products/pants_relaxed.jpg"},{"name":"Stone Tan","hex":"#BCB3A4","image":"/assets/images/products/pants_relaxed.jpg"}]',
    '/assets/images/products/pants_relaxed.jpg', '/assets/images/products/pants_relaxed.jpg',
    'Tailored with a generous wide-leg drape, single pleat accents, elasticated waistband.',
    ARRAY['Cotton-Tencel blend','Mid-rise with relaxed wide leg','Single front pleats','Hidden drawstring waistband','Deep side slash pockets'],
    TRUE, FALSE
  ),
  (
    'zarona-varsity-01', 'Varsity Sweatshirt', 'Sweatshirts',
    52.00, 65.00, 'New Arrival', 4.9, 174,
    ARRAY['S','M','L','XL','XXL'],
    '[{"name":"Forest Green","hex":"#233329","image":"/assets/images/products/varsity_green.jpg"},{"name":"Washed Stone","hex":"#9E9A90","image":"/assets/images/products/varsity_green_back.jpg"}]',
    '/assets/images/products/varsity_green.jpg', '/assets/images/products/varsity_green_back.jpg',
    'Heritage athletic crewneck in dense brushed fleece featuring archival felt appliqué.',
    ARRAY['400 GSM Ultra-Soft Brushed Interior Fleece','Stitched varsity lettermark','Thick 2x2 ribbed trims','Drop shoulder silhouette','Vintage garment dyed finish'],
    TRUE, TRUE
  ),
  (
    'zarona-corduroy-01', 'Corduroy Jacket', 'Jackets',
    68.00, 85.00, 'Trending', 5.0, 64,
    ARRAY['S','M','L','XL'],
    '[{"name":"Caramel Brown","hex":"#6E452B","image":"/assets/images/products/jacket_corduroy_brown.jpg"},{"name":"Noir Black","hex":"#222222","image":"/assets/images/products/jacket_corduroy_female.jpg"}]',
    '/assets/images/products/jacket_corduroy_brown.jpg', '/assets/images/products/jacket_corduroy_female.jpg',
    'Vintage-inspired 8-wale corduroy chore jacket with antique brass dual-zip hardware.',
    ARRAY['100% Heavy Cotton 8-Wale Corduroy','Custom dual-direction antique brass zipper','Quilted cupro lining','Dual front chore pockets','Relaxed unisex cut'],
    TRUE, TRUE
  ),
  (
    'zarona-knit-01', 'Tactile Rib Knit Crewneck', 'Sweatshirts',
    58.00, NULL, NULL, 4.9, 82,
    ARRAY['XS','S','M','L','XL'],
    '[{"name":"Alabaster Cream","hex":"#E9E3D5","image":"/assets/images/products/knit_cream_female.jpg"},{"name":"Dark Chocolate","hex":"#3A2B23","image":"/assets/images/products/knit_chocolate.jpg"}]',
    '/assets/images/products/knit_cream_female.jpg', '/assets/images/products/knit_chocolate.jpg',
    'Heavyweight tactile rib-knit spun from soft wool-cotton blend.',
    ARRAY['70% Organic Cotton 30% Merino Wool','Sculptural rib knit gauge','Embroidered tonal Z monogram','Subtle side split hem'],
    FALSE, TRUE
  ),
  (
    'zarona-cap-01', 'Structured Z Monogram Cap', 'Accessories',
    26.00, NULL, 'Essential', 4.8, 115,
    ARRAY['One Size'],
    '[{"name":"Noir Black","hex":"#151515","image":"/assets/images/products/cap_black.jpg"}]',
    '/assets/images/products/cap_black.jpg', '/assets/images/products/cap_black.jpg',
    'Unstructured 6-panel silhouette in 100% washed cotton twill.',
    ARRAY['100% Washed Cotton Twill','Low profile 6-panel construction','Embroidered Z front logo','Adjustable strap with brass buckle','Curved brim with tonal stitching'],
    FALSE, FALSE
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
--  CREATE STORAGE BUCKET
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
--  GRANT ADMIN ROLE TO YOUR ACCOUNT
--  Replace the email below with your admin email
-- =============================================================================
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tekawasthi16@gmail.com';
