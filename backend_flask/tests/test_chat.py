import pytest
import json
import tempfile
import os

from app import create_app
from app.services import ai_service as ai_service_module
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


def login_demo_user(client):
    response = client.post(
        '/api/auth/login',
        json={
            'email': 'demo@eligio.ai',
            'password': 'demo123',
        }
    )
    assert response.status_code == 200
    return json.loads(response.data)['access_token']


def test_chat_health(client):
    """Test chat health endpoint"""
    response = client.get('/api/chat/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert 'service' in data


def test_ai_chat_basic(client):
    """Test basic AI chat endpoint"""
    access_token = login_demo_user(client)
    response = client.post('/api/ai-chat',
        json={
            'messages': [
                {'role': 'user', 'content': 'Hello, I have a headache'}
            ]
        },
        headers={'Authorization': f'Bearer {access_token}'},
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'content' in data
    assert len(data['content']) > 0


def test_ai_chat_empty_messages(client):
    """Test AI chat with empty messages"""
    access_token = login_demo_user(client)
    response = client.post(
        '/api/ai-chat',
        json={'messages': []},
        headers={'Authorization': f'Bearer {access_token}'},
    )
    assert response.status_code == 400


def test_ai_chat_no_messages(client):
    """Test AI chat with no messages field"""
    access_token = login_demo_user(client)
    response = client.post(
        '/api/ai-chat',
        json={},
        headers={'Authorization': f'Bearer {access_token}'},
    )
    assert response.status_code == 400


def test_ai_chat_invalid_json(client):
    """Test AI chat with invalid JSON"""
    access_token = login_demo_user(client)
    response = client.post('/api/ai-chat',
        data='invalid json',
        content_type='application/json',
        headers={'Authorization': f'Bearer {access_token}'},
    )
    assert response.status_code == 400


def test_ai_chat_returns_quota_error_when_openai_fails(client, monkeypatch):
    class DummyQuotaError(Exception):
        code = 'insufficient_quota'
        status_code = 429

    class DummyClient:
        class _Chat:
            class _Completions:
                @staticmethod
                def create(**kwargs):
                    raise DummyQuotaError('insufficient_quota')

            completions = _Completions()

        chat = _Chat()

    monkeypatch.setattr(ai_service_module.Config, 'OPENAI_API_KEY', 'sk-test')
    monkeypatch.setattr(client.application.ai_service, 'client', DummyClient())
    access_token = login_demo_user(client)

    response = client.post('/api/ai-chat',
        json={
            'messages': [
                {'role': 'user', 'content': 'Hello, I have a headache'}
            ]
        },
        headers={'Authorization': f'Bearer {access_token}'},
    )

    assert response.status_code == 503
    data = json.loads(response.data)
    assert 'quota exceeded' in data['error'].lower()


def test_ai_chat_forbids_referring_provider_role(client):
    suffix = "chatrole"
    register_response = client.post(
        '/api/auth/register',
        json={
            'email': f'{suffix}@example.com',
            'password': 'secret123',
            'name': 'Referring Provider',
            'role': ROLE_REFERRING_PROVIDER,
        }
    )
    assert register_response.status_code == 201

    login_response = client.post(
        '/api/auth/login',
        json={
            'email': f'{suffix}@example.com',
            'password': 'secret123',
        }
    )
    assert login_response.status_code == 200
    access_token = json.loads(login_response.data)['access_token']

    response = client.post(
        '/api/ai-chat',
        json={
            'messages': [
                {'role': 'user', 'content': 'Can I chat?'}
            ]
        },
        headers={'Authorization': f'Bearer {access_token}'},
    )

    assert response.status_code == 403
