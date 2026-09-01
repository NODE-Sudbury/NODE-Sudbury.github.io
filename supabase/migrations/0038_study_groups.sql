-- ============================================================
-- Study Groups (AH)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.study_group_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  topic text NOT NULL,
  description text,
  facilitator_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  max_members integer DEFAULT 20,
  is_open boolean NOT NULL DEFAULT true,
  curriculum jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.study_group_cohorts(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.study_group_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.study_group_cohorts(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  notes text,
  completed_at timestamptz,
  UNIQUE (cohort_id, member_id, week_number)
);

ALTER TABLE public.study_group_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cohorts" ON public.study_group_cohorts FOR SELECT USING (true);
CREATE POLICY "Board manage cohorts" ON public.study_group_cohorts FOR ALL
  USING ((SELECT is_board() FROM public.members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Members join" ON public.study_group_members FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));
CREATE POLICY "Members read" ON public.study_group_members FOR SELECT USING (true);
CREATE POLICY "Members leave" ON public.study_group_members FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));

CREATE POLICY "Members track progress" ON public.study_group_progress FOR ALL
  USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));
CREATE POLICY "Public read progress" ON public.study_group_progress FOR SELECT USING (true);
