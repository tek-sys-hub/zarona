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
--  EMAIL OTPS TABLE (Email Verification System)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  otp_code    TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_lookup ON public.email_otps (email, otp_code);
CREATE INDEX IF NOT EXISTS idx_email_otps_expiry ON public.email_otps (expires_at);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on email_otps" ON public.email_otps;
CREATE POLICY "Service role full access on email_otps" ON public.email_otps
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);


-- =============================================================================
--  CREATE STORAGE BUCKET
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT DO NOTHING;

-- Drop old policies first to avoid conflicts on re-run
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

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
-- =============================================================================
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tekawasthi16@gmail.com';
