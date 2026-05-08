import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ClipboardList,
  Loader2,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RoleTabs from "@/components/RoleTabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import eligioLogo from "@/assets/eligio-logo.png";
import apiService from "@/services/api";

function ClinicDetails({ clinic }) {
  const conditions = Array.isArray(clinic.conditions) ? clinic.conditions : [];
  const keySymptoms = Array.isArray(clinic.key_symptoms) ? clinic.key_symptoms : [];
  const urgencyFlags = Array.isArray(clinic.urgency_flags) ? clinic.urgency_flags : [];
  const procedures = Array.isArray(clinic.procedures) ? clinic.procedures : [];
  const providers = Array.isArray(clinic.providers) ? clinic.providers : [];
  const doNotRoute = Array.isArray(clinic.do_not_route_here) ? clinic.do_not_route_here : [];

  return (
    <div className="specialists-clinic-panel grid gap-4 border-t border-border bg-muted/25 px-4 py-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <div className="motion-safe:hover:-translate-y-px rounded-lg border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-500 ease-smooth motion-safe:hover:border-primary/20 motion-safe:hover:shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Stethoscope className="h-4 w-4 text-primary" />
            Clinic overview
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{clinic.description}</p>
          {clinic.intake_requirements ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Intake requirements
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/90">{clinic.intake_requirements}</p>
            </div>
          ) : null}
          {clinic.age_restrictions ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Age restrictions
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/90">{clinic.age_restrictions}</p>
            </div>
          ) : null}
        </div>

        {conditions.length > 0 ? (
          <div className="motion-safe:hover:-translate-y-px rounded-lg border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-500 ease-smooth motion-safe:hover:border-primary/20 motion-safe:hover:shadow-md">
            <p className="text-sm font-semibold text-foreground">Conditions commonly seen</p>
            <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-sm text-muted-foreground">
              {conditions.map((c) => (
                <li
                  key={c}
                  className="rounded-md border border-border/60 bg-muted/60 px-3 py-1.5 text-foreground/90 transition-[border-color,background-color] duration-300 ease-out motion-safe:hover:border-primary/25 motion-safe:hover:bg-muted"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {keySymptoms.length > 0 ? (
          <div className="motion-safe:hover:-translate-y-px rounded-lg border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-500 ease-smooth motion-safe:hover:border-primary/20 motion-safe:hover:shadow-md">
            <p className="text-sm font-semibold text-foreground">Key symptoms</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {keySymptoms.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-border bg-muted/70 px-3 py-1 text-xs font-medium text-foreground/90 transition-[border-color,transform,background-color] duration-300 ease-out motion-safe:hover:scale-[1.02] motion-safe:hover:border-primary/30"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {urgencyFlags.length > 0 ? (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 dark:border-amber-500/25 dark:bg-amber-950/35">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              Urgency flags
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-950/90 dark:text-amber-50/90">
              {urgencyFlags.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {procedures.length > 0 ? (
          <div className="motion-safe:hover:-translate-y-px rounded-lg border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-500 ease-smooth motion-safe:hover:border-primary/20 motion-safe:hover:shadow-md">
            <p className="text-sm font-semibold text-foreground">Procedures / programs</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {procedures.map((p) => (
                <li
                  key={p}
                  className="rounded-md border border-border/60 bg-muted/60 px-3 py-2 text-foreground/90 transition-[border-color,background-color] duration-300 ease-out motion-safe:hover:border-primary/25 motion-safe:hover:bg-muted"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="motion-safe:hover:-translate-y-px rounded-lg border border-border bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-500 ease-smooth motion-safe:hover:border-primary/20 motion-safe:hover:shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            Providers
          </div>
          {providers.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {providers.map((name) => (
                <li
                  key={name}
                  className="rounded-md border border-border/60 bg-muted/60 px-3 py-2 text-foreground/90 transition-[border-color,background-color] duration-300 ease-out motion-safe:hover:border-primary/25 motion-safe:hover:bg-muted"
                >
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No named providers in knowledge base.</p>
          )}
        </div>

        {doNotRoute.length > 0 ? (
          <div className="rounded-lg border border-red-500/35 bg-red-500/10 p-4 dark:border-red-500/30 dark:bg-red-950/40">
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">Do not route here</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-950/90 dark:text-red-50/85">
              {doNotRoute.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SpecialistsList() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getClinics();
        const list = Array.isArray(data?.clinics) ? data.clinics : [];
        if (!cancelled) {
          setClinics(list);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load clinics.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="site-header">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center gap-2 rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent/70 hover:text-primary">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="h-6 w-px shrink-0 bg-border" />
            <div className="flex items-center space-x-2">
              <img src={eligioLogo} alt="Eligio AI" className="w-12 h-12 object-contain" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">Eligio AI</h1>
              <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
                •
              </span>
              <span className="hidden text-lg font-medium text-foreground sm:inline">Specialists List</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <RoleTabs />
          </div>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8 motion-safe:animate-fade-down">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-accent/75 px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.12em] text-primary transition-[border-color,background-color,box-shadow] duration-500 ease-smooth dark:border-primary/45 dark:bg-primary/12 dark:text-primary motion-safe:hover:shadow-md">
            <ClipboardList className="h-4 w-4" />
            Routing clinic directory (knowledge base)
          </div>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground">
            Specialists List
          </h1>
          <p className="mt-2 text-muted-foreground">
            {loading
              ? "Loading neurology subspecialty clinics from the server knowledge base…"
              : `${clinics.length} clinics used for referral routing and scheduler review.`}
          </p>
        </div>

        {loading ? (
          <div className="motion-safe:animate-subtle-zoom flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <Loader2 className="size-10 animate-spin text-primary motion-safe:text-primary/90 motion-safe:[animation-duration:980ms] motion-safe:[animation-timing-function:cubic-bezier(0.45,0.05,0.2,1)]" />
            <p className="text-sm motion-safe:text-foreground/80 motion-safe:[animation-duration:1.75s] motion-safe:animate-pulse">Loading clinics…</p>
          </div>
        ) : null}

        {error ? (
          <Card className="border border-destructive/40 bg-destructive/10 p-6 dark:border-destructive/35 dark:bg-destructive/15">
            <p className="font-medium text-destructive dark:text-red-300">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Card>
        ) : null}

        {!loading && !error ? (
          <div className="space-y-6">
            {clinics.map((clinic, index) => {
              const id = clinic.id || clinic.name;
              const providerCount = Array.isArray(clinic.providers) ? clinic.providers.length : 0;
              return (
                <Card
                  key={id}
                  className="motion-safe:hover:-translate-y-1 motion-safe:animate-fade-up border-border/80 border-l-[3px] border-l-primary bg-card p-6 shadow-[0_2px_28px_-12px_hsl(var(--foreground)/0.12)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-700 ease-smooth motion-safe:[animation-fill-mode:backwards] motion-safe:hover:shadow-[0_14px_44px_-18px_hsl(var(--foreground)/0.14)] motion-safe:active:transition-transform motion-safe:active:duration-150 motion-safe:active:ease-out"
                  style={{
                    animationDelay: `${Math.min(index * 52, 480)}ms`,
                  }}
                >
                  <details className="specialists-clinic group overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm open:border-primary/25 open:bg-muted/50 open:shadow-md dark:bg-muted/25 dark:open:bg-muted/40">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-4 py-4 marker:content-none outline-none transition-[background-color,transform] duration-500 ease-smooth motion-safe:active:scale-[0.997] hover:bg-muted/40 open:bg-muted/30 dark:hover:bg-muted/30 dark:open:bg-muted/25">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <ChevronDown
                          className="mt-0.5 size-5 shrink-0 text-muted-foreground transition-[transform,color] duration-500 ease-smooth group-open:rotate-180 group-open:text-primary"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground">{clinic.name}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{clinic.description}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Clinic ID: <span className="font-mono text-foreground/90">{clinic.id}</span>
                            {providerCount > 0
                              ? ` · ${providerCount} provider${providerCount === 1 ? "" : "s"} listed`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-border bg-muted/90 px-3 py-1.5 text-xs font-semibold tracking-tight text-foreground shadow-sm ring-1 ring-border/60 ease-smooth transition-[transform,background-color,border-color,color,box-shadow] duration-300 motion-safe:hover:bg-muted motion-safe:active:scale-[0.96] motion-safe:group-hover:scale-[1.02] group-open:scale-100 group-open:border-primary/50 group-open:bg-primary/15 group-open:text-primary group-open:ring-primary/25">
                        <span className="group-open:hidden">View details</span>
                        <span className="hidden group-open:inline">Hide details</span>
                      </span>
                    </summary>
                    <ClinicDetails clinic={clinic} />
                  </details>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
