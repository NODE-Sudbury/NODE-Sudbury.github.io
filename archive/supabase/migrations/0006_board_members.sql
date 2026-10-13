-- Board members: NODE Sudbury board directory with role and term.

CREATE TABLE public.board_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid REFERENCES public.members(id) ON DELETE SET NULL,

  -- allow board entries for people without a site account
  name          text NOT NULL,
  role          text NOT NULL,
  bio           text,
  photo_url     text,
  linkedin_url  text,

  display_order integer NOT NULL DEFAULT 0,
  term_start    date,
  term_end      date,
  is_active     boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "board_members_select_active"
  ON public.board_members FOR SELECT
  USING (is_active = true);

CREATE TRIGGER board_members_set_updated_at
  BEFORE UPDATE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_board_members_active ON public.board_members(is_active);
CREATE INDEX idx_board_members_order  ON public.board_members(display_order);
