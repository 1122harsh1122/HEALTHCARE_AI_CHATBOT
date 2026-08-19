'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Activity, AlertTriangle, Check, Copy, Database, ShieldAlert, User } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatMessageProps {
  message: ChatMessageType;
  onOpenSource?: (sources: { conditions?: string[]; faqs?: string[] }) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOpenSource }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSources =
    message.ragSources &&
    ((message.ragSources.conditions && message.ragSources.conditions.length > 0) ||
      (message.ragSources.faqs && message.ragSources.faqs.length > 0));

  return (
    <div
      className={`flex gap-3.5 my-4 px-4 max-w-4xl mx-auto ${
        isUser ? 'justify-end' : 'justify-start'
      } animate-fade-in`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20 mt-1">
          <Activity className="w-4 h-4" />
        </div>
      )}

      <div
        className={`relative group max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-sm transition-all ${
          isUser
            ? 'bg-teal-600 text-white rounded-tr-none'
            : message.isEmergencyAlert
            ? 'bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-slate-800 dark:text-slate-100 rounded-tl-none'
            : message.isGuardrailBlocked
            ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-400 text-slate-800 dark:text-slate-100 rounded-tl-none'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
        }`}
      >
        {/* Guardrail or Emergency Header Pill */}
        {!isUser && message.isEmergencyAlert && (
          <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1 rounded bg-red-600 text-white text-xs font-bold w-fit">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>CRITICAL CLINICAL ALERT</span>
          </div>
        )}

        {!isUser && message.isGuardrailBlocked && !message.isEmergencyAlert && (
          <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1 rounded bg-amber-500 text-white text-xs font-semibold w-fit">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SAFETY GUARDRAIL TRIGGERED</span>
          </div>
        )}

        {/* Message Content */}
        <div className={`prose prose-sm dark:prose-invert max-w-none break-words ${
          isUser ? 'text-white prose-p:text-white prose-headings:text-white' : ''
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-2 list-disc pl-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 list-decimal pl-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1.5">{children}</h3>,
                h4: ({ children }) => <h4 className="text-xs font-bold mt-2 mb-1">{children}</h4>,
                strong: ({ children }) => <strong className="font-semibold text-teal-700 dark:text-teal-400">{children}</strong>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-teal-500 pl-3 my-2 text-xs italic text-slate-600 dark:text-slate-400">
                    {children}
                  </blockquote>
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Dataset Reference Sources Badge */}
        {!isUser && hasSources && onOpenSource && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-medium text-[11px]">Kaggle References:</span>
            {message.ragSources?.conditions?.map((c, i) => (
              <button
                key={i}
                onClick={() => onOpenSource(message.ragSources!)}
                className="bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded text-[11px] font-medium border border-teal-200 dark:border-teal-800 transition"
              >
                {c}
              </button>
            ))}
            {message.ragSources?.faqs?.map((f, i) => (
              <button
                key={i}
                onClick={() => onOpenSource(message.ragSources!)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium transition"
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Action Bar (Copy Button) */}
        {!isUser && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-700 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
