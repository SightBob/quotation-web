-- Storage bucket สำหรับโลโก้ / ลายเซ็น (idempotent - รันซ้ำได้)
-- Supabase Dashboard -> SQL Editor -> New query -> Run
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='assets public read') THEN
    CREATE POLICY "assets public read" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='assets insert for auth') THEN
    CREATE POLICY "assets insert for auth" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'assets');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='assets update for auth') THEN
    CREATE POLICY "assets update for auth" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'assets');
  END IF;
END $$;
