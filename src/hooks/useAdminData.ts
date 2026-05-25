import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncExpiredAuctions } from "@/lib/auction";

export function useAdminArticles() {
  return useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      await syncExpiredAuctions();

      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          article_images(image_url),
          auctions:auctions!article_id(
            id,
            status,
            start_date,
            end_date
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles(role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useAdminAuctions() {
  return useQuery({
    queryKey: ["admin-auctions"],
    queryFn: async () => {
      await syncExpiredAuctions();

      const { data, error } = await supabase
        .from("auctions")
        .select(`
          *,
          articles(*, article_images(image_url)),
          bids(
            *,
            profiles:user_id(
              name,
              email,
              matricule
            )
          )
        `)
        .order("start_date", { ascending: false });

      if (error) {
        console.error(error);
        throw error;
      }

      return data;
    },
  });
}
