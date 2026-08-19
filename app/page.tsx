'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { PromptStarters } from '@/components/PromptStarters';
import { EmergencyModal } from '@/components/EmergencyModal';
import { SourceDrawer } from '@/components/SourceDrawer';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { Activity, Download, Sparkles } from 'lucide-react';
import { getDatasetStats } from '@/lib/dataset-parser';

export default function HealthcareChatApp() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyTrigger, setEmergencyTrigger] = useState<string | undefined>();
  const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false);
  const [activeSources, setActiveSources] = useState<{ conditions?: string[]; faqs?: string[] } | null>(null);
  const [stats, setStats] = useState<{ totalConditions: number; totalFaqs: number; version: string } | undefined>();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load dataset stats & theme preference on mount
  useEffect(() => {
    try {
      const dbStats = getDatasetStats();
      setStats({
        totalConditions: dbStats.totalConditions,
        totalFaqs: dbStats.totalFaqs,
        version: dbStats.version
      });
    } catch (e) {
      console.error('Failed to load initial dataset stats', e);
    }

    const savedTheme = localStorage.getItem('carepulse_theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('carepulse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('carepulse_theme', 'light');
    }
  };

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const assistantMessageId = `assistant-${Date.now()}`;
    const initialAssistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    setMessages([...newMessages, initialAssistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          provider: 'auto'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      // Parse custom response headers
      const isEmergency = response.headers.get('X-Is-Emergency') === 'true';
      const isGuardrailBlocked = response.headers.get('X-Guardrail-Blocked') === 'true';
      const ragCondsHeader = response.headers.get('X-RAG-Conditions');
      const ragFaqsHeader = response.headers.get('X-RAG-Faqs');

      let parsedConditions: string[] = [];
      let parsedFaqs: string[] = [];

      try {
        if (ragCondsHeader) parsedConditions = JSON.parse(decodeURIComponent(ragCondsHeader));
        if (ragFaqsHeader) parsedFaqs = JSON.parse(decodeURIComponent(ragFaqsHeader));
      } catch (e) {
        // ignore parse error
      }

      if (isEmergency) {
        setEmergencyTrigger(userText);
        setEmergencyModalOpen(true);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: accumulatedContent,
                  isEmergencyAlert: isEmergency,
                  isGuardrailBlocked: isGuardrailBlocked,
                  ragSources: {
                    conditions: parsedConditions,
                    faqs: parsedFaqs
                  }
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  '**Communication Error**: Unable to complete clinical response. Please check your network connection or verify API keys in your environment variables.',
                isGuardrailBlocked: true
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    setInput(promptText);
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to reset the conversation?')) {
      setMessages([]);
    }
  };

  const handleExportTranscript = () => {
    if (messages.length === 0) return;

    let transcript = `# CarePulse AI Consultation Transcript\nDate: ${new Date().toLocaleString()}\n\n`;
    messages.forEach((m) => {
      transcript += `### ${m.role === 'user' ? 'Patient / User' : 'CarePulse Clinical AI'}\n`;
      transcript += `${m.content}\n\n`;
    });

    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carepulse-transcript-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenSourceViewer = (sources: { conditions?: string[]; faqs?: string[] }) => {
    setActiveSources(sources);
    setSourceDrawerOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Disclaimer */}
      <DisclaimerBanner onEmergencyClick={() => setEmergencyModalOpen(true)} />

      {/* Header */}
      <Header
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        datasetStats={stats}
        onOpenDatasetModal={() => {
          setActiveSources(null);
          setSourceDrawerOpen(true);
        }}
      />

      {/* Main Chat Scroll Container */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty / Welcome State */
          <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full">
            <div className="text-center space-y-3 mb-6 animate-fade-in">
              <div className="inline-flex p-3.5 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 mb-1 border border-teal-500/20">
                <Activity className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                How can I assist your health inquiry today?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Ask about symptoms, disease precautions, evidence-based lifestyle guidance, or explore verified Kaggle healthcare records.
              </p>

              <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  RAG-Enhanced
                </span>
                <span>•</span>
                <span>Clinical Guardrails Active</span>
                <span>•</span>
                <span>Vercel Serverless Ready</span>
              </div>
            </div>

            {/* Prompt Starters */}
            <PromptStarters onSelectPrompt={handleSelectPrompt} />
          </div>
        ) : (
          /* Active Chat Feed */
          <div className="flex-1 py-4">
            <div className="max-w-4xl mx-auto px-4 flex justify-end mb-2">
              <button
                onClick={handleExportTranscript}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60"
              >
                <Download className="w-3.5 h-3.5" />
                Export Transcript (.md)
              </button>
            </div>

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOpenSource={handleOpenSourceViewer}
              />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400 max-w-4xl mx-auto px-6 py-2">
                <Activity className="w-4 h-4 animate-spin" />
                <span>Consulting Kaggle clinical dataset & synthesizing guidance...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Bar Fixed Bottom */}
        <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-[#0b0f19] dark:via-[#0b0f19]/95 dark:to-transparent pt-4">
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onClear={handleClearChat}
            hasMessages={messages.length > 0}
          />
        </div>
      </main>

      {/* Emergency Hotline Alert Modal */}
      <EmergencyModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        triggerReason={emergencyTrigger}
      />

      {/* Kaggle Dataset Source Inspector Drawer */}
      <SourceDrawer
        isOpen={sourceDrawerOpen}
        onClose={() => setSourceDrawerOpen(false)}
        selectedSources={activeSources}
      />
    </div>
  );
}
