import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { getDefaultRouteForRole, normalizeRole } from "@/lib/roles";

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <div>
          <Loader2 className="mx-auto size-8 animate-spin text-signal" aria-hidden />
          <p className="mt-5 font-display text-lg font-bold tracking-[-0.02em] text-ink">Setting things up…</p>
          <p className="mt-2 font-sans text-sm text-muted-foreground">Secure session check.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(normalizeRole(user?.role))) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
