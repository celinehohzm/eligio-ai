import { useEffect, useState } from "react";
import { Search, Trash2, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import apiService from "@/services/api";
import { toast } from "sonner";

const formatTimestamp = (value) => {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export default function Patients() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getReferrals(query);
        setPatients(response.items || []);
      } catch (error) {
        toast.error("Failed to load patients", {
          description: error.message || "Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query]);

  const handleDelete = async (patient) => {
    if (!patient?.id || deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${patient.fullName || "this patient"} from the database? This also removes the uploaded referral PDF.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(patient.id);

    try {
      await apiService.deleteReferral(patient.id);
      setPatients((previous) => previous.filter((item) => item.id !== patient.id));
      toast.success("Patient deleted", {
        description: `${patient.fullName || "The selected patient"} was removed from the database.`,
      });
    } catch (error) {
      toast.error("Failed to delete patient", {
        description: error.message || "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />

      <div className="idx-in mx-auto max-w-[1100px] px-4 py-9 sm:px-8">
        <div className="border-b border-line pb-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">Patients</span>
          <h1 className="mt-1.5 font-display text-4xl font-extrabold tracking-[-0.035em]">Patient database</h1>
          <p className="mt-2 max-w-2xl font-sans text-sm text-muted2">
            Every patient referral on file. Select a patient to review intake details, routing guidance, and the
            original referral packet.
          </p>
        </div>

        <div className="my-5 flex items-center gap-2.5 border border-line px-3 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patient, provider, or reason"
            className="h-auto border-0 px-0 py-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          {patients.length} patient{patients.length === 1 ? "" : "s"} in database
        </p>

        <div className="border border-line">
          {isLoading && (
            <p className="px-4 py-6 font-sans text-sm text-muted-foreground">Loading patients...</p>
          )}

          {!isLoading && patients.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
              <UserRound className="size-9 text-muted-foreground" />
              <p className="font-sans text-sm text-muted-foreground">No patients match your search.</p>
            </div>
          )}

          {!isLoading &&
            patients.map((patient) => {
              const isDeleting = deletingId === patient.id;
              return (
                <div
                  key={patient.id}
                  className="flex items-start gap-3 border-b border-hair px-4 py-4 last:border-b-0 hover:bg-paper"
                >
                  <Link to={`/patients/${patient.id}`} className="flex-1">
                    <p className="font-sans text-[15px] font-semibold text-ink hover:text-signal">
                      {patient.fullName}
                    </p>
                    <p className="mt-0.5 font-sans text-sm text-muted2">
                      {patient.doctorName || "No referring provider listed"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Uploaded {formatTimestamp(patient.submittedAt)}
                    </p>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(patient)}
                    disabled={isDeleting}
                    className="shrink-0 text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Delete ${patient.fullName}`}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">{isDeleting ? "Deleting patient" : `Delete ${patient.fullName}`}</span>
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
