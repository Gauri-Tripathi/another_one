import React, { useMemo, useState } from 'react';
import { Clock3, ChevronLeft } from 'lucide-react';
import { timelineHours, timelineSessions } from '../lib/timeline.mjs';
import { appLabel } from '../lib/usage.mjs';
import { secondsToClock, CATEGORY } from '../lib/time';
import AppIcon from './AppIcon';
const clock = value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',second:'2-digit' });
export default function DayTimeline({ segments, day, onCategory, icons, readOnly }) {
  const hours = useMemo(() => timelineHours(segments, day), [segments, day]);
  const [hour, setHour] = useState(null);
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(30);
  const [raw,setRaw]=useState(false),[entryId,setEntryId]=useState(null);
  const entries = useMemo(() => (hour == null ? segments : hours[hour]?.segments || []).slice().sort((a,b) => a.startedAt.localeCompare(b.startedAt)), [segments, hour, hours]);
  const rows=useMemo(()=>raw?entries.map(s=>({...s,entries:[s]})):timelineSessions(entries),[entries,raw]);
  const detail = rows.find(s => s.id === selected);
  const entry=detail?.entries.find(s=>s.id===entryId)||detail?.entries[0];
  const ceiling = Math.max(60, ...hours.map(h => h.productive + h.distraction + h.neutral));
  return <div className="timeline-view">
    <div className="section-intro"><div><h3>A little map of your day</h3><p>Tap an hour, then an activity to see the details.</p></div><div className="legend">{Object.entries(CATEGORY).map(([key, value]) => <span key={key}><i style={{background:value.color}}/>{value.label}</span>)}</div></div>
    <div className="hour-scroll"><div className="hour-chart">{hours.map((h, i) => {
      const total = h.productive + h.distraction + h.neutral;
      return <button key={h.start} className={'hour-column ' + (i === hour ? 'selected' : '')} onClick={() => { setHour(hour === i ? null : i); setLimit(30); setSelected(null); }} aria-pressed={i === hour} aria-label={h.label + ':00, ' + secondsToClock(total) + ' active'} title={h.label + ':00 · ' + secondsToClock(total)}>
        <span className="hour-bars">{['neutral','distraction','productive'].map(c => <i key={c} style={{height:Math.max(0,h[c] / ceiling * 100) + '%',background:CATEGORY[c].color}}/>)}</span><small>{h.label}</small>
      </button>;
    })}</div></div>
    <p className="timeline-caption">Sampled time, not an exact event log. Sessions group consecutive entries without changing saved totals. An hour selection clips durations to that hour. Older records with gaps are distributed across their observed span.</p>
    <button className="soft-button" aria-pressed={raw} onClick={()=>{setRaw(!raw);setSelected(null);setLimit(30);}}>{raw?'Show sessions':'Inspect raw entries'}</button>
    <div className="timeline-label"><h3>{hour == null ? 'The whole day' : hours[hour]?.label + ':00 — ' + hours[hour]?.label + ':59'} <span>{rows.length} {raw?'entries':'sessions'} · {secondsToClock(entries.reduce((n,s)=>n+s.seconds,0))}</span></h3>{hour != null && <button className="text-button" onClick={() => { setHour(null); setSelected(null);setLimit(30); }}>Show full day</button>}</div>
    <div className={'timeline-content ' + (detail ? 'with-detail' : '')}><div className="timeline-list">
      {rows.slice(0,limit).map(item => <button key={item.id} className={'timeline-event ' + (selected === item.id ? 'selected' : '')} onClick={() => {setSelected(item.id);setEntryId(item.entries[0].id);}}>
        <time>{clock(item.startedAt)}</time><span className={'timeline-pin ' + item.category}/><AppIcon name={item.appName} icons={icons}/><div><strong>{appLabel(item.appName)}</strong><small>{item.windowTitle || item.website}</small><small>{item.website || 'No website detected'} · {CATEGORY[item.category]?.label} {item.entries.length>1?`· ${item.entries.length} entries`:''}</small></div><b>{secondsToClock(item.seconds)}</b>
      </button>)}
      {!rows.length && <div className="empty-state"><Clock3/><h3>A quiet stretch.</h3><p>No recorded activity in this period.</p></div>}
      {limit < rows.length && <button className="soft-button" onClick={() => setLimit(n => n + 30)}>Show more activities</button>}
    </div>{detail && entry && <div className="event-detail"><button className="text-button" onClick={() => setSelected(null)}><ChevronLeft size={14}/> Close detail</button><AppIcon name={detail.appName} icons={icons}/><h3>{appLabel(detail.appName)}</h3><dl><dt>Observed span</dt><dd>{clock(detail.startedAt)} – {clock(detail.endedAt)}</dd><dt>{raw?'Entry':'Session'} active time {hour!=null?'in this hour':''}</dt><dd>{secondsToClock(detail.seconds)}</dd></dl>{detail.entries.length>1&&<label>Choose an entry to inspect or correct<select value={entry.id} onChange={e=>setEntryId(e.target.value)}>{detail.entries.map(s=><option key={s.id} value={s.id}>{clock(s.startedAt)} · {s.windowTitle}</option>)}</select></label>}<p className="detail-title">{entry.windowTitle}</p><dl><dt>Website</dt><dd>{entry.website||'Not detected'}</dd><dt>This entry’s active time</dt><dd>{secondsToClock(entry.seconds)}</dd><dt>Classification source</dt><dd>{entry.reason}</dd></dl><label>Classify this entry (not the whole session)<select disabled={readOnly} value={entry.category} onChange={e => onCategory(entry.id,e.target.value)}>{Object.entries(CATEGORY).map(([key,value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>{readOnly && <small>Edit categories on your desktop.</small>}</div>}</div>
  </div>;
}
