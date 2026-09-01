-- NODE Events Platform
-- Migration: Storage buckets for new tables
-- Run with service_role key (Supabase dashboard or service client)
-- Generated: 2026-08-29

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('chapter-assets',  'chapter-assets',  true,  10485760,
    ARRAY['image/jpeg','image/png','image/svg+xml','image/webp']),
  ('cfp-files',       'cfp-files',       false, 20971520,
    ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation']),
  ('hackathon-decks', 'hackathon-decks', false, 52428800,
    ARRAY['application/pdf','video/mp4','video/webm']),
  ('sponsor-assets',  'sponsor-assets',  true,  10485760,
    ARRAY['image/jpeg','image/png','image/svg+xml','image/webp']),
  ('whiteboard-snapshots', 'whiteboard-snapshots', false, 10485760,
    ARRAY['image/png','image/webp']),
  ('certificate-pdfs', 'certificate-pdfs', false, 5242880,
    ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- cfp-files: uploader owns their subfolder; board can read all
CREATE POLICY "cfp_files_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cfp-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "cfp_files_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cfp-files'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_board())
  );

-- hackathon-decks: team member or board
CREATE POLICY "hackathon_decks_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hackathon-decks'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "hackathon_decks_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hackathon-decks'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_board())
  );

-- chapter-assets and sponsor-assets are public buckets (no row-level policy needed for read)
-- only board can upload to these
CREATE POLICY "chapter_assets_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chapter-assets' AND public.is_board());

CREATE POLICY "chapter_assets_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'chapter-assets' AND public.is_board());

CREATE POLICY "sponsor_assets_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sponsor-assets' AND public.is_board());

-- certificate-pdfs: member reads own cert; board reads all
CREATE POLICY "cert_pdf_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certificate-pdfs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_board())
  );

CREATE POLICY "cert_pdf_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'certificate-pdfs' AND public.is_board());

-- whiteboard-snapshots: event participants can upload; board can manage
CREATE POLICY "wb_snapshot_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'whiteboard-snapshots' AND auth.uid() IS NOT NULL);

CREATE POLICY "wb_snapshot_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'whiteboard-snapshots' AND auth.uid() IS NOT NULL);
