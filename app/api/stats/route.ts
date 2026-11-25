import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRFLd_9rZtKr3eF2vgWViTENOGZTUTirr-fajK2k5IRVL8hR2R4T_rq0Rooi1FbN9-P25SYtjIylAOA/pub?output=csv');
    const csv = await response.text();
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const rows = lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',');
      return {
        timestamp: values[0]?.trim() || '',
        Twitch: parseInt(values[1]?.trim() || '0'),
        Facebook: parseInt(values[2]?.trim() || '0'),
        Instagram: parseInt(values[3]?.trim() || '0'),
        TikTok: parseInt(values[4]?.trim() || '0'),
        YouTube: parseInt(values[5]?.trim() || '0'),
        Kick: parseInt(values[6]?.trim() || '0'),
      };
    });

    return NextResponse.json({
      rows,
      latest: rows[rows.length - 1],
      previous: rows[rows.length - 2] || null
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
