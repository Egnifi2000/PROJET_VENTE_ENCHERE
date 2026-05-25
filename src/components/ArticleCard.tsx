import { Link } from "react-router-dom";
import { Armchair, Car, Package, Tv } from "lucide-react";

import AuctionCountdownBadge from "@/components/AuctionCountdownBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { isPastAuctionEnd } from "@/lib/auction";

interface ArticleCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  startingPrice: number;
  status: string;
  imageUrl?: string;
  highestBid?: number;
  endDate?: string | null;
}

const categoryIcons: Record<string, any> = {
  vehicule: Car,
  electronique: Tv,
  mobilier: Armchair,
};

const categoryLabels: Record<string, string> = {
  vehicule: "Vehicule",
  electronique: "Electronique",
  mobilier: "Mobilier",
};

export default function ArticleCard({
  id,
  title,
  description,
  category,
  startingPrice,
  status,
  imageUrl,
  highestBid,
  endDate,
}: ArticleCardProps) {
  const Icon = categoryIcons[category] || Package;
  const isUnavailable = status === "validated" || isPastAuctionEnd(endDate);

  return (
    <Link to={`/articles/${id}`}>
      <Card className="group overflow-hidden border-0 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                isUnavailable ? "opacity-70 grayscale-[0.25]" : ""
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}

          <Badge className="absolute left-3 top-3 border-0 bg-card/90 text-foreground backdrop-blur-sm">
            <Icon className="mr-1 h-3 w-3" />
            {categoryLabels[category]}
          </Badge>

          {isUnavailable ? (
            <Badge className="absolute right-3 top-3 border-0 bg-muted-foreground text-white">
              Indisponible
            </Badge>
          ) : status === "auction_started" && (
            <Badge className="absolute right-3 top-3 border-0 gradient-primary text-primary-foreground">
              Enchere en cours
            </Badge>
          )}

          {isUnavailable ? (
            <Badge className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] whitespace-normal bg-card/90 text-foreground backdrop-blur-sm">
              Enchere terminee
            </Badge>
          ) : (
            <AuctionCountdownBadge
              endDate={endDate}
              className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] whitespace-normal"
            />
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="line-clamp-1 text-base font-semibold transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Prix de depart</p>
              <p className="text-lg font-bold text-primary">{startingPrice.toLocaleString("fr-FR")} fcfa</p>
            </div>

            {highestBid !== undefined && highestBid > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Meilleure offre</p>
                <p className="text-lg font-bold text-secondary">{highestBid.toLocaleString("fr-FR")} fcfa</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
