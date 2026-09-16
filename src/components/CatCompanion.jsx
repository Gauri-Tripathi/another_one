import React, { useEffect, useRef, useState } from 'react';
import { Heart, Volume2, VolumeX } from 'lucide-react';
import { secondsToClock } from '../lib/time';
import { startPurr } from './BreakScreen';
const lines = ['Excellent petting. Five stars.', 'Tiny paws. Very serious supervision.', 'You do the work. I handle the purring.', 'A stretch would look very good on you.'];
export default function CatCompanion({ live, onPreview }) {
  const [pets,setPets] = useState(0);
  const [muted,setMuted] = useState(true);
  const [happy,setHappy] = useState(false);
  const stop = useRef(() => {}), timer = useRef();
  useEffect(() => () => {stop.current();clearTimeout(timer.current);},[]);
  function pet() {
    setPets(n => n+1);setHappy(true);stop.current();clearTimeout(timer.current);
    if (!muted) stop.current = startPurr(.12);
    timer.current = setTimeout(() => {setHappy(false);stop.current();},1800);
  }
  return <section className={'cat-companion '+(happy ? 'happy' : '')}>
    <div className="cat-playground"><span className="cat-orbit orbit-one"/><span className="cat-orbit orbit-two"/><button className="pet-cat" onClick={pet} aria-label="Pet your cat coach"><img src="./cat-coach.png" alt="Your fluffy orange cat coach"/></button>{happy && <Heart className="floating-heart" fill="currentColor"/>}<span className="cat-hint">psst… pet me</span></div>
    <div className="cat-dialogue"><p className="eyebrow">YOUR TINY ACCOUNTABILITY DEPARTMENT</p><h2>{happy ? lines[(pets-1)%lines.length] : live?.paused ? 'A little pause. I approve.' : 'A little focus. A little chaos.'}</h2><p>{live ? `Next stretch in ${secondsToClock(live.nextBreakIn)} of active time. I’ll bring the dramatic entrance.` : 'Your laptop does the tracking. I keep you company here.'}</p><div className="button-row"><button className="soft-button" onClick={onPreview}>Meet your movement coach ↗</button><button className="icon-button" aria-label={muted ? 'Enable petting sound' : 'Mute petting sound'} aria-pressed={!muted} onClick={() => {setMuted(!muted);stop.current();}}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button></div></div>
  </section>;
}
