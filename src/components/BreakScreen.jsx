import React, { useEffect, useRef, useState } from "react";
import CrawlingCat from './CrawlingCat';
import {startMeow} from '../lib/meow.mjs';

export function startPurr(volume = .42) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return () => {};
  const ctx = new AudioCtx();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < data.length; i++) {
    brown = (brown + .02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = brown * 3.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 150;
  const pulse = ctx.createGain();
  pulse.gain.value = .7;
  noise.connect(low).connect(pulse).connect(master);

  const oscillator = ctx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = 27;
  oscillator.connect(pulse);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 4.2;
  lfoGain.gain.value = .28;
  lfo.connect(lfoGain).connect(pulse.gain);
  noise.start(); oscillator.start(); lfo.start();
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return () => { if (ctx.state !== "closed") ctx.close().catch(() => {}); };
}

export default function BreakScreen({ preview = false, onClose,catId:initialCatId='silver' }) {
  const [catId,setCatId]=useState(initialCatId);
  useEffect(()=>{let active=true;if(!preview)window.purrductive?.getSnapshot().then(s=>{if(active)setCatId(s.settings.catId||'silver');}).catch(()=>{});return()=>{active=false;};},[preview]);
  const [closing, setClosing] = useState(false);
  const [muted,setMuted] = useState(false);
  const [error,setError] = useState('');
  const [soundStatus,setSoundStatus]=useState('ready');
  const [animationStatus,setAnimationStatus]=useState('loading');
  const [replay,setReplay]=useState(0);
  const meowRef=useRef(()=>{});
  const stopRef = useRef(() => {});
  function meow(){meowRef.current();meowRef.current=startMeow(.3,setSoundStatus);}
  useEffect(() => {
    stopRef.current = startPurr();
    meow();
    return () => {stopRef.current();meowRef.current();};
  }, []);

  const acknowledge = async () => {
    setClosing(true);
    stopRef.current();
    meowRef.current();
    setTimeout(async () => {
      try {
        if (window.purrductive && !preview) await window.purrductive.acknowledgeBreak();
        onClose?.();
      } catch(e) {setClosing(false);setError(e.message);}
    }, 320);
  };

  const interactive=enabled=>{if(!preview)window.purrductive?.setBreakInteractive(enabled);};
  return <main className={`walking-break ${preview?'preview-break':'desktop-break'} ${closing ? "is-closing" : ""}`}>
    <CrawlingCat key={replay} catId={catId} onStatus={setAnimationStatus}/>
    <section className="walking-break-message" onPointerEnter={()=>interactive(true)} onPointerLeave={()=>interactive(false)}>
      <p className="eyebrow">YOUR MOVEMENT COACH HAS ARRIVED</p>
      <h1>Move your ass, babe.</h1>
      <p>Your brain has been carrying this shift. Give your body five minutes.</p>
      <button className="break-done" disabled={closing} onClick={acknowledge}>Fine, I’m moving <span>→</span></button>
    <div className="break-actions"><button onClick={() => {stopRef.current();meowRef.current();if (muted){stopRef.current=startPurr();meow();}setMuted(!muted);}}>{muted ? 'Sound on' : 'Mute cat'}</button><button disabled={closing} onClick={()=>{setMuted(false);meow();}}>Meow again</button><button disabled={closing} onClick={()=>setReplay(n=>n+1)}>Replay crawl</button><button disabled={closing} onClick={async () => {try {stopRef.current();meowRef.current();if (preview) onClose?.();else await window.purrductive?.snoozeBreak();} catch(e) {setError(e.message);}}}>{preview ? 'Close preview' : 'Snooze 5 minutes'}</button></div>
    {soundStatus==='blocked'&&!muted&&<p role="status">Sound paused by your browser. Click Meow again to enable it.</p>}
    {soundStatus==='unavailable'&&<p role="status">Audio is unavailable on this device.</p>}
    {animationStatus==='failed'&&<p role="status">Crawl image could not load. Try Replay crawl.</p>}
    {animationStatus==='reduced'&&<p role="status">Movement is off because your system prefers reduced motion.</p>}
    {error && <p role="alert">{error}</p>}
    </section>
  </main>;
}
