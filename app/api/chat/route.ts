import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  const { pin, message, stats } = await req.json();
  const validPin = process.env.APP_PIN || "2001";
  
  const apiKey = process.env.GEMINI_API_KEY; 
  
  if (pin !== validPin && !apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey! });

    const prompt = `You are Drum AI. Context: Current social media stats: ${JSON.stringify(stats)}. Answer the user concisely: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: prompt,
    });
    return NextResponse.json({ reply: response.text || '' });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: 'Failed to chat with AI' }, { status: 500 });
  }
}
