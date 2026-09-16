import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Cloud, Pause, PawPrint, Play, Settings as SettingsIcon } from 'lucide-react';
import BreakScreen from './components/BreakScreen';
import Setup from './components/Setup';
import Settings from './components/Settings';
import FocusTimer from './components/FocusTimer';
import UsageReport from './components/UsageReport';
import CatCompanion from './components/CatCompanion';
import DayOverview from './components/DayOverview';
import AppearanceStudio from './components/AppearanceStudio';
import { localDay, summarize } from './lib/time';
import { makeSupabase, pullRecent, pushSegments, requireUser } from './lib/sync';
import { parsePairing } from './lib/pairing.mjs';
import { segmentsForDay } from './lib/timeline.mjs';

const DEFAULT_SETTINGS = { idleThresholdSeconds:60,breakIntervalSeconds:7200,launchAtLogin:true,sync:{url:'',key:'',companionUrl:''} };
function readSaved(key,fallback) {try {return JSON.parse(localStorage.getItem(key)) || fallback;} catch {return fallback;}}
const desktop = Boolean(window.purrductive);
export default function App() {
  const [preview,setPreview] = useState(false), [page,setPage] = useState('dashboard');
  const [name,setName] = useState(localStorage.getItem('purrductive-name') || '');
  const [onboarded,setOnboarded] = useState(localStorage.getItem('purrductive-onboarded') === 'true');
  const [local,setLocal] = useState([]), [remote,setRemote] = useState(desktop ? [] : readSaved('purrductive-cloud-cache',[]));
  const [live,setLive] = useState(null), [settings,setSettings] = useState({...DEFAULT_SETTINGS,sync:readSaved('purrductive-sync',DEFAULT_SETTINGS.sync)});
  const [icons,setIcons] = useState({});
  const [error,setError] = useState(''), [syncStatus,setSyncStatus] = useState('Cloud not connected');
  const [lastSync,setLastSync] = useState(localStorage.getItem('purrductive-last-sync'));
  const [date,setDate] = useState(localDay()), [device,setDevice] = useState('all');
  const [pairing,setPairing] = useState(() => !desktop ? parsePairing(location.hash,location.origin+location.pathname) : null);
  const syncEpoch=useRef(0);
  const state = useRef(); state.current = {local,settings};
  const busy = useRef(false);
  const isBreak = location.hash === '#/break';
  useEffect(() => {
    if (!desktop || isBreak) return;
    let disposed = false, fetching = false;
    async function refresh() {if (fetching) return;fetching=true;try {
      const snapshot = await window.purrductive.getSnapshot();
      if (!disposed) {setLocal(snapshot.segments || []);setLive(snapshot.live);setIcons(snapshot.icons || {});setSettings(snapshot.settings || DEFAULT_SETTINGS);setError('');}
    } catch(e) {if (!disposed) setError(e.message);} finally {fetching=false;}}
    refresh();const timer=setInterval(refresh,5000);return () => {disposed=true;clearInterval(timer);};
  },[isBreak]);
  async function syncNow() {
    if (busy.current || isBreak) return;
    const config = state.current.settings.sync;
    const epoch=syncEpoch.current;
    const client = makeSupabase(config);
    if (!client) {setSyncStatus(config?.url ? 'Check cloud configuration in Settings' : 'Cloud not connected');return;}
    busy.current=true;setSyncStatus('Syncing…');
    try {
      const user = await requireUser(client);
      if (epoch!==syncEpoch.current) return;
      const cacheOwner = config.url+'|'+user.id;
      if (localStorage.getItem('purrductive-cache-owner') !== cacheOwner) {setRemote([]);localStorage.removeItem('purrductive-cloud-cache');localStorage.removeItem('purrductive-last-sync');setLastSync(null);}
      if (desktop) await pushSegments(client,state.current.local,user);
      const rows=await pullRecent(client,user);
      const session=await client.auth.getSession();
      if (epoch!==syncEpoch.current || session.data.session?.user?.id!==user.id || state.current.settings.sync.url !== config.url || state.current.settings.sync.key !== config.key) return;
      setRemote(rows);setSyncStatus('Cloud up to date');
      const stamp=new Date().toISOString();setLastSync(stamp);
      try {localStorage.setItem('purrductive-cloud-cache',JSON.stringify(rows));localStorage.setItem('purrductive-cache-owner',cacheOwner);localStorage.setItem('purrductive-last-sync',stamp);} catch {setSyncStatus('Synced · offline cache is full');}
    } catch(e) {if (epoch===syncEpoch.current) setSyncStatus('Sync needs attention: '+e.message);} finally {busy.current=false;}
  }
  useEffect(() => {if (isBreak) return;syncNow();const timer=setInterval(syncNow,30000);window.addEventListener('online',syncNow);return () => {clearInterval(timer);window.removeEventListener('online',syncNow);};},[settings.sync.url,settings.sync.key,isBreak]);
  const segments=useMemo(() => {const merged=new Map(remote.map(s => [s.id,s]));local.forEach(s => merged.set(s.id,s));return [...merged.values()];},[local,remote]);
  const devices=useMemo(() => [...new Set(segments.map(s => s.deviceId || 'desktop'))].sort(),[segments]);
  const visible=useMemo(() => segmentsForDay(segments.filter(s => device === 'all' || (s.deviceId || 'desktop') === device),date),[segments,date,device]);
  const stats=useMemo(() => summarize(visible),[visible]);
  async function recategorize(id,category) {
    if (!local.some(s => s.id === id)) {setError('Edit this activity on the laptop that recorded it.');return;}
    try {if (!await window.purrductive.recategorize(id,category)) throw new Error('Activity could not be updated.');setLocal(items => items.map(s => s.id === id ? {...s,category,confidence:1,manual:true,reason:'You taught me this'} : s));} catch(e) {setError(e.message);}
  }
  if (isBreak) return <BreakScreen/>;
  if (preview) return <BreakScreen preview onClose={() => setPreview(false)}/>;
  if (pairing) return <main className="settings-page"><div className="connection-import"><PawPrint/><h1>Connect your companion?</h1><p>Cloud project: <strong>{pairing.url}</strong></p><p>Only continue if this matches the project in your laptop’s Settings. You will sign in separately; no password was shared in the QR code.</p><div className="button-row"><button className="primary-button" onClick={() => {syncEpoch.current++;setSettings(v => ({...v,sync:pairing}));localStorage.setItem('purrductive-sync',JSON.stringify(pairing));setPairing(null);history.replaceState(null,'',location.pathname+location.search);setPage('settings');}}>Use this connection</button><button className="soft-button" onClick={() => {setPairing(null);history.replaceState(null,'',location.pathname+location.search);}}>Cancel</button></div></div></main>;
  if (!onboarded && desktop) return <Setup onComplete={value => {setName(value);localStorage.setItem('purrductive-name',value);localStorage.setItem('purrductive-onboarded','true');setOnboarded(true);}}/>;
  if (page === 'settings') return <Settings current={settings} syncStatus={syncStatus} lastSync={lastSync} onSync={syncNow} onSignOut={() => {syncEpoch.current++;setRemote([]);setLastSync(null);setSyncStatus('Signed out');localStorage.removeItem('purrductive-cloud-cache');localStorage.removeItem('purrductive-last-sync');localStorage.removeItem('purrductive-cache-owner');}} onBack={() => setPage('dashboard')} onSave={async value => {if (desktop) await window.purrductive.saveSettings(value);syncEpoch.current++;setSettings(value);localStorage.setItem('purrductive-sync',JSON.stringify(value.sync));setPage('dashboard');}}/>;
  return <div className="app-shell">
    <aside><div className="brand-mark"><PawPrint/><span>purrductive</span></div><nav><button className="active" onClick={() => setDate(localDay())}><BarChart3/>Your day</button><button onClick={() => setPage('settings')}><SettingsIcon/>Settings & sync</button></nav><div className="sidebar-note"><PawPrint/><h3>Small steps.<br/>Big stretches.</h3><p>Your time is information, not a report card.</p></div><div className={'local-badge '+(live?.paused ? 'paused' : '')}><span/><div><b>{live ? live.paused ? 'Tracking paused' : 'Tracking locally' : 'Mobile companion'}</b><small>{live?.activeApp || 'Last uploaded activity'}</small></div></div></aside>
    <main className="dashboard"><header className="topbar"><div><p className="eyebrow">A LITTLE MORE INTENTIONAL</p><h1>Make room for your day{name ? `, ${name}` : ''}.</h1></div>{live && <button className="tracking-button" onClick={async () => {try {const paused=await window.purrductive.toggleTracking();setLive(v => ({...v,paused}));} catch(e) {setError(e.message);}}}>{live.paused ? <Play size={16}/> : <Pause size={16}/>} {live.paused ? 'Resume' : 'Pause'}</button>}</header>
      <div className="day-toolbar"><label>Your day <input type="date" aria-label="Select day" value={date} max={localDay()} onChange={e => setDate(e.target.value || localDay())}/></label><button className="soft-button" onClick={() => setDate(localDay())}>Today</button><select aria-label="Device" value={device} onChange={e => setDevice(e.target.value)}><option value="all">All laptops</option>{devices.map(d => <option key={d} value={d}>{d}</option>)}</select><span>Saved activity · last 32 days</span></div>
      {(error || live?.trackingError) && <p className="error-banner" role="alert">{error || live.trackingError}</p>}
      <AppearanceStudio onPreview={() => setPreview(true)}/>
      <DayOverview stats={stats} day={date} allDevices={device==='all' && devices.length>1}/>
      <CatCompanion live={live} onPreview={() => setPreview(true)}/><FocusTimer/>
      <UsageReport key={date+'|'+device} segments={visible} live={live} day={date} onCategory={recategorize} readOnly={!desktop} icons={icons}/>
      <section className="cloud-strip"><Cloud size={20}/><div><strong>{syncStatus}</strong><small>{lastSync ? 'Last successful sync: '+new Date(lastSync).toLocaleString() : 'Connect in Settings to see your laptop history from your phone.'}</small>{!desktop && <small>Your laptop can be off. New activity appears after it reconnects. This view does not track phone screen time.</small>}</div><button className="soft-button" onClick={settings.sync.url ? syncNow : () => setPage('settings')}>{settings.sync.url ? 'Sync now' : 'Connect phone'}</button></section>
      <footer><span>{live?.lastSavedAt ? 'Saved locally: '+new Date(live.lastSavedAt).toLocaleTimeString() : 'Read-only companion'}</span><span>Website totals are included in browser totals—not added twice.</span></footer>
    </main></div>;
}
