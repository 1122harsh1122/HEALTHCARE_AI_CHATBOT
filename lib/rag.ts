import { getAllConditions, getKnowledgeDatabase } from './dataset-parser';
import { MedicalCondition, MedicalFaq, RagResult } from './types';

// Stop words to filter out during tokenization.
// Includes generic medical query filler words that appear in almost every health
// question and would otherwise cause false-positive matches across unrelated topics.
const STOP_WORDS = new Set([
  // Standard English stop words
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'cant', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours',
// Generic medical query filler words — appear in virtually every health question
  // and carry NO discriminating signal between different conditions.
  // Keeping these causes false positives (e.g. "symptoms" matching flu FAQ for
  // "heart attack symptoms" query).
  'symptom', 'symptoms', 'sign', 'signs', 'disease', 'condition', 'conditions',
  'treatment', 'treatments', 'cause', 'causes', 'effect', 'effects', 'related',
  'medical', 'health', 'healthcare', 'clinical', 'know', 'tell', 'common',
  'please', 'help', 'information', 'info', 'explain', 'describe', 'list',
  'regarding', 'ask', 'question', 'feel', 'feeling', 'experiencing', 'experience'
]);

/**
 * Detects if user input is basic conversational small talk, greetings, or identity queries
 */
export function isSmallTalk(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const cleaned = input
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!cleaned) return false;

  // Exact phrase matches for conversational greetings & small talk
  const EXACT_SMALL_TALK = new Set([
    'hi', 'hello', 'hey', 'heyy', 'heyyy', 'howdy', 'hola', 'sup', 'yo',
    'good morning', 'good afternoon', 'good evening', 'good day', 'greetings',
    'how are you', 'how are you doing', 'how r u', 'hows it going', 'how do you do',
    'who are you', 'what are you', 'what is your name', 'whats your name', 'tell me about yourself',
    'what can you do', 'what do you do', 'how can you help', 'how does this work',
    'help', 'help me', 'start', 'menu', 'options', 'info',
    'thanks', 'thank you', 'thx', 'thank you so much', 'appreciate it',
    'bye', 'goodbye', 'see you', 'cya', 'have a nice day', 'good night',
    'ok', 'okay', 'cool', 'got it', 'understood', 'nice'
  ]);

  if (EXACT_SMALL_TALK.has(cleaned)) {
    return true;
  }

  // Regex patterns for conversational intents with variations
  const GREETING_PATTERNS = [
    /^(hi|hello|hey|greetings|howdy)\s*(there|carepulse|bot|assistant|doc|doctor)?$/i,
    /^(good\s*(morning|afternoon|evening|day|night))\s*(carepulse|bot|assistant|doc|doctor)?$/i,
    /^how\s*(are\s*you|are\s*u|is\s*it\s*going|do\s*you\s*do|have\s*you\s*been)/i,
    /^who\s*(are\s*you|created\s*you|made\s*you)/i,
    /^what\s*(can\s*you\s*do|are\s*you|is\s*your\s*name|whats\s*your\s*name|can\s*i\s*ask)/i,
    /^(tell\s*me\s*about\s*yourself|introduce\s*yourself)/i,
    /^(thank\s*you|thanks|many\s*thanks|thx)\s*(a\s*lot|so\s*much|carepulse)?$/i,
    /^(bye|goodbye|see\s*you\s*later|take\s*care)\s*(carepulse)?$/i,
    /^(help|what\s*should\s*i\s*do|how\s*to\s*use\s*this)\s*$/i
  ];

  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(cleaned)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns a friendly, pre-set conversational response for small talk and greetings
 */
export function getSmallTalkResponse(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();

  if (
    cleaned.includes('who are you') ||
    cleaned.includes('what are you') ||
    cleaned.includes('what can you do') ||
    cleaned.includes('tell me about yourself') ||
    cleaned.includes('your name')
  ) {
    return `### 🩺 About CarePulse AI\n\nI am **CarePulse AI**, an evidence-based clinical information assistant powered by open-source Kaggle healthcare knowledge bases.\n\n**Here is what I can do for you:**\n- 🔍 **Symptom Triage & Analysis:** Help you understand common symptoms and non-emergency health concerns.\n- 📋 **Disease Overviews & Precautions:** Provide evidence-based self-care precautions from clinical datasets.\n- 💡 **Clinical Q&A:** Answer questions about blood pressure, diabetes warning signs, asthma management, and more.\n- 🚨 **Emergency Triage:** Detect critical symptoms and guide you to emergency care.\n\n**Important Safety Notice:**\n- ❌ I cannot prescribe medications or calculate drug dosages.\n- ❌ I do not provide formal clinical diagnoses; always consult a licensed doctor.\n\n**How can I help you today?** Describe any symptoms or pick a quick topic above!`;
  }

  if (
    cleaned.includes('how are you') ||
    cleaned.includes('how r u') ||
    cleaned.includes('hows it going')
  ) {
    return `### 😊 I'm doing well, thank you!\n\nI am fully operational and ready to assist you with healthcare questions, symptom inquiries, or disease precaution guidance.\n\n**How are you feeling today?** Feel free to describe what symptoms you are experiencing, or click one of the quick topic chips above!`;
  }

  if (
    cleaned.includes('thank') ||
    cleaned.includes('thx') ||
    cleaned.includes('appreciate')
  ) {
    return `### 🙏 You're very welcome!\n\nI'm glad I could assist you. If you have any more questions about symptoms, healthy lifestyle habits, or medical conditions, feel free to ask anytime.\n\nStay healthy and take care!`;
  }

  if (
    cleaned.includes('bye') ||
    cleaned.includes('goodbye') ||
    cleaned.includes('see you') ||
    cleaned.includes('good night')
  ) {
    return `### 👋 Goodbye and Take Care!\n\nThank you for using CarePulse AI. If you experience any new symptoms or need healthcare information in the future, I'll be here to help.\n\n*Remember: If you ever experience an acute emergency (like severe chest pain or trouble breathing), contact **911 / 112** immediately.*`;
  }

  if (
    cleaned === 'help' ||
    cleaned === 'help me' ||
    cleaned.includes('how to use') ||
    cleaned.includes('what should i do')
  ) {
    return `### 💡 How to Use CarePulse AI\n\nGetting medical information is simple:\n\n1. **Describe Symptoms:** Type what you're feeling (e.g., *"I have a throbbing headache with nausea"* or *"Fever with dry cough for 3 days"*).\n2. **Ask Questions:** Inquire about specific conditions (e.g., *"What are early warning signs of diabetes?"* or *"How to lower high blood pressure?"*).\n3. **Quick Topics:** Click any of the pill buttons at the top of the chat for instant exploration.\n\n*Emergency Notice: If you have severe symptoms like crushing chest pain, difficulty breathing, or stroke signs, call **911 / 112** immediately.*`;
  }

  // Default friendly greeting response
  return `### 👋 Hello! How can I assist your health today?\n\nI am **CarePulse AI**, your medical information assistant grounded in verified Kaggle clinical datasets.\n\n**You can ask me about:**\n- Symptoms you are currently experiencing (e.g., *"Fever, cough, and body aches"*)\n- Condition precautions and non-pharmacological self-care (e.g., *"Precautions for migraine headaches"*)\n- General health FAQs (e.g., *"What is normal blood pressure?"*)\n\nOr simply click one of the **Quick Topics** above to get started!`;
}

/**
 * Tokenize, clean, and remove stop words from text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Calculate keyword frequency map
 */
function getTermFrequencies(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

/**
 * Score a single medical condition against user query tokens
 */
function scoreCondition(condition: MedicalCondition, queryTokens: string[]): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];

  const nameTokens = tokenize(condition.name);
  const categoryTokens = tokenize(condition.category);
  const symptomTokens = condition.symptoms.flatMap((s) => tokenize(s));
  const descTokens = tokenize(condition.description);
  const precTokens = condition.precautions.flatMap((p) => tokenize(p));

  const querySet = new Set(queryTokens);

  // Exact full name match bonus
  for (const q of queryTokens) {
    if (nameTokens.includes(q)) {
      score += 15;
      matched.push(q);
    }
  }

  // Category match
  for (const q of queryTokens) {
    if (categoryTokens.includes(q)) {
      score += 5;
      matched.push(q);
    }
  }

  // Symptom match (very high relevance for clinical queries)
  for (const q of queryTokens) {
    const symCount = symptomTokens.filter((st) => st === q).length;
    if (symCount > 0) {
      score += 12 * Math.min(symCount, 3);
      matched.push(q);
    }
  }

  // Precaution or Description match
  for (const q of queryTokens) {
    if (precTokens.includes(q)) {
      score += 4;
      matched.push(q);
    }
    if (descTokens.includes(q)) {
      score += 2;
      matched.push(q);
    }
  }

  return { score, matched: Array.from(new Set(matched)) };
}

/**
 * Score a medical FAQ against user query tokens
 */
function scoreFaq(faq: MedicalFaq, queryTokens: string[]): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];

  const qTokens = tokenize(faq.question);
  const aTokens = tokenize(faq.answer);
  const tagTokens = faq.tags.flatMap((t) => tokenize(t));

  for (const q of queryTokens) {
    if (tagTokens.includes(q)) {
      score += 10;
      matched.push(q);
    }
    if (qTokens.includes(q)) {
      score += 8;
      matched.push(q);
    }
    if (aTokens.includes(q)) {
      score += 2;
      matched.push(q);
    }
  }

  return { score, matched: Array.from(new Set(matched)) };
}

/**
 * Serverless Hybrid RAG retrieval engine
 * Searches the Kaggle dataset and builds an enriched clinical context prompt snippet
 */
export function queryKnowledgeBase(query: string, topConditionsLimit = 3, topFaqsLimit = 3): RagResult {
  const queryTokens = tokenize(query);
  const db = getKnowledgeDatabase();

  if (queryTokens.length === 0) {
    return {
      conditions: [],
      faqs: [],
      contextSnippet: '',
      relevanceScore: 0,
      matchedTokens: []
    };
  }

  // Score all conditions — only keep results with meaningful relevance (score > 10)
  const scoredConditions = db.conditions
    .map((condition) => {
      const { score, matched } = scoreCondition(condition, queryTokens);
      return { condition, score, matched };
    })
    .filter((item) => item.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, topConditionsLimit);

  // Score all FAQs — only keep results with meaningful relevance (score > 10)
  const scoredFaqs = db.faqs
    .map((faq) => {
      const { score, matched } = scoreFaq(faq, queryTokens);
      return { faq, score, matched };
    })
    .filter((item) => item.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, topFaqsLimit);

  const matchedTokens = Array.from(
    new Set([
      ...scoredConditions.flatMap((c) => c.matched),
      ...scoredFaqs.flatMap((f) => f.matched)
    ])
  );

  const topConditions = scoredConditions.map((c) => c.condition);
  const topFaqs = scoredFaqs.map((f) => f.faq);

  const overallScore =
    (scoredConditions[0]?.score || 0) + (scoredFaqs[0]?.score || 0);

  // Format clinical context snippet for system injection
  let contextSnippet = '';

  if (topConditions.length > 0) {
    contextSnippet += `### VERIFIED CLINICAL DATASET REFERENCES (KAGGLE HEALTHCARE DATABASE):\n\n`;
    topConditions.forEach((c, idx) => {
      contextSnippet += `[Condition ${idx + 1}: ${c.name} (${c.category})]\n`;
      contextSnippet += `- Severity: ${c.severity}\n`;
      contextSnippet += `- Description: ${c.description}\n`;
      contextSnippet += `- Associated Symptoms: ${c.symptoms.join(', ')}\n`;
      contextSnippet += `- Evidence-Based Precautions / Self-Care: ${c.precautions.join('; ')}\n`;
      contextSnippet += `- When to Seek Medical Care: ${c.whenToSeeDoctor}\n\n`;
    });
  }

  if (topFaqs.length > 0) {
    contextSnippet += `### VERIFIED CLINICAL Q&A CONTEXT:\n\n`;
    topFaqs.forEach((f, idx) => {
      contextSnippet += `[FAQ ${idx + 1}: Q: ${f.question}]\n`;
      contextSnippet += `Verified Answer: ${f.answer}\n\n`;
    });
  }

  return {
    conditions: topConditions,
    faqs: topFaqs,
    contextSnippet: contextSnippet.trim(),
    relevanceScore: overallScore,
    matchedTokens
  };
}
