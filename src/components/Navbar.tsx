import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Gavel, KeyRound, LayoutDashboard, Loader2, LogOut, Menu, ShoppingBag, User, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { prefetchRoute, schedulePrefetch } from "@/lib/routePrefetch";

export default function Navbar({ bidCount = 0 }: { bidCount?: number }) {
  const { user, role, profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: "/", label: "Articles", icon: ShoppingBag },
    ...(role !== "admin" ? [{ to: "/my-bids", label: "Mes Encheres", icon: Gavel, badge: bidCount }] : []),
    ...(role === "admin" ? [{ to: "/admin", label: "Admin", icon: LayoutDashboard }] : []),
  ];

  useEffect(() => {
    const likelyRoutes = role === "admin" ? ["/admin"] : ["/my-bids"];
    schedulePrefetch(likelyRoutes);
  }, [role]);

  const resetPasswordDialog = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handlePasswordDialogChange = (open: boolean) => {
    setPasswordDialogOpen(open);

    if (!open) {
      resetPasswordDialog();
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast({
        title: "Erreur",
        description: "Impossible d'identifier le compte connecte.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Champs incomplets",
        description: "Renseignez les trois champs avant de continuer.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le nouveau mot de passe doit contenir au moins 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Verification impossible",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      });

      if (loginError) {
        toast({
          title: "Erreur",
          description: "Le mot de passe actuel est incorrect.",
          variant: "destructive",
        });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Succes",
        description: "Mot de passe modifie avec succes.",
      });

      handlePasswordDialogChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le mot de passe.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center">
              <img src="/logo.png" alt="Bouygues Logo" className="h-14 w-14 object-contain" />
            </div>
            <span className="hidden text-lg font-bold sm:inline">SICMA Enchere</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onMouseEnter={() => prefetchRoute(link.to)}
                onFocus={() => prefetchRoute(link.to)}
              >
                <Button
                  variant={isActive(link.to) ? "default" : "ghost"}
                  size="sm"
                  className={isActive(link.to) ? "gradient-primary text-primary-foreground" : ""}
                >
                  <link.icon className="mr-1.5 h-4 w-4" />
                  {link.label}
                  {link.badge ? (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 bg-secondary px-1.5 py-0 text-xs text-secondary-foreground"
                    >
                      {link.badge}
                    </Badge>
                  ) : null}
                </Button>
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full border border-transparent px-2 py-1 text-sm text-muted-foreground transition hover:border-border hover:bg-muted/40">
                      <User className="h-4 w-4" />
                      <span>{profile?.name || user.email}</span>
                      {role === "admin" && (
                        <Badge className="gradient-success text-xs text-secondary-foreground">Admin</Badge>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-2 py-1.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {profile?.name || user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {profile?.matricule || user.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handlePasswordDialogChange(true)}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Changer mon mot de passe
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Deconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="animate-fade-in space-y-2 border-t bg-card p-4 md:hidden">
            {user && (
              <div className="mb-3 flex items-center justify-between rounded-2xl border bg-muted/30 px-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Compte connecte
                    </p>
                    <p className="truncate text-sm font-medium text-foreground">
                      {profile?.name || user.email}
                    </p>
                  </div>
                </div>
                {role === "admin" && (
                  <Badge className="gradient-success shrink-0 text-xs text-secondary-foreground">
                    Admin
                  </Badge>
                )}
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                onTouchStart={() => prefetchRoute(link.to)}
                onFocus={() => prefetchRoute(link.to)}
              >
                <Button
                  variant={isActive(link.to) ? "default" : "ghost"}
                  className="w-full justify-start"
                  size="sm"
                >
                  <link.icon className="mr-2 h-4 w-4" />
                  {link.label}
                  {link.badge ? <Badge variant="secondary" className="ml-auto">{link.badge}</Badge> : null}
                </Button>
              </Link>
            ))}

            {user && (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    handlePasswordDialogChange(true);
                  }}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Changer mon mot de passe
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive"
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Deconnexion
                </Button>
              </>
            )}
          </div>
        )}
      </nav>

      <Dialog open={passwordDialogOpen} onOpenChange={handlePasswordDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer mon mot de passe</DialogTitle>
            <DialogDescription>
              Renseignez votre mot de passe actuel puis choisissez un nouveau mot de passe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                placeholder="Votre mot de passe actuel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                placeholder="Votre nouveau mot de passe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                placeholder="Confirmez le nouveau mot de passe"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handlePasswordDialogChange(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="gradient-primary text-primary-foreground"
              >
                {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre a jour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
