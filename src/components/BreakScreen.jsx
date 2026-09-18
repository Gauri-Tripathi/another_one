import React, { useEffect, useRef, useState } from "react";
import RealCat from './RealCat';

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
  return () => { if (ctx.state !== "closed") ctx.close().catch(() => {}); };
}

export default function BreakScreen({ preview = false, onClose,catId:initialCatId='silver' }) {
  const [catId,setCatId]=useState(initialCatId);
  useEffect(()=>{let active=true;if(!preview)window.purrductive?.getSnapshot().then(s=>{if(active)setCatId(s.settings.catId||'silver');}).catch(()=>{});return()=>{active=false;};},[preview]);
  const [closing, setClosing] = useState(false);
  const [muted,setMuted] = useState(false);
  const [error,setError] = useState('');
  const [walking,setWalking] = useState(true);
  const stopRef = useRef(() => {});
  useEffect(() => {
    stopRef.current = startPurr();
    const arrival=setTimeout(()=>setWalking(false),7000);
    return () => {clearTimeout(arrival);stopRef.current();};
  }, []);

  const acknowledge = async () => {
    setClosing(true);
    stopRef.current();
    setTimeout(async () => {
      try {
        if (window.purrductive && !preview) await window.purrductive.acknowledgeBreak();
        onClose?.();
      } catch(e) {setClosing(false);setError(e.message);}
    }, 320);
  };

  const interactive=enabled=>{if(!preview)window.purrductive?.setBreakInteractive(enabled);};
  return <main className={`walking-break ${preview?'preview-break':'desktop-break'} ${closing ? "is-closing" : ""}`}>
    <div className="cat-walk-path"><RealCat catId={catId} walking={walking}/></div>
    <section className="walking-break-message" onPointerEnter={()=>interactive(true)} onPointerLeave={()=>interactive(false)}>
      <p className="eyebrow">YOUR MOVEMENT COACH HAS ARRIVED</p>
      <h1>Move your ass, babe.</h1>
      <p>Your brain has been carrying this shift. Give your body five minutes.</p>
      <button className="break-done" disabled={closing} onClick={acknowledge}>Fine, I’m moving <span>→</span></button>
    <div className="break-actions"><button onClick={() => {stopRef.current();if (muted) stopRef.current=startPurr();setMuted(!muted);}}>{muted ? 'Sound on' : 'Mute purring'}</button><button disabled={closing} onClick={async () => {try {stopRef.current();if (preview) onClose?.();else await window.purrductive?.snoozeBreak();} catch(e) {setError(e.message);}}}>{preview ? 'Close preview' : 'Snooze 5 minutes'}</button></div>
    {error && <p role="alert">{error}</p>}
    </section>
  </main>;
}
