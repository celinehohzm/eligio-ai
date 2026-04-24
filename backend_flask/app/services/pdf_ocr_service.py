import importlib.util
import io
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from typing import Dict, Optional

from PyPDF2 import PdfReader


GHOSTSCRIPT_COMMANDS = ("gs", "gswin64c", "gswin32c")


@dataclass
class ReferralPDFProcessingResult:
    extracted_text: Optional[str]
    stored_pdf_bytes: Optional[bytes]
    error: Optional[str] = None
    ocr_applied: bool = False


class PDFOCRService:
    """Extract searchable text from PDFs, using OCR as a fallback."""

    def __init__(self, config):
        self.enabled = config.get("ENABLE_PDF_OCR", True)
        self.language = config.get("PDF_OCR_LANGUAGE", "eng")
        self.trigger_min_chars = max(1, int(config.get("PDF_OCR_TRIGGER_MIN_CHARS", 32)))
        self.tesseract_timeout = max(1, int(config.get("PDF_OCR_TESSERACT_TIMEOUT", 180)))
        default_process_timeout = self.tesseract_timeout + 60
        self.process_timeout = max(
            default_process_timeout,
            int(config.get("PDF_OCR_PROCESS_TIMEOUT", default_process_timeout)),
        )

    def get_dependency_status(self) -> Dict[str, object]:
        package_available = importlib.util.find_spec("ocrmypdf") is not None
        tesseract_command = shutil.which("tesseract")
        ghostscript_command = next(
            (command for command in GHOSTSCRIPT_COMMANDS if shutil.which(command)),
            None,
        )

        status = {
            "enabled": self.enabled,
            "pythonPackageAvailable": package_available,
            "tesseractBinary": tesseract_command,
            "ghostscriptBinary": ghostscript_command,
            "available": False,
            "reason": None,
        }

        if not self.enabled:
            status["reason"] = "PDF OCR is disabled"
            return status

        if not package_available:
            status["reason"] = "OCRmyPDF is not installed in the backend environment"
            return status

        if not tesseract_command:
            status["reason"] = "Tesseract is not installed on the server PATH"
            return status

        if not ghostscript_command:
            status["reason"] = "Ghostscript is not installed on the server PATH"
            return status

        status["available"] = True
        return status

    def process_referral_pdf(self, file_bytes: bytes) -> ReferralPDFProcessingResult:
        if not self._looks_like_pdf(file_bytes):
            return ReferralPDFProcessingResult(
                extracted_text=None,
                stored_pdf_bytes=None,
                error="Uploaded file is not a valid PDF",
            )

        extracted_text = self._extract_text(file_bytes)
        extracted_text_length = len(extracted_text or "")
        if extracted_text_length >= self.trigger_min_chars:
            return ReferralPDFProcessingResult(
                extracted_text=extracted_text,
                stored_pdf_bytes=file_bytes,
            )

        dependency_status = self.get_dependency_status()
        if not dependency_status["available"]:
            logging.info(
                "Skipping OCR fallback because dependencies are unavailable: %s",
                dependency_status["reason"],
            )
            return ReferralPDFProcessingResult(
                extracted_text=extracted_text,
                stored_pdf_bytes=file_bytes,
            )

        ocr_pdf_bytes, ocr_error = self._run_ocr(file_bytes)
        if ocr_error:
            logging.warning(
                "Falling back to original PDF after OCR failure: %s",
                ocr_error,
            )
            return ReferralPDFProcessingResult(
                extracted_text=extracted_text,
                stored_pdf_bytes=file_bytes,
            )

        ocr_text = self._extract_text(ocr_pdf_bytes)
        if ocr_text:
            return ReferralPDFProcessingResult(
                extracted_text=ocr_text,
                stored_pdf_bytes=ocr_pdf_bytes,
                ocr_applied=True,
            )

        if extracted_text:
            logging.warning("OCR completed but did not improve text extraction.")
            return ReferralPDFProcessingResult(
                extracted_text=extracted_text,
                stored_pdf_bytes=file_bytes,
            )

        return ReferralPDFProcessingResult(
            extracted_text=None,
            stored_pdf_bytes=file_bytes,
        )

    def _looks_like_pdf(self, file_bytes: bytes) -> bool:
        if not file_bytes:
            return False

        # The PDF header is allowed to appear within the first 1024 bytes.
        header_window = file_bytes[:1024]
        return b"%PDF-" in header_window

    def _extract_text(self, file_bytes: bytes) -> Optional[str]:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text() or ""
                page_text = page_text.strip()
                if page_text:
                    text_parts.append(page_text)
            return re.sub(r"\s+", " ", " ".join(text_parts)).strip()
        except Exception as exc:
            logging.warning("PDF text extraction failed: %s", exc)
            return None

    def _run_ocr(self, file_bytes: bytes):
        try:
            with tempfile.TemporaryDirectory(prefix="eligio-ocr-") as temp_dir:
                input_path = os.path.join(temp_dir, "input.pdf")
                output_path = os.path.join(temp_dir, "output.pdf")

                with open(input_path, "wb") as input_file:
                    input_file.write(file_bytes)

                command = [
                    sys.executable,
                    "-m",
                    "ocrmypdf",
                    "--skip-text",
                    "--output-type",
                    "pdf",
                    "--language",
                    self.language,
                    "--jobs",
                    "1",
                    "--tesseract-timeout",
                    str(self.tesseract_timeout),
                    "--quiet",
                    input_path,
                    output_path,
                ]
                completed = subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    check=False,
                    timeout=self.process_timeout,
                )
                if completed.returncode != 0:
                    error_output = (completed.stderr or completed.stdout or "").strip()
                    if error_output:
                        logging.warning(
                            "OCRmyPDF failed with exit code %s: %s",
                            completed.returncode,
                            error_output,
                        )
                    return None, "Referral PDF OCR processing failed"

                with open(output_path, "rb") as output_file:
                    return output_file.read(), None
        except subprocess.TimeoutExpired:
            logging.warning("OCRmyPDF timed out after %s seconds", self.process_timeout)
            return None, "Referral PDF OCR processing timed out"
        except Exception as exc:
            logging.warning("OCRmyPDF execution failed: %s", exc)
            return None, "Referral PDF OCR processing failed"
