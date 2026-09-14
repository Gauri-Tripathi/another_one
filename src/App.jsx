import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BarChart3, CalendarDays, Cloud, Pause, PawPrint, Play, Settings as SettingsIcon, Sparkles, TimerReset } from "lucide-react";
import BreakScreen from "./components/BreakScreen";
import Setup from "./components/Setup";
import Settings from "./components/Settings";
import { demoSegments } from "./lib/demo";
import { groupApps, groupDays, localDay, secondsToClock, summarize } from "./lib/time";
import { makeSupabase, pullRecent, pushSegments } from "./lib/sync";

const DEFAULT_SETTINGS = { idleThresholdSeconds: 60, breakIntervalSeconds: 7200, launchAtLogin: true, sync: { url: "", key: "" } };

function Donut({ stats }) {
  const split = stats.total ? (stats.productive / stats.total) * 100 : 0;
  const distraction = stats.total ? (stats.distraction / stats.total) * 100 : 0;
  return <div className="donut" style={{ "--productive": `${split * 3.6}deg`, "--distraction": `${(split + distraction) * 3.6}deg` }}>
    <div><strong>{stats.focus}%</strong><span>focus score</span></div>
  </div>;
}

function savedLabel(value) {
  if (!value) return "Waiting for first save";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  return seconds < 10 ? "Saved just now" : `Saved ${seconds}s ago`;
}

function Dashboard({ user, segments, live, onCategory, onOpenSettings, onOpenHistory, onPreviewBreak, onToggleTracking }) {
  const todaySegments = useMemo(() => segments.filter(item => localDay(item.startedAt) === localDay()), [segments]);
  const stats = useMemo(() => summarize(todaySegments), [todaySegments]);
  const apps = useMemo(() => groupApps(todaySegments).slice(0, 6), [todaySegments]);
  const yesterdayStats = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return summarize(segments.filter(item => localDay(item.startedAt) === localDay(yesterday)));
  }, [segments]);
  const max = apps[0]?.seconds || 1;
  return <div className="app-shell">
    <aside>
      <div className="brand-mark"><PawPrint/><span>purrductive</span></div>
      <nav><button className="active"><BarChart3/>Today</button><button onClick={onOpenHistory}><CalendarDays/>History</button><button onClick={onOpenSettings}><SettingsIcon/>Settings</button></nav>
      <div className="coach-card"><img src="./cat-coach.png" alt="Cat coach"/><p>Next stretch</p><strong>{live?.nextBreakIn ? secondsToClock(live.nextBreakIn) : "2h 00m"}</strong><button onClick={onPreviewBreak}>Test the cat</button></div>
      <div className={`local-badge ${live?.paused ? "paused" : ""}`}><span/><div><b>{live ? live.paused ? "Tracking paused" : "Tracking locally" : "Mobile view"}</b><small>{live?.activeApp || "Synced dashboard"}</small></div></div>
    </aside>
    <main className="dashboard">
      <header className="topbar"><div><p className="eyebrow">{new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date()).toUpperCase()} · TODAY</p><h1>Hey{user ? `, ${user}` : ""}. Here’s the truth.</h1></div>{live && <button className={`tracking-button ${live.paused ? "paused" : ""}`} onClick={onToggleTracking}>{live.paused ? <Play size={16}/> : <Pause size={16}/>} {live.paused ? "Resume tracking" : "Pause tracking"}</button>}</header>
      <section className="summary-grid">
        <article className="hero-stat"><p>TOTAL SCREEN TIME</p><strong>{secondsToClock(stats.total)}</strong><span className="delta"><Sparkles size={14}/> {yesterdayStats.total ? `${stats.total >= yesterdayStats.total ? "+" : "−"}${secondsToClock(Math.abs(stats.total - yesterdayStats.total))} vs yesterday` : "Active time only—idle minutes removed"}</span></article>
        <article className="split-card"><div><span className="dot green"/><p>Productive</p><strong>{secondsToClock(stats.productive)}</strong></div><div><span className="dot coral"/><p>Distracted</p><strong>{secondsToClock(stats.distraction)}</strong></div><div><span className="dot grey"/><p>Unsorted</p><strong>{secondsToClock(stats.neutral)}</strong></div></article>
        <article className="focus-card"><Donut stats={stats}/><p>Based only on time Purrductive could confidently sort.</p></article>
      </section>
      <section className="content-grid">
        <article className="panel timeline-panel"><div className="panel-heading"><div><p className="eyebrow">WHERE THE DAY WENT</p><h2>Activity</h2></div><span>Click a label to teach the classifier</span></div>
          <div className="activity-list">{todaySegments.length ? todaySegments.slice(0, 8).map(item => <div className="activity-row" key={item.id}>
            <div className="app-icon">{(item.appName || "?").slice(0, 1)}</div><div className="activity-name"><strong>{item.appName}</strong><span>{item.windowTitle}</span></div>
            <div className="confidence">{Math.round((item.confidence || 0) * 100)}%<small>{item.reason}</small></div>
            <select value={item.category} onChange={e => onCategory(item.id, e.target.value)} className={item.category}><option value="productive">Productive</option><option value="distraction">Distraction</option><option value="neutral">Unsorted</option></select>
            <b className="duration">{secondsToClock(item.seconds)}</b>
          </div>) : <div className="empty-activity"><PawPrint/><strong>{live?.paused ? "Tracking is paused" : "No activity yet"}</strong><span>{live?.paused ? "Resume when you want the clock running again." : "Use another app for a minute and your timeline will appear."}</span></div>}</div>
        </article>
        <article className="panel apps-panel"><div className="panel-heading"><div><p className="eyebrow">TOP APPS</p><h2>Attention map</h2></div></div>
          <div className="bars">{apps.map(app => <div className="bar-item" key={`${app.appName}-${app.category}`}><div><span>{app.appName}</span><b>{secondsToClock(app.seconds)}</b></div><div className="bar-track"><i className={app.category} style={{ width: `${Math.max(7, app.seconds / max * 100)}%` }}/></div></div>)}</div>
          <div className="insight"><TimerReset size={19}/><p><b>Small truth:</b> neutral time is deliberately excluded from your focus score. Sort it once and the cat learns.</p></div>
        </article>
      </section>
      <footer><span><Cloud size={15}/> {live ? savedLabel(live.lastSavedAt) : "Read-only mobile companion"}</span><span>Raw titles are never shared unless you enable sync.</span></footer>
    </main>
  </div>;
}

function History({ segments, onBack }) {
  const days = useMemo(() => groupDays(segments), [segments]);
  const [selectedDate, setSelectedDate] = useState(days[0]?.date || "");
  const selectedDay = days.find(day => day.date === selectedDate) || days[0];
  const selectedApps = selectedDay ? groupApps(selectedDay.segments).slice(0, 8) : [];
  const maximum = Math.max(1, ...days.map(day => day.total));
  return <div className="settings-page history-page">
    <button className="back-button" onClick={onBack}><ArrowLeft size={17}/> Today</button>
    <header><p className="eyebrow">LAST 32 DAYS</p><h1>Your honest archive.</h1></header>
    <div className="history-layout"><section className="panel history-list">
      {days.length ? days.map(day => <button className={`history-row ${day.date === selectedDay?.date ? "selected" : ""}`} onClick={() => setSelectedDate(day.date)} key={day.date}>
          <time>{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${day.date}T12:00:00`))}</time>
          <div className="history-bars"><i className="productive" style={{ width: `${day.productive / maximum * 100}%` }}/><i className="distraction" style={{ width: `${day.distraction / maximum * 100}%` }}/><i className="neutral" style={{ width: `${day.neutral / maximum * 100}%` }}/></div>
          <b>{secondsToClock(day.total)}</b><span>{day.focus}% focused</span>
        </button>) : <div className="history-empty">Your first full day will appear here tomorrow.</div>}
      </section>
      {selectedDay && <aside className="panel day-detail"><p className="eyebrow">DAY DETAIL</p><h2>{new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(new Date(`${selectedDay.date}T12:00:00`))}</h2><strong>{secondsToClock(selectedDay.total)}</strong><span>{secondsToClock(selectedDay.productive)} productive · {secondsToClock(selectedDay.distraction)} distracted</span><div>{selectedApps.map(app => <p key={`${app.appName}-${app.category}`}><i className={app.category}/><b>{app.appName}</b><small>{secondsToClock(app.seconds)}</small></p>)}</div></aside>}
    </div>
  </div>;
}

export default function App() {
  const breakMode = location.hash === "#/break";
  const [previewBreak, setPreviewBreak] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [name, setName] = useState(localStorage.getItem("purrductive-name") || "");
  const [onboarded, setOnboarded] = useState(localStorage.getItem("purrductive-onboarded") === "true");
  const [segments, setSegments] = useState(window.purrductive ? [] : demoSegments);
  const [live, setLive] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const syncState = useRef({ segments: [], settings: DEFAULT_SETTINGS });
  syncState.current = { segments, settings };

  const refresh = async () => {
    if (window.purrductive) {
      const snapshot = await window.purrductive.getSnapshot();
      setSegments(snapshot.segments || []); setLive(snapshot.live); setSettings(snapshot.settings || DEFAULT_SETTINGS);
    } else {
      const stored = JSON.parse(localStorage.getItem("purrductive-sync") || "null");
      if (stored) setSettings(value => ({ ...value, sync: stored }));
      const client = makeSupabase(stored);
      if (client) try { const rows = await pullRecent(client); if (rows.length) setSegments(rows); } catch {}
    }
  };
  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!window.purrductive) return;
    const timer = setInterval(async () => {
      const state = syncState.current;
      if (!state.settings.sync.url) return;
      try { await pushSegments(makeSupabase(state.settings.sync), state.segments); } catch {}
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (breakMode) return <BreakScreen/>;
  if (previewBreak) return <BreakScreen preview onClose={() => setPreviewBreak(false)}/>;
  if (!onboarded && window.purrductive) return <Setup onComplete={value => { setName(value); localStorage.setItem("purrductive-name", value); localStorage.setItem("purrductive-onboarded", "true"); setOnboarded(true); }}/>
  if (page === "settings") return <Settings current={settings} onBack={() => setPage("dashboard")} onSave={async value => { setSettings(value); localStorage.setItem("purrductive-sync", JSON.stringify(value.sync)); if (window.purrductive) await window.purrductive.saveSettings(value); setPage("dashboard"); }}/>
  if (page === "history") return <History segments={segments} onBack={() => setPage("dashboard")}/>;

  const recategorize = async (id, category) => {
    setSegments(items => items.map(item => item.id === id ? { ...item, category, confidence: 1, reason: "You taught me this", manual: true } : item));
    if (window.purrductive) await window.purrductive.recategorize(id, category);
  };
  const toggleTracking = async () => {
    if (!window.purrductive) return;
    const paused = await window.purrductive.toggleTracking();
    setLive(value => ({ ...value, paused, activeApp: paused ? "Paused" : "Resuming…" }));
  };
  return <Dashboard user={name} segments={segments} live={live} onCategory={recategorize} onOpenSettings={() => setPage("settings")} onOpenHistory={() => setPage("history")} onPreviewBreak={() => setPreviewBreak(true)} onToggleTracking={toggleTracking}/>;
}
