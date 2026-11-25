'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, BarChart3, MessageSquare, Link as LinkIcon, Settings, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CommandCenter() {
  const [accentColor, setAccentColor] = useState('#FF0000');
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Drum AI' | 'Quick Links' | 'Settings'>('Dashboard');
  const [pin, setPin] = useState('2001');
  const [chat, setChat] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('Total');

  useEffect(() => {
    setPin(localStorage.getItem('drum_pin') || '2001');
    setAccentColor(localStorage.getItem('drum_accent') || '#FF0000');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/stats');
      setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const sendMessage = async (msg: string) => {
    if (!msg.trim()) return;
    const newChat = [...chat, { role: 'user' as const, content: msg }];
    setChat(newChat);
    setInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, message: msg, stats: { latest: stats?.latest, previous: stats?.previous, history: stats?.rows?.slice(-15) } }),
      });
      const data = await res.json();
      setChat([...newChat, { role: 'assistant' as const, content: data.reply || data.error }]);
    } catch { setChat([...newChat, { role: 'assistant' as const, content: 'Error connecting to Drum AI.' }]); }
  };

  const platforms = ['Twitch', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Kick'];
  const latest = stats?.latest || {};
  const previous = stats?.previous || {};
  const totalFollowers = platforms.reduce((a, b) => a + (latest[b] || 0), 0);
  const prevTotal = platforms.reduce((a, b) => a + (previous[b] || 0), 0);
  const delta = totalFollowers - prevTotal;

  return (
    <div className='min-h-screen bg-[#060606] text-white p-4 font-sans' style={{ '--accent': accentColor } as any}>
      <header className='flex justify-between items-center mb-6 border-b border-neutral-800 pb-4'>
        <div className='flex items-center gap-2'>
            <div className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />
            <h1 className='text-xl font-bold tracking-tight'>DRUM! FOLLOW ACTIVITY</h1>
        </div>
        <div className='flex gap-2'>
            <button onClick={fetchData} className='p-2 hover:bg-[#111] rounded-full'><RefreshCw size={16} /></button>
            <button onClick={() => setShowModal(!showModal)} className='p-2 hover:bg-[#111] rounded-full'><Lock size={16} /></button>
            <button className='px-3 py-1 bg-[#111] rounded text-xs border border-neutral-700'>Install App</button>
        </div>
      </header>
      {showModal && (
        <div className='fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50'>
            <div className='bg-[#111] p-6 rounded-xl border border-neutral-800 w-full max-w-sm'>
                <h2 className='text-lg font-bold mb-4'>Credentials</h2>
                <input className='w-full bg-[#060606] border border-neutral-700 p-2 mb-2 rounded' placeholder='PIN' value={pin} onChange={e => {setPin(e.target.value); localStorage.setItem('drum_pin', e.target.value)}} />
                <button onClick={() => setShowModal(false)} className='w-full bg-[var(--accent)] py-2 rounded'>Save</button>
            </div>
        </div>
      )}
      <div className='grid grid-cols-4 gap-2 mb-6'>
        {[ {name: 'Dashboard', icon: BarChart3}, {name: 'Drum AI', icon: MessageSquare}, {name: 'Quick Links', icon: LinkIcon}, {name: 'Settings', icon: Settings} ].map(tab => (
          <button key={tab.name} onClick={() => setActiveTab(tab.name as any)} className={'flex flex-col items-center justify-center gap-1 py-2 text-[10px] uppercase font-bold rounded transition-colors ' + (activeTab === tab.name ? 'bg-[var(--accent)] text-white' : 'bg-[#111] text-neutral-500 hover:text-white')}>
            <tab.icon size={16} /> {tab.name}
          </button>
        ))}
      </div>
      {activeTab === 'Dashboard' && stats && (
        <div className='space-y-6'>
          <div className='p-6 bg-[#111] rounded-2xl border border-neutral-800 text-center'>
            <div className='text-xs text-neutral-400'>Total Audience</div>
            <div className='text-4xl font-black text-[var(--accent)]'>{totalFollowers.toLocaleString()}</div>
            <div className={'text-xs ' + (delta >= 0 ? 'text-green-500' : 'text-red-500')}>{delta >= 0 ? '+' : ''}{delta} vs prev</div>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
            {platforms.map(p => (
              <a key={p} href={'https://' + p.toLowerCase() + '.com'} target='_blank' className='p-4 bg-[#111] rounded-xl border border-neutral-800 hover:border-[var(--accent)] transition-colors'>
                <div className='text-[10px] uppercase text-neutral-500'>{p}</div>
                <div className='text-lg font-bold'>{latest[p]?.toLocaleString() || 0}</div>
                <div className={'text-xs ' + (((latest[p]||0) - (previous[p]||0)) >= 0 ? 'text-green-500' : 'text-red-500')}>{(latest[p]||0) - (previous[p]||0)}</div>
              </a>
            ))}
          </div>
          <div className='h-64 bg-[#111] p-4 rounded-xl border border-neutral-800'>
            <div className='flex gap-2 mb-4 overflow-x-auto'>
                {['Total', ...platforms].map(p => <button key={p} onClick={() => setFilter(p)} className={'px-2 py-1 text-[10px] rounded ' + (filter === p ? 'bg-[var(--accent)]' : 'bg-[#222]')}>{p}</button>)}
            </div>
            <ResponsiveContainer width='100%' height='80%'>
              <AreaChart data={stats.rows}>
                <XAxis dataKey='timestamp' hide />
                <Tooltip contentStyle={{ backgroundColor: '#060606', border: '1px solid #333' }} />
                <Area type='monotone' dataKey={filter === 'Total' ? 'Total' : filter} stroke={accentColor} fill={accentColor} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {activeTab === 'Drum AI' && (
        <div className='space-y-4'>
            <div className='h-80 overflow-y-auto space-y-3 p-4 bg-[#111] rounded-xl border border-neutral-800 mb-4'>
                {chat.map((m, i) => <div key={i} className={'p-3 rounded-lg text-sm ' + (m.role === 'user' ? 'bg-[var(--accent)] text-white ml-auto w-3/4' : 'bg-[#222] text-neutral-200 w-3/4')}>{m.content}</div>)}
            </div>
            <div className='grid grid-cols-2 gap-2 mb-4'>
                {['Why did my followers drop or change?', 'Compare latest vs previous stats', 'Which platform is growing fastest?', 'Give me a 7-day follower recovery plan'].map(q => <button key={q} onClick={() => sendMessage(q)} className='text-[10px] p-2 bg-[#111] border border-neutral-700 rounded text-left hover:border-[var(--accent)]'>{q}</button>)}
            </div>
            <div className='flex gap-2'>
                <input value={input} onChange={e => setInput(e.target.value)} className='flex-1 bg-[#111] border border-neutral-700 p-2 rounded text-sm' placeholder='Ask Drum AI...' />
                <button onClick={() => sendMessage(input)} className='bg-[var(--accent)] px-4 py-2 rounded text-sm font-bold'>Send</button>
            </div>
        </div>
      )}
      {activeTab === 'Quick Links' && (
        <div className='grid grid-cols-2 gap-4'>
            {[ {n: 'Twitch', u: 'https://twitch.tv/ustayblowinHIGH'}, {n: 'TikTok', u: 'https://www.tiktok.com/@unpdrum'}, {n: 'YouTube', u: 'https://www.youtube.com/@unpdrum'}, {n: 'Facebook', u: 'https://www.facebook.com/profile.php?id=100088202594000'}, {n: 'Instagram', u: 'https://www.instagram.com/unpdrum/'}, {n: 'Kick', u: 'https://kick.com/unpdrum'} ].map(l => (
                <a key={l.n} href={l.u} target='_blank' className='p-6 bg-[#111] rounded-xl border border-neutral-800 hover:border-[var(--accent)] text-center text-sm font-bold'>{l.n}</a>
            ))}
        </div>
      )}
      {activeTab === 'Settings' && (
        <div className='p-6 bg-[#111] rounded-2xl border border-neutral-800'>
          <h3 className='mb-4 text-sm font-bold uppercase tracking-widest'>Accent Color</h3>
          <input type='color' value={accentColor} onChange={e => {setAccentColor(e.target.value); localStorage.setItem('drum_accent', e.target.value)}} className='w-full h-12 rounded cursor-pointer mb-4' />
          <div className='flex gap-2'>
            {['#FF0000', '#B91C1C', '#DC2626', '#F59E0B', '#FFFFFF'].map(c => (
              <button key={c} onClick={() => { setAccentColor(c); localStorage.setItem('drum_accent', c); }} className='w-8 h-8 rounded-full border border-neutral-700' style={{ background: c }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}