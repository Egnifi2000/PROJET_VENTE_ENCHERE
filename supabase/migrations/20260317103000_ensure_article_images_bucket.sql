-- Ensure the article images bucket exists in every environment.
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- Recreate policies safely so this migration is idempotent.
DROP POLICY IF EXISTS "Anyone can view article images storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload article images storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete article images storage" ON storage.objects;

CREATE POLICY "Anyone can view article images storage"
ON storage.objects
FOR SELECT
USING (bucket_id = 'article-images');

CREATE POLICY "Admins can upload article images storage"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'article-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete article images storage"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'article-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
