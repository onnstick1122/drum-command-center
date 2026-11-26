import { NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ACCEPT_LANGUAGE = 'en-US,en;q=0.9';

function cleanCount(v: any): number {
  if (typeof v === 'string' && v.includes('K')) return parseFloat(v.replace(',', '')) * 1000;
  if (typeof v === 'string' && v.includes('M')) return parseFloat(v.replace(',', '')) * 1000000;
  if (typeof v === 'string' && v.includes('B')) return parseFloat(v.replace(',', '')) * 1000000000;
  return parseInt(v);
}

function isValidCount(n: any): boolean {
  return typeof n === 'number' && !Number.isNaN(n) && n > 0;
}

async function metaGraph(path: string, token: string) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${path}?access_token=${encodeURIComponent(token)}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': UA }
  });
  return res.json();
}

async function fetchLiveCounts() {
  const sources: Record<string, any> = {};
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const fbPageId = process.env.FACEBOOK_PAGE_ID?.trim();
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID?.trim();

  const results = await Promise.allSettled([
    (async () => {
      const res = await fetch('https://kick.com/api/v2/channels/unpdrum', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const count = data.followers_count;
      return { p: 'Kick', v: (typeof count === 'number' && !Number.isNaN(count) && count > 0) ? count : -1 };
    })(),
    (async () => {
      const res = await fetch('https://decapi.me/twitch/followcount/ustayblowinHIGH', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const count = parseInt(await res.text());
      return { p: 'Twitch', v: (typeof count === 'number' && !Number.isNaN(count) && count > 0) ? count : -1 };
    })(),
    (async () => {
      const res = await fetch('https://www.youtube.com/@unpdrum', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const match = html.match(/"subscriberCountText":{"simpleText":"([\d.,]+\s*[KMB]?)\s+subscribers?"}/) || html.match(/([\d.,]+\s*[KMB]?)\s+subscribers/i);
      let v: any = match ? match[1].replace(',', '') : '';
      if (typeof v === 'string' && v.includes('K')) v = parseFloat(v) * 1000;
      else if (typeof v === 'string' && v.includes('M')) v = parseFloat(v) * 1000000;
      else if (typeof v === 'string' && v.includes('B')) v = parseFloat(v) * 1000000000;
      const count = parseInt(v);
      return { p: 'YouTube', v: (typeof count === 'number' && !Number.isNaN(count) && count > 0) ? count : -1 };
    })(),
    (async () => {
      const res = await fetch('https://www.tiktok.com/@unpdrum', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const match = html.match(/"followerCount":(\d+)/);
      const count = match ? parseInt(match[1]) : -1;
      return { p: 'TikTok', v: (typeof count === 'number' && !Number.isNaN(count) && count > 0) ? count : -1 };
    })(),
    // --- SoundCloud: real live count, no hardcoding ---
    (async () => {
      const handle = 'unpdrum';
      let count = -1;
      try {
        // 1) Desktop profile HTML via window.__sc_hydration
        const res = await fetch(`https://soundcloud.com/${handle}`, { headers: { 'User-Agent': UA, 'Accept-Language': ACCEPT_LANGUAGE }, signal: AbortSignal.timeout(8000) });
        const html = await res.text();
        const hyd = html.match(/"followers_count":(\d+)/) || html.match(/followers_count["']?\s*:\s*(\d+)/i);
        if (hyd) { count = parseInt(hyd[1]); }
      } catch { /* ignore */ }
      // 2) Public oEmbed widget API
      if (!isValidCount(count)) {
        try {
          const res = await fetch(`https://soundcloud.com/oembed?format=json&url=https://soundcloud.com/unpdrum`, { signal: AbortSignal.timeout(8000) });
          const data = await res.json();
          const m = String(data?.html || data?.title || '').match(/([\d,.]+)\s*followers/i) || String(data?.title || '').match(/([\d,.]+)/);
          if (m) { count = cleanCount(m[1]); }
        } catch { /* ignore */ }
      }
      // 3) jina.ai reader rendering (works when Vercel IP is blocked)
      if (!isValidCount(count)) {
        try {
          const res = await fetch(`https://r.jina.ai/http://soundcloud.com/${handle}`, { signal: AbortSignal.timeout(12000) });
          const text = await res.text();
          const m = text.match(/([\d,.]+[KMB]?)\s*followers/i) || text.match(/followers.*?([\d,.]+[KMB]?)/i);
          if (m) { count = cleanCount(m[1]); }
        } catch { /* ignore */ }
      }
      return { p: 'SoundCloud', v: isValidCount(count) ? count : -1 };
    })(),
    // --- Instagram: Meta Graph API ONLY, never HTML scraping ---
    (async () => {
      if (!token) return { p: 'Instagram', v: -1 };
      try {
        let igId = igAccountId;
        if (!igId && fbPageId) {
          const page = await metaGraph(`${fbPageId}?fields=instagram_business_account{id,username,followers_count}`, token);
          if (page?.instagram_business_account?.id) igId = page.instagram_business_account.id;
        }
        if (!igId) {
          // discover linked IG account from any accessible page
          const accounts = await metaGraph('me/accounts?fields=id,name,instagram_business_account{id,username,followers_count}', token);
          const pages = accounts?.data || [];
          const entry = pages.find((p: any) => p.instagram_business_account?.id);
          if (entry) igId = entry.instagram_business_account.id;
        }
        if (!igId) return { p: 'Instagram', v: -1 };
        const data = await metaGraph(`${igId}?fields=followers_count`, token);
        const count = data?.followers_count;
        return { p: 'Instagram', v: (typeof count === 'number' && !Number.isNaN(count) && count > 0) ? count : -1 };
      } catch (e) {
        return { p: 'Instagram', v: -1 };
      }
    })(),
    // --- Facebook: Meta Graph API ONLY, never HTML scraping ---
    (async () => {
      if (!token) return { p: 'Facebook', v: -1 };
      try {
        let pageId = fbPageId;
        if (!pageId) {
          const accounts = await metaGraph('me/accounts?fields=id,name,fan_count,followers_count', token);
          const pages = accounts?.data || [];
          const page = pages.find((p: any) => (p.followers_count || 0) > 0 || (p.fan_count || 0) > 0);
          if (page) pageId = page.id;
        }
        if (!pageId) return { p: 'Facebook', v: -1 };
        const data = await metaGraph(`${pageId}?fields=followers_count,fan_count`, token);
        const count = data?.followers_count ?? data?.fan_count;
        return { p: 'Facebook', v: (typeof count === 'number' && !Number.isNaN(count) && count > 0) ? count : -1 };
      } catch (e) {
        return { p: 'Facebook', v: -1 };
      }
    })()
  ]);

  const liveCounts: Record<string, number> = {};
  const platforms = ['Kick', 'Twitch', 'YouTube', 'TikTok', 'Instagram', 'Facebook', 'SoundCloud'];
  results.forEach((r, i) => {
    const p = platforms[i];
    let live = -1;
    if (r.status === 'fulfilled' && r.value.v > 0) {
      live = r.value.v;
    }
    if (isValidCount(live)) {
      liveCounts[p] = live;
      sources[p] = 'live';
    } else {
      liveCounts[p] = 0;
      sources[p] = 'unavailable';
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
        SoundCloud: parseInt(values[7]?.trim() || '0'),
      };
    });

    const { liveCounts, sources } = await fetchLiveCounts();
    const liveSnapshot: { 
        timestamp: string; 
        Twitch: number; 
        Facebook: number; 
        Instagram: number; 
        TikTok: number; 
        YouTube: number; 
        Kick: number; 
        SoundCloud: number; 
    } = { 
        timestamp: 'Live Now', 
        Twitch: liveCounts.Twitch,
        Facebook: liveCounts.Facebook,
        Instagram: liveCounts.Instagram,
        TikTok: liveCounts.TikTok,
        YouTube: liveCounts.YouTube,
        Kick: liveCounts.Kick,
        SoundCloud: liveCounts.SoundCloud
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
