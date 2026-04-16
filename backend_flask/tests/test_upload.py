import pytest
import json
import os
import tempfile
import io

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

def test_upload_health(client):
    """Test upload health endpoint"""
    response = client.get('/api/upload/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'

def test_document_categories(client):
    """Test document categories endpoint"""
    response = client.get('/api/document-categories')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, dict)
    assert 'Referral Note' in data
    assert 'Clinical Notes' in data

def test_upload_documents_missing_fields(client):
    """Test upload with missing required fields"""
    response = client.post('/api/upload-documents')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_upload_documents_partial_fields(client):
    """Test upload with partial required fields"""
    response = client.post('/api/upload-documents',
        data={
            'fullName': 'John Doe',
            'age': '45'
        }
    )
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Missing required fields' in data['error']

def test_upload_documents_complete_fields(client):
    """Test upload with complete fields (no files)"""
    response = client.post('/api/upload-documents',
        data={
            'fullName': 'John Doe',
            'age': '45',
            'dateOfBirth': '1980-01-01',
            'address': '123 Main St',
            'phoneNumber': '555-123-4567'
        }
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['uploadedFiles'] == 0


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
            'fullName': 'Jane Doe',
            'age': '38',
            'dateOfBirth': '1987-04-05',
            'address': '456 Main St',
            'phoneNumber': '555-222-3333',
            'category_0_0': 'Referral Note',
            'subtype_0_0': 'General',
            'file_0_0': (io.BytesIO(b'fake pdf content'), 'smoke.pdf'),
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
        data={
            'fullName': 'John Doe',
            'age': '45',
            'dateOfBirth': '1980-01-01',
            'address': '123 Main St',
            'phoneNumber': '555-123-4567'
        }
    )

    assert response.status_code == 401
