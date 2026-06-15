import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Gavel,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { scheduleExpiredAuctionsSync } from "@/lib/auction";

export default function AdminAuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [validating, setValidating] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { data: auction, isLoading } = useQuery({
    queryKey: ["admin-auction", id],
    queryFn: async () => {
      if (!id) throw new Error("Auction ID manquant");

      scheduleExpiredAuctionsSync();

      const { data, error } = await supabase
        .from("auctions")
        .select(`
          *,
          articles(*),
          bids(
            id,
            amount,
            created_at,
            profiles(
              name,
              email,
              matricule
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error(error);
        throw error;
      }

      return data;
    },
    enabled: !!id,
  });

  const bids =
    auction?.bids?.slice().sort((a: any, b: any) => b.amount - a.amount) || [];

  const highestBid = bids[0];
  const plannedEndDate = auction?.articles?.date_fin_enchere
    ? new Date(auction.articles.date_fin_enchere)
    : null;
  const hasPlannedEndDate = plannedEndDate && !Number.isNaN(plannedEndDate.getTime());
  const isAuctionRunning = auction?.status === "en_cours";
  const isPastPlannedEnd =
    Boolean(hasPlannedEndDate) && plannedEndDate!.getTime() <= now;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const formatRemainingTime = (targetDate: Date) => {
    const diff = targetDate.getTime() - now;

    if (diff <= 0) return "Date atteinte";

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;

    return `${seconds}s`;
  };

  const plannedEndLabel = useMemo(() => {
    if (!hasPlannedEndDate) return "Aucune date de fin prevue";

    return plannedEndDate!.toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    });
  }, [hasPlannedEndDate, plannedEndDate]);

  const finalizeAuction = useCallback(async (mode: "manual" | "automatic") => {
    if (!auction || validating || auction.status !== "en_cours") return;

    setValidating(true);

    try {
      const { error: auctionError } = await supabase
        .from("auctions")
        .update({
          status: "valide",
          end_date: new Date().toISOString(),
        })
        .eq("id", auction.id);

      if (auctionError) throw auctionError;

      const { error: articleError } = await supabase
        .from("articles")
        .update({ status: "validated" })
        .eq("id", auction.article_id);

      if (articleError) throw articleError;

      toast({
        title: mode === "automatic" ? "Enchere terminee automatiquement" : "Enchere validee",
        description: highestBid
          ? `Offre gagnante : ${highestBid.amount.toLocaleString("fr-FR")} fcfa`
          : "La date de fin a ete atteinte. Aucune offre gagnante n'a ete detectee.",
      });

      queryClient.invalidateQueries({ queryKey: ["admin-auction", auction.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-auctions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article", auction.article_id] });
      queryClient.invalidateQueries({ queryKey: ["my-bids"] });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  }, [auction, highestBid, queryClient, toast, validating]);

  useEffect(() => {
    if (isAuctionRunning && isPastPlannedEnd && !validating) {
      void finalizeAuction("automatic");
    }
  }, [finalizeAuction, isAuctionRunning, isPastPlannedEnd, validating]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="py-20 text-center text-muted-foreground">
          Enchere introuvable
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>

          {auction.status === "en_cours" && (
            <div className="w-full max-w-3xl rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-amber-500/10 p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="h-4 w-4" />
                    Fin d'enchere intuitive
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Date de fin prevue
                    </p>
                    <p className="text-base font-semibold">
                      {plannedEndLabel}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-sm shadow-sm">
                    <Clock className="h-4 w-4 text-amber-600" />
                    {hasPlannedEndDate ? (
                      isPastPlannedEnd ? (
                        <span className="font-medium text-amber-700">
                          La date est atteinte. L'enchere peut se terminer maintenant.
                        </span>
                      ) : (
                        <span>
                          Temps restant :{" "}
                          <span className="font-semibold">
                            {formatRemainingTime(plannedEndDate!)}
                          </span>
                        </span>
                      )
                    ) : (
                      <span>Aucune date automatique definie pour cette enchere.</span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Si vous voulez mettre fin a l'enchere maintenant, cliquez sur le bouton a droite.
                  </p>
                </div>

                <Button
                  onClick={() => void finalizeAuction("manual")}
                  disabled={validating}
                  size="lg"
                  className="min-w-56 gradient-success text-secondary-foreground shadow-lg shadow-primary/20"
                >
                  {validating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Valider l'enchere maintenant
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Details de l'article
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Titre</p>
                <p className="font-medium">{auction.articles?.title}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Categorie</p>
                <Badge variant="outline">{auction.articles?.category}</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Prix de depart</p>
                <p className="text-xl font-bold text-primary">
                  {auction.articles?.starting_price?.toLocaleString("fr-FR")} fcfa
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Fin prevue de l'enchere</p>
                <p className="font-medium">{plannedEndLabel}</p>
                {hasPlannedEndDate && auction.status === "en_cours" && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isPastPlannedEnd
                      ? "La date de fin est atteinte. La cloture automatique est declenchee."
                      : `Cloture automatique dans ${formatRemainingTime(plannedEndDate!)}`}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Statut enchere</p>

                {auction.status === "en_cours" ? (
                  <Badge className="border-0 gradient-primary text-primary-foreground">
                    En cours
                  </Badge>
                ) : (
                  <Badge className="border-0 gradient-success text-secondary-foreground">
                    Validee
                  </Badge>
                )}
              </div>

              {auction.end_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Date de fin reelle</p>
                  <p className="text-sm">
                    {new Date(auction.end_date).toLocaleString("fr-FR")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gavel className="h-4 w-4 text-primary" />
                Encheres ({bids.length})
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {bids.map((bid: any, i: number) => (
                  <Card
                    key={bid.id}
                    className={`w-56 shrink-0 border-0 ${
                      i === 0 ? "bg-accent shadow-md" : "bg-muted/50"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />

                        <span className="truncate text-sm font-medium">
                          {bid.profiles?.name || bid.profiles?.email}
                        </span>
                      </div>

                      <p className="text-2xl font-bold text-primary">
                        {bid.amount.toLocaleString("fr-FR")} fcfa
                      </p>

                      {i === 0 && (
                        <Badge className="mt-2 border-0 gradient-primary text-xs text-primary-foreground">
                          Plus haute enchere
                        </Badge>
                      )}

                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(bid.created_at).toLocaleString("fr-FR")}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {bids.length === 0 && (
                  <p className="py-4 text-sm text-muted-foreground">
                    Aucune enchere pour le moment
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


