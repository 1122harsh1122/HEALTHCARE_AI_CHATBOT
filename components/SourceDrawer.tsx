'use client';

import React from 'react';
import { Database, X, Stethoscope, HelpCircle, ShieldCheck } from 'lucide-react';
import { getKnowledgeDatabase } from '@/lib/dataset-parser';
import { MedicalCondition, MedicalFaq } from '@/lib/types';

interface SourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSources?: {
    conditions?: string[];
    faqs?: string[];
  } | null;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({
  isOpen,
  onClose,
  selectedSources
}) => {
  if (!isOpen) return null;

  const db = getKnowledgeDatabase();

  // If specific sources are passed, filter to those; otherwise show top dataset list
  const filteredConditions: MedicalCondition[] = selectedSources?.conditions
    ? db.conditions.filter((c) =>
        selectedSources.conditions?.some(
          (name) => c.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.name.toLowerCase())
        )
      )
    : db.conditions.slice(0, 10);

  const filteredFaqs: MedicalFaq[] = selectedSources?.faqs
    ? db.faqs.filter((f) =>
        selectedSources.faqs?.some(
          (q) => f.question.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(f.question.toLowerCase())
        )
      )
    : db.faqs.slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kaggle Clinical Knowledge Base
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedSources ? 'Verified context retrieved for this answer' : 'All available verified clinical records'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Conditions Section */}
          <div>
            <h4 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Stethoscope className="w-4 h-4" />
              Verified Conditions ({filteredConditions.length})
            </h4>

            <div className="space-y-3">
              {filteredConditions.map((condition) => (
                <div
                  key={condition.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {condition.name}
                    </span>
                    <span className="bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {condition.category}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {condition.description}
                  </p>

                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Symptoms: </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {condition.symptoms.join(', ')}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Evidence-based Precautions:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                      {condition.precautions.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                    <strong>When to seek medical attention:</strong> {condition.whenToSeeDoctor}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs Section */}
          {filteredFaqs.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <HelpCircle className="w-4 h-4" />
                Verified Clinical FAQs ({filteredFaqs.length})
              </h4>

              <div className="space-y-3">
                {filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-2 text-xs"
                  >
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Q: {faq.question}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {faq.answer}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {faq.tags.map((t, i) => (
                        <span
                          key={i}
                          className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Verified Kaggle Healthcare Release v2.4.0
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
