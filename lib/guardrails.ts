import { SafetyCheckResult } from './types';
import knowledgeData from '@/data/kaggle_healthcare_knowledge.json';

const EMERGENCY_KEYWORDS = knowledgeData.emergencyKeywords || [
  'chest pain', 'pressure in chest', 'left arm pain', 'radiating jaw pain',
  'shortness of breath', 'cannot breathe', 'gasping for air', 'cyanosis', 'blue lips',
  'sudden numbness', 'facial drooping', 'slurred speech', 'stroke', 'loss of vision',
  'severe bleeding', 'uncontrolled bleeding', 'coughing blood', 'vomiting blood',
  'anaphylaxis', 'throat swelling', 'cannot swallow', 'severe allergic reaction',
  'unconscious', 'unresponsive', 'fainting with chest pain', 'seizure lasting over 5 minutes',
  'suicidal', 'want to kill myself', 'self harm', 'poison', 'swallowed poison', 'overdose'
];

const EMERGENCY_PATTERNS = [
  /chest\s*(pain|pressure|tightness|crushing|squeezing)/i,
  /(can['']?t|cannot|unable to)\s*breathe/i,
  /short(ness)?\s*of\s*breath/i,
  /radiat(ing|es)\s*to\s*(left\s*arm|jaw|neck|back)/i,
  /face\s*droop(ing)?/i,
  /slurr(ed|ing)\s*speech/i,
  /stroke\s*symptoms?/i,
  /severe\s*(allergic\s*reaction|anaphylaxis)/i,
  /throat\s*closing\s*up/i,
  /kill\s*myself|suicid(e|al)|end\s*my\s*life|self\s*harm/i,
  /swallowed\s*(poison|bleach|chemical|pills|battery)/i,
  /unconscious|unresponsive|passed\s*out\s*with/i,
  /coughing\s*(up\s*)?blood|vomiting\s*blood/i
];

const DOSAGE_PATTERNS = [
  /how\s*(much|many)\s*(mg|milligrams?|tablets?|pills?|doses?|ml|drops?)/i,
  /what\s*(is|are)\s*the\s*(correct\s*)?dos(e|age)\s*(for|of)/i,
  /can\s*i\s*(take|give)\s*(\d+|\w+)\s*(mg|tablets?|pills?)/i,
  /prescribe\s*(me)?\s*(a|some|an)?\s*(antibiotic|medicine|medication|drug|painkiller|xanax|adderall|amoxicillin|ozempic)/i,
  /write\s*(me\s*)?a\s*prescription/i,
  /calculate\s*(the\s*)?dose/i,
  /how\s*often\s*should\s*i\s*take\s*(amoxicillin|metformin|lisinopril|atorvastatin|levothyroxine|ibuprofen|tylenol|acetaminophen)/i
];

const HOTLINES = [
  { country: 'United States & Canada', number: '911', service: 'Emergency Medical Services' },
  { country: 'US Crisis & Suicide Lifeline', number: '988', service: '24/7 Suicide & Crisis Lifeline' },
  { country: 'United Kingdom', number: '999 or 111', service: 'Emergency / NHS Urgent Advice' },
  { country: 'European Union & India', number: '112', service: 'Universal Emergency Helpline' },
  { country: 'US Poison Control', number: '1-800-222-1222', service: 'National Poison Action Center' }
];

/**
 * Evaluates user input against clinical safety rules and emergency triage criteria
 */
export function evaluateMedicalSafety(userPrompt: string): SafetyCheckResult {
  const normalized = userPrompt.toLowerCase().trim();
  const matchedTriggers: string[] = [];

  // Check emergency keywords & regex patterns
  for (const keyword of EMERGENCY_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase())) {
      matchedTriggers.push(keyword);
    }
  }

  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(normalized)) {
      matchedTriggers.push(pattern.source);
    }
  }

  const isEmergency = matchedTriggers.length > 0;

  // Check dosage calculation or prescription request
  let isDosageQuery = false;
  let isPrescriptionRequest = false;

  for (const pattern of DOSAGE_PATTERNS) {
    if (pattern.test(normalized)) {
      isDosageQuery = true;
      if (normalized.includes('prescribe') || normalized.includes('prescription')) {
        isPrescriptionRequest = true;
      }
      matchedTriggers.push('dosage-or-prescription-request');
      break;
    }
  }

  // Determine urgency level
  let urgencyLevel: 'low' | 'moderate' | 'high' | 'emergency' = 'low';
  if (isEmergency) {
    urgencyLevel = 'emergency';
  } else if (isDosageQuery || isPrescriptionRequest) {
    urgencyLevel = 'high';
  } else if (normalized.includes('fever') || normalized.includes('pain') || normalized.includes('swelling')) {
    urgencyLevel = 'moderate';
  }

  // Generate safe refusal messages if needed
  let safeRefusalMessage: string | undefined;

  if (isEmergency) {
    safeRefusalMessage = `### 🚨 CRITICAL MEDICAL EMERGENCY DETECTED

**If you or someone nearby is experiencing a life-threatening medical event, STOP reading and contact emergency services immediately.**

- **United States & Canada**: Call **911**
- **Suicide & Mental Health Crisis Lifeline**: Call or text **988**
- **United Kingdom**: Call **999** (Emergency) or **111** (Urgent Advice)
- **European Union & India**: Call **112**
- **US Poison Control**: Call **1-800-222-1222**

*Do not wait for online advice when symptoms like severe chest pain, sudden numbness/facial drooping, difficulty breathing, or severe allergic swelling occur. Immediate emergency medical evaluation is necessary.*`;
  } else if (isDosageQuery || isPrescriptionRequest) {
    safeRefusalMessage = `### ⚠️ Prescription & Dosage Safety Notice

As an AI healthcare assistant, **I cannot prescribe medications, calculate specific dosages, or authorize drug regimens**. 

Medication dosages depend strictly on individualized clinical factors including:
- Exact patient weight and pediatric/geriatric considerations
- Renal (kidney) and hepatic (liver) function
- Concurrent medications and drug-drug interactions
- Complete medical and allergy history

**Recommended Next Steps:**
1. Please consult your licensed healthcare provider or prescribing physician.
2. Contact your local licensed pharmacist, who can review your specific prescription history.
3. Review the patient information leaflet that accompanied your prescribed medication container.`;
  }

  return {
    isEmergency,
    isDosageQuery,
    isPrescriptionRequest,
    triggers: Array.from(new Set(matchedTriggers)),
    safeRefusalMessage,
    urgencyLevel,
    emergencyHotlines: HOTLINES
  };
}

/**
 * Standard disclaimer to append or include in clinical conversations
 */
export const CLINICAL_DISCLAIMER = `*Disclaimer: CarePulse AI is designed strictly for informational and educational guidance based on open medical datasets. It does not provide definitive medical diagnoses, clinical prescriptions, or emergency triage. Always seek the advice of a qualified physician or healthcare provider with any questions you may have regarding a medical condition.*`;
