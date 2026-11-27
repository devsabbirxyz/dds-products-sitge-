-- ============================================================================
-- DDS-Digital — Idempotent Supabase Schema Upgrade Script
-- Project: zazurmsortaoyopjgjxl
-- Run this in Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 1) Grant execute permissions on role helper functions so anon/authenticated
--    clients never hit 401 permission denied on RLS policies.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

-- 2) Add stock tracking columns to products & product_variants
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity integer,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS stock_quantity integer;

-- 3) Add category & author_name columns to blog_posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS author_name text DEFAULT 'DDS-Digital Team';

-- 4) Create bundles & bundle_items tables
CREATE TABLE IF NOT EXISTS public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_en text,
  description text,
  discount_percent numeric NOT NULL DEFAULT 10 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (bundle_id, product_id)
);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bundles' AND policyname = 'Public read active bundles') THEN
    CREATE POLICY "Public read active bundles" ON public.bundles FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bundle_items' AND policyname = 'Public read bundle items') THEN
    CREATE POLICY "Public read bundle items" ON public.bundle_items FOR SELECT USING (true);
  END IF;
END $$;

-- 5) Create product_questions table (Q&A on product pages)
CREATE TABLE IF NOT EXISTS public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid,
  user_name text,
  question text NOT NULL,
  answer text,
  answered_by uuid,
  answered_at timestamptz,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_questions' AND policyname = 'Public read product questions') THEN
    CREATE POLICY "Public read product questions" ON public.product_questions FOR SELECT USING (is_public = true OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- 6) Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  duration_days integer NOT NULL DEFAULT 30,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Public read subscription plans') THEN
    CREATE POLICY "Public read subscription plans" ON public.subscription_plans FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
  END IF;
END $$;
