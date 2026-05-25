import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Gavel, LayoutDashboard, LogOut, Menu, ShoppingBag, User, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prefetchRoute, schedulePrefetch } from "@/lib/routePrefetch";

export default function Navbar({ bidCount = 0 }: { bidCount?: number }) {
  const { user, role, profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{profile?.name || user.email}</span>
                {role === "admin" && (
                  <Badge className="gradient-success text-xs text-secondary-foreground">Admin</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
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
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive"
              size="sm"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Deconnexion
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
