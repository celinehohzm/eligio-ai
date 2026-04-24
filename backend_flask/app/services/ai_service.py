from openai import OpenAI
from config.config import Config
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
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content":
                        """
                            You extract structured neurology referral intake details for patient schedulers.
                            Return strict JSON with exactly these keys:
                            - insurance
                            - medicalRecordNumber
                            - chiefComplaint
                            - historyOfPresentIllness
                            - physicalExam
                            - imagingResults
                            - labResults
                            - otherProviders
                            Use null if a field is not clearly stated. Do not invent any details.
                        """,
                    },
                    {
                        "role": "user",
                        "content":
                        f"""
                        Reason for referral: {reason_for_referral or 'Not provided'}

                        Referral packet text:
                        {truncated_text}
                        """,
                    },
                ],
                temperature=0.1,
                max_tokens=700,
            )

            content = response.choices[0].message.content or "{}"
            parsed = self._parse_json_object(content)
            return self._normalize_referral_triage_profile(parsed, reason_for_referral)
        except Exception as exc:
            logging.warning("Falling back to heuristic triage extraction: %s", exc)
            return self._heuristic_referral_triage_profile(normalized_text, reason_for_referral)

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

    def _normalize_referral_triage_profile(self, payload, reason_for_referral=None):
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
            "physicalExam": self._clean_payload_value(
                payload,
                "physicalExam",
                "physical_exam",
            ),
            "imagingResults": self._clean_payload_value(
                payload,
                "imagingResults",
                "imaging_results",
            ),
            "labResults": self._clean_payload_value(
                payload,
                "labResults",
                "lab_results",
            ),
            "otherProviders": self._clean_payload_value(
                payload,
                "otherProviders",
                "other_providers",
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

    def _heuristic_referral_summary(self, text_content, reason_for_referral=None):
        flattened_text = re.sub(r"\s+", " ", text_content or "").strip()
        return {
            "chiefComplaint": self._extract_section_value(flattened_text, "chief complaint")
            or self._extract_section_value(flattened_text, "chief concern")
            or (reason_for_referral or "").strip()
            or None,
            "evaluation": self._extract_section_value(flattened_text, "evaluation")
            or self._extract_section_value(flattened_text, "assessment"),
            "diagnosis": self._extract_section_value(flattened_text, "diagnosis")
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

    def _heuristic_referral_triage_profile(self, text_content, reason_for_referral=None):
        flattened_text = re.sub(r"\s+", " ", text_content or "").strip()

        insurance = self._extract_pattern_value(
            flattened_text,
            [
                r"(?:insurance|payer|plan)\s*[:#-]?\s*([A-Za-z][A-Za-z0-9 &/()\-]{2,80})",
            ],
        )
        medical_record_number = self._extract_pattern_value(
            flattened_text,
            [
                r"(?:medical record number|mrn)\s*[:#-]?\s*([A-Za-z0-9\-]+)",
            ],
        )

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

        physical_exam = (
            self._extract_section_value(flattened_text, "physical exam")
            or self._extract_section_value(flattened_text, "neurological exam")
            or self._extract_section_value(flattened_text, "exam")
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

        imaging_results = (
            self._extract_section_value(flattened_text, "imaging")
            or self._extract_section_value(flattened_text, "imaging results")
            or self._extract_section_value(flattened_text, "radiology")
            or self._extract_sentences_by_keywords(
                flattened_text,
                ["mri", "ct", "scan", "imaging", "radiology", "x-ray"],
            )
        )

        lab_results = (
            self._extract_section_value(flattened_text, "lab results")
            or self._extract_section_value(flattened_text, "labs")
            or self._extract_section_value(flattened_text, "laboratory")
            or self._extract_sentences_by_keywords(
                flattened_text,
                ["lab", "cbc", "cmp", "tsh", "b12", "esr", "crp", "a1c", "ck", "csf"],
            )
        )

        other_providers = (
            self._extract_section_value(flattened_text, "other providers")
            or self._extract_section_value(flattened_text, "care team")
            or self._extract_sentences_by_keywords(
                flattened_text,
                ["dr.", "provider", "specialist", "follows with", "seeing", "referred to"],
            )
        )

        return {
            "insurance": insurance,
            "medicalRecordNumber": medical_record_number,
            "chiefComplaint": chief_complaint,
            "historyOfPresentIllness": history_of_present_illness,
            "physicalExam": physical_exam,
            "imagingResults": imaging_results,
            "labResults": lab_results,
            "otherProviders": other_providers,
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
