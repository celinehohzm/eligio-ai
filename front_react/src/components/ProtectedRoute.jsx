import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getDefaultRouteForRole, normalizeRole } from "@/lib/roles";

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="absolute right-4 top-4 z-[2] md:right-8 md:top-8">
          <ThemeToggle />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.85]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% -10%, hsl(191 91% 42% / 0.06), transparent 52%), radial-gradient(circle at 100% 100%, hsl(174 72% 40% / 0.06), transparent 48%)",
          }}
        />
        <div className="relative rounded-3xl border border-border/65 bg-background/90 px-10 py-14 text-center shadow-2xl shadow-primary/15 backdrop-blur-xl motion-safe:animate-subtle-zoom">
          <div className="relative mx-auto mb-5 flex size-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-primary/20 motion-safe:animate-ping motion-reduce:animate-none" />
            <Loader2 className="relative size-8 animate-spin text-primary" aria-hidden />
          </div>
          <p className="text-lg font-semibold tracking-tight text-foreground">Setting things up…</p>
          <p className="mt-2 text-sm text-muted-foreground">Secure session check.</p>
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
