import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { scheduleExpiredAuctionsSync } from "@/lib/auction";

const PAGE_SIZE = 10;

export default function TopBidsTable() {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["top-bids"],
    queryFn: async () => {
      scheduleExpiredAuctionsSync();

      const { data, error } = await supabase
        .from("bids")
        .select(`
          amount,
          profiles(name),
          auctions(
            articles(title)
          )
        `)
        .order("amount", { ascending: false });

      if (error) throw error;

      const grouped: Record<string, { user: string; amount: number }[]> = {};

      data?.forEach((bid: any) => {
        const article = bid.auctions?.articles?.title || "Article";

        if (!grouped[article]) {
          grouped[article] = [];
        }

        grouped[article].push({
          user: bid.profiles?.name || "Utilisateur",
          amount: bid.amount,
        });
      });

      Object.keys(grouped).forEach((article) => {
        grouped[article] = grouped[article]
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);
      });

      return grouped;
    },
  });

  const filteredData = Object.entries(data || {}).filter(([article]) =>
    article.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage(1);
    setOpenRow(null);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setOpenRow(null);
    }
  }, [currentPage, totalPages]);

  if (isLoading) {
    return <div className="py-10 text-center">Chargement...</div>;
  }

  const maxBids = Math.max(
    ...filteredData.map(([, bids]: any) => bids.length),
    1,
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Rechercher un article..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Article</TableHead>
            <TableHead>Meilleure offre</TableHead>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Activite</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginatedData.length > 0 ? (
            paginatedData.map(([article, bids]: any) => {
              const bestBid = bids[0];
              const totalBids = bids.length;
              const progress = (totalBids / maxBids) * 100;

              return (
                <Fragment key={article}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setOpenRow(openRow === article ? null : article)}
                  >
                    <TableCell>
                      {openRow === article ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>

                    <TableCell className="font-medium">{article}</TableCell>

                    <TableCell className="font-bold text-green-700">
                      {bestBid.amount.toLocaleString("fr-FR")} FCFA
                    </TableCell>

                    <TableCell>{bestBid.user}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-full rounded bg-muted">
                          <div
                            className="h-2 rounded bg-primary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <span className="text-sm font-semibold">{totalBids}</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {openRow === article && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30">
                        <div className="space-y-2 p-3">
                          {bids.map((bid: any, index: number) => (
                            <div
                              key={index}
                              className={`flex justify-between rounded border-b px-2 py-1 text-sm ${
                                index === 0
                                  ? "bg-green-100 font-semibold text-green-800"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <span>
                                {index === 0 && "1er "}
                                {index + 1}. {bid.user}
                              </span>

                              <span>{bid.amount.toLocaleString("fr-FR")} FCFA</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Aucun resultat trouve.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {filteredData.length > PAGE_SIZE && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((page) => Math.max(1, page - 1));
                  setOpenRow(null);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;

              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                      setOpenRow(null);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((page) => Math.min(totalPages, page + 1));
                  setOpenRow(null);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}


