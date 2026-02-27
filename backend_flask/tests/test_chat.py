import pytest
import json
import tempfile
import os

from app import create_app

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

def test_chat_health(client):
    """Test chat health endpoint"""
    response = client.get('/api/chat/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert 'service' in data

def test_ai_chat_basic(client):
    """Test basic AI chat endpoint"""
    response = client.post('/api/ai-chat', 
        json={
            'messages': [
                {'role': 'user', 'content': 'Hello, I have a headache'}
            ]
        }
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'content' in data
    assert len(data['content']) > 0

def test_ai_chat_empty_messages(client):
    """Test AI chat with empty messages"""
    response = client.post('/api/ai-chat', json={'messages': []})
    assert response.status_code == 400

def test_ai_chat_no_messages(client):
    """Test AI chat with no messages field"""
    response = client.post('/api/ai-chat', json={})
    assert response.status_code == 400

def test_ai_chat_invalid_json(client):
    """Test AI chat with invalid JSON"""
    response = client.post('/api/ai-chat', 
        data='invalid json',
        content_type='application/json'
    )
    assert response.status_code == 400
