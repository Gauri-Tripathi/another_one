import React,{useEffect,useState} from 'react';
export default function MacPermissions() {
  const [status,setStatus]=useState(null),[error,setError]=useState('');
  useEffect(()=>{if(window.purrductive?.platform!=='darwin')return;let active=true;const read=()=>window.purrductive.macPermissions().then(value=>{if(active)setStatus(value);}).catch(e=>{if(active)setError(e.message);});read();const timer=setInterval(read,2500);return()=>{active=false;clearInterval(timer);};},[]);
  if(window.purrductive?.platform!=='darwin')return null;
  async function action(fn){try{setError('');await fn();}catch(e){setError(e.message);}}
  return <section className="mac-permissions"><p className="eyebrow">MAC PERMISSIONS</p><h3>Let your Mac share activity context</h3>
    <p>Accessibility permission lets Purrductive read the active window title and supported browser address bars. Without it, only app-level time is available. No screenshots, keylogging, or screen-recording permission.</p>
    <p role="status">{!status?'Checking permissions…':!status.helperAvailable?'Native collector missing — build the Mac helper or reinstall the Mac app.':!status.accessibility?'Accessibility access not granted.':status.collectorAccessibility===true?'Collector has Accessibility access.':'App permission granted; waiting for the collector. Retry or restart if needed.'}</p>
    <div className="button-row"><button type="button" className="soft-button" onClick={()=>action(()=>window.purrductive.requestMacAccess())}>Open Accessibility settings</button><button type="button" className="soft-button" onClick={()=>action(()=>window.purrductive.retryMacCollector())}>Recheck collector</button></div>
    <p className="planner-help">Move the app to Applications before granting access. Enable Purrductive in macOS Privacy &amp; Security → Accessibility, then recheck. A changed or unsigned build may need access granted again. Browser compatibility varies; an unreadable URL is never guessed. Enable notifications in System Settings if you want scheduled alerts.</p>
    {error&&<p role="alert">{error}</p>}
  </section>;
}
