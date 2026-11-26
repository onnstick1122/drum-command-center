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

function applyBogusDropProtection(live: number, baseline: number): number {
  if (!isValidCount(live)) return -1;
  if (isValidCount(baseline) && baseline > 0 && live < baseline * 0.6) return -1; // dropped >40%, treat as bogus
  return live;
}

async function fetchWithRetry(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': ACCEPT_LANGUAGE, ...(init.headers || {}) }, signal: AbortSignal.timeout(7000), ...init });
  return res.text();
}

async function fetchLiveCounts(fallbackRow: any, previousRow: any) {
  const sources: Record<string, any> = {};
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
    (async () => {
      try {
        const res = await fetch('https://soundcloud.com/unpdrum', { headers: { 'User-Agent': UA, 'Accept-Language': ACCEPT_LANGUAGE }, signal: AbortSignal.timeout(7000) });
        let html = await res.text();
        let count = -1;
        const patterns = [
          /"followers_count":(\d+)/,
          /followers_count["']?\s*:\s*(\d+)/i,
          /<meta property="twitter:app:url:googleplay" content="soundcloud:\/\/users:(\d+)"/i,
          /og:description" content="([\d,.]+[KMB]?) followers/i,
          /([\d,.]+[KMB]?) followers/i
        ];
        for (const pat of patterns) {
          const m = html.match(pat);
          if (m) {
            count = cleanCount(m[1]);
            if (isValidCount(count)) break;
          }
        }
        // Mobile fallback
        if (!isValidCount(count)) {
          try {
            const mres = await fetch('https://m.soundcloud.com/unpdrum', { headers: { 'User-Agent': UA, 'Accept-Language': ACCEPT_LANGUAGE }, signal: AbortSignal.timeout(7000) });
            const mhtml = await mres.text();
            const mm = mhtml.match(/"followers_count":(\d+)/) || mhtml.match(/([\d,.]+)\s+followers/i) || mhtml.match(/Followers<\/[^>]+>\s*([\d,.]+)/i);
            if (mm) { count = cleanCount(mm[1]); }
          } catch { /* ignore */ }
        }
        return { p: 'SoundCloud', v: isValidCount(count) ? count : -1 };
      } catch (e) {
        return { p: 'SoundCloud', v: -1 };
      }
    })(),
    (async () => {
      let followers_count = -1;
      const token = process.env.META_ACCESS_TOKEN?.trim();
      
      if (token) {
        try {
          const urls = [
            `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username,followers_count}&access_token=${encodeURIComponent(token)}`,
            `https://graph.facebook.com/v21.0/me/assigned_pages?fields=id,name,instagram_business_account{id,username,followers_count}&access_token=${encodeURIComponent(token)}`
          ];

          const responses = await Promise.all(urls.map(url => fetch(url, { signal: AbortSignal.timeout(5000) }).then(res => res.json())));
          
          let allPages: any[] = [];
          responses.forEach((data) => {
            if (data && data.data) {
              allPages = allPages.concat(data.data);
            }
          });

          let igEntry = allPages.find(p => p.instagram_business_account?.followers_count > 0);
          
          if (!igEntry) {
            for (const page of allPages) {
              try {
                const res = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username,followers_count},connected_instagram_account{id,username,followers_count}&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(5000) });
                const data = await res.json();
                if (data.instagram_business_account?.followers_count > 0) {
                  igEntry = { ...page, instagram_business_account: data.instagram_business_account };
                  break;
                } else if (data.connected_instagram_account?.followers_count > 0) {
                  igEntry = { ...page, instagram_business_account: data.connected_instagram_account };
                  break;
                }
              } catch (e) {
                console.error(`Failed to fetch details for page ${page.id}`, e);
              }
            }
          }

          if (igEntry) {
            followers_count = igEntry.instagram_business_account.followers_count;
          }
        } catch (e) {
          console.error('Meta API fetch failed', e);
        }
      }

      if (!isValidCount(followers_count)) {
        try {
          const res = await fetch('https://www.instagram.com/unpdrum/', { headers: { 'User-Agent': UA, 'Accept-Language': ACCEPT_LANGUAGE }, signal: AbortSignal.timeout(7000) });
          const html = await res.text();
          let count = -1;
          // og:description is the most reliable static source on login walls
          const og = html.match(/<meta property="og:description" content="([^"]+)"/i);
          if (og) {
            const m = og[1].match(/([\d,.]+[KMB]?)\s+Followers/i);
            if (m) count = cleanCount(m[1]);
          }
          // sharedData edge_followed_by
          if (!isValidCount(count)) {
            const m = html.match(/"edge_followed_by":\{"count":(\d+)\}/) || html.match(/"followed_by":\{"count":(\d+)\}/);
            if (m) count = parseInt(m[1]);
          }
          // loose regex last resort
          if (!isValidCount(count)) {
            const m = html.match(/([\d,.]+[KM]?)\s+Followers/i);
            if (m) count = cleanCount(m[1]);
          }
          followers_count = count;
        } catch (e) {
          followers_count = -1;
        }
      }
      
      return { p: 'Instagram', v: isValidCount(followers_count) ? followers_count : -1 };
    })(),
    (async () => {
      const res = await fetch('https://www.facebook.com/profile.php?id=100082025942089', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const match = html.match(/([\d,.]+[KM]?)\s+followers/i);
      let v: any = match ? match[1].replace(',', '') : '';
      if (typeof v === 'string' && v.includes('K')) v = parseFloat(v) * 1000;
      else if (typeof v === 'string' && v.includes('M')) v = parseFloat(v) * 1000000;
      const count = parseInt(v);
      return { p: 'Facebook', v: (typeof count === 'number' && !Number.isNaN(count) && count > 0) ? count : -1 };
    })()
  ]);

  const liveCounts: Record<string, number> = {};
  const platforms = ['Kick', 'Twitch', 'YouTube', 'TikTok', 'Instagram', 'Facebook', 'SoundCloud'];
  results.forEach((r, i) => {
    const p = platforms[i];
    const baseline = Number(fallbackRow?.[p]) || Number(previousRow?.[p]) || 0;
    let live = -1;
    if (r.status === 'fulfilled' && r.value.v > 0) {
      live = r.value.v;
    }
    live = applyBogusDropProtection(live, baseline);
    if (isValidCount(live)) {
      liveCounts[p] = live;
      sources[p] = 'live';
    } else {
      liveCounts[p] = baseline || 0;
      sources[p] = baseline > 0 ? 'baseline' : 'fallback';
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

    const { liveCounts, sources } = await fetchLiveCounts(rows[rows.length - 1], rows[rows.length - 2]);
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


