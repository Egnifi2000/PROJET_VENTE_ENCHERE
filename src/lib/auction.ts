import { supabase } from "@/integrations/supabase/client";

export const ARTICLE_IMAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_ARTICLE_IMAGE_BUCKET ?? "article-images";

export const ARTICLE_STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  auction_started: "Enchere en cours",
  validated: "Valide",
};

export const AUCTION_STATUS_LABELS: Record<string, string> = {
  en_cours: "En cours",
  valide: "Validee",
};

export function isPastAuctionEnd(endDate?: string | null) {
  if (!endDate) return false;

  const parsedDate = new Date(endDate);
  if (Number.isNaN(parsedDate.getTime())) return false;

  return parsedDate.getTime() <= Date.now();
}

const EXPIRED_AUCTIONS_SYNC_INTERVAL_MS = 60_000;
let lastExpiredAuctionsSync = 0;
let expiredAuctionsSyncPromise: Promise<void> | null = null;

export async function syncExpiredAuctions(options: { force?: boolean } = {}) {
  const now = Date.now();

  if (!options.force && now - lastExpiredAuctionsSync < EXPIRED_AUCTIONS_SYNC_INTERVAL_MS) {
    return;
  }

  if (expiredAuctionsSyncPromise) {
    return expiredAuctionsSyncPromise;
  }

  expiredAuctionsSyncPromise = (async () => {
    const { error } = await supabase.rpc("sync_expired_auctions");

    // The RPC is introduced by a later migration. In demo environments where the
    // migration is not applied yet, we keep the app functional instead of failing
    // every catalog query.
    if (error && error.code !== "PGRST202") {
      throw error;
    }

    lastExpiredAuctionsSync = Date.now();
  })().finally(() => {
    expiredAuctionsSyncPromise = null;
  });

  return expiredAuctionsSyncPromise;
}

export function scheduleExpiredAuctionsSync() {
  void syncExpiredAuctions().catch((error) => {
    console.error("Erreur de synchronisation des encheres expirees:", error);
  });
}

