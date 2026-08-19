export interface MedicalCondition {
  id: string;
  name: string;
  category: string;
  severity: string;
  description: string;
  symptoms: string[];
  precautions: string[];
  whenToSeeDoctor: string;
  relatedFaqIds?: string[];
}

export interface MedicalFaq {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}

export interface KnowledgeDatabase {
  metadata: {
    source: string;
    version: string;
    lastUpdated: string;
    totalConditions: number;
    totalFaqs: number;
  };
  emergencyKeywords: string[];
  conditions: MedicalCondition[];
  faqs: MedicalFaq[];
}

export interface RagResult {
  conditions: MedicalCondition[];
  faqs: MedicalFaq[];
  contextSnippet: string;
  relevanceScore: number;
  matchedTokens: string[];
}

export interface SafetyCheckResult {
  isEmergency: boolean;
  isDosageQuery: boolean;
  isPrescriptionRequest: boolean;
  triggers: string[];
  safeRefusalMessage?: string;
  urgencyLevel: 'low' | 'moderate' | 'high' | 'emergency';
  emergencyHotlines?: {
    country: string;
    number: string;
    service: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isEmergencyAlert?: boolean;
  isGuardrailBlocked?: boolean;
  ragSources?: {
    conditions?: string[];
    faqs?: string[];
  };
}

export interface ChatRequestPayload {
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
  provider?: 'auto' | 'gemini' | 'openai' | 'groq' | 'demo';
  patientProfile?: {
    age?: number;
    gender?: string;
    knownConditions?: string[];
  };
}
