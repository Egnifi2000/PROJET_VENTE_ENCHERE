ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS reference_article TEXT,
  ADD COLUMN IF NOT EXISTS date_apparition TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS date_fin_enchere TIMESTAMPTZ;

UPDATE public.articles
SET date_apparition = COALESCE(date_apparition, created_at)
WHERE date_apparition IS NULL;

CREATE INDEX IF NOT EXISTS idx_articles_status_date_fin
  ON public.articles (status, date_fin_enchere);

CREATE INDEX IF NOT EXISTS idx_bids_auction_amount
  ON public.bids (auction_id, amount DESC);

CREATE OR REPLACE FUNCTION public.sync_expired_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.auctions AS auction
  SET
    status = 'valide',
    end_date = COALESCE(auction.end_date, now())
  FROM public.articles AS article
  WHERE auction.article_id = article.id
    AND auction.status = 'en_cours'
    AND article.date_fin_enchere IS NOT NULL
    AND article.date_fin_enchere <= now();

  UPDATE public.articles AS article
  SET status = 'validated'
  FROM public.auctions AS auction
  WHERE auction.article_id = article.id
    AND auction.status = 'valide'
    AND article.status <> 'validated';
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_expired_auctions() TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_auction_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  article_record public.articles%ROWTYPE;
BEGIN
  SELECT *
  INTO article_record
  FROM public.articles
  WHERE id = NEW.article_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article introuvable pour cette enchere.';
  END IF;

  IF article_record.status = 'validated' THEN
    RAISE EXCEPTION 'Impossible de creer une enchere pour un article valide.';
  END IF;

  IF article_record.date_fin_enchere IS NOT NULL AND article_record.date_fin_enchere <= now() THEN
    RAISE EXCEPTION 'Impossible de creer une enchere apres sa date de fin.';
  END IF;

  NEW.status := COALESCE(NEW.status, 'en_cours');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_auction_before_insert ON public.auctions;
CREATE TRIGGER validate_auction_before_insert
BEFORE INSERT ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.validate_auction_before_insert();

CREATE OR REPLACE FUNCTION public.validate_bid_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auction_record public.auctions%ROWTYPE;
  article_record public.articles%ROWTYPE;
  current_highest NUMERIC(10, 2);
  minimum_amount NUMERIC(10, 2);
BEGIN
  PERFORM public.sync_expired_auctions();

  SELECT *
  INTO auction_record
  FROM public.auctions
  WHERE id = NEW.auction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enchere introuvable.';
  END IF;

  SELECT *
  INTO article_record
  FROM public.articles
  WHERE id = auction_record.article_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article introuvable.';
  END IF;

  IF auction_record.status <> 'en_cours' OR article_record.status = 'validated' THEN
    RAISE EXCEPTION 'Cette enchere est deja cloturee.';
  END IF;

  IF article_record.date_fin_enchere IS NOT NULL AND article_record.date_fin_enchere <= now() THEN
    RAISE EXCEPTION 'La date limite de cette enchere est depassee.';
  END IF;

  SELECT MAX(amount)
  INTO current_highest
  FROM public.bids
  WHERE auction_id = NEW.auction_id;

  minimum_amount := GREATEST(
    article_record.starting_price,
    COALESCE(current_highest + 1, article_record.starting_price)
  );

  IF NEW.amount < minimum_amount THEN
    RAISE EXCEPTION 'Le montant minimum autorise est % FCFA.', minimum_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_bid_before_insert ON public.bids;
CREATE TRIGGER validate_bid_before_insert
BEFORE INSERT ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.validate_bid_before_insert();
