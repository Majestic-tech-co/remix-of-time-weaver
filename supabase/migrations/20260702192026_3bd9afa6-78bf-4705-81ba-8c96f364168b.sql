
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
