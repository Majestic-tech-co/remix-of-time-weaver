-- Track which time entries and expenses have been invoiced, and on which invoice,
-- so the same hours or costs can't be billed twice. Safe to run more than once.
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS invoiced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_number text;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE INDEX IF NOT EXISTS timesheets_user_invoiced_idx ON public.timesheets(user_id, invoiced);
