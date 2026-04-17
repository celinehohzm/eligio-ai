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
            'referralPacketText': 'Chief Complaint: headaches Evaluation: MRI recommended Diagnosis: Migraine',
            'referralPdf': (io.BytesIO(b'%PDF-1.4 fake content'), 'referral.pdf'),
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
    assert detail_data['referralInsights']['evaluation'] == 'MRI recommended'
    assert detail_data['referralInsights']['diagnosis'] == 'Migraine'
    assert 'referred by Dr Smith' in detail_data['summaryLine']
