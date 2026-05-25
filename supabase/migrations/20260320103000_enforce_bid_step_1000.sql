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
  bid_step NUMERIC(10, 2);
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

  bid_step := CASE
    WHEN article_record.starting_price >= 1000000 THEN 100000
    WHEN article_record.starting_price >= 100000 THEN 10000
    ELSE 1000
  END;

  SELECT MAX(amount)
  INTO current_highest
  FROM public.bids
  WHERE auction_id = NEW.auction_id
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  minimum_amount := GREATEST(
    CEIL(article_record.starting_price / bid_step) * bid_step,
    CEIL(COALESCE(current_highest + 1, article_record.starting_price) / bid_step) * bid_step
  );

  IF NEW.amount < minimum_amount THEN
    RAISE EXCEPTION 'Le montant minimum autorise est % FCFA.', minimum_amount;
  END IF;

  IF MOD(NEW.amount, bid_step) <> 0 THEN
    RAISE EXCEPTION 'Les encheres doivent etre des multiples de % FCFA.', bid_step;
  END IF;

  RETURN NEW;
END;
$$;
