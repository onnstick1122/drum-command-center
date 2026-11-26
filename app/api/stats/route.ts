import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchLiveCounts(fallbackRow: any) {
  const sources: Record<string, any> = {};
  const results = await Promise.allSettled([
    (async () => {
      const res = await fetch('https://kick.com/api/v2/channels/unpdrum', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const count = data.followers_count;
      if (typeof count === 'number' && !Number.isNaN(count) && count > 0) return { p: 'Kick', v: count };
      try {
        const jres = await fetch('https://r.jina.ai/http://kick.com/unpdrum', { signal: AbortSignal.timeout(6000) });
        const jtext = await jres.text();
        const jm = jtext.match(/(\d[\d,]*)\s+followers/i);
        if (jm) return { p: 'Kick', v: parseInt(jm[1].replace(/,/g, '')) };
      } catch { /* ignore */ }
      return { p: 'Kick', v: -1 };
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

          // Check for followers in existing data
          let igEntry = allPages.find(p => p.instagram_business_account?.followers_count > 0);
          
          // Also query each page specifically
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

      if (typeof followers_count !== 'number' || followers_count <= 0) {
        const res = await fetch('https://www.instagram.com/unpdrum/', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
        const html = await res.text();
        const match = html.match(/([\d,.]+[KM]?)\s+Followers/i);
        let v: any = match ? match[1].replace(',', '') : '';
        if (typeof v === 'string' && v.includes('K')) v = parseFloat(v) * 1000;
        else if (typeof v === 'string' && v.includes('M')) v = parseFloat(v) * 1000000;
        followers_count = parseInt(v);
      }
      
      return { p: 'Instagram', v: (typeof followers_count === 'number' && !Number.isNaN(followers_count) && followers_count > 0) ? followers_count : -1 };
    })(),
    (async () => {
      const res = await fetch('https://www.facebook.com/profile.php?id=100082025942089', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
      const html = await res.text();
      const match = html.match(/([\d,.]+[KM]?)\s+followers/i);
      let v: any = match ? match[1].replace(',', '') : '';
      if (typeof v === 'string' && v.includes('K')) v = parseFloat(v) * 1000;
      else if (typeof v === 'string' && v.includes('M')) v = parseFloat(v) * 1000000;
      const count = parseInt(v);
      if (count > 0) return { p: 'Facebook', v: count };
      try {
        const jres = await fetch('https://r.jina.ai/http://www.facebook.com/profile.php?id=100082025942089', { signal: AbortSignal.timeout(6000) });
        const jtext = await jres.text();
        const jm = jtext.match(/(\d[\d,]*)\s+followers/i);
        if (jm) return { p: 'Facebook', v: parseInt(jm[1].replace(/,/g, '')) };
      } catch { /* ignore */ }
      return { p: 'Facebook', v: -1 };
    })(),
    (async () => {
      let count = -1;
      try {
        const res = await fetch('https://r.jina.ai/http://soundcloud.com/unpdrum', { headers: { 'X-No-Cache': 'true' }, signal: AbortSignal.timeout(6000) });
        const text = await res.text();
        const m = text.match(/(\d[\d,]*)\s+Followers[\s\S]{0,80}?(\d[\d,]*)\s+Following[\s\S]{0,80}?(\d[\d,]*)\s+Tracks/i) || text.match(/"followers_count":(\d+)/);
        if (m) count = parseInt(m[1].replace(/,/g, ''));
      } catch { /* ignore */ }
      return { p: 'SoundCloud', v: count > 0 ? count : 0 };
    })()
  ]);

  const HARDCODED_BASELINES: Record<string, number> = { Facebook: 747, Kick: 6, SoundCloud: 74 };
  const liveCounts: Record<string, number> = {};
  results.forEach((r, i) => {
    const platforms = ['Kick', 'Twitch', 'YouTube', 'TikTok', 'Instagram', 'Facebook', 'SoundCloud'];
    const p = platforms[i];
    if (r.status === 'fulfilled' && r.value.v > 0) {
      liveCounts[p] = r.value.v;
      sources[p] = 'live';
    } else {
      const hardcoded = HARDCODED_BASELINES[p];
      liveCounts[p] = hardcoded !== undefined ? hardcoded : (Number(fallbackRow?.[p]) || 0);
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
        SoundCloud: parseInt(values[7]?.trim() || '0'),
      };
    });

    const { liveCounts, sources } = await fetchLiveCounts(rows[rows.length - 1]);

    // Sanitize only the single corrupted historical CSV Facebook outlier (807 -> 747).
    // All real drops display normally across every platform.
    rows.forEach(row => {
      if (row.Facebook === 807) row.Facebook = 747;
    });

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


