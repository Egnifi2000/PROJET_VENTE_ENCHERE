import { CheckCircle, Gavel, Package, TrendingUp, Users } from "lucide-react";

import TopBidsTable from "@/components/TopBidsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminArticles, useAdminAuctions, useAdminUsers } from "@/hooks/useAdminData";

export default function AdminOverview() {
  const { data: articles } = useAdminArticles();
  const { data: users } = useAdminUsers();
  const { data: auctions } = useAdminAuctions();

  const stats = [
    { label: "Utilisateurs", value: users?.length || 0, icon: Users, color: "text-primary" },
    { label: "Articles", value: articles?.length || 0, icon: Package, color: "text-secondary" },
    { label: "Encheres", value: auctions?.length || 0, icon: Gavel, color: "text-primary" },
    {
      label: "En cours",
      value: auctions?.filter((auction) => auction.status === "en_cours").length || 0,
      icon: TrendingUp,
      color: "text-warning",
    },
    {
      label: "Validees",
      value: auctions?.filter((auction) => auction.status === "valide").length || 0,
      icon: CheckCircle,
      color: "text-secondary",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold">Tableau de bord</h2>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {stats.map((stat) => (
          <Card key={stat.label} className="min-w-[170px] flex-1 border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>

                <stat.icon className={`h-7 w-7 shrink-0 ${stat.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Top 3 des meilleures encheres</CardTitle>
        </CardHeader>

        <CardContent>
          <TopBidsTable />
        </CardContent>
      </Card>
    </div>
  );
}
