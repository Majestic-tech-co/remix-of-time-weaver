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
