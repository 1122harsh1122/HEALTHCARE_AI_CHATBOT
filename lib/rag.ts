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
