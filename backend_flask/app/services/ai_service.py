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
- labResults              (plain text ONLY: one line per lab, "TestName: value and unit".
  Stop before checklists like "[X] Imaging", footers, CONFIDENTIAL, page numbers,
  problem-list tails (e.g. "T2DM", "former smoker", "per PCP records"), or Prior auth.
  Do not append "; pending", "pending Consider", or other filler after values; list each test once only.)
- otherProviders          (prefer null when using otherProvidersList below)
- otherProvidersList      (array, required — use [] if none): each item
  { "name": "Dr. Jane Smith, MD", "specialty": "Neurology" | null }
  Only real clinicians with a person name. Omit institution headers, Signature lines,
  CONFIDENTIAL banners, fax footers, and page numbers.
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

Example shape (illustrative only — labResults must use real newline characters between lines in the JSON string):
{"imagingStudies":[{"study":"CT Head","date":"02/2025","impression":"No acute hemorrhage."}],
 "physicalExamSystems":[{"system":"Vitals","findings":"BP 120/80, HR 72, RR 16"},
  {"system":"Neuro","findings":"CN II-XII intact; strength 5/5 throughout."}],
 "otherProvidersList":[{"name":"Dr. Anita Patel, MD","specialty":"Primary Care"}],
 "otherProviders":null}
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

    def get_clinics_catalog(self):
        kb = self._load_knowledge_base()
        clinics = kb.get("clinics")
        return clinics if isinstance(clinics, list) else []

    def _referral_routing_text_blob(self, triage_profile, reason_for_referral=None):
        parts = [
            triage_profile.get("chiefComplaint"),
            triage_profile.get("historyOfPresentIllness"),
            triage_profile.get("physicalExam"),
            triage_profile.get("imagingResults"),
            triage_profile.get("labResults"),
            triage_profile.get("priorWorkup"),
            triage_profile.get("otherProviders"),
            reason_for_referral,
            triage_profile.get("urgency"),
            " ".join(triage_profile.get("urgencyFlags") or []),
        ]
        return " ".join(str(p) for p in parts if p).strip().lower()

    def _score_clinic_match(self, clinic, text_lower):
        cond_hits = 0
        sym_hits = 0
        for c in clinic.get("conditions") or []:
            lc = str(c).strip().lower()
            if len(lc) >= 4 and lc in text_lower:
                cond_hits += 1
        for s in clinic.get("key_symptoms") or []:
            ls = str(s).strip().lower()
            if len(ls) >= 4 and ls in text_lower:
                sym_hits += 1
        total = cond_hits * 3 + sym_hits * 2
        return total, cond_hits, sym_hits

    def _normalize_providers_for_clinic(self, clinic_id, parsed_providers, clinic_id_map):
        clinic = clinic_id_map.get(clinic_id) or {}
        kb_list = clinic.get("providers") if isinstance(clinic.get("providers"), list) else []
        canon_upper_to_exact = {str(p).strip().upper(): str(p).strip() for p in kb_list}
        out = []
        seen = set()
        if isinstance(parsed_providers, list):
            for name in parsed_providers:
                key = str(name).strip().upper()
                exact = canon_upper_to_exact.get(key)
                if exact and exact.upper() not in seen:
                    seen.add(exact.upper())
                    out.append(exact)
        if out:
            return out[:3]
        return [str(p).strip() for p in kb_list[:3] if str(p).strip()]

    def _normalize_alternative_clinics(self, raw, clinic_id_map):
        out = []
        if not isinstance(raw, list):
            return out
        for item in raw:
            if not isinstance(item, dict):
                continue
            cid = str(item.get("id") or "").strip()
            if cid not in clinic_id_map:
                continue
            row = clinic_id_map[cid]
            out.append({
                "id": cid,
                "name": row.get("name", ""),
                "reason": item.get("reason") or "",
            })
            if len(out) >= 2:
                break
        return out

    def _kb_heuristic_routing(self, triage_profile, reason_for_referral=None):
        kb = self._load_knowledge_base()
        clinics = kb.get("clinics") if isinstance(kb.get("clinics"), list) else []
        if not clinics:
            return self._fallback_routing()

        clinic_id_map = {
            str(clinic.get("id")): clinic
            for clinic in clinics
            if isinstance(clinic, dict) and clinic.get("id")
        }

        text = self._referral_routing_text_blob(triage_profile, reason_for_referral)
        if not text:
            text = (reason_for_referral or "").strip().lower()

        general_id = "general-neurology"
        scored = []
        for clinic in clinics:
            if not isinstance(clinic, dict):
                continue
            cid = str(clinic.get("id") or "")
            if not cid:
                continue
            total, cond_hits, sym_hits = self._score_clinic_match(clinic, text)
            scored.append((total, cond_hits, sym_hits, cid))

        non_general = [row for row in scored if row[3] != general_id]
        best = max(non_general, key=lambda x: (x[0], x[1], x[2])) if non_general else None

        if best is None or best[0] <= 0:
            winner_id = general_id
            confidence = 0.35
            rationale = (
                "Heuristic routing using clinics.json only: no substantive overlap was found "
                "between the referral excerpt and specific clinic conditions or key symptoms, "
                "so the knowledge base default is General Neurology. Nuanced exclusions and "
                "priorities in routing_rules.md are not fully applied without AI routing—manual "
                "review is recommended."
            )
        else:
            winner_id = best[3]
            tie_bonus = min(best[1] + best[2], 8)
            confidence = min(0.48 + 0.05 * tie_bonus, 0.82)
            rationale = (
                "Heuristic routing using clinics.json: scored the referral text against each "
                "clinic's listed conditions and key symptoms "
                f"({best[1]} condition phrase hits, {best[2]} symptom phrase hits for the chosen clinic). "
                "routing_rules.md provides additional exclusions and triage nuance; verify especially "
                "when urgency flags or 'do not route here' entries may apply."
            )

        canonical = clinic_id_map.get(winner_id, {})
        display_name = canonical.get("name") or "General Neurology"
        providers = self._normalize_providers_for_clinic(winner_id, [], clinic_id_map)

        alternative_clinics = []
        sorted_rest = sorted(
            (row for row in non_general if row[3] != winner_id and row[0] > 0),
            key=lambda x: (-x[0], -x[1], -x[2]),
        )
        for row in sorted_rest[:2]:
            cid = row[3]
            alternative_clinics.append({
                "id": cid,
                "name": clinic_id_map[cid].get("name", ""),
                "reason": "Next-highest overlap with clinics.json conditions / symptoms in this referral excerpt.",
            })

        return {
            "recommendedClinic": display_name,
            "recommendedClinicId": winner_id,
            "confidenceScore": confidence,
            "confidenceLevel": "high" if confidence >= 0.80 else "medium" if confidence >= 0.60 else "low",
            "rationale": rationale,
            "alternativeClinics": alternative_clinics,
            "urgency": "routine",
            "escalateForReview": True,
            "escalationReason": "Heuristic KB routing — confirm against routing_rules.md and clinic exclusions.",
            "recommendedProviders": providers,
        }

    def get_routing_recommendation(self, triage_profile, reason_for_referral=None):
        if not self.is_openai_configured() or not self.client:
            return self._kb_heuristic_routing(triage_profile, reason_for_referral)
        try:
            kb = self._load_knowledge_base()
            clinics = kb.get("clinics") if isinstance(kb.get("clinics"), list) else []
            clinics_text = kb.get("clinics_raw") or json.dumps(clinics, ensure_ascii=False, indent=2)
            routing_rules = kb.get("routing_rules") or ""
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
Your ONLY sources for clinic choice, clinic IDs, provider names, exclusions, and intake constraints are:
(1) the Hopkins clinic knowledge base JSON (clinics.json structure), and
(2) the Routing guidelines markdown (routing_rules.md).

Recommend which neurology subspecialty clinic the patient should be routed to.
Rules:
- recommendedClinicId MUST be copied exactly from the JSON "id" field; recommendedClinic MUST exactly match that object's "name".
- Honor each clinic's "do_not_route_here" list and urgency-related guidance from BOTH the JSON and the markdown when they apply.
- recommendedProviders MUST contain only names taken from that clinic's JSON "providers" array (up to 3). Never invent providers.
- In rationale (2-4 sentences), cite concrete referral findings AND tie them to relevant routing guidelines / clinic scope from the knowledge sources.

Return strict JSON with exactly these keys:
- recommendedClinic (must equal JSON name for recommendedClinicId)
- recommendedClinicId (from JSON only)
- confidenceScore (float 0.0 to 1.0)
- rationale (per rules above)
- alternativeClinics (array of up to 2 objects {name, id, reason}; ids and names must match JSON entries)
- urgency (emergent / urgent / routine)
- escalateForReview (boolean)
- escalationReason (string if escalateForReview true, else null)
- recommendedProviders (array of up to 3 strings from that clinic's JSON providers list)

Set escalateForReview true if: confidenceScore < 0.65, urgency is emergent,
top two clinic choices conflict per routing_rules.md, or referral is too incomplete to route safely.

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
                            f"Routing guidelines (routing_rules.md):\n{routing_rules}\n\n"
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

            canonical_row = clinic_id_map.get(recommended_clinic_id, {})
            canonical_name = canonical_row.get("name") if isinstance(canonical_row, dict) else None
            if canonical_name:
                recommended_clinic = canonical_name

            parsed_providers = parsed.get("recommendedProviders", [])
            if not isinstance(parsed_providers, list):
                parsed_providers = []
            recommended_providers = self._normalize_providers_for_clinic(
                recommended_clinic_id,
                parsed_providers,
                clinic_id_map,
            )

            alternative_clinics = self._normalize_alternative_clinics(
                parsed.get("alternativeClinics"),
                clinic_id_map,
            )

            return {
                "recommendedClinic": recommended_clinic,
                "recommendedClinicId": recommended_clinic_id,
                "confidenceScore": score,
                "confidenceLevel": "high" if score >= 0.80 else "medium" if score >= 0.60 else "low",
                "rationale": parsed.get("rationale", ""),
                "alternativeClinics": alternative_clinics,
                "urgency": parsed.get("urgency", "routine"),
                "escalateForReview": parsed.get("escalateForReview", score < 0.65),
                "escalationReason": parsed.get("escalationReason"),
                "recommendedProviders": recommended_providers,
            }
        except Exception as exc:
            logging.warning("Routing recommendation failed: %s", exc)
            return self._kb_heuristic_routing(triage_profile, reason_for_referral)

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

    def _strip_lab_context_junk(self, text):
        """Remove checklist rows, fax footers, and problem-list tails merged into lab strings."""
        if not text or not isinstance(text, str):
            return text
        text = text.strip()
        if not text:
            return None

        if "\n" in text:
            lines_in = [ln.strip() for ln in text.splitlines() if ln.strip()]
            cleaned_lines = []
            for ln in lines_in:
                cl = self._strip_lab_report_headers(ln)
                if cl:
                    cleaned_lines.append(cl)
            s = "\n".join(cleaned_lines)
        else:
            s = self._strip_lab_report_headers(text)

        if not s:
            return None

        cut_at = len(s)
        junk_markers = [
            r";\s*\[X\]",
            r";\s*\[\s*\]",
            r"\s\[X\]\s",
            r"\s\[ \]\s",
            r"\bprior auth\b",
            r"\bdischarge summary\b",
            r"\bmed list\b",
            r"\bimaging reports\b",
            r"CONFIDENTIAL",
            r"EXTERNAL REFERRAL",
            r"JOHNS HOPKINS",
            r"Johns Hopkins",
            r"Page\s+\d+\s+of\s+\d+",
            r"\bSignature\b",
            r"\bper PCP records\b",
            r"\bformer smoker\b",
            r"\bT2DM\b",
            r"\),\s*T2DM\b",
            r"\*\*\*",
        ]
        for pat in junk_markers:
            m = re.search(pat, s, flags=re.IGNORECASE)
            if m and m.start() > 24:
                cut_at = min(cut_at, m.start())
        s = s[:cut_at].strip()
        s = re.split(r"(?:\n|^)\s*(?:\[X\]|\[ \])\s", s, maxsplit=1, flags=re.IGNORECASE)[0].strip()

        lines_out = []
        for ln in s.splitlines():
            if re.search(
                r"^\s*(?:\[X\])|CONFIDENTIAL|EXTERNAL REFERRAL|per PCP records|former smoker|T2DM\b",
                ln,
                re.IGNORECASE,
            ):
                break
            if re.search(r";\s*\[X\]", ln, re.IGNORECASE):
                ln = re.split(r";\s*\[X\]", ln, maxsplit=1, flags=re.IGNORECASE)[0].strip()
                if ln:
                    lines_out.append(ln)
                break
            lines_out.append(ln)
        s = "\n".join(lines_out) if lines_out else s
        s = s.rstrip(" ;–—-")
        return s or None

    def _expand_lab_runon_to_lines(self, text):
        """Split a single-line panel (Sodium: … Potassium: …) into one line per test."""
        if not text or not isinstance(text, str):
            return None
        raw = text.strip()
        if not raw:
            return None
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        if len(lines) >= 3 and all(":" in ln for ln in lines):
            return "\n".join(lines)
        single = " ".join(lines)
        single = re.sub(r"\s+", " ", single)
        pieces = re.split(
            r"\s+(?=(?:[A-Z][A-Za-z0-9()/\-\s]{0,55}|[a-z][a-zA-Z]{2,18}):\s*)",
            single,
        )
        pieces = [p.strip() for p in pieces if p.strip() and ":" in p]
        if len(pieces) <= 1:
            return raw
        return "\n".join(pieces)

    def _strip_single_lab_line_trailing_junk(self, line):
        """Remove OCR/model tails such as '; pending Consider' after the numeric result."""
        if not line or not isinstance(line, str):
            return line
        ln = line.strip()
        if not ln:
            return ln
        ln = re.sub(r"\s*;\s*pending\b.*$", "", ln, flags=re.IGNORECASE).strip()
        ln = re.sub(r"\s+\bpending\s+\w+\s*$", "", ln, flags=re.IGNORECASE).strip()
        ln = re.sub(r"\s*;\s*\bconsider\b\s*$", "", ln, flags=re.IGNORECASE).strip()
        ln = ln.rstrip(";").strip()
        ln = re.sub(r"\s*;\s*$", "", ln).strip()
        return ln

    def _dedupe_lab_lines_preserving_order(self, lines):
        """Drop duplicate analytes (e.g. repeated CK) keeping the first line."""
        seen = set()
        out = []
        for ln in lines:
            if not ln or ":" not in ln:
                continue
            label = ln.split(":", 1)[0].strip()
            key = re.sub(r"[^a-z0-9]+", "", label.lower())
            if not key:
                continue
            if key in seen:
                continue
            seen.add(key)
            out.append(ln)
        return out

    def _polish_lab_result_lines(self, text):
        """Per-line junk strip + dedupe after expansion."""
        if not text or not isinstance(text, str):
            return None
        raw_lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        cleaned = []
        for ln in raw_lines:
            cl = self._strip_single_lab_line_trailing_junk(ln)
            if cl and ":" in cl:
                cleaned.append(cl)
        deduped = self._dedupe_lab_lines_preserving_order(cleaned)
        return "\n".join(deduped) if deduped else None

    def _finalize_lab_results_display(self, text):
        if text is None:
            return None
        trimmed = self._strip_lab_context_junk(text if isinstance(text, str) else str(text))
        if not trimmed:
            return None
        expanded = self._expand_lab_runon_to_lines(trimmed)
        return self._polish_lab_result_lines(expanded)

    def _lab_results_from_candidate_only(self, lab_candidate):
        if lab_candidate is None:
            return None
        if isinstance(lab_candidate, dict):
            return self._format_laboratory_mapping(lab_candidate)
        if isinstance(lab_candidate, str):
            structured = self._try_parse_structured_loose(lab_candidate)
            if isinstance(structured, dict):
                return self._format_laboratory_mapping(structured)
            return self._normalize_clinical_phrase(lab_candidate)
        return None

    def _strip_other_provider_segment(self, text):
        if not text or not isinstance(text, str):
            return ""
        s = text.strip()
        s = re.split(
            r"(?:CONFIDENTIAL|EXTERNAL REFERRAL|Signature\b|Medical Record\s*—|Page\s+\d+\s+of\s+\d+)",
            s,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0]
        s = re.sub(r"\s*[—\-]{2,}\s*", " ", s)
        return s.strip(" ;,—-")

    def _looks_like_provider_name(self, s):
        if not s or not isinstance(s, str):
            return False
        t = s.strip()
        if len(t) < 3 or len(t) > 160:
            return False
        low = t.lower()
        banned = (
            "confidential",
            "external referral",
            "johns hopkins",
            "neurology confidential",
            "medical record",
            "fax",
            "referral —",
            "page 2 of",
            "page 1 of",
            "signature",
            "not identified",
        )
        if any(b in low for b in banned):
            return False
        if re.search(r"\[X\]|\[ \]", t):
            return False
        if re.search(r"\bdr\.?\s+[a-z]", low):
            return True
        if re.search(r"\b(md|do|d\.o\.|np|pa-c|pa)\b", low):
            return True
        if re.match(r"^[A-Z]\.?\s+[A-Za-z\-']{2,}", t):
            return True
        return False

    def _normalize_provider_identity_key(self, display_name):
        if not display_name:
            return ""
        s = display_name.lower()
        s = re.sub(r"\([^)]*\)", " ", s)
        s = re.sub(r"\b(dr\.?|doctor|prof\.?)\s+", "", s)
        s = re.sub(
            r"\b(md|do|d\.o\.|np|pa-c|pa|phd|mba|mph)\b\.?",
            "",
            s,
        )
        s = re.sub(r"[^a-z0-9]+", " ", s)
        return s.strip()

    def _provider_display_score(self, display):
        if not display:
            return 0
        score = len(display)
        if re.search(r"\([^)]{2,80}\)", display):
            score += 40
        if re.search(r"\b(MD|DO|NP|PA)\b", display):
            score += 15
        if re.search(r"\bDr\.?\s", display, flags=re.IGNORECASE):
            score += 10
        return score

    def _format_single_provider_row(self, row):
        if not isinstance(row, dict):
            return ""
        name = (row.get("name") or row.get("provider") or row.get("fullName") or "").strip()
        spec = (row.get("specialty") or row.get("specialtyName") or row.get("department") or "").strip()
        if not name and not spec:
            return ""
        if name and spec:
            if spec.lower() in name.lower() and "(" in name and ")" in name:
                return name
            return f"{name} ({spec})"
        return name or spec

    def _dedupe_provider_displays(self, displays):
        order = []
        best = {}
        for item in displays:
            item = self._strip_other_provider_segment(item)
            if not item or not self._looks_like_provider_name(item):
                continue
            key = self._normalize_provider_identity_key(item)
            if not key or len(key) < 4:
                continue
            if key not in best:
                order.append(key)
                best[key] = item
            elif self._provider_display_score(item) > self._provider_display_score(best[key]):
                best[key] = item
        if not order:
            return None
        # One provider per line — matches labResults-style multi-line triage fields.
        return "\n".join(best[k] for k in order)

    def _other_providers_from_structured_payload(self, payload):
        rows = payload.get("otherProvidersList")
        if rows is None:
            rows = payload.get("other_providers_list") or payload.get("careTeam")
        if not isinstance(rows, list) or not rows:
            return None
        displays = []
        for row in rows:
            if isinstance(row, dict):
                line = self._format_single_provider_row(row)
            else:
                line = str(row).strip()
            line = self._strip_other_provider_segment(line)
            if line and self._looks_like_provider_name(line):
                displays.append(line)
        return self._dedupe_provider_displays(displays)

    def _resolve_other_providers_for_triage(self, payload, source_text, candidate):
        structured = self._other_providers_from_structured_payload(payload)
        if structured:
            return structured
        built = (
            self._build_other_providers_summary(source_text, candidate) if source_text else None
        )
        if built:
            return built
        if isinstance(candidate, list):
            displays = []
            for row in candidate:
                if isinstance(row, dict):
                    line = self._format_single_provider_row(row)
                else:
                    line = str(row).strip()
                if line:
                    displays.append(line)
            return self._dedupe_provider_displays(displays)
        if isinstance(candidate, str):
            trimmed = self._strip_other_provider_segment(candidate)
            if trimmed and self._looks_like_provider_name(trimmed):
                parts = re.split(r"\s*;\s*", trimmed)
                displays = [p.strip() for p in parts if p.strip()]
                if len(displays) > 1:
                    return self._dedupe_provider_displays(displays)
                return trimmed
        return None

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
        other_providers_candidate = self._triage_mixed_field(
            payload,
            "otherProviders",
            "other_providers",
        )
        lab_results = self._finalize_lab_results_display(
            self._build_lab_results_summary(source_text, lab_candidate)
            if source_text
            else self._lab_results_from_candidate_only(lab_candidate),
        )
        other_providers = self._resolve_other_providers_for_triage(
            payload,
            source_text,
            other_providers_candidate,
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
        for label in [
            "other providers",
            "care team",
            "referring provider",
            "consulting provider",
            "primary care provider",
            "pcp",
        ]:
            section_candidates.extend(self._extract_section_values(source, label))

        sentence_candidates = []
        for sentence in self._split_sentences(source):
            lowered = sentence.lower()
            if (
                "dr." in lowered
                or "d.o." in lowered
                or "physician" in lowered
                or re.search(r"\b(md|do|np|pa)\b", lowered)
                or "provider" in lowered
                or "specialist" in lowered
                or "referred to" in lowered
                or "follows with" in lowered
                or re.search(r"\bpcp\b", lowered)
            ):
                sentence_candidates.append(sentence)

        raw_blobs = []
        if candidate_value:
            if isinstance(candidate_value, str):
                raw_blobs.append(candidate_value)
            elif isinstance(candidate_value, list):
                for row in candidate_value:
                    if isinstance(row, dict):
                        line = self._format_single_provider_row(row)
                        if line:
                            raw_blobs.append(line)
                    elif row:
                        raw_blobs.append(str(row))
            else:
                raw_blobs.append(str(candidate_value))
        raw_blobs.extend(section_candidates)
        raw_blobs.extend(sentence_candidates)

        displays = []
        for blob in raw_blobs:
            for part in re.split(r"(?:;|\n)+", str(blob or "")):
                cleaned = self._strip_other_provider_segment(part)
                if cleaned and self._looks_like_provider_name(cleaned):
                    displays.append(cleaned)

        return self._dedupe_provider_displays(displays)

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
        lab_results = self._finalize_lab_results_display(
            self._build_lab_results_summary(text_content, lab_results),
        )

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
