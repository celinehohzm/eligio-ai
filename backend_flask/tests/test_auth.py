import json
import os
import tempfile
import time

import pytest

from app import create_app
from app.roles import ROLE_PATIENT_SCHEDULER, ROLE_REFERRING_PROVIDER


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


def test_auth_health(client):
    response = client.get('/api/auth/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert data['database_configured'] is True


def test_register_login_me_flow(client):
    suffix = str(int(time.time() * 1000))
    email = f"auth_{suffix}@example.com"
    password = "secret123"

    register_response = client.post(
        '/api/auth/register',
        json={
            'email': email,
            'password': password,
            'name': 'Auth Test',
            'role': ROLE_PATIENT_SCHEDULER,
        }
    )
    assert register_response.status_code == 201

    login_response = client.post(
        '/api/auth/login',
        json={
            'email': email,
            'password': password,
        }
    )
    assert login_response.status_code == 200
    login_data = json.loads(login_response.data)
    assert 'access_token' in login_data
    assert 'refresh_token' in login_data
    assert login_data['user']['email'] == email

    me_response = client.get(
        '/api/auth/me',
        headers={'Authorization': f"Bearer {login_data['access_token']}"},
    )
    assert me_response.status_code == 200
    me_data = json.loads(me_response.data)
    assert me_data['email'] == email
    assert me_data['name'] == 'Auth Test'


def test_register_duplicate_email(client):
    payload = {
        'email': 'duplicate@example.com',
        'password': 'secret123',
        'name': 'Duplicate User',
        'role': ROLE_REFERRING_PROVIDER,
    }

    first_response = client.post('/api/auth/register', json=payload)
    second_response = client.post('/api/auth/register', json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_login_invalid_credentials(client):
    response = client.post(
        '/api/auth/login',
        json={
            'email': 'missing@example.com',
            'password': 'wrong',
        }
    )
    assert response.status_code == 401


def test_refresh_and_logout_revocation(client):
    login_response = client.post(
        '/api/auth/login',
        json={
            'email': 'demo@eligio.ai',
            'password': 'demo123',
        }
    )
    assert login_response.status_code == 200
    login_data = json.loads(login_response.data)

    refresh_response = client.post(
        '/api/auth/refresh',
        headers={'Authorization': f"Bearer {login_data['refresh_token']}"},
    )
    assert refresh_response.status_code == 200
    refresh_data = json.loads(refresh_response.data)
    assert 'access_token' in refresh_data

    logout_response = client.post(
        '/api/auth/logout',
        headers={'Authorization': f"Bearer {login_data['access_token']}"},
    )
    assert logout_response.status_code == 200

    me_response = client.get(
        '/api/auth/me',
        headers={'Authorization': f"Bearer {login_data['access_token']}"},
    )
    assert me_response.status_code == 401


def test_register_short_password_rejected(client):
    response = client.post(
        '/api/auth/register',
        json={
            'email': 'shortpw@example.com',
            'password': '12345',
            'name': 'Short Password',
            'role': ROLE_PATIENT_SCHEDULER,
        }
    )
    assert response.status_code == 400


def test_register_invalid_role_rejected(client):
    response = client.post(
        '/api/auth/register',
        json={
            'email': 'invalidrole@example.com',
            'password': 'secret123',
            'name': 'Invalid Role',
            'role': 'administrator',
        }
    )
    assert response.status_code == 400


def test_register_receiving_provider_and_scheduler_alias(client):
    response = client.post(
        '/api/auth/register',
        json={
            'email': 'receivingscheduler@example.com',
            'password': 'secret123',
            'name': 'Receiving Scheduler',
            'role': 'Receiving provider and scheduler',
        }
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['user']['role'] == ROLE_PATIENT_SCHEDULER
