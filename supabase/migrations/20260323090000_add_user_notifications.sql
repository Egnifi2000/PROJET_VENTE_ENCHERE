CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'auction_winner',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_unique_winner
  ON public.user_notifications (auction_id, user_id, type);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created_at
  ON public.user_notifications (user_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.user_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON public.user_notifications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.create_auction_winner_notification(target_auction_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  winner_record RECORD;
  article_record RECORD;
BEGIN
  SELECT a.id, a.article_id, ar.title
  INTO article_record
  FROM public.auctions a
  JOIN public.articles ar ON ar.id = a.article_id
  WHERE a.id = target_auction_id
    AND a.status = 'valide';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT b.user_id, b.amount, b.created_at
  INTO winner_record
  FROM public.bids b
  WHERE b.auction_id = target_auction_id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.user_notifications (
    user_id,
    auction_id,
    article_id,
    type,
    title,
    message
  )
  VALUES (
    winner_record.user_id,
    target_auction_id,
    article_record.article_id,
    'auction_winner',
    'Enchere remportee',
    format(
      'Felicitation ! Nous avons le plaisir de vous informer que vous etes le gagnant de l''enchere pour l''article "%s". Merci de contacter Jeneba dans un delai de 5 jours afin de proceder a la recuperation de votre article. Merci pour votre confiance.',
      COALESCE(article_record.title, 'Article')
    )
  )
  ON CONFLICT (auction_id, user_id, type) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_auction_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'valide' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.create_auction_winner_notification(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_auction_winner ON public.auctions;
CREATE TRIGGER notify_auction_winner
AFTER INSERT OR UPDATE OF status ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.notify_auction_winner();
