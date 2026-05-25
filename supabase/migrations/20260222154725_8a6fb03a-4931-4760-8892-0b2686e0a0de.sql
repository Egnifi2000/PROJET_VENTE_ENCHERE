
-- Replace overly permissive auction insert policy with a more specific one
DROP POLICY "Authenticated can create auctions" ON public.auctions;

-- Only allow creating auction if no auction exists for the article yet
CREATE POLICY "Authenticated can create auctions for available articles" ON public.auctions 
FOR INSERT TO authenticated 
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.auctions a WHERE a.article_id = article_id)
);
