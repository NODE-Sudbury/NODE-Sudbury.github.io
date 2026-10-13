-- Members table: auto-populated via trigger on Google SSO login.
-- Mirrors auth.users; stores networking profile fields.

CREATE TABLE public.members (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  avatar_url  text,

  -- profile type
  member_type text NOT NULL DEFAULT 'professional'
    CHECK (member_type IN ('professional', 'student')),

  -- professional fields
  job_title   text,
  company     text,

  -- student fields
  school      text,
  program     text,

  -- networking socials
  linkedin_url  text,
  github_url    text,
  twitter_url   text,
  discord_tag   text,
  website_url   text,

  -- metadata
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Anyone can read active member profiles (public networking directory)
CREATE POLICY "members_select_active"
  ON public.members FOR SELECT
  USING (is_active = true);

-- Members can update only their own profile
CREATE POLICY "members_update_own"
  ON public.members FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: auto-insert member row when a new user signs in via Google SSO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at current on any profile edit
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER members_set_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_members_email     ON public.members(email);
CREATE INDEX idx_members_type      ON public.members(member_type);
CREATE INDEX idx_members_active    ON public.members(is_active);
