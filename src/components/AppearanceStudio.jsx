import React, { useEffect, useRef, useState } from 'react';
import { Palette, Check, GripVertical, PawPrint, ArrowUp, RotateCcw, X } from 'lucide-react';
import { THEMES, validTheme, clampDock } from '../lib/appearance.mjs';

function saved(key,fallback) {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}}
function save(key,value) {try {localStorage.setItem(key,JSON.stringify(value));} catch { /* Preferences remain usable when storage is unavailable. */ }}

export default function AppearanceStudio({ onPreview }) {
  const [theme,setTheme]=useState(() => validTheme(saved('purrductive-theme','cream')));
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState(null);
  const dock=useRef(null),drag=useRef(null),current=useRef(null);
  current.current=position;
  useEffect(() => {document.documentElement.dataset.theme=theme;save('purrductive-theme',theme);},[theme]);
  function bounds(point) {return clampDock(point,{width:window.innerWidth,height:window.innerHeight},{width:dock.current?.offsetWidth || 228,height:dock.current?.offsetHeight || 54});}
  function persist(point) {save('purrductive-dock',{x:point.x/window.innerWidth,y:point.y/window.innerHeight});}
  useEffect(() => {
    const stored=saved('purrductive-dock',null);
    const initial=bounds(stored && {x:stored.x*window.innerWidth,y:stored.y*window.innerHeight});
    setPosition(initial);
    const resize=() => setPosition(value => bounds(value));
    window.addEventListener('resize',resize);
    return () => window.removeEventListener('resize',resize);
  },[]);
  function reset() {const point=bounds(null);setPosition(point);persist(point);}
  function move(event) {
    if (!drag.current) return;
    const point=bounds({x:event.clientX-drag.current.x,y:event.clientY-drag.current.y});
    current.current=point;setPosition(point);
  }
  function endDrag() {if (drag.current && current.current) persist(current.current);drag.current=null;}
  function keyboard(event) {
    const offsets={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
    if (event.key==='Home') {event.preventDefault();reset();return;}
    if (!offsets[event.key]) return;
    event.preventDefault();const [x,y]=offsets[event.key];
    const point=bounds({x:(position?.x||0)+x,y:(position?.y||0)+y});setPosition(point);persist(point);
  }
  return <>
    <section className="appearance-studio" aria-label="Appearance">
      <button className="appearance-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><Palette size={17}/><span>Make it yours</span><span className="current-theme-dot" style={{background:THEMES.find(t=>t.id===theme).colors[1]}}/><small>{THEMES.find(t=>t.id===theme).name}</small><span aria-hidden="true">{open ? '−' : '+'}</span></button>
      {open && <div className="theme-panel"><div className="theme-panel-heading"><div><h3>A mood for every kind of day.</h3><p>Eight themes. Your pick stays saved on this device.</p></div><button className="theme-close" aria-label="Close theme picker" onClick={() => setOpen(false)}><X size={17}/></button></div><div className="theme-options">{THEMES.map(t => <button key={t.id} className={'theme-choice '+(theme===t.id ? 'selected' : '')} aria-pressed={theme===t.id} onClick={() => setTheme(t.id)}><span className="theme-preview" style={{background:t.colors[0]}}><i style={{background:t.colors[1]}}/><i style={{background:t.colors[2]}}/><i style={{background:t.colors[1],opacity:.4}}/></span><span>{t.name}{theme===t.id && <Check size={14}/>}</span></button>)}</div><p className="theme-help">Move the floating buttons using their grip. Keyboard: focus the grip, use arrow keys to move, Home to reset.</p><button className="theme-reset" onClick={reset}><RotateCcw size={13}/> Reset toolbar position</button></div>}
    </section>
    <div ref={dock} className="floating-actions" role="toolbar" aria-label="Movable quick actions" style={position ? {left:position.x,top:position.y,right:'auto',bottom:'auto'} : {}}>
      <button className="drag-grip" aria-label="Move toolbar: drag or use arrow keys; Home resets position" title="Drag to move · arrow keys to nudge · Home to reset" onKeyDown={keyboard} onPointerDown={event => {if(event.button!==0)return;const rect=dock.current.getBoundingClientRect();drag.current={x:event.clientX-rect.left,y:event.clientY-rect.top};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}><GripVertical size={18}/></button>
      <button title="Change theme" aria-label="Change theme" onClick={() => {setOpen(true);document.querySelector('.appearance-studio')?.scrollIntoView({block:'center',behavior:'smooth'});}}><Palette size={18}/></button>
      <button title="Preview cat break" aria-label="Preview cat break" onClick={onPreview}><PawPrint size={18}/></button>
      <button title="Go to day summary" aria-label="Go to day summary" onClick={() => {const summary=document.getElementById('day-overview');summary?.scrollIntoView({block:'start',behavior:'smooth'});summary?.focus({preventScroll:true});}}><ArrowUp size={18}/></button>
      <button title="Reset toolbar position" aria-label="Reset toolbar position" onClick={reset}><RotateCcw size={16}/></button>
    </div>
  </>;
}
