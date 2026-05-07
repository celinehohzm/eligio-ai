from app.services.ai_service import AIService


def test_build_imaging_results_summary_prefers_impression_and_positive_findings():
    service = AIService()
    text = """
    EXAM: MRI Brain without contrast
    FINDINGS: No acute infarct. There is a 1.2 cm left frontal enhancing lesion with surrounding edema.
    IMPRESSION: Left frontal enhancing lesion with vasogenic edema, suspicious for metastasis.
    """

    summary = service._build_imaging_results_summary(text, None)

    assert summary is not None
    assert summary.startswith("Impression:")
    assert "suspicious for metastasis" in summary.lower()
    assert "Key positive finding:" in summary
    assert "no acute infarct" not in summary.lower()
    assert summary.count("Key positive finding:") == 1


def test_normalize_referral_triage_profile_filters_imaging_to_summary():
    service = AIService()
    payload = {
        "chiefComplaint": "Headache",
        "imagingResults": "MRI demonstrates 2 cm right temporal mass with edema.",
    }
    source_text = """
    FINDINGS: No hemorrhage. MRI demonstrates 2 cm right temporal mass with edema and local mass effect.
    IMPRESSION: Right temporal mass with surrounding edema.
    """

    profile = service._normalize_referral_triage_profile(payload, source_text=source_text)

    assert profile["imagingResults"] is not None
    assert profile["imagingResults"].startswith("Impression:")
    assert "right temporal mass" in profile["imagingResults"].lower()
    assert "no hemorrhage" not in profile["imagingResults"].lower()
    assert profile["imagingResults"].count("Key positive finding:") <= 1


def test_imaging_results_are_capped_to_one_sentence_impression_and_one_positive():
    service = AIService()
    text = """
    FINDINGS: MRI demonstrates left temporal edema. MRI also demonstrates 3 mm midline shift.
    IMPRESSION: Left temporal lesion with edema. Additional sentence that should be dropped.
    """

    summary = service._build_imaging_results_summary(text)

    assert summary is not None
    assert summary.startswith("Impression: Left temporal lesion with edema.")
    assert "Additional sentence that should be dropped" not in summary
    assert summary.count("Key positive finding:") == 1
    assert "midline shift" not in summary.lower()


def test_physical_exam_ignores_vitals_only_and_uses_most_recent_findings():
    service = AIService()
    payload = {
        "physicalExam": "Vitals stable BP 120/80 HR 70.",
    }
    source_text = """
    Physical Exam: Vitals stable BP 120/80, HR 74, Temp 98.3.
    Neurological Exam: Strength 5/5 throughout, sensation intact, gait steady.
    Physical Exam: Vitals stable BP 118/76, HR 72.
    Neurological Exam: Mild right deltoid weakness with diminished biceps reflex on the right.
    """

    profile = service._normalize_referral_triage_profile(payload, source_text=source_text)

    assert profile["physicalExam"] is not None
    assert "mild right deltoid weakness" in profile["physicalExam"].lower()
    assert "vitals stable" not in profile["physicalExam"].lower()


def test_physical_exam_returns_none_when_only_vitals_present():
    service = AIService()
    payload = {
        "physicalExam": "Vitals: BP 126/78, HR 68, SpO2 99%",
    }
    source_text = """
    Physical Exam: Vitals stable BP 126/78, HR 68, RR 16, Temp 98.1.
    Exam: Blood pressure and heart rate within normal limits.
    """

    profile = service._normalize_referral_triage_profile(payload, source_text=source_text)

    assert profile["physicalExam"] is None
