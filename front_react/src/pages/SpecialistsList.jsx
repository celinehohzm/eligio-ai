import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Stethoscope,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RoleTabs from "@/components/RoleTabs";
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
    <div className="grid gap-4 border-t border-gray-200 bg-white px-4 py-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Stethoscope className="h-4 w-4 text-blue-600" />
            Clinic overview
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-700">{clinic.description}</p>
          {clinic.intake_requirements ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Intake requirements
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{clinic.intake_requirements}</p>
            </div>
          ) : null}
          {clinic.age_restrictions ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Age restrictions
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{clinic.age_restrictions}</p>
            </div>
          ) : null}
        </div>

        {conditions.length > 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">Conditions commonly seen</p>
            <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-sm text-gray-700">
              {conditions.map((c) => (
                <li key={c} className="rounded-md bg-slate-50 px-3 py-1.5">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {keySymptoms.length > 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">Key symptoms</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {keySymptoms.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-gray-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {urgencyFlags.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Urgency flags
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-950/90">
              {urgencyFlags.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {procedures.length > 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">Procedures / programs</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {procedures.map((p) => (
                <li key={p} className="rounded-md bg-slate-50 px-3 py-2">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Building2 className="h-4 w-4 text-blue-600" />
            Providers
          </div>
          {providers.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {providers.map((name) => (
                <li key={name} className="rounded-md bg-slate-50 px-3 py-2">
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No named providers in knowledge base.</p>
          )}
        </div>

        {doNotRoute.length > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50/60 p-4">
            <p className="text-sm font-semibold text-red-900">Do not route here</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-950/90">
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center space-x-2">
              <img src={eligioLogo} alt="Eligio AI" className="w-12 h-12 object-contain" />
              <h1 className="text-xl font-bold text-gray-900">Eligio AI</h1>
              <span className="hidden sm:inline text-gray-400">•</span>
              <span className="hidden sm:inline text-lg font-medium text-gray-700">Specialists List</span>
            </div>
          </div>
          <RoleTabs />
        </div>
      </header>

      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <ClipboardList className="h-4 w-4" />
            Routing clinic directory (knowledge base)
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Specialists List</h1>
          <p className="mt-2 text-muted-foreground">
            {loading
              ? "Loading neurology subspecialty clinics from the server knowledge base…"
              : `${clinics.length} clinics used for referral routing and scheduler review.`}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm">Loading clinics…</p>
          </div>
        ) : null}

        {error ? (
          <Card className="border border-red-200 bg-red-50/50 p-6">
            <p className="font-medium text-red-900">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Card>
        ) : null}

        {!loading && !error ? (
          <div className="space-y-6">
            {clinics.map((clinic) => {
              const id = clinic.id || clinic.name;
              const providerCount = Array.isArray(clinic.providers) ? clinic.providers.length : 0;
              return (
                <Card
                  key={id}
                  className="border border-gray-200 border-l-4 border-l-blue-600 bg-white p-6 shadow-md"
                >
                  <details className="group overflow-hidden rounded-xl border border-gray-200 bg-slate-50/60 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 marker:content-none">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900">{clinic.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{clinic.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Clinic ID: <span className="font-mono text-gray-700">{clinic.id}</span>
                          {providerCount > 0
                            ? ` · ${providerCount} provider${providerCount === 1 ? "" : "s"} listed`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition group-open:border-blue-300 group-open:bg-blue-100">
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
