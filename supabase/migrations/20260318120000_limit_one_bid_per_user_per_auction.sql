DROP POLICY IF EXISTS "Users can update own bids" ON public.bids;

CREATE POLICY "Users can update own bids"
ON public.bids
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

WITH ranked_bids AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY auction_id, user_id
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM public.bids
)
DELETE FROM public.bids
WHERE id IN (
  SELECT id
  FROM ranked_bids
  WHERE row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_unique_user_per_auction
  ON public.bids (auction_id, user_id);

DROP TRIGGER IF EXISTS validate_bid_before_insert ON public.bids;

CREATE TRIGGER validate_bid_before_insert
BEFORE INSERT OR UPDATE ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.validate_bid_before_insert();
