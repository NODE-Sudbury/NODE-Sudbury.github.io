-- NODE Events Platform
-- Migration: Views
-- Generated: 2026-08-29

-- ============================================================
-- v_hackathon_leaderboard
-- ============================================================
CREATE OR REPLACE VIEW public.v_hackathon_leaderboard AS
  SELECT
    hs.event_id,
    hs.id            AS submission_id,
    hs.title,
    hs.team_id,
    ht.name          AS team_name,
    jo.final_rank,
    jo.avg_score,
    (SELECT COUNT(*) FROM public.award_recipients ar WHERE ar.submission_id = hs.id) AS award_count
  FROM public.hackathon_submissions hs
  LEFT JOIN public.hackathon_teams ht ON ht.id = hs.team_id
  LEFT JOIN public.judging_overall jo ON jo.submission_id = hs.id
  WHERE hs.sub_status != 'draft'
  ORDER BY jo.final_rank ASC NULLS LAST;

-- ============================================================
-- v_ctf_leaderboard
-- ============================================================
CREATE OR REPLACE VIEW public.v_ctf_leaderboard AS
  SELECT
    c.event_id,
    cs.member_id,
    m.full_name,
    m.avatar_url,
    SUM(c.points) AS total_points,
    COUNT(*)      AS solves
  FROM public.ctf_submissions cs
  JOIN public.ctf_challenges c ON c.id = cs.challenge_id
  JOIN public.members m        ON m.id = cs.member_id
  WHERE cs.is_correct = true
  GROUP BY c.event_id, cs.member_id, m.full_name, m.avatar_url
  ORDER BY total_points DESC;

-- ============================================================
-- v_volunteer_hours
-- ============================================================
CREATE OR REPLACE VIEW public.v_volunteer_hours AS
  SELECT
    va.member_id,
    m.full_name,
    vr.event_id,
    COUNT(vc.id)                AS check_in_count,
    SUM(
      EXTRACT(EPOCH FROM (COALESCE(vr.shift_ends_at, now()) - COALESCE(vr.shift_starts_at, vc.checked_in_at)))
      / 3600
    )                           AS total_hours
  FROM public.volunteer_applications va
  JOIN public.volunteer_roles vr      ON vr.id = va.role_id
  JOIN public.members m               ON m.id = va.member_id
  LEFT JOIN public.volunteer_check_ins vc ON vc.application_id = va.id
  WHERE va.status = 'checked_in'
  GROUP BY va.member_id, m.full_name, vr.event_id;

-- ============================================================
-- v_member_leaderboard
-- ============================================================
CREATE OR REPLACE VIEW public.v_member_leaderboard AS
  SELECT
    m.id             AS member_id,
    m.full_name,
    m.avatar_url,
    m.chapter_id,
    m.total_points,
    RANK() OVER (PARTITION BY m.chapter_id ORDER BY m.total_points DESC) AS chapter_rank,
    RANK() OVER (ORDER BY m.total_points DESC)                           AS global_rank,
    ast.current_streak,
    ast.longest_streak,
    (SELECT COUNT(*) FROM public.member_badges mb WHERE mb.member_id = m.id) AS badge_count
  FROM public.members m
  LEFT JOIN public.attendance_streaks ast ON ast.member_id = m.id
  WHERE m.is_public = true;
