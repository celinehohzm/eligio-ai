import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import { Mark } from '@/components/Logo';
import apiService from '@/services/api';
import { extractPdfText } from '@/lib/pdf';

const Chat = () => {
  const [messages, setMessages] = useState(() => {
    // Load messages from sessionStorage on mount (persists on refresh, not on new tab)
    const saved = sessionStorage.getItem('chat-messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfText, setPdfText] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('chat-messages', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e) => {
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
      const fullText = await extractPdfText(file);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !pdfText) || isLoading) return;

    let displayContent = input.trim();
    let apiContent = displayContent;

    // Add PDF filename to display message
    if (pdfFile) {
      displayContent = displayContent
        ? `${displayContent}\n\n📎 ${pdfFile.name}`
        : `📎 ${pdfFile.name}`;
    }

    // Add PDF content to API message but not display message
    if (pdfText) {
      apiContent = `${apiContent}\n\n[PDF Content]:\n${pdfText}`;
    }

    // Display message without PDF content
    const userMessage = { role: 'user', content: displayContent };

    // API message with PDF content
    const apiMessage = { role: 'user', content: apiContent };
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
      // Use streaming for better user experience
      const response = await apiService.streamChatMessage(apiMessages, (chunk, fullContent) => {
        // Update last message (assistant message) with streaming content
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length === 0 || updated[updated.length - 1].role !== 'assistant') {
            // Add assistant message placeholder if it doesn't exist
            updated.push({ role: 'assistant', content: fullContent });
          } else {
            // Update existing assistant message
            updated[updated.length - 1] = { role: 'assistant', content: fullContent };
          }
          return updated;
        });
      });

      // If streaming didn't work, add response normally
      if (response && response.content) {
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length === 0 || updated[updated.length - 1].role !== 'assistant') {
            updated.push({ role: 'assistant', content: response.content });
          }
          return updated;
        });
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <div className="idx-in mx-auto flex min-h-[calc(100vh-60px)] max-w-[1280px] flex-col border-line px-4 lg:border-x lg:px-8">
        <div className="flex items-center justify-between border-b border-line py-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">04 — Triage</span>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-[-0.03em]">Patient triage chat</h1>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 py-7" style={{ minHeight: "min(70vh,720px)" }}>
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
              <Mark className="size-9" />
              <h3 className="mt-6 font-display text-xl font-extrabold tracking-[-0.02em]">Welcome to Eligio</h3>
              <p className="mt-3 max-w-md font-sans text-base leading-[1.6] text-muted2">
                Describe your patient&apos;s symptoms and condition to get intelligent triaging recommendations.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            message.role === 'user' ? (
              <div key={index} className="flex justify-end">
                <div className="max-w-[78%] bg-strong px-[18px] py-4 text-on-strong">
                  <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">You · referring</div>
                  <p className="whitespace-pre-wrap font-sans text-[15px] leading-[1.55]">{message.content}</p>
                </div>
              </div>
            ) : (
              <div key={index} className="max-w-[88%]">
                <div className="mb-2 flex items-center gap-2">
                  <Mark className="size-[15px]" strokeWidth={2.4} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Eligio · triage</span>
                </div>
                <p className="whitespace-pre-wrap font-sans text-[15px] leading-[1.6] text-ink">{message.content}</p>
              </div>
            )
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Analyzing<span className="idx-blink text-signal">···</span>
            </div>
          )}

          {error && (
            <div className="border border-destructive px-4 py-3">
              <p className="font-sans text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="sticky bottom-0 border-t border-line bg-paper py-4">
          {pdfFile && (
            <div className="mb-3 flex items-center justify-between gap-3 border border-line bg-surface p-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Paperclip className="size-4 shrink-0 text-signal" />
                <span className="truncate font-sans text-sm text-ink">{pdfFile.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removePdfFile}
                className="size-8 shrink-0 p-0 text-signal"
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-3.5">
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              aria-label="Attach PDF"
              className="shrink-0 text-muted-foreground hover:text-signal disabled:opacity-50"
            >
              <Paperclip className="size-5" />
            </button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the patient's symptoms and history…"
              rows={1}
              className="min-h-0 max-h-[120px] flex-1 resize-none border-0 bg-transparent px-0 py-2.5 font-sans text-[15px] text-ink shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="submit"
              disabled={(!input.trim() && !pdfText) || isLoading}
              className="shrink-0 gap-2"
            >
              Send
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;
