import { NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchLiveCounts(fallbackRow: any) {
  const sources: Record<string, any> = {};
  const results = await Promise.allSettled([
    (async () => {
      const res = await fetch('https://kick.com/api/v2/channels/unpdrum', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      return { p: 'Kick', v: data.followers_count };
    })(),
    (async () => {
      const res = await fetch('https://decapi.me/twitch/followcount/ustayblowinHIGH', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      return { p: 'Twitch', v: parseInt(await res.text()) };
    })(),
    (async () => {
      const res = await fetch('https://www.youtube.com/@unpdrum', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const match = html.match(/"subscriberCountText":{"simpleText":"([\d.]+[K|M]?)\s+subscribers?"}/);
      let v: any = match ? match[1] : '';
      if (typeof v === 'string' && v.includes('K')) v = parseFloat(v) * 1000;
      else if (typeof v === 'string' && v.includes('M')) v = parseFloat(v) * 1000000;
      return { p: 'YouTube', v: parseInt(v) || 0 };
    })(),
    (async () => {
      const res = await fetch('https://www.tiktok.com/@unpdrum', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const match = html.match(/"followerCount":(\d+)/);
      return { p: 'TikTok', v: match ? parseInt(match[1]) : 0 };
    })(),
    (async () => {
      const res = await fetch('https://www.instagram.com/unpdrum/', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const match = html.match(/([\d,.]+[KM]?)\s+Followers/i);
      let v: any = match ? match[1].replace(',', '') : '';
      if (typeof v === 'string' && v.includes('K')) v = parseFloat(v) * 1000;
      else if (typeof v === 'string' && v.includes('M')) v = parseFloat(v) * 1000000;
      return { p: 'Instagram', v: parseInt(v) || 0 };
    })(),
    (async () => {
      const res = await fetch('https://www.facebook.com/profile.php?id=100088202594000', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const match = html.match(/([\d,.]+[KM]?)\s+followers/i);
      let v: any = match ? match[1].replace(',', '') : '';
      if (typeof v === 'string' && v.includes('K')) v = parseFloat(v) * 1000;
      else if (typeof v === 'string' && v.includes('M')) v = parseFloat(v) * 1000000;
      return { p: 'Facebook', v: parseInt(v) || 0 };
    })()
  ]);

  const liveCounts: Record<string, number> = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.v >= 0 && !isNaN(r.value.v)) {
      liveCounts[r.value.p] = r.value.v;
      sources[r.value.p] = 'live';
    } else {
      const p = ['Kick', 'Twitch', 'YouTube', 'TikTok', 'Instagram', 'Facebook'][i];
      liveCounts[p] = fallbackRow[p] || 0;
      sources[p] = 'fallback';
    }
  });
  return { liveCounts, sources };
}

export async function GET() {
  try {
    const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRFLd_9rZtKr3eF2vgWViTENOGZTUTirr-fajK2k5IRVL8hR2R4T_rq0Rooi1FbN9-P25SYtjIylAOA/pub?output=csv');
    const csv = await response.text();
    const lines = csv.split('\n');
    
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

    const { liveCounts, sources } = await fetchLiveCounts(rows[rows.length - 1]);
    const liveSnapshot = { 
        timestamp: 'Live Now', 
        Twitch: liveCounts.Twitch,
        Facebook: liveCounts.Facebook,
        Instagram: liveCounts.Instagram,
        TikTok: liveCounts.TikTok,
        YouTube: liveCounts.YouTube,
        Kick: liveCounts.Kick
    };
    rows.push(liveSnapshot);

    return NextResponse.json({
      rows,
      latest: rows[rows.length - 1],
      previous: rows[rows.length - 2] || null,
      liveSources: sources
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

