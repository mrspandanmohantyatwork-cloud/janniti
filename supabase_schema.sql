-- ==============================================================================
-- JANNITI / CIVIC INNOVATORS - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Copy and paste this complete SQL script into your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click Run (Ctrl+Enter)
-- ==============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. CITIZEN ACCOUNTS & AUTHENTICATION TABLE
-- Stores Sign-in, Sign-up, and Completed Profile Information of citizens & authorities
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.citizen_accounts (
    id TEXT PRIMARY KEY DEFAULT ('usr_' || round(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 6)),
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'authority')),
    name TEXT,
    phone TEXT,
    ward TEXT DEFAULT 'Ward 1',
    city TEXT DEFAULT 'Bhubaneswar',
    address TEXT,
    pincode TEXT,
    department TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,
    submissions_count INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Backward compatibility view/alias for users table
CREATE OR REPLACE VIEW public.users AS
SELECT * FROM public.citizen_accounts;

-- ------------------------------------------------------------------------------
-- 2. ORDERS / CIVIC SUBMISSIONS & DEVELOPMENT REQUESTS TABLE
-- Stores all development requests, complaints, evidence photos, voice notes, and orders
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    customer_name TEXT,
    email TEXT,
    phone TEXT,
    ward TEXT NOT NULL,
    city TEXT DEFAULT 'Bhubaneswar',
    address TEXT,
    pincode TEXT,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'in_progress', 'resolved')),
    image_url TEXT,
    audio_url TEXT,
    department TEXT,
    likes INTEGER DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    author_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create table aliases for 'submissions' and 'civic_orders' if desired
CREATE TABLE IF NOT EXISTS public.submissions (
    LIKE public.orders INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS public.civic_orders (
    LIKE public.orders INCLUDING ALL
);

-- ------------------------------------------------------------------------------
-- 3. CIVIC NOTIFICATIONS TABLE
-- Stores status updates, council announcements, and ledger notifications
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.civic_notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || round(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 6)),
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'status_change',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- Optimizes queries by ward, status, category, email, and created_at timestamps
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_ward ON public.orders(ward);
CREATE INDEX IF NOT EXISTS idx_orders_category ON public.orders(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.citizen_accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_ward ON public.citizen_accounts(ward);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Enables instant read/write access via your public anon API key
-- ------------------------------------------------------------------------------
ALTER TABLE public.citizen_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_notifications ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for the application's anon/public client
DROP POLICY IF EXISTS "Public full access on citizen_accounts" ON public.citizen_accounts;
CREATE POLICY "Public full access on citizen_accounts" ON public.citizen_accounts
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access on orders" ON public.orders;
CREATE POLICY "Public full access on orders" ON public.orders
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access on submissions" ON public.submissions;
CREATE POLICY "Public full access on submissions" ON public.submissions
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access on civic_orders" ON public.civic_orders;
CREATE POLICY "Public full access on civic_orders" ON public.civic_orders
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access on civic_notifications" ON public.civic_notifications;
CREATE POLICY "Public full access on civic_notifications" ON public.civic_notifications
    FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. AUTOMATIC UPDATED_AT TRIGGER
-- Automatically updates updated_at timestamp when records are modified
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. SUPABASE STORAGE BUCKET: JANNITI Storage / janniti-storage
-- Stores developer profile pictures, Civic Innovators logos, and grievance evidence
-- ------------------------------------------------------------------------------
-- Create 'JANNITI Storage' & 'janniti-storage' buckets (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('JANNITI Storage', 'JANNITI Storage', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('janniti-storage', 'janniti-storage', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Permissive public storage policies for read, upload, update and delete
DROP POLICY IF EXISTS "Public can view JANNITI Storage objects" ON storage.objects;
CREATE POLICY "Public can view JANNITI Storage objects" ON storage.objects
    FOR SELECT USING (bucket_id IN ('JANNITI Storage', 'janniti-storage'));

DROP POLICY IF EXISTS "Public can insert into JANNITI Storage" ON storage.objects;
CREATE POLICY "Public can insert into JANNITI Storage" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('JANNITI Storage', 'janniti-storage'));

DROP POLICY IF EXISTS "Public can update JANNITI Storage objects" ON storage.objects;
CREATE POLICY "Public can update JANNITI Storage objects" ON storage.objects
    FOR UPDATE USING (bucket_id IN ('JANNITI Storage', 'janniti-storage'));

DROP POLICY IF EXISTS "Public can delete JANNITI Storage objects" ON storage.objects;
CREATE POLICY "Public can delete JANNITI Storage objects" ON storage.objects
    FOR DELETE USING (bucket_id IN ('JANNITI Storage', 'janniti-storage'));

