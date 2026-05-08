import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Send, ArrowLeft, Paperclip, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import RoleTabs from '@/components/RoleTabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import eligioLogo from '@/assets/eligio-logo.png';
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="site-header">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent/70 hover:text-primary md:gap-2"
            >
              <ArrowLeft className="size-4 md:size-5" />
              <span className="text-xs font-medium md:text-sm">Back</span>
            </Link>
            <div className="h-4 w-px shrink-0 bg-border md:h-6" />
            <div className="flex items-center gap-1.5 md:gap-2">
              <img src={eligioLogo} alt="Eligio AI" className="size-10 object-contain motion-safe:transition-transform md:size-12 motion-safe:hover:scale-[1.03]" />
              <h1 className="text-lg font-bold tracking-tight text-foreground md:text-xl">Eligio AI</h1>
              <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
                •
              </span>
              <span className="hidden text-sm font-medium text-muted-foreground sm:inline md:text-lg">Patient Triaging Chat</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <RoleTabs className="space-x-4 lg:space-x-8" />
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="container mx-auto max-w-4xl px-3 py-4 md:px-4 md:py-6">
        <div className="flex min-h-[70vh] flex-col md:h-[calc(100vh-8rem)]">
          <div
            className="mb-4 flex flex-1 flex-col gap-3 overflow-y-auto md:gap-4"
            style={{ minHeight: "min(70vh,720px)" }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center motion-safe:animate-fade-up md:py-24">
                <div className="relative mx-auto mb-8">
                  <div className="absolute inset-0 scale-125 rounded-[2rem] bg-gradient-to-br from-primary/25 via-transparent to-teal-400/20 blur-xl motion-safe:animate-pulse" />
                  <div className="relative flex items-center justify-center rounded-[2rem] border border-primary/15 bg-background/90 p-6 shadow-xl ring-2 ring-primary/10 backdrop-blur-sm">
                    <img src={eligioLogo} alt="Eligio AI" className="mx-auto size-24 object-contain motion-safe:animate-float md:size-32" />
                  </div>
                </div>
                <div className="mx-auto max-w-md">
                  <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                    Welcome to Eligio AI
                  </h3>
                  <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                    Describe your patient&apos;s symptoms and condition to get intelligent triaging recommendations.
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`motion-safe:animate-fade-up flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`relative max-w-[95%] overflow-hidden rounded-2xl border border-border/60 shadow-md backdrop-blur-sm transition-[box-shadow,transform] duration-300 ease-out motion-safe:hover:-translate-y-px motion-safe:hover:shadow-lg sm:max-w-[85%] md:max-w-[80%] ${
                    message.role === "user"
                      ? "border-l-[3px] border-l-teal-800 bg-gradient-to-br from-primary via-teal-600 to-cyan-800 text-primary-foreground shadow-lg shadow-primary/30"
                      : "border-l-[3px] border-l-primary bg-card/98"
                  }`}
                >
                  <CardContent className="p-3 md:p-4">
                    <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start motion-safe:animate-fade-up">
                <Card className="relative max-w-[95%] overflow-hidden rounded-2xl border border-border/70 bg-card/98 shadow-md backdrop-blur-sm before:pointer-events-none before:absolute before:inset-y-4 before:left-0 before:w-1 before:rounded-full before:bg-primary sm:max-w-[85%] md:max-w-[80%]">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-accent/70 md:size-14">
                        <img src={eligioLogo} alt="" className="size-10 object-contain md:size-12" aria-hidden />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex shrink-0 gap-1.5 px-1">
                          <span
                            className="size-2.5 rounded-full bg-primary motion-safe:animate-bounce [animation-duration:620ms]"
                            aria-hidden
                          />
                          <span
                            className="size-2.5 rounded-full bg-primary motion-safe:animate-bounce [animation-delay:160ms] [animation-duration:620ms]"
                            aria-hidden
                          />
                          <span
                            className="size-2.5 rounded-full bg-primary motion-safe:animate-bounce [animation-delay:320ms] [animation-duration:620ms]"
                            aria-hidden
                          />
                        </div>
                        <span className="truncate text-xs font-medium text-muted-foreground md:text-sm">
                          Analyzing patient information…
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {error && (
              <div className="flex justify-center motion-safe:animate-subtle-zoom">
                <Card className="rounded-2xl border border-destructive/25 bg-destructive/10">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="sticky bottom-0 mt-auto rounded-[1.25rem] border border-border/65 bg-background/90 p-4 shadow-[0_-8px_30px_-12px_hsl(var(--foreground)/0.12)] backdrop-blur-xl md:p-5">
            <form onSubmit={handleSubmit} className="space-y-2 md:space-y-3">
              {pdfFile && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-accent/80 p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Paperclip className="size-4 shrink-0 text-primary" />
                    <span className="truncate text-sm text-accent-foreground">{pdfFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removePdfFile}
                    className="size-9 shrink-0 p-0 text-primary hover:bg-primary/15"
                  >
                    <X className="size-4" />
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
                  className="h-auto shrink-0 px-3 py-2 hover:bg-accent/80 md:px-4 md:py-3"
                  aria-label="Attach PDF"
                >
                  <Paperclip className="size-5 text-primary md:size-6" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe the patient's symptoms, medical history, and current condition..."
                    className="min-h-[44px] max-h-[120px] resize-none text-sm md:min-h-[48px] md:text-base border-border/70 focus-visible:ring-primary/30"
                    rows={1}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={(!input.trim() && !pdfText) || isLoading}
                  size="lg"
                  className="group h-auto shrink-0 px-6 py-3 shadow-lg shadow-primary/25"
                  aria-label="Send message"
                >
                  <Send className="size-5 md:size-[1.35rem] motion-safe:transition-transform motion-safe:group-hover:-translate-y-px motion-safe:group-hover:translate-x-0.5" />
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
