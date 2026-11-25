'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Zap, Link as LinkIcon, Settings, BarChart3, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CommandCenter() {
  const [accentColor, setAccentColor] = useState('#FF0000');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');

  useEffect(() => {
    const saved = localStorage.getItem('accentColor') || '#FF0000';
    setAccentColor(saved);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const totalFollowers = stats?.latest ? 
    (stats.latest.Twitch + stats.latest.Facebook + stats.latest.Instagram + stats.latest.TikTok + stats.latest.YouTube + stats.latest.Kick) : 0;

  return (
    <div className="min-h-screen bg-[#060606] text-white p-4 font-sans" style={{ '--accent': accentColor } as any}>
      <header className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight">DRUM! FOLLOW ACTIVITY</h1>
        <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 hover:bg-[#111] rounded-full"><RefreshCw size={16} /></button>
            <button className="px-3 py-1 bg-[#111] rounded text-xs border border-neutral-700">Install App</button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {['Dashboard', 'Drum AI', 'Quick Links', 'Settings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 text-xs font-medium rounded ${activeTab === tab ? 'bg-red-600' : 'bg-[#111]'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && stats && (
        <div className="space-y-6">
          <div className="p-6 bg-[#111] rounded-2xl border border-neutral-800 text-center">
            <div className="text-sm text-neutral-400">Total Audience</div>
            <div className="text-4xl font-black text-red-500">{totalFollowers.toLocaleString()}</div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['Twitch', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Kick'].map(p => (
              <div key={p} className="p-4 bg-[#111] rounded-xl border border-neutral-800" style={{ borderLeft: `4px solid ${accentColor}` }}>
                <div className="text-[10px] uppercase text-neutral-500">{p}</div>
                <div className="text-lg font-bold">{stats.latest[p]?.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="h-64 w-full bg-[#111] p-4 rounded-xl border border-neutral-800">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.rows}>
                <XAxis dataKey="timestamp" hide />
                <Tooltip contentStyle={{ backgroundColor: '#060606', border: '1px solid #333' }} />
                <Area type="monotone" dataKey="Twitch" stroke={accentColor} fill={accentColor} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {activeTab === 'Settings' && (
        <div className="p-6 bg-[#111] rounded-2xl border border-neutral-800">
          <h3 className="mb-4 text-sm font-bold">Accent Color</h3>
          <div className="flex gap-2">
            {['#FF0000', '#DC2626', '#F59E0B', '#FFFFFF'].map(c => (
              <button key={c} onClick={() => { setAccentColor(c); localStorage.setItem('accentColor', c); }} className="w-8 h-8 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
