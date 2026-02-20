const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Chat API methods
  async sendChatMessage(messages) {
    return this.request('/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  }

  async streamChatMessage(messages, onChunk) {
    const url = `${this.baseURL}/ai-chat`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/stream',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                assistantContent += content;
                onChunk(content, assistantContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return { content: assistantContent };
    } catch (error) {
      console.error('Streaming chat failed:', error);
      // Fallback to regular request
      return this.sendChatMessage(messages);
    }
  }

  // Document upload methods
  async uploadDocuments(patientData, files) {
    const formData = new FormData();
    
    // Add patient data
    Object.keys(patientData).forEach(key => {
      formData.append(key, patientData[key]);
    });

    // Add files with metadata
    files.forEach((fileGroup, categoryIndex) => {
      fileGroup.files.forEach((file, fileIndex) => {
        formData.append(`file_${categoryIndex}_${fileIndex}`, file.file);
        formData.append(`category_${categoryIndex}_${fileIndex}`, fileGroup.category);
        formData.append(`subtype_${categoryIndex}_${fileIndex}`, file.subtype);
      });
    });

    try {
      const response = await fetch(`${this.baseURL}/upload-documents`, {
        method: 'POST',
        headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Document upload failed:', error);
      throw error;
    }
  }

  async getDocumentCategories() {
    return this.request('/document-categories');
  }

  async getSubmission(submissionId) {
    return this.request(`/submissions/${submissionId}`);
  }

  // Authentication methods
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    
    return data;
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async refreshToken() {
    const data = await this.request('/auth/refresh', {
      method: 'POST',
    });
    
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // Health check methods
  async checkHealth(service = null) {
    const endpoint = service ? `/${service}/health` : '/health';
    return this.request(endpoint);
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
