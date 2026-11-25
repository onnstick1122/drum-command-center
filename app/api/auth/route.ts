import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { pin } = await req.json();
  const validPin = process.env.APP_PIN?.trim();

  if (!validPin) {
    return NextResponse.json({ error: 'System not configured' }, { status: 500 });
  }

  if (pin?.trim() === validPin) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
}
