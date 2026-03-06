from flask import Blueprint, request, jsonify, Response
import json
from openai import OpenAI
from config.config import Config
import logging

from app.extensions import limiter

chat_bp = Blueprint('chat', __name__)

# Global client variable
openai_client = None

def get_openai_client():
    """Get OpenAI client instance"""
    global openai_client
    if openai_client is None and Config.OPENAI_API_KEY:
        try:
            # Temporarily clear proxy environment variables that might interfere
            import os
            original_env = {}
            proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
            
            for var in proxy_vars:
                if var in os.environ:
                    original_env[var] = os.environ[var]
                    del os.environ[var]
            
            try:
                openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)
            finally:
                # Restore original environment
                for var, value in original_env.items():
                    os.environ[var] = value
                    
        except Exception as e:
            logging.error(f"Failed to initialize OpenAI client: {str(e)}")
            openai_client = None
    return openai_client

@chat_bp.route('/ai-chat', methods=['POST'])
@limiter.limit("30 per minute")
def ai_chat():
    """Handle AI chat requests for patient triaging"""
    try:
        data = request.get_json(silent=True)
        
        if not data or 'messages' not in data:
            return jsonify({'error': 'Messages are required'}), 400
        
        messages = data['messages']
        
        # Validate messages format
        if not isinstance(messages, list) or len(messages) == 0:
            return jsonify({'error': 'Messages must be a non-empty array'}), 400
        
        # System prompt for patient triaging
        system_prompt = {
            "role": "system",
            "content": """You are Eligio AI, an intelligent patient triaging assistant. Your role is to help assess patient symptoms and provide appropriate medical guidance.

Guidelines:
1. Always prioritize patient safety
2. Ask clarifying questions when needed
3. Provide general medical information, not specific diagnoses
4. Recommend appropriate level of care (emergency care, urgent care, primary care)
5. Include disclaimers that your advice is not a substitute for professional medical care
6. Be empathetic and professional in your responses
7. If symptoms suggest emergency conditions, advise immediate emergency care

Please provide thoughtful, safe, and helpful triaging recommendations."""
        }
        
        # Add system prompt if not present
        if messages[0].get('role') != 'system':
            messages = [system_prompt] + messages
        
        # Check if client wants streaming response
        accept_header = request.headers.get('Accept', '')
        client = get_openai_client()
        wants_streaming = 'text/stream' in accept_header

        # Frontend consumes SSE by default; always stream when requested.
        if wants_streaming:
            if client:
                return generate_streaming_response(messages, client)
            return generate_mock_streaming_response(messages)

        return generate_regular_response(messages, client)
            
    except Exception as e:
        logging.error(f"Error in ai_chat: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def wants_streaming_response(messages):
    """Determine if we should use streaming based on request"""
    # Simple heuristic - use streaming for longer conversations
    total_chars = sum(len(msg.get('content', '')) for msg in messages)
    return total_chars > 500

def generate_streaming_response(messages, client):
    """Generate streaming response using OpenAI API"""
    try:
        response = client.chat.completions.create(
            model=Config.OPENAI_MODEL,
            messages=messages,
            stream=True,
            temperature=0.7
        )
        
        def generate():
            for chunk in response:
                if not chunk.choices:
                    continue

                choice = chunk.choices[0]
                delta = getattr(choice, 'delta', None)
                content = getattr(delta, 'content', None) if delta else None

                if content:
                    # Format as Server-Sent Events
                    data = {'choices': [{'delta': {'content': content}}]}
                    yield f"data: {json.dumps(data)}\n\n"
                elif getattr(choice, 'finish_reason', None) == 'stop':
                    yield "data: [DONE]\n\n"
        
        return Response(generate(), mimetype='text/stream')
        
    except Exception as e:
        logging.error(f"Streaming error: {str(e)}")
        # Fallback to regular response
        return generate_regular_response(messages, client)

def generate_mock_streaming_response(messages):
    """Generate streaming response when OpenAI is not configured"""
    mock_response = generate_mock_response(messages)

    def generate():
        chunk_size = 80
        for i in range(0, len(mock_response), chunk_size):
            content = mock_response[i:i + chunk_size]
            data = {'choices': [{'delta': {'content': content}}]}
            yield f"data: {json.dumps(data)}\n\n"
        yield "data: [DONE]\n\n"

    return Response(generate(), mimetype='text/stream')

def generate_regular_response(messages, client):
    """Generate regular JSON response"""
    try:
        if client:
            response = client.chat.completions.create(
                model=Config.OPENAI_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content
            return jsonify({'content': content})
        else:
            # Mock response when OpenAI is not configured
            mock_response = generate_mock_response(messages)
            return jsonify({'content': mock_response})
            
    except Exception as e:
        logging.error(f"Regular response error: {str(e)}")
        # Fallback mock response
        mock_response = generate_mock_response(messages)
        return jsonify({'content': mock_response})

def generate_mock_response(messages):
    """Generate a mock response when OpenAI is not available"""
    last_message = messages[-1]['content'] if messages else ""
    
    if 'emergency' in last_message.lower() or 'severe' in last_message.lower():
        return """Based on symptoms you've described, I recommend seeking immediate emergency medical care. 

Please go to the nearest emergency department or call emergency services right away. 

**Disclaimer**: This assessment is not a substitute for professional medical evaluation. Please seek immediate medical attention for proper diagnosis and treatment."""
    elif 'pain' in last_message.lower() or 'fever' in last_message.lower():
        return """Based on your symptoms, I recommend scheduling an appointment with your primary care physician or visiting an urgent care center if your symptoms are concerning to you.

**Disclaimer**: This information is for educational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for proper evaluation and treatment."""
    else:
        return """Thank you for providing information about your symptoms. Based on what you've shared, I recommend:

1. Monitoring your symptoms closely
2. Contacting your primary care physician for a proper evaluation
3. Seeking urgent care if symptoms worsen or you develop new concerning symptoms

**Disclaimer**: I am an AI assistant and cannot provide medical diagnoses. Please consult with a qualified healthcare professional for proper medical advice and treatment."""

@chat_bp.route('/chat/health', methods=['GET'])
@limiter.limit("120 per minute")
def chat_health():
    """Health check endpoint for chat service"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Chat Service',
        'openai_configured': bool(Config.OPENAI_API_KEY)
    })
