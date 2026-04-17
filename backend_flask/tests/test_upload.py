import io
import json
import os
import tempfile

import pytest

from app import create_app
from app.api import upload as upload_api
from app.roles import ROLE_REFERRING_PROVIDER


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


def test_upload_health(client):
    response = client.get('/api/upload/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'


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
            'referralPdf': (io.BytesIO(b'%PDF-1.4 fake content'), 'referral.pdf'),
        },
        headers={'Authorization': f'Bearer {token}'},
        content_type='multipart/form-data',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['uploadedFiles'] == 1


def test_upload_documents_rejects_request_without_token_or_api_key_when_api_key_configured(client, monkeypatch):
    monkeypatch.setattr(upload_api.Config, 'UPLOAD_API_KEY', 'secret-upload-key')

    response = client.post(
        '/api/upload-documents',
        data=valid_referral_form(),
    )

    assert response.status_code == 401
