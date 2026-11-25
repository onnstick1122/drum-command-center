import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  const { pin, message, stats, apiKey: clientApiKey } = await req.json();
  const validPin = process.env.APP_PIN || "2001";
  
  if (pin !== validPin) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  const activeKey = (clientApiKey && String(clientApiKey).trim()) || process.env.GEMINI_API_KEY;
  if (!activeKey) {
    return NextResponse.json({ error: 'Missing Gemini API key' }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: activeKey });

    const prompt = `You are Drum AI, a social media growth analyst. 
    Here are the current stats: Latest: ${JSON.stringify(stats.latest)}, Previous: ${JSON.stringify(stats.previous)}.
    Here is the recent history: ${JSON.stringify(stats.history)}.
    Analyze which platforms gained or lost followers, explain potential reasons for fluctuations, and provide concrete, actionable steps for recovery and growth.
    User Question: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return NextResponse.json({ reply: response.text || '' });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error?.message || 'AI request failed' }, { status: 500 });
  }
}

