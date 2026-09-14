import React, { useMemo, useState } from "react";
import { ArrowLeft, Cloud, Database, Download, FolderOpen, LogIn, ShieldCheck } from "lucide-react";
import { makeSupabase } from "../lib/sync";

export default function Settings({ current, onSave, onBack }) {
  const [settings, setSettings] = useState(current);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const client = useMemo(() => makeSupabase(settings.sync), [settings.sync.url, settings.sync.key]);
  const patch = values => setSettings(value => ({ ...value, ...values }));
  const patchSync = values => setSettings(value => ({ ...value, sync: { ...value.sync, ...values } }));

  const signIn = async mode => {
    if (!client) return setMessage("Add your Supabase URL and anon key first.");
    setMessage("Connecting…");
    const result = mode === "signup"
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
    setMessage(result.error ? result.error.message : mode === "signup" ? "Check your email, then sign in." : "Connected. Your next sync will run shortly.");
  };

  const exportData = async () => {
    const result = await window.purrductive.exportCsv();
    setDataMessage(result.canceled ? "Export cancelled." : `Saved to ${result.filePath}`);
  };

  return <div className="settings-page">
    <button className="back-button" onClick={onBack}><ArrowLeft size={17}/> Dashboard</button>
    <header><p className="eyebrow">MAKE IT YOURS</p><h1>Settings</h1></header>
    <div className="settings-grid">
      <section className="settings-card">
        <div className="settings-title"><span><ShieldCheck/></span><div><h2>Tracking</h2><p>What counts as being at your screen.</p></div></div>
        <label>Idle after <b>{settings.idleThresholdSeconds} seconds</b></label>
        <input type="range" min="30" max="300" step="15" value={settings.idleThresholdSeconds} onChange={e => patch({ idleThresholdSeconds: Number(e.target.value) })}/>
        <label>Cat intervention after <b>{Math.round(settings.breakIntervalSeconds / 60)} minutes</b></label>
        <input type="range" min="30" max="180" step="15" value={settings.breakIntervalSeconds / 60} onChange={e => patch({ breakIntervalSeconds: Number(e.target.value) * 60 })}/>
        <label className="toggle-line"><span>Launch when Windows starts</span><input type="checkbox" checked={settings.launchAtLogin} onChange={e => patch({ launchAtLogin: e.target.checked })}/><i/></label>
      </section>
      <section className="settings-card">
        <div className="settings-title"><span><Cloud/></span><div><h2>Mobile sync</h2><p>Connect the phone PWA through your own Supabase.</p></div></div>
        <label>Project URL</label><input placeholder="https://xxxx.supabase.co" value={settings.sync.url} onChange={e => patchSync({ url: e.target.value })}/>
        <label>Anon key</label><input type="password" placeholder="eyJ…" value={settings.sync.key} onChange={e => patchSync({ key: e.target.value })}/>
        <div className="auth-row"><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/></div>
        <div className="button-row"><button onClick={() => signIn("signin")}><LogIn size={16}/> Sign in</button><button className="quiet" onClick={() => signIn("signup")}>Create account</button></div>
        {message && <p className="status-message">{message}</p>}
      </section>
      {window.purrductive && <section className="settings-card data-card">
        <div className="settings-title"><span><Database/></span><div><h2>Your data</h2><p>Portable, inspectable, and yours to keep.</p></div></div>
        <p className="data-copy">Export every saved activity segment as a CSV spreadsheet, or open the private local data file and its automatic backup.</p>
        <div className="button-row"><button onClick={exportData}><Download size={16}/> Export CSV</button><button className="quiet" onClick={() => window.purrductive.revealData()}><FolderOpen size={16}/> Show data file</button></div>
        {dataMessage && <p className="status-message data-message">{dataMessage}</p>}
      </section>}
    </div>
    <button className="primary-button save-settings" onClick={() => onSave(settings)}>Save settings <span>→</span></button>
  </div>;
}
