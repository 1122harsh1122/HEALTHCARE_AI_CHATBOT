import knowledgeData from '@/data/kaggle_healthcare_knowledge.json';
import { KnowledgeDatabase, MedicalCondition, MedicalFaq } from './types';

// Cast the imported raw json to typed dataset
const database: KnowledgeDatabase = knowledgeData as KnowledgeDatabase;

/**
 * Returns the entire Kaggle healthcare dataset
 */
export function getKnowledgeDatabase(): KnowledgeDatabase {
  return database;
}

/**
 * Retrieve all registered medical conditions
 */
export function getAllConditions(): MedicalCondition[] {
  return database.conditions || [];
}

/**
 * Retrieve condition by unique ID
 */
export function getConditionById(id: string): MedicalCondition | undefined {
  return database.conditions.find((c) => c.id.toLowerCase() === id.toLowerCase());
}

/**
 * Retrieve condition by matching name
 */
export function getConditionByName(name: string): MedicalCondition | undefined {
  const target = name.toLowerCase();
  return database.conditions.find(
    (c) => c.name.toLowerCase().includes(target) || target.includes(c.name.toLowerCase())
  );
}

/**
 * Retrieve conditions matching one or more reported symptoms
 */
export function findConditionsBySymptoms(symptoms: string[]): MedicalCondition[] {
  if (!symptoms || symptoms.length === 0) return [];
  
  const normalizedSymptoms = symptoms.map((s) => s.toLowerCase().trim());
  
  return database.conditions.filter((condition) => {
    const conditionSymptoms = condition.symptoms.map((s) => s.toLowerCase());
    return normalizedSymptoms.some((userSym) =>
      conditionSymptoms.some((condSym) => condSym.includes(userSym) || userSym.includes(condSym))
    );
  });
}

/**
 * Retrieve FAQ entries matching tags or query keywords
 */
export function findFaqsByTags(tags: string[]): MedicalFaq[] {
  if (!tags || tags.length === 0) return [];
  const normalizedTags = tags.map((t) => t.toLowerCase().trim());

  return database.faqs.filter((faq) => {
    const faqTags = faq.tags.map((t) => t.toLowerCase());
    return normalizedTags.some((tag) => faqTags.includes(tag));
  });
}

/**
 * Return summary stats of the loaded Kaggle dataset
 */
export function getDatasetStats() {
  return {
    source: database.metadata.source,
    version: database.metadata.version,
    totalConditions: database.conditions.length,
    totalFaqs: database.faqs.length,
    emergencyTriggersCount: database.emergencyKeywords.length,
    categories: Array.from(new Set(database.conditions.map((c) => c.category))),
  };
}
