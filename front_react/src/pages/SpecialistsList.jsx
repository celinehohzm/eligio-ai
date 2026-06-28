import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, Loader2, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import UrgencyTag from "@/components/UrgencyTag";
import apiService from "@/services/api";

function ClinicDetails({ clinic }) {
  const conditions = Array.isArray(clinic.conditions) ? clinic.conditions : [];
  const keySymptoms = Array.isArray(clinic.key_symptoms) ? clinic.key_symptoms : [];
  const urgencyFlags = Array.isArray(clinic.urgency_flags) ? clinic.urgency_flags : [];
  const procedures = Array.isArray(clinic.procedures) ? clinic.procedures : [];
  const providers = Array.isArray(clinic.providers) ? clinic.providers : [];
  const doNotRoute = Array.isArray(clinic.do_not_route_here) ? clinic.do_not_route_here : [];

  return (
    <div className="specialists-clinic-panel grid gap-5 border-t border-line bg-surface px-3 py-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Stethoscope className="size-3.5 text-signal" />
            Clinic overview
          </div>
          <p className="mt-2.5 font-sans text-sm leading-[1.6] text-muted2">{clinic.description}</p>
          {clinic.intake_requirements ? (
            <div className="mt-3.5 border-t border-hair pt-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Intake requirements</p>
              <p className="mt-1.5 font-sans text-sm leading-[1.55] text-ink">{clinic.intake_requirements}</p>
            </div>
          ) : null}
          {clinic.age_restrictions ? (
            <div className="mt-3.5 border-t border-hair pt-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Age restrictions</p>
              <p className="mt-1.5 font-sans text-sm leading-[1.55] text-ink">{clinic.age_restrictions}</p>
            </div>
          ) : null}
        </div>

        {conditions.length > 0 ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Conditions commonly seen</p>
            <p className="mt-2 font-sans text-sm leading-[1.6] text-ink">{conditions.join(", ")}</p>
          </div>
        ) : null}

        {keySymptoms.length > 0 ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Key symptoms</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {keySymptoms.map((s) => (
                <span key={s} className="border border-line px-2.5 py-1 font-mono text-[11px] text-ink">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {urgencyFlags.length > 0 ? (
          <div className="border border-warning p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-warning">Urgency flags</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-sm leading-[1.5] text-ink">
              {urgencyFlags.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {procedures.length > 0 ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Procedures / programs</p>
            <p className="mt-2 font-sans text-sm leading-[1.6] text-ink">{procedures.join(", ")}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Building2 className="size-3.5 text-signal" />
            Providers
          </div>
          {providers.length > 0 ? (
            <ul className="mt-2.5 space-y-1.5 font-sans text-sm text-ink">
              {providers.map((name) => (
                <li key={name} className="border-b border-hair pb-1.5">{name}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 font-sans text-sm text-muted-foreground">No named providers in knowledge base.</p>
          )}
        </div>

        {doNotRoute.length > 0 ? (
          <div className="border border-destructive p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-destructive">Do not route here</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-sm leading-[1.5] text-ink">
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
  const [query, setQuery] = useState("");

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

  const filteredClinics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter((clinic) => {
      const haystack = [
        clinic.name,
        clinic.description,
        ...(Array.isArray(clinic.conditions) ? clinic.conditions : []),
        ...(Array.isArray(clinic.key_symptoms) ? clinic.key_symptoms : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clinics, query]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <div className="idx-in mx-auto max-w-[1280px] px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-5 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">06 — Knowledge base</span>
            <h1 className="mt-1.5 font-display text-4xl font-extrabold tracking-[-0.035em]">Specialist index</h1>
            <p className="mt-2 font-sans text-sm text-muted2">
              {loading ? "Loading subspecialty clinics from the server knowledge base…" : `${clinics.length} clinics used for referral routing and scheduler review.`}
            </p>
          </div>
          <div className="flex min-w-[300px] items-center gap-2.5 border border-line px-4 py-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conditions, symptoms, clinics…"
              className="w-full border-0 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-signal" />
            <p className="font-sans text-sm">Loading clinics…</p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-7 border border-destructive p-6">
            <p className="font-sans font-medium text-destructive">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="border-t border-line">
            {filteredClinics.map((clinic) => {
              const id = clinic.id || clinic.name;
              const providerCount = Array.isArray(clinic.providers) ? clinic.providers.length : 0;
              const hasUrgencyFlags = Array.isArray(clinic.urgency_flags) && clinic.urgency_flags.length > 0;
              return (
                <details key={id} className="specialists-clinic group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 px-3 py-6 outline-none hover:bg-paper marker:content-none">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[11px] text-signal">{clinic.id}</div>
                      <div className="mt-1.5 font-display text-xl font-extrabold tracking-[-0.02em]">{clinic.name}</div>
                      <p className="mt-1.5 line-clamp-2 font-sans text-sm text-muted2">{clinic.description}</p>
                      {providerCount > 0 ? (
                        <p className="mt-2 font-mono text-xs text-muted-foreground">
                          {providerCount} provider{providerCount === 1 ? "" : "s"} listed
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {hasUrgencyFlags ? <UrgencyTag tone="review" label="Needs intake" /> : null}
                      <ChevronDown className="size-4 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                    </div>
                  </summary>
                  <ClinicDetails clinic={clinic} />
                </details>
              );
            })}
            {filteredClinics.length === 0 ? (
              <div className="py-14 text-center font-sans text-sm text-muted-foreground">No clinics match your search.</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
