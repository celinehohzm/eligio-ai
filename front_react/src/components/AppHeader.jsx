import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import RoleTabs from "@/components/RoleTabs";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";

export default function AppHeader() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-header-bg backdrop-blur-[8px]">
      <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-6">
          <RoleTabs />
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="hidden items-center gap-3 md:flex">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                {user?.name}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
