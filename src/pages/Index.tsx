import { useState } from "react";
import { Armchair, Car, Gavel, Loader2, Search, Tv } from "lucide-react";

import ArticleCard from "@/components/ArticleCard";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useArticles, useMyBids } from "@/hooks/useArticles";

const categories = [
  { value: "all", label: "Tous", icon: Gavel },
  { value: "vehicule", label: "Vehicules", icon: Car },
  { value: "electronique", label: "Electronique", icon: Tv },
  { value: "mobilier", label: "Mobilier", icon: Armchair },
];

export default function Index() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const { user } = useAuth();
  const { data: articles, isLoading } = useArticles({ search, category });
  const { data: myBids } = useMyBids(user?.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar bidCount={myBids?.length || 0} />

      <div className="gradient-primary px-4 py-12">
        <div className="container mx-auto text-center">
          <h1 className="mb-2 text-3xl font-extrabold text-primary-foreground md:text-4xl">
            Plateforme d'Encheres
          </h1>
          <p className="mb-6 text-primary-foreground/80">
            Decouvrez nos articles et placez vos encheres en toute simplicite
          </p>
          <div className="relative mx-auto max-w-lg">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-12 border-0 bg-card pl-10 text-foreground shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto -mt-5 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((categoryItem) => (
            <Button
              key={categoryItem.value}
              variant={category === categoryItem.value ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(categoryItem.value)}
              className={
                category === categoryItem.value
                  ? "gradient-primary shrink-0 border-0 text-primary-foreground"
                  : "shrink-0 bg-card"
              }
            >
              <categoryItem.icon className="mr-1.5 h-4 w-4" />
              {categoryItem.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                id={article.id}
                title={article.title}
                description={article.description}
                category={article.category}
                startingPrice={article.starting_price}
                status={article.status}
                imageUrl={article.article_images?.[0]?.image_url}
                endDate={article.date_fin_enchere}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            <Gavel className="mx-auto mb-4 h-16 w-16 opacity-30" />
            <p className="text-lg font-medium">Aucun article trouve</p>
            <p className="text-sm">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
