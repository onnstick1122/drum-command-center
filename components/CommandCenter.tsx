'use client';

import { useState, useEffect } from 'react';

export default function CommandCenter() {
  const [accentColor, setAccentColor] = useState('#FF0000');
  const [version, setVersion] = useState('loading...');

  useEffect(() => {
    const savedColor = localStorage.getItem('accentColor') || '#FF0000';
    setAccentColor(savedColor);

    fetch('/api/version')
      .then(res => res.json())
      .then(data => setVersion(data.version));
  }, []);

  const updateColor = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('accentColor', color);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100 p-6" style={{ '--accent': accentColor } as any}>
      <header className="flex justify-between items-center mb-8 border-b border-neutral-800 pb-6">
        <h1 className="text-2xl font-bold">Drum's Command Center</h1>
        <div className="flex gap-2">
            <button className="px-4 py-2 bg-neutral-800 rounded-lg text-sm">Install App</button>
            <button className="px-4 py-2 bg-neutral-800 rounded-lg text-sm">PIN / Key</button>
        </div>
      </header>

      <main className="grid gap-6">
        <section className="bg-[#141414] border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Dashboard</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {['Twitch', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Kick'].map(platform => (
              <div key={platform} className="p-4 border-l-4 rounded bg-neutral-900" style={{ borderColor: accentColor }}>
                <div className="text-xs text-neutral-400">{platform}</div>
                <div className="text-xl font-bold">---</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      <footer className="mt-8 text-center text-xs text-neutral-600">
        v{version}
      </footer>
    </div>
  );
}
