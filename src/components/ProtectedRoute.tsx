import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  denyAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin, denyAdmin }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (requireAdmin && role !== "admin") return <Navigate to="/" replace />;
  if (denyAdmin && role === "admin") return <Navigate to="/admin" replace />;

  return <>{children}</>;
}
