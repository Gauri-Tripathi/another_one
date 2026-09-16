import React, { useEffect, useMemo, useState } from "react";
import QRCode from 'qrcode';
import { ArrowLeft, Cloud, Database, Download, FolderOpen, LogIn, ShieldCheck } from "lucide-react";
import { makeSupabase } from "../lib/sync";
import { parsePairing } from '../lib/pairing.mjs';

export default function Settings({ current, onSave, onBack, syncStatus, lastSync, onSync, onSignOut }) {
  const [settings, setSettings] = useState(current);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [account,setAccount] = useState('');
  const [qr,setQr] = useState('');
  const [pairError,setPairError] = useState('');
  const [busy,setBusy] = useState(false);
  const client = useMemo(() => makeSupabase(settings.sync), [settings.sync.url, settings.sync.key]);
  const patch = values => setSettings(value => ({ ...value, ...values }));
  const patchSync = values => setSettings(value => ({ ...value, sync: { ...value.sync, ...values } }));
  useEffect(() => {
    if (!client) {setAccount('');return;}
    let active=true;
    client.auth.getSession().then(({data}) => {if (active) setAccount(data.session?.user?.email || '');});
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,session) => {if (active) setAccount(session?.user?.email || '');});
    return () => {active=false;subscription.unsubscribe();};
  },[client]);
  useEffect(() => {
    let active=true;setQr('');setPairError('');
    if (!settings.sync.companionUrl) return;
    try {
      const url=new URL(settings.sync.companionUrl);
      if (url.protocol !== 'https:') throw new Error('Use the HTTPS address of your hosted companion.');
      // Only share public connection settings. Passwords and session tokens never enter the QR code.
      url.hash='connect='+encodeURIComponent(JSON.stringify({url:settings.sync.url,key:settings.sync.key}));
      if (settings.sync.url && settings.sync.key && !parsePairing(url.hash)) throw new Error('Use an HTTPS project URL and a public anon/publishable key. Never use a secret or service-role key.');
      if (settings.sync.url && settings.sync.key) QRCode.toDataURL(url.href,{width:240,margin:2}).then(data => {if (active) setQr(data);}).catch(() => {if (active) setPairError('Connection is too long for a QR code. Enter settings manually on your phone.');});
    } catch(e) {setPairError(e.message);}
    return () => {active=false;};
  },[settings.sync.companionUrl,settings.sync.url,settings.sync.key]);

  const signIn = async mode => {
    if (!client) return setMessage("Add your Supabase URL and anon key first.");
    setBusy(true);
    try {
    setMessage("Connecting…");
    const result = mode === "signup"
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
    setMessage(result.error ? result.error.message : mode === "signup" ? "Check your email, then sign in." : "Connected. Your next sync will run shortly.");
    } catch(e) {setMessage(e.message);} finally {setBusy(false);}
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
        <div className="settings-title"><span><Cloud/></span><div><h2>Connected, even apart.</h2><p>Cloud history on your phone—even while your laptop is off.</p></div></div>
        <p className="data-copy">This needs your own Supabase project (with the supplied database schema) and an HTTPS-hosted copy of the companion. No always-on laptop or shared Wi-Fi required. Sync uploads app names, window titles, website domains, and timing to your account.</p>
        <p className="status-message">{syncStatus}{lastSync ? ' · Last success '+new Date(lastSync).toLocaleString() : ''}</p>
        <label>Project URL</label><input placeholder="https://xxxx.supabase.co" value={settings.sync.url} onChange={e => patchSync({ url: e.target.value })}/>
        <label>Anon key</label><input type="password" placeholder="eyJ…" value={settings.sync.key} onChange={e => patchSync({ key: e.target.value })}/>
        <div className="auth-row"><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/></div>
        <div className="button-row"><button disabled={busy} onClick={() => signIn("signin")}><LogIn size={16}/> Sign in</button><button disabled={busy} className="quiet" onClick={() => signIn("signup")}>Create account</button></div>
        {account && <div className="account-status"><p>Signed in as {account}</p><button className="quiet" onClick={async () => {try {const {error}=await client.auth.signOut();if (error) throw error;onSignOut();setMessage('Signed out. Cached cloud history removed.');} catch(e) {setMessage(e.message);}}}>Sign out</button><button className="quiet" onClick={onSync}>Sync saved connection now</button></div>}
        {message && <p className="status-message">{message}</p>}
        <label>Hosted companion URL</label><input type="url" placeholder="https://your-companion.example" value={settings.sync.companionUrl || ''} onChange={e => patchSync({companionUrl:e.target.value.trim()})}/>
        {pairError && <p role="alert">{pairError}</p>}
        {qr && <div className="phone-pairing"><img src={qr} alt="Scan to open the mobile companion and import public cloud settings"/><p>Scan with your phone, confirm the connection, then sign in with the same account. Add the page to your home screen. This QR contains public project settings, not your login.</p></div>}
        <p className="data-copy">The phone shows the last uploaded laptop history; it does not measure phone app usage. Offline, it can show previously cached history on this browser. Sign out to clear that cache on shared devices.</p>
      </section>
      {window.purrductive && <section className="settings-card data-card">
        <div className="settings-title"><span><Database/></span><div><h2>Your data</h2><p>Portable, inspectable, and yours to keep.</p></div></div>
        <p className="data-copy">Export every saved activity segment as a CSV spreadsheet, or open the private local data file and its automatic backup.</p>
        <div className="button-row"><button onClick={exportData}><Download size={16}/> Export CSV</button><button className="quiet" onClick={() => window.purrductive.revealData()}><FolderOpen size={16}/> Show data file</button></div>
        {dataMessage && <p className="status-message data-message">{dataMessage}</p>}
      </section>}
    </div>
    <button className="primary-button save-settings" disabled={busy} onClick={async () => {setBusy(true);try {await onSave(settings);} catch(e) {setMessage(e.message);} finally {setBusy(false);}}}>Save settings <span>→</span></button>
  </div>;
}
