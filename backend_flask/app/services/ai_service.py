from openai import OpenAI
from config.config import Config
import ast
import logging
import json
import re


class AIServiceInitError(RuntimeError):
    """Raised when OpenAI is configured but the client could not be initialized."""


class AIService:
    """Service for handling AI interactions"""

    def __init__(self):
        self.client = None
        self.model = Config.OPENAI_MODEL
        self._initialize_client()

    def _initialize_client(self):
        """Initialize OpenAI client safely"""
        if Config.OPENAI_API_KEY:
            try:
                # Temporarily clear proxy environment variables that might interfere
                import os
                original_env = {}
                proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']

                for var in proxy_vars:
                    if var in os.environ:
                        original_env[var] = os.environ[var]
                        del os.environ[var]

                try:
                    self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
                finally:
                    # Restore original environment
                    for var, value in original_env.items():
                        os.environ[var] = value

            except Exception as e:
                logging.error(f"Failed to initialize OpenAI client in AIService: {str(e)}")
                self.client = None

    def is_openai_configured(self):
        return bool(Config.OPENAI_API_KEY)

    def generate_chat_response(self, messages, stream=False):
        """Generate AI response for chat messages."""
        if not self.is_openai_configured():
            return self._generate_mock_response(messages)

        if not self.client:
            raise AIServiceInitError(
                "OpenAI client initialization failed. Check the configured API key and deployment settings."
            )

        # Add system prompt if not present
        if messages[0].get('role') != 'system':
            system_prompt = self._get_system_prompt()
            messages = [system_prompt] + messages

        params = {
            'model': self.model,
            'messages': messages,
            'temperature': 0.7,
        }

        if stream:
            params['stream'] = True
            return self.client.chat.completions.create(**params)

        params['max_tokens'] = 1000
        response = self.client.chat.completions.create(**params)
        return response.choices[0].message.content

    def extract_referral_summary(self, text_content, reason_for_referral=None):
        """Extract chief complaint, evaluation, and diagnosis from a referral packet."""
        normalized_text = (text_content or "").strip()
        if not normalized_text:
            return self._heuristic_referral_summary("", reason_for_referral)

        if not self.is_openai_configured() or not self.client:
            return self._heuristic_referral_summary(normalized_text, reason_for_referral)

        try:
            truncated_text = normalized_text[:15000]
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content":
                        """
                            You extract structured intake information from medical referral packets.
                            Return strict JSON with exactly these keys:
                            - chiefComplaint
                            - evaluation
                            - diagnosis
                            Use null if a field is not stated. Do not invent details.
                        """
                    },
                    {
                        "role": "user",
                        "content":
                        f"""
                        Reason for referral: {reason_for_referral or 'Not provided'}

                        Referral packet text:
                        {truncated_text}
                        """
                    }
                ],
                temperature=0.1,
                max_tokens=400,
            )

            content = response.choices[0].message.content or "{}"
            parsed = self._parse_json_object(content)
            return self._normalize_referral_summary(parsed, reason_for_referral)
        except Exception as exc:
            logging.warning("Falling back to heuristic referral extraction: %s", exc)
            return self._heuristic_referral_summary(normalized_text, reason_for_referral)

    def extract_referral_triage_profile(self, text_content, reason_for_referral=None):
        """Extract scheduling-facing triage details from a referral packet."""
        normalized_text = (text_content or "").strip()
        if not normalized_text:
            return self._heuristic_referral_triage_profile("", reason_for_referral)

        if not self.is_openai_configured() or not self.client:
            return self._heuristic_referral_triage_profile(normalized_text, reason_for_referral)

        try:
            truncated_text = normalized_text[:18000]
            system_prompt = """
You extract neurology referral intake facts for schedulers. The packet may include
multiple OCR'd documents. Prioritize the referral cover sheet, reason for referral,
and the attending note that documents the visit leading to this referral.

Rules:
- Copy findings from the chart when they are written there; paraphrase only lightly for brevity.
- If something is not documented, use null or empty arrays — never invent imaging, exam, or labs.
- imagingStudies must list only studies that appear in the packet; use one object per distinct study
  (modality + region). If a single report discusses multiple regions under one combined impression,
  use one object with a clear study title and that impression verbatim or lightly shortened.
- Ignore unrelated primary-care filler unless it changes neurologic triage.
- imagingStudies and physicalExamSystems are the primary outputs for imaging and exam.
  Use imagingResults / physicalExam only when you cannot fit content into those arrays (otherwise null).

Return a single JSON object with exactly these keys:

Core scheduling fields (strings or null):
- insurance
- medicalRecordNumber
- chiefComplaint
- historyOfPresentIllness   (neurologic HPI only; no exam or imaging)
- labResults              (plain text: one line per test "Name: value", or a short paragraph)
- otherProviders
- urgency                 ("emergent" | "urgent" | "routine" | null)
- urgencyFlags            (array of short strings; [] if none)
- symptomOnset            ("acute" | "subacute" | "chronic" | null)
- symptomProgression      ("episodic" | "worsening" | "stable" | "improving" | null)
- laterality              ("unilateral" | "bilateral" | "unclear" | null)
- symptomDuration         (string or null)
- priorWorkup             (short string summary or null)
- referringProviderSpecialty (string or null)

imagingStudies (array, required — use [] if no completed imaging is documented):
Each element must be an object with:
- "study": string (e.g. "MRI Brain without contrast")
- "date": string or null (e.g. "03/2026" or "Feb 2025" if explicitly stated)
- "impression": string — radiology or clinician impression/findings for that study only

physicalExamSystems (array, required — use [] if no objective exam is documented):
Each element: { "system": string, "findings": string }
Use concise system labels: Vitals, General, Mental Status, Cranial Nerves, Motor,
Sensory, Reflexes, Gait, Coordination, Other. Only objective exam lines — exclude
symptom history, Assessment, Impression, and Plan.

Legacy string fields (prefer null; filled only if arrays above are empty and you need one string):
- imagingResults
- physicalExam

Example shape (illustrative only):
{"imagingStudies":[{"study":"CT Head","date":"02/2025","impression":"No acute hemorrhage."}],
 "physicalExamSystems":[{"system":"Vitals","findings":"BP 120/80, HR 72, RR 16"},
  {"system":"Neuro","findings":"CN II-XII intact; strength 5/5 throughout."}]}
""".strip()
            user_message = f"""
Reason for referral (cover sheet): {reason_for_referral or 'Not provided'}

Referral packet text:
{truncated_text}
""".strip()

            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0.05,
                    max_tokens=1400,
                    response_format={"type": "json_object"},
                )
            except Exception:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0.05,
                    max_tokens=1400,
                )

            content = response.choices[0].message.content or "{}"
            parsed = self._parse_json_object(content)
            normalized_profile = self._normalize_referral_triage_profile(
                parsed,
                reason_for_referral,
                normalized_text,
            )
            normalized_profile["medicalRecordNumber"] = self._select_best_mrn_candidate(
                normalized_text,
                normalized_profile.get("medicalRecordNumber"),
            )
            return normalized_profile
        except Exception as exc:
            logging.warning("Falling back to heuristic triage extraction: %s", exc)
            return self._heuristic_referral_triage_profile(normalized_text, reason_for_referral)

    def _load_knowledge_base(self):
        if hasattr(self, "_kb_cache"):
            return self._kb_cache
        import os
        kb_dir = os.path.join(os.path.dirname(__file__), "..", "knowledge_base")
        with open(os.path.join(kb_dir, "clinics.json"), encoding="utf-8") as f:
            clinics_raw = f.read()
        clinics = json.loads(clinics_raw)
        with open(os.path.join(kb_dir, "routing_rules.md"), encoding="utf-8") as f:
            routing_rules = f.read()
        self._kb_cache = {
            "clinics": clinics,
            "clinics_raw": clinics_raw,
            "routing_rules": routing_rules,
        }
        return self._kb_cache

    def get_routing_recommendation(self, triage_profile, reason_for_referral=None):
        if not self.is_openai_configured() or not self.client:
            return self._fallback_routing()
        try:
            kb = self._load_knowledge_base()
            clinics = kb.get("clinics") if isinstance(kb.get("clinics"), list) else []
            clinics_text = kb.get("clinics_raw") or json.dumps(clinics, ensure_ascii=False, indent=2)
            clinic_id_map = {
                str(clinic.get("id")): clinic
                for clinic in clinics
                if isinstance(clinic, dict) and clinic.get("id")
            }
            clinic_name_to_id = {
                str(clinic.get("name", "")).strip().lower(): str(clinic.get("id"))
                for clinic in clinics
                if isinstance(clinic, dict) and clinic.get("id") and clinic.get("name")
            }
            clinical_summary = f"""
Chief complaint: {triage_profile.get('chiefComplaint') or 'Not specified'}
HPI: {triage_profile.get('historyOfPresentIllness') or 'Not specified'}
Symptom onset: {triage_profile.get('symptomOnset') or 'Unknown'}
Symptom progression: {triage_profile.get('symptomProgression') or 'Unknown'}
Laterality: {triage_profile.get('laterality') or 'Unknown'}
Symptom duration: {triage_profile.get('symptomDuration') or 'Unknown'}
Physical exam: {triage_profile.get('physicalExam') or 'Not documented'}
Imaging: {triage_profile.get('imagingResults') or 'None documented'}
Labs: {triage_profile.get('labResults') or 'None documented'}
Prior workup: {triage_profile.get('priorWorkup') or 'None documented'}
Urgency (from cover sheet): {triage_profile.get('urgency') or 'Not specified'}
Urgency flags: {', '.join(triage_profile.get('urgencyFlags') or []) or 'None'}
Referring provider specialty: {triage_profile.get('referringProviderSpecialty') or 'Unknown'}
Reason for referral: {reason_for_referral or 'Not provided'}
            """
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """
You are a neurology referral routing assistant at Johns Hopkins Medicine.
Recommend which neurology subspecialty clinic a patient should be routed to.
Return strict JSON with exactly these keys:
- recommendedClinic (full clinic name)
- recommendedClinicId (id from the clinic list)
- confidenceScore (float 0.0 to 1.0)
- rationale (2-3 sentences citing specific clinical features from the referral)
- alternativeClinics (array of {name, id, reason} — top 2 alternatives)
- urgency (emergent / urgent / routine)
- escalateForReview (boolean)
- escalationReason (string if escalateForReview true, else null)
- recommendedProviders (array of up to 3 provider names from the Hopkins list)
Set escalateForReview true if: confidenceScore < 0.65, urgency is emergent,
top two clinic scores are within 0.15, or referral is too incomplete to route.
Return only valid JSON. No preamble or markdown.
                        """,
                    },
                    {
                        "role": "user",
                        "content": (
                            "Use the following Hopkins clinic knowledge base JSON exactly as the source of truth "
                            "for clinic IDs, conditions, routing exclusions, urgency flags, intake requirements, "
                            "age restrictions, and provider names.\n\n"
                            f"Clinics knowledge base JSON:\n{clinics_text}\n\n"
                            f"Routing guidelines:\n{kb['routing_rules']}\n\n"
                            f"Patient:\n{clinical_summary}"
                        ),
                    },
                ],
                temperature=0.1,
                max_tokens=800,
                response_format={"type": "json_object"},
            )
            parsed = self._parse_json_object(response.choices[0].message.content or "{}")
            score = float(parsed.get("confidenceScore", 0.5))
            recommended_clinic = parsed.get("recommendedClinic", "General Neurology")
            recommended_clinic_id = parsed.get("recommendedClinicId", "general-neurology")
            if recommended_clinic_id not in clinic_id_map:
                guessed_id = clinic_name_to_id.get(str(recommended_clinic).strip().lower())
                if guessed_id:
                    recommended_clinic_id = guessed_id
                else:
                    recommended_clinic_id = "general-neurology"

            recommended_providers = parsed.get("recommendedProviders", [])
            if not isinstance(recommended_providers, list):
                recommended_providers = []
            if not recommended_providers and recommended_clinic_id in clinic_id_map:
                fallback_providers = clinic_id_map[recommended_clinic_id].get("providers") or []
                if isinstance(fallback_providers, list):
                    recommended_providers = fallback_providers[:3]

            return {
                "recommendedClinic": recommended_clinic,
                "recommendedClinicId": recommended_clinic_id,
                "confidenceScore": score,
                "confidenceLevel": "high" if score >= 0.80 else "medium" if score >= 0.60 else "low",
                "rationale": parsed.get("rationale", ""),
                "alternativeClinics": parsed.get("alternativeClinics", []),
                "urgency": parsed.get("urgency", "routine"),
                "escalateForReview": parsed.get("escalateForReview", score < 0.65),
                "escalationReason": parsed.get("escalationReason"),
                "recommendedProviders": recommended_providers[:3],
            }
        except Exception as exc:
            logging.warning("Routing recommendation failed: %s", exc)
            return self._fallback_routing()

    def _fallback_routing(self):
        return {
            "recommendedClinic": "General Neurology",
            "recommendedClinicId": "general-neurology",
            "confidenceScore": 0.0,
            "confidenceLevel": "low",
            "rationale": "Automatic routing unavailable — please review manually.",
            "alternativeClinics": [],
            "urgency": "routine",
            "escalateForReview": True,
            "escalationReason": "Routing system unavailable",
            "recommendedProviders": [],
        }

    def _get_system_prompt(self):
        """Get system prompt for patient triaging"""
        return {
            "role": "system",
            "content":
            """
                You are Eligio AI, an intelligent patient triaging assistant. Your role is to help assess patient symptoms and provide appropriate medical guidance.

                Guidelines:
                1. Always prioritize patient safety
                2. Ask clarifying questions when needed
                3. Provide general medical information, not specific diagnoses
                4. Recommend appropriate level of care (emergency care, urgent care, primary care)
                5. Include disclaimers that your advice is not a substitute for professional medical care
                6. Be empathetic and professional in your responses
                7. If symptoms suggest emergency conditions, advise immediate emergency care

                Please provide thoughtful, safe, and helpful triaging recommendations.
            """
        }

    def _generate_mock_response(self, messages):
        """Generate mock response when OpenAI is not available"""
        last_message = messages[-1]['content'] if messages else ""
        last_message_lower = last_message.lower()

        if any(keyword in last_message_lower for keyword in ['emergency', 'severe', 'chest pain', 'difficulty breathing', 'unconscious']):
            return """
                Based on the symptoms you've described, I recommend seeking immediate emergency medical care.
                Please go to the nearest emergency department or call emergency services right away.
                **Disclaimer**: This assessment is not a substitute for professional medical evaluation. Please seek immediate medical attention for proper diagnosis and treatment.
                """

        elif any(keyword in last_message_lower for keyword in ['pain', 'fever', 'headache', 'nausea', 'dizziness']):
            return """
                Based on your symptoms, I recommend scheduling an appointment with your primary care physician or visiting an urgent care center if your symptoms are concerning to you.
                **Disclaimer**: This information is for educational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for proper evaluation and treatment.
                """

        else:
            return """
                Thank you for providing information about your symptoms. Based on what you've shared, I recommend:

                1. Monitoring your symptoms closely
                2. Contacting your primary care physician for a proper evaluation
                3. Seeking urgent care if symptoms worsen or you develop new concerning symptoms

                **Disclaimer**: I am an AI assistant and cannot provide medical diagnoses. Please consult with a qualified healthcare professional for proper medical advice and treatment.
                """

    def _parse_json_object(self, raw_content):
        cleaned = (raw_content or "").strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        return json.loads(cleaned)

    def _clean_payload_value(self, payload, *keys):
        for key in keys:
            value = payload.get(key) if isinstance(payload, dict) else None
            if value is None:
                continue
            cleaned = str(value).strip()
            if cleaned and cleaned.lower() != "null":
                return cleaned
        return None

    def _triage_mixed_field(self, payload, *keys):
        """Scalar string, dict, or list for fields the model may return structured."""
        for key in keys:
            value = payload.get(key) if isinstance(payload, dict) else None
            if value is None:
                continue
            if isinstance(value, (dict, list)):
                return value
            cleaned = str(value).strip()
            if cleaned and cleaned.lower() != "null":
                return cleaned
        return None

    def _balanced_delimiter_segment(self, text, open_ch="{", close_ch="}"):
        if not text:
            return None
        start = text.find(open_ch)
        if start < 0:
            return None
        depth = 0
        for idx in range(start, len(text)):
            ch = text[idx]
            if ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return text[start : idx + 1]
        return None

    def _try_parse_structured(self, value):
        if isinstance(value, dict):
            return value
        if isinstance(value, list):
            return value
        if value is None or not isinstance(value, str):
            return None
        stripped = value.strip()
        if not stripped:
            return None
        if stripped.startswith("{") or stripped.startswith("["):
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                pass
            try:
                return ast.literal_eval(stripped)
            except (ValueError, SyntaxError, TypeError):
                pass
        return None

    def _try_parse_structured_loose(self, value):
        parsed = self._try_parse_structured(value)
        if parsed is not None:
            return parsed
        if not isinstance(value, str) or "{" not in value:
            return None
        segment = self._balanced_delimiter_segment(value, "{", "}")
        if not segment:
            return None
        try:
            return ast.literal_eval(segment)
        except (ValueError, SyntaxError, TypeError):
            pass
        try:
            return json.loads(segment)
        except json.JSONDecodeError:
            return None

    def _looks_like_serialized_mapping(self, text):
        if not text or not isinstance(text, str):
            return False
        s = text.strip()
        return s.startswith("{") and ":" in s and s.endswith("}")

    def _strip_lab_report_headers(self, text):
        cleaned = re.sub(r"\s*\(\s*compiled\s*\)\s*", " ", str(text or ""), flags=re.IGNORECASE)
        cleaned = re.sub(
            r"\bprinted\s+\d{1,2}/\d{1,2}/\d{2,4}\b",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip(" ;,:-")

    def _format_laboratory_mapping(self, data):
        if not isinstance(data, dict) or not data:
            return None
        lines = []
        for raw_key, raw_val in data.items():
            key = str(raw_key).strip()
            if not key:
                continue
            val = self._strip_lab_report_headers(str(raw_val).strip())
            val = re.sub(r"\s*\(\s*normal\s*\)\s*$", "", val, flags=re.IGNORECASE).strip()
            val = re.sub(r"\s*\(\s*nl\s*\)\s*$", "", val, flags=re.IGNORECASE).strip()
            if val:
                lines.append(f"{key}: {val}")
        return "\n".join(lines) if lines else None

    def _format_imaging_study_blocks_from_dict(self, payload):
        if not isinstance(payload, dict) or not payload:
            return None
        blocks = []
        for study_name, impression in sorted(payload.items(), key=lambda item: str(item[0]).lower()):
            study = str(study_name).strip()
            if impression is None:
                continue
            body = str(impression).strip()
            if not body:
                continue
            if re.match(r"^impression\s*:", body, flags=re.IGNORECASE):
                blocks.append(f"{study}:\n{body}")
            else:
                blocks.append(f"{study}:\nImpression: {body}")
        return "\n\n".join(blocks) if blocks else None

    def _format_imaging_study_blocks_from_list(self, rows):
        if not isinstance(rows, list) or not rows:
            return None
        blocks = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            study_raw = (
                row.get("study")
                or row.get("name")
                or row.get("modality")
                or row.get("exam")
                or row.get("title")
            )
            study = str(study_raw or "").strip()
            dt_raw = row.get("date") or row.get("studyDate") or row.get("performed")
            dt = str(dt_raw or "").strip()
            impression = (
                row.get("impression")
                or row.get("findings")
                or row.get("summary")
                or row.get("result")
                or row.get("report")
            )
            if impression is None:
                continue
            body = str(impression).strip()
            if not body:
                continue
            if study and dt:
                header = f"{study} ({dt})"
            elif study:
                header = study
            elif dt:
                header = dt
            else:
                header = "Imaging"
            if re.match(r"^impression\s*:", body, flags=re.IGNORECASE):
                blocks.append(f"{header}:\n{body}")
            else:
                blocks.append(f"{header}:\nImpression: {body}")
        return "\n\n".join(blocks) if blocks else None

    def _format_imaging_candidate_value(self, candidate_value):
        structured = None
        if isinstance(candidate_value, (dict, list)):
            structured = candidate_value
        elif isinstance(candidate_value, str):
            structured = self._try_parse_structured_loose(candidate_value)
        if isinstance(structured, dict):
            return self._format_imaging_study_blocks_from_dict(structured)
        if isinstance(structured, list):
            formatted = self._format_imaging_study_blocks_from_list(structured)
            if formatted:
                return formatted
        return None

    def _normalize_physical_exam_display(self, text):
        if text is None:
            return None
        s = re.sub(r"\s+", " ", str(text)).strip()
        if not s:
            return None

        tail_split = re.split(r"\b(?:assessment|plan|impression)\s*:", s, maxsplit=1, flags=re.IGNORECASE)
        s = tail_split[0].strip(" -:\u2013\u2014")

        s = re.sub(r"^\([^)]{1,360}\)\s*[-\u2013\u2014:]?\s*", "", s)

        anchor = re.search(
            r"\b(?:exam|vitals|neurologic(?:al)?\s+exam|physical\s+exam)\s*:",
            s,
            flags=re.IGNORECASE,
        )
        if anchor and anchor.start() > 100:
            anchor_lo = re.search(
                r"\b(?:neuro|cn|motor|reflexes|gait|vitals)\s*:",
                s,
                flags=re.IGNORECASE,
            )
            if not anchor_lo or anchor_lo.start() > anchor.start():
                s = s[anchor.start() :]

        break_labels = (
            "Vitals",
            "Neuro",
            "Neurologic",
            "Neurological",
            "CN",
            "Cranial Nerves",
            "Motor",
            "Sensory",
            "Reflexes",
            "Gait",
            "Coordination",
            "Cerebellar",
            "Mental Status",
            "Exam",
        )
        pattern = (
            r"(?<=[^\n])\s+(?=("
            + "|".join(re.escape(label) for label in break_labels)
            + r")\s*:)"
        )
        s = re.sub(pattern, "\n", s, flags=re.IGNORECASE)

        s = re.sub(r"^Exam:\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\nExam:\s*", "\n", s, flags=re.IGNORECASE)
        s = re.sub(r"[ \t]*\n[ \t]*", "\n", s)
        return s.strip() or None

    def _multiline_clinical_cleanup(self, text):
        if text is None:
            return None
        lines = []
        for line in str(text).splitlines():
            cleaned = re.sub(r"[ \t]+", " ", line).strip()
            if cleaned:
                lines.append(cleaned)
        if not lines:
            return None
        return "\n".join(lines)

    def _strip_assessment_plan_tail(self, text):
        if not text or not isinstance(text, str):
            return text
        parts = re.split(r"(?im)^\s*(?:assessment|plan)\s*:", text, maxsplit=1)
        return parts[0].strip()

    def _is_substantial_freeform_physical(self, text):
        stripped = (text or "").strip()
        if len(stripped) < 12:
            return False
        lowered = stripped.lower()
        concise = (
            "nonfocal",
            "unremarkable",
            "wnl",
            "within normal limits",
            "grossly intact",
            "alert and oriented",
            "negative exam",
            "benign",
        )
        if any(token in lowered for token in concise):
            return True
        if len(stripped) < 30:
            return False
        markers = (
            "vital",
            "neuro",
            "motor",
            "reflex",
            "gait",
            "cranial",
            "cn ",
            "cn:",
            "strength",
            "sensation",
            "exam:",
            "mental status",
            "coordination",
            "tone",
        )
        return any(marker in lowered for marker in markers)

    def _is_substantial_freeform_imaging(self, text):
        stripped = (text or "").strip()
        if len(stripped) < 12:
            return False
        lowered = stripped.lower()
        concise = (
            "unremarkable",
            "no acute",
            "no hemorrhage",
            "normal ",
            "negative",
            "within normal limits",
            "unchanged",
            "stable",
        )
        if any(token in lowered for token in concise):
            return True
        if "impression:" in lowered or "\n" in text:
            return True
        if len(stripped) < 22:
            return False
        modality_markers = (
            "mri",
            "ct head",
            "ct scan",
            "pet ",
            " cta",
            "cta ",
            "mra ",
            " mra",
            "x-ray",
            "xr ",
            "us ",
            "ultrasound",
            "imaging",
            "radiograph",
            "radiology",
        )
        return any(marker in lowered for marker in modality_markers)

    def _physical_exam_from_structured_payload(self, payload):
        rows = payload.get("physicalExamSystems")
        if rows is None:
            rows = payload.get("physical_exam_systems")
        if not isinstance(rows, list) or not rows:
            return None
        lines = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            system = (row.get("system") or row.get("name") or row.get("heading") or "").strip()
            findings = (
                row.get("findings") or row.get("text") or row.get("exam") or row.get("value") or ""
            ).strip()
            if not findings:
                continue
            if system:
                lines.append(f"{system}: {findings}")
            else:
                lines.append(findings)
        if not lines:
            return None
        return self._multiline_clinical_cleanup("\n".join(lines))

    def _imaging_from_structured_payload(self, payload):
        rows = payload.get("imagingStudies")
        if rows is None:
            rows = payload.get("imaging_studies")
        if not isinstance(rows, list) or not rows:
            return None
        formatted = self._format_imaging_study_blocks_from_list(rows)
        return formatted

    def _resolve_physical_exam_for_triage(self, payload, source_text, physical_candidate):
        structured = self._physical_exam_from_structured_payload(payload)
        if structured:
            return structured[:2000]

        if physical_candidate is not None:
            if isinstance(physical_candidate, dict):
                line_parts = []
                for key, val in physical_candidate.items():
                    kk = str(key).strip()
                    vv = str(val).strip() if val is not None else ""
                    if not vv:
                        continue
                    line_parts.append(f"{kk}: {vv}" if kk else vv)
                merged = self._multiline_clinical_cleanup("\n".join(line_parts))
                if merged:
                    return merged[:2000]
            elif isinstance(physical_candidate, list):
                line_parts = []
                for item in physical_candidate:
                    if isinstance(item, dict):
                        label = item.get("system") or item.get("label") or item.get("name")
                        detail = item.get("findings") or item.get("value") or item.get("text")
                        label = str(label or "").strip()
                        detail = str(detail or "").strip()
                        if detail:
                            line_parts.append(f"{label}: {detail}" if label else detail)
                    elif item:
                        line_parts.append(str(item).strip())
                merged = self._multiline_clinical_cleanup("\n".join(line_parts))
                if merged:
                    return merged[:2000]
            elif isinstance(physical_candidate, str):
                trimmed = self._strip_assessment_plan_tail(physical_candidate)
                cleaned = self._multiline_clinical_cleanup(trimmed)
                if cleaned and self._is_substantial_freeform_physical(cleaned):
                    return cleaned[:2000]

        if source_text:
            return self._build_physical_exam_summary(source_text, None)

        if isinstance(physical_candidate, str):
            return self._first_sentence(physical_candidate)
        return None

    def _resolve_imaging_for_triage(self, payload, source_text, imaging_candidate):
        structured = self._imaging_from_structured_payload(payload)
        if structured:
            return structured[:4000]

        formatted = self._format_imaging_candidate_value(imaging_candidate)
        if formatted:
            return formatted[:4000]

        if isinstance(imaging_candidate, str):
            cleaned = self._multiline_clinical_cleanup(imaging_candidate.strip())
            if cleaned and self._is_substantial_freeform_imaging(cleaned):
                return cleaned[:4000]

        if source_text:
            return self._build_imaging_results_summary(source_text, None)

        return self._normalize_clinical_phrase(imaging_candidate)

    def _normalize_referral_summary(self, payload, reason_for_referral=None):
        chief_complaint = self._clean_payload_value(payload, "chiefComplaint", "chief_complaint")
        evaluation = self._clean_payload_value(payload, "evaluation")
        diagnosis = self._clean_payload_value(payload, "diagnosis")

        if not chief_complaint:
            chief_complaint = (reason_for_referral or "").strip() or None

        return {
            "chiefComplaint": chief_complaint,
            "evaluation": evaluation,
            "diagnosis": diagnosis,
        }

    def _normalize_referral_triage_profile(self, payload, reason_for_referral=None, source_text=None):
        physical_exam_candidate = self._triage_mixed_field(
            payload,
            "physicalExam",
            "physical_exam",
        )
        imaging_candidate = self._triage_mixed_field(
            payload,
            "imagingResults",
            "imaging_results",
        )
        physical_exam = self._resolve_physical_exam_for_triage(
            payload,
            source_text,
            physical_exam_candidate,
        )
        imaging_results = self._resolve_imaging_for_triage(
            payload,
            source_text,
            imaging_candidate,
        )
        lab_candidate = self._triage_mixed_field(
            payload,
            "labResults",
            "lab_results",
        )
        other_providers_candidate = self._clean_payload_value(
            payload,
            "otherProviders",
            "other_providers",
        )
        lab_results = (
            self._build_lab_results_summary(source_text, lab_candidate)
            if source_text
            else self._normalize_clinical_phrase(lab_candidate)
        )
        other_providers = (
            self._build_other_providers_summary(source_text, other_providers_candidate)
            if source_text
            else self._normalize_clinical_phrase(other_providers_candidate)
        )
        return {
            "insurance": self._clean_payload_value(payload, "insurance"),
            "medicalRecordNumber": self._clean_payload_value(
                payload,
                "medicalRecordNumber",
                "medical_record_number",
                "mrn",
            ),
            "chiefComplaint": self._clean_payload_value(
                payload,
                "chiefComplaint",
                "chief_complaint",
            )
            or (reason_for_referral or "").strip()
            or None,
            "historyOfPresentIllness": self._clean_payload_value(
                payload,
                "historyOfPresentIllness",
                "history_of_present_illness",
                "hpi",
            ),
            "physicalExam": physical_exam,
            "imagingResults": imaging_results,
            "labResults": lab_results,
            "otherProviders": other_providers,
            "urgency": self._clean_payload_value(payload, "urgency"),
            "urgencyFlags": payload.get("urgencyFlags")
            if isinstance(payload.get("urgencyFlags"), list)
            else [],
            "symptomOnset": self._clean_payload_value(
                payload,
                "symptomOnset",
                "symptom_onset",
            ),
            "symptomProgression": self._clean_payload_value(
                payload,
                "symptomProgression",
                "symptom_progression",
            ),
            "laterality": self._clean_payload_value(payload, "laterality"),
            "symptomDuration": self._clean_payload_value(
                payload,
                "symptomDuration",
                "symptom_duration",
            ),
            "priorWorkup": self._clean_payload_value(
                payload,
                "priorWorkup",
                "prior_workup",
            ),
            "referringProviderSpecialty": self._clean_payload_value(
                payload,
                "referringProviderSpecialty",
                "referring_provider_specialty",
            ),
        }

    def _extract_section_value(self, text_content, label):
        patterns = [
            rf"{label}\s*[:\-]\s*(.+?)(?=\s+[A-Z][A-Za-z ]{{2,30}}\s*[:\-]|$)",
            rf"{label}\s+(.+?)(?=\s+[A-Z][A-Za-z ]{{2,30}}\s*[:\-]|$)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text_content, flags=re.IGNORECASE | re.DOTALL)
            if not match:
                continue

            value = re.sub(r"\s+", " ", match.group(1)).strip(" .;")
            if value:
                return value

        return None

    def _extract_section_values(self, text_content, label):
        content = str(text_content or "")
        if not content.strip():
            return []

        patterns = [
            rf"{label}\s*[:\-]\s*(.+?)(?=\s+[A-Z][A-Za-z ]{{2,30}}\s*[:\-]|$)",
            rf"{label}\s+(.+?)(?=\s+[A-Z][A-Za-z ]{{2,30}}\s*[:\-]|$)",
        ]
        values = []
        for pattern in patterns:
            for match in re.finditer(pattern, content, flags=re.IGNORECASE | re.DOTALL):
                value = re.sub(r"\s+", " ", match.group(1)).strip(" .;")
                if value:
                    values.append(value)
        return values

    def _extract_labeled_value(self, text_content, labels, max_words=32):
        content = str(text_content or "")
        if not content.strip():
            return None

        escaped_labels = [re.escape(label) for label in labels]
        label_group = "|".join(escaped_labels)
        boundary_labels = [
            "chief complaint",
            "chief concern",
            "reason for referral",
            "history of present illness",
            "hpi",
            "evaluation",
            "assessment",
            "diagnosis",
            "impression",
            "physical exam",
            "neurological exam",
            "imaging",
            "imaging results",
            "lab results",
            "labs",
            "other providers",
            "insurance",
            "payer",
            "plan",
            "medical record number",
            "medical record #",
            "mrn",
        ]
        boundary_group = "|".join(re.escape(label) for label in boundary_labels)

        pattern = re.compile(
            rf"(?:{label_group})\s*[:\-]\s*(.+?)(?=(?:\s+(?:{boundary_group})\s*[:\-])|[\n\r]|$)",
            flags=re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(content)
        if not match:
            return None

        raw_value = re.sub(r"\s+", " ", match.group(1)).strip(" .;,:-")
        if not raw_value:
            return None

        words = raw_value.split()
        if len(words) > max_words:
            raw_value = " ".join(words[:max_words]).strip(" .;,:-")
        return raw_value or None

    def _normalize_insurance_value(self, value):
        cleaned = re.sub(r"\s+", " ", str(value or "")).strip(" .;,:-")
        if not cleaned:
            return None

        # Remove trailing card metadata that often follows payer names in OCR text.
        cleaned = re.split(
            r"\b(?:member id|subscriber id|policy|id|auth|notes?|urgency|referring provider|pcp)\b",
            cleaned,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip(" .;,:-")
        cleaned = cleaned.rstrip(" -\u2013\u2014")

        words = cleaned.split()
        if len(words) > 8:
            cleaned = " ".join(words[:8]).strip(" .;,:-")
        cleaned = cleaned.rstrip(" -\u2013\u2014")
        return cleaned or None

    def _heuristic_referral_summary(self, text_content, reason_for_referral=None):
        flattened_text = re.sub(r"\s+", " ", text_content or "").strip()
        return {
            "chiefComplaint": self._extract_labeled_value(
                text_content,
                ["chief complaint", "chief concern"],
                max_words=20,
            )
            or self._extract_section_value(flattened_text, "chief complaint")
            or self._extract_section_value(flattened_text, "chief concern")
            or (reason_for_referral or "").strip()
            or None,
            "evaluation": self._extract_labeled_value(
                text_content,
                ["evaluation", "assessment"],
                max_words=36,
            )
            or self._extract_section_value(flattened_text, "evaluation")
            or self._extract_section_value(flattened_text, "assessment"),
            "diagnosis": self._extract_labeled_value(
                text_content,
                ["diagnosis", "impression"],
                max_words=24,
            )
            or self._extract_section_value(flattened_text, "diagnosis")
            or self._extract_section_value(flattened_text, "impression"),
        }

    def _extract_pattern_value(self, text_content, patterns):
        for pattern in patterns:
            match = re.search(pattern, text_content, flags=re.IGNORECASE)
            if not match:
                continue
            value = re.sub(r"\s+", " ", match.group(1)).strip(" .;,:")
            if value:
                return value
        return None

    def _normalize_mrn_candidate(self, value):
        candidate = re.sub(r"\s+", " ", str(value or "")).strip(" .;,:")
        if not candidate:
            return None

        # Normalize OCR spacing around separators while preserving the token.
        candidate = re.sub(r"\s*-\s*", "-", candidate)
        candidate = re.sub(r"\s*/\s*", "/", candidate)
        return candidate

    def _extract_mrn_candidate(self, text_content):
        raw_candidate = self._extract_pattern_value(
            text_content,
            [
                r"(?:medical record number|medical record #|mrn)\s*[:#-]?\s*([A-Za-z0-9]+(?:\s*[-/]\s*[A-Za-z0-9]+)+)",
                r"(?:medical record number|medical record #|mrn)\s*[:#-]?\s*([A-Za-z]*\d[A-Za-z0-9\-\/]*)",
            ],
        )
        return self._normalize_mrn_candidate(raw_candidate)

    def _has_digits(self, value):
        return bool(re.search(r"\d", value or ""))

    def _select_best_mrn_candidate(self, text_content, ai_candidate):
        normalized_ai_candidate = self._normalize_mrn_candidate(ai_candidate)
        pattern_candidate = self._extract_mrn_candidate(text_content)

        if not pattern_candidate:
            return normalized_ai_candidate
        if not normalized_ai_candidate:
            return pattern_candidate

        # Prefer the candidate that preserves the numeric segment.
        if self._has_digits(pattern_candidate) and not self._has_digits(normalized_ai_candidate):
            return pattern_candidate

        # If the AI returned a truncated prefix (e.g., CRMA), prefer the longer OCR match.
        ai_lower = normalized_ai_candidate.lower()
        pattern_lower = pattern_candidate.lower()
        if pattern_lower.startswith(ai_lower) and len(pattern_candidate) > len(normalized_ai_candidate):
            return pattern_candidate

        return normalized_ai_candidate

    def _split_sentences(self, text_content):
        flattened_text = re.sub(r"\s+", " ", text_content or "").strip()
        if not flattened_text:
            return []
        return [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+", flattened_text)
            if sentence.strip()
        ]

    def _extract_sentences_by_keywords(self, text_content, keywords, max_sentences=2):
        sentences = self._split_sentences(text_content)
        matches = []

        for sentence in sentences:
            lowered = sentence.lower()
            if any(keyword in lowered for keyword in keywords):
                matches.append(sentence)
            if len(matches) >= max_sentences:
                break

        if matches:
            return " ".join(matches)
        return None

    def _is_vitals_only_exam(self, text):
        lowered = str(text or "").lower()
        if not lowered.strip():
            return True

        vitals_markers = (
            "vitals",
            "blood pressure",
            "bp ",
            "pulse",
            "heart rate",
            "temperature",
            "temp",
            "respiratory rate",
            "rr ",
            "spo2",
            "oxygen saturation",
            "height",
            "weight",
            "bmi",
        )
        exam_finding_markers = (
            "strength",
            "reflex",
            "gait",
            "cranial nerve",
            "sensation",
            "motor",
            "coordination",
            "ataxia",
            "nystagmus",
            "focal",
            "deficit",
            "romberg",
            "tone",
            "weakness",
            "numbness",
        )

        has_vitals = any(marker in lowered for marker in vitals_markers)
        has_exam_findings = any(marker in lowered for marker in exam_finding_markers)
        return has_vitals and not has_exam_findings

    def _normalize_clinical_phrase(self, text):
        if text is None:
            return None
        cleaned = re.sub(r"\s+", " ", str(text)).strip(" .;,:-")
        if not cleaned:
            return None
        # Remove wrapping quotes that frequently appear in OCR/model output.
        cleaned = cleaned.strip("\"'`")
        return cleaned or None

    def _format_clinical_list(self, values, max_items=3):
        normalized_items = []
        seen = set()
        for value in values:
            normalized = self._normalize_clinical_phrase(value)
            if not normalized:
                continue
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized_items.append(normalized)
            if len(normalized_items) >= max_items:
                break
        if not normalized_items:
            return None
        return "; ".join(normalized_items)

    def _first_sentence(self, text):
        normalized = self._normalize_clinical_phrase(text)
        if not normalized:
            return None
        parts = re.split(r"(?<=[.!?])\s+", normalized, maxsplit=1)
        return self._normalize_clinical_phrase(parts[0])

    def _build_physical_exam_summary(self, text_content, candidate_value=None):
        source = str(text_content or "")
        section_candidates = []
        for label in ["neurological exam", "neurologic exam", "neuro exam", "physical exam"]:
            section_candidates.extend(self._extract_section_values(source, label))

        sentence_candidates = []
        for sentence in self._split_sentences(source):
            lowered = sentence.lower()
            if not any(
                token in lowered
                for token in [
                    "exam",
                    "neurologic",
                    "neurological",
                    "strength",
                    "reflex",
                    "gait",
                    "cranial nerve",
                    "sensation",
                ]
            ):
                continue
            sentence_candidates.append(sentence)

        def exam_anchor_score(blob):
            if not blob:
                return 0
            lowered = str(blob).lower()
            markers = (
                "strength",
                "reflex",
                "gait",
                "cranial nerve",
                "cn ",
                "cn:",
                "motor",
                "sensory",
                "sensation",
                "coordination",
                "romberg",
                "ataxia",
                "nystagmus",
                "focal deficit",
                "vitals",
            )
            return sum(1 for marker in markers if marker in lowered)

        best_blob = None
        for raw in [*section_candidates, *sentence_candidates]:
            if not raw:
                continue
            formatted = self._normalize_physical_exam_display(raw)
            if not formatted:
                continue
            if self._is_vitals_only_exam(formatted) and exam_anchor_score(formatted) < 2:
                continue
            if best_blob is None or len(formatted) > len(best_blob):
                best_blob = formatted

        candidate_blob = None
        if candidate_value is not None:
            if isinstance(candidate_value, dict):
                candidate_blob = self._normalize_physical_exam_display(
                    "\n".join(f"{str(k).strip()}: {str(v).strip()}" for k, v in candidate_value.items()),
                )
            elif isinstance(candidate_value, list):
                parts = []
                for item in candidate_value:
                    if isinstance(item, dict):
                        label = item.get("label") or item.get("name") or item.get("system")
                        detail = item.get("value") or item.get("text") or item.get("finding")
                        if label and detail:
                            parts.append(f"{label}: {detail}")
                        elif detail:
                            parts.append(str(detail))
                    else:
                        parts.append(str(item))
                candidate_blob = self._normalize_physical_exam_display("\n".join(parts))
            else:
                candidate_blob = self._normalize_physical_exam_display(
                    self._normalize_clinical_phrase(candidate_value),
                )
        if candidate_blob and not self._is_vitals_only_exam(candidate_blob):
            if best_blob is None or len(candidate_blob) > len(best_blob):
                best_blob = candidate_blob

        if best_blob:
            return best_blob[:1600]

        if candidate_blob:
            return candidate_blob[:1600]

        return None

    def _extract_impression_section(self, text_content):
        content = str(text_content or "")
        if not content.strip():
            return None

        pattern = re.compile(
            r"(?:^|\n)\s*impression\s*[:\-]?\s*(.+?)(?=(?:\n\s*(?:findings?|history|comparison|technique|assessment|plan|diagnosis|exam(?:ination)?|clinical|recommendation)s?\s*[:\-])|\n{2,}|$)",
            flags=re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(content)
        if not match:
            return None

        captured = re.sub(r"\s+", " ", match.group(1))
        return self._first_sentence(captured)

    def _extract_positive_imaging_findings(self, text_content, max_items=1):
        sentences = self._split_sentences(text_content)
        if not sentences:
            return []

        positive_keywords = (
            "shows",
            "showing",
            "demonstrates",
            "demonstrated",
            "reveals",
            "revealed",
            "noted",
            "evidence of",
            "consistent with",
            "compatible with",
            "positive for",
            "abnormal",
            "lesion",
            "mass",
            "stenosis",
            "herniation",
            "edema",
            "hemorrhage",
            "infarct",
            "enhancement",
        )
        negative_markers = (
            "no ",
            "without ",
            "negative for",
            "unremarkable",
            "normal ",
            "not seen",
            "no evidence",
        )
        modality_markers = ("mri", "ct", "x-ray", "radiograph", "ultrasound", "scan", "imaging")

        findings = []
        for sentence in sentences:
            lowered = sentence.lower()
            if not any(marker in lowered for marker in modality_markers + positive_keywords):
                continue
            if any(marker in lowered for marker in negative_markers):
                continue
            normalized = self._first_sentence(sentence)
            if not normalized:
                continue
            findings.append(normalized)
            if len(findings) >= max_items:
                break
        return findings

    def _build_imaging_results_summary(self, text_content, candidate_value=None):
        formatted_candidate = self._format_imaging_candidate_value(candidate_value)
        if formatted_candidate:
            return formatted_candidate

        impression = self._extract_impression_section(text_content)
        positives = self._extract_positive_imaging_findings(text_content, max_items=3)
        positives = [
            item
            for item in positives
            if item and not self._looks_like_serialized_mapping(item)
        ]

        blocks = []
        if impression:
            blocks.append(f"Impression: {impression}")
        if positives:
            for item in positives:
                cleaned = self._normalize_clinical_phrase(item)
                if cleaned and not self._looks_like_serialized_mapping(cleaned):
                    blocks.append(cleaned)
        if not blocks:
            return None
        if len(blocks) == 1:
            return blocks[0]
        return "\n\n".join(blocks)

    def _build_lab_results_summary(self, text_content, candidate_value=None):
        structured = None
        if isinstance(candidate_value, dict):
            structured = candidate_value
        elif isinstance(candidate_value, str):
            structured = self._try_parse_structured_loose(candidate_value)
            if not structured:
                stripped = self._strip_lab_report_headers(candidate_value)
                structured = self._try_parse_structured_loose(stripped)

        if isinstance(structured, dict):
            formatted = self._format_laboratory_mapping(structured)
            if formatted:
                return formatted

        source = str(text_content or "")
        section_candidates = []
        for label in ["lab results", "labs", "laboratory", "laboratory data"]:
            section_candidates.extend(self._extract_section_values(source, label))

        for raw in section_candidates:
            parsed = self._try_parse_structured_loose(raw)
            if isinstance(parsed, dict):
                formatted = self._format_laboratory_mapping(parsed)
                if formatted:
                    return formatted
            cleaned = self._strip_lab_report_headers(raw)
            parsed = self._try_parse_structured_loose(cleaned)
            if isinstance(parsed, dict):
                formatted = self._format_laboratory_mapping(parsed)
                if formatted:
                    return formatted

        sentence_candidates = []
        for sentence in self._split_sentences(source):
            lowered = sentence.lower()
            if any(keyword in lowered for keyword in ["cbc", "cmp", "esr", "crp", "tsh", "a1c", "csf", "lab"]):
                sentence_candidates.append(sentence)

        values = []
        if isinstance(candidate_value, str):
            scrubbed = self._strip_lab_report_headers(candidate_value)
            if scrubbed and not self._looks_like_serialized_mapping(scrubbed):
                values.append(scrubbed)
        values.extend(section_candidates)
        values.extend(sentence_candidates)
        flattened = self._format_clinical_list(values, max_items=3)
        if flattened:
            flattened = self._strip_lab_report_headers(flattened)
        return flattened

    def _build_other_providers_summary(self, text_content, candidate_value=None):
        source = str(text_content or "")
        section_candidates = []
        for label in ["other providers", "care team", "referring provider", "consulting provider"]:
            section_candidates.extend(self._extract_section_values(source, label))

        sentence_candidates = []
        for sentence in self._split_sentences(source):
            lowered = sentence.lower()
            if any(keyword in lowered for keyword in ["dr.", "provider", "specialist", "referred to", "follows with"]):
                sentence_candidates.append(sentence)

        values = []
        if candidate_value:
            values.append(candidate_value)
        values.extend(section_candidates)
        values.extend(sentence_candidates)
        return self._format_clinical_list(values, max_items=2)

    def _heuristic_referral_triage_profile(self, text_content, reason_for_referral=None):
        flattened_text = re.sub(r"\s+", " ", text_content or "").strip()

        insurance = self._extract_pattern_value(
            flattened_text,
            [
                r"(?:insurance|payer|plan)\s*[:#-]?\s*([A-Za-z][A-Za-z0-9 &/()\-]{2,80})",
            ],
        )
        insurance = (
            self._normalize_insurance_value(
                self._extract_labeled_value(text_content, ["insurance", "payer", "plan"], max_words=8)
            )
            or self._normalize_insurance_value(insurance)
        )
        medical_record_number = self._extract_pattern_value(
            flattened_text,
            [
                r"(?:medical record number|medical record #|mrn)\s*[:#-]?\s*([A-Za-z0-9]+(?:\s*[-/]\s*[A-Za-z0-9]+)+)",
                r"(?:medical record number|medical record #|mrn)\s*[:#-]?\s*([A-Za-z]*\d[A-Za-z0-9\-\/]*)",
            ],
        )
        medical_record_number = self._normalize_mrn_candidate(medical_record_number)
        medical_record_number = self._select_best_mrn_candidate(flattened_text, medical_record_number)

        chief_complaint = (
            self._extract_section_value(flattened_text, "chief complaint")
            or self._extract_section_value(flattened_text, "chief concern")
            or self._extract_section_value(flattened_text, "reason for referral")
            or (reason_for_referral or "").strip()
            or None
        )

        history_of_present_illness = (
            self._extract_section_value(flattened_text, "history of present illness")
            or self._extract_section_value(flattened_text, "hpi")
            or self._extract_sentences_by_keywords(
                flattened_text,
                ["presents with", "reports", "history of", "symptoms began", "worsening"],
            )
        )

        physical_exam_candidate = (
            self._extract_section_value(flattened_text, "physical exam")
            or self._extract_section_value(flattened_text, "neurological exam")
            or self._extract_sentences_by_keywords(
                flattened_text,
                [
                    "exam",
                    "strength",
                    "reflex",
                    "gait",
                    "cranial nerve",
                    "sensation",
                    "weakness",
                    "numbness",
                ],
            )
        )
        physical_exam = self._build_physical_exam_summary(text_content, physical_exam_candidate)

        imaging_candidate = (
            self._extract_section_value(flattened_text, "imaging")
            or self._extract_section_value(flattened_text, "imaging results")
            or self._extract_section_value(flattened_text, "radiology")
            or self._extract_sentences_by_keywords(
                flattened_text,
                ["mri", "ct", "scan", "imaging", "radiology", "x-ray"],
            )
        )
        imaging_results = self._build_imaging_results_summary(text_content, imaging_candidate)

        lab_results = (
            self._extract_section_value(flattened_text, "lab results")
            or self._extract_section_value(flattened_text, "labs")
            or self._extract_section_value(flattened_text, "laboratory")
            or self._extract_sentences_by_keywords(
                flattened_text,
                ["lab", "cbc", "cmp", "tsh", "b12", "esr", "crp", "a1c", "ck", "csf"],
            )
        )
        lab_results = self._build_lab_results_summary(text_content, lab_results)

        other_providers = (
            self._extract_section_value(flattened_text, "other providers")
            or self._extract_section_value(flattened_text, "care team")
            or self._extract_sentences_by_keywords(
                flattened_text,
                ["dr.", "provider", "specialist", "follows with", "seeing", "referred to"],
            )
        )
        other_providers = self._build_other_providers_summary(text_content, other_providers)

        return {
            "insurance": insurance,
            "medicalRecordNumber": medical_record_number,
            "chiefComplaint": chief_complaint,
            "historyOfPresentIllness": history_of_present_illness,
            "physicalExam": physical_exam,
            "imagingResults": imaging_results,
            "labResults": lab_results,
            "otherProviders": other_providers,
            "urgency": None,
            "urgencyFlags": [],
            "symptomOnset": None,
            "symptomProgression": None,
            "laterality": None,
            "symptomDuration": None,
            "priorWorkup": None,
            "referringProviderSpecialty": None,
        }

    def analyze_document_content(self, text_content):
        """Analyze document content for medical information"""
        try:
            if not Config.OPENAI_API_KEY:
                return self._mock_document_analysis(text_content)

            messages = [
                {
                    "role": "system",
                    "content":
                    """
                        You are a medical document analyzer. Extract and summarize key medical information from the provided text. Focus on:
                        1. Patient demographics
                        2. Medical conditions/diagnoses
                        3. Medications
                        4. Test results
                        5. Clinical notes
                        6. Recommendations
                        Provide a structured summary of the medical information.
                    """
                },
                {
                    "role": "user",
                    "content": f"Please analyze this medical document:\n\n{text_content}"
                }
            ]

            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.3,
                max_tokens=1500
            )

            return response.choices[0].message.content

        except Exception as e:
            logging.error(f"Document analysis error: {str(e)}")
            return self._mock_document_analysis(text_content)

    def _mock_document_analysis(self, text_content):
        """Mock document analysis when OpenAI is not available"""
        return f"""
            Document Analysis Summary:
            The document has been processed and contains medical information. For detailed analysis and extraction of specific medical data points, please configure the OpenAI API integration.

            Document characteristics:
            - Length: {len(text_content)} characters
            - Contains medical terminology
            - Requires professional medical review

            **Note**: This is a mock analysis. Configure OpenAI API for detailed medical document analysis.
            """
