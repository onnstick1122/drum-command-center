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

  try {
    const ai = new GoogleGenAI({ 
      apiKey: activeKey, 
      httpOptions: { apiVersion: 'v1beta' } 
    });

    const prompt = `You are Drum AI, a social media growth analyst. 
    Here are the current stats: Latest: ${JSON.stringify(stats.latest)}, Previous: ${JSON.stringify(stats.previous)}.
    Here is the recent history: ${JSON.stringify(stats.history)}.
    Analyze which platforms gained or lost followers, explain potential reasons for fluctuations, and provide concrete, actionable steps for recovery and growth.
    User Question: ${message}`;

    let response;
    let lastError;
    const modelsToTry = ['gemini-flash-latest', 'gemini-3-flash-preview', 'gemini-2.5-flash'];

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response) break;
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} failed, trying next...`);
      }
    }

    if (!response) {
      try {
        const discoveryRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(activeKey)}`);
        const discoveryData = await discoveryRes.json();
        const foundModel = discoveryData.models?.find((m: any) => 
          m.supportedGenerationMethods?.includes('generateContent') && 
          m.name?.toLowerCase().includes('flash')
        );

        if (foundModel) {
          const modelName = foundModel.name.includes('/') ? foundModel.name.split('/').pop() : foundModel.name;
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
        }
      } catch (discoveryError) {
        console.error("Dynamic discovery failed:", discoveryError);
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to generate content with any model");
    }

    return NextResponse.json({ reply: response.text || '' });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error?.message || 'AI request failed' }, { status: 500 });
  }
}

