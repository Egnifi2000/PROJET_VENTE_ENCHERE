import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function normalizeMatricule(value: string) {
  return value.trim().toUpperCase();
}

function isValidMatricule(value: string) {
  return /^SCA\d{4}$/.test(normalizeMatricule(value));
}

function buildWorkerEmail(matricule: string) {
  const safeMatricule = normalizeMatricule(matricule)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${safeMatricule}@sicma.com`;
}

function buildLegacyWorkerEmail(matricule: string) {
  const safeMatricule = normalizeMatricule(matricule)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `matricule-${safeMatricule}@sicma.com`;
}

function formatAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Identifiants invalides. Verifiez votre matricule ou votre mot de passe.";
  }

  if (message.toLowerCase().includes("email not confirmed")) {
    return "Votre compte existe mais votre email n'est pas encore confirme.";
  }

  return message || "Une erreur est survenue.";
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const repairProfileAfterSignup = async (userId: string, userEmail: string, fullName: string, matricule: string) => {
    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: userId,
        email: userEmail,
        name: fullName,
        matricule,
      }, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("Erreur de reparation du profil apres inscription:", error);
    }
  };

  const signInWithPossibleWorkerEmails = async (normalizedMatricule: string, rawPassword: string) => {
    const candidateEmails = [
      buildWorkerEmail(normalizedMatricule),
      buildLegacyWorkerEmail(normalizedMatricule),
    ];

    const { data: workerEmail, error: matriculeError } = await supabase.rpc(
      "get_worker_email_by_matricule",
      { worker_matricule: normalizedMatricule },
    );

    if (matriculeError) throw matriculeError;

    if (workerEmail && !candidateEmails.includes(workerEmail)) {
      candidateEmails.push(workerEmail);
    }

    let lastAuthError: Error | null = null;

    for (const candidateEmail of candidateEmails) {
      const { error } = await supabase.auth.signInWithPassword({
        email: candidateEmail,
        password: rawPassword,
      });

      if (!error) {
        return;
      }

      lastAuthError = error;
    }

    if (lastAuthError) {
      throw lastAuthError;
    }

    throw new Error("Aucun compte n'est associe a ce matricule.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const trimmedIdentifier = identifier.trim();

        if (!trimmedIdentifier) {
          throw new Error("Veuillez renseigner votre identifiant.");
        }

        let loginEmail = trimmedIdentifier;

        if (!trimmedIdentifier.includes("@")) {
          const normalizedMatricule = normalizeMatricule(trimmedIdentifier);

          if (!isValidMatricule(normalizedMatricule)) {
            throw new Error("Le matricule doit commencer par SCA et contenir 4 chiffres. Exemple : SCA0000.");
          }

          await signInWithPossibleWorkerEmails(normalizedMatricule, password);
          navigate("/");
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        navigate("/");
      } else {
        const normalizedMatricule = normalizeMatricule(identifier);

        if (!normalizedMatricule) {
          throw new Error("Veuillez renseigner votre matricule.");
        }

        if (!isValidMatricule(normalizedMatricule)) {
          throw new Error("Le matricule doit commencer par SCA et contenir 4 chiffres. Exemple : SCA0000.");
        }

        if (!name.trim()) {
          throw new Error("Veuillez renseigner votre nom complet.");
        }

        const generatedEmail = buildWorkerEmail(normalizedMatricule);
        const { data: existingEmail, error: matriculeError } = await supabase.rpc(
          "get_worker_email_by_matricule",
          { worker_matricule: normalizedMatricule },
        );

        if (matriculeError) throw matriculeError;

        if (existingEmail) {
          throw new Error("Ce matricule est deja utilise. Veuillez vous connecter.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: generatedEmail,
          password,
          options: { data: { name: name.trim(), matricule: normalizedMatricule } },
        });

        if (error) throw error;

        if (data.user) {
          await repairProfileAfterSignup(
            data.user.id,
            generatedEmail,
            name.trim(),
            normalizedMatricule,
          );
        }

        toast({
          title: "Compte cree avec succes",
          description: "Vous pouvez maintenant vous connecter.",
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: formatAuthError(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-fade-in border-0 bg-card shadow-xl">
        <CardHeader className="pb-2 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <img src="/logo.png" alt="Bouygues Logo" className="h-14 w-14 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "Connexion" : "Inscription"}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">SICMA encheres Platform</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jean Dupont"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier">{isLogin ? "Identifiant" : "Matricule"}</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={isLogin ? "Matricule ou email admin" : "Ex: SCA0000"}
                autoCapitalize="characters"
                required
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Le matricule doit commencer par SCA suivi de 4 chiffres.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                minLength={6}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin
                ? "Se connecter"
                : "Creer mon compte"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setIdentifier("");
                setPassword("");
                setName("");
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "Pas de compte ? Creer un compte" : "Deja un compte ? Se connecter"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
