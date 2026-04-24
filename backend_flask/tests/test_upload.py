import io
import json
import os
import tempfile

import pytest

from app import create_app
from app.api import upload as upload_api
from app.models import Document
from app.roles import ROLE_REFERRING_PROVIDER
from app.services.pdf_ocr_service import ReferralPDFProcessingResult


@pytest.fixture
def app():
    """Create test app"""
    temp_dir = tempfile.mkdtemp()
    return create_app({
        'TESTING': True,
        'UPLOAD_FOLDER': os.path.join(temp_dir, 'uploads'),
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{os.path.join(temp_dir, 'test.db')}",
        'OPENAI_API_KEY': '',
    })


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


def valid_referral_form():
    return {
        'fullName': 'Jane Doe',
        'dateOfBirth': '1987-04-05',
        'address': '123 Main St, Baltimore, MD',
        'phoneNumber': '555-111-2222',
        'doctorName': 'Dr. Smith',
        'reasonForReferral': 'Neurology consultation',
    }


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


def test_upload_health(client):
    response = client.get('/api/upload/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert 'pdf_ocr' in data


def test_document_categories(client):
    response = client.get('/api/document-categories')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data == {'Referral PDF': ['Referral Intake']}


def test_upload_documents_missing_fields(client):
    response = client.post('/api/upload-documents')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Missing required fields' in data['error']


def test_upload_documents_requires_pdf(client):
    response = client.post('/api/upload-documents', data=valid_referral_form())
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Exactly one PDF file is required' in data['error']


def test_upload_documents_rejects_non_pdf(client):
    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (io.BytesIO(b'not pdf'), 'referral.docx'),
        },
        content_type='multipart/form-data',
    )
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Only PDF files are allowed' in data['error']


def test_upload_documents_rejects_invalid_pdf_bytes(client):
    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (io.BytesIO(b'not a real pdf'), 'referral.pdf'),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'valid PDF' in data['error']


def test_upload_documents_accepts_pdf_with_leading_bytes(client):
    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (
                io.BytesIO(b"\n\n" + build_text_pdf("Referral note\nDiagnosis: Migraine")),
                'referral.pdf',
            ),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True


def test_upload_documents_accepts_any_pdf_content(client):
    lease_pdf = build_text_pdf(
        "LEASE AGREEMENT\nTenant agrees to pay rent.\nSecurity deposit is due before occupancy."
    )
    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPacketText': 'Chief Complaint: Headache Diagnosis: Migraine',
            'referralPdf': (io.BytesIO(lease_pdf), 'lease_agreement.pdf'),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True


def test_upload_documents_accepts_placeholder_metadata(client):
    referral_pdf = build_text_pdf(
        "Referral for patient with Chief Complaint: Headache. Evaluation: Neurologic exam. Diagnosis: Migraine."
    )
    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'fullName': 'xx',
            'doctorName': 'x',
            'reasonForReferral': 'xx',
            'referralPdf': (io.BytesIO(referral_pdf), 'referral.pdf'),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True


def test_upload_documents_rejects_multiple_files(client):
    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (io.BytesIO(b'pdf one'), 'one.pdf'),
            'secondPdf': (io.BytesIO(b'pdf two'), 'two.pdf'),
        },
        content_type='multipart/form-data',
    )
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Exactly one PDF file is required' in data['error']


def test_upload_documents_allows_referring_provider_when_api_key_configured(client, monkeypatch):
    monkeypatch.setattr(upload_api.Config, 'UPLOAD_API_KEY', 'secret-upload-key')

    register_response = client.post(
        '/api/auth/register',
        json={
            'email': 'ref_provider@example.com',
            'password': 'secret123',
            'name': 'Referring Provider',
            'role': ROLE_REFERRING_PROVIDER,
        }
    )
    assert register_response.status_code == 201

    login_response = client.post(
        '/api/auth/login',
        json={
            'email': 'ref_provider@example.com',
            'password': 'secret123',
        }
    )
    assert login_response.status_code == 200
    token = json.loads(login_response.data)['access_token']

    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (
                io.BytesIO(
                    build_text_pdf(
                        "Referral note\nChief Complaint: Headache\nEvaluation: Neurologic exam\nDiagnosis: Migraine"
                    )
                ),
                'referral.pdf',
            ),
        },
        headers={'Authorization': f'Bearer {token}'},
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['uploadedFiles'] == 1


def test_upload_documents_accepts_server_extracted_referral_pdf_without_frontend_text(client):
    register_response = client.post(
        '/api/auth/register',
        json={
            'email': 'provider_pdf_only@example.com',
            'password': 'secret123',
            'name': 'Provider PDF Only',
            'role': ROLE_REFERRING_PROVIDER,
        }
    )
    assert register_response.status_code == 201

    login_response = client.post(
        '/api/auth/login',
        json={
            'email': 'provider_pdf_only@example.com',
            'password': 'secret123',
        }
    )
    assert login_response.status_code == 200
    token = json.loads(login_response.data)['access_token']

    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (
                io.BytesIO(
                    build_text_pdf(
                        "Referral packet\nPatient seen in neurology clinic.\nChief Complaint: Headache\nEvaluation: Neurologic exam\nDiagnosis: Migraine"
                    )
                ),
                'referral.pdf',
            ),
        },
        headers={'Authorization': f'Bearer {token}'},
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True


def test_upload_documents_uses_ocr_fallback_and_stores_searchable_pdf(app, client):
    ocr_output_pdf = build_text_pdf(
        "Referral packet\nChief Complaint: Headache\nEvaluation: Neurologic exam\nDiagnosis: Migraine"
    )

    app.pdf_ocr_service.process_referral_pdf = lambda file_bytes: ReferralPDFProcessingResult(
        extracted_text=(
            "Referral packet Chief Complaint: Headache Evaluation: Neurologic exam "
            "Diagnosis: Migraine"
        ),
        stored_pdf_bytes=ocr_output_pdf,
        ocr_applied=True,
    )

    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (io.BytesIO(build_text_pdf("")), 'scanned-referral.pdf'),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['ocrApplied'] is True

    with app.app_context():
        document = Document.query.one()
        assert document.size == len(ocr_output_pdf)
        with open(document.file_path, 'rb') as saved_file:
            assert saved_file.read() == ocr_output_pdf


def test_upload_documents_accepts_scanned_pdf_when_ocr_is_unavailable(app, client):
    app.pdf_ocr_service.process_referral_pdf = lambda file_bytes: ReferralPDFProcessingResult(
        extracted_text=None,
        stored_pdf_bytes=file_bytes,
    )

    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (io.BytesIO(build_text_pdf("")), 'scanned-referral.pdf'),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['ocrApplied'] is False


def test_upload_documents_rejects_request_without_token_or_api_key_when_api_key_configured(client, monkeypatch):
    monkeypatch.setattr(upload_api.Config, 'UPLOAD_API_KEY', 'secret-upload-key')

    response = client.post(
        '/api/upload-documents',
        data=valid_referral_form(),
    )

    assert response.status_code == 401


def test_upload_documents_returns_json_for_large_files(app, client):
    app.config['MAX_CONTENT_LENGTH'] = 1024

    response = client.post(
        '/api/upload-documents',
        data={
            **valid_referral_form(),
            'referralPdf': (io.BytesIO(build_text_pdf("A" * 5000)), 'large.pdf'),
        },
        content_type='multipart/form-data',
    )

    assert response.status_code == 413
    data = json.loads(response.data)
    assert 'Maximum allowed size is' in data['error']
