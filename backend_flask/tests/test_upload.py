import pytest
import json
import os
import tempfile
from app import create_app

@pytest.fixture
def app():
    """Create test app"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
    return app

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
