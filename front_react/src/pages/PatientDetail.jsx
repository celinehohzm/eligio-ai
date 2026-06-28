import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  Flag,
  HelpCircle,
  Send,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { Mark } from "@/components/Logo";
import { Textarea } from "@/components/ui/textarea";
import StatusPill, { STATUS_TONE_CLASSES } from "@/components/StatusPill";
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

const formatContextLine = (label, value, fallback = "Not provided") =>
  `${label}: ${String(value || "").trim() || fallback}`;

const ROUTING_KB_EXPLANATION = [
  "Recommended clinic, rationale, alternatives, urgency, and providers are generated on the server from the same sources as automated routing: the Hopkins clinic catalog (clinics.json) and routing guidelines (routing_rules.md).",
  "When AI routing runs, the model is instructed to use only clinic IDs, names, exclusions, and provider lists from the clinic catalog and to apply routing_rules.md; provider names are normalized to that clinic's JSON provider list.",
  "When AI routing is off or fails, the server uses a clinics.json phrase overlap heuristic instead; staff should apply routing_rules.md manually in those cases.",
  "This is decision support only; it does not check live availability, panel closure, or insurance participation.",
];

const KEYWORD_DISPLAY_OVERRIDES = {
  als: "ALS",
  tia: "TIA",
  avm: "AVM",
  csf: "CSF",
  tbi: "TBI",
};

const TRIAGE_HIGHLIGHT_FIELDS = [
  { key: "chiefComplaint", label: "Chief Complaint" },
  { key: "historyOfPresentIllness", label: "History of Present Illness" },
  { key: "physicalExam", label: "Physical Exam" },
  { key: "imagingResults", label: "Imaging Results" },
  { key: "labResults", label: "Lab Results" },
  { key: "otherProviders", label: "Other Providers" },
];

const CONFIDENCE_TONE = { high: "success", medium: "warning", low: "danger" };
const URGENCY_TONE = { emergent: "warning", emergency: "danger" };

const cleanValue = (value) => String(value || "").trim();
const formatDisplayValue = (value, fallback = "Not identified in the uploaded document.") =>
  cleanValue(value) || fallback;

const formatOtherProvidersCardValue = (value, fallback = "Not identified in the uploaded document.") => {
  const raw = cleanValue(value);
  if (!raw) {
    return fallback;
  }
  const normalized = raw.replace(/\s*;\s*/g, "\n");
  const parts = normalized.split("\n").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return fallback;
  }
  return parts.join("\n");
};

/** Hopkins catalog names are often "LAST, FIRST MIDDLE" in ALL CAPS — normalize for display. */
const formatKbProviderDisplayName = (raw) => {
  const s = cleanValue(raw);
  if (!s) return s;

  const stripTrailingPunct = (w) => {
    let end = "";
    let core = w;
    while (core.length > 1 && ".,".includes(core.slice(-1))) {
      end = core.slice(-1) + end;
      core = core.slice(0, -1);
    }
    return { core, end };
  };

  const formatToken = (token) => {
    const t = token.trim();
    if (!t) return t;

    const { core, end } = stripTrailingPunct(t);
    const u = core.toUpperCase();
    if (u === "JR") return "Jr." + end.replace(/^\./, "");
    if (u === "SR") return "Sr." + end.replace(/^\./, "");
    if (/^[IVX]{1,4}$/.test(u)) return u + end;
    if (u.length === 1) return u + end;

    const capPart = (part) =>
      part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part;

    const out = core
      .split("-")
      .map((segment) => segment.split("'").map(capPart).join("'"))
      .join("-");
    return out + end;
  };

  const commaIdx = s.indexOf(",");
  if (commaIdx !== -1) {
    const last = s.slice(0, commaIdx).trim().split(/\s+/).map(formatToken).join(" ");
    const rest = s.slice(commaIdx + 1).trim().split(/\s+/).map(formatToken).join(" ");
    return `${last}, ${rest}`;
  }

  return s.split(/\s+/).map(formatToken).join(" ");
};

const condenseChiefComplaint = (raw) => {
  const cleaned = cleanValue(raw);
  if (!cleaned) return "";
  const firstSegment = cleaned.split(
    /(?:\s\bplan\b\s*[:.-]|\s\breason\b\s*[:.-]|\s\bevaluation\b\s*[:.-]|\s\bassessment\b\s*[:.-]|[.;])/i,
  )[0];
  const stripped = firstSegment
    .replace(/^["“'?\s-]+/, "")
    .replace(/["”'?\s-]+$/, "")
    .trim();
  if (!stripped) return "";
  const words = stripped.split(/\s+/);
  const truncated = words.length > 24 ? `${words.slice(0, 24).join(" ")}…` : stripped;
  return truncated.charAt(0).toLowerCase() + truncated.slice(1);
};

const normalizeChiefComplaintInput = (value) => {
  const stripDoubleQuotes = (text) => String(text ?? "").replace(/["“”]/g, "").trim();

  if (Array.isArray(value)) {
    const parts = value
      .map((item) =>
        stripDoubleQuotes(
          cleanValue(item)
            .replace(/^["“'?\s-]+/, "")
            .replace(/["”'?\s-]+$/, "")
            .trim(),
        ),
      )
      .filter(Boolean);
    return parts.join("; ");
  }

  return stripDoubleQuotes(value);
};

const formatChiefComplaintCardValue = (raw, fallback = "Not identified in the uploaded document.") => {
  const normalized = normalizeChiefComplaintInput(raw);
  const condensed = condenseChiefComplaint(normalized);
  if (!condensed) return fallback;
  return condensed.charAt(0).toUpperCase() + condensed.slice(1);
};

const buildReferralChatContext = (referral) => {
  const patientInfo = referral?.patientInfo || {};
  const referralInsights = referral?.referralInsights || {};
  const triageHighlights = referral?.triageHighlights || {};

  return [
    "You are assisting a scheduler reviewing a referral packet.",
    "Answer follow-up questions using the referral details below.",
    formatContextLine("Patient", patientInfo.fullName),
    formatContextLine("Date of birth", patientInfo.dateOfBirth),
    formatContextLine("Phone number", patientInfo.phoneNumber),
    formatContextLine("Address", patientInfo.address),
    formatContextLine("Insurance", patientInfo.insurance),
    formatContextLine("Medical record number", patientInfo.medicalRecordNumber),
    formatContextLine("Referring provider", patientInfo.doctorName),
    formatContextLine("Reason for referral", patientInfo.reasonForReferral),
    formatContextLine("Chief complaint", triageHighlights.chiefComplaint || referralInsights.chiefComplaint),
    formatContextLine("History of present illness", triageHighlights.historyOfPresentIllness),
    formatContextLine("Physical exam", triageHighlights.physicalExam),
    formatContextLine("Imaging results", triageHighlights.imagingResults),
    formatContextLine("Lab results", triageHighlights.labResults),
    formatContextLine("Other providers", triageHighlights.otherProviders),
    formatContextLine("Evaluation", referralInsights.evaluation),
    formatContextLine("Diagnosis", referralInsights.diagnosis),
    formatContextLine("Referral summary", referral?.summaryLine),
  ].join("\n");
};

export default function PatientDetail() {
  const { id } = useParams();
  const [referral, setReferral] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isLoadingPdfPreview, setIsLoadingPdfPreview] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadReferral = async () => {
      setIsLoadingDetail(true);
      try {
        const response = await apiService.getReferral(id);
        if (isMounted) {
          setReferral(response);
        }
      } catch (error) {
        if (isMounted) {
          toast.error("Failed to load patient details", {
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
  }, [id]);

  const selectedMeta = useMemo(() => referral?.patientInfo || {}, [referral]);
  const selectedTriageHighlights = useMemo(() => referral?.triageHighlights || {}, [referral]);
  const routingRecommendation = useMemo(() => referral?.routingRecommendation || null, [referral]);
  const kbRecommendedProviders = useMemo(() => {
    const raw = routingRecommendation?.recommendedProviders;
    return Array.isArray(raw) ? raw.filter((name) => String(name || "").trim()) : [];
  }, [routingRecommendation]);

  const intakeRequirementsCheck = routingRecommendation?.intakeRequirementsCheck;
  const intakeCheckItemsSorted = useMemo(() => {
    const items = intakeRequirementsCheck?.items;
    if (!Array.isArray(items)) {
      return [];
    }
    const rank = (f) => {
      if (f === false) return 0;
      if (f === true) return 2;
      return 1;
    };
    return [...items].sort((a, b) => rank(a?.fulfilled) - rank(b?.fulfilled));
  }, [intakeRequirementsCheck]);

  const hasIntakeCheckPanel =
    !!intakeRequirementsCheck &&
    (intakeCheckItemsSorted.length > 0 ||
      cleanValue(intakeRequirementsCheck.scopeSummary) ||
      (Array.isArray(intakeRequirementsCheck.excludedPolicyPoints) &&
        intakeRequirementsCheck.excludedPolicyPoints.length > 0));

  const demographicItems = useMemo(
    () => [
      { label: "Name", value: formatDisplayValue(selectedMeta.fullName, "Not provided") },
      { label: "Date of Birth", value: formatDisplayValue(selectedMeta.dateOfBirth, "Not provided") },
      { label: "Phone Number", value: formatDisplayValue(selectedMeta.phoneNumber, "Not provided") },
      { label: "Address", value: formatDisplayValue(selectedMeta.address, "Not provided") },
      { label: "Insurance", value: formatDisplayValue(selectedMeta.insurance) },
      {
        label: "Medical Record Number (MRN)",
        value: formatDisplayValue(selectedMeta.medicalRecordNumber),
      },
    ],
    [selectedMeta],
  );

  const selectedReferralDocument = useMemo(() => {
    const documents = referral?.documents || [];
    return (
      documents.find((document) => {
        const candidateName = document.originalName || document.filename || "";
        return candidateName.toLowerCase().endsWith(".pdf");
      }) || null
    );
  }, [referral]);

  const triageHighlightCards = useMemo(
    () =>
      TRIAGE_HIGHLIGHT_FIELDS.map((field) => ({
        ...field,
        value:
          field.key === "chiefComplaint"
            ? formatChiefComplaintCardValue(
                selectedTriageHighlights[field.key] || selectedMeta.reasonForReferral,
              )
            : field.key === "otherProviders"
              ? formatOtherProvidersCardValue(selectedTriageHighlights[field.key])
              : formatDisplayValue(selectedTriageHighlights[field.key]),
      })),
    [selectedMeta.reasonForReferral, selectedTriageHighlights],
  );

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    setPdfPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return null;
    });
    setPdfPreviewError(null);

    if (!referral?.id || !selectedReferralDocument?.id) {
      setIsLoadingPdfPreview(false);
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }

    const loadPdfPreview = async () => {
      setIsLoadingPdfPreview(true);
      try {
        const pdfBlob = await apiService.getReferralDocumentContent(referral.id, selectedReferralDocument.id);
        if (!isMounted) {
          return;
        }

        objectUrl = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(objectUrl);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPdfPreviewError(error.message || "Failed to load the referral PDF preview.");
      } finally {
        if (isMounted) {
          setIsLoadingPdfPreview(false);
        }
      }
    };

    loadPdfPreview();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [referral, selectedReferralDocument]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSendingChat]);

  const handleChatSubmit = async (event) => {
    event.preventDefault();

    const trimmedInput = chatInput.trim();
    if (!referral || !trimmedInput || isSendingChat) {
      return;
    }

    const userMessage = { role: "user", content: trimmedInput };
    const apiMessage = {
      role: "user",
      content: `${buildReferralChatContext(referral)}\n\nScheduler question: ${trimmedInput}`,
    };

    const visibleMessages = chatMessages;
    setChatMessages((previous) => [...previous, userMessage]);
    setChatInput("");
    setChatError(null);
    setIsSendingChat(true);

    try {
      const response = await apiService.streamChatMessage(
        [...visibleMessages, apiMessage],
        (_chunk, fullContent) => {
          setChatMessages((previous) => {
            const updatedMessages = [...previous];
            if (
              updatedMessages.length === 0 ||
              updatedMessages[updatedMessages.length - 1].role !== "assistant"
            ) {
              updatedMessages.push({ role: "assistant", content: fullContent });
            } else {
              updatedMessages[updatedMessages.length - 1] = {
                role: "assistant",
                content: fullContent,
              };
            }
            return updatedMessages;
          });
        },
      );

      if (response?.content) {
        setChatMessages((previous) => {
          if (previous.length > 0 && previous[previous.length - 1].role === "assistant") {
            return previous;
          }
          return [...previous, { role: "assistant", content: response.content }];
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      setChatError(errorMessage);
      toast.error("Failed to send chat message", {
        description: errorMessage,
      });
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleChatKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleChatSubmit(event);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />

      <div className="idx-in mx-auto max-w-[1600px] px-4 py-9 sm:px-8">
        <Link
          to="/patients"
          className="mb-5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Back to patients
        </Link>

        {isLoadingDetail && <p className="font-sans text-sm text-muted-foreground">Loading patient details...</p>}

        {!isLoadingDetail && !referral && (
          <p className="font-sans text-sm text-muted-foreground">Patient not found.</p>
        )}

        {referral && !isLoadingDetail && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),360px]">
            <div className="min-w-0 space-y-7">
              <div>
                <h1 className="font-display text-3xl font-extrabold tracking-[-0.025em]">{selectedMeta.fullName}</h1>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  Referral uploaded {formatTimestamp(referral.submittedAt)}
                </p>
              </div>

              <div className="border border-line">
                <div className="flex items-start gap-3 border-b border-line bg-strong px-5 py-3.5 text-on-strong">
                  <ClipboardList className="mt-0.5 size-4 shrink-0 text-signal" />
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.16em]">Demographic data</h3>
                    <p className="mt-1 font-sans text-xs text-faint">
                      Scheduler-facing patient details pulled from structured intake data and the uploaded referral packet.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 border-b border-line sm:grid-cols-2">
                  <div className="border-line p-4 sm:border-r">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Referring provider</p>
                    <p className="mt-2 font-sans text-sm leading-6 text-ink">
                      {formatDisplayValue(selectedMeta.doctorName, "Not provided")}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Reason for referral</p>
                    <p className="mt-2 font-sans text-sm leading-6 text-ink">
                      {formatDisplayValue(selectedMeta.reasonForReferral, "Not provided")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {demographicItems.map((item, i) => (
                    <div
                      key={item.label}
                      className={`p-4 ${i % 3 !== 2 ? "sm:border-r sm:border-line" : ""} ${i < demographicItems.length - (demographicItems.length % 3 || 3) ? "border-b border-line" : ""}`}
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-2 font-sans text-sm leading-6 text-ink">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-line">
                <div className="flex items-start gap-3 border-b border-line bg-strong px-5 py-3.5 text-on-strong">
                  <ClipboardList className="mt-0.5 size-4 shrink-0 text-signal" />
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.16em]">Routing recommendation</h3>
                    <p className="mt-1 font-sans text-xs text-faint">
                      Clinic, rationale, and providers are grounded in the server knowledge base (clinic catalog JSON and routing guidelines markdown).
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  {routingRecommendation?.escalateForReview && (
                    <div className="mb-5 flex items-start gap-3 border border-warning p-4">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-warning">Physician review recommended</p>
                        <p className="mt-1.5 font-sans text-sm text-ink">
                          {formatDisplayValue(routingRecommendation?.escalationReason, "Routing confidence is low.")}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-0 border border-line xl:grid-cols-[300px,minmax(0,1fr)]">
                    <div className="border-line p-5 xl:border-r">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Recommended clinic
                      </p>
                      <p className="mt-3 font-display text-2xl font-extrabold tracking-[-0.02em]">
                        {formatDisplayValue(routingRecommendation?.recommendedClinic)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusPill
                          tone={CONFIDENCE_TONE[routingRecommendation?.confidenceLevel] || "danger"}
                          label={`${String(routingRecommendation?.confidenceLevel || "low")} confidence`}
                        />
                        {routingRecommendation?.urgency &&
                          routingRecommendation.urgency !== "routine" && (
                            <StatusPill
                              tone={URGENCY_TONE[routingRecommendation.urgency] || "danger"}
                              label={routingRecommendation.urgency}
                            />
                          )}
                      </div>
                    </div>

                    <div className="border-t border-line p-4 xl:border-t-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Recommendation rationale
                      </p>
                      <p className="mt-3 font-sans text-sm leading-7 text-ink">
                        {formatDisplayValue(routingRecommendation?.rationale)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-0 border border-line lg:grid-cols-2">
                    <div className="border-line p-4 lg:border-r">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Alternative clinics</p>
                      {(routingRecommendation?.alternativeClinics || []).length > 0 ? (
                        <ul className="mt-3 space-y-2 font-sans text-sm text-muted2">
                          {(routingRecommendation?.alternativeClinics || []).map((clinic, index) => (
                            <li key={`${clinic?.id || clinic?.name || index}`}>
                              <span className="font-medium text-ink">
                                {clinic?.name || "Unknown clinic"}
                              </span>
                              {clinic?.reason ? ` - ${clinic.reason}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 font-sans text-sm text-muted-foreground">No alternatives provided.</p>
                      )}
                    </div>
                    <div className="border-t border-line p-4 lg:border-t-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Recommended providers</p>
                      {kbRecommendedProviders.length > 0 ? (
                        <ul className="mt-3 list-none space-y-2 border-l-2 border-signal pl-4">
                          {kbRecommendedProviders.map((name) => (
                            <li key={name} className="font-sans text-sm leading-relaxed text-ink">
                              {formatKbProviderDisplayName(name)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 font-sans text-sm text-muted-foreground">
                          No providers listed for this clinic in the catalog, or routing did not return provider names.
                        </p>
                      )}
                    </div>
                  </div>

                  {hasIntakeCheckPanel ? (
                    <div className="mt-5 border border-line p-5">
                      <div className="flex items-start gap-3">
                        <Flag className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
                            Case-scoped intake checklist
                          </p>
                          <p className="mt-1.5 font-sans text-xs text-muted-foreground">
                            Only intake rules that apply to this referral’s clinical context are listed; the model compares them to OCR text and structured triage fields.
                          </p>
                          {cleanValue(intakeRequirementsCheck?.scopeSummary) ? (
                            <p className="mt-3 border border-hair px-4 py-3 font-sans text-sm leading-6 text-ink">
                              <span className="font-semibold text-signal">Scope: </span>
                              {intakeRequirementsCheck.scopeSummary}
                            </p>
                          ) : null}
                          {intakeRequirementsCheck?.evaluationUnavailable &&
                          cleanValue(intakeRequirementsCheck?.evaluationNote) ? (
                            <p className="mt-3 border border-warning px-4 py-3 font-sans text-xs leading-5 text-ink">
                              {intakeRequirementsCheck.evaluationNote}
                            </p>
                          ) : null}
                          {intakeCheckItemsSorted.length > 0 ? (
                            <ul className="mt-4 space-y-3">
                              {intakeCheckItemsSorted.map((item, idx) => {
                                const ok = item.fulfilled === true;
                                const missing = item.fulfilled === false;
                                return (
                                  <li
                                    key={`${idx}-${item.requirement?.slice(0, 48) ?? idx}`}
                                    className={`border px-3 py-3 font-sans text-sm leading-relaxed ${
                                      STATUS_TONE_CLASSES[missing ? "danger" : ok ? "success" : "warning"]
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {missing ? (
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                                      ) : ok ? (
                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                                      ) : (
                                        <HelpCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-medium text-ink">{item.requirement}</p>
                                        {cleanValue(item.notes) ? (
                                          <p className="mt-1 text-xs leading-5 text-muted2">{item.notes}</p>
                                        ) : null}
                                        {missing ? (
                                          <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-destructive">
                                            Missing or unclear in packet
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="mt-4 font-sans text-sm text-muted2">
                              No checklist rows apply to this referral after case scoping (see omitted policy notes below if present).
                            </p>
                          )}
                          {Array.isArray(intakeRequirementsCheck?.excludedPolicyPoints) &&
                          intakeRequirementsCheck.excludedPolicyPoints.length > 0 ? (
                            <div className="mt-4 border border-hair p-4">
                              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                Clinic policy not applied to this case
                              </p>
                              <ul className="mt-2 space-y-3">
                                {intakeRequirementsCheck.excludedPolicyPoints.map((row, i) => (
                                  <li
                                    key={`exc-${i}-${row.excerpt?.slice(0, 24) ?? i}`}
                                    className="font-sans text-xs leading-5 text-muted2"
                                  >
                                    {cleanValue(row.excerpt) ? (
                                      <p className="font-medium text-ink">{row.excerpt}</p>
                                    ) : null}
                                    {cleanValue(row.reason) ? (
                                      <p className="mt-0.5 text-muted-foreground">{row.reason}</p>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <h4 className="font-display text-base font-extrabold tracking-[-0.01em]">Triage highlights</h4>
                    <p className="mt-1 font-sans text-sm text-muted2">
                      These summaries come from the uploaded referral document and are meant to speed up intake review.
                    </p>

                    <div className="mt-4 grid grid-cols-1 border border-line lg:grid-cols-2">
                      {triageHighlightCards.map((item, i) => (
                        <div
                          key={item.key}
                          className={`p-4 ${i % 2 === 0 ? "lg:border-r lg:border-line" : ""} ${i < triageHighlightCards.length - (triageHighlightCards.length % 2 || 2) ? "border-b border-line" : ""}`}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                          <p className="mt-2 whitespace-pre-line font-sans text-sm leading-6 text-ink">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-line">
                <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Original referral PDF</h3>
                    <p className="mt-1 font-sans text-sm text-muted2">
                      Scroll through the original uploaded referral packet without leaving this page.
                    </p>
                  </div>

                  {pdfPreviewUrl && selectedReferralDocument && (
                    <a
                      href={pdfPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 font-mono text-xs uppercase tracking-[0.1em] text-signal"
                    >
                      Open full PDF
                    </a>
                  )}
                </div>

                <div className="p-5">
                  {isLoadingPdfPreview && (
                    <div className="flex h-[720px] items-center justify-center border-2 border-dashed border-line font-sans text-sm text-muted-foreground">
                      Loading original PDF...
                    </div>
                  )}

                  {!isLoadingPdfPreview && pdfPreviewError && (
                    <div className="flex h-[720px] items-center justify-center border border-destructive px-4 text-center font-sans text-sm text-destructive">
                      {pdfPreviewError}
                    </div>
                  )}

                  {!isLoadingPdfPreview && !pdfPreviewError && !selectedReferralDocument && (
                    <div className="flex h-[720px] items-center justify-center border-2 border-dashed border-line px-4 text-center font-sans text-sm text-muted-foreground">
                      No referral PDF is attached to this record yet.
                    </div>
                  )}

                  {!isLoadingPdfPreview && !pdfPreviewError && pdfPreviewUrl && (
                    <div className="border border-line">
                      <div className="flex items-center gap-2 border-b border-line px-4 py-3 font-sans text-sm text-muted-foreground">
                        <FileText className="size-4 text-signal" />
                        <span className="truncate">
                          {selectedReferralDocument?.originalName || selectedReferralDocument?.filename || "Referral PDF"}
                        </span>
                      </div>
                      <iframe
                        title={`Referral PDF preview for ${selectedMeta.fullName || "selected patient"}`}
                        src={pdfPreviewUrl}
                        className="h-[720px] w-full bg-surface"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-line p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">How routing recommendations are sourced</p>
                <div className="mt-2 space-y-2 font-sans text-sm leading-6 text-muted2">
                  {ROUTING_KB_EXPLANATION.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 self-start border border-line lg:sticky lg:top-[76px]">
              <div className="border-b border-line px-4 py-4 sm:px-5">
                <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">Patient triage chat</h3>
                <p className="mt-1 font-sans text-sm text-muted2">
                  Ask follow-up questions, look for a specific detail in the referral, or clarify something in the packet.
                </p>
              </div>

              <div className="px-4 py-4 sm:px-5">
                <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                  {chatMessages.length === 0 && !isSendingChat && (
                    <div className="border border-dashed border-line px-4 py-6 font-sans text-sm text-muted-foreground">
                      Ask a question to open a triage chat for this patient.
                    </div>
                  )}

                  {chatMessages.map((message, index) =>
                    message.role === "user" ? (
                      <div key={index} className="flex justify-end">
                        <div className="max-w-[90%] bg-strong px-3.5 py-3 font-sans text-sm leading-6 text-on-strong">
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="max-w-[92%]">
                        <div className="mb-1.5 flex items-center gap-2">
                          <Mark className="size-3.5" strokeWidth={2.4} />
                          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Eligio · triage</span>
                        </div>
                        <p className="font-sans text-sm leading-6 text-ink">{message.content}</p>
                      </div>
                    ),
                  )}

                  {isSendingChat && (
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Analyzing<span className="idx-blink text-signal">···</span>
                    </div>
                  )}

                  {chatError && (
                    <div className="border border-destructive px-4 py-3 font-sans text-sm text-destructive">
                      {chatError}
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="mt-4 border-t border-line pt-4">
                  <Textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Ask a follow-up question about this referral..."
                    className="min-h-[112px] resize-none border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isSendingChat}
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      Uses this patient's referral as context
                    </p>
                    <Button type="submit" size="sm" className="gap-2" disabled={!chatInput.trim() || isSendingChat}>
                      Send
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
