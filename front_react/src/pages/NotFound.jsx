import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/Logo";
import AppHeader from "@/components/AppHeader";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <div className="idx-in flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-6 text-center">
        <Mark className="size-10" />
        <span className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-signal">Error 404</span>
        <h1 className="mt-3 font-display text-6xl font-extrabold tracking-[-0.04em] sm:text-7xl">Oops!</h1>
        <p className="mt-4 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">That page drifted away</p>
        <p className="mt-3 max-w-[36ch] font-sans leading-[1.6] text-muted2">
          The URL you visited does not match any route we know — double-check your link or return to Eligio.
        </p>
        <Button asChild className="mt-9 gap-2">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
