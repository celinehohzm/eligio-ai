import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardList, FileText, Search, Send, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import RoleTabs from "@/components/RoleTabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import eligioLogo from "@/assets/eligio-logo.png";
import apiService from "@/services/api";
import { getSpecialistMatches, getSpecialistScoreExplanation } from "@/lib/specialists";
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

const REQUIRED_ACTIONS = [
  "If the patient does not have a chart yet, create one before moving the call forward.",
  "If the issue can be resolved during the call, do that before escalating or rerouting.",
  "Ask probing questions to fill missing intake details before scheduling or sending the patient onward.",
];

const HARD_STOPS = [
  {
    title: "International patients",
    detail: "Pause normal scheduling and route through the international-patient workflow.",
  },
  {
    title: "Non-participating insurances",
    detail: "Verify plan participation before booking. If the plan is not accepted, discuss self-pay instead of scheduling normally.",
  },
  {
    title: "Patient in the incorrect department",
    detail: "Do not book until Neurology vs Neurosurgery has been clarified.",
  },
];

const NEUROLOGY_KEYWORDS = [
  "neurology",
  "migraine",
  "headache",
  "seizure",
  "epilepsy",
  "stroke",
  "multiple sclerosis",
  "ms",
  "neuropathy",
  "parkinson",
  "tremor",
  "memory",
  "movement disorder",
  "dizziness",
];

const NEUROSURGERY_KEYWORDS = [
  "neurosurgery",
  "spine",
  "spinal",
  "aneurysm",
  "brain tumor",
  "tumor",
  "hydrocephalus",
  "shunt",
  "chiari",
  "disc",
  "radiculopathy",
  "surgery",
  "surgical",
];

const PMR_KEYWORDS = [
  "physical medicine",
  "physical medicine and rehabilitation",
  "pm&r",
  "pmr",
  "physiatry",
  "physiatrist",
  "rehabilitation",
  "rehab",
  "spasticity",
  "concussion",
  "brain injury",
];

const TRIAGE_HIGHLIGHT_FIELDS = [
  {
    key: "chiefComplaint",
    label: "Chief Complaint",
    description: "Summary from the uploaded document that identifies the primary chief complaint.",
  },
  {
    key: "historyOfPresentIllness",
    label: "History of Present Illness",
    description:
      "Summary from the uploaded document that provides a concise chronological history of the medical condition behind the referral.",
  },
  {
    key: "physicalExam",
    label: "Physical Exam",
    description:
      "Key physical exam findings from the packet, including pertinent positives or negatives for neurological conditions.",
  },
  {
    key: "imagingResults",
    label: "Imaging Results",
    description:
      "Imaging ordered in the packet, if any, and the most important findings from the study.",
  },
  {
    key: "labResults",
    label: "Lab Results",
    description:
      "Positive or negative laboratory findings that appear relevant to neurological evaluation.",
  },
  {
    key: "otherProviders",
    label: "Other Providers",
    description:
      "Current treating clinicians, what they are seeing the patient for, and any additional referrals mentioned in the packet.",
  },
];

const cleanValue = (value) => String(value || "").trim();
const formatDisplayValue = (value, fallback = "Not identified in the uploaded document.") =>
  cleanValue(value) || fallback;

const buildReferralCorpus = (referral) => {
  const patientInfo = referral?.patientInfo || {};
  const referralInsights = referral?.referralInsights || {};
  const triageHighlights = referral?.triageHighlights || {};

  return [
    patientInfo.reasonForReferral,
    patientInfo.insurance,
    referralInsights.chiefComplaint,
    referralInsights.evaluation,
    referralInsights.diagnosis,
    triageHighlights.chiefComplaint,
    triageHighlights.historyOfPresentIllness,
    triageHighlights.physicalExam,
    triageHighlights.imagingResults,
    triageHighlights.labResults,
    triageHighlights.otherProviders,
    referral?.summaryLine,
  ]
    .map(cleanValue)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

const getKeywordHits = (corpus, keywords) => keywords.filter((keyword) => corpus.includes(keyword));

const formatKeywordLabel = (keyword) =>
  keyword
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const inferDepartmentGuidance = (referral) => {
  const corpus = buildReferralCorpus(referral);
  const neurologyHits = getKeywordHits(corpus, NEUROLOGY_KEYWORDS);
  const neurosurgeryHits = getKeywordHits(corpus, NEUROSURGERY_KEYWORDS);
  const pmrHits = getKeywordHits(corpus, PMR_KEYWORDS);
  const departmentSignals = [
    { label: "Neurology", hits: neurologyHits },
    { label: "Neurosurgery", hits: neurosurgeryHits },
    { label: "Physical Medicine and Rehabilitation", hits: pmrHits },
  ].sort((left, right) => right.hits.length - left.hits.length);

  if (departmentSignals[0].hits.length === 0) {
    return {
      label: "Needs clarification",
      status: "Needs confirmation",
      detail: "The referral summary does not clearly identify the correct department yet.",
      value: "Clarify the intended department before routing.",
    };
  }

  if (
    departmentSignals[0].hits.length > 0 &&
    departmentSignals[0].hits.length === departmentSignals[1].hits.length
  ) {
    return {
      label: "Needs clarification",
      status: "Needs confirmation",
      detail: "The packet contains mixed specialty signals, so the scheduler should confirm the correct department on the call.",
      value: "Mixed specialty cues in the current referral packet.",
    };
  }

  const label = departmentSignals[0].label;
  const strongestHit = departmentSignals[0].hits[0];

  return {
    label,
    status: "Review",
    detail: `The current packet leans toward ${label} because it references ${formatKeywordLabel(strongestHit)}. Confirm that routing on the call.`,
    value: `Likely ${label}, based on the current referral summary.`,
  };
};

const buildSchedulerProtocol = (referral) => {
  if (!referral) {
    return {
      routeGuidance: inferDepartmentGuidance(null),
      requiredInfo: [],
      probingQuestions: [],
      actionHighlights: [],
    };
  }

  const patientInfo = referral.patientInfo || {};
  const referralInsights = referral.referralInsights || {};
  const triageHighlights = referral.triageHighlights || {};
  const routeGuidance = inferDepartmentGuidance(referral);
  const primaryReason =
    cleanValue(triageHighlights.chiefComplaint) ||
    cleanValue(patientInfo.reasonForReferral) ||
    cleanValue(referralInsights.chiefComplaint) ||
    "Ask the caller to state the main reason for the visit.";
  const callbackNumber =
    cleanValue(patientInfo.phoneNumber) || "No callback number is captured in the referral packet.";

  const requiredInfo = [
    {
      label: "Requestor / point of contact name",
      status: "Needs confirmation",
      value: "Not captured in the current referral packet. Confirm who is calling.",
    },
    {
      label: "Requestor phone number",
      status: "Needs confirmation",
      value: "Confirm the caller's direct callback number, even if the patient number is already on file.",
    },
    {
      label: "Relationship to the patient",
      status: "Needs confirmation",
      value: "Clarify whether the caller is the patient, a family member, or a referring office.",
    },
    {
      label: "Patient name",
      status: cleanValue(patientInfo.fullName) ? "Collected" : "Needs confirmation",
      value: cleanValue(patientInfo.fullName) || "Missing from the referral packet.",
    },
    {
      label: "Date of birth",
      status: cleanValue(patientInfo.dateOfBirth) ? "Collected" : "Needs confirmation",
      value: cleanValue(patientInfo.dateOfBirth) || "Missing from the referral packet.",
    },
    {
      label: "Insurance",
      status: cleanValue(patientInfo.insurance) ? "Collected" : "Needs confirmation",
      value:
        cleanValue(patientInfo.insurance) ||
        "No insurance details are stored on this referral. Verify participation before scheduling.",
    },
    {
      label: "Neurology vs Neurosurgery",
      status: routeGuidance.status,
      value: routeGuidance.value,
    },
    {
      label: "Primary reason for visit",
      status:
        cleanValue(patientInfo.reasonForReferral) || cleanValue(referralInsights.chiefComplaint)
          ? "Collected"
          : "Needs confirmation",
      value: primaryReason,
    },
    {
      label: "New or return visit",
      status: "Needs confirmation",
      value: "This is not captured yet. Confirm whether the patient is new to the practice or returning.",
    },
    {
      label: "Interpreter needed",
      status: "Needs confirmation",
      value: "Ask whether an interpreter is needed and document the language.",
    },
    {
      label: "Self-pay preference",
      status: "Needs confirmation",
      value: "If insurance is out of network, ask whether the patient wants a self-pay option.",
    },
    {
      label: "Additional details from the patient",
      status: "Review",
      value: "Clinical packet details are available, but you should still ask if the caller wants anything else documented.",
    },
  ];

  const actionHighlights = [];
  if (!cleanValue(patientInfo.fullName) || !cleanValue(patientInfo.dateOfBirth)) {
    actionHighlights.push("Collect the missing patient identifiers so a chart can be created immediately.");
  }
  if (!cleanValue(patientInfo.doctorName)) {
    actionHighlights.push("Confirm the referring provider or office before the patient is routed.");
  }
  if (!cleanValue(patientInfo.reasonForReferral) && !cleanValue(referralInsights.chiefComplaint)) {
    actionHighlights.push("Do not route until the primary reason for visit has been clearly stated.");
  }
  if (!cleanValue(patientInfo.address)) {
    actionHighlights.push("Confirm the patient's location so international cases can be screened correctly.");
  }
  actionHighlights.push("Verify insurance participation before any booking decision is made.");

  const probingQuestions = [
    "Does the patient already have a chart with our team, or do we need to create one now?",
    "Who is calling today, what is the best callback number, and what is your relationship to the patient?",
    `What is the main reason for the visit, and is this meant for Neurology, Neurosurgery, or Physical Medicine and Rehabilitation?`,
    "Is this a new patient visit or a return visit?",
    "What insurance plan does the patient have, and has it been confirmed as participating?",
    "Does the patient need an interpreter, and if so which language?",
    "If the plan is not participating, would the patient like self-pay information?",
    `Are there any changes since the referral was sent, especially around ${primaryReason.toLowerCase()}?`,
  ];

  if (cleanValue(referralInsights.evaluation) || cleanValue(referralInsights.diagnosis)) {
    probingQuestions.push(
      "Has the patient already completed imaging, testing, or hospital evaluation related to this referral?"
    );
  }

  if (callbackNumber !== "No callback number is captured in the referral packet.") {
    probingQuestions.push(
      `I have ${callbackNumber} on file for the patient. Is there a better callback number for the current requestor?`
    );
  }

  return {
    routeGuidance,
    requiredInfo,
    probingQuestions: [...new Set(probingQuestions)].slice(0, 6),
    actionHighlights,
  };
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

export default function ReferralQueue() {
  const [query, setQuery] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [patientListMode, setPatientListMode] = useState("default");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [chatSessions, setChatSessions] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isLoadingPdfPreview, setIsLoadingPdfPreview] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState(null);
  const chatEndRef = useRef(null);
  const isPatientDatabaseHidden = patientListMode === "hidden";

  let layoutGridClassName = "grid gap-6 lg:grid-cols-[320px,minmax(0,1fr),360px]";
  if (isPatientDatabaseHidden) {
    layoutGridClassName = "grid gap-6 lg:grid-cols-[minmax(0,1fr),360px]";
  }

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
  const selectedTriageHighlights = useMemo(
    () => selectedReferral?.triageHighlights || {},
    [selectedReferral],
  );
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
  const specialistMatches = useMemo(() => getSpecialistMatches(selectedReferral, 3), [selectedReferral]);
  const specialistScoreExplanation = useMemo(() => getSpecialistScoreExplanation(), []);
  const schedulerProtocol = useMemo(
    () => buildSchedulerProtocol(selectedReferral),
    [selectedReferral],
  );
  const selectedReferralDocument = useMemo(() => {
    const documents = selectedReferral?.documents || [];
    return (
      documents.find((document) => {
        const candidateName = document.originalName || document.filename || "";
        return candidateName.toLowerCase().endsWith(".pdf");
      }) || null
    );
  }, [selectedReferral]);
  const selectedChatMessages = useMemo(
    () => (selectedId ? chatSessions[selectedId] || [] : []),
    [chatSessions, selectedId],
  );
  const triageHighlightCards = useMemo(
    () =>
      TRIAGE_HIGHLIGHT_FIELDS.map((field) => ({
        ...field,
        value:
          field.key === "chiefComplaint"
            ? formatDisplayValue(
                selectedTriageHighlights[field.key] || selectedMeta.reasonForReferral,
              )
            : formatDisplayValue(selectedTriageHighlights[field.key]),
      })),
    [selectedMeta.reasonForReferral, selectedTriageHighlights],
  );

  useEffect(() => {
    setChatInput("");
    setChatError(null);
  }, [selectedId]);

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

    if (!selectedReferral?.id || !selectedReferralDocument?.id) {
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
        const pdfBlob = await apiService.getReferralDocumentContent(
          selectedReferral.id,
          selectedReferralDocument.id,
        );
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
  }, [selectedReferral, selectedReferralDocument]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatMessages, isSendingChat, selectedId]);

  const handleChatSubmit = async (event) => {
    event.preventDefault();

    const trimmedInput = chatInput.trim();
    if (!selectedReferral || !trimmedInput || isSendingChat) {
      return;
    }

    const referralId = selectedReferral.id;
    const visibleMessages = chatSessions[referralId] || [];
    const userMessage = { role: "user", content: trimmedInput };
    const apiMessage = {
      role: "user",
      content: `${buildReferralChatContext(selectedReferral)}\n\nScheduler question: ${trimmedInput}`,
    };

    setChatSessions((previous) => ({
      ...previous,
      [referralId]: [...visibleMessages, userMessage],
    }));
    setChatInput("");
    setChatError(null);
    setIsSendingChat(true);

    try {
      const response = await apiService.streamChatMessage(
        [...visibleMessages, apiMessage],
        (_chunk, fullContent) => {
          setChatSessions((previous) => {
            const currentMessages = previous[referralId] || [];
            const updatedMessages = [...currentMessages];

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

            return {
              ...previous,
              [referralId]: updatedMessages,
            };
          });
        },
      );

      if (response?.content) {
        setChatSessions((previous) => {
          const currentMessages = previous[referralId] || [];
          if (
            currentMessages.length > 0 &&
            currentMessages[currentMessages.length - 1].role === "assistant"
          ) {
            return previous;
          }

          return {
            ...previous,
            [referralId]: [...currentMessages, { role: "assistant", content: response.content }],
          };
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
          <RoleTabs />
        </div>
      </header>

      <div className="container mx-auto py-8 px-4 max-w-[1600px]">
        <div className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Receiving Provider and Scheduler Referral Search</h1>
              <p className="text-muted-foreground">
                Search uploaded referral packets, review the extracted intake summary, and see suggested specialists.
              </p>
            </div>

            <Link
              to="/specialists-list"
              className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              Open Specialists List
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {isPatientDatabaseHidden ? (
            <Button
              type="button"
              variant="outline"
              className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
              onClick={() => setPatientListMode("default")}
            >
              Show patient database
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="text-gray-600 hover:bg-white hover:text-blue-700"
              onClick={() => setPatientListMode("hidden")}
            >
              Hide patient database
            </Button>
          )}
        </div>

        <div className={layoutGridClassName}>
          {!isPatientDatabaseHidden && (
            <Card className="min-w-0 self-start border border-gray-200 border-l-4 border-l-blue-600 p-4 shadow-md lg:sticky lg:top-24">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Patient database</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {referrals.length} referral{referrals.length === 1 ? "" : "s"} in the current queue.
                  </p>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search patient, referring provider, or referral reason"
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
                        <p className="mt-1 text-sm text-gray-600">
                          {referral.doctorName || "No referring provider listed"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Uploaded {formatTimestamp(referral.submittedAt)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          )}

          <Card className="min-w-0 border border-gray-200 border-l-4 border-l-blue-600 p-6 shadow-md min-h-[520px]">
            {!selectedId && !isLoadingList && (
              <div className="flex h-full items-center justify-center text-center text-gray-500">
                <div>
                  <UserRound className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                  <p>Select a patient referral to review demographics, routing guidance, and the original PDF.</p>
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
                  <p className="mt-1 text-sm text-gray-500">
                    Referral uploaded {formatTimestamp(selectedReferral.submittedAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="mt-0.5 h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Demographic Data</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Scheduler-facing patient details pulled from structured intake data and the uploaded referral packet.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Referring Provider
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-900">
                        {formatDisplayValue(selectedMeta.doctorName, "Not provided")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Reason for Referral
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-900">
                        {formatDisplayValue(selectedMeta.reasonForReferral, "Not provided")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {demographicItems.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-gray-200 bg-slate-50 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="mt-0.5 h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Routing Guidance</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Recommended department routing plus the key clinical highlights extracted from the uploaded packet.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[300px,minmax(0,1fr)]">
                    <div
                      className={`rounded-xl border p-5 ${
                        schedulerProtocol.routeGuidance.label === "Needs clarification"
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                        Recommended Department
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-gray-900">
                        {schedulerProtocol.routeGuidance.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {schedulerProtocol.routeGuidance.detail}
                      </p>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-gray-900">
                      {selectedReferral.summaryLine}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">Triage Highlights</h4>
                        <p className="mt-1 text-sm text-gray-500">
                          These summaries come from the uploaded referral document and are meant to speed up intake review.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {triageHighlightCards.map((item) => (
                        <div
                          key={item.key}
                          className="rounded-xl border border-gray-200 bg-slate-50 p-4"
                        >
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">{item.description}</p>
                          <p className="mt-3 text-sm leading-6 text-gray-700">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Original referral PDF</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Scroll through the original uploaded referral packet without leaving the queue.
                      </p>
                    </div>

                    {pdfPreviewUrl && selectedReferralDocument && (
                      <a
                        href={pdfPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Open full PDF
                      </a>
                    )}
                  </div>

                  <div className="mt-4">
                    {isLoadingPdfPreview && (
                      <div className="flex h-[720px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                        Loading original PDF...
                      </div>
                    )}

                    {!isLoadingPdfPreview && pdfPreviewError && (
                      <div className="flex h-[720px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-center text-sm text-red-600">
                        {pdfPreviewError}
                      </div>
                    )}

                    {!isLoadingPdfPreview && !pdfPreviewError && !selectedReferralDocument && (
                      <div className="flex h-[720px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-500">
                        No referral PDF is attached to this record yet.
                      </div>
                    )}

                    {!isLoadingPdfPreview && !pdfPreviewError && pdfPreviewUrl && (
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="truncate">
                            {selectedReferralDocument?.originalName || selectedReferralDocument?.filename || "Referral PDF"}
                          </span>
                        </div>
                        <iframe
                          title={`Referral PDF preview for ${selectedMeta.fullName || "selected patient"}`}
                          src={pdfPreviewUrl}
                          className="h-[720px] w-full bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Recommended Specialists</h3>
                      <p className="text-sm text-gray-500">
                        The top three specialist matches based on referral content, age fit, and department alignment.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {specialistMatches.map((match) => (
                      <div
                        key={match.id}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-gray-900">{match.displayName}</p>
                            <p className="mt-1 text-sm font-medium text-blue-700">
                              {match.subspecialty}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">{match.clinic}</p>
                            <p className="mt-1 text-sm leading-6 text-gray-600">{match.rationale}</p>
                          </div>
                          <div className="inline-flex w-fit items-center rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
                            {match.score}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">How the match percentages are determined</p>
                    <div className="mt-2 space-y-2 text-sm leading-6 text-gray-600">
                      {specialistScoreExplanation.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="min-w-0 self-start border border-gray-200 border-l-4 border-l-blue-600 shadow-md lg:sticky lg:top-24">
            <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
              <h3 className="text-lg font-semibold text-gray-900">Patient triage chat</h3>
              <p className="mt-1 text-sm text-gray-500">
                Ask follow-up questions, look for a specific detail in the referral, or clarify something in the packet.
              </p>
            </div>

            <div className="px-4 py-4 sm:px-5">
              {selectedId && isLoadingDetail ? (
                <p className="text-sm text-gray-500">Loading chat context...</p>
              ) : (
                <>
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {!selectedReferral && !isSendingChat && (
                      <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 px-4 py-6 text-sm text-gray-600">
                        Pick a referral from the patient database to open a dedicated triage chat panel.
                      </div>
                    )}

                    {selectedChatMessages.map((message, index) => (
                      <div
                        key={`${selectedId}-${index}`}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-6 shadow-sm ${
                            message.role === "user"
                              ? "bg-blue-600 text-white"
                              : "border border-gray-200 bg-gray-50 text-gray-800"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}

                    {isSendingChat && (
                      <div className="flex justify-start">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 shadow-sm">
                          Analyzing referral details...
                        </div>
                      </div>
                    )}

                    {chatError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {chatError}
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleChatSubmit} className="mt-4 space-y-3">
                    <Textarea
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      onKeyDown={handleChatKeyDown}
                      placeholder="Ask a follow-up question about this referral..."
                      className="min-h-[112px] resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      disabled={!selectedReferral || isSendingChat}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        Uses the selected referral details as context.
                      </p>
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!selectedReferral || !chatInput.trim() || isSendingChat}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
