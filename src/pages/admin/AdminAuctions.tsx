import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Gavel, Loader2, Search } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<any | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [downloadingSelectedWinnerId, setDownloadingSelectedWinnerId] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string>("");
  const [dateReportLoading, setDateReportLoading] = useState(false);

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

  const openWinnerSelectionDialog = (auction: any) => {
    const sortedBids = [...(auction.bids || [])].sort((a: any, b: any) => b.amount - a.amount);
    setSelectedAuction(auction);
    setSelectedBidId(sortedBids[0]?.id ?? null);
    setWinnerDialogOpen(true);
  };

  const handleGenerateDateReportPdf = async () => {
    if (!reportDate) {
      toast({
        title: "Date requise",
        description: "Veuillez choisir une date avant de generer le rapport.",
        variant: "destructive",
      });
      return;
    }

    const matchedAuctions = (auctions ?? []).filter((auction) => {
      const endDate = auction.end_date ? new Date(auction.end_date) : null;
      if (!endDate) return false;
      const normalizedAuctionDate = endDate.toISOString().slice(0, 10);
      return normalizedAuctionDate === reportDate;
    });

    if (!matchedAuctions.length) {
      toast({
        title: "Aucune enchere",
        description: "Aucune enchere trouvee pour cette date.",
        variant: "destructive",
      });
      return;
    }

    setDateReportLoading(true);

    try {
      const { generateAuctionsDateReportPdf } = await import("@/lib/auctionReportPdf");
      await generateAuctionsDateReportPdf(matchedAuctions, reportDate);
      toast({
        title: "PDF genere",
        description: "Le rapport journalier a ete telecharge.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de generer le rapport PDF.",
        variant: "destructive",
      });
    } finally {
      setDateReportLoading(false);
    }
  };

  const handleGenerateSelectedWinnerPdf = async () => {
    if (!selectedAuction || !selectedBidId) return;

    setDownloadingSelectedWinnerId(selectedAuction.id);

    try {
      const { generateAuctionReportPdf } = await import("@/lib/auctionReportPdf");
      await generateAuctionReportPdf(selectedAuction, selectedBidId);
      toast({
        title: "PDF genere",
        description: "Le rapport d'enchere pour le candidat choisi a ete telecharge.",
      });
      setWinnerDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de generer le rapport PDF.",
        variant: "destructive",
      });
    } finally {
      setDownloadingSelectedWinnerId(null);
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
          <div className="grid gap-4 md:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rapport journalier</p>
              <p className="text-sm">Selectionnez une date de fin d'enchere pour generer le rapport global.</p>
            </div>

            <div className="flex gap-2">
              <Input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                className="max-w-[220px]"
              />
              <Button
                onClick={handleGenerateDateReportPdf}
                disabled={dateReportLoading}
              >
                {dateReportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generer rapport
              </Button>
            </div>
          </div>

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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={auction.status !== "valide" || !(auction.bids?.length)}
                                  onClick={() => openWinnerSelectionDialog(auction)}
                                >
                                  <Download className="mr-1 h-4 w-4" />
                                  Choisir gagnant
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

              <Dialog open={winnerDialogOpen} onOpenChange={(open) => {
                if (!open) {
                  setWinnerDialogOpen(false);
                  setSelectedAuction(null);
                  setSelectedBidId(null);
                }
              }}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Selection du gagnant</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Choisissez une offre parmi les 3 meilleures pour generer le rapport PDF.
                    </p>

                    {selectedAuction ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-card p-4">
                          <p className="text-sm font-medium">Article</p>
                          <p className="mt-1 text-base font-semibold">{selectedAuction.articles?.title || "-"}</p>
                          <p className="text-sm text-muted-foreground">{selectedAuction.articles?.description || "Pas de description"}</p>
                        </div>

                        <RadioGroup value={selectedBidId ?? ""} onValueChange={(value) => setSelectedBidId(value)} className="space-y-3">
                          {[...(selectedAuction.bids || [])]
                            .sort((a: any, b: any) => b.amount - a.amount)
                            .slice(0, 3)
                            .map((bid: any, index: number) => (
                              <label key={bid.id} className="flex items-center rounded-xl border p-3 transition-colors hover:border-primary">
                                <RadioGroupItem value={bid.id} className="mr-3 h-4 w-4 rounded-full border border-border text-primary ring-offset-background focus-visible:ring-primary" />
                                <div>
                                  <p className="text-sm font-semibold">{bid.profiles?.name || bid.profiles?.email || `Offre ${index + 1}`}</p>
                                  <p className="text-sm text-muted-foreground">{bid.amount.toLocaleString("fr-FR")} FCFA</p>
                                  <p className="text-xs text-muted-foreground">Matricule : {bid.profiles?.matricule || "-"}</p>
                                </div>
                              </label>
                            ))}
                        </RadioGroup>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune enchere selectionnee.</p>
                    )}
                  </div>

                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setWinnerDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={handleGenerateSelectedWinnerPdf}
                      disabled={!selectedBidId || !selectedAuction}
                    >
                      {downloadingSelectedWinnerId === selectedAuction?.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Generer PDF Top 3
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
