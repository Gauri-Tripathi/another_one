import React, { useEffect, useRef, useState } from "react";

function startPurr() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return () => {};
  const ctx = new AudioCtx();
  const master = ctx.createGain();
  master.gain.value = .42;
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
  return () => ctx.close();
}

export default function BreakScreen({ preview = false, onClose }) {
  const [closing, setClosing] = useState(false);
  const stopRef = useRef(() => {});
  useEffect(() => {
    stopRef.current = startPurr();
    return () => stopRef.current();
  }, []);

  const acknowledge = async () => {
    setClosing(true);
    stopRef.current();
    setTimeout(async () => {
      if (window.purrductive && !preview) await window.purrductive.acknowledgeBreak();
      onClose?.();
    }, 320);
  };

  return <main className={`break-screen ${closing ? "is-closing" : ""}`}>
    <div className="break-noise" />
    <p className="break-eyebrow">2 hours. no negotiations.</p>
    <img className="break-cat" src="./cat-coach.png" alt="A fluffy orange cat raising one paw" />
    <section className="break-copy">
      <h1>Move your ass, babe.</h1>
      <p>Your brain has been carrying this shift. Give your body five minutes.</p>
      <button onClick={acknowledge}>Fine, I’m moving <span>→</span></button>
    </section>
  </main>;
}
