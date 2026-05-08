import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="absolute right-6 top-6 z-[2] md:right-10 md:top-10">
        <ThemeToggle />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, hsl(191 91% 36% / 0.07), transparent 45%), radial-gradient(circle at 82% 10%, hsl(174 72% 38% / 0.06), transparent 42%)",
        }}
      />
      <div className="relative mx-auto flex max-w-lg flex-col items-center text-center motion-safe:animate-subtle-zoom">
        <span className="mb-8 inline-flex rounded-full border border-primary/20 bg-accent/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Error 404
        </span>
        <h1 className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-6xl font-extrabold tracking-tight text-transparent md:text-7xl">
          Oops!
        </h1>
        <p className="mt-6 text-xl font-semibold tracking-tight text-foreground md:text-2xl">That page drifted away</p>
        <p className="mt-3 max-w-[36ch] text-pretty leading-relaxed text-muted-foreground">
          The URL you visited does not match any route we know — double-check your link or return to Eligio.
        </p>
        <Button asChild className="group mt-10 gap-2 rounded-full px-8">
          <Link to="/">
            <ArrowLeft className="size-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-x-0.5" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
