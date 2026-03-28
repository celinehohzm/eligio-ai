from openai import OpenAI
from config.config import Config
import logging
import json

class AIService:
    """Service for handling AI interactions"""
    
    def __init__(self):
        self.client = None
        self.model = Config.OPENAI_MODEL
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize OpenAI client safely"""
        if Config.OPENAI_API_KEY:
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
                    self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
                finally:
                    # Restore original environment
                    for var, value in original_env.items():
                        os.environ[var] = value
                        
            except Exception as e:
                logging.error(f"Failed to initialize OpenAI client in AIService: {str(e)}")
                self.client = None
    
    def generate_chat_response(self, messages, stream=False):
        """Generate AI response for chat messages"""
        try:
            if not Config.OPENAI_API_KEY:
                return self._generate_mock_response(messages)
            
            # Add system prompt if not present
            if messages[0].get('role') != 'system':
                system_prompt = self._get_system_prompt()
                messages = [system_prompt] + messages
            
            params = {
                'model': self.model,
                'messages': messages,
                'temperature': 0.7
            }
            
            if stream:
                params['stream'] = True
                return self.client.chat.completions.create(**params)
            else:
                params['max_tokens'] = 1000
                response = self.client.chat.completions.create(**params)
                return response.choices[0].message.content
                
        except Exception as e:
            logging.error(f"AI service error: {str(e)}")
            return self._generate_mock_response(messages)
    
    def _get_system_prompt(self):
        """Get system prompt for patient triaging"""
        return {
            "role": "system",
            "content": 
            """
                You are Eligio AI, an intelligent patient triaging assistant. Your role is to help assess patient symptoms and provide appropriate medical guidance.

                Guidelines:
                1. Always prioritize patient safety
                2. Ask clarifying questions when needed
                3. Provide general medical information, not specific diagnoses
                4. Recommend appropriate level of care (emergency care, urgent care, primary care)
                5. Include disclaimers that your advice is not a substitute for professional medical care
                6. Be empathetic and professional in your responses
                7. If symptoms suggest emergency conditions, advise immediate emergency care

                Please provide thoughtful, safe, and helpful triaging recommendations.
            """
        }
    
    def _generate_mock_response(self, messages):
        """Generate mock response when OpenAI is not available"""
        last_message = messages[-1]['content'] if messages else ""
        last_message_lower = last_message.lower()
        
        if any(keyword in last_message_lower for keyword in ['emergency', 'severe', 'chest pain', 'difficulty breathing', 'unconscious']):
            return """
                Based on the symptoms you've described, I recommend seeking immediate emergency medical care. 
                Please go to the nearest emergency department or call emergency services right away. 
                **Disclaimer**: This assessment is not a substitute for professional medical evaluation. Please seek immediate medical attention for proper diagnosis and treatment.
                """
        
        elif any(keyword in last_message_lower for keyword in ['pain', 'fever', 'headache', 'nausea', 'dizziness']):
            return """
                Based on your symptoms, I recommend scheduling an appointment with your primary care physician or visiting an urgent care center if your symptoms are concerning to you.
                **Disclaimer**: This information is for educational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for proper evaluation and treatment.
                """
        
        else:
            return """
                Thank you for providing information about your symptoms. Based on what you've shared, I recommend:

                1. Monitoring your symptoms closely
                2. Contacting your primary care physician for a proper evaluation
                3. Seeking urgent care if symptoms worsen or you develop new concerning symptoms

                **Disclaimer**: I am an AI assistant and cannot provide medical diagnoses. Please consult with a qualified healthcare professional for proper medical advice and treatment.
                """
    
    def analyze_document_content(self, text_content):
        """Analyze document content for medical information"""
        try:
            if not Config.OPENAI_API_KEY:
                return self._mock_document_analysis(text_content)
            
            messages = [
                {
                    "role": "system",
                    "content": 
                    """
                        You are a medical document analyzer. Extract and summarize key medical information from the provided text. Focus on:
                        1. Patient demographics
                        2. Medical conditions/diagnoses
                        3. Medications
                        4. Test results
                        5. Clinical notes
                        6. Recommendations
                        Provide a structured summary of the medical information.
                    """
                },
                {
                    "role": "user",
                    "content": f"Please analyze this medical document:\n\n{text_content}"
                }
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.3,
                max_tokens=1500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logging.error(f"Document analysis error: {str(e)}")
            return self._mock_document_analysis(text_content)
    
    def _mock_document_analysis(self, text_content):
        """Mock document analysis when OpenAI is not available"""
        return f"""
            Document Analysis Summary:
            The document has been processed and contains medical information. For detailed analysis and extraction of specific medical data points, please configure the OpenAI API integration.
            
            Document characteristics:
            - Length: {len(text_content)} characters
            - Contains medical terminology
            - Requires professional medical review

            **Note**: This is a mock analysis. Configure OpenAI API for detailed medical document analysis.
            """