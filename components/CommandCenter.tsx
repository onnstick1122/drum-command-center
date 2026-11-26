'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, BarChart3, MessageSquare, Link as LinkIcon, Settings, Lock, RotateCcw, Camera, PlayCircle, Music2, Gamepad2, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function formatAssistantMessage(text: string) {
  if (!text) return null;
  const cleaned = text.replace(/###/g, '').trim();
  const lines = cleaned.split('\n');

  const renderFormattedText = (lineText: string) => {
    const parts = lineText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        return <strong key={idx} className="font-bold text-white">{inner}</strong>;
      }
      return part;
    });
  };

  const bulletLines: { text: string; subBullets?: string[] }[] = [];
  const otherLines: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      bulletLines.push({ text: trimmed.replace(/^[-*]\s+/, '') });
    } else if (trimmed.startsWith('  - ') || trimmed.startsWith('  * ')) {
      const cleanedSub = trimmed.replace(/^[-*]\s+/, '');
      if (bulletLines.length > 0) {
        if (!bulletLines[bulletLines.length - 1].subBullets) {
          bulletLines[bulletLines.length - 1].subBullets = [];
        }
        bulletLines[bulletLines.length - 1].subBullets?.push(cleanedSub);
      } else {
        otherLines.push(trimmed);
      }
    } else if (trimmed) {
      otherLines.push(line);
    }
  });

  return (
    <div className="space-y-3">
      {otherLines.map((line, idx) => {
        if (idx === 0 && !line.startsWith('-') && !line.startsWith('*')) {
          return (
            <div key={idx} className="font-bold text-white text-base">
              {renderFormattedText(line)}
            </div>
          );
        }
        return (
          <div key={idx} className="leading-relaxed">
            {renderFormattedText(line)}
          </div>
        );
      })}

      {bulletLines.length > 0 && (
        <ul className="space-y-2 my-2">
          {bulletLines.map((b, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 shrink-0" />
              <div className="flex-1">
                <div>{renderFormattedText(b.text)}</div>
                {b.subBullets && b.subBullets.length > 0 && (
                  <ul className="space-y-1 mt-1 pl-4">
                    {b.subBullets.map((sub, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-2 text-neutral-400 text-xs">
                        <span className="inline-block w-1 h-1 rounded-full bg-neutral-500 mt-1.5 shrink-0" />
                        <span>{renderFormattedText(sub)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export default function CommandCenter() {
  const [accentColor, setAccentColor] = useState('#FF0000');
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Drum AI' | 'Quick Links' | 'Settings'>('Dashboard');
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({});

  const [chat, setChat] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('Total');
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    localStorage.removeItem('drum_cmd_pin');
    sessionStorage.removeItem('drum_cmd_pin');
    setAccentColor(localStorage.getItem('drum_accent') || '#FF0000');
    const savedOverrides = localStorage.getItem('drum_count_overrides');
    if (savedOverrides) setOverrides(JSON.parse(savedOverrides));
    const savedHandles = localStorage.getItem('drum_social_handles');
    if (savedHandles) setSocialHandles(JSON.parse(savedHandles));
    fetchData();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsAuthenticated(false);
      }, 300000);
    };

    if (isAuthenticated) {
      resetTimer();
      ['click', 'keydown', 'touchstart'].forEach(event => 
        window.addEventListener(event, resetTimer)
      );
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      ['click', 'keydown', 'touchstart'].forEach(event => 
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [isAuthenticated]);

  const verifyPin = async (inputPin: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin }),
      });
      if (res.ok) {
        setPin(inputPin);
        setIsAuthenticated(true);
        return true;
      }
    } catch (e) { console.error(e); }
    setIsAuthenticated(false);
    return false;
  };

  const getEffectiveStats = (data: any) => {
    if (!data) return {};
    const effective = { ...data };
    Object.keys(overrides).forEach(p => {
        if (overrides[p] !== undefined) effective[p] = overrides[p];
    });
    return effective;
  };

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
      const effectiveLatest = getEffectiveStats(stats?.latest);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
        body: JSON.stringify({ 
          message: msg, 
          stats: { 
            latest: effectiveLatest, 
            previous: stats?.previous, 
            history: stats?.rows 
          } 
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
          setIsAuthenticated(false);
          setChat([...newChat, { role: 'assistant' as const, content: 'Session expired. Please re-authenticate.' }]);
      } else {
          setChat([...newChat, { role: 'assistant' as const, content: data.reply || data.error }]);
      }
    } catch { setChat([...newChat, { role: 'assistant' as const, content: 'Error connecting to Drum AI.' }]); }
  };

  const platforms = ['Twitch', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Kick'];
  const latest = getEffectiveStats(stats?.latest || {});
  const previous = stats?.previous || {};

  const platformIcons: Record<string, any> = {
    Instagram: Camera,
    Youtube: PlayCircle,
    Tiktok: Music2,
    Twitch: Gamepad2,
    Facebook: Users,
    Kick: LinkIcon,
  };

  const platformUrl = (platform: string, handle: string) => {
    const h = handle.replace(/^@/, '').trim();
    if (!h) return '';
    if (h.startsWith('http')) return h;
    const key = platform.toLowerCase();
    switch (key) {
      case 'instagram': return `https://instagram.com/${h}`;
      case 'youtube': return `https://youtube.com/@${h}`;
      case 'tiktok': return `https://tiktok.com/@${h}`;
      case 'twitch': return `https://twitch.tv/${h}`;
      case 'kick': return `https://kick.com/${h}`;
      case 'facebook': return `https://facebook.com/${h}`;
      default: return `https://${h}`;
    }
  };
  const totalFollowers = platforms.reduce((a, b) => a + (latest[b] || 0), 0);
  const prevTotal = platforms.reduce((a, b) => a + (previous[b] || 0), 0);
  const delta = totalFollowers - prevTotal;

  const chartData = stats?.rows?.map((row: any) => {
    const rowObj = { ...row };
    if (row === stats.rows[stats.rows.length - 1]) {
        platforms.forEach(p => { if (overrides[p] !== undefined) rowObj[p] = overrides[p]; });
    }
    rowObj['Total'] = platforms.reduce((a, b) => a + (rowObj[b] || 0), 0);
    return rowObj;
  }) || [];

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
          <div className='h-[300px] bg-[#111] p-4 rounded-xl border border-neutral-800'>
            <div className='flex gap-2 mb-4 overflow-x-auto'>
                {['Total', ...platforms].map(p => <button key={p} onClick={() => setFilter(p)} className={'px-2 py-1 text-[10px] rounded ' + (filter === p ? 'bg-[var(--accent)] text-white' : 'bg-[#222] text-neutral-400')}>{p}</button>)}
            </div>
            <ResponsiveContainer width='100%' height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id='colorVal' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor={accentColor} stopOpacity={0.3}/>
                    <stop offset='95%' stopColor={accentColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke='#333' />
                <XAxis dataKey='timestamp' hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: accentColor }} />
                <Area type='monotone' dataKey={filter} stroke={accentColor} fill='url(#colorVal)' strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {activeTab === 'Drum AI' && (
        !isAuthenticated ? (
            <div className='flex flex-col items-center justify-center h-80 bg-[#111] rounded-xl border border-neutral-800 p-6 text-center'>
                <Lock size={48} className='text-[var(--accent)] mb-4' />
                <h2 className='text-lg font-bold mb-2'>Private Access</h2>
                <p className='text-sm text-neutral-400 mb-6'>Enter Command PIN to unlock Drum AI & Settings</p>
                <input type='password' className='w-full max-w-xs bg-[#060606] border border-neutral-700 p-2 mb-4 rounded' placeholder='Enter PIN' onChange={e => verifyPin(e.target.value)} />
            </div>
        ) : (
            <div className='space-y-4'>
                <div className='h-80 overflow-y-auto space-y-3 p-4 bg-[#111] rounded-xl border border-neutral-800 mb-4'>
                    {chat.map((m, i) => (
                      <div 
                        key={i} 
                        className={
                          m.role === 'user' 
                            ? 'p-3 rounded-lg text-sm bg-[var(--accent)] text-white ml-auto w-3/4' 
                            : 'p-4 rounded-xl text-sm bg-[#161616] border border-white/10 text-neutral-200 w-3/4 leading-relaxed'
                        }
                      >
                        {m.role === 'assistant' ? formatAssistantMessage(m.content) : m.content}
                      </div>
                    ))}
                </div>
                <div className='grid grid-cols-2 gap-2 mb-4'>
                    {['Why did my followers drop or change?', 'Compare latest vs previous stats', 'Which platform is growing fastest?', 'Give me a 7-day follower recovery plan'].map(q => <button key={q} onClick={() => sendMessage(q)} className='text-[10px] p-2 bg-[#111] border border-neutral-700 rounded text-left hover:border-[var(--accent)]'>{q}</button>)}
                </div>
                <div className='flex gap-2'>
                    <input value={input} onChange={e => setInput(e.target.value)} className='flex-1 bg-[#111] border border-neutral-700 p-2 rounded text-sm' placeholder='Ask Drum AI...' />
                    <button onClick={() => sendMessage(input)} className='bg-[var(--accent)] px-4 py-2 rounded text-sm font-bold'>Send</button>
                </div>
            </div>
        )
      )}
      {activeTab === 'Settings' && (
        !isAuthenticated ? (
            <div className='flex flex-col items-center justify-center h-80 bg-[#111] rounded-xl border border-neutral-800 p-6 text-center'>
                <Lock size={48} className='text-[var(--accent)] mb-4' />
                <h2 className='text-lg font-bold mb-2'>Private Access</h2>
                <p className='text-sm text-neutral-400 mb-6'>Enter Command PIN to unlock Drum AI & Settings</p>
                <input type='password' className='w-full max-w-xs bg-[#060606] border border-neutral-700 p-2 mb-4 rounded' placeholder='Enter PIN' onChange={e => verifyPin(e.target.value)} />
            </div>
        ) : (
            <div className='space-y-6'>
                <div className='p-6 bg-[#111] rounded-2xl border border-neutral-800'>
                    <div className='flex justify-between items-center mb-4'>
                        <h3 className='text-sm font-bold uppercase tracking-widest'>Accent Color</h3>
                        <button onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem('drum_cmd_pin'); }} className='text-[10px] text-neutral-500 hover:text-white'>Lock</button>
                    </div>
                    <input type='color' value={accentColor} onChange={e => {setAccentColor(e.target.value); localStorage.setItem('drum_accent', e.target.value)}} className='w-full h-12 rounded cursor-pointer mb-4' />
                    <div className='flex gap-2'>
                    {['#FF0000', '#B91C1C', '#DC2626', '#F59E0B', '#FFFFFF'].map(c => (
                        <button key={c} onClick={() => { setAccentColor(c); localStorage.setItem('drum_accent', c); }} className='w-8 h-8 rounded-full border border-neutral-700' style={{ background: c }} />
                    ))}
                    </div>
                </div>
                <div className='p-6 bg-[#111] rounded-2xl border border-neutral-800'>
                    <h3 className='mb-4 text-sm font-bold uppercase tracking-widest'>Exact Follower Count Overrides</h3>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {platforms.map(p => (
                            <div key={p} className='flex items-center gap-2'>
                                <span className='w-20 text-xs text-neutral-400'>{p}</span>
                                <input type='number' placeholder={stats?.latest?.[p] || '0'} value={overrides[p] ?? ''} onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    const newOverrides = { ...overrides, [p]: val };
                                    setOverrides(newOverrides);
                                    localStorage.setItem('drum_count_overrides', JSON.stringify(newOverrides));
                                }} className='bg-[#060606] border border-neutral-700 p-1 rounded text-xs w-full' />
                                {overrides[p] !== undefined && <button onClick={() => {
                                    const newOverrides = { ...overrides };
                                    delete newOverrides[p];
                                    setOverrides(newOverrides);
                                    localStorage.setItem('drum_count_overrides', JSON.stringify(newOverrides));
                                }} className='p-1 hover:text-red-500'><RotateCcw size={12} /></button>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className='p-6 bg-[#111] rounded-2xl border border-neutral-800'>
                    <h3 className='mb-4 text-sm font-bold uppercase tracking-widest'>Social Media Handles (Quick Links)</h3>
                    <p className='text-xs text-neutral-500 mb-4'>Enter your handle for each platform (e.g. @unpdrum). These appear as direct profile links in Quick Links.</p>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {platforms.map(p => (
                            <div key={p} className='flex items-center gap-2'>
                                <span className='w-20 text-xs text-neutral-400'>{p}</span>
                                <input
                                    type='text'
                                    placeholder={`@${p.toLowerCase()}-handle`}
                                    value={socialHandles[p] ?? ''}
                                    onChange={e => {
                                        const val = e.target.value.replace(/^@/, '').trim();
                                        const newHandles = { ...socialHandles };
                                        if (val) newHandles[p] = val; else delete newHandles[p];
                                        setSocialHandles(newHandles);
                                        localStorage.setItem('drum_social_handles', JSON.stringify(newHandles));
                                    }}
                                    className='bg-[#060606] border border-neutral-700 p-1 rounded text-xs w-full'
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
      )}
      {activeTab === 'Quick Links' && (
        <div className='space-y-4'>
          <h3 className='text-sm font-bold uppercase tracking-widest mb-4'>Quick Links</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {platforms.map(p => {
              const handle = socialHandles[p];
              if (!handle) return null;
              const url = platformUrl(p, handle);
              const Icon = platformIcons[p] || LinkIcon;
              return (
                <a key={p} href={url} target='_blank' rel='noopener noreferrer' className='flex items-center gap-3 p-4 bg-[#111] rounded-xl border border-neutral-800 hover:border-[var(--accent)] transition-colors group'>
                  <Icon size={18} className='text-[var(--accent)]' />
                  <div className='flex-1'>
                    <div className='text-[10px] uppercase text-neutral-500 mb-1'>{p}</div>
                    <div className='text-sm text-neutral-300 truncate'>{url}</div>
                  </div>
                  <span className='text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity'>→</span>
                </a>
              );
            })}
            {Object.keys(socialHandles).length === 0 && (
              <div className='col-span-2 p-6 bg-[#111] rounded-xl border border-neutral-800 text-center text-neutral-500 text-sm'>
                No social handles configured yet. Add them in Settings to display your real profile links here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
