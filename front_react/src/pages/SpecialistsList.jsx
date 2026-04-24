import { ArrowLeft, Building2, ClipboardList, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import RoleTabs from "@/components/RoleTabs";
import eligioLogo from "@/assets/eligio-logo.png";
import { SPECIALISTS, getSpecialistDirectoryGroups } from "@/lib/specialists";

export default function SpecialistsList() {
  const specialistGroups = getSpecialistDirectoryGroups();

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
            Receiving Provider and Scheduler Directory
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Specialists List</h1>
          <p className="mt-2 text-muted-foreground">
            {SPECIALISTS.length} specialists grouped by specialty area for receiving provider and scheduler review.
          </p>
        </div>

        <div className="space-y-6">
          {specialistGroups.map((group) => (
            <Card
              key={group.groupLabel}
              className="border border-gray-200 border-l-4 border-l-blue-600 bg-white p-6 shadow-md"
            >
              <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{group.groupLabel}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {group.specialists.length} specialist{group.specialists.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {group.specialists.map((specialist) => (
                  <details
                    key={specialist.rawName}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-slate-50/60 shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 marker:content-none">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900">{specialist.displayName}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {specialist.subspecialty}
                          {specialist.clinic ? ` · ${specialist.clinic}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition group-open:border-blue-300 group-open:bg-blue-100">
                        <span className="group-open:hidden">View profile</span>
                        <span className="hidden group-open:inline">Hide profile</span>
                      </span>
                    </summary>

                    <div className="grid gap-4 border-t border-gray-200 bg-white px-4 py-4 lg:grid-cols-[1.4fr_1fr]">
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <Stethoscope className="h-4 w-4 text-blue-600" />
                          Background
                        </div>
                        <p className="mt-3 text-sm leading-6 text-gray-700">{specialist.backgroundSummary}</p>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          Centers and Institutes
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-gray-700">
                          {specialist.centersAndInstitutes.map((center) => (
                            <li key={`${specialist.rawName}-${center}`} className="rounded-md bg-slate-50 px-3 py-2">
                              {center}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
