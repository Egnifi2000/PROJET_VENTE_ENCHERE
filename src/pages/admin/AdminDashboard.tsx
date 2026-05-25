import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Gavel, LayoutDashboard, Package, Users } from "lucide-react";

import Navbar from "@/components/Navbar";
import { prefetchRoute, schedulePrefetch } from "@/lib/routePrefetch";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
  { to: "/admin/articles", label: "Articles", icon: Package },
  { to: "/admin/auctions", label: "Encheres", icon: Gavel },
];

export default function AdminDashboard() {
  useEffect(() => {
    schedulePrefetch(["/admin/users", "/admin/articles", "/admin/auctions"]);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {adminLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onMouseEnter={() => prefetchRoute(link.to)}
              onFocus={() => prefetchRoute(link.to)}
              onTouchStart={() => prefetchRoute(link.to)}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "gradient-primary text-primary-foreground shadow-md"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
