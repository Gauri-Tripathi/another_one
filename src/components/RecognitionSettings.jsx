import React,{useEffect,useState} from 'react';
export default function RecognitionSettings({value={},onChange}) {
  const [key,setKey]=useState(''),[status,setStatus]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const patch=values=>onChange({...value,...values});
  useEffect(()=>{let active=true;const read=()=>window.purrductive?.recognitionStatus().then(s=>{if(active)setStatus(s);}).catch(()=>{});read();const timer=setInterval(read,3000);return()=>{active=false;clearInterval(timer);};},[]);
  async function saveKey(clear=false){setBusy(true);try{const result=await window.purrductive.setRecognitionKey(clear?'':key);setStatus(s=>({...s,...result}));setKey('');setMessage(clear?'API key removed.':'Key encrypted for this OS account. Save settings below to apply consent.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return <section className="recognition-settings">
    <p className="eyebrow">PURPOSE, NOT JUST A WEBSITE NAME</p><h2>Smart recognition</h2>
    <p>Optional cloud AI reads the topic of an activity in the context of your work. Learning on YouTube and working on social media need not be distractions. Uncertain results stay unsorted; your corrections always win.</p>
    <label className="passive-option"><input type="checkbox" checked={Boolean(value.enabled)} disabled={!window.purrductive} onChange={e=>patch({enabled:e.target.checked})}/> Allow cloud recognition (OpenAI)</label>
    <p className="planner-help">When enabled and saved, sends active app names, window/page titles (up to 300 characters), website domains, and the work context below. No screenshots, page bodies, keystrokes, full address-bar URLs, or past-history bulk upload. Titles may still contain private information. This is separate from mobile sync. API charges apply; a ChatGPT subscription does not supply an API key. Requests use store:false, but provider retention policies still apply.</p>
    <label>What does productive mean for you?</label><textarea rows="3" maxLength="600" value={value.workContext||''} placeholder="e.g. I study computer science and create videos. Editing, researching videos and coding are work; unrelated celebrity gossip is leisure." onChange={e=>patch({workContext:e.target.value})}/>
    <label>Never send these website domains (comma-separated)</label><input value={value.excludedDomains||''} placeholder="bank.example, mail.example" onChange={e=>patch({excludedDomains:e.target.value})}/>
    <label>Never send these app process names (comma-separated)</label><input value={value.excludedApps??'1Password, KeePass, KeePassXC, Bitwarden'} placeholder="WhatsApp, 1Password" onChange={e=>patch({excludedApps:e.target.value})}/>
    <label>Maximum requests per UTC day (not a currency budget)</label><input type="number" min="1" max="500" value={value.dailyLimit||100} onChange={e=>patch({dailyLimit:Number(e.target.value)})}/>
    <label>OpenAI model</label><input value={value.model||'gpt-4.1-mini'} onChange={e=>patch({model:e.target.value})}/>
    {window.purrductive&&<><label>API key — {status?.hasKey?'saved securely; enter only to replace':'not configured'}</label><input type="password" autoComplete="off" value={key} placeholder="Paste your API key here, not into chat" onChange={e=>setKey(e.target.value)}/><div className="button-row"><button type="button" disabled={busy||!key.trim()} onClick={()=>saveKey()}>Save encrypted key</button><button type="button" className="quiet" disabled={busy||!status?.hasKey} onClick={()=>saveKey(true)}>Remove key</button></div></>}
    <p role="status">{message||status?.status||'Desktop setup required. Local rules remain available.'}</p>
    <p className="planner-help">Only contexts used for at least 3 seconds are queued. Browsers with an unreadable domain stay local to protect private-site exclusions. Repeated contexts are cached during this run; one request at a time, at least 5 seconds apart. Offline or without a key, local rules keep working. AI estimates intent from titles and can still be wrong.</p>
  </section>;
}
