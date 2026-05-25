import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncExpiredAuctions } from "@/lib/auction";

export function useArticles(filters?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: ["articles", filters],
    queryFn: async () => {
      await syncExpiredAuctions();

      let query = supabase
        .from("articles")
        .select("*, article_images(image_url), auctions(id, status, start_date, end_date)")
        .order("created_at", { ascending: false });

      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category as any);
      }
      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
  });
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      await syncExpiredAuctions();

      const { data, error } = await supabase
        .from("articles")
        .select("*, article_images(id, image_url), auctions(id, status, start_date, end_date)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useArticleBids(articleId: string) {
  return useQuery({
    queryKey: ["article-bids", articleId],
    queryFn: async () => {
      await syncExpiredAuctions();

      // First get auction for this article
      const { data: auction } = await supabase
        .from("auctions")
        .select("id")
        .eq("article_id", articleId)
        .single();

      if (!auction) return [];

      const { data, error } = await supabase
        .from("bids")
        .select("*, profiles:user_id(name, email)")
        .eq("auction_id", auction.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!articleId,
  });
}

export function useMyBids(userId?: string) {
  return useQuery({
    queryKey: ["my-bids", userId],
    queryFn: async () => {
      if (!userId) return [];

      await syncExpiredAuctions();

      const { data, error } = await supabase
        .from("bids")
        .select("*, auctions(id, status, article_id, articles(title, starting_price, category, status, article_images(image_url)))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useUserNotifications(userId?: string) {
  return useQuery({
    queryKey: ["user-notifications", userId],
    queryFn: async () => {
      if (!userId) return [];

      await syncExpiredAuctions();

      const { data, error } = await supabase
        .from("user_notifications")
        .select("id, title, message, is_read, created_at, article_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!userId,
  });
}
