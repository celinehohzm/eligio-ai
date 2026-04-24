from app.services.pdf_ocr_service import PDFOCRService


def build_text_pdf(text):
    def escape_pdf_text(value):
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    stream_lines = ["BT", "/F1 12 Tf", "72 720 Td", "14 TL"]
    for line in text.splitlines():
        stream_lines.append(f"({escape_pdf_text(line)}) Tj")
        stream_lines.append("T*")
    stream_lines.append("ET")
    stream = "\n".join(stream_lines).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
        ),
        f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1") + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    parts = [b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"]
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(sum(len(part) for part in parts))
        parts.append(f"{index} 0 obj\n".encode("latin-1") + obj + b"\nendobj\n")

    xref_offset = sum(len(part) for part in parts)
    xref_entries = [b"xref\n0 6\n0000000000 65535 f \n"]
    for offset in offsets[1:]:
        xref_entries.append(f"{offset:010d} 00000 n \n".encode("latin-1"))

    trailer = (
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"
        + str(xref_offset).encode("latin-1")
        + b"\n%%EOF\n"
    )
    return b"".join(parts + xref_entries + [trailer])


def test_process_referral_pdf_uses_native_text_when_available():
    pdf_bytes = build_text_pdf(
        "Referral packet\nChief Complaint: Headache\nEvaluation: Neurologic exam\nDiagnosis: Migraine"
    )
    service = PDFOCRService(
        {
            "ENABLE_PDF_OCR": True,
            "PDF_OCR_TRIGGER_MIN_CHARS": 16,
        }
    )

    result = service.process_referral_pdf(pdf_bytes)

    assert result.error is None
    assert result.ocr_applied is False
    assert result.stored_pdf_bytes == pdf_bytes
    assert "Chief Complaint: Headache" in result.extracted_text


def test_process_referral_pdf_accepts_blank_scanned_pdf_without_ocr(monkeypatch):
    pdf_bytes = build_text_pdf("")
    service = PDFOCRService(
        {
            "ENABLE_PDF_OCR": True,
            "PDF_OCR_TRIGGER_MIN_CHARS": 16,
        }
    )
    monkeypatch.setattr(
        service,
        "get_dependency_status",
        lambda: {
            "enabled": True,
            "available": False,
            "reason": "OCRmyPDF is not installed in the backend environment",
        },
    )

    result = service.process_referral_pdf(pdf_bytes)

    assert result.error is None
    assert result.ocr_applied is False
    assert result.extracted_text == ""
    assert result.stored_pdf_bytes == pdf_bytes


def test_process_referral_pdf_returns_ocr_output_when_fallback_succeeds(monkeypatch):
    scanned_pdf = build_text_pdf("")
    ocr_pdf = build_text_pdf(
        "Referral packet\nChief Complaint: Headache\nEvaluation: Neurologic exam\nDiagnosis: Migraine"
    )
    service = PDFOCRService(
        {
            "ENABLE_PDF_OCR": True,
            "PDF_OCR_TRIGGER_MIN_CHARS": 16,
        }
    )
    monkeypatch.setattr(
        service,
        "get_dependency_status",
        lambda: {
            "enabled": True,
            "available": True,
            "reason": None,
        },
    )
    monkeypatch.setattr(service, "_run_ocr", lambda file_bytes: (ocr_pdf, None))

    result = service.process_referral_pdf(scanned_pdf)

    assert result.error is None
    assert result.ocr_applied is True
    assert result.stored_pdf_bytes == ocr_pdf
    assert "Diagnosis: Migraine" in result.extracted_text
