// A short synthesized meow, not a recording. Start after resume so suspended
// audio contexts don't consume the whole envelope before sound is permitted.
export function startMeow(volume=.3,onStatus=()=>{}) {
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx){onStatus('unavailable');return()=>{};}
  let ctx;
  try{ctx=new AudioCtx();}catch{onStatus('unavailable');return()=>{};}
  let stopped=false;
  const stop=()=>{stopped=true;if(ctx.state!=='closed')ctx.close().catch(()=>{});};
  const play=()=>{
    if(stopped)return;
    if(ctx.state!=='running'){onStatus('blocked');return;}
    onStatus('playing');
    const now=ctx.currentTime,voice=ctx.createOscillator(),gain=ctx.createGain();
    const formant=ctx.createBiquadFilter();formant.type='lowpass';formant.Q.value=2;
    voice.type='sawtooth';
    voice.frequency.setValueAtTime(520,now);
    voice.frequency.exponentialRampToValueAtTime(820,now+.14);
    voice.frequency.exponentialRampToValueAtTime(650,now+.38);
    voice.frequency.exponentialRampToValueAtTime(340,now+.85);
    formant.frequency.setValueAtTime(1800,now);
    formant.frequency.exponentialRampToValueAtTime(950,now+.8);
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(.5,volume)),now+.06);
    gain.gain.setValueAtTime(volume*.7,now+.4);
    gain.gain.exponentialRampToValueAtTime(.001,now+.95);
    voice.connect(formant).connect(gain).connect(ctx.destination);
    voice.onended=()=>{if(!stopped){onStatus('ready');stop();}};
    voice.start(now);voice.stop(now+1);
  };
  ctx.onstatechange=()=>{if(!stopped&&ctx.state==='suspended')onStatus('blocked');};
  if(ctx.state==='running')play();
  else {onStatus('blocked');ctx.resume().then(play).catch(()=>{if(!stopped)onStatus('blocked');});}
  return stop;
}
