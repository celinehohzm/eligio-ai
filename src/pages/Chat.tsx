import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Send, ArrowLeft, Brain, Paperclip, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on mount
    const saved = localStorage.getItem('chat-messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set up PDF.js worker
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat-messages', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setPdfFile(file);
    toast.success('PDF attached successfully');

    // Extract text from PDF
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      setPdfText(fullText);
    } catch (err) {
      console.error('Error parsing PDF:', err);
      toast.error('Failed to read PDF file');
      setPdfFile(null);
    }
  };

  const removePdfFile = () => {
    setPdfFile(null);
    setPdfText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !pdfText) || isLoading) return;

    let displayContent = input.trim();
    let apiContent = displayContent;
    
    // Add PDF filename to display message
    if (pdfFile) {
      displayContent = `${displayContent}\n\n📎 ${pdfFile.name}`;
    }
    
    // Add PDF content to API message but not display message
    if (pdfText) {
      apiContent = `${apiContent}\n\n[PDF Content]:\n${pdfText}`;
    }

    // Display message without PDF content
    const userMessage: Message = { role: 'user', content: displayContent };
    
    // API message with PDF content
    const apiMessage: Message = { role: 'user', content: apiContent };
    const apiMessages = [...messages, apiMessage];
    
    // Update display messages
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPdfFile(null);
    setPdfText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://reizxjvmkebjsdtfnqmv.supabase.co/functions/v1/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaXp4anZta2VianNkdGZucW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3Mzg5MjQsImV4cCI6MjA3NDMxNDkyNH0.Xq3ebkmfxe1yO2HDBIXDcCdjvhkhElPN4dg6ZMyp6dQ'}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Check if streaming is supported
      if (response.body && response.headers.get('content-type')?.includes('text/stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        // Add assistant message placeholder
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          
          // Parse SSE chunks from OpenAI
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
                  
                  // Update the last message (assistant message)
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                    return updated;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } else {
        // Fallback to regular JSON response
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      toast.error('Failed to send message', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link to="/" className="flex items-center space-x-1 md:space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm font-medium">Back</span>
            </Link>
            <div className="h-4 md:h-6 w-px bg-gray-300" />
            <div className="flex items-center space-x-1 md:space-x-2">
              <div className="w-5 h-5 md:w-6 md:h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Eligio AI</h1>
              <span className="hidden sm:inline text-gray-400">•</span>
              <span className="hidden sm:inline text-sm md:text-lg font-medium text-gray-700">Patient Triaging Chat</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-4xl">
        <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 mb-3 md:mb-4 px-1" style={{ height: '70vh' }}>
            {messages.length === 0 && (
              <div className="text-center py-8 md:py-16 px-4">
                <div className="max-w-md mx-auto">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <Brain className="h-6 w-6 md:h-8 md:w-8 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">
                    Welcome to Eligio AI
                  </h3>
                  <p className="text-gray-600 text-base md:text-lg">
                    Describe your patient's symptoms and condition to get intelligent triaging recommendations.
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card className={`max-w-[95%] sm:max-w-[85%] md:max-w-[80%] shadow-md hover:shadow-lg transition-shadow ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white border-l-4 border-l-blue-800' 
                    : 'bg-white border border-gray-200 border-l-4 border-l-blue-600'
                }`}>
                  <CardContent className="p-3 md:p-4">
                    <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <Card className="bg-white border border-gray-200 border-l-4 border-l-blue-600 shadow-md max-w-[95%] sm:max-w-[85%] md:max-w-[80%]">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Brain className="h-3 w-3 md:h-4 md:w-4 text-white" />
                      </div>
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="flex space-x-1 flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-gray-600 text-xs md:text-sm font-medium truncate">Analyzing patient information...</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {error && (
              <div className="flex justify-center">
                <Card className="bg-red-50 border border-red-200">
                  <CardContent className="p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t pt-3 md:pt-4 bg-white/80 backdrop-blur-sm rounded-lg p-3 md:p-4 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-2 md:space-y-3">
              {pdfFile && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-3">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Paperclip className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-900 truncate">{pdfFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removePdfFile}
                    className="h-6 w-6 p-0 hover:bg-blue-100 flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              )}
              <div className="flex items-end space-x-2 md:space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="px-3 md:px-4 py-2 md:py-3 h-auto hover:bg-blue-50 flex-shrink-0"
                >
                  <Paperclip className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe the patient's symptoms, medical history, and current condition..."
                    className="min-h-[40px] md:min-h-[44px] max-h-[100px] md:max-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm md:text-base"
                    rows={1}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={(!input.trim() && !pdfText) || isLoading}
                  className="px-4 md:px-6 py-2 md:py-3 h-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md flex-shrink-0"
                  size="lg"
                >
                  <Send className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;