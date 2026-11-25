import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  const pin = req.headers.get('x-app-pin')?.trim();
  const validPin = process.env.APP_PIN?.trim();

  if (validPin && pin !== validPin) {
    return NextResponse.json({ error: 'Unauthorized — PIN required for Drum AI' }, { status: 401 });
  }

  const { message, stats, apiKey: clientApiKey } = await req.json();

  const activeKey = (clientApiKey && String(clientApiKey).trim()) || process.env.GEMINI_API_KEY;
  if (!activeKey) {
    return NextResponse.json({ error: 'Missing Gemini API key' }, { status: 400 });
  }

  const prompt = `You are Drum AI, a social media growth analyst. 
  Keep every response under 110 words total. Start with 1 bold headline sentence, then 3 to 4 short bullet points (- ..., 1 short sentence per bullet) with bold key stats. Never write long paragraphs or ### headers.
  Here are the current stats: Latest: ${JSON.stringify(stats.latest)}, Previous: ${JSON.stringify(stats.previous)}.
  Here is the recent history: ${JSON.stringify(stats.history)}.
  Analyze which platforms gained or lost followers, explain potential reasons for fluctuations, and provide concrete, actionable steps for recovery and growth.
  User Question: ${message}`;

  let replyText = '';

  try {
    const ai = new GoogleGenAI({ 
      apiKey: activeKey, 
      httpOptions: { apiVersion: 'v1beta' } 
    });

    const modelsToTry = ['gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
    let response;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response && response.text) {
          replyText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} failed, trying next...`, err);
      }
    }

    if (!replyText) {
      try {
        const discoveryRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(activeKey)}`);
        const discoveryData = await discoveryRes.json();
        const foundModels = discoveryData.models?.filter((m: any) => 
          m.supportedGenerationMethods?.includes('generateContent') && 
          m.name?.toLowerCase().includes('flash') &&
          !m.name?.includes('2.5') &&
          !m.name?.includes('2.0') &&
          !m.name?.includes('1.5')
        ) || [];

        for (const foundModel of foundModels) {
          try {
            const modelName = foundModel.name.includes('/') ? foundModel.name.split('/').pop() : foundModel.name;
            response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
            });
            if (response && response.text) {
              replyText = response.text;
              break;
            }
          } catch (discoveryModelErr) {
            console.warn(`Discovered model failed:`, discoveryModelErr);
          }
        }
      } catch (discoveryError) {
        console.error("Dynamic discovery failed:", discoveryError);
      }
    }
  } catch (geminiGlobalErr) {
    console.error("Gemini global execution error:", geminiGlobalErr);
  }

  // If all Gemini attempts failed, try Groq fallback if GROQ_API_KEY is set
  if (!replyText && process.env.GROQ_API_KEY) {
    try {
      console.warn("Falling back to Groq API...");
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are Drum AI, a social media growth analyst. Keep every response under 110 words total. Start with 1 bold headline sentence, then 3 to 4 short bullet points (- ..., 1 short sentence per bullet) with bold key stats. Never write long paragraphs or ### headers.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        replyText = groqData.choices?.[0]?.message?.content || '';
      } else {
        console.error("Groq fallback failed with status:", groqRes.status);
      }
    } catch (groqErr) {
      console.error("Groq fallback error:", groqErr);
    }
  }

  if (!replyText) {
    return NextResponse.json({ 
      error: 'Drum AI is temporarily busy due to high server demand — please try again in a few seconds.' 
    }, { status: 503 });
  }

  return NextResponse.json({ reply: replyText });
}



