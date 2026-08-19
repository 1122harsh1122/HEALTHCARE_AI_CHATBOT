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

    // Step 5: Construct Clinical System Prompt with Strict Brevity Guidelines
    const systemPrompt = `You are CarePulse AI, a concise, empathetic clinical information assistant grounded in Kaggle healthcare datasets.

STRICT CONCISENESS & FORMATTING RULES:
1. BREVITY FIRST: Keep answers short, direct, and scannable (maximum 120-150 words total). Avoid long introductory fluff and essays.
2. RESPONSE STRUCTURE:
   - **Overview**: 1 concise sentence explaining the condition or answer.
   - **Key Symptoms**: 3-4 short bullet points (if applicable).
   - **Actionable Self-Care**: 3-4 practical, evidence-based precaution bullets.
   - **When to See a Doctor**: 1 concise closing sentence.
3. CLINICAL BOUNDARIES: Never calculate drug dosages, prescribe medicines, or provide formal physical diagnoses.
4. ACCURACY: Ground your guidance in the verified Kaggle clinical context provided below.

${ragResult.contextSnippet ? ragResult.contextSnippet : 'Provide concise, evidence-based medical education and symptom guidance.'}
`;

    // Step 6: Stream response from selected LLM provider or High-Precision Clinical Fallback
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

    // High-Precision Clinical Dataset Synthesis Mode
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
    responseText += `### 💡 ${topFaq.question}\n\n`;
    responseText += `${topFaq.answer}\n\n`;

    if (ragResult.conditions.length > 0) {
      const topCond = ragResult.conditions[0];
      responseText += `#### 🩺 Related: **${topCond.name}**\n`;
      responseText += `**Key Self-Care Points:**\n`;
      topCond.precautions.slice(0, 3).forEach((p: string) => {
        responseText += `- ${p}\n`;
      });
      responseText += `\n**When to Consult a Doctor:** ${topCond.whenToSeeDoctor}\n\n`;
    }
  } else if (ragResult.conditions.length > 0) {
    const primaryCond = ragResult.conditions[0];
    responseText += `### 🩺 ${primaryCond.name}\n\n`;
    responseText += `**Overview:** ${primaryCond.description}\n\n`;

    responseText += `**Key Symptoms:**\n`;
    primaryCond.symptoms.slice(0, 4).forEach((s: string) => {
      responseText += `- ${s}\n`;
    });

    responseText += `\n**Actionable Self-Care & Precautions:**\n`;
    primaryCond.precautions.slice(0, 4).forEach((p: string) => {
      responseText += `- ${p}\n`;
    });

    responseText += `\n**When to Seek Medical Care:** ${primaryCond.whenToSeeDoctor}\n\n`;
  } else {
    // No relevant dataset match found — return clean guidance
    responseText += `### 🔍 Topic Not Found in Dataset\n\n`;
    responseText += `I couldn't find an exact clinical match for **"${userPrompt.slice(0, 80)}"** in the current database.\n\n`;
    responseText += `**Suggestions:**\n`;
    responseText += `- Try searching with simpler terms (e.g., *"stomach pain"*, *"fever"*, *"migraine"*, *"skin rash"*, *"back pain"*).\n`;
    responseText += `- Click any of the **Quick Topic chips** above to explore covered conditions.\n\n`;
    responseText += `*Emergency: For severe symptoms like chest pressure or breathlessness, call **112 / 108** immediately.*\n\n`;
  }

  responseText += `---\n${CLINICAL_DISCLAIMER}`;

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
