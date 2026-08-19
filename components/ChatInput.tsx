'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onClear: () => void;
  hasMessages: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading,
  onClear,
  hasMessages,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit(e);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      <form
        onSubmit={onSubmit}
        className="relative bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none focus-within:border-teal-500 dark:focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-500 transition-all p-2"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your symptoms or ask a health question (e.g., 'What are the precautions for hypertension?')..."
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none max-h-44 min-h-[44px]"
        />

        <div className="flex items-center justify-between pt-2 px-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {hasMessages && (
              <button
                type="button"
                onClick={onClear}
                disabled={isLoading}
                title="Reset conversation"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}
            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              Not for critical emergencies
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`p-2.5 rounded-xl font-medium text-white transition-all shadow-sm flex items-center justify-center ${
                !input.trim() || isLoading
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 active:scale-95 shadow-teal-600/20'
              }`}
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </form>
      <div className="text-center mt-2">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          CarePulse AI can make mistakes. Always verify medical decisions with a physician.
        </p>
      </div>
    </div>
  );
};
