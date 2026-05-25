import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Clock, Gavel, Loader2, Package, Pencil, Trash2 } from "lucide-react";

import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBids, useUserNotifications } from "@/hooks/useArticles";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isPastAuctionEnd } from "@/lib/auction";

export default function MyBids() {
  const { user } = useAuth();
  const { data: bids, isLoading } = useMyBids(user?.id);
  const { data: notifications } = useUserNotifications(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const unreadNotifications = (notifications || []).filter((notification) => !notification.is_read);

  const handleCancel = async (bidId: string) => {
    const { error } = await supabase.from("bids").delete().eq("id", bidId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Enchere annulee" });
    await queryClient.invalidateQueries({ queryKey: ["my-bids", user?.id] });
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["user-notifications", user?.id] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar bidCount={bids?.length || 0} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Gavel className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mes Encheres</h1>
            <p className="text-sm text-muted-foreground">{bids?.length || 0} enchere(s)</p>
          </div>
        </div>

        <Card className="mb-6 overflow-hidden border border-primary/15 bg-primary/5 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-4 border-b border-primary/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Boite de messages</h2>
                  <p className="text-sm text-muted-foreground">
                    {unreadNotifications.length > 0
                      ? `${unreadNotifications.length} nouveau(x) message(s)`
                      : "Aucun nouveau message pour le moment"}
                  </p>
                </div>
              </div>
            </div>

            {notifications && notifications.length > 0 ? (
              <div className="space-y-3 p-4">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                      notification.is_read
                        ? "border-border/60 bg-background"
                        : "border-primary/25 bg-background ring-1 ring-primary/10"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{notification.title}</p>
                          {!notification.is_read && (
                            <Badge className="gradient-primary border-0 text-xs text-primary-foreground">
                              Nouveau
                            </Badge>
                          )}
                        </div>
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>

                      {!notification.is_read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="shrink-0"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Marquer comme lu
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Les messages importants lies a vos encheres apparaitront ici.
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bids && bids.length > 0 ? (
          <div className="space-y-3">
            {bids.map((bid: any) => {
              const article = bid.auctions?.articles;
              const imageUrl = article?.article_images?.[0]?.image_url;
              const isValidated =
                bid.auctions?.status === "valide" ||
                article?.status === "validated" ||
                isPastAuctionEnd(article?.date_fin_enchere);

              return (
                <Card key={bid.id} className="animate-fade-in overflow-hidden border border-border/60 bg-card shadow-sm">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
                    <div className="flex min-w-0 flex-1 items-center gap-4 p-4 md:p-5">
                    <Link to={`/articles/${bid.auctions?.article_id}`} className="shrink-0">
                      <div className="h-20 w-20 overflow-hidden rounded-xl bg-muted ring-1 ring-border/50 md:h-24 md:w-24">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/articles/${bid.auctions?.article_id}`}
                        className="line-clamp-2 text-lg font-semibold tracking-tight transition-colors hover:text-primary"
                      >
                        {article?.title || "Article"}
                      </Link>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {article?.category}
                        </Badge>
                        {isValidated ? (
                          <Badge className="gradient-success border-0 text-xs text-secondary-foreground">
                            Validee
                          </Badge>
                        ) : (
                          <Badge className="gradient-primary border-0 text-xs text-primary-foreground">
                            En cours
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(bid.created_at).toLocaleString("fr-FR")}
                      </div>
                    </div>
                    </div>

                    <div className="border-t border-border/60 bg-muted/30 p-4 md:min-w-[240px] md:border-l md:border-t-0 md:p-5">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Votre offre
                      </p>
                      <p className="mt-1 text-2xl font-bold text-primary md:text-3xl">
                        {bid.amount.toLocaleString("fr-FR")} fcfa
                      </p>
                      {!isValidated && (
                        <div className="mt-4 flex items-center justify-end gap-2 md:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Modifier"
                            aria-label="Modifier"
                            className="h-10 rounded-full px-4"
                            asChild
                          >
                            <Link to={`/articles/${bid.auctions?.article_id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(bid.id)}
                            title="Annuler"
                            aria-label="Annuler"
                            className="h-10 rounded-full border-destructive/30 px-4 text-destructive hover:bg-destructive/5 hover:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Annuler
                          </Button>
                        </div>
                      )}
                    </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            <Gavel className="mx-auto mb-4 h-16 w-16 opacity-30" />
            <p className="text-lg font-medium">Aucune enchere</p>
            <p className="text-sm">Commencez par parcourir les articles disponibles</p>
            <Link to="/">
              <Button className="mt-4 gradient-primary text-primary-foreground">Voir les articles</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
