import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Gavel, Loader2, Search } from "lucide-react";

import { useAdminAuctions } from "@/hooks/useAdminData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AUCTION_STATUS_LABELS } from "@/lib/auction";

const PAGE_SIZE = 10;

export default function AdminAuctions() {
  const { data: auctions, isLoading } = useAdminAuctions();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingAuctionId, setDownloadingAuctionId] = useState<string | null>(null);

  const handleGeneratePdf = async (auction: any) => {
    const hasWinner = Boolean(auction.bids?.length);

    if (auction.status !== "valide" || !hasWinner) {
      toast({
        title: "Rapport indisponible",
        description: "Le PDF peut etre genere uniquement pour une enchere validee avec un gagnant.",
        variant: "destructive",
      });
      return;
    }

    setDownloadingAuctionId(auction.id);

    try {
      const { generateAuctionReportPdf } = await import("@/lib/auctionReportPdf");
      await generateAuctionReportPdf(auction);
      toast({
        title: "PDF genere",
        description: "Le rapport d'enchere a ete telecharge.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de generer le rapport PDF.",
        variant: "destructive",
      });
    } finally {
      setDownloadingAuctionId(null);
    }
  };

  const filteredAuctions = (auctions ?? []).filter((auction) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    const searchableValues = [
      auction.articles?.title,
      auction.status,
      auction.start_date,
      auction.end_date,
    ];

    return searchableValues.some((value) => value?.toLowerCase().includes(query));
  });

  const totalPages = Math.max(1, Math.ceil(filteredAuctions.length / PAGE_SIZE));
  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="animate-fade-in">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <CardTitle>Gestion des encheres</CardTitle>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une enchere..."
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Encheres</TableHead>
                      <TableHead>Meilleure offre</TableHead>
                      <TableHead>Date debut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedAuctions.length > 0 ? (
                      paginatedAuctions.map((auction) => {
                        const highestBid = auction.bids?.length
                          ? Math.max(...auction.bids.map((bid: { amount: number }) => bid.amount))
                          : 0;

                        return (
                          <TableRow key={auction.id}>
                            <TableCell className="font-medium">{auction.articles?.title || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  auction.status === "en_cours"
                                    ? "border-0 gradient-primary text-primary-foreground"
                                    : "border-0 gradient-success text-secondary-foreground"
                                }
                              >
                                {AUCTION_STATUS_LABELS[auction.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>{auction.bids?.length || 0}</TableCell>
                            <TableCell className="font-medium text-primary">
                              {highestBid > 0 ? `${highestBid.toLocaleString("fr-FR")} fcfa` : "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(auction.start_date).toLocaleDateString("fr-FR")}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <Link to={`/admin/auctions/${auction.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="mr-1 h-4 w-4" />
                                    Details
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    downloadingAuctionId === auction.id ||
                                    auction.status !== "valide" ||
                                    !(auction.bids?.length)
                                  }
                                  onClick={() => void handleGeneratePdf(auction)}
                                >
                                  {downloadingAuctionId === auction.id ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="mr-1 h-4 w-4" />
                                  )}
                                  PDF
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Aucune enchere trouvee.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredAuctions.length > PAGE_SIZE && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage((page) => Math.max(1, page - 1));
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
                            onClick={(event) => {
                              event.preventDefault();
                              setCurrentPage(page);
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
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage((page) => Math.min(totalPages, page + 1));
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
