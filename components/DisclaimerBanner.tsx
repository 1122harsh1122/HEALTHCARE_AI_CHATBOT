'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, X } from 'lucide-react';

interface DisclaimerBannerProps {
  onEmergencyClick?: () => void;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ onEmergencyClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <aside aria-label="Medical safety notice" className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs sm:text-sm transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="truncate sm:whitespace-normal">
            <span className="font-semibold text-amber-700 dark:text-amber-300">Medical Informational Notice:</span>{' '}
            CarePulse AI is for educational guidance using open Kaggle healthcare data. Not a substitute for professional clinical advice.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-amber-700 dark:text-amber-400 hover:underline font-medium flex items-center gap-1 text-xs"
          >
            {isExpanded ? 'Less' : 'Details'}
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onEmergencyClick && (
            <button
              onClick={onEmergencyClick}
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-2 py-0.5 rounded text-xs transition-colors flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              Emergency?
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-100 p-0.5"
            aria-label="Dismiss disclaimer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="max-w-5xl mx-auto mt-2 pt-2 border-t border-amber-500/20 text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed space-y-1">
          <p>
            • <strong>No Doctor-Patient Relationship:</strong> Using this application does not establish a medical or clinical relationship.
          </p>
          <p>
            • <strong>Prescription Limitation:</strong> This bot will never calculate drug dosages, prescribe controlled substances, or replace diagnostic laboratory testing.
          </p>
          <p>
            • <strong>Immediate Emergency:</strong> If experiencing crushing chest pain, difficulty breathing, acute paralysis, or suicidal thoughts, call <strong>911 / 999 / 112</strong> immediately.
          </p>
        </div>
      )}
    </aside>
  );
};
