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
