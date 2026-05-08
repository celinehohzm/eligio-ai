import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardList, FileText, Search, Send, Trash2, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import RoleTabs from "@/components/RoleTabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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

const ROUTING_KB_EXPLANATION = [
  "Recommended clinic, rationale, alternatives, urgency, and providers are generated on the server from the same sources as automated routing: the Hopkins clinic catalog (clinics.json) and routing guidelines (routing_rules.md).",
  "When AI routing runs, the model is instructed to use only clinic IDs, names, exclusions, and provider lists from the clinic catalog and to apply routing_rules.md; provider names are normalized to that clinic's JSON provider list.",
  "When AI routing is off or fails, the server uses a clinics.json phrase overlap heuristic instead; staff should apply routing_rules.md manually in those cases.",
  "This is decision support only; it does not check live availability, panel closure, or insurance participation.",
];

// Keyword groups are organized by clinical sub-area so the routing rationale can
// surface *why* a packet leans a certain way (e.g. "headache disorders" vs
// "neuromuscular disease") instead of a single keyword. The literal department
// names ("neurology", "neurosurgery", "physical medicine and rehabilitation")
// are intentionally excluded — every Johns Hopkins Neurology fax references the
// department in its header and would otherwise produce circular reasoning.
//
// Keep these mirrored 1:1 with NEUROLOGY_KEYWORD_GROUPS / NEUROSURGERY_KEYWORD_GROUPS
// / PMR_KEYWORD_GROUPS in backend_flask/scripts/check_routing_logic.py, which
// runs the same scoring against every mock PDF for regression checks.
const NEUROLOGY_KEYWORD_GROUPS = [
  { category: "headache disorders", keywords: ["migraine", "headache", "cephalalgia"] },
  { category: "seizure or epilepsy", keywords: ["seizure", "epilepsy", "convulsion"] },
  {
    category: "cerebrovascular concerns",
    keywords: ["stroke", "tia", "transient ischemic attack"],
  },
  { category: "demyelinating disease", keywords: ["multiple sclerosis", "demyelinating"] },
  {
    category: "movement disorders",
    keywords: ["parkinson", "tremor", "dystonia", "movement disorder"],
  },
  {
    category: "cognitive concerns",
    keywords: ["memory loss", "cognitive decline", "dementia"],
  },
  {
    category: "neuromuscular disease",
    keywords: [
      "neuropathy",
      "myopathy",
      "motor neuron disease",
      "als",
      "myasthenia",
      "muscular dystrophy",
    ],
  },
  {
    category: "neuralgia or neuropathic pain",
    keywords: ["trigeminal neuralgia", "neuralgia"],
  },
  { category: "vestibular symptoms", keywords: ["dizziness", "vertigo"] },
];

const NEUROSURGERY_KEYWORD_GROUPS = [
  {
    category: "spine pathology",
    keywords: [
      "spinal stenosis",
      "lumbar stenosis",
      "cervical stenosis",
      "disc herniation",
      "radiculopathy",
      "myelopathy",
      "cord compression",
    ],
  },
  {
    category: "neurovascular surgical lesions",
    keywords: [
      "aneurysm",
      "avm",
      "arteriovenous malformation",
      "cavernoma",
      "subarachnoid hemorrhage",
      "intracerebral hemorrhage",
    ],
  },
  {
    category: "neuro-oncology",
    keywords: [
      "brain tumor",
      "brain mass",
      "intracranial mass",
      "intracranial lesion",
      "extra-axial mass",
      "extra-axial lesion",
      "glioma",
      "meningioma",
      "pituitary mass",
      "pituitary tumor",
      "metastasis",
    ],
  },
  {
    category: "CSF disorders",
    keywords: ["hydrocephalus", "shunt", "chiari", "normal pressure hydrocephalus"],
  },
  {
    category: "surgical evaluation",
    keywords: [
      "surgical resection",
      "decompression",
      "craniotomy",
      "subdural hematoma",
      "epidural hematoma",
    ],
  },
];

const PMR_KEYWORD_GROUPS = [
  {
    category: "rehabilitation services",
    keywords: [
      "rehabilitation",
      "rehab",
      "physiatry",
      "physiatrist",
      "neurorehabilitation",
    ],
  },
  { category: "spasticity or tone management", keywords: ["spasticity", "baclofen pump"] },
  {
    category: "concussion or TBI",
    keywords: ["concussion", "traumatic brain injury", "post-concussive"],
  },
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

const cleanValue = (value) => String(value || "").trim();
const formatDisplayValue = (value, fallback = "Not identified in the uploaded document.") =>
  cleanValue(value) || fallback;

/** Same presentation as Lab Results: one provider per line (API may use \n or ';'). */
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

const escapeForRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchesKeyword = (corpus, keyword) => {
  const pattern = new RegExp(`\\b${escapeForRegex(keyword)}\\b`, "i");
  return pattern.test(corpus);
};

const formatKeywordLabel = (keyword) => {
  const lower = keyword.toLowerCase();
  if (KEYWORD_DISPLAY_OVERRIDES[lower]) {
    return KEYWORD_DISPLAY_OVERRIDES[lower];
  }
  return lower
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatKeywordList = (keywords) => keywords.map(formatKeywordLabel).join(", ");

const joinPhrases = (phrases) => {
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0];
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}`;
};

const collectDepartmentSignal = (corpus, label, groups) => {
  const matchedGroups = groups
    .map((group) => ({
      category: group.category,
      keywords: group.keywords.filter((keyword) => matchesKeyword(corpus, keyword)),
    }))
    .filter((group) => group.keywords.length > 0);

  const totalHits = matchedGroups.reduce((sum, group) => sum + group.keywords.length, 0);
  return { label, matchedGroups, totalHits };
};

const formatSignalGroups = (matchedGroups) =>
  joinPhrases(
    matchedGroups.map((group) => `${group.category} (${formatKeywordList(group.keywords)})`),
  );

const inferDepartmentGuidance = (referral) => {
  const corpus = buildReferralCorpus(referral);
  const departmentSignals = [
    collectDepartmentSignal(corpus, "Neurology", NEUROLOGY_KEYWORD_GROUPS),
    collectDepartmentSignal(corpus, "Neurosurgery", NEUROSURGERY_KEYWORD_GROUPS),
    collectDepartmentSignal(
      corpus,
      "Physical Medicine and Rehabilitation",
      PMR_KEYWORD_GROUPS,
    ),
  ].sort((left, right) => right.totalHits - left.totalHits);

  const leader = departmentSignals[0];
  const runnerUp = departmentSignals[1];

  if (!leader || leader.totalHits === 0) {
    return {
      label: "Needs clarification",
      status: "Needs confirmation",
      detail:
        "No specialty-specific clinical signals were detected in the packet, so the correct department is not yet clear.",
      value: "Clarify the intended department before routing.",
      departmentSignals,
    };
  }

  if (runnerUp && leader.totalHits === runnerUp.totalHits) {
    return {
      label: "Needs clarification",
      status: "Needs confirmation",
      detail:
        `The packet contains balanced signals for ${leader.label} (${formatSignalGroups(leader.matchedGroups)}) ` +
        `and ${runnerUp.label} (${formatSignalGroups(runnerUp.matchedGroups)}). ` +
        "Confirm the correct department on the call before scheduling.",
      value: `Mixed signals between ${leader.label} and ${runnerUp.label}.`,
      departmentSignals,
    };
  }

  const competing = departmentSignals.slice(1).filter((signal) => signal.totalHits > 0);
  const leaderSummary = formatSignalGroups(leader.matchedGroups);

  let detail = `The packet leans toward ${leader.label} based on ${leaderSummary}.`;
  if (competing.length > 0) {
    const competingSummary = competing
      .map((signal) => `${signal.label} (${formatSignalGroups(signal.matchedGroups)})`)
      .join("; ");
    detail += ` Lower-priority signals also reference ${competingSummary}, so confirm the right department on the call before routing.`;
  } else {
    detail +=
      " No competing Neurosurgery or PM&R signals were detected in the packet — confirm the routing on the call.";
  }

  return {
    label: leader.label,
    status: "Review",
    detail,
    value: `Likely ${leader.label} based on ${leaderSummary}.`,
    departmentSignals,
  };
};

const computeAgeFromDateOfBirth = (dateOfBirth) => {
  const cleaned = cleanValue(dateOfBirth);
  if (!cleaned) return null;
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDelta = now.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
};

const formatProvider = (doctorName) => {
  const cleaned = cleanValue(doctorName);
  if (!cleaned) return null;
  if (/^dr\.?\s/i.test(cleaned)) return cleaned;
  return `Dr. ${cleaned}`;
};

const condenseChiefComplaint = (raw) => {
  const cleaned = cleanValue(raw);
  if (!cleaned) return "";
  // The heuristic extractor sometimes glues the chief complaint together with
  // the next labeled section; trim at the first sentence break or section
  // header so the case summary stays one tidy clause instead of a paragraph.
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
  // Some extractors return an array of quoted snippets; coerce them into a
  // single string before running the condensing heuristic.
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
  // `condenseChiefComplaint` lowercases the first letter to fit the sentence
  // template used in `buildCaseSummary`; for the card we want sentence casing.
  return condensed.charAt(0).toUpperCase() + condensed.slice(1);
};

const buildCaseSummary = (referral, routeGuidance) => {
  if (!referral) {
    return "Select a referral to see a synthesized case summary.";
  }

  const patientInfo = referral.patientInfo || {};
  const triageHighlights = referral.triageHighlights || {};
  const referralInsights = referral.referralInsights || {};

  const fullName = cleanValue(patientInfo.fullName);
  const age = computeAgeFromDateOfBirth(patientInfo.dateOfBirth);
  const provider = formatProvider(patientInfo.doctorName);
  const concern = condenseChiefComplaint(
    triageHighlights.chiefComplaint ||
      referralInsights.chiefComplaint ||
      patientInfo.reasonForReferral,
  );

  const subjectParts = [];
  if (age != null) {
    subjectParts.push(`${age}-year-old patient`);
  } else {
    subjectParts.push("Patient");
  }
  if (fullName) {
    subjectParts[0] = `${subjectParts[0]} ${fullName}`;
  }

  let sentenceOne = subjectParts.join("");
  sentenceOne = sentenceOne.charAt(0).toUpperCase() + sentenceOne.slice(1);
  if (provider) {
    sentenceOne += ` was referred by ${provider}`;
  }
  if (concern) {
    sentenceOne += `${provider ? " for " : " presenting with "}${concern}`;
  }
  sentenceOne += ".";

  let sentenceTwo = "";
  const signals = routeGuidance?.departmentSignals || [];
  const positive = signals.filter((signal) => signal.totalHits > 0);

  if (routeGuidance?.label === "Needs clarification") {
    if (positive.length > 1) {
      const labels = joinPhrases(positive.map((signal) => signal.label));
      sentenceTwo = `Packet contains balanced clinical cues across ${labels}; the scheduler should confirm the intended department on the call.`;
    } else {
      sentenceTwo =
        "Packet does not yet contain specialty-specific clinical cues, so the scheduler should confirm the intended department before routing.";
    }
  } else if (positive.length > 0) {
    const leader = positive[0];
    const subAreaPhrase = joinPhrases(leader.matchedGroups.map((group) => group.category));
    sentenceTwo = `Clinical content aligns with ${leader.label}, primarily covering ${subAreaPhrase}`;
    const others = positive.slice(1);
    if (others.length > 0) {
      const competingPhrase = joinPhrases(others.map((signal) => signal.label));
      sentenceTwo += `; lower-priority cues also point to ${competingPhrase}, so verify routing on the call`;
    }
    sentenceTwo += ".";
  }

  return [sentenceOne, sentenceTwo].filter(Boolean).join(" ");
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
  const [deletingReferralId, setDeletingReferralId] = useState(null);
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
  const routingRecommendation = useMemo(
    () => selectedReferral?.routingRecommendation || null,
    [selectedReferral],
  );
  const kbRecommendedProviders = useMemo(() => {
    const raw = routingRecommendation?.recommendedProviders;
    return Array.isArray(raw) ? raw.filter((name) => String(name || "").trim()) : [];
  }, [routingRecommendation]);

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

  const handleDeleteReferral = async (referral) => {
    if (!referral?.id || deletingReferralId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${referral.fullName || "this patient referral"} from the database? This also removes the uploaded referral PDF.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingReferralId(referral.id);

    try {
      await apiService.deleteReferral(referral.id);

      const nextReferrals = referrals.filter((item) => item.id !== referral.id);
      setReferrals(nextReferrals);
      if (selectedId === referral.id) {
        setSelectedId(nextReferrals[0]?.id || null);
        setSelectedReferral(null);
      }
      setChatSessions((previous) => {
        if (!previous[referral.id]) {
          return previous;
        }

        const nextSessions = { ...previous };
        delete nextSessions[referral.id];
        return nextSessions;
      });

      toast.success("Referral deleted", {
        description: `${referral.fullName || "The selected patient"} was removed from the queue.`,
      });
    } catch (error) {
      toast.error("Failed to delete referral", {
        description: error.message || "Please try again.",
      });
    } finally {
      setDeletingReferralId(null);
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
                    const isDeleting = deletingReferralId === referral.id;
                    return (
                      <div
                        key={referral.id}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(referral.id)}
                            className="flex-1 text-left"
                            disabled={isDeleting}
                          >
                            <p className="font-semibold text-gray-900">{referral.fullName}</p>
                            <p className="mt-1 text-sm text-gray-600">
                              {referral.doctorName || "No referring provider listed"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Uploaded {formatTimestamp(referral.submittedAt)}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteReferral(referral)}
                            disabled={isDeleting}
                            className="inline-flex shrink-0 items-center rounded-md border border-red-200 bg-white px-2.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Delete ${referral.fullName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">
                              {isDeleting ? "Deleting referral" : `Delete ${referral.fullName}`}
                            </span>
                          </button>
                        </div>
                      </div>
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
                      <h3 className="text-lg font-semibold text-gray-900">Routing Recommendation</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Clinic, rationale, and providers are grounded in the server knowledge base (clinic catalog JSON and routing guidelines markdown).
                      </p>
                    </div>
                  </div>

                  {routingRecommendation?.escalateForReview && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">Physician review recommended</p>
                      <p className="mt-1 text-sm text-amber-800">
                        {formatDisplayValue(routingRecommendation?.escalationReason, "Routing confidence is low.")}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 grid gap-4 xl:grid-cols-[300px,minmax(0,1fr)]">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                        Recommended Clinic
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-gray-900">
                        {formatDisplayValue(routingRecommendation?.recommendedClinic)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                            routingRecommendation?.confidenceLevel === "high"
                              ? "bg-emerald-100 text-emerald-700"
                              : routingRecommendation?.confidenceLevel === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {String(routingRecommendation?.confidenceLevel || "low")} confidence
                        </span>
                        {routingRecommendation?.urgency &&
                          routingRecommendation.urgency !== "routine" && (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                                routingRecommendation.urgency === "emergent"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {routingRecommendation.urgency}
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                        Recommendation Rationale
                      </p>
                      <p className="mt-3 text-sm leading-7 text-gray-900">
                        {formatDisplayValue(routingRecommendation?.rationale)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-gray-900">Alternative Clinics</p>
                      {(routingRecommendation?.alternativeClinics || []).length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-gray-700">
                          {(routingRecommendation?.alternativeClinics || []).map((clinic, index) => (
                            <li key={`${clinic?.id || clinic?.name || index}`}>
                              <span className="font-medium text-gray-900">
                                {clinic?.name || "Unknown clinic"}
                              </span>
                              {clinic?.reason ? ` - ${clinic.reason}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-gray-600">No alternatives provided.</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-gray-900">Recommended providers</p>
                      {kbRecommendedProviders.length > 0 ? (
                        <ul className="mt-3 list-none space-y-2 border-l-2 border-blue-200 pl-4">
                          {kbRecommendedProviders.map((name) => (
                            <li key={name} className="text-sm leading-relaxed text-gray-800">
                              {formatKbProviderDisplayName(name)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-gray-600">
                          No providers listed for this clinic in the catalog, or routing did not return provider names.
                        </p>
                      )}
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
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{item.value}</p>
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

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">How routing recommendations are sourced</p>
                  <div className="mt-2 space-y-2 text-sm leading-6 text-gray-600">
                    {ROUTING_KB_EXPLANATION.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
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
