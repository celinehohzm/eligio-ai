import io
import json
import os
import tempfile

import pytest

from app import create_app
from app.roles import ROLE_PATIENT_SCHEDULER, ROLE_REFERRING_PROVIDER


@pytest.fixture
def app():
    temp_dir = tempfile.mkdtemp()
    return create_app({
        'TESTING': True,
        'UPLOAD_FOLDER': os.path.join(temp_dir, 'uploads'),
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{os.path.join(temp_dir, 'test.db')}",
        'OPENAI_API_KEY': '',
    })


@pytest.fixture
def client(app):
    return app.test_client()


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


def register_and_login(client, email, role):
    register_response = client.post(
        '/api/auth/register',
        json={
            'email': email,
            'password': 'secret123',
            'name': email.split('@')[0],
            'role': role,
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        '/api/auth/login',
        json={
            'email': email,
            'password': 'secret123',
        },
    )
    assert login_response.status_code == 200
    return json.loads(login_response.data)['access_token']


def upload_referral(client, token):
    response = client.post(
        '/api/upload-documents',
        data={
            'fullName': 'Jane Doe',
            'dateOfBirth': '1988-08-09',
            'address': '123 Main St, Baltimore, MD',
            'phoneNumber': '555-111-2222',
            'doctorName': 'Smith',
            'reasonForReferral': 'Persistent headaches',
            'referralPdf': (
                io.BytesIO(
                    build_text_pdf(
                        'Referral packet\nChief Complaint: headaches\nEvaluation: MRI recommended\nDiagnosis: Migraine'
                    )
                ),
                'referral.pdf',
            ),
        },
        headers={'Authorization': f'Bearer {token}'},
        content_type='multipart/form-data',
    )
    assert response.status_code == 200
    return json.loads(response.data)['submissionId']


def test_referral_search_requires_patient_scheduler_role(app, client):
    token = register_and_login(client, 'provider@example.com', ROLE_REFERRING_PROVIDER)

    response = client.get(
        '/api/referrals',
        headers={'Authorization': f'Bearer {token}'},
    )

    assert response.status_code == 403


def test_patient_scheduler_can_search_and_view_referrals(app, client):
    app.ai_service.extract_referral_summary = lambda text_content, reason_for_referral=None: {
        'chiefComplaint': 'Persistent headaches',
        'evaluation': 'MRI recommended',
        'diagnosis': 'Migraine',
    }
    app.ai_service.extract_referral_triage_profile = lambda text_content, reason_for_referral=None: {
        'insurance': 'Blue Cross PPO',
        'medicalRecordNumber': 'MRN-44521',
        'chiefComplaint': 'Persistent headaches',
        'historyOfPresentIllness': 'Headaches began six months ago and are worsening weekly.',
        'physicalExam': 'Neurological exam is nonfocal.',
        'imagingResults': 'MRI brain was recommended but not yet completed.',
        'labResults': 'B12 and TSH were normal.',
        'otherProviders': 'Currently follows with primary care and ophthalmology.',
    }

    upload_token = register_and_login(client, 'referrer@example.com', ROLE_REFERRING_PROVIDER)
    submission_id = upload_referral(client, upload_token)

    scheduler_token = register_and_login(client, 'scheduler@example.com', ROLE_PATIENT_SCHEDULER)

    search_response = client.get(
        '/api/referrals?q=Jane',
        headers={'Authorization': f'Bearer {scheduler_token}'},
    )
    assert search_response.status_code == 200
    search_data = json.loads(search_response.data)
    assert len(search_data['items']) == 1
    assert search_data['items'][0]['id'] == submission_id
    assert 'Persistent headaches' in search_data['items'][0]['summaryLine']

    detail_response = client.get(
        f'/api/referrals/{submission_id}',
        headers={'Authorization': f'Bearer {scheduler_token}'},
    )
    assert detail_response.status_code == 200
    detail_data = json.loads(detail_response.data)
    assert detail_data['patientInfo']['fullName'] == 'Jane Doe'
    assert detail_data['patientInfo']['doctorName'] == 'Smith'
    assert detail_data['patientInfo']['insurance'] == 'Blue Cross PPO'
    assert detail_data['patientInfo']['medicalRecordNumber'] == 'MRN-44521'
    assert detail_data['referralInsights']['evaluation'] == 'MRI recommended'
    assert detail_data['referralInsights']['diagnosis'] == 'Migraine'
    assert detail_data['triageHighlights']['historyOfPresentIllness'] == (
        'Headaches began six months ago and are worsening weekly.'
    )
    assert detail_data['triageHighlights']['physicalExam'] == 'Neurological exam is nonfocal.'
    assert detail_data['triageHighlights']['imagingResults'] == 'MRI brain was recommended but not yet completed.'
    assert detail_data['triageHighlights']['labResults'] == 'B12 and TSH were normal.'
    assert detail_data['triageHighlights']['otherProviders'] == (
        'Currently follows with primary care and ophthalmology.'
    )
    assert 'referred by Dr Smith' in detail_data['summaryLine']


def test_patient_scheduler_can_fetch_original_referral_pdf(app, client):
    app.ai_service.extract_referral_summary = lambda text_content, reason_for_referral=None: {
        'chiefComplaint': 'Persistent headaches',
        'evaluation': 'MRI recommended',
        'diagnosis': 'Migraine',
    }
    app.ai_service.extract_referral_triage_profile = lambda text_content, reason_for_referral=None: {
        'insurance': None,
        'medicalRecordNumber': None,
        'chiefComplaint': 'Persistent headaches',
        'historyOfPresentIllness': None,
        'physicalExam': None,
        'imagingResults': None,
        'labResults': None,
        'otherProviders': None,
    }

    upload_token = register_and_login(client, 'referrer_pdf@example.com', ROLE_REFERRING_PROVIDER)
    submission_id = upload_referral(client, upload_token)

    scheduler_token = register_and_login(client, 'scheduler_pdf@example.com', ROLE_PATIENT_SCHEDULER)

    detail_response = client.get(
        f'/api/referrals/{submission_id}',
        headers={'Authorization': f'Bearer {scheduler_token}'},
    )
    assert detail_response.status_code == 200
    detail_data = json.loads(detail_response.data)
    document_id = detail_data['documents'][0]['id']

    document_response = client.get(
        f'/api/referrals/{submission_id}/documents/{document_id}/content',
        headers={'Authorization': f'Bearer {scheduler_token}'},
    )

    assert document_response.status_code == 200
    assert document_response.mimetype == 'application/pdf'
    assert document_response.data.startswith(b'%PDF-')
