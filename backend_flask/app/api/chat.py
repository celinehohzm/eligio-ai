from flask import Blueprint, request, jsonify, Response
import json
import logging
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import limiter
from app.models import User
from app.roles import can_access_chat
from app.services.ai_service import AIService, AIServiceInitError

chat_bp = Blueprint('chat', __name__)
ai_service = AIService()


def _openai_failure_response(exc):
    message = str(exc)
    lowered = message.lower()
    error_code = getattr(exc, "code", None)
    status_code = getattr(exc, "status_code", None)

    if error_code == "insufficient_quota" or "insufficient_quota" in lowered:
        return jsonify({
            'error': 'OpenAI quota exceeded for the configured API key. Add billing/credits or replace the key.'
        }), 503

    if status_code == 401 or "invalid api key" in lowered:
        return jsonify({
            'error': 'OpenAI authentication failed. Update the configured API key.'
        }), 502

    if status_code == 429:
        return jsonify({
            'error': 'OpenAI rate limit exceeded. Please try again shortly.'
        }), 429

    if "connection error" in lowered:
        return jsonify({
            'error': 'OpenAI connection failed. Please try again shortly.'
        }), 502

    return jsonify({
        'error': 'OpenAI chat is unavailable right now.'
    }), 502


def _openai_init_failure_response():
    return jsonify({
        'error': 'OpenAI client initialization failed. Check the configured API key and deployment settings.'
    }), 502


@chat_bp.route('/ai-chat', methods=['POST'])
@jwt_required()
@limiter.limit("30 per minute")
def ai_chat():
    """Handle AI chat requests for patient triaging"""
    try:
        current_email = get_jwt_identity()
        user = User.query.filter_by(email=current_email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if not can_access_chat(user.role):
            return jsonify({'error': 'Chat access is not available for your role'}), 403

        data = request.get_json(silent=True)

        if not data or 'messages' not in data:
            return jsonify({'error': 'Messages are required'}), 400

        messages = data['messages']

        # Validate messages format
        if not isinstance(messages, list) or len(messages) == 0:
            return jsonify({'error': 'Messages must be a non-empty array'}), 400

        accept_header = request.headers.get('Accept', '')
        wants_streaming = 'text/stream' in accept_header

        if wants_streaming:
            return generate_streaming_response(messages)

        return generate_regular_response(messages)

    except Exception as e:
        logging.error(f"Error in ai_chat: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


def generate_streaming_response(messages):
    """Generate streaming response using the shared AI service."""
    try:
        response = ai_service.generate_chat_response(messages, stream=True)
        if isinstance(response, str):
            return generate_mock_streaming_response(response)

        def generate():
            for chunk in response:
                if not chunk.choices:
                    continue

                choice = chunk.choices[0]
                delta = getattr(choice, 'delta', None)
                content = getattr(delta, 'content', None) if delta else None

                if content:
                    data = {'choices': [{'delta': {'content': content}}]}
                    yield f"data: {json.dumps(data)}\n\n"
                elif getattr(choice, 'finish_reason', None) == 'stop':
                    yield "data: [DONE]\n\n"

        return Response(generate(), mimetype='text/stream')

    except AIServiceInitError:
        return _openai_init_failure_response()
    except Exception as e:
        logging.error(f"Streaming error: {str(e)}")
        return _openai_failure_response(e)


def generate_mock_streaming_response(mock_response):
    """Generate streaming response from a prebuilt mock message."""

    def generate():
        chunk_size = 80
        for i in range(0, len(mock_response), chunk_size):
            content = mock_response[i:i + chunk_size]
            data = {'choices': [{'delta': {'content': content}}]}
            yield f"data: {json.dumps(data)}\n\n"
        yield "data: [DONE]\n\n"

    return Response(generate(), mimetype='text/stream')


def generate_regular_response(messages):
    """Generate regular JSON response."""
    try:
        content = ai_service.generate_chat_response(messages, stream=False)
        return jsonify({'content': content})
    except AIServiceInitError:
        return _openai_init_failure_response()
    except Exception as e:
        logging.error(f"Regular response error: {str(e)}")
        return _openai_failure_response(e)


@chat_bp.route('/chat/health', methods=['GET'])
@limiter.limit("120 per minute")
def chat_health():
    """Health check endpoint for chat service"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Chat Service',
        'openai_configured': bool(ai_service.client)
    })
