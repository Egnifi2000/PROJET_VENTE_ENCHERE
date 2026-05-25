import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Loader2,
  User,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import AuctionCountdownBadge from "@/components/AuctionCountdownBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useArticle, useArticleBids } from "@/hooks/useArticles";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isPastAuctionEnd, syncExpiredAuctions } from "@/lib/auction";

function getBidStep(startingPrice: number) {
  if (startingPrice >= 1_000_000) return 100_000;
  if (startingPrice >= 100_000) return 10_000;
  return 1_000;
}

function roundUpToBidStep(amount: number, step: number) {
  return Math.ceil(amount / step) * step;
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: article, isLoading } = useArticle(id!);
  const { data: bids } = useArticleBids(id!);

  const [bidAmount, setBidAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const images = article?.article_images || [];
  const auction =
    article?.auctions?.[0] ||
    (Array.isArray(article?.auctions) ? undefined : article?.auctions);

  const sortedBids = useMemo(() => {
    if (!bids) return [];
    return [...bids].sort((a: any, b: any) => b.amount - a.amount);
  }, [bids]);

  const bidsCount = sortedBids.length;
  const highestBid = bidsCount > 0 ? sortedBids[0].amount : 0;
  const userBid = sortedBids.find((bid: any) => bid.user_id === user?.id);
  const bidStep = getBidStep(article?.starting_price || 0);
  const minBid = roundUpToBidStep(Math.max(article?.starting_price || 0, highestBid + 1), bidStep);
  const isClosedByDate = isPastAuctionEnd(article?.date_fin_enchere);
  const isClosed = article?.status === "validated" || isClosedByDate;

  const handleBid = async () => {
    if (!user || !article) return;

    setSubmitting(true);

    try {
      await syncExpiredAuctions();

      if (isClosed) {
        toast({
          title: "Enchere fermee",
          description: "Cette enchere est deja cloturee.",
          variant: "destructive",
        });
        return;
      }

      const amount = Number.parseFloat(bidAmount);

      if (Number.isNaN(amount) || amount < minBid || amount % bidStep !== 0) {
        toast({
          title: "Montant invalide",
          description: `Le montant doit etre >= ${minBid.toLocaleString("fr-FR")} fcfa et etre un multiple de ${bidStep.toLocaleString("fr-FR")}.`,
          variant: "destructive",
        });
        return;
      }

      let auctionId = auction?.id;

      if (!auctionId) {
        const { data: newAuction, error: auctionError } = await supabase
          .from("auctions")
          .insert({ article_id: article.id })
          .select()
          .single();

        if (auctionError) throw auctionError;
        auctionId = newAuction.id;
      }

      const bidQuery = userBid
        ? supabase.from("bids").update({ amount }).eq("id", userBid.id).eq("user_id", user.id)
        : supabase.from("bids").insert({ auction_id: auctionId, user_id: user.id, amount });

      const { error: bidError } = await bidQuery;

      if (bidError) throw bidError;

      if (article.status === "available") {
        const { error: articleError } = await supabase
          .from("articles")
          .update({ status: "auction_started" })
          .eq("id", article.id);

        if (articleError) throw articleError;
      }

      toast({
        title: userBid ? "Enchere modifiee" : "Enchere placee",
        description: userBid
          ? `Votre offre a ete mise a jour a ${amount} fcfa.`
          : `Votre offre de ${amount} fcfa a ete enregistree.`,
      });

      setBidAmount("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["article-bids", article.id] }),
        queryClient.invalidateQueries({ queryKey: ["article", article.id] }),
        queryClient.invalidateQueries({ queryKey: ["articles"] }),
        queryClient.invalidateQueries({ queryKey: ["my-bids", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-auctions"] }),
      ]);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Article introuvable
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              {images.length > 0 ? (
                <img
                  src={images[currentImage]?.image_url}
                  alt={article.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <img src="/logo.png" alt="Logo" className="h-20 w-20 object-contain" />
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((index) => (index - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 backdrop-blur"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentImage((index) => (index + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 backdrop-blur"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{article.category}</Badge>
                <AuctionCountdownBadge endDate={article.date_fin_enchere} />
                {isClosed && <Badge className="bg-muted-foreground text-white">Indisponible</Badge>}
              </div>

              <h1 className="mt-2 text-3xl font-bold">{article.title}</h1>
              <p className="mt-3 text-muted-foreground">{article.description}</p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Prix de depart</p>
                    <p className="text-2xl font-bold text-primary">
                      {article.starting_price.toLocaleString("fr-FR")} fcfa
                    </p>
                  </div>

                  {bidsCount > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {userBid ? "Votre offre" : "Meilleure offre"}
                      </p>
                      <p className="text-2xl font-bold text-secondary">
                        {(userBid ? userBid.amount : highestBid).toLocaleString("fr-FR")} fcfa
                      </p>
                    </div>
                  )}
                </div>

                {!isClosed ? (
                  <div className="mt-5 space-y-2">
                    {userBid && (
                      <p className="text-sm text-muted-foreground">
                        Vous avez deja une enchere sur cet article. Vous pouvez seulement la modifier.
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Les encheres se font par pas de {bidStep.toLocaleString("fr-FR")} fcfa.
                    </p>

                    <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={`Min. ${minBid} fcfa`}
                      value={bidAmount}
                      onChange={(event) => setBidAmount(event.target.value)}
                      min={minBid}
                      step={bidStep}
                    />
                    <Button
                      onClick={handleBid}
                      disabled={
                        submitting ||
                        !bidAmount ||
                        Number.parseFloat(bidAmount) < minBid ||
                        Number.parseFloat(bidAmount) % bidStep !== 0
                      }
                      className="gradient-primary text-primary-foreground"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Gavel className="mr-1 h-4 w-4" />
                          {userBid ? "Modifier l'offre" : "Encherir"}
                        </>
                      )}
                    </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Cet article reste visible, mais l'enchere est terminee. Il n'est plus possible de placer une offre.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Historique des encheres ({bidsCount})</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                {bidsCount === 0 && (
                  <p className="text-center text-muted-foreground">Aucune enchere</p>
                )}

                {sortedBids.map((bid: any, index: number) => {
                  const isTop = index === 0;
                  const isWinner = isClosed && isTop;

                  return (
                    <div
                      key={bid.id}
                      className={`flex justify-between rounded-lg p-3 ${
                        isTop ? "bg-accent" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{bid.profiles?.name || "Anonyme"}</span>
                        {isTop && !isClosed && (
                          <Badge className="gradient-primary text-xs text-white">Plus haute</Badge>
                        )}
                        {isWinner && (
                          <Badge className="bg-green-600 text-xs text-white">Vainqueur</Badge>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-bold">{bid.amount.toLocaleString("fr-FR")} fcfa</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(bid.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
