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
  if (!activeKey && !process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
  }

  const prompt = `You are Drum AI, a social media growth analyst. 
  Keep every response under 110 words total. Start with 1 bold headline sentence, then 3 to 4 short bullet points (- ..., 1 short sentence per bullet) with bold key stats. Never write long paragraphs or ### headers.
  Here are the current stats: Latest: ${JSON.stringify(stats.latest)}, Previous: ${JSON.stringify(stats.previous)}.
  Here is the recent history: ${JSON.stringify(stats.history)}.
  Analyze which platforms gained or lost followers, explain potential reasons for fluctuations, and provide concrete, actionable steps for recovery and growth.
  User Question: ${message}`;

  let replyText = '';

  // 1. Try Groq FIRST if GROQ_API_KEY is set
  if (process.env.GROQ_API_KEY) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of groqModels) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: 'You are Drum AI, a social media growth analyst. Keep every response under 110 words total. Start with 1 bold headline sentence, then 3 to 4 short bullet points (- ..., 1 short sentence per bullet) with bold key stats. Never write long paragraphs or ### headers.' },
              { role: 'user', content: prompt }
            ]
          }),
          signal: AbortSignal.timeout(7000)
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          replyText = groqData.choices?.[0]?.message?.content || '';
          if (replyText) break;
        } else {
          console.warn(`Groq model ${model} failed with status:`, groqRes.status);
        }
      } catch (groqErr) {
        console.warn(`Groq model ${model} error:`, groqErr);
      }
    }
  }

  // 2. Fall back to Gemini if Groq failed or GROQ_API_KEY is missing
  if (!replyText && activeKey) {
    try {
      const ai = new GoogleGenAI({ 
        apiKey: activeKey, 
        httpOptions: { apiVersion: 'v1beta' } 
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
      });
      if (response && response.text) {
        replyText = response.text;
      }
    } catch (geminiErr) {
      console.error("Gemini fallback error:", geminiErr);
    }
  }

  if (!replyText) {
    return NextResponse.json({ 
      error: 'Drum AI is temporarily busy due to high server demand — please try again in a few seconds.' 
    }, { status: 503 });
  }

  return NextResponse.json({ reply: replyText });
}




