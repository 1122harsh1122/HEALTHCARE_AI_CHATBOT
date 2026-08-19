'use client';

import React from 'react';
import { HeartPulse, Stethoscope, HelpCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface PromptStartersProps {
  onSelectPrompt: (prompt: string) => void;
}

const STARTERS = [
  {
    icon: Stethoscope,
    title: 'Symptom Triage',
    category: 'Common Conditions',
    color: 'text-teal-600 dark:text-teal-400',
    prompt: 'I have had a throbbing one-sided headache with nausea and light sensitivity for 6 hours. What might this indicate?'
  },
  {
    icon: HeartPulse,
    title: 'Hypertension Precautions',
    category: 'Cardiovascular',
    color: 'text-blue-600 dark:text-blue-400',
    prompt: 'What are the evidence-based lifestyle changes to lower elevated blood pressure naturally without medication?'
  },
  {
    icon: HelpCircle,
    title: 'Diabetes Warning Signs',
    category: 'Endocrine & Metabolic',
    color: 'text-purple-600 dark:text-purple-400',
    prompt: 'What are the early signs of Type 2 Diabetes and what do HbA1c test levels mean?'
  },
  {
    icon: ShieldAlert,
    title: 'GERD & Acid Reflux',
    category: 'Gastroenterology',
    color: 'text-amber-600 dark:text-amber-400',
    prompt: 'What precautions should I take to prevent nighttime acid reflux and heartburn?'
  }
];

export const PromptStarters: React.FC<PromptStartersProps> = ({ onSelectPrompt }) => {
  return (
    <div className="w-full max-w-3xl mx-auto my-6 px-4">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-teal-500" />
        Sample Clinical Prompts from Kaggle Knowledge Base
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STARTERS.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectPrompt(item.prompt)}
              className="text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-850/60 hover:border-teal-500/50 hover:bg-teal-50/40 dark:hover:bg-slate-800/80 transition-all duration-200 shadow-sm group relative"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                &quot;{item.prompt}&quot;
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
