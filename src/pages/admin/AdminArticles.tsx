import { Suspense, lazy, useEffect, useState, type ChangeEvent } from "react";
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAdminArticles } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
import { ARTICLE_IMAGE_BUCKET, ARTICLE_STATUS_LABELS } from "@/lib/auction";

const AdminArticleDialogContent = lazy(() => import("@/components/admin/AdminArticleDialogContent"));

type ArticleCategory = Database["public"]["Tables"]["articles"]["Row"]["category"];
type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type FormStep = "infos" | "pricing" | "images";

const PAGE_SIZE = 10;
const MAX_AUCTION_DURATION_DAYS = 10;

const stepOrder: FormStep[] = ["infos", "pricing", "images"];

const stepLabels: Record<FormStep, string> = {
  infos: "Informations",
  pricing: "Tarification",
  images: "Images",
};

const initialForm = {
  title: "",
  description: "",
  category: "vehicule" as ArticleCategory,
  starting_price: "",
  reference_article: "",
  date_apparition: "",
  date_fin_enchere: "",
};

function getSupabaseProjectRef() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return "inconnu";

  try {
    return new URL(url).hostname.split(".")[0] || "inconnu";
  } catch {
    return "inconnu";
  }
}

function getStorageErrorMessage(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

  const isBucketNotFound =
    /bucket not found/i.test(message) ||
    /bucket .* not found/i.test(message) ||
    /Bucket .* introuvable/i.test(message);

  if (!isBucketNotFound) {
    return null;
  }

  return `Le bucket "${ARTICLE_IMAGE_BUCKET}" est introuvable sur le projet Supabase "${getSupabaseProjectRef()}". L'article a ete enregistre, mais les images n'ont pas pu etre envoyees. Creez ce bucket dans Storage ou configurez VITE_SUPABASE_ARTICLE_IMAGE_BUCKET, puis reessayez l'ajout d'images.`;
}

function formatDateTimeLocal(date: string | null) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  const offset = parsedDate.getTimezoneOffset();
  const localDate = new Date(parsedDate.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function validateAuctionWindow(dateApparition: string, dateFinEnchere: string) {
  const publicationDate = new Date(dateApparition);
  const endDate = new Date(dateFinEnchere);

  if (Number.isNaN(publicationDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return {
      valid: false,
      message: "Renseignez des dates valides pour la parution et la fin d'enchere.",
    };
  }

  if (endDate <= publicationDate) {
    return {
      valid: false,
      message: "La date de fin d'enchere doit etre apres la date de parution.",
    };
  }

  const maxDurationMs = MAX_AUCTION_DURATION_DAYS * 24 * 60 * 60 * 1000;

  if (endDate.getTime() - publicationDate.getTime() > maxDurationMs) {
    return {
      valid: false,
      message: `La duree entre la date de parution et la date de fin d'enchere ne doit pas depasser ${MAX_AUCTION_DURATION_DAYS} jours.`,
    };
  }

  return { valid: true, message: null };
}

function buildSafeImagePath(articleId: string, file: File) {
  const extensionIndex = file.name.lastIndexOf(".");
  const hasExtension = extensionIndex > 0;
  const rawName = hasExtension ? file.name.slice(0, extensionIndex) : file.name;
  const rawExtension = hasExtension ? file.name.slice(extensionIndex + 1) : "";

  const safeName = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  const safeExtension = rawExtension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const baseName = safeName || "image";
  const fileName = safeExtension ? `${baseName}.${safeExtension}` : baseName;

  return `${articleId}/${Date.now()}-${fileName}`;
}

export default function AdminArticles() {
  const { data: articles, isLoading } = useAdminArticles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<FormStep>("infos");
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const isEditing = editingArticleId !== null;

  const resetDialog = () => {
    setForm(initialForm);
    setImages([]);
    setPreviews([]);
    setCurrentStep("infos");
    setEditingArticleId(null);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetDialog();
    }
  };

  const validateStep = (step: FormStep) => {
    if (step === "infos") {
      if (!form.title || !form.reference_article || !form.category || !form.description) {
        toast({
          title: "Informations incompletes",
          description: "Renseignez le titre, la reference, la categorie et la description.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (step === "pricing") {
      if (!form.starting_price || !form.date_apparition || !form.date_fin_enchere) {
        toast({
          title: "Tarification incomplete",
          description: "Ajoutez le prix de depart, la date de parution et la date de fin d'enchere.",
          variant: "destructive",
        });
        return false;
      }

      const auctionWindow = validateAuctionWindow(form.date_apparition, form.date_fin_enchere);

      if (!auctionWindow.valid) {
        toast({
          title: "Periode d'enchere invalide",
          description: auctionWindow.message ?? "Verifiez les dates saisies.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const goToStep = (nextStep: FormStep) => {
    const currentIndex = stepOrder.indexOf(currentStep);
    const nextIndex = stepOrder.indexOf(nextStep);

    if (nextIndex > currentIndex && !validateStep(currentStep)) {
      return;
    }

    setCurrentStep(nextStep);
  };

  const handleNext = () => {
    const currentIndex = stepOrder.indexOf(currentStep);

    if (!validateStep(currentStep)) return;

    const nextStep = stepOrder[currentIndex + 1];
    if (nextStep) setCurrentStep(nextStep);
  };

  const handleBack = () => {
    const currentIndex = stepOrder.indexOf(currentStep);
    const previousStep = stepOrder[currentIndex - 1];

    if (previousStep) setCurrentStep(previousStep);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length > 5) {
      toast({ title: "Maximum 5 images", variant: "destructive" });
      return;
    }

    setImages(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const uploadImages = async (articleId: string) => {
    for (const file of images) {
      const filePath = buildSafeImagePath(articleId, file);

      const { error: uploadError } = await supabase.storage
        .from(ARTICLE_IMAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(ARTICLE_IMAGE_BUCKET)
        .getPublicUrl(filePath);

      await supabase.from("article_images").insert({
        article_id: articleId,
        image_url: publicUrlData.publicUrl,
      });
    }
  };

  const ensureReferenceIsUnique = async () => {
    const reference = form.reference_article.trim();

    if (!reference) return true;

    const { data, error } = await supabase
      .from("articles")
      .select("id")
      .eq("reference_article", reference)
      .limit(10);

    if (error) throw error;

    const conflictingArticle = (data ?? []).find((article) => article.id !== editingArticleId);

    if (conflictingArticle) {
      toast({
        title: "Reference deja utilisee",
        description: `La reference "${reference}" existe deja sur un autre article. Utilisez une reference unique.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleCreateOrUpdate = async () => {
    if (!validateStep("infos") || !validateStep("pricing")) return;

    setCreating(true);

    try {
      const hasUniqueReference = await ensureReferenceIsUnique();
      if (!hasUniqueReference) return;

      const publicationDate = new Date(form.date_apparition).toISOString();
      const auctionEndDate = new Date(form.date_fin_enchere).toISOString();
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        starting_price: parseFloat(form.starting_price),
        reference_article: form.reference_article,
        date_apparition: publicationDate,
        date_fin_enchere: auctionEndDate,
      };
      let imageUploadWarning: string | null = null;

      if (isEditing && editingArticleId) {
        const { error: updateError } = await supabase
          .from("articles")
          .update(payload)
          .eq("id", editingArticleId);

        if (updateError) throw updateError;

        if (images.length > 0) {
          try {
            await uploadImages(editingArticleId);
          } catch (error) {
            const storageMessage = getStorageErrorMessage(error);
            if (storageMessage) {
              imageUploadWarning = storageMessage;
            } else {
              throw error;
            }
          }
        }

        toast({
          title: imageUploadWarning ? "Article modifie avec avertissement" : "Article modifie avec succes",
          description: imageUploadWarning ?? undefined,
          variant: imageUploadWarning ? "destructive" : undefined,
        });
      } else {
        const { data: article, error: articleError } = await supabase
          .from("articles")
          .insert({
            ...payload,
          })
          .select()
          .single();

        if (articleError) throw articleError;

        if (images.length > 0) {
          try {
            await uploadImages(article.id);
          } catch (error) {
            const storageMessage = getStorageErrorMessage(error);
            if (storageMessage) {
              imageUploadWarning = storageMessage;
            } else {
              throw error;
            }
          }
        }

        toast({
          title: imageUploadWarning ? "Article cree avec avertissement" : "Article cree avec succes",
          description: imageUploadWarning ?? undefined,
          variant: imageUploadWarning ? "destructive" : undefined,
        });
      }

      resetDialog();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
    } catch (error: any) {
      const message = error?.message ?? "Erreur inconnue";
      const storageMessage = getStorageErrorMessage(error);

      toast({
        title: "Erreur",
        description: storageMessage ?? message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (article: ArticleRow) => {
    setEditingArticleId(article.id);
    setForm({
      title: article.title ?? "",
      description: article.description ?? "",
      category: article.category ?? "vehicule",
      starting_price: String(article.starting_price ?? ""),
      reference_article: article.reference_article ?? "",
      date_apparition: formatDateTimeLocal(article.date_apparition),
      date_fin_enchere: formatDateTimeLocal(article.date_fin_enchere),
    });
    setImages([]);
    setPreviews([]);
    setCurrentStep("infos");
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("articles").delete().eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Article supprime" });
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
    }
  };

  const formatDisplayDate = (date: string | null) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const filteredArticles = (articles ?? []).filter((article) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    const searchableValues = [
      article.title,
      article.reference_article,
      article.category,
      article.status,
      article.description,
    ];

    return searchableValues.some((value) => value?.toLowerCase().includes(query));
  });

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const paginatedArticles = filteredArticles.slice(
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
        <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Gestion des articles</CardTitle>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un article..."
                  className="pl-9"
                />
              </div>

              <Dialog open={open} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gradient-primary text-primary-foreground"
                    onClick={() => {
                      setEditingArticleId(null);
                      setForm(initialForm);
                      setImages([]);
                      setPreviews([]);
                      setCurrentStep("infos");
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter
                  </Button>
                </DialogTrigger>

                {open && (
                  <Suspense
                    fallback={
                      <DialogContent className="sm:max-w-3xl">
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      </DialogContent>
                    }
                  >
                    <AdminArticleDialogContent
                      creating={creating}
                      currentStep={currentStep}
                      form={form}
                      isEditing={isEditing}
                      previews={previews}
                      stepOrder={stepOrder}
                      stepLabels={stepLabels}
                      onClose={() => handleDialogChange(false)}
                      onBack={handleBack}
                      onCreateOrUpdate={handleCreateOrUpdate}
                      onGoToStep={goToStep}
                      onImageChange={handleImageChange}
                      onNext={handleNext}
                      onSetForm={setForm}
                    />
                  </Suspense>
                )}
              </Dialog>
            </div>
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
                      <TableHead className="w-20"></TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date de parution</TableHead>
                      <TableHead>Date fin enchere</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedArticles.length > 0 ? (
                      paginatedArticles.map((article) => {
                        const firstImage = article.article_images?.[0]?.image_url;

                        return (
                          <TableRow key={article.id}>
                            <TableCell className="w-20">
                              {firstImage ? (
                                <img
                                  src={firstImage}
                                  alt={article.title}
                                  className="h-14 w-14 rounded-md object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                                  -
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="font-medium">{article.title}</TableCell>
                            <TableCell>{article.reference_article || "-"}</TableCell>
                            <TableCell>{formatDisplayDate(article.date_apparition)}</TableCell>
                            <TableCell>{formatDisplayDate(article.date_fin_enchere)}</TableCell>

                            <TableCell>
                              <Badge variant="outline">{article.category}</Badge>
                            </TableCell>

                            <TableCell className="font-medium text-primary">
                              {article.starting_price.toLocaleString("fr-FR")} fcfa
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={article.status === "validated" ? "default" : "outline"}
                                className={
                                  article.status === "auction_started"
                                    ? "border-0 gradient-primary text-primary-foreground"
                                    : ""
                                }
                              >
                                {ARTICLE_STATUS_LABELS[article.status]}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(article)}
                                  aria-label={`Modifier ${article.title}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(article.id)}
                                  className="text-destructive hover:text-destructive"
                                  aria-label={`Supprimer ${article.title}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          Aucun article trouve.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredArticles.length > PAGE_SIZE && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
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
                            onClick={(e) => {
                              e.preventDefault();
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
                        onClick={(e) => {
                          e.preventDefault();
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
