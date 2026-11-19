-- One-shot setup for a NEW, empty Supabase project: paste into SQL Editor and click Run.
-- Generated from supabase/migrations (in order). Do not edit by hand; edit the migrations instead.
-- Runs in one transaction, so if anything fails nothing is left half-created.

BEGIN;

-- ===== 20260619002529_2b16801f-eda0-498d-b7d6-dbebcdf6ac23.sql =====
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD',
  hourly_rate numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own customers" ON public.customers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  budget_type text NOT NULL DEFAULT 'hours' CHECK (budget_type IN ('none','hours','money')),
  budget numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own projects" ON public.projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  start_time bigint NOT NULL,
  end_time bigint NOT NULL,
  duration integer NOT NULL,
  hourly_rate numeric NOT NULL,
  billable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO authenticated;
GRANT ALL ON public.timesheets TO service_role;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own timesheets" ON public.timesheets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX customers_user_id_idx ON public.customers(user_id);
CREATE INDEX projects_user_id_idx ON public.projects(user_id);
CREATE INDEX projects_customer_id_idx ON public.projects(customer_id);
CREATE INDEX timesheets_user_id_idx ON public.timesheets(user_id);
CREATE INDEX timesheets_project_id_idx ON public.timesheets(project_id);

-- ===== 20260702192026_3bd9afa6-78bf-4705-81ba-8c96f364168b.sql =====

-- expenses
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  subtotal numeric NOT NULL DEFAULT 0,
  gst numeric NOT NULL DEFAULT 0,
  pst numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  receipt_path text,
  billable_to_customer boolean NOT NULL DEFAULT false,
  invoiced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own expenses" ON public.expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX expenses_user_date_idx ON public.expenses(user_id, expense_date DESC);

-- tax_settings (one per user)
CREATE TABLE public.tax_settings (
  user_id uuid NOT NULL PRIMARY KEY,
  business_name text NOT NULL DEFAULT '',
  business_email text NOT NULL DEFAULT '',
  business_address text NOT NULL DEFAULT '',
  gst_number text NOT NULL DEFAULT '',
  pst_number text NOT NULL DEFAULT '',
  default_gst_rate numeric NOT NULL DEFAULT 0.05,
  default_pst_rate numeric NOT NULL DEFAULT 0.07,
  charge_gst boolean NOT NULL DEFAULT true,
  charge_pst boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_settings TO authenticated;
GRANT ALL ON public.tax_settings TO service_role;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own tax settings" ON public.tax_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- customer tax columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tax_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gst_rate_override numeric,
  ADD COLUMN IF NOT EXISTS pst_rate_override numeric;


-- ===== 20260702192052_46284334-abd1-4744-b1b6-7c4ca60b951e.sql =====

CREATE POLICY "users read own receipts" ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own receipts" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own receipts" ON storage.objects FOR UPDATE
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own receipts" ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ===== 20261027150400_boards.sql =====
-- Boards (kanban) tables. Originally applied through Lovable Cloud on 2026-10-27.

CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO authenticated;
GRANT ALL ON public.boards TO service_role;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own boards" ON public.boards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_columns TO authenticated;
GRANT ALL ON public.board_columns TO service_role;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage columns of own boards" ON public.board_columns FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND b.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND b.user_id = auth.uid()));

CREATE TABLE public.board_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'Medium',
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_cards TO authenticated;
GRANT ALL ON public.board_cards TO service_role;
ALTER TABLE public.board_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage cards of own boards" ON public.board_cards FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.board_columns c JOIN public.boards b ON b.id = c.board_id WHERE c.id = column_id AND b.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.board_columns c JOIN public.boards b ON b.id = c.board_id WHERE c.id = column_id AND b.user_id = auth.uid()));


-- ===== 20261105120000_harden_policies.sql =====
-- Security hardening from the 2026-11-05 audit.
-- 1. Rows may only reference customers/projects owned by the same user, so a user
--    can't attach records to someone else's data (and lose them to that user's
--    cascading deletes).
-- 2. Policies that applied to every role are limited to signed-in users.

-- projects: the customer must belong to the same user.
DROP POLICY IF EXISTS "users manage own projects" ON public.projects;
CREATE POLICY "users manage own projects" ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

-- timesheets: the project must belong to the same user.
DROP POLICY IF EXISTS "users manage own timesheets" ON public.timesheets;
CREATE POLICY "users manage own timesheets" ON public.timesheets FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

-- expenses: optional customer/project links must belong to the same user.
DROP POLICY IF EXISTS "users manage own expenses" ON public.expenses;
CREATE POLICY "users manage own expenses" ON public.expenses FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (customer_id IS NULL OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid()))
    AND (project_id IS NULL OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()))
  );

-- tax_settings: signed-in users only.
DROP POLICY IF EXISTS "users manage own tax settings" ON public.tax_settings;
CREATE POLICY "users manage own tax settings" ON public.tax_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- receipts storage: signed-in users only, still limited to their own folder.
DROP POLICY IF EXISTS "users read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "users upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "users update own receipts" ON storage.objects;
DROP POLICY IF EXISTS "users delete own receipts" ON storage.objects;
CREATE POLICY "users read own receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own receipts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- receipts bucket: keep it private and accept only PDFs and images up to 10 MB.
UPDATE storage.buckets
  SET public = false,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
  WHERE id = 'receipts';


-- ===== 20261118000000_receipts_bucket.sql =====
-- Private bucket for receipt uploads. Lovable Cloud created it outside the
-- migrations, so fresh projects need it here. Safe to run if it already exists.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 'receipts', false, 10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ===== 20261119000000_invoice_tracking.sql =====
-- Track which time entries and expenses have been invoiced, and on which invoice,
-- so the same hours or costs can't be billed twice. Safe to run more than once.
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS invoiced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_number text;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE INDEX IF NOT EXISTS timesheets_user_invoiced_idx ON public.timesheets(user_id, invoiced);


COMMIT;
