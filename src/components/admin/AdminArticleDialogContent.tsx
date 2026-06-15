import type { ChangeEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ArticleCategory = "vehicule" | "electronique" | "mobilier";
type FormStep = "infos" | "pricing" | "images";

type ArticleFormState = {
  title: string;
  description: string;
  category: ArticleCategory;
  starting_price: string;
  reference_article: string;
  date_apparition: string;
  date_fin_enchere: string;
};

type Props = {
  creating: boolean;
  currentStep: FormStep;
  form: ArticleFormState;
  isEditing: boolean;
  previews: string[];
  stepOrder: FormStep[];
  stepLabels: Record<FormStep, string>;
  onClose: () => void;
  onBack: () => void;
  onCreateOrUpdate: () => void;
  onGoToStep: (step: FormStep) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onSetForm: (nextForm: ArticleFormState) => void;
};

function toTitleCase(value: string) {
  return value.replace(/\S+/g, (word) => {
    const [first = "", ...rest] = word;
    return `${first.toLocaleUpperCase("fr-FR")}${rest.join("").toLocaleLowerCase("fr-FR")}`;
  });
}

function formatAmountInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function AdminArticleDialogContent({
  creating,
  currentStep,
  form,
  isEditing,
  previews,
  stepOrder,
  stepLabels,
  onBack,
  onClose,
  onCreateOrUpdate,
  onGoToStep,
  onImageChange,
  onNext,
  onSetForm,
}: Props) {
  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        <div className="border-b">
          <div className="grid md:grid-cols-3">
            {stepOrder.map((step, index) => {
              const isActive = currentStep === step;
              const isCompleted = stepOrder.indexOf(currentStep) > index;

              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => onGoToStep(step)}
                  className={`border-b-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary text-foreground"
                      : isCompleted
                        ? "border-primary/40 text-foreground/80"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {stepLabels[step]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          {currentStep === "infos" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Titre</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => onSetForm({ ...form, title: toTitleCase(e.target.value) })}
                    placeholder="Titre de l'article"
                  />
                </div>

                <div>
                  <Label>Reference article</Label>
                  <Input
                    value={form.reference_article}
                    onChange={(e) => onSetForm({ ...form, reference_article: e.target.value })}
                    placeholder="REF-001"
                  />
                </div>
              </div>

              <div>
                <Label>Categorie</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => onSetForm({ ...form, category: value as ArticleCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicule">Vehicule</SelectItem>
                    <SelectItem value="electronique">Electronique</SelectItem>
                    <SelectItem value="mobilier">Mobilier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => onSetForm({ ...form, description: toTitleCase(e.target.value) })}
                  placeholder="Description detaillee de l'article"
                  className="min-h-32"
                />
              </div>
            </div>
          )}

          {currentStep === "pricing" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/5 p-4">
                <p className="text-sm font-medium text-primary">
                  Configurez ici le prix de depart, la date de parution et l'heure exacte de fin d'enchere.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  La date de fin d'enchere doit rester dans une periode maximale de 10 jours apres la date de parution.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Prix de depart (fcfa)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.starting_price}
                    onChange={(e) => onSetForm({ ...form, starting_price: formatAmountInput(e.target.value) })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label>Date de parution</Label>
                  <Input
                    type="datetime-local"
                    value={form.date_apparition}
                    onChange={(e) => onSetForm({ ...form, date_apparition: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Date fin enchere</Label>
                  <Input
                    type="datetime-local"
                    value={form.date_fin_enchere}
                    onChange={(e) => onSetForm({ ...form, date_fin_enchere: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === "images" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-background p-3 shadow-sm">
                    <ImagePlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {isEditing ? "Ajouter de nouveaux visuels" : "Ajout des visuels"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Importez jusqu'a 5 images pour rendre l'article plus attractif.
                    </p>
                  </div>
                </div>

                <Input type="file" accept="image/*" multiple onChange={onImageChange} />
              </div>

              {previews.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {previews.map((src, index) => (
                    <div key={index} className="overflow-hidden rounded-2xl border bg-muted/30">
                      <img src={src} alt="preview" className="h-20 w-full object-cover md:h-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                  {isEditing
                    ? "Aucune nouvelle image selectionnee."
                    : "Aucune image ajoutee pour le moment."}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {currentStep === "infos" ? (
              <span>Commencez par renseigner les informations principales.</span>
            ) : currentStep === "pricing" ? (
              <span>Passez ensuite a la configuration de l'enchere.</span>
            ) : (
              <span>
                {isEditing
                  ? "Ajoutez des images si besoin puis enregistrez les modifications."
                  : "Derniere etape : ajoutez les images puis creez l'article."}
              </span>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {currentStep === "infos" ? (
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={onBack}>
                Retour
              </Button>
            )}

            {currentStep !== "images" ? (
              <Button type="button" onClick={onNext} className="gradient-primary text-primary-foreground">
                Suivant
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onCreateOrUpdate}
                disabled={creating}
                className="gradient-primary text-primary-foreground"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Enregistrer" : "Creer l'article"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

