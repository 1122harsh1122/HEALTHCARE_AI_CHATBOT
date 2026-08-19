'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Activity, Send, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_SYMPTOMS = [
  'Fever & Chills',
  'Throbbing Headache',
  'Dry Cough',
  'Chest Pain (Emergency Check)',
  'Acid Reflux / Heartburn'
];

export default function HealthcareChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle message submission with streaming RAG response
  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptToSend.trim()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: ''
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

      // Check if server triage flagged this as an emergency
      const isEmergencyHeader = response.headers.get('X-Is-Emergency') === 'true';
      if (isEmergencyHeader) {
        setEmergencyAlert(true);
      }

      // Stream text response chunks
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('Response stream not readable');

      let fullResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: fullResponse } : msg
          )
        );
      }
    } catch (err) {
      console.error('Chat request error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  '⚠️ **Connection Notice:** Unable to reach the assistant. Please check your network or environment settings and try again.'
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickChip = (symptom: string) => {
    setInput(symptom);
  };

  const handleResetChat = () => {
    setMessages([]);
    setEmergencyAlert(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. TOP HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="font-bold text-base tracking-tight text-slate-900">
              CarePulse AI
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-medium border border-emerald-200">
              Grounded on Kaggle Dataset
            </span>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleResetChat}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition py-1 px-2 rounded-md hover:bg-slate-100"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. QUICK SYMPTOM CHIPS */}
      <section className="bg-white/60 border-b border-slate-200/80 py-2.5 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-medium text-slate-400 shrink-0">Quick Topics:</span>
          {QUICK_SYMPTOMS.map((symptom, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickChip(symptom)}
              className="bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 hover:text-emerald-800 text-xs px-3 py-1.5 rounded-full transition shadow-2xs shrink-0 cursor-pointer font-medium"
            >
              {symptom}
            </button>
          ))}
        </div>
      </section>

      {/* 3. MAIN CHAT AREA (SINGLE-COLUMN) */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col justify-between">
        {/* Emergency Alert Banner */}
        {emergencyAlert && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start justify-between gap-3 mb-5 shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">
                ⚠️ <strong>Emergency Warning:</strong> Please call emergency services (<strong>911 / 112</strong>) immediately if experiencing severe symptoms such as crushing chest pain, difficulty breathing, or sudden numbness.
              </p>
            </div>
            <button
              onClick={() => setEmergencyAlert(false)}
              className="text-rose-500 hover:text-rose-700 text-xs font-semibold p-1"
              title="Dismiss warning"
            >
              ✕
            </button>
          </div>
        )}

        {/* Empty State / Welcome */}
        {messages.length === 0 ? (
          <div className="my-auto py-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center border border-emerald-100 shadow-xs">
              <Activity className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Welcome to CarePulse AI
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Describe your symptoms or ask healthcare questions. Responses are evidence-based, grounded in open Kaggle clinical datasets, with safety guardrails active.
            </p>
            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-200">
              Informational decision-support only. Not a substitute for a licensed medical provider.
            </p>
          </div>
        ) : (
          /* Message List */
          <div className="space-y-4 mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  /* User Message */
                  <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm max-w-[85%] leading-relaxed shadow-xs">
                    {msg.content}
                  </div>
                ) : (
                  /* AI Message */
                  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-none p-4 text-sm max-w-[90%] text-slate-800 leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 text-slate-700">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-700">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                        h3: ({ children }) => <h3 className="font-bold text-slate-900 text-sm mt-3 mb-1.5">{children}</h3>,
                        h4: ({ children }) => <h4 className="font-semibold text-slate-800 text-xs mt-2 mb-1">{children}</h4>,
                        hr: () => <hr className="my-3 border-slate-200" />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming / Loading Indicator */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 shadow-xs rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Retrieving Kaggle medical references & synthesizing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* 4. CHAT INPUT (FIXED BOTTOM) */}
      <footer className="bg-white border-t border-slate-200 sticky bottom-0 z-20 py-3 px-4 shadow-xs">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => handleSubmit(e)}
            className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl p-1.5 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 focus-within:bg-white transition"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe symptoms or ask a medical question..."
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg p-2.5 transition flex items-center justify-center shadow-xs cursor-pointer disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400 mt-2">
            CarePulse AI is for educational triage. Always verify with a physician. In emergencies, call 911 immediately.
          </p>
        </div>
      </footer>
    </div>
  );
}
