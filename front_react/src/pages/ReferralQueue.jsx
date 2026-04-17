import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import eligioLogo from "@/assets/eligio-logo.png";
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

export default function ReferralQueue() {
  const [query, setQuery] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setIsLoadingList(true);
      try {
        const response = await apiService.getReferrals(query);
        const items = response.items || [];
        setReferrals(items);

        if (items.length === 0) {
          setSelectedId(null);
          setSelectedReferral(null);
          return;
        }

        const stillSelected = items.some((item) => item.id === selectedId);
        if (!stillSelected) {
          setSelectedId(items[0].id);
        }
      } catch (error) {
        toast.error("Failed to load referrals", {
          description: error.message || "Please try again.",
        });
      } finally {
        setIsLoadingList(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedReferral(null);
      return;
    }

    let isMounted = true;

    const loadReferral = async () => {
      setIsLoadingDetail(true);
      try {
        const response = await apiService.getReferral(selectedId);
        if (isMounted) {
          setSelectedReferral(response);
        }
      } catch (error) {
        if (isMounted) {
          toast.error("Failed to load referral details", {
            description: error.message || "Please try again.",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingDetail(false);
        }
      }
    };

    loadReferral();

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  const selectedMeta = useMemo(() => selectedReferral?.patientInfo || {}, [selectedReferral]);

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
              <span className="hidden sm:inline text-lg font-medium text-gray-700">Referral Search</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Scheduler Referral Search</h1>
          <p className="text-muted-foreground">
            Search uploaded referral packets and review the extracted intake summary.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <Card className="p-4 border border-gray-200 border-l-4 border-l-blue-600 shadow-md">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patient, referring doctor, or referral reason"
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[520px] pr-3">
              <div className="space-y-3">
                {isLoadingList && <p className="text-sm text-gray-500">Loading referrals...</p>}
                {!isLoadingList && referrals.length === 0 && (
                  <p className="text-sm text-gray-500">No referrals match your search.</p>
                )}
                {referrals.map((referral) => {
                  const isSelected = referral.id === selectedId;
                  return (
                    <button
                      key={referral.id}
                      type="button"
                      onClick={() => setSelectedId(referral.id)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{referral.fullName}</p>
                      <p className="mt-1 text-sm text-gray-600">{referral.doctorName || "No referring doctor listed"}</p>
                      <p className="mt-1 text-xs text-gray-500">Uploaded {formatTimestamp(referral.submittedAt)}</p>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          <Card className="p-6 border border-gray-200 border-l-4 border-l-blue-600 shadow-md min-h-[520px]">
            {!selectedId && !isLoadingList && (
              <div className="flex h-full items-center justify-center text-center text-gray-500">
                <div>
                  <UserRound className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                  <p>Select a patient referral to review the extracted summary.</p>
                </div>
              </div>
            )}

            {selectedId && isLoadingDetail && (
              <p className="text-sm text-gray-500">Loading referral details...</p>
            )}

            {selectedReferral && !isLoadingDetail && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{selectedMeta.fullName}</h2>
                  <p className="mt-1 text-sm text-gray-500">Referral uploaded {formatTimestamp(selectedReferral.submittedAt)}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date of Birth</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedMeta.dateOfBirth || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone Number</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedMeta.phoneNumber || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Referring Dr</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedMeta.doctorName || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reason for Referral</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedMeta.reasonForReferral || "Not provided"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Address</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedMeta.address || "Not provided"}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50 p-4 text-sm leading-7 text-gray-900 border border-blue-100">
                  {selectedReferral.summaryLine}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
