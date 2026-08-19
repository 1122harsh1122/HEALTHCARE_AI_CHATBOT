'use client';

import React from 'react';
import { AlertOctagon, PhoneCall, ShieldX, X } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerReason?: string;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  triggerReason
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-2 border-red-500/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-slide-up text-slate-900 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-full">
            <AlertOctagon className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Immediate Medical Emergency Notice</h3>
            <p className="text-xs text-red-500 font-medium uppercase tracking-wider">
              Urgent Clinical Triage Intercept
            </p>
          </div>
        </div>

        {triggerReason && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg p-3 text-xs text-red-800 dark:text-red-300">
            <strong>Triggered Condition:</strong> Symptoms related to &quot;{triggerReason}&quot; require urgent clinical evaluation.
          </div>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
          If you or someone with you has severe symptoms such as <strong>crushing chest pain, severe shortness of breath, sudden facial drooping/speech slurring, intense bleeding, or thoughts of self-harm</strong>, please contact local emergency responders immediately.
        </p>

        <div className="space-y-2.5 mb-6">
          <a
            href="tel:112"
            className="flex items-center justify-between p-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition shadow-md shadow-red-600/20"
          >
            <span className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              🇮🇳 India Universal Emergency (ERSS)
            </span>
            <span className="text-base font-bold underline">Call 112</span>
          </a>

          <a
            href="tel:108"
            className="flex items-center justify-between p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-md"
          >
            <span className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              🚑 Emergency Ambulance Services
            </span>
            <span className="text-base font-bold underline">Call 108 / 102</span>
          </a>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href="tel:100"
              className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition border border-slate-200 dark:border-slate-700"
            >
              <span>👮 Police Emergency:</span>
              <strong className="text-red-600 dark:text-red-400">100</strong>
            </a>
            <a
              href="tel:14416"
              className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition border border-slate-200 dark:border-slate-700"
            >
              <span>🧠 Tele-MANAS:</span>
              <strong className="text-purple-600 dark:text-purple-400">14416</strong>
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldX className="w-3.5 h-3.5 text-slate-400" />
            Chatbot will not give emergency treatment instructions.
          </span>
          <button
            onClick={onClose}
            className="text-slate-600 dark:text-slate-300 hover:underline font-medium"
          >
            I understand, close
          </button>
        </div>
      </div>
    </div>
  );
};
