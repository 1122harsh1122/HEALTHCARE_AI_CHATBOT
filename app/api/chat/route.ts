import { NextRequest, NextResponse } from 'next/server';
import { evaluateMedicalSafety, CLINICAL_DISCLAIMER } from '@/lib/guardrails';
import { queryKnowledgeBase, isSmallTalk, getSmallTalkResponse, isBmiQuery, handleBmiQuery } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serverless streaming chat endpoint for Healthcare AI Assistant
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, provider = 'auto' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request payload: messages array is required' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage.content || '';

    // Step 1: Execute Medical Safety Guardrails Pre-Check (Emergency & Dosage requests)
    const safetyAssessment = evaluateMedicalSafety(userPrompt);

    if (safetyAssessment.isEmergency) {
      return createEmergencyStreamResponse(safetyAssessment.safeRefusalMessage || '');
    }

    if (safetyAssessment.isDosageQuery || safetyAssessment.isPrescriptionRequest) {
      return createSafeRefusalStreamResponse(safetyAssessment.safeRefusalMessage || '');
    }

    // Step 2: Conversational Intent Router (Small Talk & Greetings Check)
    // If user query is a greeting, capability question, or pleasantry, return friendly response immediately and skip RAG search
    if (isSmallTalk(userPrompt)) {
      const greetingResponse = getSmallTalkResponse(userPrompt);
      return createConversationalStreamResponse(greetingResponse);
    }

    // Step 3: Clinical Health Calculators (BMI Calculator Tool)
    // If user query is requesting a BMI calculation or asking about body mass index
    if (isBmiQuery(userPrompt)) {
      const bmiResponse = handleBmiQuery(userPrompt);
      return createConversationalStreamResponse(bmiResponse);
    }

    // Step 4: Execute Kaggle Dataset RAG Retrieval (Symptom & Disease Knowledge Search)
    const ragResult = queryKnowledgeBase(userPrompt, 3, 2);

    const conditionNames = ragResult.conditions.map((c) => c.name);
    const faqQuestions = ragResult.faqs.map((f) => f.question);

    // Step 3: Construct Clinical System Prompt
    const systemPrompt = `You are CarePulse AI, a knowledgeable, empathetic, and responsible clinical AI assistant built to provide evidence-based healthcare education and symptom guidance.

STRICT CLINICAL RULES & GUIDELINES:
1. Informational Guidance Only: You provide medical education, lifestyle recommendations, and symptom triage. You NEVER make a definitive clinical diagnosis or replace a licensed physician.
2. Safety & Limitations: Never recommend specific drug dosages or write prescriptions.
3. Clarity & Empathy: Organize answers with clear markdown headers, bulleted lists for precautions, and concise explanations.
4. Kaggle Healthcare Reference Context: Use the verified clinical context provided below to ensure scientific accuracy.
5. Mandatory Closing: Always conclude your guidance by stating when the patient should consult a doctor or seek immediate emergency care if symptoms worsen.

${ragResult.contextSnippet ? ragResult.contextSnippet : 'Note: No specific Kaggle condition record matched closely. Provide general, evidence-based medical guidance.'}
`;

    // Step 4: Stream response from selected LLM provider or High-Precision Clinical Fallback
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // Check if live API keys are present
    if (geminiKey && (provider === 'auto' || provider === 'gemini')) {
      return await streamGeminiResponse(systemPrompt, messages, geminiKey, conditionNames, faqQuestions);
    }

    if (openaiKey && (provider === 'auto' || provider === 'openai')) {
      return await streamOpenAIResponse(systemPrompt, messages, openaiKey, conditionNames, faqQuestions);
    }

    if (groqKey && (provider === 'auto' || provider === 'groq')) {
      return await streamGroqResponse(systemPrompt, messages, groqKey, conditionNames, faqQuestions);
    }

    // Step 5: High-Precision Clinical Dataset Synthesis Mode (Runs smoothly on Vercel even without API keys!)
    return streamClinicalSimulation(userPrompt, ragResult, conditionNames, faqQuestions);

  } catch (error: any) {
    console.error('API /api/chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal healthcare assistant processing error' },
      { status: 500 }
    );
  }
}

/**
 * Stream emergency response
 */
function createEmergencyStreamResponse(emergencyText: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(emergencyText));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Is-Emergency': 'true',
      'X-Guardrail-Blocked': 'true'
    }
  });
}

/**
 * Stream safe refusal response
 */
function createSafeRefusalStreamResponse(refusalText: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(refusalText));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Guardrail-Blocked': 'true'
    }
  });
}

/**
 * Stream conversational small-talk / greeting response
 */
function createConversationalStreamResponse(greetingText: string) {
  const encoder = new TextEncoder();
  const chunks = greetingText.match(/.{1,24}/g) || [greetingText];

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Intent': 'conversational-greeting'
    }
  });
}

/**
 * Google Gemini Live Streaming
 */
async function streamGeminiResponse(
  systemPrompt: string,
  messages: any[],
  apiKey: string,
  conditionNames: string[],
  faqQuestions: string[]
) {
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    },
    {
      role: 'model',
      parts: [{ text: 'Understood. I will act as a responsible healthcare assistant utilizing verified Kaggle clinical context.' }]
    },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const candidateText =
              data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText) {
              controller.enqueue(encoder.encode(candidateText));
            }
          } catch (e) {
            // ignore non-json keep-alives
          }
        }
      }
    }
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-RAG-Conditions': encodeURIComponent(JSON.stringify(conditionNames)),
      'X-RAG-Faqs': encodeURIComponent(JSON.stringify(faqQuestions))
    }
  });
}

/**
 * OpenAI Live Streaming
 */
async function streamOpenAIResponse(
  systemPrompt: string,
  messages: any[],
  apiKey: string,
  conditionNames: string[],
  faqQuestions: string[]
) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-4o-mini',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`OpenAI API returned status ${response.status}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          } catch (e) {
            // ignore parsing errors on stream chunks
          }
        }
      }
    }
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-RAG-Conditions': encodeURIComponent(JSON.stringify(conditionNames)),
      'X-RAG-Faqs': encodeURIComponent(JSON.stringify(faqQuestions))
    }
  });
}

/**
 * Groq Live Streaming
 */
async function streamGroqResponse(
  systemPrompt: string,
  messages: any[],
  apiKey: string,
  conditionNames: string[],
  faqQuestions: string[]
) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const payload = {
    model: 'llama-3.1-8b-instant',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Groq API returned status ${response.status}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-RAG-Conditions': encodeURIComponent(JSON.stringify(conditionNames)),
      'X-RAG-Faqs': encodeURIComponent(JSON.stringify(faqQuestions))
    }
  });
}

/**
 * High-Precision Clinical Dataset Synthesis Engine
 * Provides instant, verified streaming answers even without third-party API keys.
 */
function streamClinicalSimulation(
  userPrompt: string,
  ragResult: any,
  conditionNames: string[],
  faqQuestions: string[]
) {
  let responseText = '';

  if (ragResult.faqs.length > 0) {
    const topFaq = ragResult.faqs[0];
    responseText += `### ${topFaq.question}\n\n`;
    responseText += `${topFaq.answer}\n\n`;

    if (ragResult.conditions.length > 0) {
      const topCond = ragResult.conditions[0];
      responseText += `#### Related Clinical Condition: **${topCond.name}**\n`;
      responseText += `${topCond.description}\n\n`;
      responseText += `**Evidence-Based Precautions & Self-Care:**\n`;
      topCond.precautions.forEach((p: string) => {
        responseText += `- ${p}\n`;
      });
      responseText += `\n**When to Seek Immediate Medical Evaluation:**\n${topCond.whenToSeeDoctor}\n\n`;
    }
  } else if (ragResult.conditions.length > 0) {
    const primaryCond = ragResult.conditions[0];
    responseText += `### Clinical Evaluation: **${primaryCond.name}**\n\n`;
    responseText += `**Overview & Pathology:**\n${primaryCond.description}\n\n`;
    responseText += `**Key Associated Symptoms:**\n${primaryCond.symptoms.map((s: string) => `• ${s}`).join('\n')}\n\n`;
    responseText += `**Evidence-Based Precautions & Non-Pharmacological Management:**\n`;
    primaryCond.precautions.forEach((p: string) => {
      responseText += `- ${p}\n`;
    });
    responseText += `\n**Clinical Red Flags & When to See a Doctor:**\n${primaryCond.whenToSeeDoctor}\n\n`;

    if (ragResult.conditions.length > 1) {
      responseText += `#### Differential Considerations from Kaggle Healthcare Knowledge Base:\n`;
      ragResult.conditions.slice(1).forEach((other: any) => {
        responseText += `- **${other.name}** (${other.category}): Severity ${other.severity}. ${other.description.slice(0, 140)}...\n`;
      });
      responseText += `\n`;
    }
  } else {
    // No relevant dataset match found — return an honest, helpful "not found" response
    responseText += `### No Exact Match Found in Kaggle Knowledge Base\n\n`;
    responseText += `I couldn't find a condition or FAQ in the current Kaggle clinical dataset that closely matches your query about **"${userPrompt.slice(0, 120)}"**.\n\n`;
    responseText += `**This could mean:**\n`;
    responseText += `- The condition or term may be listed under a different name (try using the common name, e.g. "heart attack" instead of "myocardial infarction", or vice versa).\n`;
    responseText += `- The topic may not yet be in the current version of the Kaggle healthcare dataset.\n\n`;
    responseText += `**Currently covered topics include:**\n`;
    responseText += `Hypertension, Type 2 Diabetes, Asthma, Migraine, GERD / Acid Reflux, Allergic Rhinitis, Urinary Tract Infection, Osteoarthritis, Influenza, Acute Bronchitis, Iron Deficiency Anemia, Anxiety / Panic Disorder, Hypothyroidism, COVID-19, Eczema, and Heart Attack / Myocardial Infarction.\n\n`;
    responseText += `**Suggested next step:** Please try rephrasing your question or use one of the quick topic chips at the top of the page. If you are experiencing an active medical emergency, call **911 / 112** immediately.\n\n`;
  }

  responseText += `\n---\n${CLINICAL_DISCLAIMER}`;

  // Stream text in small chunks for realistic streaming UI feel
  const encoder = new TextEncoder();
  const chunks = responseText.match(/.{1,16}/g) || [responseText];

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-RAG-Conditions': encodeURIComponent(JSON.stringify(conditionNames)),
      'X-RAG-Faqs': encodeURIComponent(JSON.stringify(faqQuestions))
    }
  });
}
